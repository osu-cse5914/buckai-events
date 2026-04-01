import { createFileRoute } from "@tanstack/react-router";
import { EventDetailSurface } from "@/components/events/event-detail-surface";

export const Route = createFileRoute("/_authenticated/events/$eventId/")({
  component: EventDetailPage,
});

function EventDetailPage() {
  const { eventId } = Route.useParams();

  return <EventDetailSurface eventId={eventId} mode="page" />;
}
