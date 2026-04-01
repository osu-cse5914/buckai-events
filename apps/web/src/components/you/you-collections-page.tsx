import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GlobeIcon, LockIcon, PencilIcon, TrashIcon } from "lucide-react";
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
import {
  YouSubpageHeader,
  YouSubpageHeaderSkeleton,
} from "@/components/you/you-subpage-header";

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
      setCreateName("");
      setCreateVisibility("PRIVATE");
      setCreateErrorMessage(null);
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
    return (
      <section className="mx-auto max-w-5xl px-6 py-10">
        <YouSubpageHeaderSkeleton />
      </section>
    );
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
      <YouSubpageHeader
        title="Collections"
        description="Manage the collections that organize your saved listings."
        action={(
          <Button
            type="button"
            onClick={() => {
              setIsCreateOpen((current) => !current);
              setCreateErrorMessage(null);
            }}
          >
            Create Collection
          </Button>
        )}
      />

      {isCreateOpen ? (
        <Card>
          <CardHeader>
            <CardTitle>New collection</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleCreateSubmit}>
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

              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={createMutation.isPending}>
                  Save collection
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateOpen(false);
                    setCreateName("");
                    setCreateVisibility("PRIVATE");
                    setCreateErrorMessage(null);
                  }}
                  disabled={createMutation.isPending}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {actionErrorMessage ? (
        <div className="rounded-md border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
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
