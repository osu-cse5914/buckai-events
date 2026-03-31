import type { PrismaClient } from "@prisma/client";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../lib/problem-details";

type OwnedCollection = {
  userId: string;
};

function ensureCollectionOwner(
  collection: OwnedCollection,
  ownerId: string,
  detail: string,
) {
  if (collection.userId !== ownerId) {
    throw new ForbiddenError(detail);
  }
}

async function getCollectionByIdOrThrow(
  prisma: PrismaClient,
  collectionId: string,
) {
  const collection = await prisma.collection.findUnique({
    where: { id: collectionId },
  });

  if (!collection) {
    throw new NotFoundError("Collection not found");
  }

  return collection;
}

export async function getCollectionForViewer(
  prisma: PrismaClient,
  input: {
    collectionId: string;
    viewerId: string;
  },
) {
  const collection = await prisma.collection.findUnique({
    where: { id: input.collectionId },
    include: { items: { include: { event: true } } },
  });

  if (!collection) {
    throw new NotFoundError("Collection not found");
  }

  if (
    collection.userId !== input.viewerId &&
    collection.visibility !== "PUBLIC"
  ) {
    throw new NotFoundError("Collection not found");
  }

  return collection;
}

export async function deleteOwnedCollection(
  prisma: PrismaClient,
  input: {
    collectionId: string;
    ownerId: string;
  },
) {
  const collection = await prisma.collection.findUnique({
    where: { id: input.collectionId },
  });

  if (!collection) {
    throw new NotFoundError("Collection not found");
  }

  ensureCollectionOwner(
    collection,
    input.ownerId,
    "Only the owner can delete this collection",
  );

  await prisma.collection.delete({ where: { id: input.collectionId } });
}

export async function updateOwnedCollection(
  prisma: PrismaClient,
  input: {
    collectionId: string;
    ownerId: string;
    data: {
      name?: string;
      visibility?: "PRIVATE" | "PUBLIC";
    };
  },
) {
  const collection = await getCollectionByIdOrThrow(prisma, input.collectionId);

  ensureCollectionOwner(
    collection,
    input.ownerId,
    "Only the owner can update this collection",
  );

  return prisma.collection.update({
    where: { id: input.collectionId },
    data: input.data,
  });
}

export async function addItemToOwnedCollection(
  prisma: PrismaClient,
  input: {
    collectionId: string;
    ownerId: string;
    eventId: string;
  },
) {
  const collection = await getCollectionByIdOrThrow(prisma, input.collectionId);

  ensureCollectionOwner(
    collection,
    input.ownerId,
    "Only the owner can update this collection",
  );

  const event = await prisma.event.findUnique({
    where: { id: input.eventId },
    select: { id: true },
  });
  if (!event) {
    throw new NotFoundError("Event not found");
  }

  const existingItem = await prisma.collectionItem.findUnique({
    where: {
      collectionId_eventId: {
        collectionId: input.collectionId,
        eventId: input.eventId,
      },
    },
  });
  if (existingItem) {
    throw new ConflictError("Event is already in this collection");
  }

  const item = await prisma.collectionItem.create({
    data: {
      collectionId: input.collectionId,
      eventId: input.eventId,
    },
  });

  return {
    item,
    interaction: {
      userId: input.ownerId,
      eventId: input.eventId,
      action: "SAVE" as const,
    },
  };
}

export async function removeItemFromOwnedCollection(
  prisma: PrismaClient,
  input: {
    collectionId: string;
    ownerId: string;
    eventId: string;
  },
) {
  const collection = await getCollectionByIdOrThrow(prisma, input.collectionId);

  ensureCollectionOwner(
    collection,
    input.ownerId,
    "Only the owner can update this collection",
  );

  const item = await prisma.collectionItem.findUnique({
    where: {
      collectionId_eventId: {
        collectionId: input.collectionId,
        eventId: input.eventId,
      },
    },
  });
  if (!item) {
    throw new NotFoundError("Collection item not found");
  }

  await prisma.collectionItem.delete({
    where: {
      collectionId_eventId: {
        collectionId: input.collectionId,
        eventId: input.eventId,
      },
    },
  });
}
