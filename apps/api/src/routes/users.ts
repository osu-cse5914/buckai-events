import { Hono } from "hono";
import { getPrisma } from "../lib/prisma";
import { paginated } from "../lib/pagination";
import { notFound } from "../lib/problem-details";
import {
  validatePaginationQuery,
  validateStrictPaginationQuery,
  validateUserIdParam,
  validateUserPatchJson,
} from "../lib/validators";
import type { AppEnv } from "../lib/types";
import { getPublicProfile, listOwnApplications } from "../services/users";

export const users = new Hono<AppEnv>()
  .get("/me/applications", validatePaginationQuery, async (c) => {
    const { id } = c.get("user");
    const prisma = getPrisma(c);
    const { limit, offset } = c.req.valid("query");

    const result = await listOwnApplications(prisma, {
      applicantId: id,
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
  })
  .get("/me", async (c) => {
    const { id } = c.get("user");
    const prisma = getPrisma(c);
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return notFound(c, "User not found");
    }
    return c.json(user);
  })
  .patch("/me", validateUserPatchJson, async (c) => {
    const { id } = c.get("user");
    const data = c.req.valid("json");
    const prisma = getPrisma(c);
    const updated = await prisma.user.update({ where: { id }, data });
    return c.json(updated);
  })
  .get("/:id", validateUserIdParam, validateStrictPaginationQuery, async (c) => {
    const { id: authUserId } = c.get("user");
    const { id: targetId } = c.req.valid("param");
    const { limit, offset } = c.req.valid("query");
    const prisma = getPrisma(c);

    const profile = await getPublicProfile(prisma, {
      authUserId,
      targetId,
      limit,
      offset,
    });
    if (!profile) {
      return notFound(c, `User ${targetId} was not found`);
    }

    return c.json(profile);
  });
