import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AiPage } from "@/components/app-pages/ai-page";
import { validateAiSearch } from "@/lib/event-route-search";
import { requireSignedInBeforeLoad } from "@/lib/route-access";

export const Route = createFileRoute("/_app/ai/")({
  beforeLoad: requireSignedInBeforeLoad,
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
