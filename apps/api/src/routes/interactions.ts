import { Hono } from "hono";
import { getPrisma } from "../lib/prisma";
import {
  parseInteractionCreateBody,
  readJsonBody,
} from "../lib/validators";
import type { AppEnv } from "../lib/types";
import { createInteraction } from "../services/interactions";

export const interactions = new Hono<AppEnv>().post("/", async (c) => {
  const { id: userId } = c.get("user");
  const prisma = getPrisma(c);
  const body = parseInteractionCreateBody(await readJsonBody(c), c);

  if (body instanceof Response) {
    return body;
  }

  const interaction = await createInteraction(prisma, {
    userId,
    eventId: body.eventId,
    action: body.action,
  });

  return c.json(interaction, 201);
});
