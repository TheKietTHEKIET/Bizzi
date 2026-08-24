import prisma from "../config/prisma";
import { InvoiceStatus, Prisma } from "@prisma/client";

export class ApiError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

interface ItemInput {
  description: string;
  quantity: number;
  unitPrice: number;
}

interface CreateInvoiceInput {
  customerName: string;
  customerTaxCode?: string;
  customerAddress?: string;
  customerEmail?: string;
  paymentMethod?: string;
  taxRate?: number;
  items: ItemInput[];
}

interface UpdateInvoiceInput {
  customerName?: string;
  customerTaxCode?: string;
  customerAddress?: string;
  customerEmail?: string;
  paymentMethod?: string;
  taxRate?: number;
  items?: ItemInput[];
}

export class InvoiceService {
  /**
   * Helper to calculate item totals and invoice totals
   */
  private calculateTotals(items: ItemInput[], taxRate: number) {
    let subTotal = 0;
    const computedItems = items.map((item) => {
      const amount = item.quantity * item.unitPrice;
      subTotal += amount;
      return {
        description: item.description,
        quantity: item.quantity,
        unitPrice: new Prisma.Decimal(item.unitPrice),
        amount: new Prisma.Decimal(amount),
      };
    });

    const taxAmount = subTotal * taxRate;
    const amount = subTotal + taxAmount;

    return {
      computedItems,
      subTotal: new Prisma.Decimal(subTotal),
      taxAmount: new Prisma.Decimal(taxAmount),
      amount: new Prisma.Decimal(amount),
    };
  }

  /**
   * Generate a unique sequential invoice number
   */
  private async generateInvoiceNumber(): Promise<string> {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const dateStr = `${yyyy}${mm}${dd}`;

    // Get count of issued/canceled/replaced invoices today to make it sequential
    const count = await prisma.invoice.count({
      where: {
        invoiceNumber: {
          startsWith: `INV-${dateStr}-`,
        },
      },
    });

    const sequence = String(count + 1).padStart(4, "0");
    return `INV-${dateStr}-${sequence}`;
  }

