import { createFileRoute } from "@tanstack/react-router";
import { SearchPage } from "@/components/app-pages/search-page";

export const Route = createFileRoute("/_authenticated/search/")({
  component: SearchPage,
});
