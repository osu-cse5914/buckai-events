import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CalendarIcon,
  MapPinIcon,
  UserIcon,
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
} from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/_authenticated/events/$eventId/")({
  component: EventDetailPage,
});

const VALID_TRANSITIONS: Record<string, string[]> = {
  OPEN: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const STATUS_STYLES: Record<string, string> = {
  OPEN: "bg-green-100 text-green-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-gray-100 text-gray-800",
  CANCELLED: "bg-red-100 text-red-800",
};

const TYPE_STYLES: Record<string, string> = {
  EVENT: "bg-purple-100 text-purple-800",
  GIG: "bg-amber-100 text-amber-800",
};

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function useEvent(eventId: string) {
  return useQuery({
    queryKey: ["event", eventId],
    queryFn: async () => {
      const res = await api.api.v1.events[":id"].$get({
        param: { id: eventId },
      });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to load event");
      return res.json();
    },
  });
}

function useCurrentUser() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const res = await api.api.v1.users.me.$get();
      if (!res.ok) return null;
      return res.json();
    },
  });
}

function EventDetailPage() {
  const { eventId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: event, isLoading, error } = useEvent(eventId);
  const { data: currentUser } = useCurrentUser();

  const isCreator = !!(
    currentUser &&
    event &&
    currentUser.id === event.creatorId &&
    event.source === "USER"
  );

  const statusMutation = useMutation({
    mutationFn: async (status: string) => {
      const res = await api.api.v1.events[":id"].$patch({
        param: { id: eventId },
        json: { status },
      });
      if (!res.ok) throw new Error("Failed to update status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event", eventId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await api.api.v1.events[":id"].$delete({
        param: { id: eventId },
      });
      if (!res.ok) throw new Error("Failed to delete event");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      navigate({ to: "/events" });
    },
  });

  function handleStatusChange(newStatus: string) {
    if (newStatus) {
      statusMutation.mutate(newStatus);
    }
  }

  function handleDelete() {
    if (
      window.confirm(
        "Are you sure you want to delete this event? This action cannot be undone.",
      )
    ) {
      deleteMutation.mutate();
    }
  }

  if (isLoading) {
    return (
      <section className="mx-auto max-w-3xl px-6 py-10">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="mt-4 h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-3/4" />
      </section>
    );
  }

  if (error) {
    return (
      <section className="mx-auto max-w-3xl px-6 py-10">
        <div className="rounded-md border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          {error instanceof Error ? error.message : "Failed to load event"}
        </div>
      </section>
    );
  }

  if (!event) {
    return (
      <section className="mx-auto max-w-3xl px-6 py-10 text-center">
        <h1 className="text-2xl font-bold">Event not found</h1>
        <p className="mt-2 text-muted-foreground">
          This event does not exist or has been removed.
        </p>
        <Button asChild className="mt-4">
          <Link to="/events">Back to Events</Link>
        </Button>
      </section>
    );
  }

  const validTransitions = VALID_TRANSITIONS[event.status] || [];

  return (
    <section className="mx-auto max-w-3xl px-6 py-10">
      <Link
        to="/events"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        Back to Events
      </Link>

      <div className="mt-6">
        <div className="flex items-center gap-2">
          <Badge
            variant="secondary"
            className={TYPE_STYLES[event.type] ?? ""}
          >
            {event.type}
          </Badge>
          <Badge
            variant="secondary"
            className={STATUS_STYLES[event.status] ?? ""}
          >
            {STATUS_LABELS[event.status] ?? event.status}
          </Badge>
        </div>

        <h1 className="mt-3 text-3xl font-bold tracking-tight">
          {event.title}
        </h1>

        {event.category && (
          <p className="mt-1 text-sm capitalize text-muted-foreground">
            {event.category}
          </p>
        )}

        {event.summary && (
          <p className="mt-2 text-muted-foreground">{event.summary}</p>
        )}
      </div>

      <Separator className="my-6" />

      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm">
          <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
          <div>
            <p>{formatDate(event.startAt)}</p>
            {event.endAt && (
              <p className="text-muted-foreground">
                to {formatDate(event.endAt)}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <MapPinIcon className="size-4 shrink-0 text-muted-foreground" />
          <span>{event.locationName}</span>
        </div>

        {event.creator && (
          <div className="flex items-center gap-2 text-sm">
            <UserIcon className="size-4 shrink-0 text-muted-foreground" />
            <Link
              to="/users/$id"
              params={{ id: event.creator.id }}
              className="hover:underline"
            >
              {event.creator.displayName ?? event.creator.email}
            </Link>
          </div>
        )}

        {event.type === "GIG" && event.compensationAmount != null && (
          <div className="rounded-md border bg-muted/50 p-3">
            <p className="text-sm font-medium">Compensation</p>
            <p className="text-lg font-semibold">
              ${event.compensationAmount}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                {event.compensationType === "HOURLY" ? "per hour" : "fixed"}
              </span>
            </p>
          </div>
        )}
      </div>

      <Separator className="my-6" />

      <div>
        <h2 className="text-lg font-semibold">Description</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
          {event.description}
        </p>
      </div>

      {event.tags.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold">Tags</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {event.tags.map((tag: string) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {isCreator && (
        <>
          <Separator className="my-6" />
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Actions</h2>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild variant="outline" size="sm">
                <Link
                  to="/events/$eventId/edit"
                  params={{ eventId: event.id }}
                >
                  <PencilIcon className="mr-1 size-4" />
                  Edit
                </Link>
              </Button>

              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                <TrashIcon className="mr-1 size-4" />
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </Button>

              {validTransitions.length > 0 && (
                <Select
                  aria-label="Change status"
                  value=""
                  onChange={(e) => handleStatusChange(e.target.value)}
                  disabled={statusMutation.isPending}
                >
                  <option value="">Change status...</option>
                  {validTransitions.map((status) => (
                    <option key={status} value={status}>
                      {STATUS_LABELS[status] ?? status}
                    </option>
                  ))}
                </Select>
              )}
            </div>

            {statusMutation.error && (
              <p className="text-sm text-destructive">
                {statusMutation.error instanceof Error
                  ? statusMutation.error.message
                  : "Failed to update status"}
              </p>
            )}
            {deleteMutation.error && (
              <p className="text-sm text-destructive">
                {deleteMutation.error instanceof Error
                  ? deleteMutation.error.message
                  : "Failed to delete event"}
              </p>
            )}
          </div>
        </>
      )}
    </section>
  );
}
