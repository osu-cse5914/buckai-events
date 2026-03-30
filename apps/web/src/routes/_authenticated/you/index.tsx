import { createFileRoute } from "@tanstack/react-router";
import { YouHubPage } from "@/components/you/you-hub-page";

export const Route = createFileRoute("/_authenticated/you/")({
  component: YouHubPage,
});
