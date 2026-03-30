import { createFileRoute } from "@tanstack/react-router";
import { SearchPage } from "@/components/app-pages/search-page";

type SearchRouteSearch = {
  q?: string;
};

export const Route = createFileRoute("/_authenticated/search/")({
  validateSearch: (search: Record<string, unknown>): SearchRouteSearch => ({
    q: typeof search.q === "string" ? search.q : undefined,
  }),
  component: SearchRoute,
});

function SearchRoute() {
  const { q } = Route.useSearch();
  return <SearchPage key={q ?? ""} initialSearch={q} />;
}
