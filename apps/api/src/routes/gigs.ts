import { Hono } from "hono";
import type { AppEnv } from "../lib/types";
import { getPrisma } from "../lib/prisma";
import { paginated, parsePagination } from "../lib/pagination";
import { badRequest, conflict, forbidden, notFound } from "../lib/problem-details";
import { requireGig, resolveGigApplicationsWhere } from "../lib/resources";

const APPLICANT_SELECT = {
  id: true,
  displayName: true,
  email: true,
} as const;

export const gigs = new Hono<AppEnv>()

  // POST /:gigId/applications — Apply to a gig
  .post("/:gigId/applications", async (c) => {
    const { id: userId } = c.get("user");
    const gigId = c.req.param("gigId");
    const prisma = getPrisma(c);

    const gig = await requireGig(c, prisma.event.findUnique({ where: { id: gigId } }), {
      missingDetail: "Gig not found",
      invalidDetail: "Event is not a gig",
    });

    if (gig instanceof Response) {
      return gig;
    }

    if (gig.status === "CANCELLED") {
      return badRequest(c, "Cannot apply to a cancelled gig");
    }

    if (gig.creatorId === userId) {
      return forbidden(c, "Cannot apply to your own gig");
    }

    // Check for duplicate application
    const existing = await prisma.application.findUnique({
      where: { gigId_applicantId: { gigId, applicantId: userId } },
    });

    if (existing) {
      return conflict(c, "You have already applied to this gig");
    }

    // Parse optional message from body
    let message: string | null = null;
    try {
      const body = await c.req.json();
      if (
        typeof body === "object" &&
        body !== null &&
        typeof body.message === "string"
      ) {
        message = body.message;
      }
    } catch {
      // No body or invalid JSON — message stays null
    }

    const application = await prisma.application.create({
      data: {
        gigId,
        applicantId: userId,
        message,
        status: "PENDING",
      },
    });

    void prisma.interaction.create({
      data: {
        userId,
        eventId: gigId,
        action: "APPLY",
      },
    }).catch((error) => {
      console.error("Failed to record APPLY interaction", error);
    });

    return c.json(application, 201);
  })

  // PATCH /:gigId/applications/:appId — Accept or reject a gig application
  .patch("/:gigId/applications/:appId", async (c) => {
    const { id: userId } = c.get("user");
    const gigId = c.req.param("gigId");
    const appId = c.req.param("appId");

    const body = await c.req.json();

    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return badRequest(
        c,
        "Request body must be a JSON object",
        "invalid-body",
        "Invalid request body",
      );
    }

    if (body.status !== "ACCEPTED" && body.status !== "REJECTED") {
      return badRequest(
        c,
        "status must be ACCEPTED or REJECTED",
        "invalid-body",
        "Invalid request body",
      );
    }

    const prisma = getPrisma(c);

    const gig = await requireGig(c, prisma.event.findUnique({ where: { id: gigId } }), {
      missingDetail: "Gig not found",
      invalidDetail: "Event is not a gig",
    });

    if (gig instanceof Response) {
      return gig;
    }

    if (gig.creatorId !== userId) {
      return forbidden(c, "Only the gig owner can update application status");
    }

    const application = await prisma.application.findUnique({
      where: { id: appId },
    });

    if (!application || application.gigId !== gigId) {
      return notFound(c, "Application not found");
    }

    if (application.status !== "PENDING") {
      return badRequest(c, "Only PENDING applications can be updated");
    }

    // Atomic update: include status condition to prevent race conditions
    const count = await prisma.application.updateMany({
      where: { id: appId, status: "PENDING" },
      data: { status: body.status },
    });

    if (count.count === 0) {
      return badRequest(c, "Only PENDING applications can be updated");
    }

    const updated = await prisma.application.findUniqueOrThrow({
      where: { id: appId },
    });

    return c.json(updated);
  })

  // GET /:gigId/applications — gig owner sees all applications, applicant sees only their own
  .get("/:gigId/applications", async (c) => {
    const { id: userId } = c.get("user");
    const gigId = c.req.param("gigId");

    const pagination = parsePagination(c);
    if ("response" in pagination) {
      return pagination.response;
    }
    const { limit, offset } = pagination;
    const prisma = getPrisma(c);

    const gig = await requireGig(
      c,
      prisma.event.findUnique({
        where: { id: gigId },
        select: {
          id: true,
          type: true,
          creatorId: true,
        },
      }),
      {
        missingDetail: "Gig not found",
        invalidDetail: "Event is not a gig",
      },
    );

    if (gig instanceof Response) {
      return gig;
    }

    const where = await resolveGigApplicationsWhere(c, prisma, gig, gigId, userId);
    if (where instanceof Response) {
      return where;
    }

    const [data, total] = await Promise.all([
      prisma.application.findMany({
        where,
        include: {
          applicant: {
            select: APPLICANT_SELECT,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: limit,
        skip: offset,
      }),
      prisma.application.count({ where }),
    ]);

    return c.json(paginated(data, { total, limit, offset }));
  })
