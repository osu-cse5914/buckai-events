import { createFileRoute } from "@tanstack/react-router";
import { EventDetailSurface } from "@/components/events/event-detail-surface";
import { validateEventDetailSearch } from "@/lib/event-route-search";

export const Route = createFileRoute("/_authenticated/events/$eventId/")({
  validateSearch: validateEventDetailSearch,
  component: EventDetailPage,
});

function EventDetailPage() {
  const { eventId } = Route.useParams();
  const search = Route.useSearch();
  const returnsToSearch = search.returnTo === "search";

  return (
    <EventDetailSurface
      eventId={eventId}
      mode="page"
      browsePath={returnsToSearch ? "/search" : undefined}
      browseLabel={returnsToSearch ? "Search results" : undefined}
      browseSearch={
        returnsToSearch
          ? {
              q: search.q,
              type: search.type,
              category: search.category,
              page: search.page,
            }
          : undefined
      }
    />
  );
}
