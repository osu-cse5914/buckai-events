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
) {
  return {
    ok: true,
    json: () =>
      Promise.resolve({
        data: gigs,
        pagination: { total: total ?? gigs.length, limit: 12, offset: 0 },
      }),
  };
}

function GigsHarness({
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
      browseType="GIG"
      title="Gigs"
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

async function renderGigsPage(options?: {
  initialFilters?: typeof DEFAULT_FILTERS;
  initialPage?: number;
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
  vi.resetModules();
});

describe("[phase:6] [regression:always] GigsRoute", () => {
  it("validates gigs URL state and primes loader data with fixed GIG type", async () => {
    await import("./index");

    if (!capturedValidateSearch || !capturedLoaderDeps || !capturedLoader) {
      throw new Error("Gigs route config was not captured");
    }

    const search = capturedValidateSearch({
      type: "EVENT",
      status: "OPEN",
      source: "USER",
      category: " tutoring ",
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
      page: 3,
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
      page: 2,
    });
  });
});

describe("[phase:1] [regression:always] GigsPage", () => {
  it("shows gig-specific copy", async () => {
    state.mockGet.mockResolvedValue(makeResponse([]));

    await renderGigsPage();

    expect(await screen.findByRole("heading", { name: "Gigs" })).toBeInTheDocument();
    expect(await screen.findByText("No gigs found")).toBeInTheDocument();
  });

  it("renders gig cards without a type badge and keeps compensation", async () => {
    state.mockGet.mockResolvedValue(
      makeResponse([makeGig({ id: "1", title: "Tutoring" })]),
    );

    await renderGigsPage();

    const card = (await screen.findByText("Tutoring")).closest('[data-slot="card"]') as HTMLElement;
    expect(within(card).queryByText("GIG")).not.toBeInTheDocument();
    expect(within(card).getByText("Open")).toBeInTheDocument();
    expect(within(card).getByText("$25/hr")).toBeInTheDocument();
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
