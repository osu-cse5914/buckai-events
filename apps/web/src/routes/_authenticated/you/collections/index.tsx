import { createFileRoute } from "@tanstack/react-router";
import { YouCollectionsPage } from "@/components/you/you-collections-page";

export const Route = createFileRoute("/_authenticated/you/collections/")({
  component: YouCollectionsPage,
});
