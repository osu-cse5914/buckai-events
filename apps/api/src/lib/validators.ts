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

export const validateEventCreateJson = validator("json", (value, c) => {
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
});

export const validateEventUpdateJson = validator("json", (value, c) => {
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
});

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

  let type: EventType | undefined;
  const typeValue = firstQueryValue(value.type);
  if (typeValue !== undefined) {
    if (!isAllowedValue(typeValue, EVENT_TYPES)) {
      return badRequest(c, "type must be EVENT or GIG");
    }
    type = typeValue;
  }

  let source: EventSource | undefined;
  const sourceValue = firstQueryValue(value.source);
  if (sourceValue !== undefined) {
    if (!isAllowedValue(sourceValue, EVENT_SOURCES)) {
      return badRequest(c, "source must be OSU_API, TICKETMASTER, or USER");
    }
    source = sourceValue;
  }

  let status: EventStatus | undefined;
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

  let startDate: Date | undefined;
  const startDateValue = firstQueryValue(value.startDate);
  if (startDateValue !== undefined) {
    const parsedStartDate = parseDateValue(startDateValue);
    if (!parsedStartDate) {
      return badRequest(c, "startDate must be a valid date");
    }
    startDate = parsedStartDate;
  }

  let endDate: Date | undefined;
  const endDateValue = firstQueryValue(value.endDate);
  if (endDateValue !== undefined) {
    const parsedEndDate = parseDateValue(endDateValue);
    if (!parsedEndDate) {
      return badRequest(c, "endDate must be a valid date");
    }
    endDate = parsedEndDate;
  }

  return {
    type,
    category: firstQueryValue(value.category),
    startDate,
    endDate,
    source,
    status,
    user: firstQueryValue(value.user),
    search: firstQueryValue(value.search),
    ...pagination,
  } satisfies EventListInput;
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

  return pagination;
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

  return pagination;
});

export const validateGigApplicationJson = validator("json", (value) => {
  if (!isRecord(value)) {
    return {
      message: null,
    } satisfies GigApplicationInput;
  }

  return {
    message: typeof value.message === "string" ? value.message : null,
  } satisfies GigApplicationInput;
});

export const validateGigApplicationStatusJson = validator("json", (value, c) => {
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
});

export const validateUserPatchJson = validator("json", (value, c) => {
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
});
