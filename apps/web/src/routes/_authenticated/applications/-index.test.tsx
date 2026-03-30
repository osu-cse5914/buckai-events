import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, beforeEach } from "vitest";

const mockApplicationsGet = vi.fn();
const mockApiClient = {
  api: {
    v1: {
      users: {
        me: {
          applications: {
            $get: (...args: unknown[]) => mockApplicationsGet(...args),
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
  if (!capturedComponent) {
    throw new Error("MyApplicationsPage component was not captured");
  }
  const Component = capturedComponent;
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <Component />
    </QueryClientProvider>,
  );
}

describe("[phase:2] [regression:always] MyApplicationsPage", () => {
  it("TC-APP-011: renders the current user's applications with status badges and links", async () => {
    mockApplicationsGet.mockResolvedValue(
      okJson({
        data: [
          {
            id: "app_1",
            status: "PENDING",
            message: "Happy to help",
            gig: {
              id: "gig_1",
              title: "Need a tutor",
              status: "OPEN",
              startAt: "2026-03-20T14:00:00.000Z",
              locationName: "Thompson Library",
            },
          },
          {
            id: "app_2",
            status: "ACCEPTED",
            message: null,
            gig: {
              id: "gig_2",
              title: "Research assistant",
              status: "OPEN",
              startAt: "2026-03-22T14:00:00.000Z",
              locationName: "Dreese Labs",
            },
          },
        ],
        pagination: { total: 2, limit: 20, offset: 0 },
      }),
    );

    await renderPage();

    expect(await screen.findByText("Need a tutor")).toBeInTheDocument();
    expect(screen.getByText("Happy to help")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getByText("Accepted")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Need a tutor" })).toHaveAttribute(
      "href",
      "/events/gig_1",
    );
  });
});
