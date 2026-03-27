import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import type { Context } from "hono";

const prismaClients = new Map<string, PrismaClient>();

export function getPrismaClient(connectionString?: string): PrismaClient {
  const connStr = connectionString ?? process.env.DATABASE_URL;
  if (!connStr) {
    throw new Error("DATABASE_URL is not set. Add it to apps/api/.env");
  }

  const existingClient = prismaClients.get(connStr);
  if (existingClient) {
    return existingClient;
  }

  const adapter = new PrismaNeon({ connectionString: connStr });
  const prisma = new PrismaClient({ adapter, log: ["warn", "error"] });
  prismaClients.set(connStr, prisma);
  return prisma;
}

export function getPrisma(c: Context): PrismaClient {
  const existingPrisma = c.get("prisma");
  if (existingPrisma) {
    return existingPrisma;
  }

  const connectionString =
    (c.env as Record<string, string>)?.DATABASE_URL ??
    (typeof process !== "undefined" ? process.env.DATABASE_URL : undefined);
  const prisma = getPrismaClient(connectionString);
  c.set("prisma", prisma);
  return prisma;
}
