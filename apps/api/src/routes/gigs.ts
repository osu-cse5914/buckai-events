import { Hono } from "hono";
import type { AppEnv } from "../lib/types";
import { getPrisma } from "../lib/prisma";

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
    const body = await c.req.json().catch(() => ({}));

    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return c.json(
        {
          type: "https://social-osu.app/problems/invalid-body",
          title: "Invalid request body",
          status: 400,
          detail: "Request body must be a JSON object",
        },
        400,
      );
    }

    if (body.message !== undefined && typeof body.message !== "string") {
      return c.json(
        {
          type: "https://social-osu.app/problems/invalid-body",
          title: "Invalid request body",
          status: 400,
          detail: "message must be a string",
        },
        400,
      );
    }

    const prisma = getPrisma(c);

    const gig = await prisma.event.findUnique({
      where: { id: gigId },
    });

    if (!gig) {
      return c.json(
        {
          type: "https://social-osu.app/problems/not-found",
          title: "Resource not found",
          status: 404,
          detail: "Gig not found",
        },
        404,
      );
    }

    //400 Bad Request if event has type = EVENT instead of GIG
    if (gig.type !== "GIG") {
      return c.json(
        {
          type: "https://social-osu.app/problems/invalid-request",
          title: "Invalid request",
          status: 400,
          detail: "Event is not a gig",
        },
        400,
      );
    }

    //403 Forbidden if user tries to apply to their own gig
    if (gig.creatorId === userId) {
      return c.json(
        {
          type: "https://social-osu.app/problems/forbidden",
          title: "Forbidden",
          status: 403,
          detail: "You cannot apply to your own gig",
        },
        403,
      );
    }

    //400 Bad Request if gig has status CANCELLED
    if (gig.status === "CANCELLED") {
      return c.json(
        {
          type: "https://social-osu.app/problems/invalid-request",
          title: "Invalid request",
          status: 400,
          detail: "Cannot apply to a cancelled gig",
        },
        400,
      );
    }

    const existing = await prisma.application.findUnique({
      where: {
        gigId_applicantId: {
          gigId,
          applicantId: userId,
        },
      },
    });

    //409 Conflict if user already applied to this gig
    if (existing) {
      return c.json(
        {
          type: "https://social-osu.app/problems/conflict",
          title: "Conflict",
          status: 409,
          detail: "You have already applied to this gig",
        },
        409,
      );
    }

    const [created] = await prisma.$transaction([
      prisma.application.create({
        data: {
          gigId,
          applicantId: userId,
          message: body.message ?? null,
          status: "PENDING",
        },
      }),
      prisma.interaction.create({
        data: {
          userId,
          eventId: gigId,
          action: "APPLY",
        },
      }),
    ]);

    return c.json(created, 201);
  })

  // PATCH /:gigId/applications/:appId — Accept or reject a gig application
  .patch("/:gigId/applications/:appId", async (c) => {
    const { id: userId } = c.get("user");
    const gigId = c.req.param("gigId");
    const appId = c.req.param("appId");

    const body = await c.req.json();

    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return c.json(
        {
          type: "https://social-osu.app/problems/invalid-body",
          title: "Invalid request body",
          status: 400,
          detail: "Request body must be a JSON object",
        },
        400,
      );
    }

    if (body.status !== "ACCEPTED" && body.status !== "REJECTED") {
      return c.json(
        {
          type: "https://social-osu.app/problems/invalid-body",
          title: "Invalid request body",
          status: 400,
          detail: "status must be ACCEPTED or REJECTED",
        },
        400,
      );
    }

    const prisma = getPrisma(c);

    const gig = await prisma.event.findUnique({
      where: { id: gigId },
    });

    if (!gig) {
      return c.json(
        {
          type: "https://social-osu.app/problems/not-found",
          title: "Resource not found",
          status: 404,
          detail: "Gig not found",
        },
        404,
      );
    }

    //400 Bad Request if event has type = EVENT instead of GIG
    if (gig.type !== "GIG") {
      return c.json(
        {
          type: "https://social-osu.app/problems/invalid-request",
          title: "Invalid request",
          status: 400,
          detail: "Event is not a gig",
        },
        400,
      );
    }

    if (gig.creatorId !== userId) {
      return c.json(
        {
          type: "https://social-osu.app/problems/forbidden",
          title: "Forbidden",
          status: 403,
          detail: "Only the gig owner can update application status",
        },
        403,
      );
    }

    const application = await prisma.application.findUnique({
      where: { id: appId },
    });

    if (!application || application.gigId !== gigId) {
      return c.json(
        {
          type: "https://social-osu.app/problems/not-found",
          title: "Resource not found",
          status: 404,
          detail: "Application not found",
        },
        404,
      );
    }

    if (application.status !== "PENDING") {
      return c.json(
        {
          type: "https://social-osu.app/problems/invalid-request",
          title: "Invalid request",
          status: 400,
          detail: "Only PENDING applications can be updated",
        },
        400,
      );
    }

    // Atomic update: include status condition to prevent race conditions
    const count = await prisma.application.updateMany({
      where: { id: appId, status: "PENDING" },
      data: { status: body.status },
    });

    if (count.count === 0) {
      return c.json(
        {
          type: "https://social-osu.app/problems/invalid-request",
          title: "Invalid request",
          status: 400,
          detail: "Only PENDING applications can be updated",
        },
        400,
      );
    };

    const updated = await prisma.application.findUniqueOrThrow({
      where: { id: appId },
    });

    return c.json(updated);
  })

  // GET /:gigId/applications — gig owner sees all applications, applicant sees only their own
  .get("/:gigId/applications", async (c) => {
    const { id: userId } = c.get("user");
    const gigId = c.req.param("gigId");

    const limitParam = c.req.query("limit");
    const offsetParam = c.req.query("offset");

    const limit = Math.min(Math.max(Number(limitParam) || 20, 1), 100);
    const offset = Math.max(Number(offsetParam) || 0, 0);

    const prisma = getPrisma(c);

    const gig = await prisma.event.findUnique({
      where: { id: gigId },
      select: {
        id: true,
        type: true,
        creatorId: true,
      },
    });

    if (!gig) {
      return c.json(
        {
          type: "https://social-osu.app/problems/not-found",
          title: "Resource not found",
          status: 404,
          detail: "Gig not found",
        },
        404,
      );
    }

    //400 Bad Request if event has type = EVENT instead of GIG
    if (gig.type !== "GIG") {
      return c.json(
        {
          type: "https://social-osu.app/problems/invalid-request",
          title: "Invalid request",
          status: 400,
          detail: "Event is not a gig",
        },
        400,
      );
    }

    const where =
      gig.creatorId === userId
        ? { gigId }
        : { gigId, applicantId: userId };

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

    return c.json({
      data,
      pagination: {
        total,
        limit,
        offset,
      },
    });
  })
