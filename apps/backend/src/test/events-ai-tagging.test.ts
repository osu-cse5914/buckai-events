import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";

vi.mock("../lib/prisma");

import { getPrisma, getPrismaClient } from "../lib/prisma";
import { createEventsRouter } from "../routes/events";
import { createMockPrisma } from "./helpers/prisma";

const USER = {
  id: "user_a",
  clerkId: "clerk_a",
  email: "usera@osu.edu",
};

function makeEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: "evt_ai_1",
    title: "Jazz Night at the Union",
    description: "Live jazz performance featuring student musicians",
    summary: null,
    type: "EVENT",
    source: "USER",
    externalId: null,
    category: null,
    tags: [],
    imageUrl: null,
    ticketUrl: null,
    locationName: "Ohio Union",
    locationLatitude: null,
    locationLongitude: null,
    startAt: new Date("2025-04-01T09:00:00Z"),
    endAt: null,
    compensationAmount: null,
    compensationCurrency: "USD",
    compensationType: null,
    status: "OPEN",
    creatorId: USER.id,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createTestApp(enqueueEventTagging = vi.fn()) {
  const app = new Hono();
  app.use("/*", async (c, next) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (c as any).set("user", USER);
    await next();
  });
  app.route("/events", createEventsRouter({ enqueueEventTagging }));
  return app;
}

function postEvent(app: Hono, body: Record<string, unknown>) {
  return app.request("/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("[phase:4] [regression:always] Event AI tagging", () => {
  const mockPrisma = createMockPrisma();

  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(getPrismaClient).mockReturnValue(mockPrisma);
    vi.mocked(getPrisma).mockReturnValue(mockPrisma);
  });

  it("TC-EVT-012: schedules AI tagging after a successful event create", async () => {
    const created = makeEvent();
    const enqueueEventTagging = vi.fn();

    vi.mocked(mockPrisma.event.create).mockResolvedValue(created as never);

    const res = await postEvent(createTestApp(enqueueEventTagging), {
      title: "Jazz Night at the Union",
      description: "Live jazz performance featuring student musicians",
      type: "EVENT",
      location: { name: "Ohio Union" },
      startAt: "2025-04-01T09:00:00Z",
    });

    expect(res.status).toBe(201);
    expect(enqueueEventTagging).toHaveBeenCalledWith(
      expect.anything(),
      created.id,
      expect.objectContaining({
        title: "Jazz Night at the Union",
        description: "Live jazz performance featuring student musicians",
      }),
    );
  });

  it("TC-EVT-013: returns 201 and preserves empty AI fields when background tagging setup fails", async () => {
    const created = makeEvent();
    const enqueueEventTagging = vi.fn(() => {
      throw new Error("AI unavailable");
    });

    vi.mocked(mockPrisma.event.create).mockResolvedValue(created as never);

    const res = await postEvent(createTestApp(enqueueEventTagging), {
      title: "Jazz Night at the Union",
      description: "Live jazz performance featuring student musicians",
      type: "EVENT",
      location: { name: "Ohio Union" },
      startAt: "2025-04-01T09:00:00Z",
    });

    expect(res.status).toBe(201);
    expect(mockPrisma.event.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tags: [],
          summary: null,
          category: null,
        }),
      }),
    );
  });
});
