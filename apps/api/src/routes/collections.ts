import { Hono } from "hono";
import { getPrisma } from "../lib/prisma";
import { validateCollectionIdParam } from "../lib/validators";
import {
  requireCollection,
  requireCollectionOwner,
  requireCollectionVisibility,
} from "../lib/resources";
import type { AppEnv } from "../lib/types";

export const collections = new Hono<AppEnv>()
  .get("/:id", validateCollectionIdParam, async (c) => {
    const user = c.get("user");
    const prisma = getPrisma(c);
    const { id } = c.req.valid("param");

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
  .delete("/:id", validateCollectionIdParam, async (c) => {
    const user = c.get("user");
    const prisma = getPrisma(c);
    const { id } = c.req.valid("param");

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

    await prisma.collection.delete({ where: { id } });
    return c.body(null, 204);
  });
