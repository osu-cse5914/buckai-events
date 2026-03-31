import { useState } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CatalogPage } from "@/components/events/catalog-page";

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
      component?: React.ComponentType;
    }) => {
      if (path === "/_authenticated/catalog/") {
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
    ...props
  }: {
    children: React.ReactNode;
    to: string;
    params?: Record<string, string>;
    className?: string;
  }) => (
    <a
      href={params?.eventId ? `/events/${params.eventId}` : to}
      {...props}
    >
      {children}
    </a>
  ),
}));

const DEFAULT_FILTERS = {
  type: "",
  status: "",
  source: "",
  category: "",
};

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
}

function makeEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: "evt_1",
    title: "Test Event",
    description: "A test event",
    type: "EVENT",
    source: "USER",
    status: "OPEN",
    category: "music",
    tags: [],
    imageUrl: null,
    ticketUrl: null,
    locationName: "Ohio Union",
    locationLatitude: null,
    locationLongitude: null,
    startAt: "2025-04-01T09:00:00.000Z",
    endAt: null,
    compensationAmount: null,
    compensationCurrency: "USD",
    compensationType: null,
    summary: null,
    creatorId: "user_1",
    createdAt: "2025-03-01T00:00:00.000Z",
    updatedAt: "2025-03-01T00:00:00.000Z",
    creator: { id: "user_1", displayName: "Alice", email: "alice@osu.edu" },
    ...overrides,
  };
}

function makeResponse(
  events: ReturnType<typeof makeEvent>[] = [],
  total?: number,
) {
  return {
    ok: true,
    json: () =>
      Promise.resolve({
        data: events,
        pagination: { total: total ?? events.length, limit: 12, offset: 0 },
      }),
  };
}

function CatalogHarness({
  initialFilters = DEFAULT_FILTERS,
  initialPage = 0,
}: {
  initialFilters?: typeof DEFAULT_FILTERS;
  initialPage?: number;
}) {
  const [filters, setFilters] = useState(initialFilters);
  const [page, setPage] = useState(initialPage);

  return (
    <CatalogPage
      filters={filters}
      page={page}
      onFilterChange={(key, value) => {
        setFilters((current) => ({ ...current, [key]: value }));
        setPage(0);
      }}
      onClearFilters={() => {
        setFilters(DEFAULT_FILTERS);
        setPage(0);
      }}
      onPageChange={setPage}
    />
  );
}

async function renderCatalogPage(options?: {
  initialFilters?: typeof DEFAULT_FILTERS;
  initialPage?: number;
}) {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <CatalogHarness {...options} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  capturedValidateSearch = null;
  capturedLoaderDeps = null;
  capturedLoader = null;
  vi.resetModules();
});

describe("[phase:6] [regression:always] CatalogRoute", () => {
  it("TC-PAGES-017: validates catalog URL state and primes loader data", async () => {
    await import("./index");

    if (!capturedValidateSearch || !capturedLoaderDeps || !capturedLoader) {
      throw new Error("Catalog route config was not captured");
    }

    const search = capturedValidateSearch({
      type: "EVENT",
      status: "OPEN",
      source: "USER",
      category: " music ",
      page: "2",
    });
    const deps = capturedLoaderDeps({ search });

    await capturedLoader({
      context: { api: mockApiClient, queryClient: {} },
      deps,
    });

    expect(search).toEqual({
      type: "EVENT",
      status: "OPEN",
      source: "USER",
      category: "music",
      page: 2,
    });
    expect(state.loadEventsRouteDataMock).toHaveBeenCalledWith({
      api: mockApiClient,
      queryClient: {},
      filters: {
        type: "EVENT",
        status: "OPEN",
        source: "USER",
        category: "music",
      },
      page: 1,
    });
  });
});