  async createInvoice(data: CreateInvoiceInput) {
    const taxRate = data.taxRate ?? 0.10;
    const { computedItems, subTotal, taxAmount, amount } = this.calculateTotals(
      data.items,
      taxRate
    );

    return prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          customerName: data.customerName,
          customerTaxCode: data.customerTaxCode,
          customerAddress: data.customerAddress,
          customerEmail: data.customerEmail,
          paymentMethod: data.paymentMethod,
          taxRate: new Prisma.Decimal(taxRate),
          subTotal,
          taxAmount,
          amount,
          status: InvoiceStatus.DRAFT,
          items: {
            create: computedItems,
          },
        },
        include: {
          items: true,
        },
      });
      return invoice;
    });
  }

  async getInvoiceById(id: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        items: true,
        referenceInvoice: true,
        replacedBy: true,
      },
    });

    if (!invoice) {
      throw new ApiError(404, "Invoice not found");
    }

    return invoice;
  }

  async listInvoices(filters: { status?: InvoiceStatus; page?: number; limit?: number }) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.InvoiceWhereInput = {};
    if (filters.status) {
      where.status = filters.status;
    }

    const [total, data] = await Promise.all([
      prisma.invoice.count({ where }),
      prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          items: true,
        },
      }),
    ]);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateInvoice(id: string, data: UpdateInvoiceInput) {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!invoice) {
      throw new ApiError(404, "Invoice not found");
    }

    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new ApiError(400, "Only DRAFT invoices can be updated");
    }

    return prisma.$transaction(async (tx) => {
      let subTotal = invoice.subTotal;
      let taxAmount = invoice.taxAmount;
      let amount = invoice.amount;
      let taxRate = data.taxRate !== undefined ? data.taxRate : Number(invoice.taxRate);

      if (data.items) {
        // Clear existing items
        await tx.invoiceItem.deleteMany({
          where: { invoiceId: id },
        });

        // Recalculate totals with new items
        const totals = this.calculateTotals(data.items, taxRate);
        subTotal = totals.subTotal;
        taxAmount = totals.taxAmount;
        amount = totals.amount;

        // Create new items
        await tx.invoiceItem.createMany({
          data: totals.computedItems.map((item) => ({
            ...item,
            invoiceId: id,
          })),
        });
      } else if (data.taxRate !== undefined) {
        // Items didn't change but taxRate did, recalculate totals using existing items
        const existingItems = invoice.items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
        }));
        const totals = this.calculateTotals(existingItems, taxRate);
        subTotal = totals.subTotal;
        taxAmount = totals.taxAmount;
        amount = totals.amount;
      }

      const updatedInvoice = await tx.invoice.update({
        where: { id },
        data: {
          customerName: data.customerName,
          customerTaxCode: data.customerTaxCode,
          customerAddress: data.customerAddress,
          customerEmail: data.customerEmail,
          paymentMethod: data.paymentMethod,
          taxRate: new Prisma.Decimal(taxRate),
          subTotal,
          taxAmount,
          amount,
        },
        include: {
          items: true,
        },
      });

      return updatedInvoice;
    });
  }

  async deleteInvoice(id: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
    });

    if (!invoice) {
      throw new ApiError(404, "Invoice not found");
    }

    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new ApiError(400, "Only DRAFT invoices can be deleted");
    }

    // Cascade delete is defined in schema.prisma, but we run inside delete which handles it
    await prisma.invoice.delete({
      where: { id },
    });

    return { message: "Invoice deleted successfully" };
  }

  async issueInvoice(id: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
    });

    if (!invoice) {
      throw new ApiError(404, "Invoice not found");
    }

    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new ApiError(400, "Only DRAFT invoices can be issued");
    }

    const invoiceNumber = await this.generateInvoiceNumber();

    return prisma.invoice.update({
      where: { id },
      data: {
        status: InvoiceStatus.ISSUED,
        invoiceNumber,
        issueDate: new Date(),
      },
      include: {
        items: true,
      },
    });
  }

  async cancelInvoice(id: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
    });

    if (!invoice) {
      throw new ApiError(404, "Invoice not found");
    }

    if (invoice.status !== InvoiceStatus.ISSUED) {
      throw new ApiError(400, "Only ISSUED invoices can be canceled");
    }

    return prisma.invoice.update({
      where: { id },
      data: {
        status: InvoiceStatus.CANCELED,
      },
      include: {
        items: true,
      },
    });
  }

  async replaceInvoice(oldInvoiceId: string, data: CreateInvoiceInput) {
    const oldInvoice = await prisma.invoice.findUnique({
      where: { id: oldInvoiceId },
    });

    if (!oldInvoice) {
      throw new ApiError(404, "Original invoice not found");
    }

    if (oldInvoice.status !== InvoiceStatus.ISSUED) {
      throw new ApiError(400, "Only ISSUED invoices can be replaced");
    }

    const taxRate = data.taxRate ?? 0.10;
    const { computedItems, subTotal, taxAmount, amount } = this.calculateTotals(
      data.items,
      taxRate
    );

    const newInvoiceNumber = await this.generateInvoiceNumber();

    return prisma.$transaction(async (tx) => {
      // 1. Update status of old invoice to REPLACED
      await tx.invoice.update({
        where: { id: oldInvoiceId },
        data: {
          status: InvoiceStatus.REPLACED,
        },
      });

      // 2. Create the new replacement invoice (automatically ISSUED as per e-invoice standard)
      const newInvoice = await tx.invoice.create({
        data: {
          customerName: data.customerName,
          customerTaxCode: data.customerTaxCode,
          customerAddress: data.customerAddress,
          customerEmail: data.customerEmail,
          paymentMethod: data.paymentMethod,
          taxRate: new Prisma.Decimal(taxRate),
          subTotal,
          taxAmount,
          amount,
          status: InvoiceStatus.ISSUED,
          invoiceNumber: newInvoiceNumber,
          issueDate: new Date(),
          referenceInvoiceId: oldInvoiceId,
          items: {
            create: computedItems,
          },
        },
        include: {
          items: true,
          referenceInvoice: true,
        },
      });

      return newInvoice;
    });
  }
}
