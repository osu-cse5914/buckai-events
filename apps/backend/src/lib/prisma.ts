import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import type { Context } from "hono";
import type { AppEnv } from "./types";

function shouldUseNeonAdapter(connectionString: string) {
  try {
    const hostname = new URL(connectionString).hostname.toLowerCase();
    return hostname === "api.neon.tech" || hostname.endsWith(".neon.tech");
  } catch {
    return false;
  }
}

export function getPrismaClient(connectionString?: string): PrismaClient {
  const connStr = connectionString ?? process.env.DATABASE_URL;
  if (!connStr) {
    throw new Error("DATABASE_URL is not set. Add it to apps/backend/.env");
  }

  const adapter = shouldUseNeonAdapter(connStr)
    ? new PrismaNeon({ connectionString: connStr })
    : new PrismaPg(connStr);
  return new PrismaClient({ adapter, log: ["warn", "error"] });
}

export function getPrisma(c: Context<AppEnv>): PrismaClient {
  const existingPrisma = c.get("prisma");
  if (existingPrisma) {
    return existingPrisma;
  }

  const connectionString =
    (typeof c.env?.DATABASE_URL === "string" ? c.env.DATABASE_URL : undefined) ??
    (typeof process !== "undefined" ? process.env.DATABASE_URL : undefined);
  const prisma = getPrismaClient(connectionString);
  c.set("prisma", prisma);
  return prisma;
}
