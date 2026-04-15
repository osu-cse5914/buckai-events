import { Hono } from "hono";
import { getPrisma } from "../lib/prisma";
import { paginated } from "../lib/pagination";
import {
  parseGigApplicationBody,
  parseGigApplicationStatusBody,
  readJsonBody,
  resolvePaginationQuery,
  validateGigApplicationParams,
  validateGigRouteParams,
  validatePaginationQuery,
} from "../lib/validators";
import { trackBackgroundTask } from "../lib/worker-runtime";
import type { AppEnv } from "../lib/types";
import { applyToGig, listVisibleApplications, updateApplicationStatus } from "../services/gigs";

export const gigs = new Hono<AppEnv>()
  .post("/:gigId/applications", validateGigRouteParams, async (c) => {
    const { id: userId } = c.get("user");
    const { gigId } = c.req.valid("param");
    const body = parseGigApplicationBody(await readJsonBody(c));
    const prisma = getPrisma(c);

    const { application, interaction } = await applyToGig(prisma, {
      gigId,
      applicantId: userId,
      application: body,
    });

    trackBackgroundTask(
      c,
      prisma.interaction.create({
        data: interaction,
      }),
      "record APPLY interaction",
    );

    return c.json(application, 201);
  })
  .patch("/:gigId/applications/:appId", validateGigApplicationParams, async (c) => {
    const { id: userId } = c.get("user");
    const { gigId, appId } = c.req.valid("param");
    const body = parseGigApplicationStatusBody(await readJsonBody(c), c);
    if (body instanceof Response) {
      return body;
    }
    const prisma = getPrisma(c);

    const updated = await updateApplicationStatus(prisma, {
      gigId,
      appId,
      ownerId: userId,
      status: body.status,
    });
    return c.json(updated);
  })
  .get("/:gigId/applications", validateGigRouteParams, validatePaginationQuery, async (c) => {
    const { id: userId } = c.get("user");
    const { gigId } = c.req.valid("param");
    const { limit, offset } = resolvePaginationQuery(c.req.valid("query"));
    const prisma = getPrisma(c);

    const result = await listVisibleApplications(prisma, {
      gigId,
      userId,
      limit,
      offset,
    });
    return c.json(
      paginated(result.data, {
        total: result.total,
        limit: result.limit,
        offset: result.offset,
      }),
    );
  });
