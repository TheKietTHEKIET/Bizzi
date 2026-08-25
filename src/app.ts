import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import invoiceRoutes from "./routes/invoice.routes";
import { errorHandler } from "./middlewares/error.middleware";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, "../public")));

// Routes
app.use("/api/invoices", invoiceRoutes);

// Simple health check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});

// Error handling
app.use(errorHandler);

export default app;
