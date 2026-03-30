import { createFileRoute } from "@tanstack/react-router";
import { YouEventsPage } from "@/components/you/you-events-page";

export const Route = createFileRoute("/_authenticated/you/events/")({
  component: YouEventsPage,
});
