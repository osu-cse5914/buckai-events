import { Hono } from "hono";
import { paginated } from "../lib/pagination";
import { getPrisma } from "../lib/prisma";
import { resolvePaginationQuery, validatePaginationQuery } from "../lib/validators";
import type { AppEnv } from "../lib/types";
import { listSocialFeed } from "../services/social";

export const social = new Hono<AppEnv>().get("/feed", validatePaginationQuery, async (c) => {
  const { id } = c.get("user");
  const prisma = getPrisma(c);
  const { limit, offset } = resolvePaginationQuery(c.req.valid("query"));

  const result = await listSocialFeed(prisma, {
    viewerId: id,
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
