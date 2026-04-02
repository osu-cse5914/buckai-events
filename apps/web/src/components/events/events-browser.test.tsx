import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { useEventsQuery, useInfiniteEventsQuery, useSearchResultsQuery } from "./events-browser";
import { renderWithProviders } from "@/test/render-with-providers";
import {
  makeEventListItem,
  makeEventsResponse,
  TEST_API_BASE_URL,
} from "@/test/msw/handlers";
import { server } from "@/test/msw/server";

function EventsQueryProbe({
  page = 0,
}: {
  page?: number;
}) {
  const query = useEventsQuery(
    {
      type: "EVENT",
      source: "USER",
      sort: "START_ASC",
    },
    page,
  );

  if (query.isLoading) {
    return <p>loading</p>;
  }

  if (query.isError) {
    return <p>{query.error.message}</p>;
  }

  return (
    <>
      <p>{query.data!.data.map((event) => event.title).join(", ")}</p>
      <p>total:{query.data!.pagination.total}</p>
    </>
  );
}

function SearchResultsProbe({
  search,
}: {
  search: {
    query?: string;
    type?: string;
    category?: string;
  };
}) {
  const query = useSearchResultsQuery(search, 0);

  if (query.isLoading) {
    return <p>loading</p>;
  }

  if (query.isError) {
    return <p>{query.error.message}</p>;
  }

  return <p>{query.data!.data.map((event) => event.title).join(", ")}</p>;
}

function InfiniteEventsProbe() {
  const query = useInfiniteEventsQuery(
    {
      type: "EVENT",
      source: "USER",
      sort: "START_ASC",
    },
    true,
    1,
  );

  const titles =
    query.data?.pages.flatMap((page) => page.data.map((event) => event.title)) ??
    [];

  if (query.isLoading) {
    return <p>loading</p>;
  }

  if (query.isError) {
    return <p>{query.error.message}</p>;
  }

  return (
    <>
      <p>{titles.join(", ")}</p>
      <button onClick={() => void query.fetchNextPage()} type="button">
        Load more
      </button>
    </>
  );
}

describe("[phase:6] [regression:always] Events query hooks", () => {
  it("TC-EVT-035: useEventsQuery stays loading until the first browse response resolves", async () => {
    server.use(
      http.get(`${TEST_API_BASE_URL}/api/v1/events`, async () => {
        await delay(75);
        return HttpResponse.json(
          makeEventsResponse([makeEventListItem({ title: "Hack Night" })]),
        );
      }),
    );

    renderWithProviders(<EventsQueryProbe />);

    expect(screen.getByText("loading")).toBeInTheDocument();
    expect(await screen.findByText("Hack Night")).toBeInTheDocument();
  });

  it("TC-EVT-036: useEventsQuery requests filtered browse data from the events endpoint", async () => {
    const requests: URL[] = [];

    server.use(
      http.get(`${TEST_API_BASE_URL}/api/v1/events`, ({ request }) => {
        requests.push(new URL(request.url));
        return HttpResponse.json(
          makeEventsResponse(
            [makeEventListItem({ title: "Filtered Event" })],
            {
              total: 13,
              offset: 12,
            },
          ),
        );
      }),
    );

    renderWithProviders(<EventsQueryProbe page={1} />);

    expect(await screen.findByText("Filtered Event")).toBeInTheDocument();
    expect(screen.getByText("total:13")).toBeInTheDocument();
    expect(requests).toHaveLength(1);
    expect(requests[0]?.searchParams.get("type")).toBe("EVENT");
    expect(requests[0]?.searchParams.get("source")).toBe("USER");
    expect(requests[0]?.searchParams.get("sort")).toBe("START_ASC");
    expect(requests[0]?.searchParams.get("limit")).toBe("12");
    expect(requests[0]?.searchParams.get("offset")).toBe("12");
  });

  it("TC-EVT-037: useEventsQuery surfaces browse fetch failures", async () => {
    server.use(
      http.get(`${TEST_API_BASE_URL}/api/v1/events`, () =>
        HttpResponse.json({ message: "nope" }, { status: 500 }),
      ),
    );

    renderWithProviders(<EventsQueryProbe />);

    expect(await screen.findByText("Failed to fetch events")).toBeInTheDocument();
  });

  it("TC-PAGES-025: useSearchResultsQuery targets semantic search when a query is present", async () => {
    const semanticRequests: URL[] = [];

    server.use(
      http.get(`${TEST_API_BASE_URL}/api/v1/events/semantic-search`, ({ request }) => {
        semanticRequests.push(new URL(request.url));
        return HttpResponse.json(
          makeEventsResponse([makeEventListItem({ title: "Robot Expo" })]),
        );
      }),
    );

    renderWithProviders(
      <SearchResultsProbe search={{ query: "robotics", type: "EVENT" }} />,
    );

    expect(await screen.findByText("Robot Expo")).toBeInTheDocument();
    expect(semanticRequests).toHaveLength(1);
    expect(semanticRequests[0]?.searchParams.get("query")).toBe("robotics");
    expect(semanticRequests[0]?.searchParams.get("type")).toBe("EVENT");
  });

  it("TC-PAGES-023: useSearchResultsQuery falls back to the structured events listing when only filters are active", async () => {
    let semanticSearchCalls = 0;
    const eventsRequests: URL[] = [];

    server.use(
      http.get(`${TEST_API_BASE_URL}/api/v1/events/semantic-search`, () => {
        semanticSearchCalls += 1;
        return HttpResponse.json(makeEventsResponse());
      }),
      http.get(`${TEST_API_BASE_URL}/api/v1/events`, ({ request }) => {
        eventsRequests.push(new URL(request.url));
        return HttpResponse.json(
          makeEventsResponse([makeEventListItem({ title: "Music Mixer" })]),
        );
      }),
    );

    renderWithProviders(
      <SearchResultsProbe search={{ type: "EVENT", category: "music" }} />,
    );

    expect(await screen.findByText("Music Mixer")).toBeInTheDocument();
    expect(semanticSearchCalls).toBe(0);
    expect(eventsRequests).toHaveLength(1);
    expect(eventsRequests[0]?.searchParams.get("type")).toBe("EVENT");
    expect(eventsRequests[0]?.searchParams.get("category")).toBe("music");
  });

  it("TC-EVT-026: useInfiniteEventsQuery appends later browse pages when requested", async () => {
    server.use(
      http.get(`${TEST_API_BASE_URL}/api/v1/events`, ({ request }) => {
        const url = new URL(request.url);
        const offset = Number(url.searchParams.get("offset") ?? "0");

        if (offset === 0) {
          return HttpResponse.json(
            makeEventsResponse([makeEventListItem({ id: "evt_1", title: "Hack Night" })], {
              total: 2,
              limit: 1,
              offset: 0,
            }),
          );
        }

        return HttpResponse.json(
          makeEventsResponse([makeEventListItem({ id: "evt_2", title: "Career Fair" })], {
            total: 2,
            limit: 1,
            offset: 1,
          }),
        );
      }),
    );

    const user = userEvent.setup();

    renderWithProviders(<InfiniteEventsProbe />);

    expect(await screen.findByText("Hack Night")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Load more" }));

    await waitFor(() => {
      expect(screen.getByText("Hack Night, Career Fair")).toBeInTheDocument();
    });
  });
});
