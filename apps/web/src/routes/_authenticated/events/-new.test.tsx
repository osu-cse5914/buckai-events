import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock API
const mockPost = vi.fn();
const mockApiClient = {
  api: {
    v1: {
      events: {
        $post: (...args: unknown[]) => mockPost(...args),
      },
    },
  },
};

vi.mock("@/lib/api", () => ({
  api: mockApiClient,
  useApiClient: () => mockApiClient,
}));

vi.mock("@/components/ui/date-time-picker", () => ({
  DateTimePicker: ({
    value,
    onChange,
    placeholder,
    id,
  }: {
    value?: Date;
    onChange: (date: Date | undefined) => void;
    placeholder?: string;
    id?: string;
  }) => (
    <button
      id={id}
      type="button"
      onClick={() => onChange(new Date("2026-03-20T14:00:00.000Z"))}
    >
      {value ? value.toISOString() : placeholder}
    </button>
  ),
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
    expect(screen.getByText("Type")).toBeInTheDocument();
    expect(screen.getByLabelText(/location/i)).toBeInTheDocument();
    // Start date label exists (DateTimePicker renders a button, not an input)
    const labels = screen.getAllByText(/start date/i);
    expect(labels.length).toBeGreaterThan(0);
  });

  it("TC-EVT-017: endAt is optional", async () => {
    await renderPage();

    // DateTimePicker renders as a button, not a required input
    const endDateBtn = screen.getByText("Pick end date & time");
    expect(endDateBtn).toBeInTheDocument();
  });

  it("TC-EVT-017: compensation fields shown for GIG type", async () => {
    const user = userEvent.setup();
    await renderPage();

    // Initially no compensation fields
    expect(screen.queryByLabelText(/amount/i)).not.toBeInTheDocument();

    // Open the Type select and pick GIG
    const typeTrigger = screen.getByRole("combobox");
    await user.click(typeTrigger);
    await user.click(await screen.findByRole("option", { name: "Gig" }));

    // Compensation fields should appear
    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
    expect(screen.getByText("Compensation Type")).toBeInTheDocument();
  });

  it("TC-EVT-017: compensation fields hidden for EVENT type", async () => {
    const user = userEvent.setup();
    await renderPage();

    // Select GIG to show compensation fields
    const typeTrigger = screen.getByRole("combobox");
    await user.click(typeTrigger);
    await user.click(await screen.findByRole("option", { name: "Gig" }));
    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();

    // Switch back to EVENT — the type trigger now shows "Gig"
    const triggers = screen.getAllByRole("combobox");
    await user.click(triggers[0]); // Type combobox (first one)
    await user.click(await screen.findByRole("option", { name: "Event" }));
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

    await user.click(screen.getByText("Pick start date & time"));

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

    await user.click(screen.getByText("Pick start date & time"));

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

    // Open DateTimePicker and select a date
    await user.click(screen.getByText("Pick start date & time"));
    const today = new Date();
    const todayBtn = document.querySelector(
      `[data-day="${today.toLocaleDateString()}"]`,
    );
    if (todayBtn) await user.click(todayBtn as HTMLElement);

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

    // Open Type select and pick GIG
    const typeTrigger = screen.getByRole("combobox");
    await user.click(typeTrigger);
    await user.click(await screen.findByRole("option", { name: "Gig" }));

    await user.type(screen.getByLabelText(/location/i), "Thompson Library");

    // Open DateTimePicker and select a date
    await user.click(screen.getByText("Pick start date & time"));
    const today = new Date();
    const todayBtn = document.querySelector(
      `[data-day="${today.toLocaleDateString()}"]`,
    );
    if (todayBtn) await user.click(todayBtn as HTMLElement);

    await user.type(screen.getByLabelText(/amount/i), "25");

    // Open Compensation Type select and pick HOURLY
    const compTriggers = screen.getAllByRole("combobox");
    const compTrigger = compTriggers[compTriggers.length - 1];
    await user.click(compTrigger);
    await user.click(await screen.findByRole("option", { name: "Hourly" }));

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
