import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, beforeEach } from "vitest";

const mockUsersMeGet = vi.fn();
const mockEventsGet = vi.fn();
const mockApiClient = {
  api: {
    v1: {
      users: {
        me: {
          $get: (...args: unknown[]) => mockUsersMeGet(...args),
        },
      },
      events: {
        $get: (...args: unknown[]) => mockEventsGet(...args),
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
    <a href={params?.eventId ? `/events/${params.eventId}` : to} {...props}>
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
  return { ok: true, json: () => Promise.resolve(data) };
}

beforeEach(() => {
  vi.clearAllMocks();
  capturedComponent = null;
  vi.resetModules();
});

async function renderYouEventsPage() {
  await import("./index");
  if (!capturedComponent) {
    throw new Error("YouEventsPage component was not captured");
  }
  const Component = capturedComponent;
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <Component />
    </QueryClientProvider>,
  );
}

describe("[phase:6] [regression:always] YouEventsPage", () => {
  it("TC-PAGES-014: requests only the current user's events", async () => {
    mockUsersMeGet.mockResolvedValue(okJson({ id: "user_me" }));
    mockEventsGet.mockResolvedValue(
      okJson({
        data: [],
        pagination: { total: 0, limit: 12, offset: 0 },
      }),
    );

    await renderYouEventsPage();
    await screen.findByText("You have not created any listings yet");

    expect(mockEventsGet).toHaveBeenCalledWith({
      query: {
        limit: "12",
        offset: "0",
        user: "user_me",
      },
    });
  });
});
