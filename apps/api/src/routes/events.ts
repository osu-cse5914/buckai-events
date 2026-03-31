import { Hono, type Context } from "hono";
import { getPrisma } from "../lib/prisma";
import { paginated } from "../lib/pagination";
import {
  dispatchDetachedTask,
  resolveConnectionString,
  runWithPrisma,
} from "../lib/worker-runtime";
import {
  parseEventCreateBody,
  parseEventUpdateBody,
  readJsonBody,
  toEventListInput,
  validateEventIdParam,
  validateEventListQuery,
} from "../lib/validators";
import type { AppEnv } from "../lib/types";
import { generateEventTagging } from "../services/ai-tagging";
import {
  createEvent,
  deleteOwnedEvent,
  type EventCreateInput,
  getEventByIdOrThrow,
  listEvents,
  updateOwnedEvent,
} from "../services/events";

export { isValidStatusTransition } from "../services/events";

type EventTaggingInput = Pick<EventCreateInput, "title" | "description">;
type EventTaggingEnqueuer = (
  c: Context<AppEnv>,
  eventId: string,
  input: EventTaggingInput,
) => void;

function hasGoogleAIKey(env: Record<string, string | undefined> | undefined) {
  const boundValue = env?.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
  if (boundValue) {
    return true;
  }

  return Boolean(
    typeof process !== "undefined" &&
      process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim(),
  );
}

function enqueueEventTagging(
  c: Context<AppEnv>,
  eventId: string,
  input: EventTaggingInput,
) {
  const env = c.env as unknown as Record<string, string | undefined> | undefined;
  if (!hasGoogleAIKey(env)) {
    return;
  }

  dispatchDetachedTask(
    c,
    runWithPrisma(resolveConnectionString(c.env), async (prisma) => {
      const tagging = await generateEventTagging(input, {
        env,
      });

      await prisma.event.update({
        where: { id: eventId },
        data: {
          tags: tagging.tags,
          summary: tagging.summary,
          category: tagging.category,
        },
      });
    }),
    `generate AI tagging for event ${eventId}`,
  );
}

export function createEventsRouter({
  enqueueEventTagging: enqueueTagging = enqueueEventTagging,
}: {
  enqueueEventTagging?: EventTaggingEnqueuer;
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
        enqueueTagging(c, event.id, {
          title: input.title,
          description: input.description,
        });
      } catch (error) {
        console.error(`Failed to schedule AI tagging for event ${event.id}`, error);
      }

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
}

export const events = createEventsRouter();
