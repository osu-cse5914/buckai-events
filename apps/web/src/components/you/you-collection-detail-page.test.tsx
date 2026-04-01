import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => {
  const mockCurrentUserGet = vi.fn();
  const mockCollectionGet = vi.fn();
  const mockCollectionItemsGet = vi.fn();
  const mockCollectionItemDelete = vi.fn();

  return {
    mockCurrentUserGet,
    mockCollectionGet,
    mockCollectionItemsGet,
    mockCollectionItemDelete,
    mockApiClient: {
      api: {
        v1: {
          users: {
            me: {
              $get: (...args: unknown[]) => mockCurrentUserGet(...args),
            },
          },
          collections: {
            ":id": {
              $get: (...args: unknown[]) => mockCollectionGet(...args),
              items: {
                $get: (...args: unknown[]) => mockCollectionItemsGet(...args),
                ":eventId": {
                  $delete: (...args: unknown[]) => mockCollectionItemDelete(...args),
                },
              },
            },
          },
        },
      },
    },
  };
});

const mockCurrentUserGet = state.mockCurrentUserGet;
const mockCollectionGet = state.mockCollectionGet;
const mockCollectionItemsGet = state.mockCollectionItemsGet;
const mockCollectionItemDelete = state.mockCollectionItemDelete;

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
  }) => (
    <a
      href={
        params?.eventId
          ? `/events/${params.eventId}`
          : params?.collectionId
            ? `/you/collections/${params.collectionId}`
            : to
      }
      {...props}
    >
      {children}
    </a>
  ),
}));

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

async function renderPage(collectionId = "col_1") {
  const { YouCollectionDetailPage } = await import("./you-collection-detail-page");
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <YouCollectionDetailPage collectionId={collectionId} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});

