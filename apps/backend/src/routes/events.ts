import { Hono, type Context } from "hono";
import { getPrisma } from "../lib/prisma";
import { paginated } from "../lib/pagination";
import {
  parseEventCreateBody,
  parseEventUpdateBody,
  readJsonBody,
  resolvePaginationQuery,
  toEventListInput,
  validateEventIdParam,
  validateEventListQuery,
  validateSemanticSearchQuery,
} from "../lib/validators";
import type { AppEnv } from "../lib/types";
import { searchEventsSemantically } from "../services/event-embeddings";
import {
  createEvent,
  deleteOwnedEvent,
  getEventByIdOrThrow,
  listEvents,
  updateOwnedEvent,
} from "../services/events";
import { scheduleEventPipelineFromContext } from "../services/event-pipeline";

export { isValidStatusTransition } from "../services/events";

type EventPipelineScheduler = (
  c: Context<AppEnv>,
  input: {
    eventId: string;
    stages: Array<"TAGGING" | "EMBEDDING">;
    trigger: "EVENT_CREATE" | "EVENT_UPDATE";
  },
) => Promise<unknown> | void;

type SemanticSearchHandler = (
  c: Context<AppEnv>,
  input: {
    query: string;
    limit: number;
    type?: string;
    category?: string;
    startDate?: Date;
    endDate?: Date;
  },
) => Promise<unknown>;

async function scheduleEventPipeline(
  c: Context<AppEnv>,
  input: {
    eventId: string;
    stages: Array<"TAGGING" | "EMBEDDING">;
    trigger: "EVENT_CREATE" | "EVENT_UPDATE";
  },
) {
  await scheduleEventPipelineFromContext(c, {
    eventId: input.eventId,
    stages: input.stages,
    trigger: input.trigger,
    requestedByUserId: c.get("user").id,
  });
}

async function handleSemanticSearch(
  c: Context<AppEnv>,
  input: {
    query: string;
    limit: number;
    type?: string;
    category?: string;
    startDate?: Date;
    endDate?: Date;
  },
) {
  return searchEventsSemantically(getPrisma(c), {
    ...input,
    env: c.env as unknown as Record<string, string | undefined>,
  });
}

export function createEventsRouter({
  scheduleEventPipeline: schedulePipeline = scheduleEventPipeline,
  searchSemanticEvents: searchSemanticEvents = handleSemanticSearch,
}: {
  scheduleEventPipeline?: EventPipelineScheduler;
  searchSemanticEvents?: SemanticSearchHandler;
} = {}) {
  return new Hono<AppEnv>()
    .post("/", async (c) => {
      const user = c.get("user");
      const input = parseEventCreateBody(await readJsonBody(c), c);
      if (input instanceof Response) {
        return input;
      }
      const prisma = getPrisma(c);

      const event = await createEvent(prisma, user.id, input);

      try {
        await schedulePipeline(c, {
          eventId: event.id,
          trigger: "EVENT_CREATE",
          stages: ["TAGGING", "EMBEDDING"],
        });
      } catch (error) {
        console.error(`Failed to schedule event pipeline for event ${event.id}`, error);
      }

      return c.json(event, 201);
    })
    .get("/semantic-search", validateSemanticSearchQuery, async (c) => {
      const query = c.req.valid("query");
      const pagination = resolvePaginationQuery(query, {
        defaultLimit: 10,
        maxLimit: 25,
      });
      const results = await searchSemanticEvents(c, {
        query: query.query ?? "",
        limit: pagination.limit,
        type: query.type,
        category: query.category,
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
      });

      return c.json(results);
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

      try {
        await schedulePipeline(c, {
          eventId: id,
          trigger: "EVENT_UPDATE",
          stages: ["EMBEDDING"],
        });
      } catch (error) {
        console.error(`Failed to schedule event pipeline for event ${id}`, error);
      }

      return c.json(updated);
    })
    .delete("/:id", validateEventIdParam, async (c) => {
      const user = c.get("user");
      const prisma = getPrisma(c);
      const { id } = c.req.valid("param");

      await deleteOwnedEvent(prisma, id, user.id);
      return c.json({ message: "Event deleted" });
    });
}

export const events = createEventsRouter();
