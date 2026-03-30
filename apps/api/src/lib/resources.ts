import type { Context } from "hono";
import type { PrismaClient } from "@prisma/client";
import { badRequest, forbidden, notFound } from "./problem-details";

type UserOwnedEvent = {
  source: string;
  creatorId: string | null;
};

type CollectionRecord = {
  userId: string;
  visibility: string;
};

type GigRecord = {
  type: string;
  creatorId: string | null;
};

export async function requireEvent<TEvent>(
  c: Context,
  loader: Promise<TEvent | null>,
  detail = "Event not found",
): Promise<TEvent | Response> {
  const event = await loader;
  return event ?? notFound(c, detail);
}

export async function requireGig<TGig extends { type: string }>(
  c: Context,
  loader: Promise<TGig | null>,
  {
    missingDetail = "Gig not found",
    invalidDetail = "Event is not a gig",
  }: {
    missingDetail?: string;
    invalidDetail?: string;
  } = {},
): Promise<TGig | Response> {
  const gig = await loader;
  if (!gig) {
    return notFound(c, missingDetail);
  }

  if (gig.type !== "GIG") {
    return badRequest(c, invalidDetail);
  }

  return gig;
}

export function requireOwnedUserEvent(
  c: Context,
  event: UserOwnedEvent,
  userId: string,
  action: "update" | "delete",
): Response | null {
  if (event.source !== "USER") {
    return forbidden(
      c,
      action === "update"
        ? "External events cannot be modified"
        : "External events cannot be deleted",
    );
  }

  if (event.creatorId !== userId) {
    return forbidden(
      c,
      action === "update"
        ? "Only the event creator can update this event"
        : "Only the event creator can delete this event",
    );
  }

  return null;
}

export async function requireCollection<TCollection>(
  c: Context,
  loader: Promise<TCollection | null>,
  detail = "Collection not found",
): Promise<TCollection | Response> {
  const collection = await loader;
  return collection ?? notFound(c, detail);
}

export function requireCollectionVisibility(
  c: Context,
  collection: CollectionRecord,
  userId: string,
): Response | null {
  if (collection.userId !== userId && collection.visibility !== "PUBLIC") {
    return notFound(c, "Collection not found");
  }

  return null;
}

export function requireCollectionOwner(
  c: Context,
  collection: CollectionRecord,
  userId: string,
  detail: string,
): Response | null {
  if (collection.userId !== userId) {
    return forbidden(c, detail);
  }

  return null;
}

export async function resolveGigApplicationsWhere(
  c: Context,
  prisma: PrismaClient,
  gig: GigRecord,
  gigId: string,
  userId: string,
): Promise<{ gigId: string; applicantId?: string } | Response> {
  if (gig.creatorId === userId) {
    return { gigId };
  }

  const application = await prisma.application.findUnique({
    where: {
      gigId_applicantId: {
        gigId,
        applicantId: userId,
      },
    },
  });

  if (!application) {
    return forbidden(
      c,
      "Only the gig owner or an applicant can view applications",
    );
  }

  return { gigId, applicantId: userId };
}
