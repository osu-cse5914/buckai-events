import { vi } from "vitest";
import type { PrismaClient } from "@prisma/client";

/**
 * Returns a typed mock of PrismaClient with vi.fn() stubs.
 *
 * Usage in a test file:
 *
 *   import { createMockPrisma } from "./helpers/prisma";
 *   import { getPrismaClient } from "../lib/prisma";
 *
 *   vi.mock("../lib/prisma");
 *
 *   const mockPrisma = createMockPrisma();
 *   vi.mocked(getPrismaClient).mockReturnValue(mockPrisma);
 *
 * Call vi.resetAllMocks() in beforeEach to keep tests isolated.
 */
export function createMockPrisma(): PrismaClient {
  // Add model stubs here as route tests are added.
  // The cast to PrismaClient is intentional — only stub what you use.
  return {
    $queryRaw: vi.fn().mockResolvedValue([{ "?column?": 1 }]),
    $disconnect: vi.fn().mockResolvedValue(undefined),
    user: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    event: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    follow: {
      findUnique: vi.fn(),
      count: vi.fn(),
    },
  } as unknown as PrismaClient;
}
