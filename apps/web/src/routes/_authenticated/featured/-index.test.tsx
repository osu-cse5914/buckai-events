import { useState } from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FeaturedPage } from "@/components/app-pages/featured-page";
import {
  buildEventRecord,
  buildRecommendationSectionResponse,
  buildRecommendationsResponse,
  buildSocialFeedItem,
  buildPaginatedResponse,
} from "@/test/factories";

const state = vi.hoisted(() => {
  const mockRecommendationsGet = vi.fn();
  const mockPopularGet = vi.fn();
  const mockUpcomingGet = vi.fn();
  const mockSocialFeedGet = vi.fn();
  const mockCurrentUserGet = vi.fn();

  return {
    mockRecommendationsGet,
    mockPopularGet,
    mockUpcomingGet,
    mockSocialFeedGet,
    mockCurrentUserGet,
    mockApiClient: {
      api: {
        v1: {
          users: {
            me: {
              $get: (...args: unknown[]) => mockCurrentUserGet(...args),
            },
          },
          recommendations: {
            $get: (...args: unknown[]) => mockRecommendationsGet(...args),
            popular: {
              $get: (...args: unknown[]) => mockPopularGet(...args),
            },
            upcoming: {
              $get: (...args: unknown[]) => mockUpcomingGet(...args),
            },
          },
          social: {
            feed: {
              $get: (...args: unknown[]) => mockSocialFeedGet(...args),
            },
          },
        },
      },
    },
  };
});

