import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AiPage } from "@/components/app-pages/ai-page";

type AiSearch = {
  prompt?: string;
};

export const Route = createFileRoute("/_authenticated/ai/")({
  validateSearch: (search: Record<string, unknown>): AiSearch => ({
    prompt: typeof search.prompt === "string" ? search.prompt : undefined,
  }),
  component: AiRoute,
});

function AiRoute() {
  const navigate = useNavigate({ from: Route.fullPath });
  const search = Route.useSearch();

  return (
    <AiPage
      prompt={search.prompt ?? ""}
      onPromptSubmit={(prompt) =>
        navigate({
          search: () => ({
            prompt: prompt.trim() || undefined,
          }),
        })
      }
    />
  );
}
