import type { ApiClient } from "./api";

export type InteractionAction = "VIEW" | "SAVE" | "CLICK" | "APPLY" | "DISMISS";

export async function createInteraction(
  api: ApiClient,
  input: {
    eventId: string;
    action: InteractionAction;
  },
) {
  const postInteraction = api.api.v1.interactions.$post as (args: {
    json: { eventId: string; action: InteractionAction };
  }) => Promise<Response>;

  const response = await postInteraction({
    json: input,
  });

  if (!response.ok) {
    throw new Error("Failed to record interaction");
  }
}

export function recordInteraction(
  api: ApiClient,
  input: {
    eventId: string;
    action: InteractionAction;
  },
) {
  void createInteraction(api, input).catch(() => {
    // Interaction capture is advisory and must never block the primary UI flow.
  });
}
