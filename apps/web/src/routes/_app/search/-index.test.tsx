import { useState } from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { SearchPage } from "@/components/app-pages/search-page";
import type { SearchRouteSearch } from "@/lib/event-route-search";
import { buildEventRecord, buildPaginatedResponse } from "@/test/factories";

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
  loadSearchRouteData: (...args: unknown[]) => state.loadSearchRouteDataMock(...args),
}));

let capturedValidateSearch: ((search: Record<string, unknown>) => Record<string, unknown>) | null =
  null;
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
      loaderDeps?: (args: { search: Record<string, unknown> }) => Record<string, unknown>;
      loader?: (args: {
        context: { api: typeof mockApiClient; queryClient: unknown };
        deps: Record<string, unknown>;
      }) => Promise<unknown>;
      component: React.ComponentType;
    }) => {
      if (path === "/_app/search/") {
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
  return okJson(
    buildPaginatedResponse(data, {
      pagination: { total: data.length, limit: 12, offset: 0 },
    }),
  );
}

function makeSearchResult(overrides: Record<string, unknown> = {}) {
  return buildEventRecord({
    title: "Hackathon",
    description: "A 24-hour build sprint",
    category: "tech",
    startAt: "2026-04-01T09:00:00.000Z",
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-03-01T00:00:00.000Z",
    creator: { id: "user_1", displayName: "Alice", email: "alice@osu.edu" },
    ...overrides,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  capturedValidateSearch = null;
  capturedLoaderDeps = null;
  capturedLoader = null;
  vi.useRealTimers();
  vi.resetModules();
});

function SearchHarness({
  initialSearch = "",
  initialType = "",
  initialCategory = "",
  initialTag = "",
  initialPage = 0,
}: {
  initialSearch?: string;
  initialType?: NonNullable<SearchRouteSearch["type"]> | "";
  initialCategory?: string;
  initialTag?: string;
  initialPage?: number;
}) {
  const [search, setSearch] = useState(initialSearch);
  const [type, setType] = useState(initialType);
  const [category, setCategory] = useState(initialCategory);
  const [tag, setTag] = useState(initialTag);
  const [page, setPage] = useState(initialPage);

  return (
    <SearchPage
      search={search}
      type={type}
      category={category}
      tag={tag}
      page={page}
      onSearchSubmit={(value) => {
        setSearch(value.search);
        setType(value.type);
        setCategory(value.category);
        setTag(value.tag);
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
  initialTag?: string;
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
      tag: " live-music ",
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
      tag: "live-music",
      page: 3,
    });
    expect(state.loadSearchRouteDataMock).toHaveBeenCalledWith({
      api: mockApiClient,
      queryClient: {},
      filters: {
        query: "hackathon",
        type: "EVENT",
        category: "music",
        tag: "live-music",
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

  it("TC-PAGES-027: uses the structured events listing when only a tag filter is active", async () => {
    state.mockEventsGet.mockResolvedValue(makeResponse([]));

    await renderSearchPage({ initialTag: "music" });

    await vi.waitFor(() => {
      const lastCall = state.mockEventsGet.mock.calls.at(-1);
      expect(lastCall?.[0].query.tag).toBe("music");
    });
    expect(state.mockSemanticSearchGet).not.toHaveBeenCalled();
    expect(await screen.findByText('Results for tag "music"')).toBeInTheDocument();
  });

  it("TC-PAGES-032: shows filter syntax hints when the search box is empty", async () => {
    await renderSearchPage();

    expect(screen.getByText(/Try filters like/i)).toBeInTheDocument();
    expect(screen.getByText("tag:group-fitness")).toBeInTheDocument();
    expect(screen.getByText("type:gig")).toBeInTheDocument();
    expect(screen.getByText("category:fitness")).toBeInTheDocument();
  });

  it("TC-PAGES-028: parses tag query syntax into a structured tag filter", async () => {
    const user = userEvent.setup();
    state.mockEventsGet.mockResolvedValue(makeResponse([]));

    await renderSearchPage();

    const searchInput = screen.getByRole("textbox", { name: "Search query" });
    await user.type(searchInput, "tag: group-fitness");
    await user.keyboard("{Enter}");

    await vi.waitFor(() => {
      const lastCall = state.mockEventsGet.mock.calls.at(-1);
      expect(lastCall?.[0].query.tag).toBe("group-fitness");
    });
    expect(state.mockSemanticSearchGet).not.toHaveBeenCalled();
    expect(searchInput).toHaveTextContent("tag: group-fitness");
    expect(screen.getAllByText("tag: group-fitness")[0]).toHaveAttribute(
      "data-search-token-type",
      "filter",
    );
  });

  it("TC-PAGES-029: equivalent tag syntax does not trigger a redundant refetch", async () => {
    const user = userEvent.setup();
    state.mockEventsGet.mockResolvedValue(makeResponse([]));

    await renderSearchPage({ initialTag: "group-fitness" });

    await vi.waitFor(() => {
      expect(state.mockEventsGet).toHaveBeenCalledTimes(1);
    });

    const searchInput = screen.getByRole("textbox", { name: "Search query" });
    await user.clear(searchInput);
    await user.type(searchInput, "tag: group-fitness");

    expect(searchInput).toHaveTextContent("tag: group-fitness");
    expect(screen.getAllByText("tag: group-fitness")[0]).toHaveAttribute(
      "data-search-token-type",
      "filter",
    );
    expect(state.mockEventsGet).toHaveBeenCalledTimes(1);
  });

  it("TC-PAGES-030: keeps typed characters in order while entering tag syntax", async () => {
    const user = userEvent.setup();
    state.mockEventsGet.mockResolvedValue(makeResponse([]));

    await renderSearchPage();

    const searchInput = screen.getByRole("textbox", { name: "Search query" });
    await user.type(searchInput, "tag:g");
    expect(searchInput).toHaveTextContent("tag:g");

    await user.type(searchInput, "r");
    expect(searchInput).toHaveTextContent("tag:gr");
  });

  it("TC-PAGES-031: parses multiple inline filters into structured search state", async () => {
    const user = userEvent.setup();
    state.mockSemanticSearchGet.mockResolvedValue(makeResponse([]));

    await renderSearchPage();

    const searchInput = screen.getByRole("textbox", { name: "Search query" });
    await user.type(searchInput, "pickup type:gig category:fitness tag:group-fitness");
    await user.keyboard("{Enter}");

    await vi.waitFor(() => {
      const lastCall = state.mockSemanticSearchGet.mock.calls.at(-1);
      expect(lastCall?.[0].query.query).toBe("pickup");
      expect(lastCall?.[0].query.type).toBe("GIG");
      expect(lastCall?.[0].query.category).toBe("fitness");
      expect(lastCall?.[0].query.tag).toBe("group-fitness");
    });

    expect(screen.getAllByText("type:gig")[0]).toHaveAttribute("data-search-token-type", "filter");
    expect(screen.getAllByText("category:fitness")[0]).toHaveAttribute(
      "data-search-token-type",
      "filter",
    );
    expect(screen.getAllByText("tag:group-fitness")[0]).toHaveAttribute(
      "data-search-token-type",
      "filter",
    );
  });

  it("TC-PAGES-033: shows plain-text suggestions while typing and replaces the whole query when selected", async () => {
    const user = userEvent.setup();
    state.mockSemanticSearchGet.mockResolvedValue(makeResponse([]));

    await renderSearchPage();

    const searchInput = screen.getByRole("textbox", { name: "Search query" });
    await user.type(searchInput, "group fitness");

    expect(await screen.findByRole("button", { name: "group fitness" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "group fitness events" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "group fitness gigs" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "group fitness this week" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "group fitness gigs" }));

    expect(searchInput).toHaveTextContent("group fitness gigs");
    await vi.waitFor(() => {
      const lastCall = state.mockSemanticSearchGet.mock.calls.at(-1);
      expect(lastCall?.[0].query.query).toBe("group fitness gigs");
    });
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
    expect(within(eventRow).getByText("Event · User · Tech")).toBeInTheDocument();
    expect(
      within(eventRow).getByRole("button", { name: "Save to collection" }),
    ).toBeInTheDocument();

    const gigRow = screen.getByRole("article", { name: "Campus Tutor listing" });
    expect(within(gigRow).getByText("Gig · User · Tech")).toBeInTheDocument();
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
      initialTag: "live-music",
      initialPage: 2,
    });

    const row = await screen.findByRole("article", { name: "Hackathon listing" });
    const detailLink = within(row).getByRole("link");

    expect(detailLink).toHaveAttribute(
      "href",
      "/events/evt_1?returnTo=search&q=hackathon&type=EVENT&category=music&tag=live-music&page=3",
    );
  });

  it("TC-PAGES-013: exposes an AI handoff link carrying the active prompt", async () => {
    state.mockSemanticSearchGet.mockResolvedValue(
      makeResponse([makeSearchResult({ id: "evt_1", title: "Hackathon" })]),
    );

    await renderSearchPage({ initialSearch: "campus jazz tonight" });

    const handoffLink = await screen.findByRole("link", {
      name: "Ask BuckAI Events",
    });
    expect(handoffLink).toHaveAttribute("href", "/ai?prompt=campus+jazz+tonight");
  });

  it("TC-PAGES-012: search page executes a new query on Enter and resets pagination", async () => {
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
    await user.type(screen.getByRole("textbox", { name: "Search query" }), "hackathon");

    expect(state.mockSemanticSearchGet.mock.calls.at(-1)?.[0].query.query).toBe("music");

    await user.keyboard("{Enter}");

    await waitFor(
      () => {
        const lastCall = state.mockSemanticSearchGet.mock.calls.at(-1);
        expect(lastCall?.[0].query.query).toBe("hackathon");
        expect(lastCall?.[0].query.offset).toBe("0");
      },
      { timeout: 1000 },
    );
  });
});
