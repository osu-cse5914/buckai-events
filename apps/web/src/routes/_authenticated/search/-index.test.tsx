import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { SearchPage } from "@/components/app-pages/search-page";

const state = vi.hoisted(() => {
  const mockGet = vi.fn();
  return {
    mockGet,
    loadEventsRouteDataMock: vi.fn(),
    mockApiClient: {
      api: {
        v1: {
          events: {
            $get: (...args: unknown[]) => mockGet(...args),
          },
        },
      },
    },
  };
});

const mockApiClient = state.mockApiClient;

vi.mock("@/lib/api", () => ({
  api: state.mockApiClient,
  useApiClient: () => state.mockApiClient,
}));

vi.mock("@/lib/route-loaders", () => ({
  loadEventsRouteData: (...args: unknown[]) =>
    state.loadEventsRouteDataMock(...args),
}));

let capturedValidateSearch:
  | ((search: Record<string, unknown>) => Record<string, unknown>)
  | null = null;
let capturedLoaderDeps:
  | ((args: { search: Record<string, unknown> }) => Record<string, unknown>)
  | null = null;
let capturedLoader:
  | ((args: {
      context: { api: typeof mockApiClient; queryClient: unknown };
      deps: Record<string, unknown>;
    }) => Promise<unknown>)
  | null = null;

vi.mock("@tanstack/react-router", () => ({
  createFileRoute:
    (path: string) =>
    (config: {
      validateSearch?: (search: Record<string, unknown>) => Record<string, unknown>;
      loaderDeps?: (args: {
        search: Record<string, unknown>;
      }) => Record<string, unknown>;
      loader?: (args: {
        context: { api: typeof mockApiClient; queryClient: unknown };
        deps: Record<string, unknown>;
      }) => Promise<unknown>;
      component: React.ComponentType;
    }) => {
      if (path === "/_authenticated/search/") {
        capturedValidateSearch = config.validateSearch ?? null;
        capturedLoaderDeps = config.loaderDeps ?? null;
        capturedLoader = config.loader ?? null;
      }

      return {
        component: config.component,
        fullPath: path,
      };
    },
  useNavigate: () => vi.fn(),
  Link: ({
    children,
    to,
    params,
    search,
    ...props
  }: {
    children: React.ReactNode;
    to: string;
    params?: Record<string, string>;
    search?: Record<string, string | undefined>;
  }) => {
    const href = params?.eventId
      ? `/events/${params.eventId}`
      : search?.prompt
        ? `${to}?prompt=${encodeURIComponent(search.prompt)}`
        : to;
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  },
}));

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
}

function okJson(data: unknown) {
  return { ok: true, json: () => Promise.resolve(data) };
}

function makeResponse(data: unknown[] = []) {
  return okJson({
    data,
    pagination: { total: data.length, limit: 12, offset: 0 },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  capturedValidateSearch = null;
  capturedLoaderDeps = null;
  capturedLoader = null;
  vi.resetModules();
});

function SearchHarness({
  initialSearch = "",
  initialType = "",
  initialCategory = "",
  initialPage = 0,
}: {
  initialSearch?: string;
  initialType?: string;
  initialCategory?: string;
  initialPage?: number;
}) {
  const [search, setSearch] = useState(initialSearch);
  const [page, setPage] = useState(initialPage);

  return (
    <SearchPage
      search={search}
      type={initialType}
      category={initialCategory}
      page={page}
      onSearchSubmit={(value) => {
        setSearch(value);
        setPage(0);
      }}
      onPageChange={setPage}
    />
  );
}

async function renderSearchPage(options?: {
  initialSearch?: string;
  initialType?: string;
  initialCategory?: string;
  initialPage?: number;
}) {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <SearchHarness {...options} />
    </QueryClientProvider>,
  );
}

describe("[phase:6] [regression:always] SearchPage", () => {
  it("TC-PAGES-018: validates search URL state and primes loader data", async () => {
    await import("./index");

    if (!capturedValidateSearch || !capturedLoaderDeps || !capturedLoader) {
      throw new Error("Search route config was not captured");
    }

    const search = capturedValidateSearch({
      q: "  hackathon ",
      type: "EVENT",
      category: " music ",
      page: "3",
    });
    const deps = capturedLoaderDeps({ search });

    await capturedLoader({
      context: { api: mockApiClient, queryClient: {} },
      deps,
    });

    expect(search).toEqual({
      q: "hackathon",
      type: "EVENT",
      category: "music",
      page: 3,
    });
    expect(state.loadEventsRouteDataMock).toHaveBeenCalledWith({
      api: mockApiClient,
      queryClient: {},
      filters: {
        search: "hackathon",
        type: "EVENT",
        category: "music",
      },
      page: 2,
      enabled: true,
    });
  });

  it("TC-PAGES-012: passes search text to the events API", async () => {
    state.mockGet.mockResolvedValue(makeResponse([]));

    await renderSearchPage({ initialSearch: "hackathon" });

    await vi.waitFor(() => {
      const lastCall = state.mockGet.mock.calls.at(-1);
      expect(lastCall?.[0].query.search).toBe("hackathon");
    });
  });

  it("TC-PAGES-020: shows a results-shaped skeleton while an active search is loading", async () => {
    state.mockGet.mockReturnValue(new Promise(() => {}));

    await renderSearchPage({ initialSearch: "hackathon" });

    const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("TC-PAGES-012: search page submits a new query and resets pagination", async () => {
    const user = userEvent.setup();
    state.mockGet.mockResolvedValue(makeResponse([{ id: "evt-1", title: "Hackathon" }]));

    await renderSearchPage({
      initialSearch: "music",
      initialPage: 2,
    });

    await waitFor(() => {
      const lastCall = state.mockGet.mock.calls.at(-1);
      expect(lastCall?.[0].query.search).toBe("music");
      expect(lastCall?.[0].query.offset).toBe("24");
    });

    await user.clear(screen.getByRole("textbox", { name: "Search query" }));
    await user.type(
      screen.getByRole("textbox", { name: "Search query" }),
      "hackathon{enter}",
    );

    await waitFor(() => {
      const lastCall = state.mockGet.mock.calls.at(-1);
      expect(lastCall?.[0].query.search).toBe("hackathon");
      expect(lastCall?.[0].query.offset).toBe("0");
    });
  });
});
