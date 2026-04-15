import { createFileRoute } from "@tanstack/react-router";
import { YouCollectionDetailPage } from "@/components/you/you-collection-detail-page";
import { requireSignedInBeforeLoad } from "@/lib/route-access";

export const Route = createFileRoute("/_app/you/collections/$collectionId/")({
  beforeLoad: requireSignedInBeforeLoad,
  component: YouCollectionDetailRoute,
});

function YouCollectionDetailRoute() {
  const { collectionId } = Route.useParams();

  return <YouCollectionDetailPage collectionId={collectionId} />;
}