vi.mock("@/lib/api", () => ({
  api: state.mockApiClient,
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

type FeaturedFilter = "" | "EVENT" | "GIG";

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

function makeSocialFeedResponse(
  items: Array<ReturnType<typeof buildSocialFeedItem>> = [],
  pagination: {
    total?: number;
    limit?: number;
    offset?: number;
  } = {},
) {
  return okJson(
    buildPaginatedResponse(items, {
      pagination: {
        total: pagination.total ?? items.length,
        limit: pagination.limit ?? 12,
        offset: pagination.offset ?? 0,
      },
    }),
  );
}

function makeRecommendationResponse(
  items: Array<ReturnType<typeof makeEvent>> = [],
  meta: {
    total?: number;
    limit?: number;
    offset?: number;
    rankingMode?: "PERSONALIZED" | "POPULARITY_FALLBACK";
  } = {},
) {
  return okJson(
    buildRecommendationsResponse(items, {
      meta: {
        total: meta.total ?? items.length,
        limit: meta.limit ?? 12,
        offset: meta.offset ?? 0,
        rankingMode: meta.rankingMode ?? "PERSONALIZED",
      },
    }),
  );
}

function makeSectionResponse(
  items: Array<ReturnType<typeof makeEvent>> = [],
  meta: {
    total?: number;
    limit?: number;
    offset?: number;
  } = {},
) {
  return okJson(
    buildRecommendationSectionResponse(items, {
      meta: {
        total: meta.total ?? items.length,
        limit: meta.limit ?? items.length,
        offset: meta.offset ?? 0,
      },
    }),
  );
}

function makeEvent(overrides: Record<string, unknown> = {}) {
  return buildEventRecord({
    title: "Hackathon",
    description: "A 24-hour build sprint",
    category: "tech",
    startAt: "2099-04-01T09:00:00.000Z",
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-03-01T00:00:00.000Z",
    creator: { id: "user_1", displayName: "Alice", email: "alice@osu.edu" },
    ...overrides,
  });
}

function FeaturedHarness({
  initialType = "",
}: {
  initialType?: FeaturedFilter;
}) {
  const [type, setType] = useState<FeaturedFilter>(initialType);

  return <FeaturedPage type={type} onTypeChange={setType} />;
}

async function renderFeaturedPage(options?: {
  initialType?: FeaturedFilter;
}) {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <FeaturedHarness {...options} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  state.mockCurrentUserGet.mockResolvedValue(
    okJson({
      id: "user_1",
      email: "student@osu.edu",
      role: "USER",
      displayName: "Brutus",
      major: "Computer Science",
      gradYear: 2026,
      interests: ["music", "sports"],
      createdAt: "2026-03-01T00:00:00.000Z",
      updatedAt: "2026-03-01T00:00:00.000Z",
      followerCount: 0,
      followingCount: 0,
    }),
  );
  state.mockSocialFeedGet.mockResolvedValue(makeSocialFeedResponse([]));
});

describe("[phase:6] [regression:always] FeaturedPage", () => {
  it("TC-FEED-011: renders the sectioned Featured layout", async () => {
    state.mockRecommendationsGet.mockResolvedValue(
      makeRecommendationResponse([makeEvent({ id: "evt_rec", title: "Recommended Show" })]),
    );
    state.mockPopularGet.mockResolvedValue(
      makeSectionResponse([makeEvent({ id: "evt_pop", title: "Popular Show" })]),
    );
    state.mockUpcomingGet.mockResolvedValue(
      makeSectionResponse([makeEvent({ id: "evt_up", title: "Upcoming Show" })]),
    );
    state.mockSocialFeedGet.mockResolvedValue(
      makeSocialFeedResponse([
        buildSocialFeedItem({
          actor: { id: "user_2", displayName: "Alice" },
          action: "created",
          event: {
            id: "evt_following",
            title: "Following Show",
            source: "USER",
            type: "EVENT",
            status: "OPEN",
          },
        }),
      ]),
    );

    await renderFeaturedPage();

    expect(await screen.findByRole("heading", { name: "Recommended" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Following" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Popular" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Upcoming" })).toBeInTheDocument();
    await waitFor(() => {
      expect(document.body).toHaveTextContent("Recommended Show");
      expect(document.body).toHaveTextContent("Following Show");
      expect(document.body).toHaveTextContent("Popular Show");
      expect(document.body).toHaveTextContent("Upcoming Show");
    });
  });

  it("TC-SFEED-015: shows followed-user activity inside the Featured Following section", async () => {
    state.mockRecommendationsGet.mockResolvedValue(makeRecommendationResponse([]));
    state.mockPopularGet.mockResolvedValue(makeSectionResponse([]));
    state.mockUpcomingGet.mockResolvedValue(makeSectionResponse([]));
    state.mockSocialFeedGet.mockResolvedValue(
      makeSocialFeedResponse([
        buildSocialFeedItem({
          actor: { id: "user_b", displayName: "User B" },
          action: "saved",
          event: {
            id: "evt_2",
            title: "Career Fair",
            source: "USER",
            type: "EVENT",
            status: "OPEN",
          },
          actionAt: "2026-03-03T12:00:00.000Z",
        }),
      ]),
    );

    await renderFeaturedPage();

    const followingSection = await screen.findByRole("heading", { name: "Following" });
    const sectionContainer = followingSection.closest("section");

    if (!sectionContainer) {
      throw new Error("Expected Following section container");
    }

    expect(await within(sectionContainer).findByText("Career Fair")).toBeInTheDocument();
    expect(within(sectionContainer).getByText("User B saved")).toBeInTheDocument();
  });

  it("TC-FEED-012: updates all sections when the Featured filter changes", async () => {
    state.mockRecommendationsGet.mockResolvedValue(makeRecommendationResponse([]));
    state.mockPopularGet.mockResolvedValue(makeSectionResponse([]));
    state.mockUpcomingGet.mockResolvedValue(makeSectionResponse([]));

    await renderFeaturedPage();

    await waitFor(() => {
      expect(state.mockRecommendationsGet).toHaveBeenCalled();
      expect(state.mockPopularGet).toHaveBeenCalled();
      expect(state.mockUpcomingGet).toHaveBeenCalled();
    });

    await userEvent.click(screen.getByRole("button", { name: "Events" }));

    await waitFor(() => {
      expect(
        state.mockRecommendationsGet.mock.calls.at(-1)?.[0]?.query?.type,
      ).toBe("EVENT");
      expect(state.mockPopularGet.mock.calls.at(-1)?.[0]?.query?.type).toBe(
        "EVENT",
      );
      expect(state.mockUpcomingGet.mock.calls.at(-1)?.[0]?.query?.type).toBe(
        "EVENT",
      );
    });
  });

  it("TC-FEED-013: shows the fallback banner only from the personalized section state", async () => {
    state.mockRecommendationsGet.mockResolvedValue(
      makeRecommendationResponse([], { rankingMode: "POPULARITY_FALLBACK" }),
    );
    state.mockPopularGet.mockResolvedValue(makeSectionResponse([]));
    state.mockUpcomingGet.mockResolvedValue(makeSectionResponse([]));

    await renderFeaturedPage();

    expect(
      await screen.findByText(/showing popular upcoming picks while your interests/i),
    ).toBeInTheDocument();
  });

  it("TC-FEED-014: load more appends only recommended items", async () => {
    state.mockRecommendationsGet.mockImplementation(
      ({ query }: { query: { offset: string } }) => {
        if (query.offset === "0") {
          return Promise.resolve(
            makeRecommendationResponse(
              [makeEvent({ id: "evt_rec_1", title: "Recommended One" })],
              { total: 2, limit: 1, offset: 0 },
            ),
          );
        }

        return Promise.resolve(
          makeRecommendationResponse(
            [makeEvent({ id: "evt_rec_2", title: "Recommended Two" })],
            { total: 2, limit: 1, offset: 1 },
          ),
        );
      },
    );
    state.mockPopularGet.mockResolvedValue(
      makeSectionResponse([makeEvent({ id: "evt_pop_1", title: "Popular One" })]),
    );
    state.mockUpcomingGet.mockResolvedValue(
      makeSectionResponse([makeEvent({ id: "evt_up_1", title: "Upcoming One" })]),
    );

    await renderFeaturedPage();

    expect(await screen.findByText("Recommended One")).toBeInTheDocument();
    expect(state.mockPopularGet).toHaveBeenCalledTimes(1);
    expect(state.mockUpcomingGet).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole("button", { name: "Load more" }));

    expect(await screen.findByText("Recommended Two")).toBeInTheDocument();
    expect(state.mockRecommendationsGet).toHaveBeenCalledTimes(2);
    expect(state.mockPopularGet).toHaveBeenCalledTimes(1);
    expect(state.mockUpcomingGet).toHaveBeenCalledTimes(1);
  });

  it("TC-FEED-015: keeps rendering healthy sections when others are empty or fail", async () => {
    state.mockRecommendationsGet.mockResolvedValue(
      makeRecommendationResponse([makeEvent({ id: "evt_rec", title: "Recommended Show" })]),
    );
    state.mockPopularGet.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    });
    state.mockUpcomingGet.mockResolvedValue(makeSectionResponse([]));

    await renderFeaturedPage();

    expect(await screen.findByText("Recommended Show")).toBeInTheDocument();

    const popularSection = screen
      .getByRole("heading", { name: "Popular" })
      .closest("section");
    const upcomingSection = screen
      .getByRole("heading", { name: "Upcoming" })
      .closest("section");

    if (!popularSection || !upcomingSection) {
      throw new Error("Expected section containers");
    }

    expect(
      within(popularSection).getByText("Failed to fetch popular recommendations"),
    ).toBeInTheDocument();
    expect(
      within(upcomingSection).getByText("No upcoming picks right now"),
    ).toBeInTheDocument();
  });
});
