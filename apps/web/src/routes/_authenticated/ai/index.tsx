import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AiPage } from "@/components/app-pages/ai-page";
import { validateAiSearch } from "@/lib/event-route-search";

export const Route = createFileRoute("/_authenticated/ai/")({
  validateSearch: validateAiSearch,
  component: AiRoute,
});

function AiRoute() {
  const navigate = useNavigate({ from: Route.fullPath });
  const search = Route.useSearch();

  return (
    <AiPage
      conversationId={search.conversationId}
      prompt={search.prompt ?? ""}
      onConversationSelect={(conversationId) =>
        navigate({
          search: (current) => ({
            ...current,
            conversationId,
            prompt: undefined,
          }),
        })
      }
    />
  );
}
