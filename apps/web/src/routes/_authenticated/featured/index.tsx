import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { FeaturedPage } from "@/components/app-pages/featured-page";
import { validateFeaturedSearch } from "@/lib/event-route-search";

export const Route = createFileRoute("/_authenticated/featured/")({
  validateSearch: validateFeaturedSearch,
  component: FeaturedRoute,
});

function FeaturedRoute() {
  const navigate = useNavigate({ from: Route.fullPath });
  const search = Route.useSearch();
  const navigateFeaturedSearch = (next: {
    type?: typeof search.type | "";
    q?: string;
  }) => {
    const nextType = "type" in next ? next.type : search.type;
    const nextQuery = "q" in next ? next.q : search.q;

    return navigate({
      search: {
        ...(nextType ? { type: nextType } : {}),
        ...(nextQuery?.trim() ? { q: nextQuery.trim() } : {}),
      },
      replace: true,
    });
  };

  return (
    <FeaturedPage
      type={search.type ?? ""}
      searchQuery={search.q ?? ""}
      onTypeChange={(value) => navigateFeaturedSearch({ type: value })}
      onSearchQueryChange={(value) => navigateFeaturedSearch({ q: value })}
    />
  );
}
