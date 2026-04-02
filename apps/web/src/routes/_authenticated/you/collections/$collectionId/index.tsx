import { createFileRoute } from "@tanstack/react-router";
import { YouCollectionDetailPage } from "@/components/you/you-collection-detail-page";

export const Route = createFileRoute(
  "/_authenticated/you/collections/$collectionId/",
)({
  component: YouCollectionDetailRoute,
});

function YouCollectionDetailRoute() {
  const { collectionId } = Route.useParams();

  return <YouCollectionDetailPage collectionId={collectionId} />;
}
