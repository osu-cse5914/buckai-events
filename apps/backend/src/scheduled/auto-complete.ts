import type { PrismaClient } from "@prisma/client";

/**
 * Auto-completes events whose endAt has passed.
 * Called by the Cloudflare Worker cron trigger every 15 minutes.
 *
 * - Sets status to COMPLETED for events where endAt < now
 * - Skips events already COMPLETED or CANCELLED
 * - Events with null endAt are never affected
 */
export async function autoCompleteEvents(prisma: PrismaClient) {
  return prisma.event.updateMany({
    where: {
      endAt: { not: null, lt: new Date() },
      status: { notIn: ["COMPLETED", "CANCELLED"] },
    },
    data: { status: "COMPLETED" },
  });
}
