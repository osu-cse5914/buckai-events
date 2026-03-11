import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/events/$eventId")({
  component: EventDetailPage,
});

function EventDetailPage() {
  const { eventId } = Route.useParams();

  return (
    <section className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Event Detail</h1>
      <p className="mt-2 text-muted-foreground">
        Event {eventId} — Coming soon.
      </p>
    </section>
  );
}
