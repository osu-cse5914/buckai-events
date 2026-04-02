import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildOwnedCollectionSummary } from "@/test/factories";

const mockCollectionsGet = vi.fn();
const mockCollectionsPost = vi.fn();
const mockCollectionPatch = vi.fn();
const mockCollectionDelete = vi.fn();

const mockApiClient = {
  api: {
    v1: {
      collections: {
        $get: (...args: unknown[]) => mockCollectionsGet(...args),
        $post: (...args: unknown[]) => mockCollectionsPost(...args),
        ":id": {
          $patch: (...args: unknown[]) => mockCollectionPatch(...args),
          $delete: (...args: unknown[]) => mockCollectionDelete(...args),
        },
      },
    },
  },
};

vi.mock("@/lib/api", () => ({
  api: mockApiClient,
  useApiClient: () => mockApiClient,
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
      href={params?.collectionId ? `/you/collections/${params.collectionId}` : to}
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

async function renderPage() {
  const { YouCollectionsPage } = await import("./you-collections-page");
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <YouCollectionsPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});

describe("[phase:6] [regression:always] YouCollectionsPage", () => {
  it("TC-COL-017: creates a collection from the Collections page", async () => {
    mockCollectionsGet
      .mockResolvedValueOnce(
        okJson([
          buildOwnedCollectionSummary({
            id: "col_1",
            userId: "user_1",
            name: "Music",
            createdAt: "2026-03-01T00:00:00.000Z",
            updatedAt: "2026-03-02T00:00:00.000Z",
            _count: { items: 2 },
          }),
        ]),
      )
      .mockResolvedValueOnce(
        okJson([
          buildOwnedCollectionSummary({
            id: "col_2",
            userId: "user_1",
            name: "Must See",
            visibility: "PUBLIC",
            createdAt: "2026-03-03T00:00:00.000Z",
            updatedAt: "2026-03-03T00:00:00.000Z",
            _count: { items: 0 },
          }),
          buildOwnedCollectionSummary({
            id: "col_1",
            userId: "user_1",
            name: "Music",
            createdAt: "2026-03-01T00:00:00.000Z",
            updatedAt: "2026-03-02T00:00:00.000Z",
            _count: { items: 2 },
          }),
        ]),
      );
    mockCollectionsPost.mockResolvedValue(
      okJson(
        buildOwnedCollectionSummary({
          id: "col_2",
          userId: "user_1",
          name: "Must See",
          visibility: "PUBLIC",
          createdAt: "2026-03-03T00:00:00.000Z",
          updatedAt: "2026-03-03T00:00:00.000Z",
          _count: { items: 0 },
        }),
        201,
      ),
    );

    await renderPage();
    const user = userEvent.setup();

    expect(await screen.findByText("Music")).toBeInTheDocument();
    expect(screen.queryByText("Create Collection")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Create Collection" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "New collection" })).toBeInTheDocument();
    await user.type(screen.getByLabelText("Collection name"), "Must See");
    await user.click(screen.getByRole("button", { name: "Public" }));
    await user.click(screen.getByRole("button", { name: "Save collection" }));

    await waitFor(() => {
      expect(mockCollectionsPost).toHaveBeenCalledWith({
        json: {
          name: "Must See",
          visibility: "PUBLIC",
        },
      });
    });

    expect(await screen.findByText("Must See")).toBeInTheDocument();
    expect(screen.getByText("Public")).toBeInTheDocument();
  });

  it("TC-COL-018: manages existing collections from the Collections page", async () => {
    mockCollectionsGet
      .mockResolvedValueOnce(
        okJson([
          buildOwnedCollectionSummary({
            id: "col_1",
            userId: "user_1",
            name: "Music",
            createdAt: "2026-03-01T00:00:00.000Z",
            updatedAt: "2026-03-02T00:00:00.000Z",
            _count: { items: 2 },
          }),
        ]),
      )
      .mockResolvedValueOnce(
        okJson([
          buildOwnedCollectionSummary({
            id: "col_1",
            userId: "user_1",
            name: "Shows",
            createdAt: "2026-03-01T00:00:00.000Z",
            updatedAt: "2026-03-04T00:00:00.000Z",
            _count: { items: 2 },
          }),
        ]),
      )
      .mockResolvedValueOnce(
        okJson([
          buildOwnedCollectionSummary({
            id: "col_1",
            userId: "user_1",
            name: "Shows",
            visibility: "PUBLIC",
            createdAt: "2026-03-01T00:00:00.000Z",
            updatedAt: "2026-03-04T00:00:00.000Z",
            _count: { items: 2 },
          }),
        ]),
      )
      .mockResolvedValueOnce(okJson([]));
    mockCollectionPatch
      .mockResolvedValueOnce(
        okJson(
          buildOwnedCollectionSummary({
            id: "col_1",
            userId: "user_1",
            name: "Shows",
            createdAt: "2026-03-01T00:00:00.000Z",
            updatedAt: "2026-03-04T00:00:00.000Z",
            _count: { items: 2 },
          }),
        ),
      )
      .mockResolvedValueOnce(
        okJson(
          buildOwnedCollectionSummary({
            id: "col_1",
            userId: "user_1",
            name: "Shows",
            visibility: "PUBLIC",
            createdAt: "2026-03-01T00:00:00.000Z",
            updatedAt: "2026-03-04T00:00:00.000Z",
            _count: { items: 2 },
          }),
        ),
      );
    mockCollectionDelete.mockResolvedValue({
      ok: true,
      status: 204,
      json: () => Promise.resolve(null),
      text: () => Promise.resolve(""),
    } as Response);

    await renderPage();
    const user = userEvent.setup();

    const collectionCard = await screen.findByLabelText("Music collection");
    expect(within(collectionCard).getByText("2 saved")).toBeInTheDocument();

    await user.click(within(collectionCard).getByRole("button", { name: "Rename" }));
    const renameInput = within(collectionCard).getByLabelText("Rename collection");
    await user.clear(renameInput);
    await user.type(renameInput, "Shows");
    await user.click(within(collectionCard).getByRole("button", { name: "Save name" }));

    await waitFor(() => {
      expect(mockCollectionPatch).toHaveBeenCalledWith({
        param: { id: "col_1" },
        json: { name: "Shows" },
      });
    });

    expect(await screen.findByLabelText("Shows collection")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Make public" }));

    await waitFor(() => {
      expect(mockCollectionPatch).toHaveBeenCalledWith({
        param: { id: "col_1" },
        json: { visibility: "PUBLIC" },
      });
    });

    expect(await screen.findByRole("button", { name: "Make private" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Delete" }));
    await user.click(screen.getByRole("button", { name: "Delete collection" }));

    await waitFor(() => {
      expect(mockCollectionDelete).toHaveBeenCalledWith({
        param: { id: "col_1" },
      });
    });

    expect(await screen.findByText("No collections yet")).toBeInTheDocument();
  });
});
