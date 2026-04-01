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

  return (
    <FeaturedPage
      type={search.type ?? ""}
      onTypeChange={(value) =>
        navigate({
          search: value ? { type: value } : {},
        })
      }
    />
  );
}
