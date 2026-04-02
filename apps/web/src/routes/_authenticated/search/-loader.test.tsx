import { QueryClient } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PAGE_SIZE, queryKeys } from "@/lib/queries";
import { createTestApiClient, createTestQueryClient } from "@/test/render-with-providers";
import {
  makeEventListItem,
  makeEventsResponse,
  TEST_API_BASE_URL,
} from "@/test/msw/handlers";
import { server } from "@/test/msw/server";

let capturedValidateSearch:
  | ((search: Record<string, unknown>) => Record<string, unknown>)
  | null = null;
let capturedLoaderDeps:
  | ((args: { search: Record<string, unknown> }) => Record<string, unknown>)
  | null = null;
let capturedLoader:
  | ((args: {
      context: {
        api: ReturnType<typeof createTestApiClient>;
        queryClient: QueryClient;
      };
      deps: Record<string, unknown>;
    }) => Promise<unknown>)
  | null = null;

vi.mock("@tanstack/react-router", () => ({
  createFileRoute:
    (path: string) =>
    (config: {
      validateSearch?: (search: Record<string, unknown>) => Record<string, unknown>;
      loaderDeps?: (args: {
        search: Record<string, unknown>;
      }) => Record<string, unknown>;
      loader?: (args: {
        context: {
          api: ReturnType<typeof createTestApiClient>;
          queryClient: QueryClient;
        };
        deps: Record<string, unknown>;
      }) => Promise<unknown>;
      component?: unknown;
    }) => {
      if (path === "/_authenticated/search/") {
        capturedValidateSearch = config.validateSearch ?? null;
        capturedLoaderDeps = config.loaderDeps ?? null;
        capturedLoader = config.loader ?? null;
      }

      return {
        component: config.component,
        fullPath: path,
      };
    },
  useNavigate: () => vi.fn(),
}));

describe("[phase:6] [regression:always] SearchRoute loader", () => {
  beforeEach(() => {
    capturedValidateSearch = null;
    capturedLoaderDeps = null;
    capturedLoader = null;
    vi.resetModules();
  });

  it("TC-PAGES-018: primes the semantic-search cache from validated URL state", async () => {
    const requests: URL[] = [];
    server.use(
      http.get(`${TEST_API_BASE_URL}/api/v1/events/semantic-search`, ({ request }) => {
        requests.push(new URL(request.url));
        return HttpResponse.json(
          makeEventsResponse(
            [makeEventListItem({ id: "evt_robot", title: "Robot Expo" })],
            {
              total: 13,
              offset: PAGE_SIZE,
            },
          ),
        );
      }),
    );

    await import("./index");

    if (!capturedValidateSearch || !capturedLoaderDeps || !capturedLoader) {
      throw new Error("Search route config was not captured");
    }

    const queryClient = createTestQueryClient();
    const api = createTestApiClient();
    const search = capturedValidateSearch({
      q: " robotics ",
      type: "EVENT",
      page: "2",
    });
    const deps = capturedLoaderDeps({ search });

    const data = await capturedLoader({
      context: { api, queryClient },
      deps,
    });

    expect(search).toEqual({
      q: "robotics",
      type: "EVENT",
      page: 2,
    });
    expect(data).toMatchObject({
      data: [{ id: "evt_robot", title: "Robot Expo" }],
      pagination: { total: 13, limit: PAGE_SIZE, offset: PAGE_SIZE },
    });
    expect(
      queryClient.getQueryData(
        queryKeys.searchResults(
          { query: "robotics", type: "EVENT", category: undefined },
          1,
          PAGE_SIZE,
        ),
      ),
    ).toMatchObject({
      data: [{ id: "evt_robot", title: "Robot Expo" }],
    });
    expect(requests).toHaveLength(1);
    expect(requests[0]?.searchParams.get("query")).toBe("robotics");
    expect(requests[0]?.searchParams.get("type")).toBe("EVENT");
    expect(requests[0]?.searchParams.get("offset")).toBe(String(PAGE_SIZE));
  });

  it("TC-PAGES-023: primes the structured-events cache when only explicit filters are active", async () => {
    let semanticSearchCalls = 0;
    const eventRequests: URL[] = [];

    server.use(
      http.get(`${TEST_API_BASE_URL}/api/v1/events/semantic-search`, () => {
        semanticSearchCalls += 1;
        return HttpResponse.json(makeEventsResponse());
      }),
      http.get(`${TEST_API_BASE_URL}/api/v1/events`, ({ request }) => {
        eventRequests.push(new URL(request.url));
        return HttpResponse.json(
          makeEventsResponse([makeEventListItem({ id: "evt_music", title: "Music Mixer" })]),
        );
      }),
    );

    await import("./index");

    if (!capturedValidateSearch || !capturedLoaderDeps || !capturedLoader) {
      throw new Error("Search route config was not captured");
    }

    const queryClient = createTestQueryClient();
    const api = createTestApiClient();
    const search = capturedValidateSearch({
      type: "EVENT",
      category: "music",
    });
    const deps = capturedLoaderDeps({ search });

    await capturedLoader({
      context: { api, queryClient },
      deps,
    });

    expect(search).toEqual({
      type: "EVENT",
      category: "music",
    });
    expect(semanticSearchCalls).toBe(0);
    expect(eventRequests).toHaveLength(1);
    expect(eventRequests[0]?.searchParams.get("type")).toBe("EVENT");
    expect(eventRequests[0]?.searchParams.get("category")).toBe("music");
    expect(
      queryClient.getQueryData(
        queryKeys.searchResults(
          { query: undefined, type: "EVENT", category: "music" },
          0,
          PAGE_SIZE,
        ),
      ),
    ).toMatchObject({
      data: [{ id: "evt_music", title: "Music Mixer" }],
    });
  });
});
