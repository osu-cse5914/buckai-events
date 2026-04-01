import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock API
const mockEventGet = vi.fn();
const mockEventPatch = vi.fn();
const mockEventDelete = vi.fn();
const mockGigApplicationsGet = vi.fn();
const mockGigApplicationsPost = vi.fn();
const mockMyApplicationsGet = vi.fn();
const mockUserGet = vi.fn();
const mockApiClient = {
  api: {
    v1: {
      events: {
        ":id": {
          $get: (...args: unknown[]) => mockEventGet(...args),
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

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (config: { component: React.ComponentType }) => {
    capturedComponent = config.component;
    return {
      component: config.component,
      useParams: () => ({ eventId: "evt_1" }),
    };
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
  return {
    id: "evt_1",
    title: "Hackathon",
    description: "A 24-hour hackathon at Ohio Union",
    type: "EVENT",
    source: "USER",
    status: "OPEN",
    category: "tech",
    tags: ["coding", "hackathon"],
    imageUrl: null,
    ticketUrl: null,
    locationName: "Ohio Union",
    locationLatitude: null,
    locationLongitude: null,
    startAt: "2025-04-01T09:00:00.000Z",
    endAt: "2025-04-02T09:00:00.000Z",
    compensationAmount: null,
    compensationCurrency: "USD",
    compensationType: null,
    summary: "A hackathon event",
    creatorId: "user_1",
    createdAt: "2025-03-01T00:00:00.000Z",
    updatedAt: "2025-03-01T00:00:00.000Z",
    creator: { id: "user_1", displayName: "Alice", email: "alice@osu.edu" },
    ...overrides,
  };
}

const mockCreatorUser = { id: "user_1", email: "alice@osu.edu" };
const mockOtherUser = { id: "user_2", email: "bob@osu.edu" };

function okJson(data: unknown) {
  return { ok: true, status: 200, json: () => Promise.resolve(data) };
}

beforeEach(() => {
  vi.clearAllMocks();
  capturedComponent = null;
  mockMyApplicationsGet.mockResolvedValue(
    okJson({ data: [], pagination: { total: 0, limit: 20, offset: 0 } }),
  );
  vi.resetModules();
});

async function renderPage() {
  await import("./index");
  if (!capturedComponent) throw new Error("Component not captured");
  const Component = capturedComponent;
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <Component />
    </QueryClientProvider>,
  );
}

describe("[phase:1] [regression:always] EventDetailPage", () => {
  it("shows loading state while fetching event", async () => {
    mockEventGet.mockReturnValue(new Promise(() => {}));
    mockUserGet.mockReturnValue(new Promise(() => {}));

    await renderPage();

    const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

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

  it("TC-EVT-019: displays tags when present", async () => {
    mockEventGet.mockResolvedValue(okJson(makeEvent()));
    mockUserGet.mockResolvedValue(okJson(mockCreatorUser));

    await renderPage();

    expect(await screen.findByText("coding")).toBeInTheDocument();
    expect(screen.getByText("hackathon")).toBeInTheDocument();
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
