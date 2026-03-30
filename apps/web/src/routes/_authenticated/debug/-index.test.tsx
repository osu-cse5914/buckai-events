import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { navLinks } from "@/routes/_authenticated";

// Mock the api module before importing the component
const mockHealthGet = vi.fn();
const mockUsersMeGet = vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ id: "db_user_abc123" }),
});
const mockApiClient = {
  api: {
    health: {
      $get: (...args: unknown[]) => mockHealthGet(...args),
    },
    v1: {
      users: {
        me: {
          $get: (...args: unknown[]) => mockUsersMeGet(...args),
        },
      },
    },
  },
};

vi.mock("@/lib/api", () => ({
  api: mockApiClient,
  useApiClient: () => mockApiClient,
}));

// Mock Clerk
vi.mock("@clerk/clerk-react", () => ({
  useAuth: () => ({
    userId: "user_test123",
    sessionId: "sess_test123",
    orgId: null,
  }),
  useUser: () => ({
    user: {
      fullName: "Test User",
      primaryEmailAddress: { emailAddress: "test@osu.edu" },
      createdAt: new Date("2026-01-01"),
      lastSignInAt: new Date("2026-03-11"),
    },
  }),
}));

// Mock TanStack Router
const mockNavigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => () => ({}),
  useNavigate: () => mockNavigate,
}));

// Import after mocks are set up
const { DebugPage } = await import("./index");

describe("[phase:1] [regression:always] Debug Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("TC-DBG-001: keeps debug out of the primary navigation model", () => {
    expect(navLinks.map((link) => link.label)).toEqual([
      "Featured",
      "Catalog",
      "You",
    ]);
  });

  // --- TC-DBG-002: Debug page renders heading and tool buttons ---
  it("TC-DBG-002: renders debug page heading and tool sections", () => {
    render(<DebugPage />);

    expect(screen.getByText("Debug Tools")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View API Health" })).toBeInTheDocument();
  });

  // --- TC-DBG-003: Health check displays API status ---
  it("TC-DBG-003: health check displays API status on success", async () => {
    const user = userEvent.setup();
    const healthData = {
      service: "social-osu-api",
      status: "healthy",
      timestamp: "2026-03-11T00:00:00Z",
    };
    mockHealthGet.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(healthData),
    });

    render(<DebugPage />);

    await user.click(screen.getByRole("button", { name: "View API Health" }));

    await waitFor(() => {
      expect(screen.getByText("social-osu-api")).toBeInTheDocument();
    });
    expect(screen.getByText("healthy")).toBeInTheDocument();
  });

  // --- TC-DBG-006: Health check displays error on failure ---
  it("TC-DBG-006: health check displays error on failure", async () => {
    const user = userEvent.setup();
    mockHealthGet.mockRejectedValue(new Error("Network error"));

    render(<DebugPage />);

    await user.click(screen.getByRole("button", { name: "View API Health" }));

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });

  // --- TC-DBG-005: User profile viewer has input and navigate button ---
  it("TC-DBG-005: user profile viewer navigates to user page", async () => {
    const user = userEvent.setup();

    render(<DebugPage />);

    const input = screen.getByPlaceholderText("Enter user ID");
    await user.type(input, "cmml0hk7p0000cecc2olpjwop");

    await user.click(screen.getByRole("button", { name: "View Profile" }));

    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/users/$id",
      params: { id: "cmml0hk7p0000cecc2olpjwop" },
    });
  });
});
