import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock API
const mockEventGet = vi.fn();
const mockEventPatch = vi.fn();
const mockEventDelete = vi.fn();
const mockUserGet = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    api: {
      v1: {
        events: {
          ":id": {
            $get: (...args: unknown[]) => mockEventGet(...args),
            $patch: (...args: unknown[]) => mockEventPatch(...args),
            $delete: (...args: unknown[]) => mockEventDelete(...args),
          },
        },
        users: {
          me: {
            $get: (...args: unknown[]) => mockUserGet(...args),
          },
        },
      },
    },
  },
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
    if (params?.eventId) href = `/events/${params.eventId}/edit`;
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
    expect(screen.getByLabelText(/change status/i)).toBeInTheDocument();
  });

  it("TC-EVT-019: non-creators do not see creator actions", async () => {
    mockEventGet.mockResolvedValue(okJson(makeEvent({ creatorId: "user_1" })));
    mockUserGet.mockResolvedValue(okJson(mockOtherUser));

    await renderPage();

    await screen.findByText("Hackathon");
    expect(screen.queryByRole("link", { name: /edit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/change status/i)).not.toBeInTheDocument();
  });

  it("TC-EVT-019: status change shows valid transitions for OPEN event", async () => {
    mockEventGet.mockResolvedValue(okJson(makeEvent({ status: "OPEN" })));
    mockUserGet.mockResolvedValue(okJson(mockCreatorUser));

    await renderPage();
    await screen.findByText("Hackathon");

    const statusSelect = screen.getByLabelText(/change status/i);
    const options = Array.from(statusSelect.querySelectorAll("option"))
      .map((o) => (o as HTMLOptionElement).value)
      .filter((v) => v !== "");
    expect(options).toContain("IN_PROGRESS");
    expect(options).toContain("CANCELLED");
    expect(options).not.toContain("COMPLETED");
  });

  it("TC-EVT-019: status change shows valid transitions for IN_PROGRESS event", async () => {
    mockEventGet.mockResolvedValue(okJson(makeEvent({ status: "IN_PROGRESS" })));
    mockUserGet.mockResolvedValue(okJson(mockCreatorUser));

    await renderPage();
    await screen.findByText("Hackathon");

    const statusSelect = screen.getByLabelText(/change status/i);
    const options = Array.from(statusSelect.querySelectorAll("option"))
      .map((o) => (o as HTMLOptionElement).value)
      .filter((v) => v !== "");
    expect(options).toContain("COMPLETED");
    expect(options).not.toContain("IN_PROGRESS");
    expect(options).not.toContain("CANCELLED");
  });

  it("TC-EVT-019: no status change for COMPLETED events", async () => {
    mockEventGet.mockResolvedValue(okJson(makeEvent({ status: "COMPLETED" })));
    mockUserGet.mockResolvedValue(okJson(mockCreatorUser));

    await renderPage();
    await screen.findByText("Hackathon");

    expect(screen.queryByLabelText(/change status/i)).not.toBeInTheDocument();
  });

  it("TC-EVT-019: delete requires confirmation dialog", async () => {
    mockEventGet.mockResolvedValue(okJson(makeEvent()));
    mockUserGet.mockResolvedValue(okJson(mockCreatorUser));
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    const user = userEvent.setup();

    await renderPage();
    await screen.findByText("Hackathon");

    await user.click(screen.getByRole("button", { name: /delete/i }));

    expect(confirmSpy).toHaveBeenCalled();
    expect(mockEventDelete).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it("TC-EVT-019: delete navigates to events list on success", async () => {
    mockEventGet.mockResolvedValue(okJson(makeEvent()));
    mockUserGet.mockResolvedValue(okJson(mockCreatorUser));
    mockEventDelete.mockResolvedValue(okJson({ message: "Event deleted" }));
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();

    await renderPage();
    await screen.findByText("Hackathon");

    await user.click(screen.getByRole("button", { name: /delete/i }));

    await vi.waitFor(() => {
      expect(mockEventDelete).toHaveBeenCalled();
    });
    await vi.waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        expect.objectContaining({ to: "/events" }),
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
