import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  buildCurrentUser,
  buildEventRecord,
  buildOwnedCollectionSummary,
  buildPaginatedResponse,
} from "@/test/factories";

// Mock API
const mockEventGet = vi.fn();
const mockRelatedEventsGet = vi.fn();
const mockEventPatch = vi.fn();
const mockEventDelete = vi.fn();
const mockGigApplicationsGet = vi.fn();
const mockGigApplicationsPost = vi.fn();
const mockMyApplicationsGet = vi.fn();
const mockUserGet = vi.fn();
const mockInteractionsPost = vi.fn();
const mockCollectionsGet = vi.fn();
const mockCollectionsPost = vi.fn();
const mockCollectionItemPost = vi.fn();
const mockApiClient = {
  api: {
    v1: {
      events: {
        ":id": {
          $get: (...args: unknown[]) => mockEventGet(...args),
          related: {
            $get: (...args: unknown[]) => mockRelatedEventsGet(...args),
          },
          $patch: (...args: unknown[]) => mockEventPatch(...args),
          $delete: (...args: unknown[]) => mockEventDelete(...args),
        },
      },
      gigs: {
        ":gigId": {
          applications: {
            $get: (...args: unknown[]) => mockGigApplicationsGet(...args),
            $post: (...args: unknown[]) => mockGigApplicationsPost(...args),
          },
        },
      },
      users: {
        me: {
          $get: (...args: unknown[]) => mockUserGet(...args),
          applications: {
            $get: (...args: unknown[]) => mockMyApplicationsGet(...args),
          },
        },
      },
      interactions: {
        $post: (...args: unknown[]) => mockInteractionsPost(...args),
      },
      collections: {
        $get: (...args: unknown[]) => mockCollectionsGet(...args),
        $post: (...args: unknown[]) => mockCollectionsPost(...args),
        ":id": {
          items: {
            $post: (...args: unknown[]) => mockCollectionItemPost(...args),
          },
        },
      },
    },
  },
};

vi.mock("@/lib/api", () => ({
  api: mockApiClient,
  useApiClient: () => mockApiClient,
}));

// Mock TanStack Router
let capturedComponent: React.ComponentType | null = null;
const mockNavigate = vi.fn();
let mockRouteSearch: Record<string, unknown> = {};

vi.mock("@tanstack/react-router", () => ({
  createFileRoute:
    () =>
    (config: {
      component: React.ComponentType;
      validateSearch?: (search: Record<string, unknown>) => Record<string, unknown>;
    }) => {
    capturedComponent = config.component;
    return {
      component: config.component,
      useParams: () => ({ eventId: "evt_1" }),
      useSearch: () => mockRouteSearch,
    };
  },
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
    className?: string;
  }) => {
    let href = to;
    if (params?.id) href = `/users/${params.id}`;
    if (params?.eventId && to === "/events/$eventId/edit") {
      href = `/events/${params.eventId}/edit`;
    }
    if (params?.eventId && to === "/events/$eventId/applications") {
      href = `/events/${params.eventId}/applications`;
    }
    if (params?.eventId && to === "/events/$eventId") {
      href = `/events/${params.eventId}`;
    }
    if (search) {
      const query = new URLSearchParams(
        Object.entries(search).flatMap(([key, value]) =>
          value == null ? [] : [[key, String(value)]],
        ),
      ).toString();
      if (query) {
        href = `${href}?${query}`;
      }
    }
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  },
  useNavigate: () => mockNavigate,
}));

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

function makeEvent(overrides: Record<string, unknown> = {}) {
  return buildEventRecord({
    title: "Hackathon",
    description: "A 24-hour hackathon at Ohio Union",
    category: "tech",
    tags: ["coding", "hackathon"],
    startAt: "2025-04-01T09:00:00.000Z",
    endAt: "2025-04-02T09:00:00.000Z",
    summary: "A hackathon event",
    createdAt: "2025-03-01T00:00:00.000Z",
    updatedAt: "2025-03-01T00:00:00.000Z",
    creator: { id: "user_1", displayName: "Alice", email: "alice@osu.edu" },
    ...overrides,
  });
}

