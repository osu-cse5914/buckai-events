import { useState } from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { SearchPage } from "@/components/app-pages/search-page";
import type { SearchRouteSearch } from "@/lib/event-route-search";

const state = vi.hoisted(() => {
  const mockEventsGet = vi.fn();
  const mockSemanticSearchGet = vi.fn();
  return {
    mockEventsGet,
    mockSemanticSearchGet,
    loadSearchRouteDataMock: vi.fn(),
    mockApiClient: {
      api: {
        v1: {
          events: {
            $get: (...args: unknown[]) => mockEventsGet(...args),
            "semantic-search": {
              $get: (...args: unknown[]) => mockSemanticSearchGet(...args),
            },
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
  loadSearchRouteData: (...args: unknown[]) =>
    state.loadSearchRouteDataMock(...args),
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
    search?: Record<string, string | number | undefined>;
  }) => {
    const hrefBase = params?.eventId ? `/events/${params.eventId}` : to;
    const query = search
      ? new URLSearchParams(
          Object.entries(search).flatMap(([key, value]) =>
            value == null ? [] : [[key, String(value)]],
          ),
        ).toString()
      : "";
    const href = query ? `${hrefBase}?${query}` : hrefBase;
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

function makeSearchResult(overrides: Record<string, unknown> = {}) {
  return {
    id: "evt_1",
    title: "Hackathon",
    description: "A 24-hour build sprint",
    type: "EVENT",
    source: "USER",
    status: "OPEN",
    category: "tech",
    tags: [],
    imageUrl: null,
    ticketUrl: null,
    locationName: "Ohio Union",
    locationLatitude: null,
    locationLongitude: null,
    startAt: "2026-04-01T09:00:00.000Z",
    endAt: null,
    compensationAmount: null,
    compensationCurrency: "USD",
    compensationType: null,
    summary: null,
    creatorId: "user_1",
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-03-01T00:00:00.000Z",
    creator: { id: "user_1", displayName: "Alice", email: "alice@osu.edu" },
    ...overrides,
  };
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
  initialType?: NonNullable<SearchRouteSearch["type"]> | "";
  initialCategory?: string;
  initialPage?: number;
}) {
  const [search, setSearch] = useState(initialSearch);
  const [type, setType] = useState(initialType);
  const [category, setCategory] = useState(initialCategory);
  const [page, setPage] = useState(initialPage);

  return (
    <SearchPage
      search={search}
      type={type}
      category={category}
      page={page}
      onSearchSubmit={(value) => {
        setSearch(value.search);
        setType(value.type);
        setCategory(value.category);
        setPage(0);
      }}
      onPageChange={setPage}
    />
  );
}

async function renderSearchPage(options?: {
  initialSearch?: string;
  initialType?: NonNullable<SearchRouteSearch["type"]> | "";
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
    expect(state.loadSearchRouteDataMock).toHaveBeenCalledWith({
      api: mockApiClient,
      queryClient: {},
      filters: {
        query: "hackathon",
        type: "EVENT",
        category: "music",
      },
      page: 2,
      enabled: true,
    });
  });

  it("TC-PAGES-012: passes search text to the semantic search API", async () => {
    state.mockSemanticSearchGet.mockResolvedValue(makeResponse([]));

    await renderSearchPage({ initialSearch: "hackathon" });

    await vi.waitFor(() => {
      const lastCall = state.mockSemanticSearchGet.mock.calls.at(-1);
      expect(lastCall?.[0].query.query).toBe("hackathon");
    });
    expect(state.mockEventsGet).not.toHaveBeenCalled();
  });

  it("TC-PAGES-023: uses the structured events listing when only filters are active", async () => {
    state.mockEventsGet.mockResolvedValue(makeResponse([]));

    await renderSearchPage({
      initialType: "EVENT",
      initialCategory: "music",
    });

    await vi.waitFor(() => {
      const lastCall = state.mockEventsGet.mock.calls.at(-1);
      expect(lastCall?.[0].query.type).toBe("EVENT");
      expect(lastCall?.[0].query.category).toBe("music");
    });
    expect(state.mockSemanticSearchGet).not.toHaveBeenCalled();
  });

  it("TC-PAGES-020: shows a results-shaped skeleton while an active search is loading", async () => {
    state.mockSemanticSearchGet.mockReturnValue(new Promise(() => {}));

    await renderSearchPage({ initialSearch: "hackathon" });

    const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders search results in the shared listing layout", async () => {
    state.mockSemanticSearchGet.mockResolvedValue(
      makeResponse([
        makeSearchResult({ id: "evt_1", title: "Hackathon", type: "EVENT" }),
        makeSearchResult({
          id: "gig_1",
          title: "Campus Tutor",
          type: "GIG",
          compensationAmount: 25,
          compensationType: "HOURLY",
          locationName: "Thompson Library",
        }),
      ]),
    );

    await renderSearchPage({ initialSearch: "hackathon" });

    expect(await screen.findByText('Results for "hackathon"')).toBeInTheDocument();

    const eventRow = screen.getByRole("article", { name: "Hackathon listing" });
    expect(within(eventRow).getByText("EVENT")).toBeInTheDocument();
    expect(
      within(eventRow).getByRole("button", { name: "Save to collection" }),
    ).toBeInTheDocument();

    const gigRow = screen.getByRole("article", { name: "Campus Tutor listing" });
    expect(within(gigRow).getByText("GIG")).toBeInTheDocument();
    expect(within(gigRow).getByText("$25/hr")).toBeInTheDocument();
  });

  it("TC-PAGES-022: preserves the current search state in detail links", async () => {
    state.mockSemanticSearchGet.mockResolvedValue(
      makeResponse([makeSearchResult({ id: "evt_1", title: "Hackathon" })]),
    );

    await renderSearchPage({
      initialSearch: "hackathon",
      initialType: "EVENT",
      initialCategory: "music",
      initialPage: 2,
    });

    const row = await screen.findByRole("article", { name: "Hackathon listing" });
    const detailLink = within(row).getByRole("link");

    expect(detailLink).toHaveAttribute(
      "href",
      "/events/evt_1?returnTo=search&q=hackathon&type=EVENT&category=music&page=3",
    );
  });

  it("TC-PAGES-013: exposes an AI handoff link carrying the active prompt", async () => {
    state.mockSemanticSearchGet.mockResolvedValue(
      makeResponse([makeSearchResult({ id: "evt_1", title: "Hackathon" })]),
    );

    await renderSearchPage({ initialSearch: "campus jazz tonight" });

    const handoffLink = await screen.findByRole("link", {
      name: "Ask BuckAI about this search",
    });
    expect(handoffLink).toHaveAttribute(
      "href",
      "/ai?prompt=campus+jazz+tonight",
    );
  });

  it("TC-PAGES-012: search page submits a new query and resets pagination", async () => {
    const user = userEvent.setup();
    state.mockSemanticSearchGet.mockResolvedValue(
      makeResponse([makeSearchResult({ id: "evt-1", title: "Hackathon" })]),
    );

    await renderSearchPage({
      initialSearch: "music",
      initialPage: 2,
    });

    await waitFor(() => {
      const lastCall = state.mockSemanticSearchGet.mock.calls.at(-1);
      expect(lastCall?.[0].query.query).toBe("music");
      expect(lastCall?.[0].query.offset).toBe("24");
    });

    await user.clear(screen.getByRole("textbox", { name: "Search query" }));
    await user.type(
      screen.getByRole("textbox", { name: "Search query" }),
      "hackathon{enter}",
    );

    await waitFor(() => {
      const lastCall = state.mockSemanticSearchGet.mock.calls.at(-1);
      expect(lastCall?.[0].query.query).toBe("hackathon");
      expect(lastCall?.[0].query.offset).toBe("0");
    });
  });
});
