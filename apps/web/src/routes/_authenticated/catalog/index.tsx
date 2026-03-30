import { createFileRoute } from "@tanstack/react-router";
import { CatalogPage } from "@/components/events/catalog-page";

export const Route = createFileRoute("/_authenticated/catalog/")({
  component: CatalogPage,
});
