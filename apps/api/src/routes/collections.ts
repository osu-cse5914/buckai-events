import { Hono } from "hono";
import type { AppEnv } from "../lib/types";
import { getPrisma } from "../lib/prisma";
import {
  requireCollection,
  requireCollectionOwner,
  requireCollectionVisibility,
} from "../lib/resources";

export const collections = new Hono<AppEnv>()
  // GET /:id — fetch a single collection with its items (#76)
  .get("/:id", async (c) => {
    const user = c.get("user");
    const prisma = getPrisma(c);
    const id = c.req.param("id");

    const collection = await requireCollection(
      c,
      prisma.collection.findUnique({
        where: { id },
        include: { items: { include: { event: true } } },
      }),
    );

    if (collection instanceof Response) {
      return collection;
    }

    const visibilityError = requireCollectionVisibility(c, collection, user.id);
    if (visibilityError) {
      return visibilityError;
    }

    return c.json(collection);
  })

  // DELETE /:id — delete a collection with cascade to items (S-COL-10)
  .delete("/:id", async (c) => {
    const user = c.get("user");
    const prisma = getPrisma(c);
    const id = c.req.param("id");

    const collection = await requireCollection(
      c,
      prisma.collection.findUnique({ where: { id } }),
    );

    if (collection instanceof Response) {
      return collection;
    }

    const ownershipError = requireCollectionOwner(
      c,
      collection,
      user.id,
      "Only the owner can delete this collection",
    );
    if (ownershipError) {
      return ownershipError;
    }

    // Schema cascades to CollectionItem via onDelete: Cascade
    await prisma.collection.delete({ where: { id } });

    // 204 No Content
    return c.body(null, 204);
  });

