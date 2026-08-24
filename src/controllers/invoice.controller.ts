import { Request, Response, NextFunction } from "express";
import { InvoiceService, ApiError } from "../services/invoice.service";
import { InvoiceStatus } from "@prisma/client";
import { generateInvoicePdf } from "../utils/pdf.utils";

const invoiceService = new InvoiceService();

export class InvoiceController {
  async createInvoice(req: Request, res: Response, next: NextFunction) {
    try {
      const invoice = await invoiceService.createInvoice(req.body);
      res.status(201).json(invoice);
    } catch (error) {
      next(error);
    }
  }

  async getInvoiceById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string };
      const invoice = await invoiceService.getInvoiceById(id);
      res.status(200).json(invoice);
    } catch (error) {
      next(error);
    }
  }

  async listInvoices(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, page, limit } = req.query;

      let parsedStatus: InvoiceStatus | undefined = undefined;
      if (status && Object.values(InvoiceStatus).includes(status as InvoiceStatus)) {
        parsedStatus = status as InvoiceStatus;
      }

      const parsedPage = page ? parseInt(page as string, 10) : undefined;
      const parsedLimit = limit ? parseInt(limit as string, 10) : undefined;

      const result = await invoiceService.listInvoices({
        status: parsedStatus,
        page: parsedPage,
        limit: parsedLimit,
      });

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateInvoice(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string };
      const invoice = await invoiceService.updateInvoice(id, req.body);
      res.status(200).json(invoice);
    } catch (error) {
      next(error);
    }
  }

  async deleteInvoice(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string };
      const result = await invoiceService.deleteInvoice(id);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async issueInvoice(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string };
      const invoice = await invoiceService.issueInvoice(id);
      res.status(200).json(invoice);
    } catch (error) {
      next(error);
    }
  }

  async cancelInvoice(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string };
      const invoice = await invoiceService.cancelInvoice(id);
      res.status(200).json(invoice);
    } catch (error) {
      next(error);
    }
  }

  async replaceInvoice(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string }; // The ID of the original issued invoice to be replaced
      const newInvoice = await invoiceService.replaceInvoice(id, req.body);
      res.status(201).json(newInvoice);
    } catch (error) {
      next(error);
    }
  }

  async downloadPdf(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string };
      const invoice = await invoiceService.getInvoiceById(id);
      const pdfBuffer = await generateInvoicePdf(invoice);
      const filename = `Invoice-${invoice.invoiceNumber || "DRAFT"}-${id.substring(0, 8)}.pdf`;

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.status(200).send(pdfBuffer);
    } catch (error) {
      next(error);
    }
  }
}
