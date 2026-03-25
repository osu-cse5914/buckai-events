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

function patchCollection(app: Hono, id: string, body: Record<string, unknown>) {
  return app.request(`/collections/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function deleteCollectionItem(app: Hono, id: string, eventId: string) {
  return app.request(`/collections/${id}/items/${eventId}`, { method: "DELETE" });
}

describe("[phase:2] [regression:always] Collection management API", () => {
  const mockPrisma = createMockPrisma();

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getPrismaClient).mockReturnValue(mockPrisma);
    vi.mocked(getPrisma).mockReturnValue(mockPrisma);
  });

  it("TC-COL-006: lists the authenticated user's collections ordered by updatedAt desc with item counts", async () => {
    const collectionsForUser = [
      {
        id: "col2",
        userId: USER_A.id,
        name: "Newest",
        visibility: "PUBLIC",
        createdAt: new Date("2026-01-01T00:00:00Z"),
        updatedAt: new Date("2026-01-03T00:00:00Z"),
        _count: { items: 3 },
      },
      {
        id: "col1",
        userId: USER_A.id,
        name: "Older",
        visibility: "PRIVATE",
        createdAt: new Date("2026-01-01T00:00:00Z"),
        updatedAt: new Date("2026-01-02T00:00:00Z"),
        _count: { items: 1 },
      },
    ];
    vi.mocked(mockPrisma.collection.findMany).mockResolvedValue(collectionsForUser as never);

    const res = await createTestApp(USER_A).request("/collections");

    expect(res.status).toBe(200);
    expect(mockPrisma.collection.findMany).toHaveBeenCalledWith({
      where: { userId: USER_A.id },
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { items: true } } },
    });

    const body = (await res.json()) as Array<Record<string, unknown>>;
    expect(body).toHaveLength(2);
    expect(body[0].id).toBe("col2");
    expect(body[0].itemCount).toBe(3);
    expect(body[1].id).toBe("col1");
    expect(body[1].itemCount).toBe(1);
  });

  it("TC-COL-007: public collection is visible to other users and includes items", async () => {
    const col = {
      id: "col1",
      userId: USER_A.id,
      visibility: "PUBLIC",
      items: [{ id: "ci1", event: { id: "evt1", title: "Hackathon" } }],
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

  it("TC-COL-009: owner can update collection name and visibility", async () => {
    const existing = {
      id: "col1",
      userId: USER_A.id,
      name: "Private Picks",
      visibility: "PRIVATE",
    };
    const updated = {
      ...existing,
      name: "Public Picks",
      visibility: "PUBLIC",
    };
    vi.mocked(mockPrisma.collection.findUnique).mockResolvedValue(existing as never);
    vi.mocked(mockPrisma.collection.update).mockResolvedValue(updated as never);

    const res = await patchCollection(createTestApp(USER_A), "col1", {
      name: "Public Picks",
      visibility: "PUBLIC",
    });

    expect(res.status).toBe(200);
    expect(mockPrisma.collection.update).toHaveBeenCalledWith({
      where: { id: "col1" },
      data: { name: "Public Picks", visibility: "PUBLIC" },
    });

    const body = (await res.json()) as Record<string, unknown>;
    expect(body.name).toBe("Public Picks");
    expect(body.visibility).toBe("PUBLIC");
  });

  it("returns 403 when a non-owner attempts to update a collection", async () => {
    vi.mocked(mockPrisma.collection.findUnique).mockResolvedValue(
      { id: "col1", userId: USER_B.id, name: "Private Picks", visibility: "PRIVATE" } as never,
    );

    const res = await patchCollection(createTestApp(USER_A), "col1", {
      visibility: "PUBLIC",
    });

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Only the owner can update this collection" });
    expect(mockPrisma.collection.update).not.toHaveBeenCalled();
  });

  it("TC-COL-005: owner can remove an event from a collection without deleting the event", async () => {
    vi.mocked(mockPrisma.collection.findUnique).mockResolvedValue(
      { id: "col1", userId: USER_A.id } as never,
    );
    vi.mocked(mockPrisma.collectionItem.findUnique).mockResolvedValue(
      { id: "ci1", collectionId: "col1", eventId: "evt1" } as never,
    );
    vi.mocked(mockPrisma.collectionItem.delete).mockResolvedValue(
      { id: "ci1", collectionId: "col1", eventId: "evt1" } as never,
    );

    const res = await deleteCollectionItem(createTestApp(USER_A), "col1", "evt1");

    expect(res.status).toBe(204);
    expect(await res.text()).toBe("");
    expect(mockPrisma.collectionItem.delete).toHaveBeenCalledWith({
      where: {
        collectionId_eventId: {
          collectionId: "col1",
          eventId: "evt1",
        },
      },
    });
    expect(mockPrisma.event.delete).not.toHaveBeenCalled();
  });

  it("returns 403 when a non-owner attempts to remove a collection item", async () => {
    vi.mocked(mockPrisma.collection.findUnique).mockResolvedValue(
      { id: "col1", userId: USER_B.id } as never,
    );

    const res = await deleteCollectionItem(createTestApp(USER_A), "col1", "evt1");

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({
      error: "Only the owner can remove items from this collection",
    });
    expect(mockPrisma.collectionItem.delete).not.toHaveBeenCalled();
  });

  it("TC-COL-010: delete collection owned by user, returns 204 and cascades", async () => {
    const col = { id: "col1", userId: USER_A.id };
    vi.mocked(mockPrisma.collection.findUnique).mockResolvedValue(col as never);
    vi.mocked(mockPrisma.collection.delete).mockResolvedValue(col as never);

    const res = await deleteCollection(createTestApp(), "col1");

    expect(res.status).toBe(204);
    expect(await res.text()).toBe("");
    expect(mockPrisma.collection.delete).toHaveBeenCalledWith({ where: { id: "col1" } });
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
