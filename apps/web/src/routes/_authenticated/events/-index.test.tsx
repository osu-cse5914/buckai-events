import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BrowsePage } from "@/components/events/browse-page";
import { PAGE_SIZE } from "@/lib/queries";

const state = vi.hoisted(() => {
  const mockGet = vi.fn();
  const mockEventDetailGet = vi.fn();
  return {
    mockGet,
    mockEventDetailGet,
    loadEventsRouteDataMock: vi.fn(),
    mockApiClient: {
      api: {
        v1: {
          events: {
            $get: (...args: unknown[]) => mockGet(...args),
            ":id": {
              $get: (...args: unknown[]) => mockEventDetailGet(...args),
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
let intersectionObserverCallback: IntersectionObserverCallback | null = null;

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
    search,
    ...props
  }: {
    children: React.ReactNode;
    to: string;
    params?: Record<string, string>;
    search?: Record<string, string>;
    className?: string;
    onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  }) => {
    const href = params?.eventId ? `/events/${params.eventId}` : to;
    const query = search ? new URLSearchParams(search).toString() : "";

    return (
      <a href={query ? `${href}?${query}` : href} {...props}>
        {children}
      </a>
    );
  },
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
  offset = 0,
  limit = PAGE_SIZE,
) {
  return {
    ok: true,
    json: () =>
      Promise.resolve({
        data: events,
        pagination: { total: total ?? events.length, limit, offset },
      }),
  };
}

function okJson(data: unknown) {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
  };
}

function stubDesktopMedia() {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query === "(min-width: 1024px)",
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

function stubIntersectionObserver() {
  intersectionObserverCallback = null;

  class MockIntersectionObserver implements IntersectionObserver {
    readonly root = null;
    readonly rootMargin = "";
    readonly thresholds = [];

    constructor(callback: IntersectionObserverCallback) {
      intersectionObserverCallback = callback;
    }

    disconnect() {}

    observe() {}

    takeRecords() {
      return [];
    }

    unobserve() {}
  }

  vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
}

function triggerIntersection(target: Element) {
  if (!intersectionObserverCallback) {
    throw new Error("IntersectionObserver callback was not registered");
  }

  intersectionObserverCallback(
    [
      {
        isIntersecting: true,
        target,
        boundingClientRect: {} as DOMRectReadOnly,
        intersectionRatio: 1,
        intersectionRect: {} as DOMRectReadOnly,
        rootBounds: null,
        time: Date.now(),
      } as IntersectionObserverEntry,
    ],
    {} as IntersectionObserver,
  );
}

function EventsHarness({
  initialFilters = DEFAULT_FILTERS,
  initialSelectedEventId,
}: {
  initialFilters?: typeof DEFAULT_FILTERS;
  initialSelectedEventId?: string;
}) {
  const [filters, setFilters] = useState(initialFilters);
  const [selectedEventId, setSelectedEventId] = useState(initialSelectedEventId);

  return (
    <BrowsePage
      browseType="EVENT"
      title="Events"
      filters={filters}
      selectedEventId={selectedEventId}
      onFilterChange={(key, value) => {
        setFilters((current) => ({ ...current, [key]: value }));
        setSelectedEventId(undefined);
      }}
      onClearFilters={() => {
        setFilters(DEFAULT_FILTERS);
        setSelectedEventId(undefined);
      }}
      onClearSelectedEvent={() => setSelectedEventId(undefined)}
      onSelectEvent={setSelectedEventId}
    />
  );
}

async function renderEventsPage(options?: {
  initialFilters?: typeof DEFAULT_FILTERS;
  initialSelectedEventId?: string;
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
  intersectionObserverCallback = null;
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("[phase:6] [regression:always] EventsRoute", () => {
  it("TC-PAGES-017: validates events URL state and primes the initial browse batch", async () => {
    await import("./index");

    if (!capturedValidateSearch || !capturedLoaderDeps || !capturedLoader) {
      throw new Error("Events route config was not captured");
    }

    const search = capturedValidateSearch({
      type: "GIG",
      status: "OPEN",
      source: "USER",
      category: " music ",
      selected: " evt_9 ",
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
      selected: "evt_9",
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
      selectedEventId: "evt_9",
      pageSize: PAGE_SIZE,
      page: 0,
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

  it("displays events in the listing layout", async () => {
    state.mockGet.mockResolvedValue(
      makeResponse([
        makeEvent({ id: "1", title: "Hackathon" }),
        makeEvent({ id: "2", title: "Jazz Night", category: "music" }),
      ]),
    );

    await renderEventsPage();

    expect(await screen.findByText("Hackathon")).toBeInTheDocument();
    expect(await screen.findByText("Jazz Night")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create event" })).toHaveAttribute(
      "href",
      "/events/new",
    );
  });

  it("shows empty state when no events match", async () => {
    state.mockGet.mockResolvedValue(makeResponse([]));

    await renderEventsPage();

    expect(await screen.findByText("No events found")).toBeInTheDocument();
  });

  it("renders event rows without a type badge", async () => {
    state.mockGet.mockResolvedValue(
      makeResponse([makeEvent({ id: "1", title: "Concert", status: "OPEN" })]),
    );

    await renderEventsPage();

    expect(await screen.findByText("Concert")).toBeInTheDocument();
    expect(screen.queryByText("EVENT")).not.toBeInTheDocument();
    expect(screen.getByText("Open")).toBeInTheDocument();
  });

  it("renders event row with location and date", async () => {
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

  it("TC-EVT-026: loads more events when the browse sentinel enters view", async () => {
    stubIntersectionObserver();
    const firstBatch = Array.from({ length: PAGE_SIZE }, (_, index) =>
      makeEvent({ id: `evt_${index}`, title: `Event ${index}` }),
    );
    const secondBatch = [makeEvent({ id: "evt_12", title: "Event 12" })];
    state.mockGet.mockImplementation(({ query }: { query: Record<string, string> }) => {
      const offset = Number(query.offset);

      if (offset === 0) {
        return Promise.resolve(makeResponse(firstBatch, PAGE_SIZE + 1, offset));
      }

      if (offset === PAGE_SIZE) {
        return Promise.resolve(makeResponse(secondBatch, PAGE_SIZE + 1, offset));
      }

      throw new Error(`Unexpected offset ${offset}`);
    });

    await renderEventsPage();

    expect(await screen.findByText("Event 0")).toBeInTheDocument();
    expect(screen.getByText("Scroll to load more")).toBeInTheDocument();
    expect(screen.queryByLabelText("Next page")).not.toBeInTheDocument();
    expect(screen.queryByText(/Showing \d/)).not.toBeInTheDocument();

    triggerIntersection(screen.getByText("Scroll to load more"));

    expect(await screen.findByText("Event 12")).toBeInTheDocument();
    await vi.waitFor(() => {
      const lastCall = state.mockGet.mock.calls.at(-1);
      expect(lastCall?.[0].query.offset).toBe(String(PAGE_SIZE));
    });
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

describe("[phase:6] [regression:always] EventsPage split view", () => {
  it("TC-EVT-024: selecting an event on desktop renders its details in the right pane", async () => {
    stubDesktopMedia();
    state.mockGet.mockResolvedValue(
      makeResponse([
        makeEvent({ id: "1", title: "Hackathon" }),
        makeEvent({ id: "2", title: "Jazz Night" }),
      ]),
    );
    state.mockEventDetailGet.mockResolvedValue(
      okJson(
        makeEvent({
          id: "1",
          title: "Hackathon",
          description:
            "### What to bring\n\n- Laptop\n- Charger",
          summary: "Build all night.",
        }),
      ),
    );

    await renderEventsPage();

    const user = userEvent.setup();
    await user.click(await screen.findByRole("link", { name: /Hackathon/i }));

    expect(
      await screen.findByRole("heading", { name: "What to bring" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Laptop")).toBeInTheDocument();
    expect(screen.queryByText("Listing details")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Open full page" }),
    ).not.toBeInTheDocument();
    expect(state.mockEventDetailGet).toHaveBeenCalledWith({
      param: { id: "1" },
    });
  });
});
