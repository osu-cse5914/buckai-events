import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";

vi.mock("../lib/prisma");

import { getPrisma, getPrismaClient } from "../lib/prisma";
import { createEventsRouter } from "../routes/events";
import { buildAuthUser, buildEvent } from "./factories";
import { createMockPrisma } from "./helpers/prisma";

const USER = buildAuthUser({
  id: "user_a",
  clerkId: "clerk_a",
  email: "usera@osu.edu",
});

function makeEvent(overrides: Record<string, unknown> = {}) {
  return buildEvent({
    id: "evt_ai_1",
    title: "Jazz Night at the Union",
    description: "Live jazz performance featuring student musicians",
    category: null,
    creatorId: USER.id,
    startAt: new Date("2025-04-01T09:00:00Z"),
    createdAt: new Date("2025-03-01T00:00:00Z"),
    updatedAt: new Date("2025-03-01T00:00:00Z"),
    ...overrides,
  });
}

function createTestApp(scheduleEventPipeline = vi.fn()) {
  const app = new Hono();
  app.use("/*", async (c, next) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (c as any).set("user", USER);
    await next();
  });
  app.route("/events", createEventsRouter({ scheduleEventPipeline }));
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
    const scheduleEventPipeline = vi.fn();

    vi.mocked(mockPrisma.event.create).mockResolvedValue(created as never);

    const res = await postEvent(createTestApp(scheduleEventPipeline), {
      title: "Jazz Night at the Union",
      description: "Live jazz performance featuring student musicians",
      type: "EVENT",
      location: { name: "Ohio Union" },
      startAt: "2025-04-01T09:00:00Z",
    });

    expect(res.status).toBe(201);
    expect(scheduleEventPipeline).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        eventId: created.id,
        trigger: "EVENT_CREATE",
        stages: ["TAGGING", "EMBEDDING"],
      }),
    );
  });

  it("TC-EVT-013: returns 201 and preserves empty AI fields when background tagging setup fails", async () => {
    const created = makeEvent();
    const scheduleEventPipeline = vi.fn(() => {
      throw new Error("AI unavailable");
    });

    vi.mocked(mockPrisma.event.create).mockResolvedValue(created as never);

    const res = await postEvent(createTestApp(scheduleEventPipeline), {
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

  it("TC-EMBED-002: schedules an embedding refresh after a successful content update", async () => {
    const existing = makeEvent();
    const updated = makeEvent({ description: "Updated lineup and venue details" });
    const scheduleEventPipeline = vi.fn();

    vi.mocked(mockPrisma.event.findUnique).mockResolvedValue(existing as never);
    vi.mocked(mockPrisma.event.update).mockResolvedValue(updated as never);

    const res = await createTestApp(scheduleEventPipeline).request(`/events/${existing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: "Updated lineup and venue details",
      }),
    });

    expect(res.status).toBe(200);
    expect(scheduleEventPipeline).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        eventId: existing.id,
        trigger: "EVENT_UPDATE",
        stages: ["EMBEDDING"],
      }),
    );
  });
});
