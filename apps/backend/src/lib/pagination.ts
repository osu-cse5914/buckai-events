import type { Context } from "hono";
import { badRequest } from "./problem-details";

type PaginationOptions = {
  defaultLimit?: number;
  defaultOffset?: number;
  maxLimit?: number;
  strict?: boolean;
};

type PaginationValue = {
  limit: number;
  offset: number;
};

type PaginationResult =
  | PaginationValue
  | {
      response: Response;
    };

function parseNumeric(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function parsePagination(
  c: Context,
  { defaultLimit = 20, defaultOffset = 0, maxLimit = 100, strict = false }: PaginationOptions = {},
): PaginationResult {
  const rawLimit = c.req.query("limit");
  const rawOffset = c.req.query("offset");

  if (strict) {
    const hasInvalidLimit = rawLimit !== undefined && !Number.isFinite(Number(rawLimit));
    const hasInvalidOffset = rawOffset !== undefined && !Number.isFinite(Number(rawOffset));

    if (hasInvalidLimit || hasInvalidOffset) {
      return {
        response: badRequest(
          c,
          "limit and offset must be numeric",
          "invalid-query",
          "Invalid query parameter",
        ),
      };
    }
  }

  const limit = Math.min(Math.max(parseNumeric(rawLimit, defaultLimit), 1), maxLimit);
  const offset = Math.max(parseNumeric(rawOffset, defaultOffset), 0);

  return { limit, offset };
}

export function paginated<T>(
  data: T[],
  pagination: PaginationValue & { total: number },
): {
  data: T[];
  pagination: PaginationValue & { total: number };
} {
  return {
    data,
    pagination,
  };
}

export function paginatedMeta<T, TMeta extends PaginationValue & { total: number }>(
  items: T[],
  pagination: TMeta,
): {
  items: T[];
  meta: TMeta;
} {
  return {
    items,
    meta: pagination,
  };
}
