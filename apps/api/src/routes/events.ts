import { Hono } from "hono";
import { getPrisma } from "../lib/prisma";
import { paginated } from "../lib/pagination";
import {
  parseEventCreateBody,
  parseEventUpdateBody,
  readJsonBody,
  toEventListInput,
  validateEventIdParam,
  validateEventListQuery,
} from "../lib/validators";
import type { AppEnv } from "../lib/types";
import {
  createEvent,
  deleteOwnedEvent,
  getEventByIdOrThrow,
  listEvents,
  updateOwnedEvent,
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

    const event = await getEventByIdOrThrow(prisma, id);
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

    const updated = await updateOwnedEvent(prisma, id, user.id, body);
    return c.json(updated);
  })
  .delete("/:id", validateEventIdParam, async (c) => {
    const user = c.get("user");
    const prisma = getPrisma(c);
    const { id } = c.req.valid("param");

    await deleteOwnedEvent(prisma, id, user.id);
    return c.json({ message: "Event deleted" });
  });