describe("[phase:6] [regression:always] YouCollectionDetailPage", () => {
  it("TC-COL-019: owner can remove saved items from collection detail", async () => {
    mockCurrentUserGet.mockResolvedValue(okJson({ id: "user_1" }));
    mockCollectionGet.mockResolvedValue(
      okJson({
        id: "col_1",
        userId: "user_1",
        name: "Music",
        visibility: "PRIVATE",
        createdAt: "2026-03-01T00:00:00.000Z",
        updatedAt: "2026-03-02T00:00:00.000Z",
        items: [
          { id: "item_1", collectionId: "col_1", eventId: "evt_1", event: { id: "evt_1" } },
          { id: "item_2", collectionId: "col_1", eventId: "evt_2", event: { id: "evt_2" } },
        ],
      }),
    );
    mockCollectionItemsGet
      .mockResolvedValueOnce(
        okJson({
          data: [
            {
              id: "evt_1",
              title: "Hackathon",
              description: "Build night",
              type: "EVENT",
              source: "USER",
              status: "OPEN",
              category: "tech",
              tags: [],
              imageUrl: null,
              ticketUrl: null,
              locationName: "Ohio Union",
              locationLatitude: null,
              locationLongitude: null,
              startAt: "2026-04-01T18:00:00.000Z",
              endAt: null,
              compensationAmount: null,
              compensationCurrency: "USD",
              compensationType: null,
              summary: null,
              creatorId: "user_2",
              createdAt: "2026-03-01T00:00:00.000Z",
              updatedAt: "2026-03-01T00:00:00.000Z",
              creator: {
                id: "user_2",
                displayName: "Alex",
                email: "alex@osu.edu",
              },
            },
            {
              id: "evt_2",
              title: "Open Mic",
              description: "Music night",
              type: "EVENT",
              source: "USER",
              status: "OPEN",
              category: "music",
              tags: [],
              imageUrl: null,
              ticketUrl: null,
              locationName: "Drake",
              locationLatitude: null,
              locationLongitude: null,
              startAt: "2026-04-02T18:00:00.000Z",
              endAt: null,
              compensationAmount: null,
              compensationCurrency: "USD",
              compensationType: null,
              summary: null,
              creatorId: "user_3",
              createdAt: "2026-03-01T00:00:00.000Z",
              updatedAt: "2026-03-01T00:00:00.000Z",
              creator: {
                id: "user_3",
                displayName: "Jamie",
                email: "jamie@osu.edu",
              },
            },
          ],
          pagination: { total: 2, limit: 12, offset: 0 },
        }),
      )
      .mockResolvedValueOnce(
        okJson({
          data: [
            {
              id: "evt_2",
              title: "Open Mic",
              description: "Music night",
              type: "EVENT",
              source: "USER",
              status: "OPEN",
              category: "music",
              tags: [],
              imageUrl: null,
              ticketUrl: null,
              locationName: "Drake",
              locationLatitude: null,
              locationLongitude: null,
              startAt: "2026-04-02T18:00:00.000Z",
              endAt: null,
              compensationAmount: null,
              compensationCurrency: "USD",
              compensationType: null,
              summary: null,
              creatorId: "user_3",
              createdAt: "2026-03-01T00:00:00.000Z",
              updatedAt: "2026-03-01T00:00:00.000Z",
              creator: {
                id: "user_3",
                displayName: "Jamie",
                email: "jamie@osu.edu",
              },
            },
          ],
          pagination: { total: 1, limit: 12, offset: 0 },
        }),
      )
      .mockResolvedValue(
        okJson({
          data: [
            {
              id: "evt_2",
              title: "Open Mic",
              description: "Music night",
              type: "EVENT",
              source: "USER",
              status: "OPEN",
              category: "music",
              tags: [],
              imageUrl: null,
              ticketUrl: null,
              locationName: "Drake",
              locationLatitude: null,
              locationLongitude: null,
              startAt: "2026-04-02T18:00:00.000Z",
              endAt: null,
              compensationAmount: null,
              compensationCurrency: "USD",
              compensationType: null,
              summary: null,
              creatorId: "user_3",
              createdAt: "2026-03-01T00:00:00.000Z",
              updatedAt: "2026-03-01T00:00:00.000Z",
              creator: {
                id: "user_3",
                displayName: "Jamie",
                email: "jamie@osu.edu",
              },
            },
          ],
          pagination: { total: 1, limit: 12, offset: 0 },
        }),
      );
    mockCollectionItemDelete.mockResolvedValue({
      ok: true,
      status: 204,
      json: () => Promise.resolve(null),
      text: () => Promise.resolve(""),
    } as Response);

    await renderPage();
    const user = userEvent.setup();

    expect(await screen.findByRole("heading", { name: "Music" })).toBeInTheDocument();
    expect(screen.getByText("2 saved items")).toBeInTheDocument();

    const card = screen.getByLabelText("Hackathon saved event");
    await user.click(within(card).getByRole("button", { name: "Remove from collection" }));

    await waitFor(() => {
      expect(mockCollectionItemDelete).toHaveBeenCalledWith({
        param: { id: "col_1", eventId: "evt_1" },
      });
    });

    expect(await screen.findByText("1 saved item")).toBeInTheDocument();
    expect(screen.queryByLabelText("Hackathon saved event")).not.toBeInTheDocument();
  });

  it("TC-COL-020: shows public collection detail without owner actions for non-owners", async () => {
    mockCurrentUserGet.mockResolvedValue(okJson({ id: "user_9" }));
    mockCollectionGet.mockResolvedValue(
      okJson({
        id: "col_1",
        userId: "user_1",
        name: "Must See",
        visibility: "PUBLIC",
        createdAt: "2026-03-01T00:00:00.000Z",
        updatedAt: "2026-03-02T00:00:00.000Z",
        items: [{ id: "item_1", collectionId: "col_1", eventId: "evt_1", event: { id: "evt_1" } }],
      }),
    );
    mockCollectionItemsGet.mockResolvedValue(
      okJson({
        data: [
          {
            id: "evt_1",
            title: "Hackathon",
            description: "Build night",
            type: "EVENT",
            source: "USER",
            status: "OPEN",
            category: "tech",
            tags: [],
            imageUrl: null,
            ticketUrl: null,
            locationName: "Ohio Union",
            locationLatitude: null,
            locationLongitude: null,
            startAt: "2026-04-01T18:00:00.000Z",
            endAt: null,
            compensationAmount: null,
            compensationCurrency: "USD",
            compensationType: null,
            summary: null,
            creatorId: "user_2",
            createdAt: "2026-03-01T00:00:00.000Z",
            updatedAt: "2026-03-01T00:00:00.000Z",
            creator: {
              id: "user_2",
              displayName: "Alex",
              email: "alex@osu.edu",
            },
          },
        ],
        pagination: { total: 1, limit: 12, offset: 0 },
      }),
    );

    await renderPage();

    expect(await screen.findByRole("heading", { name: "Must See" })).toBeInTheDocument();
    expect(screen.getByText("Public collection")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove from collection" })).not.toBeInTheDocument();
  });
});
