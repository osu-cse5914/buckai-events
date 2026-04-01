import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookmarkCheckIcon,
  BookmarkIcon,
  LoaderCircleIcon,
} from "lucide-react";
import { useApiClient } from "@/lib/api";
import {
  ownedCollectionsQueryOptions,
  queryKeys,
  type OwnedCollectionSummary,
} from "@/lib/queries";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

async function readErrorMessage(res: Response, fallback: string) {
  try {
    const body = await res.json() as { detail?: string };
    return body.detail || fallback;
  } catch {
    return fallback;
  }
}

export function SaveToCollectionButton({
  eventId,
  className,
}: {
  eventId: string;
  className?: string;
}) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [savedCollectionName, setSavedCollectionName] = useState<string | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const collectionsQuery = useQuery({
    ...ownedCollectionsQueryOptions(api),
    enabled: open,
  });

  const saveMutation = useMutation({
    mutationFn: async ({
      collectionId,
      collectionName,
    }: {
      collectionId: string;
      collectionName: string;
    }) => {
      const postCollectionItem =
        api.api.v1.collections[":id"].items.$post as (args: {
          param: { id: string };
          json: { eventId: string };
        }) => Promise<Response>;
      const res = await postCollectionItem({
        param: { id: collectionId },
        json: { eventId },
      });

      if (!res.ok) {
        throw new Error(
          await readErrorMessage(res, "Failed to save to collection"),
        );
      }

      return { collectionName };
    },
    onSuccess: ({ collectionName }) => {
      setSavedCollectionName(collectionName);
      setErrorMessage(null);
      setOpen(false);
      setNewCollectionName("");
      queryClient.invalidateQueries({ queryKey: queryKeys.collections });
    },
    onError: (error) => {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to save to collection",
      );
    },
  });

  const createCollectionMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await api.api.v1.collections.$post({
        json: { name },
      });

      if (!res.ok) {
        throw new Error(
          await readErrorMessage(res, "Failed to create collection"),
        );
      }

      return res.json() as Promise<OwnedCollectionSummary>;
    },
    onSuccess: (collection) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.collections });
      saveMutation.mutate({
        collectionId: collection.id,
        collectionName: collection.name,
      });
    },
    onError: (error) => {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to create collection",
      );
    },
  });

  const collections = collectionsQuery.data ?? [];
  const isMutating = saveMutation.isPending || createCollectionMutation.isPending;

  function handleSaveToCollection(collection: OwnedCollectionSummary) {
    setErrorMessage(null);
    saveMutation.mutate({
      collectionId: collection.id,
      collectionName: collection.name,
    });
  }

  function handleCreateAndSave(submitEvent: React.FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();
    const trimmedName = newCollectionName.trim();

    if (!trimmedName) {
      setErrorMessage("Collection name is required.");
      return;
    }

    setErrorMessage(null);
    createCollectionMutation.mutate(trimmedName);
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);

    if (nextOpen) {
      setErrorMessage(null);
      return;
    }

    setNewCollectionName("");
    setErrorMessage(null);
  }

  const triggerLabel = savedCollectionName
    ? `Saved to ${savedCollectionName}`
    : "Save to collection";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn("size-8 rounded-full", className)}
          aria-label={triggerLabel}
          title={triggerLabel}
        >
          {isMutating ? (
            <LoaderCircleIcon className="size-4 animate-spin" />
          ) : savedCollectionName ? (
            <BookmarkCheckIcon className="size-4" />
          ) : (
            <BookmarkIcon className="size-4" />
          )}
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save to collection</DialogTitle>
          <DialogDescription>
            Choose a collection for this listing or create a new one.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {collectionsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">
              Loading collections...
            </p>
          ) : collectionsQuery.error ? (
            <p className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
              {collectionsQuery.error instanceof Error
                ? collectionsQuery.error.message
                : "Failed to load collections"}
            </p>
          ) : collections.length > 0 ? (
            <div className="space-y-2">
              {collections.map((collection) => (
                <Button
                  key={collection.id}
                  type="button"
                  variant="outline"
                  className="w-full justify-between"
                  disabled={isMutating}
                  onClick={() => handleSaveToCollection(collection)}
                >
                  <span>{collection.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {collection._count.items} saved
                  </span>
                </Button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No collections yet. Create one below to save this listing.
            </p>
          )}

          <form className="space-y-2" onSubmit={handleCreateAndSave}>
            <Label htmlFor={`new-collection-${eventId}`}>New collection</Label>
            <div className="flex gap-2">
              <Input
                id={`new-collection-${eventId}`}
                value={newCollectionName}
                placeholder="Saved"
                onChange={(event) => setNewCollectionName(event.target.value)}
                disabled={isMutating}
              />
              <Button type="submit" disabled={isMutating}>
                Create & Save
              </Button>
            </div>
          </form>

          {errorMessage ? (
            <p className="text-sm text-destructive">{errorMessage}</p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
