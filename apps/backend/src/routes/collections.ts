import { Hono } from "hono";
import { getPrisma } from "../lib/prisma";
import { trackBackgroundTask } from "../lib/worker-runtime";
import {
  parseCollectionCreateBody,
  parseCollectionItemCreateBody,
  parseCollectionPatchBody,
  readJsonBody,
  validateCollectionIdParam,
  validateCollectionItemParams,
} from "../lib/validators";
import type { AppEnv } from "../lib/types";
import {
  addItemToOwnedCollection,
  createOwnedCollection,
  deleteOwnedCollection,
  getCollectionForViewer,
  removeItemFromOwnedCollection,
  updateOwnedCollection,
} from "../services/collections";

export const collections = new Hono<AppEnv>()
  .post("/", async (c) => {
    const user = c.get("user");
    const prisma = getPrisma(c);
    const body = parseCollectionCreateBody(await readJsonBody(c), c);
    if (body instanceof Response) {
      return body;
    }

    const collection = await createOwnedCollection(prisma, {
      ownerId: user.id,
      data: body,
    });

    return c.json(collection, 201);
  })
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

    const collection = await getCollectionForViewer(prisma, {
      collectionId: id,
      viewerId: user.id,
    });
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

    const updated = await updateOwnedCollection(prisma, {
      collectionId: id,
      ownerId: user.id,
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

    const { item, interaction } = await addItemToOwnedCollection(prisma, {
      collectionId: id,
      ownerId: user.id,
      eventId: body.eventId,
    });

    trackBackgroundTask(
      c,
      prisma.interaction.create({
        data: interaction,
      }),
      "record SAVE interaction",
    );

    return c.json(item, 201);
  })
  .delete("/:id/items/:eventId", validateCollectionItemParams, async (c) => {
    const user = c.get("user");
    const prisma = getPrisma(c);
    const { id, eventId } = c.req.valid("param");

    await removeItemFromOwnedCollection(prisma, {
      collectionId: id,
      ownerId: user.id,
      eventId,
    });

    return c.body(null, 204);
  })
  .delete("/:id", validateCollectionIdParam, async (c) => {
    const user = c.get("user");
    const prisma = getPrisma(c);
    const { id } = c.req.valid("param");

    await deleteOwnedCollection(prisma, {
      collectionId: id,
      ownerId: user.id,
    });
    return c.body(null, 204);
  });
