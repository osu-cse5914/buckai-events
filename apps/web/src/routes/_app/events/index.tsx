import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BrowsePage } from "@/components/events/browse-page";
import { PAGE_SIZE } from "@/lib/queries";
import { defaultBrowseFiltersForType, validateBrowseSearch } from "@/lib/event-route-search";
import { loadEventsRouteData } from "@/lib/route-loaders";

const DEFAULT_FILTERS = defaultBrowseFiltersForType("EVENT");

export const Route = createFileRoute("/_app/events/")({
  validateSearch: validateBrowseSearch,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    loadEventsRouteData({
      api: context.api,
      queryClient: context.queryClient,
      filters: {
        type: "EVENT",
        statusMode: deps.statusMode ?? DEFAULT_FILTERS.statusMode,
        source: deps.source,
        sort: deps.sort ?? DEFAULT_FILTERS.sort,
      },
      pageSize: PAGE_SIZE,
      selectedEventId: deps.selected,
      page: 0,
    }),
  component: EventsRoute,
});

function EventsRoute() {
  const navigate = useNavigate({ from: Route.fullPath });
  const search = Route.useSearch();

  return (
    <BrowsePage
      browseType="EVENT"
      title="Events"
      filters={{
        statusMode: search.statusMode ?? DEFAULT_FILTERS.statusMode,
        source: search.source ?? "",
        sort: search.sort ?? DEFAULT_FILTERS.sort,
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
