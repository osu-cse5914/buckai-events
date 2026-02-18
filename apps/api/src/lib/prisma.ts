import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export function getPrismaClient(): PrismaClient {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Add it to apps/api/.env");
  }

  const adapter = new PrismaPg(new Pool({ connectionString }));
  const prisma = new PrismaClient({
    adapter,
    log: ["warn", "error"]
  });

  globalForPrisma.prisma = prisma;

  return prisma;
}
