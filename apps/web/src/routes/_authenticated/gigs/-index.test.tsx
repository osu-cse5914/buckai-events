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
      if (path === "/_authenticated/gigs/") {
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

function makeGig(overrides: Record<string, unknown> = {}) {
  return {
    id: "gig_1",
    title: "Campus Tutor",
    description: "A test gig",
    type: "GIG",
    source: "USER",
    status: "OPEN",
    category: "education",
    tags: [],
    imageUrl: null,
    ticketUrl: null,
    locationName: "Thompson Library",
    locationLatitude: null,
    locationLongitude: null,
    startAt: "2025-04-01T09:00:00.000Z",
    endAt: null,
    compensationAmount: 25,
    compensationCurrency: "USD",
    compensationType: "HOURLY",
    summary: null,
    creatorId: "user_1",
    createdAt: "2025-03-01T00:00:00.000Z",
    updatedAt: "2025-03-01T00:00:00.000Z",
    creator: { id: "user_1", displayName: "Alice", email: "alice@osu.edu" },
    ...overrides,
  };
}

function makeResponse(
  gigs: ReturnType<typeof makeGig>[] = [],
  total?: number,
  offset = 0,
  limit = PAGE_SIZE,
) {
  return {
    ok: true,
    json: () =>
      Promise.resolve({
        data: gigs,
        pagination: { total: total ?? gigs.length, limit, offset },
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

function GigsHarness({
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
      browseType="GIG"
      title="Gigs"
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

async function renderGigsPage(options?: {
  initialFilters?: typeof DEFAULT_FILTERS;
  initialSelectedEventId?: string;
}) {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <GigsHarness {...options} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  capturedValidateSearch = null;
  capturedLoaderDeps = null;
  capturedLoader = null;
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("[phase:6] [regression:always] GigsRoute", () => {
  it("TC-PAGES-017: validates gigs URL state and primes the initial browse batch with fixed GIG type", async () => {
    await import("./index");

    if (!capturedValidateSearch || !capturedLoaderDeps || !capturedLoader) {
      throw new Error("Gigs route config was not captured");
    }

    const search = capturedValidateSearch({
      type: "EVENT",
      status: "OPEN",
      source: "USER",
      category: " tutoring ",
      selected: " gig_1 ",
      page: "3",
    });
    const deps = capturedLoaderDeps({ search });

    await capturedLoader({
      context: { api: mockApiClient, queryClient: {} },
      deps,
    });

    expect(search).toEqual({
      status: "OPEN",
      source: "USER",
      category: "tutoring",
      selected: "gig_1",
    });
    expect(state.loadEventsRouteDataMock).toHaveBeenCalledWith({
      api: mockApiClient,
      queryClient: {},
      filters: {
        type: "GIG",
        status: "OPEN",
        source: "USER",
        category: "tutoring",
      },
      selectedEventId: "gig_1",
      pageSize: PAGE_SIZE,
      page: 0,
    });
  });
});

describe("[phase:1] [regression:always] GigsPage", () => {
  it("shows gig-specific copy", async () => {
    state.mockGet.mockResolvedValue(makeResponse([]));

    await renderGigsPage();

    expect(await screen.findByRole("heading", { name: "Gigs" })).toBeInTheDocument();
    expect(await screen.findByText("No gigs found")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create gig" })).toHaveAttribute(
      "href",
      "/events/new?type=GIG",
    );
  });

  it("renders gig rows without a type badge and keeps compensation", async () => {
    state.mockGet.mockResolvedValue(
      makeResponse([makeGig({ id: "1", title: "Tutoring" })]),
    );

    await renderGigsPage();

    expect(await screen.findByText("Tutoring")).toBeInTheDocument();
    expect(screen.queryByText("GIG")).not.toBeInTheDocument();
    expect(screen.getByText("Open")).toBeInTheDocument();
    expect(screen.getByText("$25/hr")).toBeInTheDocument();
  });

  it("passes fixed gig type and source filters to API", async () => {
    state.mockGet.mockResolvedValue(makeResponse([]));
    const user = userEvent.setup();

    await renderGigsPage();
    await screen.findByText("No gigs found");

    const triggers = screen.getAllByRole("combobox");
    expect(triggers).toHaveLength(2);
    await user.click(triggers[1]);
    await user.click(await screen.findByRole("option", { name: "OSU" }));

    await vi.waitFor(() => {
      const lastCall = state.mockGet.mock.calls.at(-1);
      expect(lastCall?.[0].query.type).toBe("GIG");
      expect(lastCall?.[0].query.source).toBe("OSU_API");
    });
  });
});

describe("[phase:6] [regression:always] GigsPage split view", () => {
  it("TC-EVT-025: selecting a gig on desktop renders its details in the right pane", async () => {
    stubDesktopMedia();
    state.mockGet.mockResolvedValue(
      makeResponse([
        makeGig({ id: "1", title: "Tutoring" }),
        makeGig({ id: "2", title: "Stage Crew" }),
      ]),
    );
    state.mockEventDetailGet.mockResolvedValue(
      okJson(
        makeGig({
          id: "1",
          title: "Tutoring",
          description: "Bring calculus and linear algebra experience.",
          summary: "Help with exams.",
        }),
      ),
    );

    await renderGigsPage();

    const user = userEvent.setup();
    await user.click(await screen.findByRole("link", { name: /Tutoring/i }));

    expect(
      await screen.findByText("Bring calculus and linear algebra experience."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Listing details")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Open full page" }),
    ).not.toBeInTheDocument();
    expect(state.mockEventDetailGet).toHaveBeenCalledWith({
      param: { id: "1" },
    });
  });
});
