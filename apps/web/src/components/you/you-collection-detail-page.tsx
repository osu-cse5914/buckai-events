import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarIcon, MapPinIcon, TrashIcon } from "lucide-react";
import { useApiClient } from "@/lib/api";
import {
  collectionDetailQueryOptions,
  collectionItemsQueryOptions,
  currentUserQueryOptions,
  queryKeys,
  type EventListItem,
} from "@/lib/queries";
import {
  STATUS_LABELS,
  STATUS_STYLES,
  TYPE_STYLES,
  formatDate,
} from "@/lib/event-utils";
import {
  EventsEmptyState,
  EventsPagination,
} from "@/components/events/events-browser";
import { Badge } from "@/components/ui/badge";
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

const COLLECTION_VISIBILITY_STYLES: Record<"PRIVATE" | "PUBLIC", string> = {
  PRIVATE: "bg-slate-100 text-slate-700",
  PUBLIC: "bg-emerald-100 text-emerald-700",
};

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

function CollectionEventCard({
  event,
  isOwner,
  isRemoving,
  onRemove,
}: {
  event: EventListItem;
  isOwner: boolean;
  isRemoving: boolean;
  onRemove: (eventId: string) => void;
}) {
  return (
    <Card aria-label={`${event.title} saved event`} className="gap-4">
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className={TYPE_STYLES[event.type] ?? ""}>
                {event.type}
              </Badge>
              <Badge
                variant="secondary"
                className={STATUS_STYLES[event.status] ?? ""}
              >
                {STATUS_LABELS[event.status] ?? event.status}
              </Badge>
            </div>

            <CardTitle>
              <Link
                to="/events/$eventId"
                params={{ eventId: event.id }}
                className="hover:underline"
              >
                {event.title}
              </Link>
            </CardTitle>
          </div>

          {isOwner ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onRemove(event.id)}
              disabled={isRemoving}
            >
              <TrashIcon className="size-4" />
              Remove from collection
            </Button>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5">
            <CalendarIcon className="size-4" />
            {formatDate(event.startAt)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPinIcon className="size-4" />
            {event.locationName}
          </span>
        </div>
        <p>{event.summary || event.description}</p>
      </CardContent>
    </Card>
  );
}

function CollectionDetailPageSkeleton() {
  return (
    <section
      className="mx-auto max-w-5xl px-6 py-10"
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
      <section className="mx-auto max-w-5xl px-6 py-10">
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
      <section className="mx-auto max-w-5xl px-6 py-10">
        <div className="rounded-md border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          Collection not found.
        </div>
      </section>
    );
  }

  const totalItems = itemsPage?.pagination.total ?? collection.items.length;
  const isOwner = currentUser?.id === collection.userId;

  return (
    <section className="mx-auto max-w-5xl px-6 py-10">
      <YouSubpageHeader
        title={collection.name}
        backTo="/you/collections"
        backLabel="Back to Collections"
        description={
          isOwner
            ? "Review the events and gigs you saved here."
            : "This public collection is visible in read-only mode."
        }
      />

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Badge
          variant="secondary"
          className={COLLECTION_VISIBILITY_STYLES[collection.visibility]}
        >
          {collection.visibility === "PUBLIC"
            ? "Public collection"
            : "Private collection"}
        </Badge>
        <span className="text-sm text-muted-foreground">
          {readCountLabel(totalItems)}
        </span>
      </div>

      {itemsError ? (
        <div className="mt-8 rounded-md border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          {itemsError instanceof Error
            ? itemsError.message
            : "Failed to load saved items"}
        </div>
      ) : null}

      {itemsPage && itemsPage.data.length === 0 ? (
        <EventsEmptyState
          title="No saved items yet"
          description="Save an event or gig to see it in this collection."
        />
      ) : null}

      {itemsPage && itemsPage.data.length > 0 ? (
        <>
          <div className="mt-8 grid gap-4">
            {itemsPage.data.map((event) => (
              <CollectionEventCard
                key={event.id}
                event={event}
                isOwner={Boolean(isOwner)}
                isRemoving={removeMutation.isPending}
                onRemove={(eventId) => removeMutation.mutate(eventId)}
              />
            ))}
          </div>
          <EventsPagination
            page={page}
            total={itemsPage.pagination.total}
            onPageChange={setPage}
          />
        </>
      ) : null}
    </section>
  );
}
