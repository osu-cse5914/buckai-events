import type { Context } from "hono";
import type { CollectionVisibility } from "@prisma/client";
import { validator } from "hono/validator";
import { badRequest } from "./problem-details";
import {
  COMPENSATION_TYPES,
  EVENT_SOURCES,
  EVENT_STATUSES,
  EVENT_TYPES,
  type CompensationType,
  type EventCreateInput,
  type EventListInput,
  type EventSource,
  type EventStatus,
  type EventType,
  type EventUpdateInput,
} from "../services/events";
import type { GigApplicationInput } from "../services/gigs";

export type PaginationQuery = {
  limit?: string;
  offset?: string;
};

export type EventListQuery = PaginationQuery & {
  type?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
  source?: string;
  status?: string;
  user?: string;
  search?: string;
};

export type RecommendationsQuery = PaginationQuery & {
  type?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAllowedValue<T extends string>(
  value: string,
  allowed: readonly T[],
): value is T {
  return allowed.includes(value as T);
}

function parseDateValue(value: unknown): Date | null {
  if (typeof value !== "string") {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parsePaginationInput(
  rawLimit: string | string[] | undefined,
  rawOffset: string | string[] | undefined,
  {
    strict = false,
    defaultLimit = 20,
    defaultOffset = 0,
    maxLimit = 100,
  }: {
    strict?: boolean;
    defaultLimit?: number;
    defaultOffset?: number;
    maxLimit?: number;
  } = {},
): { limit: number; offset: number } | "invalid" {
  const limitValue = Array.isArray(rawLimit) ? rawLimit[0] : rawLimit;
  const offsetValue = Array.isArray(rawOffset) ? rawOffset[0] : rawOffset;

  if (strict) {
    const hasInvalidLimit =
      limitValue !== undefined && !Number.isFinite(Number(limitValue));
    const hasInvalidOffset =
      offsetValue !== undefined && !Number.isFinite(Number(offsetValue));
    if (hasInvalidLimit || hasInvalidOffset) {
      return "invalid";
    }
  }

  const parsedLimit = Number(limitValue);
  const parsedOffset = Number(offsetValue);

  return {
    limit: Math.min(
      Math.max(Number.isFinite(parsedLimit) ? parsedLimit : defaultLimit, 1),
      maxLimit,
    ),
    offset: Math.max(
      Number.isFinite(parsedOffset) ? parsedOffset : defaultOffset,
      0,
    ),
  };
}

function firstQueryValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function resolvePaginationQuery(
  query: PaginationQuery,
  options?: Parameters<typeof parsePaginationInput>[2],
): { limit: number; offset: number } {
  const pagination = parsePaginationInput(query.limit, query.offset, options);
  if (pagination === "invalid") {
    throw new Error("Pagination query must be validated before parsing");
  }

  return pagination;
}

export function toEventListInput(query: EventListQuery): EventListInput {
  return {
    ...resolvePaginationQuery(query),
    type: query.type as EventType | undefined,
    category: query.category,
    startDate: query.startDate ? new Date(query.startDate) : undefined,
    endDate: query.endDate ? new Date(query.endDate) : undefined,
    source: query.source as EventSource | undefined,
    status: query.status as EventStatus | undefined,
    user: query.user,
    search: query.search,
  };
}

export async function readJsonBody(c: Context): Promise<unknown> {
  try {
    return await c.req.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      return undefined;
    }

    throw error;
  }
}

export const validateEventIdParam = validator("param", (value, c) => {
  const id = value.id?.trim();
  if (!id) {
    return badRequest(c, "id is required", "invalid-param", "Invalid path parameter");
  }

  return { id };
});

export const validateGigRouteParams = validator("param", (value, c) => {
  const gigId = value.gigId?.trim();
  if (!gigId) {
    return badRequest(
      c,
      "gigId is required",
      "invalid-param",
      "Invalid path parameter",
    );
  }

  return { gigId };
});

export const validateGigApplicationParams = validator("param", (value, c) => {
  const gigId = value.gigId?.trim();
  const appId = value.appId?.trim();
  if (!gigId || !appId) {
    return badRequest(
      c,
      "gigId and appId are required",
      "invalid-param",
      "Invalid path parameter",
    );
  }

  return { gigId, appId };
});

export const validateCollectionIdParam = validator("param", (value, c) => {
  const id = value.id?.trim();
  if (!id) {
    return badRequest(c, "id is required", "invalid-param", "Invalid path parameter");
  }

  return { id };
});

export const validateUserIdParam = validator("param", (value, c) => {
  const id = value.id?.trim();
  if (!id) {
    return badRequest(c, "id is required", "invalid-param", "Invalid path parameter");
  }

  return { id };
});

export function parseEventCreateBody(
  value: unknown,
  c: Context,
): EventCreateInput | Response {
  if (!isRecord(value)) {
    return badRequest(
      c,
      "Request body must be a JSON object",
      "invalid-body",
      "Invalid request body",
    );
  }

  const title = value.title;
  const description = value.description;
  const type = value.type;
  const location = value.location;
  const startAt = value.startAt;
  const endAt = value.endAt;
  const compensation = value.compensation;

  if (
    typeof title !== "string" ||
    typeof description !== "string" ||
    typeof type !== "string" ||
    !isRecord(location) ||
    typeof location.name !== "string" ||
    startAt === undefined
  ) {
    return badRequest(
      c,
      "Missing required fields: title, description, type, location.name, startAt",
    );
  }

  if (!isAllowedValue(type, EVENT_TYPES)) {
    return badRequest(c, "type must be EVENT or GIG");
  }

  const parsedStartAt = parseDateValue(startAt);
  if (!parsedStartAt) {
    return badRequest(c, "startAt must be a valid date");
  }

  let parsedEndAt: Date | null = null;
  if (endAt !== undefined && endAt !== null) {
    parsedEndAt = parseDateValue(endAt);
    if (!parsedEndAt) {
      return badRequest(c, "endAt must be a valid date");
    }
  }

  let parsedCompensation: EventCreateInput["compensation"] = null;
  if (isRecord(compensation)) {
    const compensationType = compensation.type;
    if (
      compensationType !== undefined &&
      compensationType !== null &&
      (typeof compensationType !== "string" ||
        !isAllowedValue(compensationType, COMPENSATION_TYPES))
    ) {
      return badRequest(c, "compensation.type must be FIXED or HOURLY");
    }

    parsedCompensation = {
      amount: typeof compensation.amount === "number" ? compensation.amount : null,
      currency:
        typeof compensation.currency === "string" ? compensation.currency : "USD",
      type:
        typeof compensationType === "string"
          ? (compensationType as CompensationType)
          : null,
    };
  }

  return {
    title,
    description,
    type: type as EventType,
    location: {
      name: location.name,
      latitude:
        typeof location.latitude === "number" ? location.latitude : null,
      longitude:
        typeof location.longitude === "number" ? location.longitude : null,
    },
    startAt: parsedStartAt,
    endAt: parsedEndAt,
    compensation: parsedCompensation,
  } satisfies EventCreateInput;
}

export const validateEventCreateJson = validator("json", parseEventCreateBody);

export function parseEventUpdateBody(
  value: unknown,
  c: Context,
): EventUpdateInput | Response {
  if (!isRecord(value)) {
    return badRequest(
      c,
      "Request body must be a JSON object",
      "invalid-body",
      "Invalid request body",
    );
  }

  const output: EventUpdateInput = {};

  if (value.title !== undefined) output.title = value.title as string;
  if (value.description !== undefined) output.description = value.description as string;

  if (isRecord(value.location)) {
    output.location = {};
    if (value.location.name !== undefined) output.location.name = value.location.name as string;
    if (value.location.latitude !== undefined) {
      output.location.latitude =
        typeof value.location.latitude === "number"
          ? value.location.latitude
          : null;
    }
    if (value.location.longitude !== undefined) {
      output.location.longitude =
        typeof value.location.longitude === "number"
          ? value.location.longitude
          : null;
    }
  }

  if (value.status !== undefined) {
    if (
      typeof value.status !== "string" ||
      !isAllowedValue(value.status, EVENT_STATUSES)
    ) {
      return badRequest(
        c,
        "status must be OPEN, IN_PROGRESS, COMPLETED, or CANCELLED",
      );
    }
    output.status = value.status as EventStatus;
  }

  if (value.startAt !== undefined) {
    const parsedStartAt = parseDateValue(value.startAt);
    if (!parsedStartAt) {
      return badRequest(c, "startAt must be a valid date");
    }
    output.startAt = parsedStartAt;
  }

  if (value.endAt !== undefined) {
    if (value.endAt === null) {
      output.endAt = null;
    } else {
      const parsedEndAt = parseDateValue(value.endAt);
      if (!parsedEndAt) {
        return badRequest(c, "endAt must be a valid date");
      }
      output.endAt = parsedEndAt;
    }
  }

  if (isRecord(value.compensation)) {
    const compensationType = value.compensation.type;
    if (
      compensationType !== undefined &&
      compensationType !== null &&
      (typeof compensationType !== "string" ||
        !isAllowedValue(compensationType, COMPENSATION_TYPES))
    ) {
      return badRequest(c, "compensation.type must be FIXED or HOURLY");
    }

    output.compensation = {};
    if (value.compensation.amount !== undefined) {
      output.compensation.amount =
        typeof value.compensation.amount === "number"
          ? value.compensation.amount
          : null;
    }
    if (value.compensation.currency !== undefined) {
      output.compensation.currency = value.compensation.currency as string;
    }
    if (compensationType !== undefined) {
      output.compensation.type =
        typeof compensationType === "string"
          ? (compensationType as CompensationType)
          : null;
    }
  }

  return output;
}

export const validateEventUpdateJson = validator("json", parseEventUpdateBody);

export const validateEventListQuery = validator("query", (value, c) => {
  const pagination = parsePaginationInput(value.limit, value.offset);
  if (pagination === "invalid") {
    return badRequest(
      c,
      "limit and offset must be numeric",
      "invalid-query",
      "Invalid query parameter",
    );
  }

  const output: EventListQuery = {};
  const limitValue = firstQueryValue(value.limit);
  const offsetValue = firstQueryValue(value.offset);
  if (limitValue !== undefined) {
    output.limit = limitValue;
  }
  if (offsetValue !== undefined) {
    output.offset = offsetValue;
  }

  let type: string | undefined;
  const typeValue = firstQueryValue(value.type);
  if (typeValue !== undefined) {
    if (!isAllowedValue(typeValue, EVENT_TYPES)) {
      return badRequest(c, "type must be EVENT or GIG");
    }
    type = typeValue;
  }
  if (type !== undefined) {
    output.type = type;
  }

  let source: string | undefined;
  const sourceValue = firstQueryValue(value.source);
  if (sourceValue !== undefined) {
    if (!isAllowedValue(sourceValue, EVENT_SOURCES)) {
      return badRequest(c, "source must be OSU_API, TICKETMASTER, or USER");
    }
    source = sourceValue;
  }
  if (source !== undefined) {
    output.source = source;
  }

  let status: string | undefined;
  const statusValue = firstQueryValue(value.status);
  if (statusValue !== undefined) {
    if (!isAllowedValue(statusValue, EVENT_STATUSES)) {
      return badRequest(
        c,
        "status must be OPEN, IN_PROGRESS, COMPLETED, or CANCELLED",
      );
    }
    status = statusValue;
  }
  if (status !== undefined) {
    output.status = status;
  }

  let startDate: string | undefined;
  const startDateValue = firstQueryValue(value.startDate);
  if (startDateValue !== undefined) {
    const parsedStartDate = parseDateValue(startDateValue);
    if (!parsedStartDate) {
      return badRequest(c, "startDate must be a valid date");
    }
    startDate = startDateValue;
  }
  if (startDate !== undefined) {
    output.startDate = startDate;
  }

  let endDate: string | undefined;
  const endDateValue = firstQueryValue(value.endDate);
  if (endDateValue !== undefined) {
    const parsedEndDate = parseDateValue(endDateValue);
    if (!parsedEndDate) {
      return badRequest(c, "endDate must be a valid date");
    }
    endDate = endDateValue;
  }
  if (endDate !== undefined) {
    output.endDate = endDate;
  }

  const category = firstQueryValue(value.category);
  if (category !== undefined) {
    output.category = category;
  }

  const user = firstQueryValue(value.user);
  if (user !== undefined) {
    output.user = user;
  }

  const search = firstQueryValue(value.search);
  if (search !== undefined) {
    output.search = search;
  }

  return output;
});

export const validateRecommendationsQuery = validator("query", (value, c) => {
  const pagination = parsePaginationInput(value.limit, value.offset);
  if (pagination === "invalid") {
    return badRequest(
      c,
      "limit and offset must be numeric",
      "invalid-query",
      "Invalid query parameter",
    );
  }

  const output: RecommendationsQuery = {};
  const limitValue = firstQueryValue(value.limit);
  const offsetValue = firstQueryValue(value.offset);
  if (limitValue !== undefined) {
    output.limit = limitValue;
  }
  if (offsetValue !== undefined) {
    output.offset = offsetValue;
  }

  const typeValue = firstQueryValue(value.type);
  if (typeValue !== undefined) {
    if (!isAllowedValue(typeValue, EVENT_TYPES)) {
      return badRequest(c, "type must be EVENT or GIG");
    }
    output.type = typeValue;
  }

  return output;
});

export const validatePaginationQuery = validator("query", (value, c) => {
  const pagination = parsePaginationInput(value.limit, value.offset);
  if (pagination === "invalid") {
    return badRequest(
      c,
      "limit and offset must be numeric",
      "invalid-query",
      "Invalid query parameter",
    );
  }

  const output: PaginationQuery = {};
  const limitValue = firstQueryValue(value.limit);
  const offsetValue = firstQueryValue(value.offset);
  if (limitValue !== undefined) {
    output.limit = limitValue;
  }
  if (offsetValue !== undefined) {
    output.offset = offsetValue;
  }

  return output;
});

export const validateStrictPaginationQuery = validator("query", (value, c) => {
  const pagination = parsePaginationInput(value.limit, value.offset, {
    strict: true,
  });
  if (pagination === "invalid") {
    return badRequest(
      c,
      "limit and offset must be numeric",
      "invalid-query",
      "Invalid query parameter",
    );
  }

  const output: PaginationQuery = {};
  const limitValue = firstQueryValue(value.limit);
  const offsetValue = firstQueryValue(value.offset);
  if (limitValue !== undefined) {
    output.limit = limitValue;
  }
  if (offsetValue !== undefined) {
    output.offset = offsetValue;
  }

  return output;
});

export function parseGigApplicationBody(value: unknown): GigApplicationInput {
  if (!isRecord(value)) {
    return {
      message: null,
    } satisfies GigApplicationInput;
  }

  return {
    message: typeof value.message === "string" ? value.message : null,
  } satisfies GigApplicationInput;
}

export const validateGigApplicationJson = validator("json", parseGigApplicationBody);

export function parseGigApplicationStatusBody(
  value: unknown,
  c: Context,
): { status: "ACCEPTED" | "REJECTED" } | Response {
  if (!isRecord(value)) {
    return badRequest(
      c,
      "Request body must be a JSON object",
      "invalid-body",
      "Invalid request body",
    );
  }

  if (value.status !== "ACCEPTED" && value.status !== "REJECTED") {
    return badRequest(
      c,
      "status must be ACCEPTED or REJECTED",
      "invalid-body",
      "Invalid request body",
    );
  }

  return { status: value.status };
}

export const validateGigApplicationStatusJson = validator(
  "json",
  parseGigApplicationStatusBody,
);

export function parseUserPatchBody(
  value: unknown,
  c: Context,
): Record<string, unknown> | Response {
  if (!isRecord(value)) {
    return badRequest(
      c,
      "Request body must be a JSON object",
      "invalid-body",
      "Invalid request body",
    );
  }

  const allowedFields = ["displayName", "major", "gradYear", "interests"] as const;
  const data: Record<string, unknown> = {};

  for (const field of allowedFields) {
    if (value[field] !== undefined) {
      data[field] = value[field];
    }
  }

  return data;
}

export const validateUserPatchJson = validator("json", parseUserPatchBody);

export const COLLECTION_VISIBILITIES = ["PRIVATE", "PUBLIC"] as const;

export const validateCollectionItemParams = validator("param", (value, c) => {
  const id = value.id?.trim();
  const eventId = value.eventId?.trim();
  if (!id || !eventId) {
    return badRequest(
      c,
      "id and eventId are required",
      "invalid-param",
      "Invalid path parameter",
    );
  }

  return { id, eventId };
});

export function parseCollectionPatchBody(
  value: unknown,
  c: Context,
): { name?: string; visibility?: CollectionVisibility } | Response {
  if (!isRecord(value)) {
    return badRequest(
      c,
      "Request body must be a JSON object",
      "invalid-body",
      "Invalid request body",
    );
  }

  const output: { name?: string; visibility?: CollectionVisibility } = {};

  if (value.name !== undefined) {
    if (typeof value.name !== "string") {
      return badRequest(c, "name must be a string");
    }
    output.name = value.name;
  }

  if (value.visibility !== undefined) {
    if (
      typeof value.visibility !== "string" ||
      !isAllowedValue(value.visibility, COLLECTION_VISIBILITIES)
    ) {
      return badRequest(c, "visibility must be PRIVATE or PUBLIC");
    }

    output.visibility = value.visibility;
  }

  return output;
}

export function parseCollectionItemCreateBody(
  value: unknown,
  c: Context,
): { eventId: string } | Response {
  if (!isRecord(value)) {
    return badRequest(
      c,
      "Request body must be a JSON object",
      "invalid-body",
      "Invalid request body",
    );
  }

  const eventId = typeof value.eventId === "string" ? value.eventId.trim() : "";
  if (!eventId) {
    return badRequest(c, "eventId is required");
  }

  return { eventId };
}
