import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { navLinks } from "@/routes/_authenticated";

const mockHealthGet = vi.fn();
const mockExternalSyncPost = vi.fn();
let currentUser = {
  id: "db_user_abc123",
  role: "USER",
};

const mockUsersMeGet = vi.fn().mockImplementation(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve(currentUser),
  }),
);

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
      admin: {
        "external-ingestion": {
          sync: {
            $post: (...args: unknown[]) => mockExternalSyncPost(...args),
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

const mockNavigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => () => ({}),
  useNavigate: () => mockNavigate,
}));

const { DebugPage } = await import("./index");

describe("[phase:1] [regression:always] Debug Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentUser = {
      id: "db_user_abc123",
      role: "USER",
    };
  });

  it("TC-DBG-001: keeps debug out of the primary navigation model", () => {
    expect(navLinks.map((link) => link.label)).toEqual([
      "Featured",
      "Events",
      "Gigs",
      "You",
    ]);
  });

  it("TC-DBG-002: renders debug page heading and tool sections", () => {
    render(<DebugPage />);

    expect(screen.getByText("Debug Tools")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View API Health" })).toBeInTheDocument();
  });

  it("TC-DBG-003: health check displays API status on success", async () => {
    const user = userEvent.setup();
    mockHealthGet.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          service: "social-osu-api",
          status: "healthy",
          timestamp: "2026-03-11T00:00:00Z",
        }),
    });

    render(<DebugPage />);

    await user.click(screen.getByRole("button", { name: "View API Health" }));

    await waitFor(() => {
      expect(screen.getByText("social-osu-api")).toBeInTheDocument();
    });
    expect(screen.getByText("healthy")).toBeInTheDocument();
  });

  it("TC-DBG-006: health check displays error on failure", async () => {
    const user = userEvent.setup();
    mockHealthGet.mockRejectedValue(new Error("Network error"));

    render(<DebugPage />);

    await user.click(screen.getByRole("button", { name: "View API Health" }));

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });

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

describe("[phase:6] [regression:always] Debug Page admin sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentUser = {
      id: "db_user_abc123",
      role: "USER",
    };
  });

  it("TC-DBG-008: admin sees the external sync control", async () => {
    currentUser = {
      id: "db_user_abc123",
      role: "ADMIN",
    };

    render(<DebugPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Sync External Events" })).toBeInTheDocument();
    });
  });

  it("TC-DBG-009: non-admin does not see the external sync control", async () => {
    render(<DebugPage />);

    await waitFor(() => {
      expect(mockUsersMeGet).toHaveBeenCalled();
    });

    expect(
      screen.queryByRole("button", { name: "Sync External Events" }),
    ).not.toBeInTheDocument();
  });

  it("TC-DBG-010: successful external sync shows returned counts", async () => {
    const user = userEvent.setup();
    currentUser = {
      id: "db_user_abc123",
      role: "ADMIN",
    };

    let resolveSync: ((value: unknown) => void) | undefined;
    mockExternalSyncPost.mockReturnValue(
      new Promise((resolve) => {
        resolveSync = resolve;
      }),
    );

    render(<DebugPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Sync External Events" })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Sync External Events" }));

    expect(screen.getByRole("button", { name: "Syncing..." })).toBeDisabled();

    resolveSync?.({
      ok: true,
      json: () =>
        Promise.resolve({
          startedAt: "2026-03-31T12:00:00.000Z",
          finishedAt: "2026-03-31T12:00:02.000Z",
          sources: {
            osu: { fetched: 3, created: 1, updated: 1, skipped: 1, completed: 0 },
            ticketmaster: { fetched: 2, created: 1, updated: 0, skipped: 1, completed: 0 },
          },
        }),
    });

    await waitFor(() => {
      expect(screen.getByText("OSU")).toBeInTheDocument();
    });
    expect(screen.getByText("Ticketmaster")).toBeInTheDocument();
    expect(screen.getByText("Fetched: 3")).toBeInTheDocument();
    expect(screen.getAllByText("Created: 1")).toHaveLength(2);
    expect(screen.getByText("Updated: 1")).toBeInTheDocument();
    expect(screen.getAllByText("Skipped: 1")).toHaveLength(2);
  });

  it("TC-DBG-011: failed external sync shows an error state", async () => {
    const user = userEvent.setup();
    currentUser = {
      id: "db_user_abc123",
      role: "ADMIN",
    };
    mockExternalSyncPost.mockRejectedValue(new Error("Sync failed"));

    render(<DebugPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Sync External Events" })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Sync External Events" }));

    await waitFor(() => {
      expect(screen.getByText("Sync failed")).toBeInTheDocument();
    });
  });
});
