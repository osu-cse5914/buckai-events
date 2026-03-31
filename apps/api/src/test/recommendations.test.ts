import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";

vi.mock("../lib/prisma");

import { getPrisma, getPrismaClient } from "../lib/prisma";
import { recommendations } from "../routes/recommendations";
import { createMockPrisma } from "./helpers/prisma";

const USER = { id: "user_a", clerkId: "clerk_a", email: "usera@osu.edu" };

function createTestApp() {
  const app = new Hono();
  app.use("/*", async (c, next) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (c as any).set("user", USER);
    await next();
  });
  app.route("/recommendations", recommendations);
  return app;
}

function makeEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: "evt_1",
    title: "Hackathon",
    description: "24hr hackathon",
    type: "EVENT",
    category: "tech",
    status: "OPEN",
    startAt: new Date("2099-04-01T09:00:00Z"),
    interactions: [],
    ...overrides,
  };
}

describe("[phase:4] [regression:always] Recommendation feed", () => {
  const mockPrisma = createMockPrisma();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getPrismaClient).mockReturnValue(mockPrisma);
    vi.mocked(getPrisma).mockReturnValue(mockPrisma);
  });

  it("TC-REC-MODEL-001: boosts events that match the user's interests", async () => {
    vi.mocked(mockPrisma.user.findUnique).mockResolvedValue({
      interests: ["music", "tech"],
    } as never);
    vi.mocked(mockPrisma.event.findMany).mockResolvedValue(
      [
        makeEvent({
          id: "evt_music",
          title: "Jazz Night",
          category: "music",
          interactions: [{ userId: "someone", action: "VIEW" }],
        }),
        makeEvent({
          id: "evt_general",
          title: "Board Games",
          category: "social",
          interactions: [{ userId: "someone", action: "VIEW" }],
        }),
      ] as never,
    );

    const response = await createTestApp().request("/recommendations");

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      data: Array<{ id: string }>;
      pagination: { total: number };
    };
    expect(body.data.map((event) => event.id)).toEqual(["evt_music", "evt_general"]);
    expect(body.pagination.total).toBe(2);
  });

  it("TC-REC-MODEL-002: uses popularity when interest match is equal", async () => {
    vi.mocked(mockPrisma.user.findUnique).mockResolvedValue({
      interests: ["music"],
    } as never);
    vi.mocked(mockPrisma.event.findMany).mockResolvedValue(
      [
        makeEvent({
          id: "evt_popular",
          category: "music",
          interactions: new Array(5).fill(null).map(() => ({
            userId: "someone",
            action: "VIEW",
          })),
        }),
        makeEvent({
          id: "evt_less_popular",
          category: "music",
          interactions: [{ userId: "someone", action: "VIEW" }],
        }),
      ] as never,
    );

    const response = await createTestApp().request("/recommendations");
    const body = (await response.json()) as { data: Array<{ id: string }> };

    expect(body.data.map((event) => event.id)).toEqual([
      "evt_popular",
      "evt_less_popular",
    ]);
  });

  it("TC-REC-MODEL-004: excludes events the user dismissed", async () => {
    vi.mocked(mockPrisma.user.findUnique).mockResolvedValue({
      interests: [],
    } as never);
    vi.mocked(mockPrisma.event.findMany).mockResolvedValue(
      [
        makeEvent({
          id: "evt_dismissed",
          interactions: [{ userId: USER.id, action: "DISMISS" }],
        }),
        makeEvent({
          id: "evt_visible",
          interactions: [{ userId: "someone", action: "VIEW" }],
        }),
      ] as never,
    );

    const response = await createTestApp().request("/recommendations");
    const body = (await response.json()) as { data: Array<{ id: string }> };

    expect(body.data.map((event) => event.id)).toEqual(["evt_visible"]);
  });

  it("TC-FEED-002: filters the feed by event type and paginates results", async () => {
    vi.mocked(mockPrisma.user.findUnique).mockResolvedValue({
      interests: [],
    } as never);
    vi.mocked(mockPrisma.event.findMany).mockResolvedValue(
      [
        makeEvent({ id: "evt_1", type: "EVENT" }),
        makeEvent({ id: "evt_2", type: "EVENT", startAt: new Date("2099-04-02T09:00:00Z") }),
      ] as never,
    );

    const response = await createTestApp().request("/recommendations?type=EVENT&limit=1&offset=1");

    expect(response.status).toBe(200);
    expect(mockPrisma.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ type: "EVENT" }),
      }),
    );

    const body = (await response.json()) as {
      data: Array<{ id: string }>;
      pagination: { total: number; limit: number; offset: number };
    };
    expect(body.data.map((event) => event.id)).toEqual(["evt_2"]);
    expect(body.pagination).toEqual({ total: 2, limit: 1, offset: 1 });
  });
});