const mockCreatorUser = buildCurrentUser({ id: "user_1", email: "alice@osu.edu" });
const mockOtherUser = buildCurrentUser({ id: "user_2", email: "bob@osu.edu" });

function okJson(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  capturedComponent = null;
  mockRouteSearch = {};
  mockMyApplicationsGet.mockResolvedValue(
    okJson(buildPaginatedResponse([], { pagination: { total: 0, limit: 20, offset: 0 } })),
  );
  mockInteractionsPost.mockResolvedValue(okJson({}, 201));
  mockRelatedEventsGet.mockResolvedValue(
    okJson(buildPaginatedResponse([], { pagination: { total: 0, limit: 3, offset: 0 } })),
  );
  mockCollectionsGet.mockResolvedValue(okJson([]));
  mockCollectionsPost.mockResolvedValue(okJson({}, 201));
  mockCollectionItemPost.mockResolvedValue(okJson({}, 201));
  vi.resetModules();
});

async function renderPage() {
  await import("./index");
  if (!capturedComponent) throw new Error("Component not captured");
  const Component = capturedComponent;
  const queryClient = createQueryClient();
  const view = render(
    <QueryClientProvider client={queryClient}>
      <Component />
    </QueryClientProvider>,
  );
  return { queryClient, ...view };
}

async function renderDetailSurface(
  props: React.ComponentProps<
    typeof import("@/components/events/event-detail-surface").EventDetailSurface
  >,
) {
  const { EventDetailSurface } = await import(
    "@/components/events/event-detail-surface"
  );
  const queryClient = createQueryClient();
  const view = render(
    <QueryClientProvider client={queryClient}>
      <EventDetailSurface {...props} />
    </QueryClientProvider>,
  );
  return { queryClient, ...view };
}

