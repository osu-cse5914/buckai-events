import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../lib/prisma");

import { getPrismaClient } from "../lib/prisma";
import { createMockPrisma } from "./helpers/prisma";
import { autoCompleteEvents } from "../scheduled/auto-complete";

describe("[phase:1] [regression:always] Auto-completion cron (#43)", () => {
  const mockPrisma = createMockPrisma();

  beforeEach(() => {
    vi.mocked(getPrismaClient).mockReturnValue(mockPrisma);
  });

  // S-EVT-10 → TC-EVT-010
  it("TC-EVT-010: sets events with past endAt to COMPLETED", async () => {
    vi.mocked(mockPrisma.event.updateMany).mockResolvedValue({ count: 2 } as never);

    const result = await autoCompleteEvents(mockPrisma);

    expect(result.count).toBe(2);
    expect(mockPrisma.event.updateMany).toHaveBeenCalledWith({
      where: {
        endAt: { not: null, lt: expect.any(Date) },
        status: { notIn: ["COMPLETED", "CANCELLED"] },
      },
      data: { status: "COMPLETED" },
    });
  });

  // S-EVT-11 → TC-EVT-011
  it("TC-EVT-011: does not auto-complete events without endAt", async () => {
    vi.mocked(mockPrisma.event.updateMany).mockResolvedValue({ count: 0 } as never);

    await autoCompleteEvents(mockPrisma);

    // The query requires endAt to be non-null, so null-endAt events are excluded
    expect(mockPrisma.event.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          endAt: { not: null, lt: expect.any(Date) },
        }),
      }),
    );
  });

  it("does not modify CANCELLED events", async () => {
    vi.mocked(mockPrisma.event.updateMany).mockResolvedValue({ count: 0 } as never);

    await autoCompleteEvents(mockPrisma);

    expect(mockPrisma.event.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { notIn: ["COMPLETED", "CANCELLED"] },
        }),
      }),
    );
  });

  it("does not modify already COMPLETED events", async () => {
    vi.mocked(mockPrisma.event.updateMany).mockResolvedValue({ count: 0 } as never);

    await autoCompleteEvents(mockPrisma);

    expect(mockPrisma.event.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { notIn: ["COMPLETED", "CANCELLED"] },
        }),
      }),
    );
  });
});
