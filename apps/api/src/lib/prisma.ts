import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import type { Context } from "hono";
import type { AppEnv } from "./types";

export function getPrismaClient(connectionString?: string): PrismaClient {
  const connStr = connectionString ?? process.env.DATABASE_URL;
  if (!connStr) {
    throw new Error("DATABASE_URL is not set. Add it to apps/api/.env");
  }

  const adapter = new PrismaNeon({ connectionString: connStr });
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
