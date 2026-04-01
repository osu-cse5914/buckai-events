import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SearchPage } from "@/components/app-pages/search-page";
import {
  hasStartedEventSearch,
  toOptionalPage,
  toPageIndex,
  validateEventSearch,
} from "@/lib/event-route-search";
import { loadSearchRouteData } from "@/lib/route-loaders";

export const Route = createFileRoute("/_authenticated/search/")({
  validateSearch: validateEventSearch,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    loadSearchRouteData({
      api: context.api,
      queryClient: context.queryClient,
      filters: {
        query: deps.q,
        type: deps.type,
        category: deps.category,
      },
      page: toPageIndex(deps.page ?? 1),
      enabled: hasStartedEventSearch(deps),
    }),
  component: SearchRoute,
});

function SearchRoute() {
  const navigate = useNavigate({ from: Route.fullPath });
  const search = Route.useSearch();

  return (
    <SearchPage
      search={search.q ?? ""}
      type={search.type ?? ""}
      category={search.category ?? ""}
      page={toPageIndex(search.page ?? 1)}
      onSearchSubmit={(value) =>
        navigate({
          search: () => ({
            q: value.search || undefined,
            type: value.type || undefined,
            category: value.category || undefined,
            page: undefined,
          }),
        })
      }
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
