import { z } from "zod";

export const InvoiceItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  unitPrice: z.number().min(0, "Unit price must be 0 or greater"),
});

export const CreateInvoiceSchema = z.object({
  customerName: z.string().min(1, "Customer name is required"),
  customerTaxCode: z.string().optional(),
  customerAddress: z.string().optional(),
  customerEmail: z.string().email("Invalid email format").optional().or(z.literal("")),
  paymentMethod: z.string().optional().default("CK"),
  taxRate: z.number().min(0).max(1).optional().default(0.10), // e.g. 0.10 for 10%
  items: z.array(InvoiceItemSchema).min(1, "Invoice must contain at least one item"),
});

export const UpdateInvoiceSchema = CreateInvoiceSchema.partial().extend({
  items: z.array(InvoiceItemSchema).min(1, "Invoice must contain at least one item").optional(),
});

export const ReplaceInvoiceSchema = CreateInvoiceSchema;
