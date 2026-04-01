import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockEventsPost = vi.fn();
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
    <button id={id} type="button" onClick={() => onChange(value)}>
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
  useNavigate: () => vi.fn(),
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
});