describe("[phase:1] [regression:always] EventDetailPage", () => {
  it("shows loading state while fetching event", async () => {
    mockEventGet.mockReturnValue(new Promise(() => {}));
    mockUserGet.mockReturnValue(new Promise(() => {}));

    await renderPage();

    const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  }, 15000);

  it("TC-EVT-019: displays all event fields", async () => {
    mockEventGet.mockResolvedValue(okJson(makeEvent()));
    mockUserGet.mockResolvedValue(okJson(mockCreatorUser));

    await renderPage();

    expect(await screen.findByText("Hackathon")).toBeInTheDocument();
    expect(screen.getByText("A 24-hour hackathon at Ohio Union")).toBeInTheDocument();
    expect(screen.getByText("EVENT")).toBeInTheDocument();
    expect(screen.getByText("Open")).toBeInTheDocument();
    expect(screen.getByText("Ohio Union")).toBeInTheDocument();
    expect(screen.getAllByText(/Apr/).length).toBeGreaterThan(0);
    expect(screen.getByText("tech")).toBeInTheDocument();
    expect(screen.getByText("A hackathon event")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("TC-PAGES-022: uses the preserved search results as the back destination", async () => {
    mockRouteSearch = {
      returnTo: "search",
      q: "hackathon",
      type: "EVENT",
      category: "music",
      page: 3,
    };
    mockEventGet.mockResolvedValue(okJson(makeEvent()));
    mockUserGet.mockResolvedValue(okJson(mockCreatorUser));

    await renderPage();

    expect(
      await screen.findByRole("link", { name: "Back to Search results" }),
    ).toHaveAttribute(
      "href",
      "/search?q=hackathon&type=EVENT&category=music&page=3",
    );
  });

  it("TC-EVT-042: uses the previous event as the back destination when arriving from a related event", async () => {
    mockRouteSearch = {
      returnTo: "search",
      q: "hackathon",
      type: "EVENT",
      category: "music",
      page: 3,
      previousEventId: "evt_prev",
      previousEventTitle: "Campus Jazz Night",
    };
    mockEventGet.mockResolvedValue(okJson(makeEvent({ title: "Late Night Jam Session" })));
    mockUserGet.mockResolvedValue(okJson(mockCreatorUser));

    await renderPage();

    expect(
      await screen.findByRole("link", { name: "Back to Campus Jazz Night" }),
    ).toHaveAttribute(
      "href",
      "/events/evt_prev?returnTo=search&q=hackathon&type=EVENT&category=music&page=3",
    );
  });

  it("TC-EVT-043: uses preserved browse state as the back destination when returning to a selected list item", async () => {
    mockRouteSearch = {
      returnTo: "browse",
      browseType: "EVENT",
      statusMode: "ACTIVE",
      source: "USER",
      sort: "START_ASC",
      selected: "evt_prev",
    };
    mockEventGet.mockResolvedValue(okJson(makeEvent()));
    mockUserGet.mockResolvedValue(okJson(mockCreatorUser));

    await renderPage();

    expect(await screen.findByRole("link", { name: "Back to Events" })).toHaveAttribute(
      "href",
      "/events?statusMode=ACTIVE&source=USER&sort=START_ASC&selected=evt_prev",
    );
  });

  it("TC-EVT-027: renders markdown formatting in the event description", async () => {
    mockEventGet.mockResolvedValue(
      okJson(
        makeEvent({
          description:
            "## Schedule\r\n\r\n- **Build overnight**\r\n- Demo in the morning\r\n\r\nVisit [docs](https://example.com)\r\nNext line",
        }),
      ),
    );
    mockUserGet.mockResolvedValue(okJson(mockCreatorUser));

    const view = await renderPage();

    expect(
      await screen.findByRole("heading", { name: "Schedule" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Build overnight", { selector: "strong" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "docs" }),
    ).toHaveAttribute("href", "https://example.com");
    expect(view.container.querySelector("br")).not.toBeNull();
    expect(view.container.textContent).toContain("Next line");
  });

  it("TC-EVT-038: shows a Ticketmaster fallback link when the description is blank", async () => {
    mockEventGet.mockResolvedValue(
      okJson(
        makeEvent({
          title: "Jim Breuer",
          source: "TICKETMASTER",
          description: "",
          summary: null,
          ticketUrl: "https://www.ticketmaster.com/event/tm_67890",
          creatorId: null,
          creator: undefined,
        }),
      ),
    );
    mockUserGet.mockResolvedValue(okJson(mockOtherUser));

    await renderPage();

    expect(await screen.findByText("Jim Breuer")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "View on Ticketmaster" }),
    ).toHaveAttribute("href", "https://www.ticketmaster.com/event/tm_67890");
  });

  it("TC-EVT-039: appends a Ticketmaster link to non-empty Ticketmaster descriptions", async () => {
    mockEventGet.mockResolvedValue(
      okJson(
        makeEvent({
          title: "Miss Saigon",
          source: "TICKETMASTER",
          description: "The celebrated musical returns to Columbus.",
          summary: null,
          ticketUrl: "https://www.ticketmaster.com/event/tm_miss_saigon",
          creatorId: null,
          creator: undefined,
        }),
      ),
    );
    mockUserGet.mockResolvedValue(okJson(mockOtherUser));

    await renderPage();

    expect(await screen.findByText("Miss Saigon")).toBeInTheDocument();
    expect(
      screen.getByText("The celebrated musical returns to Columbus."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "View on Ticketmaster" }),
    ).toHaveAttribute(
      "href",
      "https://www.ticketmaster.com/event/tm_miss_saigon",
    );
  });

  it("TC-EVT-019: displays tags when present", async () => {
    mockEventGet.mockResolvedValue(okJson(makeEvent()));
    mockUserGet.mockResolvedValue(okJson(mockCreatorUser));

    await renderPage();

    expect(await screen.findByText("coding")).toBeInTheDocument();
    expect(screen.getByText("hackathon")).toBeInTheDocument();
  });

  it("TC-EVT-040: strips leading hash prefixes from displayed tags", async () => {
    mockEventGet.mockResolvedValue(
      okJson(
        makeEvent({
          tags: ["#coding", "hackathon", "##music"],
        }),
      ),
    );
    mockUserGet.mockResolvedValue(okJson(mockCreatorUser));

    await renderPage();

    expect(await screen.findByText("coding")).toBeInTheDocument();
    expect(screen.getByText("hackathon")).toBeInTheDocument();
    expect(screen.getByText("music")).toBeInTheDocument();
    expect(screen.queryByText("#coding")).not.toBeInTheDocument();
    expect(screen.queryByText("##music")).not.toBeInTheDocument();
  });

  it("TC-EVT-041: shows related events below tags when vector matches are available", async () => {
    mockRouteSearch = {
      returnTo: "search",
      q: "hackathon",
      type: "EVENT",
      category: "music",
      page: 3,
    };
    mockEventGet.mockResolvedValue(okJson(makeEvent()));
    mockRelatedEventsGet.mockResolvedValue(
      okJson(
        buildPaginatedResponse(
          [
            makeEvent({
              id: "evt_related_1",
              title: "Late Night Jam Session",
              summary: "An improv set with student musicians.",
              locationName: "Ohio Union",
              startAt: "2025-04-04T21:00:00.000Z",
            }),
            makeEvent({
              id: "evt_related_2",
              title: "Campus Open Mic",
              summary: "Bring a song or poem for the stage.",
              locationName: "Thompson Library",
              startAt: "2025-04-06T19:00:00.000Z",
            }),
          ],
          { pagination: { total: 2, limit: 3, offset: 0 } },
        ),
      ),
    );
    mockUserGet.mockResolvedValue(okJson(mockCreatorUser));

    await renderPage();

    expect(
      await screen.findByRole("heading", { name: "You might also be interested in" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Late Night Jam Session/i }),
    ).toHaveAttribute(
      "href",
      "/events/evt_related_1?returnTo=search&q=hackathon&type=EVENT&category=music&page=3&previousEventId=evt_1&previousEventTitle=Hackathon",
    );
    expect(screen.getByText("Campus Open Mic")).toBeInTheDocument();
  });

  it("TC-EVT-044: related event links from browse preview preserve the selected listing context", async () => {
    mockEventGet.mockResolvedValue(okJson(makeEvent()));
    mockRelatedEventsGet.mockResolvedValue(
      okJson(
        buildPaginatedResponse(
          [
            makeEvent({
              id: "evt_related_1",
              title: "Late Night Jam Session",
            }),
          ],
          { pagination: { total: 1, limit: 3, offset: 0 } },
        ),
      ),
    );
    mockUserGet.mockResolvedValue(okJson(mockCreatorUser));

    await renderDetailSurface({
      eventId: "evt_1",
      mode: "panel",
      browsePath: "/events",
      browseLabel: "Events",
      browseSearch: {
        statusMode: "ACTIVE",
        source: "USER",
        sort: "START_ASC",
        selected: "evt_1",
      },
    });

    expect(
      await screen.findByRole("link", { name: /Late Night Jam Session/i }),
    ).toHaveAttribute(
      "href",
      "/events/evt_related_1?statusMode=ACTIVE&source=USER&sort=START_ASC&selected=evt_1&returnTo=browse&browseType=EVENT",
    );
  });

  it("TC-EVT-019: links to creator public profile", async () => {
    mockEventGet.mockResolvedValue(okJson(makeEvent()));
    mockUserGet.mockResolvedValue(okJson(mockCreatorUser));

    await renderPage();

    const creatorLink = await screen.findByRole("link", { name: "Alice" });
    expect(creatorLink).toHaveAttribute("href", "/users/user_1");
  });

  it("TC-EVT-019: shows compensation for GIG events", async () => {
    mockEventGet.mockResolvedValue(
      okJson(
        makeEvent({
          type: "GIG",
          compensationAmount: 25,
          compensationType: "HOURLY",
        }),
      ),
    );
    mockUserGet.mockResolvedValue(okJson(mockCreatorUser));

    await renderPage();

    expect(await screen.findByText(/\$25/)).toBeInTheDocument();
    expect(screen.getByText(/per hour/i)).toBeInTheDocument();
  });

  it("TC-INT-005: records a VIEW when the detail page loads and does not duplicate it on refetch", async () => {
    mockEventGet.mockResolvedValue(okJson(makeEvent()));
    mockUserGet.mockResolvedValue(okJson(mockOtherUser));

    const { queryClient } = await renderPage();

    await screen.findByText("Hackathon");
    await vi.waitFor(() => {
      expect(mockInteractionsPost).toHaveBeenCalledWith({
        json: { eventId: "evt_1", action: "VIEW" },
      });
    });

    mockInteractionsPost.mockClear();

    await queryClient.invalidateQueries({ queryKey: ["event", "evt_1"] });

    await vi.waitFor(() => {
      expect(mockEventGet).toHaveBeenCalledTimes(2);
    });
    expect(mockInteractionsPost).not.toHaveBeenCalled();
  });

  it("TC-COL-015: detail surface lets the user save to an existing collection", async () => {
    mockEventGet.mockResolvedValue(okJson(makeEvent()));
    mockUserGet.mockResolvedValue(okJson(mockOtherUser));
    mockCollectionsGet.mockResolvedValue(
      okJson([
        buildOwnedCollectionSummary({
          id: "col_1",
          userId: "user_2",
          name: "Favorites",
          createdAt: "2025-03-01T00:00:00.000Z",
          updatedAt: "2025-03-02T00:00:00.000Z",
          _count: { items: 2 },
        }),
      ]),
    );

    const user = userEvent.setup();

    await renderPage();
    await screen.findByText("Hackathon");

    await user.click(screen.getByRole("button", { name: "Save to collection" }));
    await user.click(await screen.findByRole("button", { name: /Favorites/i }));

    await vi.waitFor(() => {
      expect(mockCollectionItemPost).toHaveBeenCalledWith({
        param: { id: "col_1" },
        json: { eventId: "evt_1" },
      });
    });
    expect(
      screen.getByRole("button", { name: "Saved to Favorites" }),
    ).toBeInTheDocument();
  });

  it("TC-INT-007: clicking the ticket CTA records CLICK", async () => {
    mockEventGet.mockResolvedValue(
      okJson(
        makeEvent({
          ticketUrl: "https://tickets.example.com/hackathon",
        }),
      ),
    );
    mockUserGet.mockResolvedValue(okJson(mockOtherUser));
    const user = userEvent.setup();

    await renderPage();

    const ticketLink = await screen.findByRole("link", { name: "Get tickets" });
    await vi.waitFor(() => {
      expect(mockInteractionsPost).toHaveBeenCalledWith({
        json: { eventId: "evt_1", action: "VIEW" },
      });
    });

    mockInteractionsPost.mockClear();

    await user.click(ticketLink);

    expect(ticketLink).toHaveAttribute(
      "href",
      "https://tickets.example.com/hackathon",
    );
    await vi.waitFor(() => {
      expect(mockInteractionsPost).toHaveBeenCalledWith({
        json: { eventId: "evt_1", action: "CLICK" },
      });
    });
  });

  it("TC-EVT-019: creator sees Edit, Delete, and Status change actions", async () => {
    mockEventGet.mockResolvedValue(okJson(makeEvent({ creatorId: "user_1" })));
    mockUserGet.mockResolvedValue(okJson(mockCreatorUser));

    await renderPage();

    expect(await screen.findByRole("link", { name: /edit/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument();
    expect(screen.getByText("Change status...")).toBeInTheDocument();
  });

  it("TC-EVT-019: non-creators do not see creator actions", async () => {
    mockEventGet.mockResolvedValue(okJson(makeEvent({ creatorId: "user_1" })));
    mockUserGet.mockResolvedValue(okJson(mockOtherUser));
    mockGigApplicationsGet.mockResolvedValue(
      okJson({ data: [], pagination: { total: 0, limit: 20, offset: 0 } }),
    );

    await renderPage();

    await screen.findByText("Hackathon");
    expect(screen.queryByRole("link", { name: /edit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument();
    expect(screen.queryByText("Change status...")).not.toBeInTheDocument();
  });

  it("TC-EVT-019: status change shows valid transitions for OPEN event", async () => {
    mockEventGet.mockResolvedValue(okJson(makeEvent({ status: "OPEN" })));
    mockUserGet.mockResolvedValue(okJson(mockCreatorUser));
    const user = userEvent.setup();

    await renderPage();
    await screen.findByText("Hackathon");

    // Click the trigger button (not the inner span with pointer-events:none)
    const statusTrigger = screen.getByText("Change status...").closest("button")!;
    await user.click(statusTrigger);

    // Check the available options
    expect(await screen.findByRole("option", { name: "In Progress" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Cancelled" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Completed" })).not.toBeInTheDocument();
  });

  it("TC-EVT-019: status change shows valid transitions for IN_PROGRESS event", async () => {
    mockEventGet.mockResolvedValue(okJson(makeEvent({ status: "IN_PROGRESS" })));
    mockUserGet.mockResolvedValue(okJson(mockCreatorUser));
    const user = userEvent.setup();

    await renderPage();
    await screen.findByText("Hackathon");

    const statusTrigger = screen.getByText("Change status...").closest("button")!;
    await user.click(statusTrigger);

    expect(await screen.findByRole("option", { name: "Completed" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "In Progress" })).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Cancelled" })).not.toBeInTheDocument();
  });

  it("TC-EVT-019: no status change for COMPLETED events", async () => {
    mockEventGet.mockResolvedValue(okJson(makeEvent({ status: "COMPLETED" })));
    mockUserGet.mockResolvedValue(okJson(mockCreatorUser));

    await renderPage();
    await screen.findByText("Hackathon");

    expect(screen.queryByText("Change status...")).not.toBeInTheDocument();
  });

  it("TC-EVT-019: delete requires confirmation dialog", async () => {
    mockEventGet.mockResolvedValue(okJson(makeEvent()));
    mockUserGet.mockResolvedValue(okJson(mockCreatorUser));
    const user = userEvent.setup();

    await renderPage();
    await screen.findByText("Hackathon");

    // Click delete — opens AlertDialog
    await user.click(screen.getByRole("button", { name: /delete/i }));

    // AlertDialog should be visible
    expect(await screen.findByText("Delete event")).toBeInTheDocument();
    expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument();

    // Click Cancel in the dialog
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(mockEventDelete).not.toHaveBeenCalled();
  });

  it("TC-EVT-019: delete navigates to events list on success", async () => {
    mockEventGet.mockResolvedValue(okJson(makeEvent()));
    mockUserGet.mockResolvedValue(okJson(mockCreatorUser));
    mockEventDelete.mockResolvedValue(okJson({ message: "Event deleted" }));
    const user = userEvent.setup();

    await renderPage();
    await screen.findByText("Hackathon");

    // Click delete — opens AlertDialog
    await user.click(screen.getByRole("button", { name: /delete/i }));

    // Click "Delete" in the confirmation dialog
    const dialogDeleteBtn = await screen.findByRole("button", { name: "Delete" });
    await user.click(dialogDeleteBtn);

    await vi.waitFor(() => {
      expect(mockEventDelete).toHaveBeenCalled();
    });
    await vi.waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        expect.objectContaining({ to: "/events" }),
      );
    });
  });

  it("TC-EVT-019: delete navigates to gigs list for gig records", async () => {
    mockEventGet.mockResolvedValue(okJson(makeEvent({ type: "GIG" })));
    mockUserGet.mockResolvedValue(okJson(mockCreatorUser));
    mockEventDelete.mockResolvedValue(okJson({ message: "Event deleted" }));
    const user = userEvent.setup();

    await renderPage();
    await screen.findByText("Hackathon");

    await user.click(screen.getByRole("button", { name: /delete/i }));
    await user.click(await screen.findByRole("button", { name: "Delete" }));

    await vi.waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        expect.objectContaining({ to: "/gigs" }),
      );
    });
  });

  it("shows 404 page for nonexistent events", async () => {
    mockEventGet.mockResolvedValue({ ok: false, status: 404 });
    mockUserGet.mockResolvedValue(okJson(mockCreatorUser));

    await renderPage();

    expect(await screen.findByText(/not found/i)).toBeInTheDocument();
  });

  it("shows error state on fetch failure", async () => {
    mockEventGet.mockResolvedValue({ ok: false, status: 500 });
    mockUserGet.mockResolvedValue(okJson(mockCreatorUser));

    await renderPage();

    expect(
      await screen.findByText(/failed to load event/i),
    ).toBeInTheDocument();
  });
});
