import { createFileRoute } from "@tanstack/react-router";
import { YouCollectionsPage } from "@/components/you/you-collections-page";
import { requireSignedInBeforeLoad } from "@/lib/route-access";

export const Route = createFileRoute("/_app/you/collections/")({
  beforeLoad: requireSignedInBeforeLoad,
  component: YouCollectionsPage,
});
