import { Hono } from "hono";
import type { AppEnv } from "../lib/types";
import { getPrisma } from "../lib/prisma";

export const collections = new Hono<AppEnv>()
  // GET /:id — fetch a single collection with its items (#76)
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

    // owner always has access; others only if PUBLIC
    if (collection.userId !== user.id && collection.visibility !== "PUBLIC") {
      // hide existence of private collections to other users
      return c.json({ error: "Collection not found" }, 404);
    }

    return c.json(collection);
  })

  // DELETE /:id — delete a collection with cascade to items (S-COL-10)
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

    // Schema cascades to CollectionItem via onDelete: Cascade
    await prisma.collection.delete({ where: { id } });

    // 204 No Content
    return c.status(204);
  });


