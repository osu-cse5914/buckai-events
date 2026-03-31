import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";

vi.mock("../lib/prisma");
vi.mock("../services/embeddings", () => ({
  syncEventEmbedding: vi.fn(),
}));

import { getPrisma, getPrismaClient } from "../lib/prisma";
import { events } from "../routes/events";
import { createMockPrisma } from "./helpers/prisma";
import { syncEventEmbedding } from "../services/embeddings";

const USER = { id: "user_a", clerkId: "clerk_a", email: "usera@osu.edu" };

function createTestApp() {
  const app = new Hono();
  app.use("/*", async (c, next) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (c as any).set("user", USER);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (c as any).set("backgroundTasks", []);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (c as any).env = { GEMINI_API_KEY: "test-key" };
    await next();
  });
  app.route("/events", events);
  return app;
}

function makeEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: "evt_1",
    title: "Hackathon",
    description: "24hr hackathon",
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
    startAt: new Date("2099-04-01T09:00:00Z"),
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

describe("[phase:4] [regression:always] Event embedding integration", () => {
  const mockPrisma = createMockPrisma();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getPrismaClient).mockReturnValue(mockPrisma);
    vi.mocked(getPrisma).mockReturnValue(mockPrisma);
  });

  it("TC-EMBED-001: queues embedding generation after event creation", async () => {
    vi.mocked(mockPrisma.event.create).mockResolvedValue(makeEvent() as never);
    vi.mocked(syncEventEmbedding).mockResolvedValue({
      changed: true,
      textHash: "hash",
    });

    const response = await createTestApp().request("/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Hackathon",
        description: "24hr hackathon",
        type: "EVENT",
        location: { name: "Ohio Union" },
        startAt: "2099-04-01T09:00:00Z",
      }),
    });

    expect(response.status).toBe(201);
    expect(syncEventEmbedding).toHaveBeenCalledWith(
      mockPrisma,
      expect.objectContaining({
        id: "evt_1",
        title: "Hackathon",
      }),
      expect.any(Function),
    );
  });

  it("TC-EMBED-006: embedding failures do not block event creation", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.mocked(mockPrisma.event.create).mockResolvedValue(makeEvent() as never);
    vi.mocked(syncEventEmbedding).mockRejectedValue(new Error("embedding unavailable"));

    const response = await createTestApp().request("/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Hackathon",
        description: "24hr hackathon",
        type: "EVENT",
        location: { name: "Ohio Union" },
        startAt: "2099-04-01T09:00:00Z",
      }),
    });

    expect(response.status).toBe(201);
    expect(syncEventEmbedding).toHaveBeenCalledTimes(1);
    consoleError.mockRestore();
  });
});
