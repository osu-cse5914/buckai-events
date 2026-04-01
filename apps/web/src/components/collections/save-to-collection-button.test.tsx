import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { ApiClientProvider } from "@/lib/api";
import { SaveToCollectionButton } from "./save-to-collection-button";

function okJson(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  } as Response;
}

function renderSaveButton(apiClient: Record<string, unknown>) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ApiClientProvider client={apiClient as never}>
        <SaveToCollectionButton eventId="evt_1" />
      </ApiClientProvider>
    </QueryClientProvider>,
  );
}

describe("[phase:6] [regression:always] SaveToCollectionButton", () => {
  it("TC-COL-013: saves the current listing to an existing collection from the overlay", async () => {
    const collectionsGet = vi.fn().mockResolvedValue(
      okJson([
        {
          id: "col_1",
          userId: "user_1",
          name: "Music Events",
          visibility: "PRIVATE",
          createdAt: "2025-03-01T00:00:00.000Z",
          updatedAt: "2025-03-02T00:00:00.000Z",
          _count: { items: 3 },
        },
      ]),
    );
    const collectionItemPost = vi.fn().mockResolvedValue(okJson({}, 201));
    const apiClient = {
      api: {
        v1: {
          collections: {
            $get: collectionsGet,
            $post: vi.fn(),
            ":id": {
              items: {
                $post: collectionItemPost,
              },
            },
          },
        },
      },
    };

    renderSaveButton(apiClient);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Save to collection" }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    await user.click(
      await screen.findByRole("button", { name: /Music Events/i }),
    );

    await waitFor(() => {
      expect(collectionItemPost).toHaveBeenCalledWith({
        param: { id: "col_1" },
        json: { eventId: "evt_1" },
      });
    });

    expect(collectionsGet).toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Saved to Music Events" }),
    ).toBeInTheDocument();
  });

  it("TC-COL-014: creates a new collection from the save overlay and saves the listing", async () => {
    const collectionsGet = vi.fn().mockResolvedValue(okJson([]));
    const collectionsPost = vi.fn().mockResolvedValue(
      okJson(
        {
          id: "col_2",
          userId: "user_1",
          name: "Saved",
          visibility: "PRIVATE",
          createdAt: "2025-03-01T00:00:00.000Z",
          updatedAt: "2025-03-02T00:00:00.000Z",
          _count: { items: 0 },
        },
        201,
      ),
    );
    const collectionItemPost = vi.fn().mockResolvedValue(okJson({}, 201));
    const apiClient = {
      api: {
        v1: {
          collections: {
            $get: collectionsGet,
            $post: collectionsPost,
            ":id": {
              items: {
                $post: collectionItemPost,
              },
            },
          },
        },
      },
    };

    renderSaveButton(apiClient);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Save to collection" }));

    expect(await screen.findByText(/No collections yet/i)).toBeInTheDocument();
    await user.type(screen.getByLabelText("New collection"), "Saved");
    await user.click(screen.getByRole("button", { name: "Create & Save" }));

    await waitFor(() => {
      expect(collectionsPost).toHaveBeenCalledWith({
        json: { name: "Saved" },
      });
      expect(collectionItemPost).toHaveBeenCalledWith({
        param: { id: "col_2" },
        json: { eventId: "evt_1" },
      });
    });

    expect(
      screen.getByRole("button", { name: "Saved to Saved" }),
    ).toBeInTheDocument();
  });
});
