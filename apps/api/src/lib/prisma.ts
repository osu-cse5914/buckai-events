import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";

export function getPrismaClient(connectionString?: string): PrismaClient {
  const connStr = connectionString ?? process.env.DATABASE_URL;
  if (!connStr) {
    throw new Error("DATABASE_URL is not set. Add it to apps/api/.env");
  }

  const adapter = new PrismaNeon({ connectionString: connStr });
  return new PrismaClient({ adapter, log: ["warn", "error"] });
}
