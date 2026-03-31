import { Hono } from "hono";
import { getPrisma } from "../lib/prisma";
import { paginated } from "../lib/pagination";
import { resolvePaginationQuery, validateRecommendationsQuery } from "../lib/validators";
import type { AppEnv } from "../lib/types";
import { getRecommendations } from "../services/recommendations";

export const recommendations = new Hono<AppEnv>().get(
  "/",
  validateRecommendationsQuery,
  async (c) => {
    const { id: userId } = c.get("user");
    const prisma = getPrisma(c);
    const query = c.req.valid("query");
    const { limit, offset } = resolvePaginationQuery(query);

    const result = await getRecommendations(prisma, {
      userId,
      type: query.type as "EVENT" | "GIG" | undefined,
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
  },
);
