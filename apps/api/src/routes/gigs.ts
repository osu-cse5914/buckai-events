import { Hono } from "hono";
import type { AppEnv } from "../lib/types";
import { getPrisma } from "../lib/prisma";

export const gigs = new Hono<AppEnv>()

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
    }

    const updated = await prisma.application.findUniqueOrThrow({
      where: { id: appId },
    });

    return c.json(updated);
  });
