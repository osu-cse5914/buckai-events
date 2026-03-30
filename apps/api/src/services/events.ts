import type { PrismaClient } from "@prisma/client";

export const CREATOR_SELECT = {
  id: true,
  displayName: true,
  email: true,
} as const;

export const EVENT_TYPES = ["EVENT", "GIG"] as const;
export const EVENT_SOURCES = ["OSU_API", "TICKETMASTER", "USER"] as const;
export const EVENT_STATUSES = [
  "OPEN",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const;
export const COMPENSATION_TYPES = ["FIXED", "HOURLY"] as const;

const VALID_TRANSITIONS: Record<string, string[]> = {
  OPEN: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

export type EventType = (typeof EVENT_TYPES)[number];
export type EventSource = (typeof EVENT_SOURCES)[number];
export type EventStatus = (typeof EVENT_STATUSES)[number];
export type CompensationType = (typeof COMPENSATION_TYPES)[number];

export type EventCreateInput = {
  title: string;
  description: string;
  type: EventType;
  location: {
    name: string;
    latitude: number | null;
    longitude: number | null;
  };
  startAt: Date;
  endAt: Date | null;
  compensation: {
    amount: number | null;
    currency: string;
    type: CompensationType | null;
  } | null;
};

export type EventListInput = {
  type?: EventType;
  category?: string;
  startDate?: Date;
  endDate?: Date;
  source?: EventSource;
  status?: EventStatus;
  user?: string;
  search?: string;
  limit: number;
  offset: number;
};

export type EventUpdateInput = {
  title?: string;
  description?: string;
  location?: {
    name?: string;
    latitude?: number | null;
    longitude?: number | null;
  };
  startAt?: Date;
  endAt?: Date | null;
  status?: EventStatus;
  compensation?: {
    amount?: number | null;
    currency?: string;
    type?: CompensationType | null;
  };
};

export function isValidStatusTransition(from: string, to: string): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export async function createEvent(
  prisma: PrismaClient,
  userId: string,
  input: EventCreateInput,
) {
  return prisma.event.create({
    data: {
      title: input.title,
      description: input.description,
      type: input.type,
      source: "USER",
      locationName: input.location.name,
      locationLatitude: input.location.latitude,
      locationLongitude: input.location.longitude,
      startAt: input.startAt,
      endAt: input.endAt,
      compensationAmount: input.compensation?.amount ?? null,
      compensationCurrency: input.compensation?.currency ?? "USD",
      compensationType: input.compensation?.type ?? null,
      status: "OPEN",
      creatorId: userId,
      tags: [],
      summary: null,
      category: null,
    },
    include: { creator: { select: CREATOR_SELECT } },
  });
}

export async function listEvents(
  prisma: PrismaClient,
  input: EventListInput,
) {
  const where: Record<string, unknown> = {};

  if (input.type) where.type = input.type;
  if (input.category) where.category = input.category;
  if (input.source) where.source = input.source;
  if (input.status) where.status = input.status;
  if (input.user) where.creatorId = input.user;

  if (input.startDate || input.endDate) {
    const startAtFilter: Record<string, unknown> = {};
    if (input.startDate) {
      startAtFilter.gte = input.startDate;
    }
    if (input.endDate) {
      startAtFilter.lte = input.endDate;
    }
    where.startAt = startAtFilter;
  }

  if (input.search) {
    where.OR = [
      { title: { contains: input.search, mode: "insensitive" } },
      { description: { contains: input.search, mode: "insensitive" } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.event.findMany({
      where,
      include: { creator: { select: CREATOR_SELECT } },
      orderBy: { startAt: "asc" },
      take: input.limit,
      skip: input.offset,
    }),
    prisma.event.count({ where }),
  ]);

  return {
    data,
    total,
    limit: input.limit,
    offset: input.offset,
  };
}

export function toEventUpdateData(input: EventUpdateInput) {
  const data: Record<string, unknown> = {};

  if (input.title !== undefined) data.title = input.title;
  if (input.description !== undefined) data.description = input.description;
  if (input.location?.name !== undefined) data.locationName = input.location.name;
  if (input.location?.latitude !== undefined) {
    data.locationLatitude = input.location.latitude;
  }
  if (input.location?.longitude !== undefined) {
    data.locationLongitude = input.location.longitude;
  }
  if (input.startAt !== undefined) data.startAt = input.startAt;
  if (input.endAt !== undefined) data.endAt = input.endAt;
  if (input.status !== undefined) data.status = input.status;
  if (input.compensation !== undefined) {
    if (input.compensation.amount !== undefined) {
      data.compensationAmount = input.compensation.amount;
    }
    if (input.compensation.currency !== undefined) {
      data.compensationCurrency = input.compensation.currency;
    }
    if (input.compensation.type !== undefined) {
      data.compensationType = input.compensation.type;
    }
  }

  return data;
}

export async function updateEvent(
  prisma: PrismaClient,
  id: string,
  input: EventUpdateInput,
) {
  return prisma.event.update({
    where: { id },
    data: toEventUpdateData(input),
    include: { creator: { select: CREATOR_SELECT } },
  });
}
