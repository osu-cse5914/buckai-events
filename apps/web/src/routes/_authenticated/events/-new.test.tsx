import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockEventsPost = vi.fn();
const mockNavigate = vi.fn();
const mockApiClient = {
  api: {
    v1: {
      events: {
        $post: (...args: unknown[]) => mockEventsPost(...args),
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
      onClick={() =>
        onChange(
          value ??
            new Date(
              id === "endAt"
                ? "2026-04-01T14:00:00.000Z"
                : "2026-04-01T12:00:00.000Z",
            ),
        )
      }
    >
      {value ? value.toISOString() : placeholder}
    </button>
  ),
}));

let capturedComponent: React.ComponentType | null = null;
let capturedValidateSearch:
  | ((search: Record<string, unknown>) => Record<string, unknown>)
  | null = null;
let routeSearch: Record<string, unknown> = {};

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () =>
    (config: {
      validateSearch?: (search: Record<string, unknown>) => Record<string, unknown>;
      component: React.ComponentType;
    }) => {
      capturedComponent = config.component;
      capturedValidateSearch = config.validateSearch ?? null;

      return {
        component: config.component,
        useSearch: () => routeSearch,
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
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

async function renderCreationPage(search: Record<string, unknown> = {}) {
  routeSearch = search;
  await import("./new");

  if (!capturedComponent) {
    throw new Error("EventCreationPage component was not captured");
  }

  const Component = capturedComponent;
  const queryClient = createQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <Component />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  capturedComponent = null;
  capturedValidateSearch = null;
  routeSearch = {};
  vi.resetModules();
});

describe("[phase:6] [regression:always] EventCreationPage", () => {
  it("TC-EVT-017: submits a valid event and navigates to the new detail page", async () => {
    const user = userEvent.setup();
    mockEventsPost.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: "evt_created_1" }),
    });

    await renderCreationPage();

    await user.type(screen.getByLabelText("Title"), "Campus Hack Night");
    await user.type(
      screen.getByLabelText("Description"),
      "Build with classmates all evening.",
    );
    await user.type(screen.getByLabelText("Location"), "Ohio Union");
    await user.click(screen.getByRole("button", { name: "Start Date" }));
    await user.click(screen.getByRole("button", { name: "End Date" }));
    await user.click(screen.getByRole("button", { name: "Create Event" }));

    await waitFor(() => {
      expect(mockEventsPost).toHaveBeenCalledWith({
        json: {
          title: "Campus Hack Night",
          description: "Build with classmates all evening.",
          type: "EVENT",
          location: { name: "Ohio Union" },
          startAt: "2026-04-01T12:00:00.000Z",
          endAt: "2026-04-01T14:00:00.000Z",
        },
      });
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/events/$eventId",
        params: { eventId: "evt_created_1" },
      });
    });
  });

  it("TC-EVT-029: hides the type selector and fixes gig creation from route state", async () => {
    await renderCreationPage({ type: "GIG" });

    expect(
      await screen.findByRole("heading", { name: "Create Gig" }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Type")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Amount ($)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create Gig" })).toBeInTheDocument();
  });

  it("validates the optional create-type route search", async () => {
    await import("./new");

    if (!capturedValidateSearch) {
      throw new Error("validateSearch was not captured");
    }

    expect(capturedValidateSearch({ type: "GIG" })).toEqual({ type: "GIG" });
    expect(capturedValidateSearch({ type: "NOPE" })).toEqual({ type: undefined });
  });

  it("shows a validation message when required fields are missing", async () => {
    const user = userEvent.setup();

    await renderCreationPage();
    await user.type(screen.getByLabelText("Title"), "Campus Hack Night");
    await user.type(
      screen.getByLabelText("Description"),
      "Build with classmates all evening.",
    );
    await user.type(screen.getByLabelText("Location"), "Ohio Union");
    await user.click(screen.getByRole("button", { name: "Create Event" }));

    expect(
      await screen.findByText("Please fill in all required fields."),
    ).toBeInTheDocument();
    expect(mockEventsPost).not.toHaveBeenCalled();
  });
});
