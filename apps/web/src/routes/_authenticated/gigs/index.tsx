import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BrowsePage } from "@/components/events/browse-page";
import {
  toOptionalPage,
  toPageIndex,
  validateBrowseSearch,
} from "@/lib/event-route-search";
import { loadEventsRouteData } from "@/lib/route-loaders";

export const Route = createFileRoute("/_authenticated/gigs/")({
  validateSearch: validateBrowseSearch,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    loadEventsRouteData({
      api: context.api,
      queryClient: context.queryClient,
      filters: {
        type: "GIG",
        status: deps.status,
        source: deps.source,
        category: deps.category,
      },
      page: toPageIndex(deps.page ?? 1),
    }),
  component: GigsRoute,
});

function GigsRoute() {
  const navigate = useNavigate({ from: Route.fullPath });
  const search = Route.useSearch();

  return (
    <BrowsePage
      browseType="GIG"
      title="Gigs"
      filters={{
        status: search.status ?? "",
        source: search.source ?? "",
        category: search.category ?? "",
      }}
      page={toPageIndex(search.page ?? 1)}
      onFilterChange={(key, value) =>
        navigate({
          search: (current) => ({
            ...current,
            [key]: value || undefined,
            page: undefined,
          }),
        })
      }
      onClearFilters={() => navigate({ search: {} })}
      onPageChange={(page) =>
        navigate({
          search: (current) => ({
            ...current,
            page: toOptionalPage(page),
          }),
        })
      }
    />
  );
}
