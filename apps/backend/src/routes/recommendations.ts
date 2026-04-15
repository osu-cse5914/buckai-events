import { Hono } from "hono";
import { paginatedMeta } from "../lib/pagination";
import { getPrisma } from "../lib/prisma";
import {
  toRecommendationsListInput,
  validateRecommendationsQuery,
} from "../lib/validators";
import type { AppEnv } from "../lib/types";
import {
  listPopularRecommendations,
  listRecommendations,
  listUpcomingRecommendations,
} from "../services/recommendations";

export const recommendations = new Hono<AppEnv>()
  .get("/popular", validateRecommendationsQuery, async (c) => {
    const prisma = getPrisma(c);
    const { id: userId } = c.get("user");
    const query = toRecommendationsListInput(c.req.valid("query"));

    const result = await listPopularRecommendations(prisma, {
      userId,
      type: query.type,
      search: query.search,
      limit: query.limit,
      offset: query.offset,
    });

    return c.json(
      paginatedMeta(result.items, {
        total: result.total,
        limit: result.limit,
        offset: result.offset,
      }),
    );
  })
  .get("/upcoming", validateRecommendationsQuery, async (c) => {
    const prisma = getPrisma(c);
    const { id: userId } = c.get("user");
    const query = toRecommendationsListInput(c.req.valid("query"));

    const result = await listUpcomingRecommendations(prisma, {
      userId,
      type: query.type,
      search: query.search,
      limit: query.limit,
      offset: query.offset,
    });

    return c.json(
      paginatedMeta(result.items, {
        total: result.total,
        limit: result.limit,
        offset: result.offset,
      }),
    );
  })
  .get("/", validateRecommendationsQuery, async (c) => {
    const prisma = getPrisma(c);
    const { id: userId } = c.get("user");
    const query = toRecommendationsListInput(c.req.valid("query"));

    const result = await listRecommendations(prisma, {
      userId,
      type: query.type,
      search: query.search,
      limit: query.limit,
      offset: query.offset,
    });

    return c.json(
      paginatedMeta(result.items, {
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        rankingMode: result.rankingMode,
      }),
    );
  });
