import { Router } from "express";
import { InvoiceController } from "../controllers/invoice.controller";
import { validateBody } from "../middlewares/validation.middleware";
import {
  CreateInvoiceSchema,
  UpdateInvoiceSchema,
  ReplaceInvoiceSchema,
} from "../schemas/invoice.schema";

const router = Router();
const controller = new InvoiceController();

// CRUD
router.post("/", validateBody(CreateInvoiceSchema), controller.createInvoice.bind(controller));
router.get("/", controller.listInvoices.bind(controller));
router.get("/:id", controller.getInvoiceById.bind(controller));
router.put("/:id", validateBody(UpdateInvoiceSchema), controller.updateInvoice.bind(controller));
router.delete("/:id", controller.deleteInvoice.bind(controller));

// Lifecycle & Operations
router.post("/:id/issue", controller.issueInvoice.bind(controller));
router.post("/:id/cancel", controller.cancelInvoice.bind(controller));
router.post("/:id/replace", validateBody(ReplaceInvoiceSchema), controller.replaceInvoice.bind(controller));
router.get("/:id/pdf", controller.downloadPdf.bind(controller));

export default router;
