import { createFileRoute } from "@tanstack/react-router";
import { EventDetailSurface } from "@/components/events/event-detail-surface";
import { validateEventDetailSearch } from "@/lib/event-route-search";

export const Route = createFileRoute("/_app/events/$eventId/")({
  validateSearch: validateEventDetailSearch,
  component: EventDetailPage,
});

function EventDetailPage() {
  const { eventId } = Route.useParams();
  const search = Route.useSearch();
  const returnsToSearch = search.returnTo === "search";
  const returnsToBrowse = search.returnTo === "browse";
  const returnsToFeatured = search.returnTo === "featured";
  const returnsToCollection = search.returnTo === "collections";
  const browsePath = returnsToSearch
    ? "/search"
    : returnsToCollection
      ? undefined
    : returnsToFeatured
      ? "/featured"
    : returnsToBrowse
      ? search.browseType === "GIG"
        ? "/gigs"
        : "/events"
      : undefined;
  const browseLabel = returnsToSearch
    ? "Search results"
    : returnsToCollection
      ? search.collectionName ?? "Collection"
    : returnsToFeatured
      ? "Featured"
    : returnsToBrowse
      ? search.browseType === "GIG"
        ? "Gigs"
        : "Events"
      : undefined;
  const browseSearch = returnsToSearch
    ? {
        q: search.q,
        type: search.type,
        category: search.category,
        tag: search.tag,
        page: search.page,
      }
    : returnsToCollection
      ? {
          collectionId: search.collectionId,
          collectionName: search.collectionName,
        }
    : returnsToFeatured
      ? {
          type: search.type,
        }
    : returnsToBrowse
      ? {
          statusMode: search.statusMode,
          source: search.source,
          sort: search.sort,
          selected: search.selected,
        }
      : undefined;

  return (
    <EventDetailSurface
      eventId={eventId}
      mode="page"
      browsePath={browsePath}
      browseLabel={browseLabel}
      browseSearch={browseSearch}
      detailSearch={search}
    />
  );
}
