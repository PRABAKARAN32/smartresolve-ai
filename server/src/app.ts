import express, { Request, Response } from "express";
import helmet from "helmet";
import cors from "cors";
import mongoose from "mongoose";
import { authRouter, meRouter } from "./routes/auth";
import { errorHandler, notFound } from "./middleware/error";

export function createApp(corsOrigins: string[] = []) {
  const app = express();

  app.set("trust proxy", 1); // Render sits behind a proxy; needed for correct rate limiting
  app.use(helmet());
  app.use(cors({ origin: corsOrigins }));
  app.use(express.json({ limit: "10kb" }));

  app.get("/health", (_req: Request, res: Response) => {
    const dbUp = mongoose.connection.readyState === 1;
    res.status(dbUp ? 200 : 503).json({
      status: dbUp ? "ok" : "degraded",
      db: dbUp ? "up" : "down",
      time: new Date().toISOString(),
    });
  });

  app.use("/auth", authRouter);
  app.use("/me", meRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
