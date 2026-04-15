import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TrashIcon } from "lucide-react";
import { useApiClient } from "@/lib/api";
import { CollectionMetaText } from "@/components/collections/collection-visibility-badge";
import {
  collectionDetailQueryOptions,
  collectionItemsQueryOptions,
  currentUserQueryOptions,
  queryKeys,
} from "@/lib/queries";
import {
  EventsList,
  EventsEmptyState,
  EventsPagination,
} from "@/components/events/events-browser";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  YouSubpageHeader,
  YouSubpageHeaderSkeleton,
} from "@/components/you/you-subpage-header";
import {
  FramedList,
  FramedListFooter,
  FramedListInset,
} from "@/components/ui/framed-list";
import { IconCircleButton } from "@/components/ui/icon-circle-button";
import { IconLabelButton } from "@/components/ui/icon-label-button";
import { STANDARD_PAGE_WIDTH } from "@/lib/page-layout";

function readCountLabel(count: number) {
  return `${count} saved item${count === 1 ? "" : "s"}`;
}

async function readErrorMessage(res: Response, fallback: string) {
  try {
    const body = await res.json() as { detail?: string };
    return body.detail || fallback;
  } catch {
    return fallback;
  }
}

function CollectionDetailPageSkeleton() {
  return (
      <section
        className={`${STANDARD_PAGE_WIDTH} py-10`}
        aria-busy="true"
        aria-label="Collection detail loading"
      >
      <YouSubpageHeaderSkeleton />

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Skeleton className="h-6 w-36 rounded-full" />
        <Skeleton className="h-5 w-24" />
      </div>

      <div className="mt-8 space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index} className="gap-4">
            <CardHeader className="gap-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <Skeleton className="h-6 w-14 rounded-full" />
                  </div>
                  <CardTitle>
                    <Skeleton className="h-8 w-64 max-w-full" />
                  </CardTitle>
                </div>

                <Skeleton className="h-8 w-44 rounded-md" />
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-52" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between gap-4">
        <Skeleton className="h-4 w-32" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-9 w-9 rounded-md" />
        </div>
      </div>
    </section>
  );
}

export function YouCollectionDetailPage({
  collectionId,
}: {
  collectionId: string;
}) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const { data: currentUser, isLoading: isLoadingUser } = useQuery(
    currentUserQueryOptions(api),
  );
  const {
    data: collection,
    isLoading: isLoadingCollection,
    error: collectionError,
  } = useQuery(collectionDetailQueryOptions(api, collectionId));
  const {
    data: itemsPage,
    isLoading: isLoadingItems,
    error: itemsError,
  } = useQuery({
    ...collectionItemsQueryOptions(api, collectionId, page),
    enabled: Boolean(collection) && !collectionError,
  });

  const removeMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const deleteCollectionItem =
        api.api.v1.collections[":id"].items[":eventId"].$delete as (args: {
          param: { id: string; eventId: string };
        }) => Promise<Response>;
      const res = await deleteCollectionItem({
        param: { id: collectionId, eventId },
      });
      if (!res.ok) {
        throw new Error(
          await readErrorMessage(res, "Failed to remove item from collection"),
        );
      }
      return eventId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.collections });
      queryClient.invalidateQueries({
        queryKey: queryKeys.collection(collectionId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.collectionItemsPrefix(collectionId),
      });
    },
  });

  if (isLoadingUser || isLoadingCollection || (collection && isLoadingItems)) {
    return <CollectionDetailPageSkeleton />;
  }

  if (collectionError) {
    return (
      <section className={`${STANDARD_PAGE_WIDTH} py-10`}>
        <div className="rounded-md border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          {collectionError instanceof Error
            ? collectionError.message
            : "Failed to load collection"}
        </div>
      </section>
    );
  }

  if (!collection) {
    return (
      <section className={`${STANDARD_PAGE_WIDTH} py-10`}>
        <div className="rounded-md border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          Collection not found.
        </div>
      </section>
    );
  }

  const totalItems = itemsPage?.pagination.total ?? collection.items.length;
  const isOwner = currentUser?.id === collection.userId;

  return (
    <section className={`${STANDARD_PAGE_WIDTH} py-10`}>
      <YouSubpageHeader
        title={collection.name}
        backTo="/you/collections"
        backLabel="Back to Collections"
      />

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <CollectionMetaText
          visibility={collection.visibility}
          countLabel={readCountLabel(totalItems)}
        />
      </div>

      {itemsError ? (
        <div className="mt-8 rounded-md border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          {itemsError instanceof Error
            ? itemsError.message
            : "Failed to load saved items"}
        </div>
      ) : null}

      {itemsPage ? (
        <div className="mt-8">
          <FramedList>
            {itemsPage.data.length === 0 ? (
              <FramedListInset>
                <EventsEmptyState
                  title="No saved items yet"
                  description="Save an event or gig to see it in this collection."
                  className="mt-0"
                />
              </FramedListInset>
            ) : (
              <EventsList
                events={itemsPage.data}
                showSaveAction={false}
                getItemAriaLabel={(event) => `${event.title} saved event`}
                renderRightAccessory={(event) =>
                  isOwner ? (
                    <IconCircleButton
                      type="button"
                      variant="ghost"
                      aria-label="Remove from collection"
                      title="Remove from collection"
                      icon={<TrashIcon className="size-4" />}
                      className="size-8 shadow-none"
                      onClick={() => removeMutation.mutate(event.id)}
                      disabled={removeMutation.isPending}
                    >
                      <span className="sr-only">Remove from collection</span>
                    </IconCircleButton>
                  ) : null
                }
              />
            )}

            {itemsPage.pagination.total > itemsPage.pagination.limit ? (
              <FramedListFooter>
                <EventsPagination
                  page={page}
                  total={itemsPage.pagination.total}
                  onPageChange={setPage}
                  className="mt-0"
                />
              </FramedListFooter>
            ) : null}
          </FramedList>
        </div>
      ) : null}
    </section>
  );
}
