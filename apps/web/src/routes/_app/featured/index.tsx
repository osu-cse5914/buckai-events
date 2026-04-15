import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { FeaturedPage } from "@/components/app-pages/featured-page";
import { validateFeaturedSearch } from "@/lib/event-route-search";

export const Route = createFileRoute("/_app/featured/")({
  validateSearch: validateFeaturedSearch,
  component: FeaturedRoute,
});

function FeaturedRoute() {
  const navigate = useNavigate({ from: Route.fullPath });
  const search = Route.useSearch();
  const navigateFeaturedSearch = (next: {
  }) => {
    const nextType = "type" in next ? next.type : search.type;

    return navigate({
      search: nextType ? { type: nextType } : {},
      replace: true,
    });
  };

  return (
    <FeaturedPage
      type={search.type ?? ""}
      onTypeChange={(value) => navigateFeaturedSearch({ type: value })}
    />
  );
}
