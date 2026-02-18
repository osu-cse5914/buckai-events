import "dotenv/config";
import cors from "cors";
import express from "express";
import { getPrismaClient } from "./lib/prisma";

const app = express();
const port = Number(process.env.PORT ?? 3001);

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",")
  : ["http://localhost:5173"];

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "api",
    timestamp: new Date().toISOString()
  });
});

app.get("/api/ping", (_req, res) => {
  res.status(200).json({ message: "pong" });
});

app.get("/api/db-check", async (_req, res) => {
  try {
    const prisma = getPrismaClient();
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ database: "connected" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "disconnected";
    res.status(500).json({ database: "disconnected", error: message });
  }
});

const server = app.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`);
});

function shutdown() {
  console.log("Shutting down...");
  server.close(async () => {
    try {
      const prisma = getPrismaClient();
      await prisma.$disconnect();
    } catch {
      // client may not have been initialized
    }
    process.exit(0);
  });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
