import { createFileRoute } from "@tanstack/react-router";
import { YouEventsPage } from "@/components/you/you-events-page";
import { requireSignedInBeforeLoad } from "@/lib/route-access";

export const Route = createFileRoute("/_app/you/events/")({
  beforeLoad: requireSignedInBeforeLoad,
  component: YouEventsPage,
});
