import { Hono } from "hono";
import { paginatedMeta } from "../lib/pagination";
import { getPrisma } from "../lib/prisma";
import {
  toRecommendationsListInput,
  validateRecommendationsQuery,
} from "../lib/validators";
import type { AppEnv } from "../lib/types";
import { listRecommendations } from "../services/recommendations";

export const recommendations = new Hono<AppEnv>().get(
  "/",
  validateRecommendationsQuery,
  async (c) => {
    const prisma = getPrisma(c);
    const { id: userId } = c.get("user");
    const query = toRecommendationsListInput(c.req.valid("query"));

    const result = await listRecommendations(prisma, {
      userId,
      type: query.type,
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
  },
);
