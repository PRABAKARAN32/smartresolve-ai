import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { HttpError } from "../utils/errors";

export function notFound(_req: Request, res: Response) {
  res
    .status(404)
    .json({ error: { code: "NOT_FOUND", message: "Route not found" } });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Please correct the highlighted fields.",
        details: err.issues.map((i) => ({
          field: i.path.join("."),
          message: i.message,
        })),
      },
    });
  }

  const e = err as { type?: string; code?: number };
  if (e?.type === "entity.parse.failed") {
    return res.status(400).json({
      error: {
        code: "INVALID_JSON",
        message: "Request body is not valid JSON",
      },
    });
  }
  if (e?.type === "entity.too.large") {
    return res.status(413).json({
      error: { code: "TOO_LARGE", message: "Request body is too large" },
    });
  }
  if (e?.code === 11000) {
    return res.status(409).json({
      error: { code: "CONFLICT", message: "That record already exists" },
    });
  }

  console.error(err); // logged on the server only, never sent to the user
  res
    .status(500)
    .json({ error: { code: "INTERNAL", message: "Something went wrong" } });
}
