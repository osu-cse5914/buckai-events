import { useState } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BrowsePage } from "@/components/events/browse-page";
import { PAGE_SIZE } from "@/lib/queries";
import { buildEventRecord } from "@/test/factories";

const state = vi.hoisted(() => {
  const mockGet = vi.fn();
  const mockEventDetailGet = vi.fn();
  const mockUserGet = vi.fn();
  const mockInteractionsPost = vi.fn();
  return {
    mockGet,
    mockEventDetailGet,
    mockUserGet,
    mockInteractionsPost,
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
          users: {
            me: {
              $get: (...args: unknown[]) => mockUserGet(...args),
            },
          },
          interactions: {
            $post: (...args: unknown[]) => mockInteractionsPost(...args),
          },
          collections: {
            $get: vi.fn().mockResolvedValue({
              ok: true,
              status: 200,
              json: () => Promise.resolve([]),
            }),
            $post: vi.fn(),
            ":id": {
              items: {
                $post: vi.fn(),
              },
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

const authState = vi.hoisted(() => ({ isSignedIn: true }));

vi.mock("@clerk/clerk-react", () => ({
  useAuth: () => authState,
}));

vi.mock("@/lib/route-loaders", () => ({
  loadEventsRouteData: (...args: unknown[]) => state.loadEventsRouteDataMock(...args),
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
let intersectionObserverCallback: IntersectionObserverCallback | null = null;

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
      component?: React.ComponentType;
    }) => {
      if (path === "/_app/events/") {
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
  statusMode: "ACTIVE",
  source: "",
  sort: "START_ASC",
};

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
}

function makeEvent(overrides: Record<string, unknown> = {}) {
  return buildEventRecord({
    title: "Concert",
    description: "A test event",
    category: "music",
    startAt: "2025-04-01T09:00:00.000Z",
    createdAt: "2025-03-01T00:00:00.000Z",
    updatedAt: "2025-03-01T00:00:00.000Z",
    creator: { id: "user_1", displayName: "Alice", email: "alice@osu.edu" },
    ...overrides,
  });
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

function okJson(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
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
  authState.isSignedIn = true;
  capturedValidateSearch = null;
  capturedLoaderDeps = null;
  capturedLoader = null;
  intersectionObserverCallback = null;
  state.mockUserGet.mockResolvedValue(okJson({ id: "user_2", email: "bob@osu.edu" }));
  state.mockInteractionsPost.mockResolvedValue(okJson({}, 201));
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
      statusMode: "COMPLETED",
      source: "USER",
      selected: " evt_9 ",
      sort: "START_DESC",
      page: "2",
    });
    const deps = capturedLoaderDeps({ search });

    await capturedLoader({
      context: { api: mockApiClient, queryClient: {} },
      deps,
    });

    expect(search).toEqual({
      statusMode: "COMPLETED",
      source: "USER",
      selected: "evt_9",
      sort: "START_DESC",
    });
    expect(state.loadEventsRouteDataMock).toHaveBeenCalledWith({
      api: mockApiClient,
      queryClient: {},
      filters: {
        type: "EVENT",
        statusMode: "COMPLETED",
        source: "USER",
        sort: "START_DESC",
      },
      selectedEventId: "evt_9",
      pageSize: PAGE_SIZE,
      page: 0,
    });
  });

  it("TC-EVT-031: defaults events browse to active status and soonest-first ordering", async () => {
    await import("./index");

    if (!capturedValidateSearch || !capturedLoaderDeps || !capturedLoader) {
      throw new Error("Events route config was not captured");
    }

    const search = capturedValidateSearch({});
    const deps = capturedLoaderDeps({ search });

    await capturedLoader({
      context: { api: mockApiClient, queryClient: {} },
      deps,
    });

    expect(search).toEqual({});
    expect(state.loadEventsRouteDataMock).toHaveBeenCalledWith({
      api: mockApiClient,
      queryClient: {},
      filters: {
        type: "EVENT",
        statusMode: "ACTIVE",
        source: undefined,
        sort: "START_ASC",
      },
      selectedEventId: undefined,
      pageSize: PAGE_SIZE,
      page: 0,
    });
  });
});

describe("[phase:6] [regression:always] EventsPage attribution", () => {
  it("TC-EVT-033: shows an external source label in event browse results", async () => {
    state.mockGet.mockResolvedValue(
      makeResponse([
        makeEvent({
          id: "evt_osu",
          title: "Student Org Fair",
          source: "OSU_API",
          creatorId: null,
          creator: undefined,
        }),
      ]),
    );

    await renderEventsPage();

    const row = await screen.findByRole("article", {
      name: "Student Org Fair listing",
    });
    expect(within(row).getByText(/Event .* OSU .* Music/)).toBeInTheDocument();
    expect(within(row).queryByText("Unknown")).not.toBeInTheDocument();
  });

  it("TC-PAGES-034: signed-out users can browse the first page but must sign in to load more", async () => {
    authState.isSignedIn = false;
    state.mockGet.mockResolvedValue(
      makeResponse([makeEvent({ id: "evt_1", title: "Hackathon" })], PAGE_SIZE + 1),
    );

    await renderEventsPage();

    expect(await screen.findByText("Hackathon")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in to load more" })).toHaveAttribute(
      "href",
      "/sign-in",
    );
  });

  it("TC-EVT-034: falls back to creator email in event browse results", async () => {
    state.mockGet.mockResolvedValue(
      makeResponse([
        makeEvent({
          id: "evt_email",
          title: "Hack Night",
          creator: {
            id: "user_1",
            displayName: null,
            email: "alice@osu.edu",
          },
        }),
      ]),
    );

    await renderEventsPage();

    const row = await screen.findByRole("article", { name: "Hack Night listing" });
    expect(within(row).getByText(/Event .* User .* Music/)).toBeInTheDocument();
    expect(within(row).queryByText("Unknown")).not.toBeInTheDocument();
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

  it("renders open event rows without a type badge or open badge, and keeps the save action", async () => {
    state.mockGet.mockResolvedValue(
      makeResponse([makeEvent({ id: "1", title: "Concert", status: "OPEN" })]),
    );

    await renderEventsPage();

    const row = await screen.findByRole("article", { name: "Concert listing" });

    expect(within(row).getByText("Concert")).toBeInTheDocument();
    expect(screen.queryByText("EVENT")).not.toBeInTheDocument();
    expect(within(row).queryByText("Open")).not.toBeInTheDocument();
    expect(within(row).getByRole("button", { name: "Save to collection" })).toBeInTheDocument();
  });

  it("renders a closed badge for closed event rows", async () => {
    state.mockGet.mockResolvedValue(
      makeResponse([makeEvent({ id: "1", title: "Concert", status: "COMPLETED" })]),
    );

    await renderEventsPage();

    const row = await screen.findByRole("article", { name: "Concert listing" });
    expect(within(row).getByText(/Event .* User .* Music .* Ended/)).toBeInTheDocument();
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
    await user.click(await screen.findByRole("option", { name: "Completed" }));
    await user.click(screen.getByRole("button", { name: "Sort by latest first" }));

    await vi.waitFor(() => {
      const lastCall = state.mockGet.mock.calls.at(-1);
      expect(lastCall?.[0].query.type).toBe("EVENT");
      expect(lastCall?.[0].query.statusMode).toBe("COMPLETED");
      expect(lastCall?.[0].query.sort).toBe("START_DESC");
      expect(lastCall?.[0].query.offset).toBe("0");
    });
  });

  it("keeps the sort action after the other browse filters", async () => {
    state.mockGet.mockResolvedValue(makeResponse([]));

    await renderEventsPage();
    await screen.findByText("No events found");

    const [statusTrigger, sourceTrigger] = screen.getAllByRole("combobox");
    const sortButton = screen.getByRole("button", {
      name: "Sort by latest first",
    });

    expect(
      statusTrigger.compareDocumentPosition(sourceTrigger) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      sourceTrigger.compareDocumentPosition(sortButton) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("does not render a type filter or keyword input", async () => {
    state.mockGet.mockResolvedValue(makeResponse([]));

    await renderEventsPage();
    await screen.findByText("No events found");

    expect(screen.getAllByRole("combobox")).toHaveLength(2);
    expect(screen.queryByPlaceholderText("Search events...")).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Category")).not.toBeInTheDocument();
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

  it("TC-EVT-028: deduplicates overlapping events across loaded browse batches", async () => {
    stubIntersectionObserver();
    const firstBatch = Array.from({ length: PAGE_SIZE }, (_, index) =>
      makeEvent({ id: `evt_${index}`, title: `Event ${index}` }),
    );
    const secondBatch = [
      makeEvent({ id: `evt_${PAGE_SIZE - 1}`, title: `Event ${PAGE_SIZE - 1}` }),
      makeEvent({ id: `evt_${PAGE_SIZE}`, title: `Event ${PAGE_SIZE}` }),
    ];

    state.mockGet.mockImplementation(({ query }: { query: Record<string, string> }) => {
      const offset = Number(query.offset);

      if (offset === 0) {
        return Promise.resolve(makeResponse(firstBatch, PAGE_SIZE + 2, offset));
      }

      if (offset === PAGE_SIZE) {
        return Promise.resolve(makeResponse(secondBatch, PAGE_SIZE + 2, offset));
      }

      throw new Error(`Unexpected offset ${offset}`);
    });

    await renderEventsPage();

    expect(await screen.findByText(`Event ${PAGE_SIZE - 1}`)).toBeInTheDocument();

    triggerIntersection(screen.getByText("Scroll to load more"));

    expect(await screen.findByText(`Event ${PAGE_SIZE}`)).toBeInTheDocument();
    expect(screen.getAllByText(`Event ${PAGE_SIZE - 1}`)).toHaveLength(1);
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
    expect(resetTriggers[0]).toHaveTextContent("Active");
    expect(screen.getByRole("button", { name: "Sort by latest first" })).toBeInTheDocument();
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
          description: "### What to bring\n\n- Laptop\n- Charger",
          summary: "Build all night.",
        }),
      ),
    );

    await renderEventsPage();

    const user = userEvent.setup();
    await user.click(await screen.findByRole("link", { name: /Hackathon/i }));

    expect(await screen.findByRole("heading", { name: "What to bring" })).toBeInTheDocument();
    expect(screen.getByText("Laptop")).toBeInTheDocument();
    expect(screen.queryByText("EVENT")).not.toBeInTheDocument();
    expect(screen.queryByText("Listing details")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Open full page" })).not.toBeInTheDocument();
    expect(state.mockEventDetailGet).toHaveBeenCalledWith({
      param: { id: "1" },
    });
  });

  it("TC-INT-006: selecting an event on desktop records a VIEW interaction", async () => {
    stubDesktopMedia();
    state.mockGet.mockResolvedValue(
      makeResponse([
        makeEvent({ id: "1", title: "Hackathon" }),
        makeEvent({ id: "2", title: "Jazz Night" }),
      ]),
    );
    state.mockEventDetailGet.mockResolvedValue(okJson(makeEvent({ id: "1", title: "Hackathon" })));

    await renderEventsPage();

    const user = userEvent.setup();
    await user.click(await screen.findByRole("link", { name: /Hackathon/i }));

    await screen.findByText("A test event");
    await vi.waitFor(() => {
      expect(state.mockInteractionsPost).toHaveBeenCalledWith({
        json: { eventId: "1", action: "VIEW" },
      });
    });
  });
});
