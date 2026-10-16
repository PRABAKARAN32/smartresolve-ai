import { NextFunction, Request, RequestHandler, Response } from "express";

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

// Forwards async errors to the error handler (works on Express 4 and 5)
export const asyncHandler =
  (
    fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
  ): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };

// Rejects anything that is not a 24-char hex ObjectId
export function parseObjectId(value: unknown): string {
  if (typeof value !== "string" || !/^[a-f\d]{24}$/i.test(value)) {
    throw new HttpError(400, "INVALID_ID", "Invalid identifier");
  }
  return value;
}
