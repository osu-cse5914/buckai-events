import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, beforeEach } from "vitest";

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

let capturedComponent: React.ComponentType | null = null;
const state = vi.hoisted(() => ({
  routeSearch: {} as { q?: string },
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (config: { component: React.ComponentType }) => {
    capturedComponent = config.component;
    return {
      component: config.component,
      useSearch: () => state.routeSearch,
    };
  },
  Link: ({
    children,
    to,
    params,
    search,
    ...props
  }: {
    children: React.ReactNode;
    to: string;
    params?: Record<string, string>;
    search?: Record<string, string | undefined>;
  }) => {
    const href = params?.eventId
      ? `/events/${params.eventId}`
      : search?.prompt
        ? `${to}?prompt=${encodeURIComponent(search.prompt)}`
        : to;
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  },
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

function makeResponse(data: unknown[] = []) {
  return okJson({
    data,
    pagination: { total: data.length, limit: 12, offset: 0 },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  capturedComponent = null;
  state.routeSearch = {};
  vi.resetModules();
});

async function renderSearchPage() {
  await import("./index");
  if (!capturedComponent) {
    throw new Error("SearchPage component was not captured");
  }

  const Component = capturedComponent;
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <Component />
    </QueryClientProvider>,
  );
}

describe("[phase:6] [regression:always] SearchPage", () => {
  it("TC-PAGES-012: passes search text to the events API", async () => {
    state.routeSearch = { q: "hackathon" };
    mockGet.mockResolvedValue(makeResponse([]));

    await renderSearchPage();

    await vi.waitFor(() => {
      const lastCall = mockGet.mock.calls.at(-1);
      expect(lastCall?.[0].query.search).toBe("hackathon");
    });
  });

  it("TC-PAGES-013: renders the AI handoff link with the current prompt", async () => {
    state.routeSearch = { q: "music" };
    mockGet.mockResolvedValue(makeResponse([]));

    await renderSearchPage();

    const aiLink = screen.getByRole("link", { name: /ask ai/i });
    expect(aiLink).toHaveAttribute("href", "/ai?prompt=music");
  });
});
