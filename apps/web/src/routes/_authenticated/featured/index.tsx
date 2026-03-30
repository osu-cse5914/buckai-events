import { createFileRoute } from "@tanstack/react-router";
import { FeaturedPage } from "@/components/app-pages/featured-page";

export const Route = createFileRoute("/_authenticated/featured/")({
  component: FeaturedPage,
});
