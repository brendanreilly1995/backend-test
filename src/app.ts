import express, { Express } from "express";
import { buildRouter, BalanceReader } from "./routes/api";

export function buildApp(reader: BalanceReader): Express {
  const app = express();
  app.use(express.json());
  app.use("/api", buildRouter(reader));
  return app;
}
