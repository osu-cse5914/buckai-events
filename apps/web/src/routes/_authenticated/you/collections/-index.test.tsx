import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

let capturedComponent: React.ComponentType | null = null;
const mockCollectionsGet = vi.fn();
const mockApiClient = {
  api: {
    v1: {
      collections: {
        $get: (...args: unknown[]) => mockCollectionsGet(...args),
      },
    },
  },
};

vi.mock("@/lib/api", () => ({
  api: mockApiClient,
  useApiClient: () => mockApiClient,
}));

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
}));

beforeEach(() => {
  capturedComponent = null;
  vi.clearAllMocks();
  vi.resetModules();
});

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function okJson(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  } as Response;
}

async function renderCollectionsPage() {
  mockCollectionsGet.mockResolvedValue(okJson([]));
  await import("./index");
  if (!capturedComponent) {
    throw new Error("YouCollectionsPage component was not captured");
  }

  const Component = capturedComponent;
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <Component />
    </QueryClientProvider>,
  );
}

describe("[phase:6] [regression:always] YouCollectionsPage", () => {
  it("TC-PAGES-019: shows navigation across the You workspace tabs", async () => {
    await renderCollectionsPage();

    expect(await screen.findByRole("heading", { name: "Collections" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Applications" })).toHaveAttribute(
      "href",
      "/you/applications",
    );
    expect(screen.getByRole("link", { name: "Events" })).toHaveAttribute(
      "href",
      "/you/events",
    );
    expect(screen.getByRole("link", { name: "Collections" })).toHaveAttribute(
      "href",
      "/you/collections",
    );
  });
});
