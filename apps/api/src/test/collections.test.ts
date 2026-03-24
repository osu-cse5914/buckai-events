import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";

vi.mock("../lib/prisma");

import { getPrismaClient, getPrisma } from "../lib/prisma";
import { createMockPrisma } from "./helpers/prisma";
import { collections } from "../routes/collections";

const USER_A = { id: "user_a", clerkId: "clerk_a", email: "usera@osu.edu" };
const USER_B = { id: "user_b", clerkId: "clerk_b", email: "userb@osu.edu" };

function createTestApp(user = USER_A) {
  const app = new Hono();
  app.use("/*", async (c, next) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (c as any).set("user", user);
    await next();
  });
  app.route("/collections", collections);
  return app;
}

function deleteCollection(app: Hono, id: string) {
  return app.request(`/collections/${id}`, { method: "DELETE" });
}

// --- Tests ---

describe("[phase:2] [regression:always] Collection management API", () => {
  const mockPrisma = createMockPrisma();

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getPrismaClient).mockReturnValue(mockPrisma);
    vi.mocked(getPrisma).mockReturnValue(mockPrisma);
  });

  // GET /:id behavior
  it("TC-COL-007: public collection is visible to other users and includes items", async () => {
    const col = {
      id: "col1",
      userId: USER_A.id,
      visibility: "PUBLIC",
      items: [
        { id: "ci1", event: { id: "evt1", title: "Hackathon" } },
      ],
    };
    vi.mocked(mockPrisma.collection.findUnique).mockResolvedValue(col as never);

    const res = await createTestApp(USER_B).request("/collections/col1");
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.id).toBe("col1");
    expect(body.visibility).toBe("PUBLIC");
    const items = body.items as Array<{ event: { id: string } }>;
    expect(items).toHaveLength(1);
    expect(items[0].event.id).toBe("evt1");
  });

  it("TC-COL-008: private collection of another user returns 404", async () => {
    const col = {
      id: "col1",
      userId: USER_A.id,
      visibility: "PRIVATE",
      items: [],
    };
    vi.mocked(mockPrisma.collection.findUnique).mockResolvedValue(col as never);

    const res = await createTestApp(USER_B).request("/collections/col1");
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Collection not found" });
  });

  it("owner can view their own private collection", async () => {
    const col = {
      id: "col1",
      userId: USER_A.id,
      visibility: "PRIVATE",
      items: [],
    };
    vi.mocked(mockPrisma.collection.findUnique).mockResolvedValue(col as never);

    const res = await createTestApp(USER_A).request("/collections/col1");
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.id).toBe("col1");
    expect(body.visibility).toBe("PRIVATE");
  });

  // S-COL-10 → TC-COL-010
  it("TC-COL-010: delete collection owned by user, returns 204 and cascades", async () => {
    const col = { id: "col1", userId: USER_A.id };
    vi.mocked(mockPrisma.collection.findUnique).mockResolvedValue(col as never);
    vi.mocked(mockPrisma.collection.delete).mockResolvedValue(col as never);

    const res = await deleteCollection(createTestApp(), "col1");

    expect(res.status).toBe(204);
    // body should be empty for 204
    expect(await res.text()).toBe("");
    expect(mockPrisma.collection.delete).toHaveBeenCalledWith({ where: { id: "col1" } });
    // we rely on DB cascade, so we shouldn't call collectionItem.delete ourselves
    expect(mockPrisma.collectionItem.delete).not.toHaveBeenCalled();
  });

  it("returns 404 when collection does not exist", async () => {
    vi.mocked(mockPrisma.collection.findUnique).mockResolvedValue(null as never);

    const res = await deleteCollection(createTestApp(), "notfound");
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Collection not found" });
    expect(mockPrisma.collection.delete).not.toHaveBeenCalled();
  });

  it("returns 403 when requester is not the owner", async () => {
    const col = { id: "col1", userId: USER_B.id };
    vi.mocked(mockPrisma.collection.findUnique).mockResolvedValue(col as never);

    const res = await deleteCollection(createTestApp(USER_A), "col1");
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Only the owner can delete this collection" });
    expect(mockPrisma.collection.delete).not.toHaveBeenCalled();
  });
});
