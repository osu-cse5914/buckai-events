import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CatalogPage } from "@/components/events/catalog-page";
import {
  toOptionalPage,
  toPageIndex,
  validateCatalogSearch,
} from "@/lib/event-route-search";
import { loadEventsRouteData } from "@/lib/route-loaders";

export const Route = createFileRoute("/_authenticated/catalog/")({
  validateSearch: validateCatalogSearch,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    loadEventsRouteData({
      api: context.api,
      queryClient: context.queryClient,
      filters: {
        type: deps.type,
        status: deps.status,
        source: deps.source,
        category: deps.category,
      },
      page: toPageIndex(deps.page ?? 1),
    }),
  component: CatalogRoute,
});

function CatalogRoute() {
  const navigate = useNavigate({ from: Route.fullPath });
  const search = Route.useSearch();

  return (
    <CatalogPage
      filters={{
        type: search.type ?? "",
        status: search.status ?? "",
        source: search.source ?? "",
        category: search.category ?? "",
      }}
      page={toPageIndex(search.page ?? 1)}
      onFilterChange={(key, value) =>
        navigate({
          search: (current) => ({
            ...current,
            [key]: value || undefined,
            page: undefined,
          }),
        })
      }
      onClearFilters={() => navigate({ search: {} })}
      onPageChange={(page) =>
        navigate({
          search: (current) => ({
            ...current,
            page: toOptionalPage(page),
          }),
        })
      }
    />
  );
}
