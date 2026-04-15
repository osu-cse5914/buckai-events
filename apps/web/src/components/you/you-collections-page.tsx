import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GlobeIcon, LockIcon, PencilIcon, PlusIcon, TrashIcon } from "lucide-react";
import { useApiClient } from "@/lib/api";
import { CollectionVisibilityBadge } from "@/components/collections/collection-visibility-badge";
import {
  ownedCollectionsQueryOptions,
  queryKeys,
  type OwnedCollectionSummary,
} from "@/lib/queries";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FramedList,
  FramedListInset,
  FramedListItem,
  FramedListItems,
} from "@/components/ui/framed-list";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  YouSubpageHeader,
  YouSubpageHeaderSkeleton,
} from "@/components/you/you-subpage-header";
import { YouTabsNav } from "@/components/you/you-tabs-nav";
import { IconCircleButton } from "@/components/ui/icon-circle-button";
import { IconLabelButton } from "@/components/ui/icon-label-button";

function readSavedCount(count: number) {
  return `${count} saved`;
}

async function readErrorMessage(res: Response, fallback: string) {
  try {
    const body = await res.json() as { detail?: string };
    return body.detail || fallback;
  } catch {
    return fallback;
  }
}

function CollectionsPageSkeleton() {
  return (
    <section
      className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-10"
      aria-busy="true"
      aria-label="Collections loading"
    >
      <YouSubpageHeaderSkeleton action={<Skeleton className="size-9 rounded-md" />} />

      <div className="grid gap-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index} className="gap-4">
            <CardHeader className="gap-3">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-5 w-16" />
                </div>
                <CardTitle>
                  <Skeleton className="h-8 w-40 max-w-full" />
                </CardTitle>
              </div>

              <CardAction className="flex flex-wrap gap-2">
                <Skeleton className="h-8 w-24 rounded-md" />
                <Skeleton className="h-8 w-28 rounded-md" />
                <Skeleton className="h-8 w-20 rounded-md" />
              </CardAction>
            </CardHeader>

            <CardContent>
              <Skeleton className="h-4 w-48 max-w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

export function YouCollectionsPage() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery(ownedCollectionsQueryOptions(api));
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createVisibility, setCreateVisibility] = useState<"PRIVATE" | "PUBLIC">(
    "PRIVATE",
  );
  const [editingCollectionId, setEditingCollectionId] = useState<string | null>(
    null,
  );
  const [editingName, setEditingName] = useState("");
  const [createErrorMessage, setCreateErrorMessage] = useState<string | null>(
    null,
  );
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(
    null,
  );

  function resetCreateState() {
    setCreateName("");
    setCreateVisibility("PRIVATE");
    setCreateErrorMessage(null);
  }

  const createMutation = useMutation({
    mutationFn: async ({
      name,
      visibility,
    }: {
      name: string;
      visibility: "PRIVATE" | "PUBLIC";
    }) => {
      const res = await api.api.v1.collections.$post({
        json: { name, visibility },
      });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "Failed to create collection"));
      }
      return res.json() as Promise<OwnedCollectionSummary>;
    },
    onSuccess: () => {
      setIsCreateOpen(false);
      resetCreateState();
      queryClient.invalidateQueries({ queryKey: queryKeys.collections });
    },
    onError: (mutationError) => {
      setCreateErrorMessage(
        mutationError instanceof Error
          ? mutationError.message
          : "Failed to create collection",
      );
    },
  });

  const renameMutation = useMutation({
    mutationFn: async ({
      collectionId,
      name,
    }: {
      collectionId: string;
      name: string;
    }) => {
      const patchCollection =
        api.api.v1.collections[":id"].$patch as (args: {
          param: { id: string };
          json: { name: string };
        }) => Promise<Response>;
      const res = await patchCollection({
        param: { id: collectionId },
        json: { name },
      });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "Failed to rename collection"));
      }
      return res.json() as Promise<OwnedCollectionSummary>;
    },
    onSuccess: (collection) => {
      setEditingCollectionId(null);
      setEditingName("");
      setActionErrorMessage(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.collections });
      queryClient.invalidateQueries({
        queryKey: queryKeys.collection(collection.id),
      });
    },
    onError: (mutationError) => {
      setActionErrorMessage(
        mutationError instanceof Error
          ? mutationError.message
          : "Failed to rename collection",
      );
    },
  });

  const visibilityMutation = useMutation({
    mutationFn: async ({
      collectionId,
      visibility,
    }: {
      collectionId: string;
      visibility: "PRIVATE" | "PUBLIC";
    }) => {
      const patchCollection =
        api.api.v1.collections[":id"].$patch as (args: {
          param: { id: string };
          json: { visibility: "PRIVATE" | "PUBLIC" };
        }) => Promise<Response>;
      const res = await patchCollection({
        param: { id: collectionId },
        json: { visibility },
      });
      if (!res.ok) {
        throw new Error(
          await readErrorMessage(res, "Failed to update collection visibility"),
        );
      }
      return res.json() as Promise<OwnedCollectionSummary>;
    },
    onSuccess: (collection) => {
      setActionErrorMessage(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.collections });
      queryClient.invalidateQueries({
        queryKey: queryKeys.collection(collection.id),
      });
    },
    onError: (mutationError) => {
      setActionErrorMessage(
        mutationError instanceof Error
          ? mutationError.message
          : "Failed to update collection visibility",
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (collectionId: string) => {
      const res = await api.api.v1.collections[":id"].$delete({
        param: { id: collectionId },
      });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "Failed to delete collection"));
      }
      return collectionId;
    },
    onSuccess: (collectionId) => {
      setActionErrorMessage(null);
      if (editingCollectionId === collectionId) {
        setEditingCollectionId(null);
        setEditingName("");
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.collections });
      queryClient.invalidateQueries({
        queryKey: queryKeys.collection(collectionId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.collectionItemsPrefix(collectionId),
      });
    },
    onError: (mutationError) => {
      setActionErrorMessage(
        mutationError instanceof Error
          ? mutationError.message
          : "Failed to delete collection",
      );
    },
  });

  function handleCreateSubmit(submitEvent: React.FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();
    const trimmedName = createName.trim();
    if (!trimmedName) {
      setCreateErrorMessage("Collection name is required.");
      return;
    }

    setCreateErrorMessage(null);
    createMutation.mutate({
      name: trimmedName,
      visibility: createVisibility,
    });
  }

  function handleCreateOpenChange(nextOpen: boolean) {
    setIsCreateOpen(nextOpen);

    if (!nextOpen) {
      resetCreateState();
      return;
    }

    setCreateErrorMessage(null);
  }

  function beginRename(collection: OwnedCollectionSummary) {
    setEditingCollectionId(collection.id);
    setEditingName(collection.name);
    setActionErrorMessage(null);
  }

  function handleRenameSubmit(
    submitEvent: React.FormEvent<HTMLFormElement>,
    collectionId: string,
  ) {
    submitEvent.preventDefault();
    const trimmedName = editingName.trim();
    if (!trimmedName) {
      setActionErrorMessage("Collection name is required.");
      return;
    }

    renameMutation.mutate({
      collectionId,
      name: trimmedName,
    });
  }

  if (isLoading) {
    return <CollectionsPageSkeleton />;
  }

  if (error) {
    return (
      <section className="mx-auto max-w-5xl px-6 py-10">
        <div className="rounded-md border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          {error instanceof Error ? error.message : "Failed to load collections"}
        </div>
      </section>
    );
  }

  const collections = data ?? [];
  const isMutating =
    createMutation.isPending ||
    renameMutation.isPending ||
    visibilityMutation.isPending ||
    deleteMutation.isPending;

  return (
    <section className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-10">
      <YouTabsNav currentTab="collections" />

      <YouSubpageHeader
        title="Collections"
        showBackLink={false}
        action={(
          <Sheet open={isCreateOpen} onOpenChange={handleCreateOpenChange}>
            <SheetTrigger asChild>
              <IconLabelButton
                type="button"
                icon={<PlusIcon className="size-4" />}
                aria-label="New collection"
                title="New collection"
              >
                New collection
              </IconLabelButton>
            </SheetTrigger>

            <SheetContent className="sm:max-w-md">
              <form className="flex h-full flex-col" onSubmit={handleCreateSubmit}>
                <SheetHeader>
                  <SheetTitle>New collection</SheetTitle>
                  <SheetDescription>
                    Create a collection to organize your saved events and gigs.
                  </SheetDescription>
                </SheetHeader>

                <div className="flex flex-1 flex-col gap-5 px-4 pb-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="collection-name">
                      Collection name
                    </label>
                    <Input
                      id="collection-name"
                      value={createName}
                      onChange={(event) => setCreateName(event.target.value)}
                      placeholder="Saved listings"
                      disabled={createMutation.isPending}
                    />
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Visibility</p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant={createVisibility === "PRIVATE" ? "default" : "outline"}
                        onClick={() => setCreateVisibility("PRIVATE")}
                        disabled={createMutation.isPending}
                      >
                        Private
                      </Button>
                      <Button
                        type="button"
                        variant={createVisibility === "PUBLIC" ? "default" : "outline"}
                        onClick={() => setCreateVisibility("PUBLIC")}
                        disabled={createMutation.isPending}
                      >
                        Public
                      </Button>
                    </div>
                  </div>

                  {createErrorMessage ? (
                    <p className="text-sm text-destructive">{createErrorMessage}</p>
                  ) : null}
                </div>

                <SheetFooter className="border-t pt-4 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleCreateOpenChange(false)}
                    disabled={createMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    Save collection
                  </Button>
                </SheetFooter>
              </form>
            </SheetContent>
          </Sheet>
        )}
      />

      {actionErrorMessage ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {actionErrorMessage}
        </div>
      ) : null}

      <FramedList>
        {collections.length === 0 ? (
          <FramedListInset>
            <p className="text-lg font-medium text-center">No collections yet</p>
            <p className="mt-2 text-sm text-center text-muted-foreground">
              Create a collection to organize saved events and gigs.
            </p>
          </FramedListInset>
        ) : (
          <FramedListItems>
            {collections.map((collection) => {
              const isEditing = editingCollectionId === collection.id;
              const nextVisibility =
                collection.visibility === "PUBLIC" ? "PRIVATE" : "PUBLIC";

              return (
                <FramedListItem
                  key={collection.id}
                  aria-label={`${collection.name} collection`}
                >
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <CollectionVisibilityBadge visibility={collection.visibility} />
                        <span className="text-sm text-muted-foreground">
                          {readSavedCount(collection._count.items)}
                        </span>
                      </div>

                      <h2 className="line-clamp-2 text-base font-semibold leading-tight">
                        <Link
                          to="/you/collections/$collectionId"
                          params={{ collectionId: collection.id }}
                          className="hover:underline"
                        >
                          {collection.name}
                        </Link>
                      </h2>
                    </div>

                    <div className="flex shrink-0 flex-wrap justify-end gap-2">
                      <IconCircleButton
                        type="button"
                        variant="outline"
                        aria-label="Rename"
                        title="Rename"
                        icon={<PencilIcon className="size-4" />}
                        onClick={() => beginRename(collection)}
                        disabled={isMutating}
                      >
                        <span className="sr-only">Rename</span>
                      </IconCircleButton>
                      <IconCircleButton
                        type="button"
                        variant="outline"
                        aria-label={nextVisibility === "PUBLIC" ? "Make public" : "Make private"}
                        title={nextVisibility === "PUBLIC" ? "Make public" : "Make private"}
                        icon={
                          nextVisibility === "PUBLIC" ? (
                            <GlobeIcon className="size-4" />
                          ) : (
                            <LockIcon className="size-4" />
                          )
                        }
                        onClick={() =>
                          visibilityMutation.mutate({
                            collectionId: collection.id,
                            visibility: nextVisibility,
                          })
                        }
                        disabled={isMutating}
                      >
                        <span className="sr-only">
                          {nextVisibility === "PUBLIC" ? "Make public" : "Make private"}
                        </span>
                      </IconCircleButton>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <IconCircleButton
                            type="button"
                            variant="outline"
                            aria-label="Delete"
                            title="Delete"
                            icon={<TrashIcon className="size-4" />}
                            className={cn(
                              "border-destructive/30 text-destructive hover:text-destructive",
                            )}
                            disabled={isMutating}
                          >
                            <span className="sr-only">Delete</span>
                          </IconCircleButton>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete collection</AlertDialogTitle>
                            <AlertDialogDescription>
                              This removes the collection and its saved-item links.
                              Events and gigs themselves will remain available.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMutation.mutate(collection.id)}
                            >
                              Delete collection
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>

                  {isEditing ? (
                    <form
                      className="mt-4 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-end"
                      onSubmit={(submitEvent) =>
                        handleRenameSubmit(submitEvent, collection.id)
                      }
                    >
                      <div className="min-w-0 flex-1 space-y-2">
                        <label
                          className="text-sm font-medium"
                          htmlFor={`rename-${collection.id}`}
                        >
                          Rename collection
                        </label>
                        <Input
                          id={`rename-${collection.id}`}
                          value={editingName}
                          onChange={(event) => setEditingName(event.target.value)}
                          disabled={renameMutation.isPending}
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button type="submit" disabled={renameMutation.isPending}>
                          Save name
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setEditingCollectionId(null);
                            setEditingName("");
                          }}
                          disabled={renameMutation.isPending}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  ) : null}
                </FramedListItem>
              );
            })}
          </FramedListItems>
        )}
      </FramedList>
    </section>
  );
}
