import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";

vi.mock("../lib/prisma");

import { getPrisma, getPrismaClient } from "../lib/prisma";
import { registerApiErrorHandlers } from "../app";
import { buildAuthUser, buildInteraction } from "./factories";
import { createMockPrisma } from "./helpers/prisma";
import { interactions } from "../routes/interactions";

const USER = buildAuthUser({
  id: "user_a",
  clerkId: "clerk_a",
  email: "usera@osu.edu",
});

function createTestApp(user = USER) {
  const app = new Hono();
  registerApiErrorHandlers(app);
  app.use("/*", async (c, next) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (c as any).set("user", user);
    await next();
  });
  app.route("/interactions", interactions);
  return app;
}

function postInteraction(app: Hono, body: Record<string, unknown>) {
  return app.request("/interactions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

describe("[phase:2] [regression:always] Interaction Tracking API", () => {
  const mockPrisma = createMockPrisma();

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getPrismaClient).mockReturnValue(mockPrisma);
    vi.mocked(getPrisma).mockReturnValue(mockPrisma);
  });

  it("TC-INT-001: records a view interaction", async () => {
    vi.mocked(mockPrisma.event.findUnique).mockResolvedValue(
      { id: "evt_1" } as never,
    );
    vi.mocked(mockPrisma.interaction.create).mockResolvedValue(
      buildInteraction({
        id: "int_1",
        userId: USER.id,
        eventId: "evt_1",
        action: "VIEW",
        createdAt: new Date("2026-03-31T15:00:00.000Z"),
      }) as never,
    );

    const res = await postInteraction(createTestApp(), {
      eventId: "evt_1",
      action: "VIEW",
    });

    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({
      id: "int_1",
      userId: USER.id,
      eventId: "evt_1",
      action: "VIEW",
    });
    expect(mockPrisma.event.findUnique).toHaveBeenCalledWith({
      where: { id: "evt_1" },
      select: { id: true },
    });
    expect(mockPrisma.interaction.create).toHaveBeenCalledWith({
      data: {
        userId: USER.id,
        eventId: "evt_1",
        action: "VIEW",
      },
    });
  });

  it("TC-INT-002: records a dismiss interaction", async () => {
    vi.mocked(mockPrisma.event.findUnique).mockResolvedValue(
      { id: "evt_2" } as never,
    );
    vi.mocked(mockPrisma.interaction.create).mockResolvedValue(
      buildInteraction({
        id: "int_2",
        userId: USER.id,
        eventId: "evt_2",
        action: "DISMISS",
        createdAt: new Date("2026-03-31T15:05:00.000Z"),
      }) as never,
    );

    const res = await postInteraction(createTestApp(), {
      eventId: "evt_2",
      action: "DISMISS",
    });

    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({
      id: "int_2",
      userId: USER.id,
      eventId: "evt_2",
      action: "DISMISS",
    });
    expect(mockPrisma.interaction.create).toHaveBeenCalledWith({
      data: {
        userId: USER.id,
        eventId: "evt_2",
        action: "DISMISS",
      },
    });
  });

  it("TC-INT-003: records multiple views separately", async () => {
    vi.mocked(mockPrisma.event.findUnique).mockResolvedValue(
      { id: "evt_3" } as never,
    );
    vi.mocked(mockPrisma.interaction.create)
      .mockResolvedValueOnce(
        buildInteraction({
          id: "int_3a",
          userId: USER.id,
          eventId: "evt_3",
          action: "VIEW",
          createdAt: new Date("2026-03-31T15:10:00.000Z"),
        }) as never,
      )
      .mockResolvedValueOnce(
        buildInteraction({
          id: "int_3b",
          userId: USER.id,
          eventId: "evt_3",
          action: "VIEW",
          createdAt: new Date("2026-03-31T15:11:00.000Z"),
        }) as never,
      );

    const app = createTestApp();
    const firstRes = await postInteraction(app, {
      eventId: "evt_3",
      action: "VIEW",
    });
    const secondRes = await postInteraction(app, {
      eventId: "evt_3",
      action: "VIEW",
    });

    expect(firstRes.status).toBe(201);
    expect(secondRes.status).toBe(201);
    expect(mockPrisma.event.findUnique).toHaveBeenCalledTimes(2);
    expect(mockPrisma.interaction.create).toHaveBeenCalledTimes(2);
    expect(mockPrisma.interaction.create).toHaveBeenNthCalledWith(1, {
      data: {
        userId: USER.id,
        eventId: "evt_3",
        action: "VIEW",
      },
    });
    expect(mockPrisma.interaction.create).toHaveBeenNthCalledWith(2, {
      data: {
        userId: USER.id,
        eventId: "evt_3",
        action: "VIEW",
      },
    });
  });

  it("TC-INT-004: returns 404 when the event does not exist", async () => {
    vi.mocked(mockPrisma.event.findUnique).mockResolvedValue(null as never);

    const res = await postInteraction(createTestApp(), {
      eventId: "nonexistent",
      action: "VIEW",
    });

    expect(res.status).toBe(404);
    expect(res.headers.get("content-type")).toContain("application/problem+json");
    expect(await res.json()).toMatchObject({
      type: expect.stringContaining("not-found"),
      title: "Resource not found",
      status: 404,
      detail: "Event not found",
    });
    expect(mockPrisma.interaction.create).not.toHaveBeenCalled();
  });
});
