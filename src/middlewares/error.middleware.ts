import { Request, Response, NextFunction } from "express";
import { ApiError } from "../services/invoice.service";

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error("Error occurred:", error);

  if (error instanceof ApiError) {
    res.status(error.statusCode).json({
      message: error.message,
    });
    return;
  }

  // Handle default prisma or unexpected database errors
  if (error.name === "PrismaClientKnownRequestError") {
    res.status(400).json({
      message: "Database operation failed",
      details: error.message,
    });
    return;
  }

  res.status(500).json({
    message: "Internal Server Error",
  });
};
