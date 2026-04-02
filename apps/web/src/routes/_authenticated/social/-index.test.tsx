import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SocialFeedPage } from "@/components/app-pages/social-feed-page";

const state = vi.hoisted(() => {
  const mockSocialFeedGet = vi.fn();
  const mockCurrentUserGet = vi.fn();

  return {
    mockSocialFeedGet,
    mockCurrentUserGet,
    mockApiClient: {
      api: {
        v1: {
          social: {
            feed: {
              $get: (...args: unknown[]) => mockSocialFeedGet(...args),
            },
          },
          users: {
            me: {
              $get: (...args: unknown[]) => mockCurrentUserGet(...args),
            },
          },
        },
      },
    },
  };
});

vi.mock("@/lib/api", () => ({
  useApiClient: () => state.mockApiClient,
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    params,
    ...props
  }: {
    children: React.ReactNode;
    to: string;
    params?: Record<string, string>;
  }) => {
    const href = params?.eventId ? `/events/${params.eventId}` : to;
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
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
  };
}

function makeFeedItem(overrides: Record<string, unknown> = {}) {
  return {
    event: {
      id: "evt_1",
      title: "Hack Night",
      source: "USER",
      type: "EVENT",
      status: "OPEN",
    },
    action: "created",
    actor: {
      id: "user_b",
      displayName: "User B",
    },
    actionAt: "2026-03-02T18:00:00.000Z",
    ...overrides,
  };
}

function makeCurrentUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "user_a",
    email: "usera@osu.edu",
    role: "USER",
    displayName: "User A",
    major: "Computer Science",
    gradYear: 2027,
    interests: ["music", "tech"],
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-03-01T00:00:00.000Z",
    followerCount: 0,
    followingCount: 0,
    ...overrides,
  };
}

async function renderSocialFeedPage() {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <SocialFeedPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  state.mockCurrentUserGet.mockResolvedValue(okJson(makeCurrentUser()));
});

describe("[phase:3] [regression:always] SocialFeedPage", () => {
  it("TC-SFEED-012: renders social feed items from the API in order", async () => {
    state.mockSocialFeedGet.mockResolvedValueOnce(
      okJson({
        data: [
          makeFeedItem({
            event: { id: "evt_2", title: "Career Fair", source: "USER", type: "EVENT", status: "OPEN" },
            action: "saved",
            actor: { id: "user_c", displayName: "User C" },
            actionAt: "2026-03-03T12:00:00.000Z",
          }),
          makeFeedItem({
            event: { id: "evt_1", title: "Hack Night", source: "USER", type: "EVENT", status: "OPEN" },
            action: "created",
            actor: { id: "user_b", displayName: "User B" },
            actionAt: "2026-03-02T18:00:00.000Z",
          }),
        ],
        pagination: {
          total: 2,
          limit: 20,
          offset: 0,
        },
      }),
    );

    await renderSocialFeedPage();

    expect(await screen.findByRole("heading", { name: /social feed/i })).toBeInTheDocument();
    expect(await screen.findByText("Career Fair")).toBeInTheDocument();
    expect(screen.getByText("User C saved")).toBeInTheDocument();
    expect(screen.getByText("User B created")).toBeInTheDocument();
    expect(screen.getByText("Hack Night")).toBeInTheDocument();

    const articles = screen.getAllByRole("article");
    expect(articles).toHaveLength(2);
    expect(articles[0]).toHaveTextContent("Career Fair");
    expect(articles[1]).toHaveTextContent("Hack Night");
  });

  it("TC-SFEED-013: loads more feed items when more pages are available", async () => {
    state.mockSocialFeedGet
      .mockResolvedValueOnce(
        okJson({
          data: [makeFeedItem({ event: { id: "evt_1", title: "Hack Night", source: "USER", type: "EVENT", status: "OPEN" } })],
          pagination: {
            total: 2,
            limit: 1,
            offset: 0,
          },
        }),
      )
      .mockResolvedValueOnce(
        okJson({
          data: [
            makeFeedItem({
              event: { id: "evt_2", title: "Career Fair", source: "USER", type: "EVENT", status: "OPEN" },
              action: "saved",
              actor: { id: "user_c", displayName: "User C" },
              actionAt: "2026-03-04T12:00:00.000Z",
            }),
          ],
          pagination: {
            total: 2,
            limit: 1,
            offset: 1,
          },
        }),
      );

    await renderSocialFeedPage();

    expect(await screen.findByText("Hack Night")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /load more/i }));

    await waitFor(() => {
      expect(screen.getByText("Career Fair")).toBeInTheDocument();
    });

    expect(screen.getAllByRole("article")).toHaveLength(2);
  });

  it("TC-SFEED-014: shows an empty state with follow guidance when the feed is empty", async () => {
    state.mockSocialFeedGet.mockResolvedValueOnce(
      okJson({
        data: [],
        pagination: {
          total: 0,
          limit: 20,
          offset: 0,
        },
      }),
    );

    await renderSocialFeedPage();

    expect(await screen.findByText(/your social feed is quiet/i)).toBeInTheDocument();
    expect(
      screen.getByText(/follow classmates in computer science or people who share music, tech/i),
    ).toBeInTheDocument();
  });
});
