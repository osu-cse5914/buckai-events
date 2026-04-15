import type { Context } from "hono";

type ProblemStatus = 400 | 401 | 403 | 404 | 409 | 500;
const PROBLEM_JSON_CONTENT_TYPE = "application/problem+json; charset=UTF-8";

const DEFAULT_TITLES: Record<ProblemStatus, string> = {
  400: "Invalid request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Resource not found",
  409: "Conflict",
  500: "Internal server error",
};

export type ProblemDetails = {
  type: string;
  title: string;
  status: ProblemStatus;
  detail: string;
};

type ProblemOptions = {
  status: ProblemStatus;
  detail: string;
  title?: string;
  type?: string;
};

export class ProblemError extends Error {
  readonly problem: ProblemOptions;

  constructor(problem: ProblemOptions) {
    super(problem.detail);
    this.name = "ProblemError";
    this.problem = problem;
  }
}

export class BadRequestError extends ProblemError {
  constructor(detail: string, type = "invalid-request", title = "Invalid request") {
    super({ status: 400, detail, type, title });
  }
}

export class UnauthorizedError extends ProblemError {
  constructor(detail = "Authentication is required") {
    super({ status: 401, detail, type: "unauthorized" });
  }
}

export class ForbiddenError extends ProblemError {
  constructor(detail: string) {
    super({ status: 403, detail, type: "forbidden" });
  }
}

export class NotFoundError extends ProblemError {
  constructor(detail: string) {
    super({ status: 404, detail, type: "not-found" });
  }
}

export class ConflictError extends ProblemError {
  constructor(detail: string) {
    super({ status: 409, detail, type: "conflict" });
  }
}

function getProblemType(type: string | undefined, status: ProblemStatus): string {
  if (!type) {
    switch (status) {
      case 400:
        return "https://social-osu.app/problems/invalid-request";
      case 401:
        return "https://social-osu.app/problems/unauthorized";
      case 403:
        return "https://social-osu.app/problems/forbidden";
      case 404:
        return "https://social-osu.app/problems/not-found";
      case 409:
        return "https://social-osu.app/problems/conflict";
      default:
        return "https://social-osu.app/problems/internal-error";
    }
  }

  return type.startsWith("http") ? type : `https://social-osu.app/problems/${type}`;
}

export function toProblemDetails({ status, detail, title, type }: ProblemOptions): ProblemDetails {
  return {
    type: getProblemType(type, status),
    title: title ?? DEFAULT_TITLES[status],
    status,
    detail,
  };
}

export function problem(c: Context, options: ProblemOptions): Response {
  return c.body(JSON.stringify(toProblemDetails(options)), options.status, {
    "content-type": PROBLEM_JSON_CONTENT_TYPE,
  });
}

export function problemFromError(c: Context, error: unknown): Response {
  if (error instanceof ProblemError) {
    return problem(c, error.problem);
  }

  return problem(c, {
    status: 500,
    detail: "An unexpected error occurred",
    type: "internal-error",
  });
}

export function badRequest(
  c: Context,
  detail: string,
  type = "invalid-request",
  title = "Invalid request",
): Response {
  return problem(c, { status: 400, detail, type, title });
}

export function unauthorized(c: Context, detail = "Authentication is required"): Response {
  return problem(c, { status: 401, detail, type: "unauthorized" });
}

export function forbidden(c: Context, detail: string): Response {
  return problem(c, { status: 403, detail, type: "forbidden" });
}

export function notFound(c: Context, detail: string): Response {
  return problem(c, { status: 404, detail, type: "not-found" });
}

export function conflict(c: Context, detail: string): Response {
  return problem(c, { status: 409, detail, type: "conflict" });
}

export function internalError(c: Context, detail: string): Response {
  return problem(c, {
    status: 500,
    detail,
    type: "internal-error",
    title: "Internal server error",
  });
}
