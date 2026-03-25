import { Hono } from "hono";
import type { AppEnv } from "../lib/types";
import { getPrisma } from "../lib/prisma";

const COLLECTION_VISIBILITIES = ["PRIVATE", "PUBLIC"] as const;

function isCollectionVisibility(
  value: string,
): value is (typeof COLLECTION_VISIBILITIES)[number] {
  return COLLECTION_VISIBILITIES.includes(
    value as (typeof COLLECTION_VISIBILITIES)[number],
  );
}

export const collections = new Hono<AppEnv>()
  // GET / - list authenticated user's collections with item counts (S-COL-6)
  .get("/", async (c) => {
    const user = c.get("user");
    const prisma = getPrisma(c);

    const userCollections = await prisma.collection.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: {
          select: { items: true },
        },
      },
    });

    return c.json(
      userCollections.map(({ _count, ...collection }) => ({
        ...collection,
        itemCount: _count.items,
      })),
    );
  })

  // GET /:id - fetch a single collection with its items (#76)
  .get("/:id", async (c) => {
    const user = c.get("user");
    const prisma = getPrisma(c);
    const id = c.req.param("id");

    const collection = await prisma.collection.findUnique({
      where: { id },
      include: { items: { include: { event: true } } },
    });

    if (!collection) {
      return c.json({ error: "Collection not found" }, 404);
    }

    if (collection.userId !== user.id && collection.visibility !== "PUBLIC") {
      return c.json({ error: "Collection not found" }, 404);
    }

    return c.json(collection);
  })

  // PATCH /:id - rename a collection or change visibility (S-COL-9)
  .patch("/:id", async (c) => {
    const user = c.get("user");
    const prisma = getPrisma(c);
    const id = c.req.param("id");

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Request body must be a JSON object" }, 400);
    }

    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return c.json({ error: "Request body must be a JSON object" }, 400);
    }

    const allowedKeys = ["name", "visibility"];
    const extraKeys = Object.keys(body).filter((key) => !allowedKeys.includes(key));
    if (extraKeys.length > 0) {
      return c.json({ error: "Request body contains unsupported fields" }, 400);
    }

    const data: { name?: string; visibility?: "PRIVATE" | "PUBLIC" } = {};

    if ("name" in body) {
      if (
        typeof body.name !== "string" ||
        body.name.trim().length === 0 ||
        body.name.length > 100
      ) {
        return c.json(
          { error: "name must be a non-empty string up to 100 characters" },
          400,
        );
      }
      data.name = body.name;
    }

    if ("visibility" in body) {
      if (
        typeof body.visibility !== "string" ||
        !isCollectionVisibility(body.visibility)
      ) {
        return c.json({ error: "visibility must be PRIVATE or PUBLIC" }, 400);
      }
      data.visibility = body.visibility;
    }

    if (Object.keys(data).length === 0) {
      return c.json(
        { error: "At least one of name or visibility must be provided" },
        400,
      );
    }

    const collection = await prisma.collection.findUnique({ where: { id } });

    if (!collection) {
      return c.json({ error: "Collection not found" }, 404);
    }

    if (collection.userId !== user.id) {
      return c.json({ error: "Only the owner can update this collection" }, 403);
    }

    const updatedCollection = await prisma.collection.update({
      where: { id },
      data,
    });

    return c.json(updatedCollection);
  })

  // DELETE /:id - delete a collection with cascade to items (S-COL-10)
  .delete("/:id", async (c) => {
    const user = c.get("user");
    const prisma = getPrisma(c);
    const id = c.req.param("id");

    const collection = await prisma.collection.findUnique({ where: { id } });

    if (!collection) {
      return c.json({ error: "Collection not found" }, 404);
    }

    if (collection.userId !== user.id) {
      return c.json({ error: "Only the owner can delete this collection" }, 403);
    }

    await prisma.collection.delete({ where: { id } });

    return c.body(null, 204);
  })

  // DELETE /:id/items/:eventId - remove an event from a collection (S-COL-5)
  .delete("/:id/items/:eventId", async (c) => {
    const user = c.get("user");
    const prisma = getPrisma(c);
    const id = c.req.param("id");
    const eventId = c.req.param("eventId");

    const collection = await prisma.collection.findUnique({ where: { id } });

    if (!collection) {
      return c.json({ error: "Collection not found" }, 404);
    }

    if (collection.userId !== user.id) {
      return c.json(
        { error: "Only the owner can remove items from this collection" },
        403,
      );
    }

    const collectionItem = await prisma.collectionItem.findUnique({
      where: {
        collectionId_eventId: {
          collectionId: id,
          eventId,
        },
      },
    });

    if (!collectionItem) {
      return c.json({ error: "Collection item not found" }, 404);
    }

    await prisma.collectionItem.delete({
      where: {
        collectionId_eventId: {
          collectionId: id,
          eventId,
        },
      },
    });

    return c.body(null, 204);
  });
