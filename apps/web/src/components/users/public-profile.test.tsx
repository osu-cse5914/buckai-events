import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  ProfileView,
  ProfileNotFound,
  ProfileError,
  ProfileSkeleton,
  type PublicProfileData,
} from "./public-profile";

// Mock TanStack Router's Link
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
  }: {
    children: React.ReactNode;
    to: string;
  }) => <a href={to}>{children}</a>,
}));

const baseUser: PublicProfileData = {
  id: "user-123",
  displayName: "Brutus Buckeye",
  imageUrl: "https://example.com/avatar.png",
  pronouns: "he/him",
  major: "Computer Science",
  gradYear: 2025,
  interests: ["sports", "music"],
  followerCount: 10,
  followingCount: 5,
  isFollowing: false,
  createdEvents: {
    items: [],
    meta: { total: 0, limit: 20, offset: 0 },
  },
};

describe("[phase:1] [regression:always] Public profile page", () => {
  it("TC-PUB-007: renders all public profile fields", () => {
    render(<ProfileView user={baseUser} />);

    expect(screen.getByText("Brutus Buckeye")).toBeInTheDocument();
    expect(screen.getByText(/he\/him/)).toBeInTheDocument();
    expect(screen.getByText(/Computer Science/)).toBeInTheDocument();
    expect(screen.getByText(/Class of 2025/)).toBeInTheDocument();
    expect(screen.getByText("sports")).toBeInTheDocument();
    expect(screen.getByText("music")).toBeInTheDocument();
    expect(screen.getByText(/10 followers/)).toBeInTheDocument();
    expect(screen.getByText(/5 following/)).toBeInTheDocument();
  });

  it("TC-PUB-007: does not render email anywhere", () => {
    render(<ProfileView user={baseUser} />);

    expect(screen.queryByText("email")).not.toBeInTheDocument();
    expect(screen.queryByText("brutus@osu.edu")).not.toBeInTheDocument();
  });

  it("TC-PUB-007: shows Follow button when not following (disabled without callbacks)", () => {
    render(<ProfileView user={baseUser} />);

    const button = screen.getByRole("button", { name: "Follow" });
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
  });

  it("TC-PUB-007: shows Unfollow button when following (disabled without callbacks)", () => {
    render(<ProfileView user={{ ...baseUser, isFollowing: true }} />);

    const button = screen.getByRole("button", { name: "Unfollow" });
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
  });

  it("TC-PUB-007: shows singular 'follower' for count of 1", () => {
    render(<ProfileView user={{ ...baseUser, followerCount: 1 }} />);

    expect(screen.getByText(/1 follower/)).toBeInTheDocument();
    expect(screen.queryByText(/followers/)).not.toBeInTheDocument();
  });

  it("TC-PUB-007: shows 'No active events' when list is empty", () => {
    render(<ProfileView user={baseUser} />);

    expect(screen.getByText("No active events.")).toBeInTheDocument();
  });

  it("TC-PUB-007: renders created events", () => {
    const user: PublicProfileData = {
      ...baseUser,
      createdEvents: {
        items: [
          {
            id: "evt-1",
            title: "Hack Night",
            description: "Build cool stuff",
            status: "OPEN",
            createdAt: "2025-01-15T00:00:00Z",
          },
          {
            id: "evt-2",
            title: "Study Group",
            description: null,
            status: "IN_PROGRESS",
            createdAt: "2025-02-01T00:00:00Z",
          },
        ],
        meta: { total: 2, limit: 20, offset: 0 },
      },
    };

    render(<ProfileView user={user} />);

    expect(screen.getByText("Hack Night")).toBeInTheDocument();
    expect(screen.getByText("Build cool stuff")).toBeInTheDocument();
    expect(screen.getByText("Open")).toBeInTheDocument();
    expect(screen.getByText("Study Group")).toBeInTheDocument();
    expect(screen.getByText("In Progress")).toBeInTheDocument();
  });

  it("TC-PUB-007: hides interests section when empty", () => {
    render(<ProfileView user={{ ...baseUser, interests: [] }} />);

    expect(screen.queryByText("Interests")).not.toBeInTheDocument();
  });

  it("TC-PUB-007: renders 404 page for nonexistent user", () => {
    render(<ProfileNotFound />);

    expect(screen.getByText("User not found")).toBeInTheDocument();
    expect(
      screen.getByText("The user you're looking for doesn't exist."),
    ).toBeInTheDocument();
    expect(screen.getByText("Go home")).toBeInTheDocument();
  });

  it("TC-PUB-007: renders error state", () => {
    render(<ProfileError />);

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("TC-PUB-007: renders skeleton loading state", () => {
    const { container } = render(<ProfileSkeleton />);

    const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });
});