describe("[phase:1] [regression:always] CatalogPage", () => {
  it("shows loading skeletons while fetching", async () => {
    state.mockGet.mockReturnValue(new Promise(() => {}));

    await renderCatalogPage();

    const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("displays events in card layout", async () => {
    const events = [
      makeEvent({ id: "1", title: "Hackathon" }),
      makeEvent({ id: "2", title: "Jazz Night", type: "GIG", category: "music" }),
    ];
    state.mockGet.mockResolvedValue(makeResponse(events));

    await renderCatalogPage();

    expect(await screen.findByText("Hackathon")).toBeInTheDocument();
    expect(await screen.findByText("Jazz Night")).toBeInTheDocument();
  });

  it("shows empty state when no events match", async () => {
    state.mockGet.mockResolvedValue(makeResponse([]));

    await renderCatalogPage();

    expect(await screen.findByText("No events found")).toBeInTheDocument();
  });

  it("renders event card with type and status badges", async () => {
    state.mockGet.mockResolvedValue(
      makeResponse([makeEvent({ id: "1", title: "Concert", type: "EVENT", status: "OPEN" })]),
    );

    await renderCatalogPage();

    const card = (await screen.findByText("Concert")).closest('[data-slot="card"]') as HTMLElement;
    expect(within(card).getByText("EVENT")).toBeInTheDocument();
    expect(within(card).getByText("Open")).toBeInTheDocument();
  });

  it("renders event card with location and date", async () => {
    state.mockGet.mockResolvedValue(
      makeResponse([
        makeEvent({
          id: "1",
          title: "Concert",
          locationName: "Thompson Library",
          startAt: "2025-04-01T09:00:00.000Z",
        }),
      ]),
    );

    await renderCatalogPage();

    expect(await screen.findByText("Thompson Library")).toBeInTheDocument();
    expect(screen.getByText(/Apr/)).toBeInTheDocument();
  });

  it("TC-EVT-018: event card title uses relaxed line height to prevent clamp clipping", async () => {
    const title =
      "Long title with descenders going past baseline and wrapping into another line";
    state.mockGet.mockResolvedValue(makeResponse([makeEvent({ id: "1", title })]));

    await renderCatalogPage();

    const titleNode = await screen.findByText(title);
    expect(titleNode).toHaveClass("line-clamp-2");
    expect(titleNode).toHaveClass("leading-tight");
    expect(titleNode).toHaveClass("pb-0.5");
  });

  it("renders gig compensation", async () => {
    state.mockGet.mockResolvedValue(
      makeResponse([
        makeEvent({
          id: "1",
          title: "Tutoring",
          type: "GIG",
          compensationAmount: 25,
          compensationType: "HOURLY",
        }),
      ]),
    );

    await renderCatalogPage();

    expect(await screen.findByText("$25/hr")).toBeInTheDocument();
  });

  it("event cards link to detail page", async () => {
    state.mockGet.mockResolvedValue(
      makeResponse([makeEvent({ id: "evt_abc", title: "Study Group" })]),
    );

    await renderCatalogPage();

    const link = await screen.findByText("Study Group");
    const anchor = link.closest("a");
    expect(anchor).toHaveAttribute("href", "/events/evt_abc");
  });

  it("shows creator name on event card", async () => {
    state.mockGet.mockResolvedValue(
      makeResponse([
        makeEvent({
          id: "1",
          title: "Event",
          creator: { id: "u1", displayName: "Bob Smith", email: "bob@osu.edu" },
        }),
      ]),
    );

    await renderCatalogPage();

    expect(await screen.findByText("Bob Smith")).toBeInTheDocument();
  });

  it("passes filter params to API", async () => {
    state.mockGet.mockResolvedValue(makeResponse([]));
    const user = userEvent.setup();

    await renderCatalogPage();
    await screen.findByText("No events found");

    const triggers = screen.getAllByRole("combobox");
    await user.click(triggers[0]);

    const eventOption = await screen.findByRole("option", { name: "Event" });
    await user.click(eventOption);

    await vi.waitFor(() => {
      const lastCall = state.mockGet.mock.calls.at(-1);
      expect(lastCall?.[0].query.type).toBe("EVENT");
      expect(lastCall?.[0].query.offset).toBe("0");
    });
  });

  it("does not render a keyword search input in catalog mode", async () => {
    state.mockGet.mockResolvedValue(makeResponse([]));

    await renderCatalogPage();
    await screen.findByText("No events found");

    expect(
      screen.queryByPlaceholderText("Search events..."),
    ).not.toBeInTheDocument();
  });

  it("shows pagination when total exceeds page size", async () => {
    const events = Array.from({ length: 12 }, (_, i) =>
      makeEvent({ id: `evt_${i}`, title: `Event ${i}` }),
    );
    state.mockGet.mockResolvedValue(makeResponse(events, 30));

    await renderCatalogPage();

    await screen.findByText("Event 0");
    expect(screen.getByText(/Showing 1/)).toBeInTheDocument();
    expect(screen.getByText(/of 30/)).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "3" })).toBeInTheDocument();
  });

  it("does not show pagination for single page", async () => {
    state.mockGet.mockResolvedValue(
      makeResponse([makeEvent({ id: "1", title: "Solo Event" })], 1),
    );

    await renderCatalogPage();
    await screen.findByText("Solo Event");

    expect(screen.queryByText(/Showing/)).not.toBeInTheDocument();
  });

  it("navigates to next page when clicking page button", async () => {
    const events = Array.from({ length: 12 }, (_, i) =>
      makeEvent({ id: `evt_${i}`, title: `Event ${i}` }),
    );
    state.mockGet.mockResolvedValue(makeResponse(events, 24));
    const user = userEvent.setup();

    await renderCatalogPage();
    await screen.findByText("Event 0");

    await user.click(screen.getByRole("button", { name: "2" }));

    await vi.waitFor(() => {
      const lastCall = state.mockGet.mock.calls.at(-1);
      expect(lastCall?.[0].query.offset).toBe("12");
    });
  });

  it("shows error state on fetch failure", async () => {
    state.mockGet.mockResolvedValue({ ok: false, status: 500 });

    await renderCatalogPage();

    expect(await screen.findByText("Failed to fetch events")).toBeInTheDocument();
  });

  it("clear filters button resets all filters", async () => {
    state.mockGet.mockResolvedValue(makeResponse([]));
    const user = userEvent.setup();

    await renderCatalogPage();
    await screen.findByText("No events found");

    const triggers = screen.getAllByRole("combobox");
    await user.click(triggers[0]);
    const gigOption = await screen.findByRole("option", { name: "Gig" });
    await user.click(gigOption);

    const clearBtns = await screen.findAllByRole("button", { name: /Clear filters/ });
    await user.click(clearBtns[0]);

    const resetTriggers = screen.getAllByRole("combobox");
    expect(resetTriggers[0]).toHaveTextContent("All Types");
  });

  it("renders category on event card when present", async () => {
    state.mockGet.mockResolvedValue(
      makeResponse([makeEvent({ id: "1", title: "Concert", category: "music" })]),
    );

    await renderCatalogPage();

    expect(await screen.findByText("music")).toBeInTheDocument();
  });
});
