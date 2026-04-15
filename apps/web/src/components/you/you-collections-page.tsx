import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GlobeIcon, LockIcon, PencilIcon, PlusIcon, TrashIcon } from "lucide-react";
import { useApiClient } from "@/lib/api";
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
import { Badge } from "@/components/ui/badge";
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

const COLLECTION_VISIBILITY_STYLES: Record<"PRIVATE" | "PUBLIC", string> = {
  PRIVATE: "bg-slate-100 text-slate-700",
  PUBLIC: "bg-emerald-100 text-emerald-700",
};

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

function CollectionVisibilityBadge({
  visibility,
}: {
  visibility: "PRIVATE" | "PUBLIC";
}) {
  return (
    <Badge
      variant="secondary"
      className={COLLECTION_VISIBILITY_STYLES[visibility]}
    >
      {visibility === "PUBLIC" ? "Public" : "Private"}
    </Badge>
  );
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
        description="Manage the collections that organize your saved listings."
        showBackLink={false}
        action={(
          <Sheet open={isCreateOpen} onOpenChange={handleCreateOpenChange}>
            <SheetTrigger asChild>
              <Button
                type="button"
                aria-label="New collection"
                title="New collection"
              >
                <PlusIcon />
                New collection
              </Button>
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

      {collections.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <p className="text-lg font-medium">No collections yet</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Create a collection to organize saved events and gigs.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {collections.map((collection) => {
            const isEditing = editingCollectionId === collection.id;
            const nextVisibility =
              collection.visibility === "PUBLIC" ? "PRIVATE" : "PUBLIC";

            return (
              <Card
                key={collection.id}
                aria-label={`${collection.name} collection`}
                className="gap-4"
              >
                <CardHeader className="gap-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <CollectionVisibilityBadge visibility={collection.visibility} />
                      <span className="text-sm text-muted-foreground">
                        {readSavedCount(collection._count.items)}
                      </span>
                    </div>

                    <CardTitle>
                      <Link
                        to="/you/collections/$collectionId"
                        params={{ collectionId: collection.id }}
                        className="hover:underline"
                      >
                        {collection.name}
                      </Link>
                    </CardTitle>
                  </div>

                  <CardAction className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => beginRename(collection)}
                      disabled={isMutating}
                    >
                      <PencilIcon className="size-4" />
                      Rename
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        visibilityMutation.mutate({
                          collectionId: collection.id,
                          visibility: nextVisibility,
                        })
                      }
                      disabled={isMutating}
                    >
                      {nextVisibility === "PUBLIC" ? (
                        <GlobeIcon className="size-4" />
                      ) : (
                        <LockIcon className="size-4" />
                      )}
                      {nextVisibility === "PUBLIC" ? "Make public" : "Make private"}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className={cn(
                            "border-destructive/30 text-destructive hover:text-destructive",
                          )}
                          disabled={isMutating}
                        >
                          <TrashIcon className="size-4" />
                          Delete
                        </Button>
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
                  </CardAction>
                </CardHeader>

                {isEditing ? (
                  <CardContent>
                    <form
                      className="flex flex-col gap-3 sm:flex-row sm:items-end"
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
                  </CardContent>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
