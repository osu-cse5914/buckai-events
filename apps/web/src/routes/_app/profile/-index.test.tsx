import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { buildCurrentUser } from "@/test/factories";

// Mock the api module before importing the component
const mockGet = vi.fn();
const mockPatch = vi.fn();
const mockApiClient = {
  api: {
    v1: {
      users: {
        me: {
          $get: (...args: unknown[]) => mockGet(...args),
          $patch: (...args: unknown[]) => mockPatch(...args),
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
  useUser: () => ({
    user: {
      imageUrl: "https://example.com/avatar.png",
      publicMetadata: { pronouns: "he/him" },
      unsafeMetadata: {},
    },
  }),
}));

// Mock TanStack Router's createFileRoute
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => () => ({}),
}));

// Import after mocks are set up
const { ProfilePage } = await import("./index");

const mockUser = buildCurrentUser({
  id: "user-1",
  email: "brutus@osu.edu",
  displayName: "Brutus Buckeye",
  major: "Computer Science",
  gradYear: 2026,
  interests: ["music", "sports", "tech"],
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-06-01T00:00:00Z",
  followerCount: 10,
  followingCount: 5,
});

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("ProfilePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Loading state ---
  it("shows loading state while fetching profile", () => {
    // Never resolve — keeps the query in loading state
    mockGet.mockReturnValue(new Promise(() => {}));

    render(<ProfilePage />, { wrapper: createWrapper() });
    const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  // --- Error state ---
  it("shows error state when profile fetch fails", async () => {
    mockGet.mockRejectedValue(new Error("Network error"));

    render(<ProfilePage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });

  // --- S-USER-1 / Acceptance: display all profile fields ---
  it("displays user profile fields (displayName, email, major, gradYear, interests)", async () => {
    mockGet.mockResolvedValue({ ok: true, json: () => Promise.resolve(mockUser) });

    render(<ProfilePage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Brutus Buckeye")).toBeInTheDocument();
    });
    expect(screen.getByText(/he\/him/)).toBeInTheDocument();
    expect(screen.getByText("brutus@osu.edu")).toBeInTheDocument();
    expect(screen.getByText("Computer Science")).toBeInTheDocument();
    expect(screen.getByText("2026")).toBeInTheDocument();
    expect(screen.getByText("music, sports, tech")).toBeInTheDocument();
    expect(screen.getByText(/10 followers/)).toBeInTheDocument();
    expect(screen.getByText(/5 following/)).toBeInTheDocument();
  });

  // --- TC-USER-006: Edit form saves changes ---
  it("TC-USER-006: edit form saves displayName and major via PATCH", async () => {
    const user = userEvent.setup();
    mockGet.mockResolvedValue({ ok: true, json: () => Promise.resolve(mockUser) });

    const updatedUser = { ...mockUser, displayName: "Buck I. Guy", major: "ECE" };
    mockPatch.mockResolvedValue({ ok: true, json: () => Promise.resolve(updatedUser) });

    render(<ProfilePage />, { wrapper: createWrapper() });

    // Wait for profile to load
    await waitFor(() => {
      expect(screen.getByText("Brutus Buckeye")).toBeInTheDocument();
    });

    // Click Edit
    await user.click(screen.getByRole("button", { name: "Edit profile" }));

    // Change displayName
    const displayNameInput = screen.getByLabelText("Display Name");
    await user.clear(displayNameInput);
    await user.type(displayNameInput, "Buck I. Guy");

    // Change major
    const majorInput = screen.getByLabelText("Major");
    await user.clear(majorInput);
    await user.type(majorInput, "ECE");

    // After save resolves, the GET will be called again with updated data
    mockGet.mockResolvedValue({ ok: true, json: () => Promise.resolve(updatedUser) });

    // Save
    await user.click(screen.getByRole("button", { name: "Save" }));

    // Verify PATCH was called with the updated fields
    await waitFor(() => {
      expect(mockPatch).toHaveBeenCalledOnce();
    });

    const patchCall = mockPatch.mock.calls[0][0];
    expect(patchCall.json.displayName).toBe("Buck I. Guy");
    expect(patchCall.json.major).toBe("ECE");
  });

  // --- TC-USER-007: Unsaved changes discarded on cancel ---
  it("TC-USER-007: unsaved changes are discarded when cancel is clicked", async () => {
    const user = userEvent.setup();
    mockGet.mockResolvedValue({ ok: true, json: () => Promise.resolve(mockUser) });

    render(<ProfilePage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Brutus Buckeye")).toBeInTheDocument();
    });

    // Click Edit
    await user.click(screen.getByRole("button", { name: "Edit profile" }));

    // Change displayName
    const displayNameInput = screen.getByLabelText("Display Name");
    await user.clear(displayNameInput);
    await user.type(displayNameInput, "Changed Name");

    // Cancel — should discard changes
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    // Should be back in view mode with original values
    await waitFor(() => {
      expect(screen.getByText("Brutus Buckeye")).toBeInTheDocument();
    });
    expect(screen.queryByLabelText("Display Name")).not.toBeInTheDocument();
  });

  // --- Edit form populates with current values ---
  it("edit form populates with current profile values", async () => {
    const user = userEvent.setup();
    mockGet.mockResolvedValue({ ok: true, json: () => Promise.resolve(mockUser) });

    render(<ProfilePage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Brutus Buckeye")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Edit profile" }));

    expect(screen.getByLabelText("Display Name")).toHaveValue("Brutus Buckeye");
    expect(screen.getByLabelText("Major")).toHaveValue("Computer Science");
    expect(screen.getByLabelText("Graduation Year")).toHaveValue(2026);
    expect(screen.getByLabelText("Interests")).toHaveValue("music, sports, tech");
  });

  // --- Displays empty fields gracefully ---
  it("displays placeholder for empty optional fields", async () => {
    const sparseUser = { ...mockUser, displayName: null, major: null, gradYear: null, interests: [] };
    mockGet.mockResolvedValue({ ok: true, json: () => Promise.resolve(sparseUser) });

    render(<ProfilePage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("brutus@osu.edu")).toBeInTheDocument();
    });

    // Empty fields should show dash placeholder
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(3);
  });

  // --- Error on save ---
  it("shows error message when save fails", async () => {
    const user = userEvent.setup();
    mockGet.mockResolvedValue({ ok: true, json: () => Promise.resolve(mockUser) });
    mockPatch.mockResolvedValue({ ok: false, json: () => Promise.resolve({}) });

    render(<ProfilePage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Brutus Buckeye")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Edit profile" }));
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(screen.getByText("Failed to save profile")).toBeInTheDocument();
    });
  });
});
