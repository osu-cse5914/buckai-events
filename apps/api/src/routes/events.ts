import { Hono } from "hono";
import { getPrisma } from "../lib/prisma";
import { paginated } from "../lib/pagination";
import { badRequest } from "../lib/problem-details";
import {
  parseEventCreateBody,
  parseEventUpdateBody,
  readJsonBody,
  toEventListInput,
  validateEventIdParam,
  validateEventListQuery,
} from "../lib/validators";
import { requireEvent, requireOwnedUserEvent } from "../lib/resources";
import type { AppEnv } from "../lib/types";
import {
  createEvent,
  CREATOR_SELECT,
  isValidStatusTransition,
  listEvents,
  updateEvent,
} from "../services/events";

export { isValidStatusTransition } from "../services/events";

export const events = new Hono<AppEnv>()
  .post("/", async (c) => {
    const user = c.get("user");
    const input = parseEventCreateBody(await readJsonBody(c), c);
    if (input instanceof Response) {
      return input;
    }
    const prisma = getPrisma(c);

    const event = await createEvent(prisma, user.id, input);
    return c.json(event, 201);
  })
  .get("/", validateEventListQuery, async (c) => {
    const prisma = getPrisma(c);
    const query = toEventListInput(c.req.valid("query"));
    const result = await listEvents(prisma, query);

    return c.json(
      paginated(result.data, {
        total: result.total,
        limit: result.limit,
        offset: result.offset,
      }),
    );
  })
  .get("/:id", validateEventIdParam, async (c) => {
    const prisma = getPrisma(c);
    const { id } = c.req.valid("param");

    const event = await requireEvent(
      c,
      prisma.event.findUnique({
        where: { id },
        include: { creator: { select: CREATOR_SELECT } },
      }),
    );

    if (event instanceof Response) {
      return event;
    }

    return c.json(event);
  })
  .patch("/:id", validateEventIdParam, async (c) => {
    const user = c.get("user");
    const prisma = getPrisma(c);
    const { id } = c.req.valid("param");
    const body = parseEventUpdateBody(await readJsonBody(c), c);
    if (body instanceof Response) {
      return body;
    }

    const event = await requireEvent(c, prisma.event.findUnique({ where: { id } }));
    if (event instanceof Response) {
      return event;
    }

    const ownershipError = requireOwnedUserEvent(c, event, user.id, "update");
    if (ownershipError) {
      return ownershipError;
    }

    if (body.status && body.status !== event.status) {
      if (!isValidStatusTransition(event.status, body.status)) {
        return badRequest(
          c,
          `Invalid status transition from ${event.status} to ${body.status}`,
        );
      }
    }

    const updated = await updateEvent(prisma, id, body);
    return c.json(updated);
  })
  .delete("/:id", validateEventIdParam, async (c) => {
    const user = c.get("user");
    const prisma = getPrisma(c);
    const { id } = c.req.valid("param");

    const event = await requireEvent(c, prisma.event.findUnique({ where: { id } }));
    if (event instanceof Response) {
      return event;
    }

    const ownershipError = requireOwnedUserEvent(c, event, user.id, "delete");
    if (ownershipError) {
      return ownershipError;
    }

    await prisma.event.delete({ where: { id } });
    return c.json({ message: "Event deleted" });
  });
