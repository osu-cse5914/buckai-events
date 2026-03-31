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

function listCollections(app: Hono) {
  return app.request("/collections");
}

function patchCollection(
  app: Hono,
  id: string,
  body: Record<string, unknown>,
) {
  return app.request(`/collections/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function addCollectionItem(
  app: Hono,
  id: string,
  body: Record<string, unknown>,
) {
  return app.request(`/collections/${id}/items`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function removeCollectionItem(app: Hono, id: string, eventId: string) {
  return app.request(`/collections/${id}/items/${eventId}`, {
    method: "DELETE",
  });
}

// --- Tests ---

describe("[phase:2] [regression:always] Collection management API", () => {
  const mockPrisma = createMockPrisma();

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getPrismaClient).mockReturnValue(mockPrisma);
    vi.mocked(getPrisma).mockReturnValue(mockPrisma);
  });

  it("TC-COL-006: list own collections ordered by updatedAt descending with item counts", async () => {
    const collectionsResult = [
      {
        id: "col3",
        userId: USER_A.id,
        name: "Newest",
        visibility: "PRIVATE",
        updatedAt: "2026-03-31T15:00:00.000Z",
        _count: { items: 2 },
      },
      {
        id: "col2",
        userId: USER_A.id,
        name: "Middle",
        visibility: "PUBLIC",
        updatedAt: "2026-03-31T14:00:00.000Z",
        _count: { items: 1 },
      },
      {
        id: "col1",
        userId: USER_A.id,
        name: "Oldest",
        visibility: "PRIVATE",
        updatedAt: "2026-03-31T13:00:00.000Z",
        _count: { items: 0 },
      },
    ];
    vi.mocked(mockPrisma.collection.findMany).mockResolvedValue(
      collectionsResult as never,
    );

    const res = await listCollections(createTestApp(USER_A));

    expect(res.status).toBe(200);
    expect(mockPrisma.collection.findMany).toHaveBeenCalledWith({
      where: { userId: USER_A.id },
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { items: true } } },
    });
    expect(await res.json()).toEqual(collectionsResult);
  });

  it("TC-COL-009: owner can update collection visibility", async () => {
    const col = {
      id: "col1",
      userId: USER_A.id,
      name: "Music",
      visibility: "PRIVATE",
    };
    const updated = {
      ...col,
      visibility: "PUBLIC",
    };
    vi.mocked(mockPrisma.collection.findUnique).mockResolvedValue(col as never);
    vi.mocked(mockPrisma.collection.update).mockResolvedValue(updated as never);

    const res = await patchCollection(createTestApp(USER_A), "col1", {
      visibility: "PUBLIC",
    });

    expect(res.status).toBe(200);
    expect(mockPrisma.collection.update).toHaveBeenCalledWith({
      where: { id: "col1" },
      data: { visibility: "PUBLIC" },
    });
    expect(await res.json()).toEqual(updated);
  });

  it("patch collection returns 403 for non-owner", async () => {
    const col = {
      id: "col1",
      userId: USER_B.id,
      name: "Music",
      visibility: "PRIVATE",
    };
    vi.mocked(mockPrisma.collection.findUnique).mockResolvedValue(col as never);

    const res = await patchCollection(createTestApp(USER_A), "col1", {
      visibility: "PUBLIC",
    });

    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({
      type: expect.stringContaining("forbidden"),
      title: "Forbidden",
      status: 403,
      detail: "Only the owner can update this collection",
    });
    expect(mockPrisma.collection.update).not.toHaveBeenCalled();
  });

  it("TC-COL-003: owner can add event to collection and SAVE interaction is recorded", async () => {
    const collection = {
      id: "col1",
      userId: USER_A.id,
      visibility: "PRIVATE",
    };
    const event = {
      id: "evt1",
      title: "Hackathon",
    };
    const createdItem = {
      id: "item1",
      collectionId: "col1",
      eventId: "evt1",
    };
    vi.mocked(mockPrisma.collection.findUnique).mockResolvedValue(
      collection as never,
    );
    vi.mocked(mockPrisma.event.findUnique).mockResolvedValue(event as never);
    vi.mocked(mockPrisma.collectionItem.findUnique).mockResolvedValue(
      null as never,
    );
    vi.mocked(mockPrisma.collectionItem.create).mockResolvedValue(
      createdItem as never,
    );
    vi.mocked(mockPrisma.interaction.create).mockResolvedValue({} as never);

    const res = await addCollectionItem(createTestApp(USER_A), "col1", {
      eventId: "evt1",
    });

    expect(res.status).toBe(201);
    expect(mockPrisma.collectionItem.create).toHaveBeenCalledWith({
      data: {
        collectionId: "col1",
        eventId: "evt1",
      },
    });
    expect(mockPrisma.interaction.create).toHaveBeenCalledWith({
      data: {
        userId: USER_A.id,
        eventId: "evt1",
        action: "SAVE",
      },
    });
    expect(await res.json()).toEqual(createdItem);
  });

  it("TC-COL-004: adding duplicate event to collection returns 409", async () => {
    const collection = {
      id: "col1",
      userId: USER_A.id,
      visibility: "PRIVATE",
    };
    vi.mocked(mockPrisma.collection.findUnique).mockResolvedValue(
      collection as never,
    );
    vi.mocked(mockPrisma.event.findUnique).mockResolvedValue(
      { id: "evt1" } as never,
    );
    vi.mocked(mockPrisma.collectionItem.findUnique).mockResolvedValue(
      {
        id: "item1",
        collectionId: "col1",
        eventId: "evt1",
      } as never,
    );

    const res = await addCollectionItem(createTestApp(USER_A), "col1", {
      eventId: "evt1",
    });

    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({
      type: expect.stringContaining("conflict"),
      title: "Conflict",
      status: 409,
      detail: "Event is already in this collection",
    });
    expect(mockPrisma.collectionItem.create).not.toHaveBeenCalled();
    expect(mockPrisma.interaction.create).not.toHaveBeenCalled();
  });

  it("add collection item returns 403 for non-owner", async () => {
    const collection = {
      id: "col1",
      userId: USER_B.id,
      visibility: "PRIVATE",
    };
    vi.mocked(mockPrisma.collection.findUnique).mockResolvedValue(
      collection as never,
    );

    const res = await addCollectionItem(createTestApp(USER_A), "col1", {
      eventId: "evt1",
    });

    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({
      type: expect.stringContaining("forbidden"),
      title: "Forbidden",
      status: 403,
      detail: "Only the owner can update this collection",
    });
    expect(mockPrisma.collectionItem.create).not.toHaveBeenCalled();
  });

  it("TC-COL-005: owner can remove event from collection without deleting the event", async () => {
    const collection = {
      id: "col1",
      userId: USER_A.id,
      visibility: "PRIVATE",
    };
    const item = {
      id: "item1",
      collectionId: "col1",
      eventId: "evt1",
    };
    vi.mocked(mockPrisma.collection.findUnique).mockResolvedValue(
      collection as never,
    );
    vi.mocked(mockPrisma.collectionItem.findUnique).mockResolvedValue(
      item as never,
    );
    vi.mocked(mockPrisma.collectionItem.delete).mockResolvedValue(item as never);

    const res = await removeCollectionItem(createTestApp(USER_A), "col1", "evt1");

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

  it("remove collection item returns 404 when link does not exist", async () => {
    const collection = {
      id: "col1",
      userId: USER_A.id,
      visibility: "PRIVATE",
    };
    vi.mocked(mockPrisma.collection.findUnique).mockResolvedValue(
      collection as never,
    );
    vi.mocked(mockPrisma.collectionItem.findUnique).mockResolvedValue(
      null as never,
    );

    const res = await removeCollectionItem(createTestApp(USER_A), "col1", "evt1");

    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({
      type: expect.stringContaining("not-found"),
      title: "Resource not found",
      status: 404,
      detail: "Collection item not found",
    });
    expect(mockPrisma.collectionItem.delete).not.toHaveBeenCalled();
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
    expect(await res.json()).toMatchObject({
      type: expect.stringContaining("not-found"),
      title: "Resource not found",
      status: 404,
      detail: "Collection not found",
    });
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
    expect(await res.json()).toMatchObject({
      type: expect.stringContaining("not-found"),
      title: "Resource not found",
      status: 404,
      detail: "Collection not found",
    });
    expect(mockPrisma.collection.delete).not.toHaveBeenCalled();
  });

  it("returns 403 when requester is not the owner", async () => {
    const col = { id: "col1", userId: USER_B.id };
    vi.mocked(mockPrisma.collection.findUnique).mockResolvedValue(col as never);

    const res = await deleteCollection(createTestApp(USER_A), "col1");
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({
      type: expect.stringContaining("forbidden"),
      title: "Forbidden",
      status: 403,
      detail: "Only the owner can delete this collection",
    });
    expect(mockPrisma.collection.delete).not.toHaveBeenCalled();
  });
});
