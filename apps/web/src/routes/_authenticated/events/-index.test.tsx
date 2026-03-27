import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock api module
const mockGet = vi.fn();
const mockApiClient = {
  api: {
    v1: {
      events: {
        $get: (...args: unknown[]) => mockGet(...args),
      },
    },
  },
};
vi.mock("@/lib/api", () => ({
  api: mockApiClient,
  useApiClient: () => mockApiClient,
}));

// Mock TanStack Router — capture the component passed to createFileRoute
let capturedComponent: React.ComponentType | null = null;

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (config: { component: React.ComponentType }) => {
    capturedComponent = config.component;
    return { component: config.component };
  },
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

beforeEach(() => {
  vi.clearAllMocks();
  capturedComponent = null;
  vi.resetModules();
});

async function renderEventsPage() {
  await import("./index");
  if (!capturedComponent) {
    throw new Error("EventsPage component was not captured from createFileRoute");
  }
  const Component = capturedComponent;
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <Component />
    </QueryClientProvider>,
  );
}

describe("[phase:1] [regression:always] EventsPage", () => {
  it("shows loading skeletons while fetching", async () => {
    mockGet.mockReturnValue(new Promise(() => {}));

    await renderEventsPage();

    const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("displays events in card layout", async () => {
    const events = [
      makeEvent({ id: "1", title: "Hackathon" }),
      makeEvent({ id: "2", title: "Jazz Night", type: "GIG", category: "music" }),
    ];
    mockGet.mockResolvedValue(makeResponse(events));

    await renderEventsPage();

    expect(await screen.findByText("Hackathon")).toBeInTheDocument();
    expect(await screen.findByText("Jazz Night")).toBeInTheDocument();
  });

  it("shows empty state when no events match", async () => {
    mockGet.mockResolvedValue(makeResponse([]));

    await renderEventsPage();

    expect(await screen.findByText("No events found")).toBeInTheDocument();
  });

  it("renders event card with type and status badges", async () => {
    mockGet.mockResolvedValue(
      makeResponse([makeEvent({ id: "1", title: "Concert", type: "EVENT", status: "OPEN" })]),
    );

    await renderEventsPage();

    const card = (await screen.findByText("Concert")).closest('[data-slot="card"]') as HTMLElement;
    expect(within(card).getByText("EVENT")).toBeInTheDocument();
    expect(within(card).getByText("Open")).toBeInTheDocument();
  });

  it("renders event card with location and date", async () => {
    mockGet.mockResolvedValue(
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

  it("TC-EVT-018: event card title uses relaxed line height to prevent clamp clipping", async () => {
    const title =
      "Long title with descenders going past baseline and wrapping into another line";
    mockGet.mockResolvedValue(makeResponse([makeEvent({ id: "1", title })]));

    await renderEventsPage();

    const titleNode = await screen.findByText(title);
    expect(titleNode).toHaveClass("line-clamp-2");
    expect(titleNode).toHaveClass("leading-tight");
    expect(titleNode).toHaveClass("pb-0.5");
  });

  it("renders gig compensation", async () => {
    mockGet.mockResolvedValue(
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

    await renderEventsPage();

    expect(await screen.findByText("$25/hr")).toBeInTheDocument();
  });

  it("event cards link to detail page", async () => {
    mockGet.mockResolvedValue(
      makeResponse([makeEvent({ id: "evt_abc", title: "Study Group" })]),
    );

    await renderEventsPage();

    const link = await screen.findByText("Study Group");
    const anchor = link.closest("a");
    expect(anchor).toHaveAttribute("href", "/events/evt_abc");
  });

  it("shows creator name on event card", async () => {
    mockGet.mockResolvedValue(
      makeResponse([
        makeEvent({
          id: "1",
          title: "Event",
          creator: { id: "u1", displayName: "Bob Smith", email: "bob@osu.edu" },
        }),
      ]),
    );

    await renderEventsPage();

    expect(await screen.findByText("Bob Smith")).toBeInTheDocument();
  });

  it("passes filter params to API", async () => {
    mockGet.mockResolvedValue(makeResponse([]));
    const user = userEvent.setup();

    await renderEventsPage();
    await screen.findByText("No events found");

    // Find the first select trigger (type filter) and click to open
    const triggers = screen.getAllByRole("combobox");
    await user.click(triggers[0]);

    // Select "Event" from the dropdown
    const eventOption = await screen.findByRole("option", { name: "Event" });
    await user.click(eventOption);

    await vi.waitFor(() => {
      const calls = mockGet.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[0].query.type).toBe("EVENT");
    });
  });

  it("passes search text to API", async () => {
    mockGet.mockResolvedValue(makeResponse([]));
    const user = userEvent.setup();

    await renderEventsPage();
    await screen.findByText("No events found");

    const searchInput = screen.getByPlaceholderText("Search events...");
    await user.type(searchInput, "hackathon");

    await vi.waitFor(() => {
      const calls = mockGet.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[0].query.search).toBe("hackathon");
    });
  });

  it("shows pagination when total exceeds page size", async () => {
    const events = Array.from({ length: 12 }, (_, i) =>
      makeEvent({ id: `evt_${i}`, title: `Event ${i}` }),
    );
    mockGet.mockResolvedValue(makeResponse(events, 30));

    await renderEventsPage();

    await screen.findByText("Event 0");
    expect(screen.getByText(/Showing 1/)).toBeInTheDocument();
    expect(screen.getByText(/of 30/)).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "3" })).toBeInTheDocument();
  });

  it("does not show pagination for single page", async () => {
    mockGet.mockResolvedValue(
      makeResponse([makeEvent({ id: "1", title: "Solo Event" })], 1),
    );

    await renderEventsPage();
    await screen.findByText("Solo Event");

    expect(screen.queryByText(/Showing/)).not.toBeInTheDocument();
  });

  it("navigates to next page when clicking page button", async () => {
    const events = Array.from({ length: 12 }, (_, i) =>
      makeEvent({ id: `evt_${i}`, title: `Event ${i}` }),
    );
    mockGet.mockResolvedValue(makeResponse(events, 24));
    const user = userEvent.setup();

    await renderEventsPage();
    await screen.findByText("Event 0");

    await user.click(screen.getByRole("button", { name: "2" }));

    await vi.waitFor(() => {
      const calls = mockGet.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[0].query.offset).toBe("12");
    });
  });

  it("shows error state on fetch failure", async () => {
    mockGet.mockResolvedValue({ ok: false, status: 500 });

    await renderEventsPage();

    expect(await screen.findByText("Failed to fetch events")).toBeInTheDocument();
  });

  it("clear filters button resets all filters", async () => {
    mockGet.mockResolvedValue(makeResponse([]));
    const user = userEvent.setup();

    await renderEventsPage();
    await screen.findByText("No events found");

    // Open type select and pick "Gig"
    const triggers = screen.getAllByRole("combobox");
    await user.click(triggers[0]);
    const gigOption = await screen.findByRole("option", { name: "Gig" });
    await user.click(gigOption);

    const clearBtns = await screen.findAllByRole("button", { name: /Clear filters/ });
    await user.click(clearBtns[0]);

    // After clearing, the type trigger should show the placeholder
    const resetTriggers = screen.getAllByRole("combobox");
    expect(resetTriggers[0]).toHaveTextContent("All Types");
  });

  it("renders category on event card when present", async () => {
    mockGet.mockResolvedValue(
      makeResponse([makeEvent({ id: "1", title: "Concert", category: "music" })]),
    );

    await renderEventsPage();

    expect(await screen.findByText("music")).toBeInTheDocument();
  });
});
