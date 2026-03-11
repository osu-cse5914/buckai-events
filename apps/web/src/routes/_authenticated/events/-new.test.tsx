import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock API
const mockPost = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    api: {
      v1: {
        events: {
          $post: (...args: unknown[]) => mockPost(...args),
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
    return { component: config.component };
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

beforeEach(() => {
  vi.clearAllMocks();
  capturedComponent = null;
  vi.resetModules();
});

async function renderPage() {
  await import("./new");
  if (!capturedComponent) throw new Error("Component not captured");
  const Component = capturedComponent;
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <Component />
    </QueryClientProvider>,
  );
}

describe("[phase:1] [regression:always] EventCreationForm", () => {
  it("TC-EVT-017: form includes all required fields", async () => {
    await renderPage();

    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Type")).toBeInTheDocument();
    expect(screen.getByLabelText(/location/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
  });

  it("TC-EVT-017: endAt is optional", async () => {
    await renderPage();

    const endDateInput = screen.getByLabelText(/end date/i);
    expect(endDateInput).toBeInTheDocument();
    expect(endDateInput).not.toBeRequired();
  });

  it("TC-EVT-017: compensation fields shown for GIG type", async () => {
    const user = userEvent.setup();
    await renderPage();

    // Initially no compensation fields
    expect(screen.queryByLabelText(/amount/i)).not.toBeInTheDocument();

    // Select GIG type
    await user.selectOptions(screen.getByLabelText("Type"), "GIG");

    // Compensation fields should appear
    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/compensation type/i)).toBeInTheDocument();
  });

  it("TC-EVT-017: compensation fields hidden for EVENT type", async () => {
    const user = userEvent.setup();
    await renderPage();

    // Select GIG to show compensation fields
    await user.selectOptions(screen.getByLabelText("Type"), "GIG");
    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();

    // Switch back to EVENT
    await user.selectOptions(screen.getByLabelText("Type"), "EVENT");
    expect(screen.queryByLabelText(/amount/i)).not.toBeInTheDocument();
  });

  it("TC-EVT-017: validates required fields on submit", async () => {
    const user = userEvent.setup();
    await renderPage();

    // Submit without filling required fields
    await user.click(screen.getByRole("button", { name: /create/i }));

    // Should not call API
    expect(mockPost).not.toHaveBeenCalled();
  });

  it("TC-EVT-017: submits to POST /api/v1/events", async () => {
    const user = userEvent.setup();
    mockPost.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: "evt_new" }),
    });

    await renderPage();

    await user.type(screen.getByLabelText(/title/i), "Hackathon");
    await user.type(
      screen.getByLabelText(/description/i),
      "24hr hackathon event",
    );
    await user.type(screen.getByLabelText(/location/i), "Ohio Union");

    const startDateInput = screen.getByLabelText(/start date/i);
    await user.clear(startDateInput);
    await user.type(startDateInput, "2025-04-01T09:00");

    await user.click(screen.getByRole("button", { name: /create/i }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledOnce();
    });

    const call = mockPost.mock.calls[0][0];
    expect(call.json.title).toBe("Hackathon");
    expect(call.json.description).toBe("24hr hackathon event");
    expect(call.json.type).toBe("EVENT");
    expect(call.json.location.name).toBe("Ohio Union");
  });

  it("TC-EVT-017: redirects to created event on success", async () => {
    const user = userEvent.setup();
    mockPost.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: "evt_new" }),
    });

    await renderPage();

    await user.type(screen.getByLabelText(/title/i), "Hackathon");
    await user.type(
      screen.getByLabelText(/description/i),
      "24hr hackathon event",
    );
    await user.type(screen.getByLabelText(/location/i), "Ohio Union");

    const startDateInput = screen.getByLabelText(/start date/i);
    await user.clear(startDateInput);
    await user.type(startDateInput, "2025-04-01T09:00");

    await user.click(screen.getByRole("button", { name: /create/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "/events/$eventId",
          params: { eventId: "evt_new" },
        }),
      );
    });
  });

  it("TC-EVT-017: shows error on failed submission", async () => {
    const user = userEvent.setup();
    mockPost.mockResolvedValue({ ok: false, status: 400 });

    await renderPage();

    await user.type(screen.getByLabelText(/title/i), "Hackathon");
    await user.type(
      screen.getByLabelText(/description/i),
      "24hr hackathon event",
    );
    await user.type(screen.getByLabelText(/location/i), "Ohio Union");

    const startDateInput = screen.getByLabelText(/start date/i);
    await user.clear(startDateInput);
    await user.type(startDateInput, "2025-04-01T09:00");

    await user.click(screen.getByRole("button", { name: /create/i }));

    await waitFor(() => {
      expect(screen.getByText(/failed to create event/i)).toBeInTheDocument();
    });
  });

  it("TC-EVT-017: submits gig with compensation", async () => {
    const user = userEvent.setup();
    mockPost.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: "evt_gig" }),
    });

    await renderPage();

    await user.type(screen.getByLabelText(/title/i), "Need a Tutor");
    await user.type(
      screen.getByLabelText(/description/i),
      "Calculus tutor needed",
    );
    await user.selectOptions(screen.getByLabelText("Type"), "GIG");
    await user.type(screen.getByLabelText(/location/i), "Thompson Library");

    const startDateInput = screen.getByLabelText(/start date/i);
    await user.clear(startDateInput);
    await user.type(startDateInput, "2025-04-05T14:00");

    await user.type(screen.getByLabelText(/amount/i), "25");
    await user.selectOptions(
      screen.getByLabelText(/compensation type/i),
      "HOURLY",
    );

    await user.click(screen.getByRole("button", { name: /create/i }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledOnce();
    });

    const call = mockPost.mock.calls[0][0];
    expect(call.json.type).toBe("GIG");
    expect(call.json.compensation.amount).toBe(25);
    expect(call.json.compensation.type).toBe("HOURLY");
  });
});
