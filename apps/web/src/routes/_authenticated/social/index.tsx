import { createFileRoute } from "@tanstack/react-router";
import { SocialFeedPage } from "@/components/app-pages/social-feed-page";

export const Route = createFileRoute("/_authenticated/social/")({
  component: SocialRoute,
});

function SocialRoute() {
  return <SocialFeedPage />;
}
