import { Hono } from "hono";
import { getPrisma } from "../lib/prisma";
import { conflict, notFound } from "../lib/problem-details";
import { trackBackgroundTask } from "../lib/worker-runtime";
import {
  parseCollectionItemCreateBody,
  parseCollectionPatchBody,
  readJsonBody,
  validateCollectionIdParam,
  validateCollectionItemParams,
} from "../lib/validators";
import {
  requireCollection,
  requireCollectionOwner,
  requireCollectionVisibility,
} from "../lib/resources";
import type { AppEnv } from "../lib/types";

export const collections = new Hono<AppEnv>()
  .get("/", async (c) => {
    const user = c.get("user");
    const prisma = getPrisma(c);

    const collections = await prisma.collection.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { items: true } } },
    });

    return c.json(collections);
  })
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
  .patch("/:id", validateCollectionIdParam, async (c) => {
    const user = c.get("user");
    const prisma = getPrisma(c);
    const { id } = c.req.valid("param");
    const body = parseCollectionPatchBody(await readJsonBody(c), c);
    if (body instanceof Response) {
      return body;
    }

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
      "Only the owner can update this collection",
    );
    if (ownershipError) {
      return ownershipError;
    }

    const updated = await prisma.collection.update({
      where: { id },
      data: body,
    });

    return c.json(updated);
  })
  .post("/:id/items", validateCollectionIdParam, async (c) => {
    const user = c.get("user");
    const prisma = getPrisma(c);
    const { id } = c.req.valid("param");
    const body = parseCollectionItemCreateBody(await readJsonBody(c), c);
    if (body instanceof Response) {
      return body;
    }

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
      "Only the owner can update this collection",
    );
    if (ownershipError) {
      return ownershipError;
    }

    const event = await prisma.event.findUnique({
      where: { id: body.eventId },
      select: { id: true },
    });
    if (!event) {
      return notFound(c, "Event not found");
    }

    const existingItem = await prisma.collectionItem.findUnique({
      where: {
        collectionId_eventId: {
          collectionId: id,
          eventId: body.eventId,
        },
      },
    });
    if (existingItem) {
      return conflict(c, "Event is already in this collection");
    }

    const item = await prisma.collectionItem.create({
      data: {
        collectionId: id,
        eventId: body.eventId,
      },
    });

    trackBackgroundTask(
      c,
      prisma.interaction.create({
        data: {
          userId: user.id,
          eventId: body.eventId,
          action: "SAVE",
        },
      }),
      "record SAVE interaction",
    );

    return c.json(item, 201);
  })
  .delete("/:id/items/:eventId", validateCollectionItemParams, async (c) => {
    const user = c.get("user");
    const prisma = getPrisma(c);
    const { id, eventId } = c.req.valid("param");

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
      "Only the owner can update this collection",
    );
    if (ownershipError) {
      return ownershipError;
    }

    const item = await prisma.collectionItem.findUnique({
      where: {
        collectionId_eventId: {
          collectionId: id,
          eventId,
        },
      },
    });
    if (!item) {
      return notFound(c, "Collection item not found");
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
