import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BrowsePage } from "@/components/events/browse-page";
import { PAGE_SIZE } from "@/lib/queries";
import { validateBrowseSearch } from "@/lib/event-route-search";
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
      pageSize: PAGE_SIZE,
      selectedEventId: deps.selected,
      page: 0,
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
      selectedEventId={search.selected}
      onFilterChange={(key, value) =>
        navigate({
          search: (current) => ({
            ...current,
            [key]: value || undefined,
            selected: undefined,
          }),
        })
      }
      onClearFilters={() => navigate({ search: {} })}
      onClearSelectedEvent={() =>
        navigate({
          search: (current) => ({
            ...current,
            selected: undefined,
          }),
        })
      }
      onSelectEvent={(eventId) =>
        navigate({
          search: (current) => ({
            ...current,
            selected: eventId,
          }),
        })
      }
    />
  );
}
