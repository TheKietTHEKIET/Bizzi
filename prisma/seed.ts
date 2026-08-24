import { PrismaClient, InvoiceStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Clear existing
  await prisma.invoiceItem.deleteMany({});
  await prisma.invoice.deleteMany({});

  // 1. Create a DRAFT invoice
  const draftInvoice = await prisma.invoice.create({
    data: {
      customerName: "Cong ty A (Draft Example)",
      customerTaxCode: "0112233445",
      customerAddress: "Building A, District 1, HCMC",
      customerEmail: "company.a@example.com",
      paymentMethod: "CK",
      taxRate: 0.08,
      subTotal: 1000000,
      taxAmount: 80000,
      amount: 1080000,
      status: InvoiceStatus.DRAFT,
      items: {
        create: [
          { description: "Laptop Dell Vostro", quantity: 1, unitPrice: 1000000, amount: 1000000 },
        ],
      },
    },
  });

  // 2. Create an ISSUED invoice
  const issuedInvoice = await prisma.invoice.create({
    data: {
      customerName: "Cong ty B (Issued Example)",
      customerTaxCode: "0223344556",
      customerAddress: "Building B, Cau Giay, Hanoi",
      customerEmail: "company.b@example.com",
      paymentMethod: "CK",
      taxRate: 0.10,
      subTotal: 2500000,
      taxAmount: 250000,
      amount: 2750000,
      status: InvoiceStatus.ISSUED,
      invoiceNumber: "INV-20260824-0001",
      issueDate: new Date(),
      items: {
        create: [
          { description: "Ban lam viec Go", quantity: 2, unitPrice: 1000000, amount: 2000000 },
          { description: "Ghe xoay van phong", quantity: 1, unitPrice: 500000, amount: 500000 },
        ],
      },
    },
  });

  // 3. Create a CANCELED invoice
  const canceledInvoice = await prisma.invoice.create({
    data: {
      customerName: "Cong ty C (Canceled Example)",
      customerTaxCode: "0334455667",
      customerAddress: "Building C, Quan 3, HCMC",
      customerEmail: "company.c@example.com",
      paymentMethod: "TM",
      taxRate: 0.10,
      subTotal: 500000,
      taxAmount: 50000,
      amount: 550000,
      status: InvoiceStatus.CANCELED,
      invoiceNumber: "INV-20260824-0002",
      issueDate: new Date(),
      items: {
        create: [
          { description: "Dich vu Ve sinh Van phong", quantity: 1, unitPrice: 500000, amount: 500000 },
        ],
      },
    },
  });

  console.log("Seeding completed successfully!");
  console.log(`Created Draft Invoice: ${draftInvoice.id}`);
  console.log(`Created Issued Invoice: ${issuedInvoice.id} (${issuedInvoice.invoiceNumber})`);
  console.log(`Created Canceled Invoice: ${canceledInvoice.id} (${canceledInvoice.invoiceNumber})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
