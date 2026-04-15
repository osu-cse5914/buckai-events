import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { SocialFeedPage } from "@/components/app-pages/social-feed-page";
import { renderWithProviders } from "@/test/render-with-providers";
import {
  makeCurrentUser,
  makeSocialFeedItem,
  makeSocialFeedResponse,
  TEST_API_BASE_URL,
} from "@/test/msw/handlers";
import { server } from "@/test/msw/server";

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

describe("[phase:3] [regression:always] SocialFeedPage", () => {
  it("TC-SFEED-012: renders social feed items from the API in order", async () => {
    server.use(
      http.get(`${TEST_API_BASE_URL}/api/v1/social/feed`, () =>
        HttpResponse.json(
          makeSocialFeedResponse([
            makeSocialFeedItem({
              event: {
                id: "evt_2",
                title: "Career Fair",
                source: "USER",
                type: "EVENT",
                status: "OPEN",
              },
              action: "saved",
              actor: { id: "user_c", displayName: "User C" },
              actionAt: "2026-03-03T12:00:00.000Z",
            }),
            makeSocialFeedItem({
              event: {
                id: "evt_1",
                title: "Hack Night",
                source: "USER",
                type: "EVENT",
                status: "OPEN",
              },
              action: "created",
              actor: { id: "user_b", displayName: "User B" },
              actionAt: "2026-03-02T18:00:00.000Z",
            }),
          ]),
        ),
      ),
    );

    renderWithProviders(<SocialFeedPage />);

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
    server.use(
      http.get(`${TEST_API_BASE_URL}/api/v1/social/feed`, ({ request }) => {
        const url = new URL(request.url);
        const offset = Number(url.searchParams.get("offset") ?? "0");

        if (offset === 0) {
          return HttpResponse.json(
            makeSocialFeedResponse(
              [
                makeSocialFeedItem({
                  event: {
                    id: "evt_1",
                    title: "Hack Night",
                    source: "USER",
                    type: "EVENT",
                    status: "OPEN",
                  },
                }),
              ],
              {
                total: 2,
                limit: 1,
                offset: 0,
              },
            ),
          );
        }

        return HttpResponse.json(
          makeSocialFeedResponse(
            [
              makeSocialFeedItem({
                event: {
                  id: "evt_2",
                  title: "Career Fair",
                  source: "USER",
                  type: "EVENT",
                  status: "OPEN",
                },
                action: "saved",
                actor: { id: "user_c", displayName: "User C" },
                actionAt: "2026-03-04T12:00:00.000Z",
              }),
            ],
            {
              total: 2,
              limit: 1,
              offset: 1,
            },
          ),
        );
      }),
    );

    const user = userEvent.setup();

    renderWithProviders(<SocialFeedPage />);

    expect(await screen.findByText("Hack Night")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /load more/i }));

    await waitFor(() => {
      expect(screen.getByText("Career Fair")).toBeInTheDocument();
    });

    expect(screen.getAllByRole("article")).toHaveLength(2);
  });

  it("TC-SFEED-014: shows an empty state with follow guidance when the feed is empty", async () => {
    server.use(
      http.get(`${TEST_API_BASE_URL}/api/v1/users/me`, () =>
        HttpResponse.json(
          makeCurrentUser({
            major: "Computer Science",
            interests: ["music", "tech"],
          }),
        ),
      ),
      http.get(`${TEST_API_BASE_URL}/api/v1/social/feed`, () =>
        HttpResponse.json(makeSocialFeedResponse()),
      ),
    );

    renderWithProviders(<SocialFeedPage />);

    expect(await screen.findByText(/your social feed is quiet/i)).toBeInTheDocument();
    expect(
      screen.getByText(/follow people you know or share interests with to start your feed/i),
    ).toBeInTheDocument();
  });
});
