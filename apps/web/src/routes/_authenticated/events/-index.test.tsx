import { useState } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BrowsePage } from "@/components/events/browse-page";

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
      if (path === "/_authenticated/events/") {
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
    <a href={params?.eventId ? `/events/${params.eventId}` : to} {...props}>
      {children}
    </a>
  ),
}));

const DEFAULT_FILTERS = {
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
    title: "Concert",
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

function EventsHarness({
  initialFilters = DEFAULT_FILTERS,
  initialPage = 0,
}: {
  initialFilters?: typeof DEFAULT_FILTERS;
  initialPage?: number;
}) {
  const [filters, setFilters] = useState(initialFilters);
  const [page, setPage] = useState(initialPage);

  return (
    <BrowsePage
      browseType="EVENT"
      title="Events"
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

async function renderEventsPage(options?: {
  initialFilters?: typeof DEFAULT_FILTERS;
  initialPage?: number;
}) {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <EventsHarness {...options} />
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

describe("[phase:6] [regression:always] EventsRoute", () => {
  it("TC-PAGES-017: validates events URL state and primes loader data", async () => {
    await import("./index");

    if (!capturedValidateSearch || !capturedLoaderDeps || !capturedLoader) {
      throw new Error("Events route config was not captured");
    }

    const search = capturedValidateSearch({
      type: "GIG",
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

describe("[phase:1] [regression:always] EventsPage", () => {
  it("shows loading skeletons while fetching", async () => {
    state.mockGet.mockReturnValue(new Promise(() => {}));

    await renderEventsPage();

    const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("displays events in card layout", async () => {
    state.mockGet.mockResolvedValue(
      makeResponse([
        makeEvent({ id: "1", title: "Hackathon" }),
        makeEvent({ id: "2", title: "Jazz Night", category: "music" }),
      ]),
    );

    await renderEventsPage();

    expect(await screen.findByText("Hackathon")).toBeInTheDocument();
    expect(await screen.findByText("Jazz Night")).toBeInTheDocument();
  });

  it("shows empty state when no events match", async () => {
    state.mockGet.mockResolvedValue(makeResponse([]));

    await renderEventsPage();

    expect(await screen.findByText("No events found")).toBeInTheDocument();
  });

  it("renders event card without a type badge", async () => {
    state.mockGet.mockResolvedValue(
      makeResponse([makeEvent({ id: "1", title: "Concert", status: "OPEN" })]),
    );

    await renderEventsPage();

    const card = (await screen.findByText("Concert")).closest('[data-slot="card"]') as HTMLElement;
    expect(within(card).queryByText("EVENT")).not.toBeInTheDocument();
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

    await renderEventsPage();

    expect(await screen.findByText("Thompson Library")).toBeInTheDocument();
    expect(screen.getByText(/Apr/)).toBeInTheDocument();
  });

  it("passes fixed event type and filter params to API", async () => {
    state.mockGet.mockResolvedValue(makeResponse([]));
    const user = userEvent.setup();

    await renderEventsPage();
    await screen.findByText("No events found");

    const triggers = screen.getAllByRole("combobox");
    expect(triggers).toHaveLength(2);
    await user.click(triggers[0]);
    await user.click(await screen.findByRole("option", { name: "Open" }));

    await vi.waitFor(() => {
      const lastCall = state.mockGet.mock.calls.at(-1);
      expect(lastCall?.[0].query.type).toBe("EVENT");
      expect(lastCall?.[0].query.status).toBe("OPEN");
      expect(lastCall?.[0].query.offset).toBe("0");
    });
  });

  it("does not render a type filter or keyword input", async () => {
    state.mockGet.mockResolvedValue(makeResponse([]));

    await renderEventsPage();
    await screen.findByText("No events found");

    expect(screen.getAllByRole("combobox")).toHaveLength(2);
    expect(
      screen.queryByPlaceholderText("Search events..."),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("All Types")).not.toBeInTheDocument();
  });

  it("shows pagination when total exceeds page size", async () => {
    const events = Array.from({ length: 12 }, (_, i) =>
      makeEvent({ id: `evt_${i}`, title: `Event ${i}` }),
    );
    state.mockGet.mockResolvedValue(makeResponse(events, 30));

    await renderEventsPage();

    await screen.findByText("Event 0");
    expect(screen.getByText(/Showing 1/)).toBeInTheDocument();
    expect(screen.getByText(/of 30/)).toBeInTheDocument();
  });

  it("clear filters resets all filters", async () => {
    state.mockGet.mockResolvedValue(makeResponse([]));
    const user = userEvent.setup();

    await renderEventsPage();
    await screen.findByText("No events found");

    const triggers = screen.getAllByRole("combobox");
    await user.click(triggers[0]);
    await user.click(await screen.findByRole("option", { name: "Open" }));

    const clearButton = await screen.findByRole("button", {
      name: /Clear filters/,
    });
    await user.click(clearButton);

    const resetTriggers = screen.getAllByRole("combobox");
    expect(resetTriggers[0]).toHaveTextContent("All Statuses");
  });
});
