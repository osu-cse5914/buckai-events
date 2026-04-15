import { createFileRoute } from "@tanstack/react-router";
import { SocialFeedPage } from "@/components/app-pages/social-feed-page";
import { requireSignedInBeforeLoad } from "@/lib/route-access";

export const Route = createFileRoute("/_app/social/")({
  beforeLoad: requireSignedInBeforeLoad,
  component: SocialRoute,
});

function SocialRoute() {
  return <SocialFeedPage />;
}
