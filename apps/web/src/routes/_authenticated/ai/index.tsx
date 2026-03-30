import { createFileRoute } from "@tanstack/react-router";
import { AiPage } from "@/components/app-pages/ai-page";

type AiSearch = {
  prompt?: string;
};

export const Route = createFileRoute("/_authenticated/ai/")({
  validateSearch: (search: Record<string, unknown>): AiSearch => ({
    prompt: typeof search.prompt === "string" ? search.prompt : undefined,
  }),
  component: AiPage,
});
