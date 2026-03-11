import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock API
const mockEventGet = vi.fn();
const mockEventPatch = vi.fn();
const mockUserGet = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    api: {
      v1: {
        events: {
          ":id": {
            $get: (...args: unknown[]) => mockEventGet(...args),
            $patch: (...args: unknown[]) => mockEventPatch(...args),
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
    ...props
  }: {
    children: React.ReactNode;
    to: string;
  }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
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
    description: "A 24-hour hackathon",
    type: "EVENT",
    source: "USER",
    status: "OPEN",
    category: "tech",
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
  await import("./edit");
  if (!capturedComponent) throw new Error("Component not captured");
  const Component = capturedComponent;
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <Component />
    </QueryClientProvider>,
  );
}

describe("[phase:1] [regression:always] EventEditForm", () => {
  it("TC-EVT-019: form pre-filled with current event values", async () => {
    mockEventGet.mockResolvedValue(okJson(makeEvent()));
    mockUserGet.mockResolvedValue(okJson(mockCreatorUser));

    await renderPage();

    expect(await screen.findByDisplayValue("Hackathon")).toBeInTheDocument();
    expect(screen.getByDisplayValue("A 24-hour hackathon")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Ohio Union")).toBeInTheDocument();
  });

  it("TC-EVT-019: only creator can access edit page", async () => {
    mockEventGet.mockResolvedValue(okJson(makeEvent()));
    mockUserGet.mockResolvedValue(okJson(mockOtherUser));

    await renderPage();

    expect(
      await screen.findByText(/not authorized/i),
    ).toBeInTheDocument();
  });

  it("TC-EVT-019: external events cannot be edited", async () => {
    mockEventGet.mockResolvedValue(
      okJson(makeEvent({ source: "OSU_API", creatorId: "user_1" })),
    );
    mockUserGet.mockResolvedValue(okJson(mockCreatorUser));

    await renderPage();

    expect(
      await screen.findByRole("heading", { name: /cannot be edited/i }),
    ).toBeInTheDocument();
  });

  it("TC-EVT-019: submits to PATCH /api/v1/events/:id", async () => {
    const user = userEvent.setup();
    mockEventGet.mockResolvedValue(okJson(makeEvent()));
    mockUserGet.mockResolvedValue(okJson(mockCreatorUser));
    mockEventPatch.mockResolvedValue(
      okJson(makeEvent({ title: "Mega Hackathon" })),
    );

    await renderPage();

    const titleInput = await screen.findByDisplayValue("Hackathon");
    await user.clear(titleInput);
    await user.type(titleInput, "Mega Hackathon");

    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(mockEventPatch).toHaveBeenCalledOnce();
    });

    const call = mockEventPatch.mock.calls[0][0];
    expect(call.json.title).toBe("Mega Hackathon");
    expect(call.param.id).toBe("evt_1");
  });

  it("TC-EVT-019: redirects to detail page on success", async () => {
    const user = userEvent.setup();
    mockEventGet.mockResolvedValue(okJson(makeEvent()));
    mockUserGet.mockResolvedValue(okJson(mockCreatorUser));
    mockEventPatch.mockResolvedValue(okJson(makeEvent()));

    await renderPage();

    await screen.findByDisplayValue("Hackathon");
    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "/events/$eventId",
          params: { eventId: "evt_1" },
        }),
      );
    });
  });

  it("TC-EVT-019: shows error on failed submission", async () => {
    const user = userEvent.setup();
    mockEventGet.mockResolvedValue(okJson(makeEvent()));
    mockUserGet.mockResolvedValue(okJson(mockCreatorUser));
    mockEventPatch.mockResolvedValue({ ok: false, status: 400 });

    await renderPage();

    await screen.findByDisplayValue("Hackathon");
    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/failed to update event/i),
      ).toBeInTheDocument();
    });
  });

  it("TC-EVT-019: pre-fills compensation fields for GIG events", async () => {
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

    expect(await screen.findByDisplayValue("25")).toBeInTheDocument();
    const compTypeSelect = screen.getByLabelText("Compensation Type");
    expect(compTypeSelect).toHaveValue("HOURLY");
  });

  it("shows loading state while fetching event", async () => {
    mockEventGet.mockReturnValue(new Promise(() => {}));
    mockUserGet.mockReturnValue(new Promise(() => {}));

    await renderPage();

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
});
