import { Hono } from "hono";
import type { AppStatus } from "@prisma/client";
import { getPrisma } from "../lib/prisma";
import { paginated } from "../lib/pagination";
import { badRequest, conflict, forbidden, notFound } from "../lib/problem-details";
import {
  parseGigApplicationBody,
  parseGigApplicationStatusBody,
  readJsonBody,
  resolvePaginationQuery,
  validateGigApplicationParams,
  validateGigRouteParams,
  validatePaginationQuery,
} from "../lib/validators";
import { requireGig, resolveGigApplicationsWhere } from "../lib/resources";
import { trackBackgroundTask } from "../lib/worker-runtime";
import type { AppEnv } from "../lib/types";
import { createApplication, listApplications } from "../services/gigs";

export const gigs = new Hono<AppEnv>()
  .post(
    "/:gigId/applications",
    validateGigRouteParams,
    async (c) => {
      const { id: userId } = c.get("user");
      const { gigId } = c.req.valid("param");
      const body = parseGigApplicationBody(await readJsonBody(c));
      const prisma = getPrisma(c);

      const gig = await requireGig(
        c,
        prisma.event.findUnique({
          where: { id: gigId },
          select: {
            id: true,
            type: true,
            status: true,
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

      if (gig.status === "CANCELLED") {
        return badRequest(c, "Cannot apply to a cancelled gig");
      }

      if (gig.creatorId === userId) {
        return forbidden(c, "Cannot apply to your own gig");
      }

      const existing = await prisma.application.findUnique({
        where: { gigId_applicantId: { gigId, applicantId: userId } },
      });
      if (existing) {
        return conflict(c, "You have already applied to this gig");
      }

      const application = await createApplication(prisma, gigId, userId, body);

      trackBackgroundTask(
        c,
        prisma.interaction.create({
          data: {
            userId,
            eventId: gigId,
            action: "APPLY",
          },
        }),
        "record APPLY interaction",
      );

      return c.json(application, 201);
    },
  )
  .patch(
    "/:gigId/applications/:appId",
    validateGigApplicationParams,
    async (c) => {
      const { id: userId } = c.get("user");
      const { gigId, appId } = c.req.valid("param");
      const body = parseGigApplicationStatusBody(await readJsonBody(c), c);
      if (body instanceof Response) {
        return body;
      }
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

      const count = await prisma.application.updateMany({
        where: { id: appId, status: "PENDING" },
        data: { status: body.status as AppStatus },
      });
      if (count.count === 0) {
        return badRequest(c, "Only PENDING applications can be updated");
      }

      const updated = await prisma.application.findUniqueOrThrow({
        where: { id: appId },
      });
      return c.json(updated);
    },
  )
  .get(
    "/:gigId/applications",
    validateGigRouteParams,
    validatePaginationQuery,
    async (c) => {
      const { id: userId } = c.get("user");
      const { gigId } = c.req.valid("param");
      const { limit, offset } = resolvePaginationQuery(c.req.valid("query"));
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

      const result = await listApplications(prisma, { where, limit, offset });
      return c.json(
        paginated(result.data, {
          total: result.total,
          limit: result.limit,
          offset: result.offset,
        }),
      );
    },
  );
