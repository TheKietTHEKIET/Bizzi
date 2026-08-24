import request from "supertest";
import app from "../app";
import prisma from "../config/prisma";
import { InvoiceStatus } from "@prisma/client";

beforeAll(async () => {
  // Clear tables to start with a clean slate
  await prisma.invoiceItem.deleteMany({});
  await prisma.invoice.deleteMany({});
});

afterAll(async () => {
  await prisma.invoiceItem.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.$disconnect();
});

describe("Invoice Management API Integration Tests", () => {
  let draftInvoiceId: string;
  let issuedInvoiceId: string;

  const sampleInvoiceData = {
    customerName: "Nguyen Van A",
    customerTaxCode: "0102030405",
    customerAddress: "123 Street, Hanoi",
    customerEmail: "customer@example.com",
    paymentMethod: "CK",
    taxRate: 0.10, // 10%
    items: [
      { description: "Product 1", quantity: 2, unitPrice: 50000 }, // 100,000
      { description: "Product 2", quantity: 1, unitPrice: 150000 }, // 150,000
    ],
  };

  describe("POST /api/invoices", () => {
    it("should successfully create a DRAFT invoice and compute amounts correctly", async () => {
      const res = await request(app)
        .post("/api/invoices")
        .send(sampleInvoiceData);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("id");
      expect(res.body.status).toBe(InvoiceStatus.DRAFT);
      expect(res.body.customerName).toBe(sampleInvoiceData.customerName);
      expect(res.body.invoiceNumber).toBeNull();

      // Calculation checks:
      // SubTotal = (2 * 50,000) + (1 * 150,000) = 250,000
      // TaxAmount = 250,000 * 0.1 = 25,000
      // Amount (Total) = 250,000 + 25,000 = 275,000
      expect(Number(res.body.subTotal)).toBe(250000);
      expect(Number(res.body.taxAmount)).toBe(25000);
      expect(Number(res.body.amount)).toBe(275000);
      expect(res.body.items).toHaveLength(2);

      draftInvoiceId = res.body.id;
    });

    it("should fail validation if items array is empty", async () => {
      const invalidData = {
        ...sampleInvoiceData,
        items: [],
      };
      const res = await request(app)
        .post("/api/invoices")
        .send(invalidData);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Validation failed");
    });
  });

  describe("GET /api/invoices", () => {
    it("should return a list of invoices", async () => {
      const res = await request(app).get("/api/invoices");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("data");
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.pagination.total).toBeGreaterThan(0);
    });

    it("should return invoice detail by ID", async () => {
      const res = await request(app).get(`/api/invoices/${draftInvoiceId}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(draftInvoiceId);
      expect(res.body.items).toHaveLength(2);
    });
  });

  describe("PUT /api/invoices/:id", () => {
    it("should allow updating a DRAFT invoice", async () => {
      const updatedData = {
        customerName: "Nguyen Van B",
        items: [
          { description: "Product 1 Updated", quantity: 3, unitPrice: 60000 }, // 180,000
        ],
      };
      const res = await request(app)
        .put(`/api/invoices/${draftInvoiceId}`)
        .send(updatedData);

      expect(res.status).toBe(200);
      expect(res.body.customerName).toBe("Nguyen Van B");
      // SubTotal = 180,000
      // Tax = 180,000 * 0.1 = 18,000
      // Total = 198,000
      expect(Number(res.body.subTotal)).toBe(180000);
      expect(Number(res.body.amount)).toBe(198000);
      expect(res.body.items).toHaveLength(1);
    });
  });

  describe("POST /api/invoices/:id/issue", () => {
    it("should successfully issue a DRAFT invoice", async () => {
      const res = await request(app)
        .post(`/api/invoices/${draftInvoiceId}/issue`)
        .send();

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(InvoiceStatus.ISSUED);
      expect(res.body.invoiceNumber).not.toBeNull();
      expect(res.body.invoiceNumber).toMatch(/^INV-\d{8}-\d{4}$/);
      expect(res.body.issueDate).not.toBeNull();

      issuedInvoiceId = draftInvoiceId;
    });

    it("should not allow editing after an invoice has been ISSUED", async () => {
      const res = await request(app)
        .put(`/api/invoices/${issuedInvoiceId}`)
        .send({ customerName: "Can't Change" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Only DRAFT invoices can be updated");
    });

    it("should not allow deleting after an invoice has been ISSUED", async () => {
      const res = await request(app)
        .delete(`/api/invoices/${issuedInvoiceId}`)
        .send();

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Only DRAFT invoices can be deleted");
    });
  });

  describe("POST /api/invoices/:id/replace", () => {
    it("should replace an ISSUED invoice with a new one", async () => {
      const replacementData = {
        customerName: "Nguyen Van B (Replaced)",
        customerTaxCode: "0102030405",
        items: [
          { description: "Product 1 Replaced", quantity: 1, unitPrice: 200000 },
        ],
      };

      const res = await request(app)
        .post(`/api/invoices/${issuedInvoiceId}/replace`)
        .send(replacementData);

      expect(res.status).toBe(201);
      expect(res.body.status).toBe(InvoiceStatus.ISSUED);
      expect(res.body.invoiceNumber).toMatch(/^INV-\d{8}-\d{4}$/);
      expect(res.body.referenceInvoiceId).toBe(issuedInvoiceId);
      expect(Number(res.body.amount)).toBe(220000);

      // Verify the old invoice status changed to REPLACED
      const oldInvoiceRes = await request(app).get(`/api/invoices/${issuedInvoiceId}`);
      expect(oldInvoiceRes.body.status).toBe(InvoiceStatus.REPLACED);
    });
  });

  describe("POST /api/invoices/:id/cancel", () => {
    let cancelTargetId: string;

    beforeAll(async () => {
      // Create and issue a new invoice to cancel
      const createRes = await request(app)
        .post("/api/invoices")
        .send(sampleInvoiceData);
      const issueRes = await request(app)
        .post(`/api/invoices/${createRes.body.id}/issue`)
        .send();
      cancelTargetId = issueRes.body.id;
    });

    it("should successfully cancel an ISSUED invoice", async () => {
      const res = await request(app)
        .post(`/api/invoices/${cancelTargetId}/cancel`)
        .send();

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(InvoiceStatus.CANCELED);
    });

    it("should not allow canceling an already CANCELED invoice", async () => {
      const res = await request(app)
        .post(`/api/invoices/${cancelTargetId}/cancel`)
        .send();

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Only ISSUED invoices can be canceled");
    });
  });

  describe("GET /api/invoices/:id/pdf", () => {
    it("should return a PDF file for the invoice", async () => {
      const res = await request(app).get(`/api/invoices/${issuedInvoiceId}/pdf`);
      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toBe("application/pdf");
      expect(res.headers["content-disposition"]).toContain("attachment; filename=");
      expect(res.body).toBeInstanceOf(Buffer);
    });
  });
});
