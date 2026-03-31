import { useState } from "react";
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
import { useApiClient } from "@/lib/api";
import {
  currentGigApplicationQueryOptions,
  currentUserQueryOptions,
  eventDetailQueryOptions,
  queryKeys,
  type ApplicationSummary,
} from "@/lib/queries";
import {
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_STYLES,
  STATUS_STYLES,
  STATUS_LABELS,
  TYPE_STYLES,
  formatDateLong,
} from "@/lib/event-utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/events/$eventId/")({
  component: EventDetailPage,
});

const VALID_TRANSITIONS: Record<string, string[]> = {
  OPEN: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

function EventDetailPage() {
  const api = useApiClient();
  const { eventId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: event, isLoading, error } = useQuery(
    eventDetailQueryOptions(api, eventId),
  );
  const { data: currentUser } = useQuery(currentUserQueryOptions(api));

  const isCreator = !!(
    currentUser &&
    event &&
    currentUser.id === event.creatorId &&
    event.source === "USER"
  );
  const showGigApplication = !!(
    event &&
    currentUser &&
    event.type === "GIG" &&
    currentUser.id !== event.creatorId
  );
  const applicationsQuery = useQuery({
    ...currentGigApplicationQueryOptions(api, eventId),
    enabled: showGigApplication,
  });
  const [statusValue, setStatusValue] = useState<string>("");
  const [isApplyDialogOpen, setIsApplyDialogOpen] = useState(false);
  const [applyMessage, setApplyMessage] = useState("");
  const [applyErrorMessage, setApplyErrorMessage] = useState<string | null>(
    null,
  );
  const [applySuccessMessage, setApplySuccessMessage] = useState<string | null>(
    null,
  );
  const [submittedApplication, setSubmittedApplication] =
    useState<ApplicationSummary | null>(null);

  const statusMutation = useMutation({
    mutationFn: async (status: string) => {
      const arg = { param: { id: eventId }, json: { status } };
      const res = await api.api.v1.events[":id"].$patch(arg);
      if (!res.ok) throw new Error("Failed to update status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.event(eventId) });
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
      navigate({ to: "/catalog" });
    },
  });
  const applyMutation = useMutation({
    mutationFn: async (message: string) => {
      const postApplication = api.api.v1.gigs[":gigId"].applications.$post as (
        args: {
          param: { gigId: string };
          json: { message: string };
        },
      ) => Promise<Response>;
      const res = await postApplication({
        param: { gigId: eventId },
        json: { message },
      });

      if (!res.ok) {
        let detail = "Failed to submit application";
        try {
          const body = (await res.json()) as { detail?: string };
          if (body.detail) detail = body.detail;
        } catch {
          // Keep fallback message.
        }
        throw new Error(detail);
      }

      return res.json() as Promise<ApplicationSummary>;
    },
    onSuccess: (application) => {
      setSubmittedApplication(application);
      setApplyMessage("");
      setApplyErrorMessage(null);
      setApplySuccessMessage("Application submitted.");
      setIsApplyDialogOpen(false);
      queryClient.invalidateQueries({
        queryKey: queryKeys.gigApplicationStatus(eventId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.myApplications });
    },
    onError: (error) => {
      setApplyErrorMessage(
        error instanceof Error ? error.message : "Failed to submit application",
      );
    },
  });

  function handleStatusChange(newStatus: string) {
    if (newStatus) {
      statusMutation.mutate(newStatus);
      setStatusValue("");
    }
  }

  function handleApplySubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setApplyErrorMessage(null);
    setApplySuccessMessage(null);
    applyMutation.mutate(applyMessage);
  }

  if (isLoading) {
    return (
      <section className="mx-auto max-w-3xl px-6 py-10">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-6 h-6 w-32" />
        <Skeleton className="mt-3 h-8 w-1/2" />
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
          <Link to="/catalog">Back to Catalog</Link>
        </Button>
      </section>
    );
  }

  const validTransitions = VALID_TRANSITIONS[event.status] || [];
  const currentApplication = submittedApplication ?? applicationsQuery.data ?? null;
  const hasApplied = !!currentApplication;

  return (
    <section className="mx-auto max-w-3xl px-6 py-10">
      <Link
        to="/catalog"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        Back to Catalog
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
            <p>{formatDateLong(event.startAt)}</p>
            {event.endAt && (
              <p className="text-muted-foreground">
                to {formatDateLong(event.endAt)}
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

      {showGigApplication && (
        <>
          <Separator className="my-6" />
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Application</h2>
                <p className="text-sm text-muted-foreground">
                  Send a short message to the gig owner.
                </p>
              </div>
              <Dialog
                open={isApplyDialogOpen}
                onOpenChange={setIsApplyDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button
                    disabled={
                      hasApplied ||
                      applyMutation.isPending ||
                      applicationsQuery.isLoading
                    }
                  >
                    {hasApplied ? "Applied" : "Apply"}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Apply to this gig</DialogTitle>
                    <DialogDescription>
                      Include any context that helps the owner evaluate your
                      application.
                    </DialogDescription>
                  </DialogHeader>
                  <form className="space-y-4" onSubmit={handleApplySubmit}>
                    <div className="space-y-2">
                      <Label htmlFor="application-message">
                        Message (optional)
                      </Label>
                      <Textarea
                        id="application-message"
                        value={applyMessage}
                        onChange={(e) => setApplyMessage(e.target.value)}
                        placeholder="Share relevant experience or availability"
                      />
                    </div>
                    {applyErrorMessage && (
                      <p className="text-sm text-destructive">
                        {applyErrorMessage}
                      </p>
                    )}
                    <DialogFooter>
                      <Button
                        type="submit"
                        disabled={applyMutation.isPending}
                      >
                        {applyMutation.isPending
                          ? "Submitting..."
                          : "Submit application"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {currentApplication && (
              <div className="flex items-center gap-2 text-sm">
                <Badge
                  variant="secondary"
                  className={APPLICATION_STATUS_STYLES[currentApplication.status]}
                >
                  {APPLICATION_STATUS_LABELS[currentApplication.status] ??
                    currentApplication.status}
                </Badge>
                <span className="text-muted-foreground">
                  You have already applied to this gig.
                </span>
              </div>
            )}
            {applySuccessMessage && (
              <p className="text-sm text-emerald-700">{applySuccessMessage}</p>
            )}
            {applicationsQuery.error && !applyErrorMessage && (
              <p className="text-sm text-destructive">
                {applicationsQuery.error instanceof Error
                  ? applicationsQuery.error.message
                  : "Failed to load application status"}
              </p>
            )}
          </div>
        </>
      )}

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

              {event.type === "GIG" && (
                <Button asChild variant="outline" size="sm">
                  <Link
                    to="/events/$eventId/applications"
                    params={{ eventId: event.id }}
                  >
                    Manage Applications
                  </Link>
                </Button>
              )}

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={deleteMutation.isPending}
                  >
                    <TrashIcon className="mr-1 size-4" />
                    {deleteMutation.isPending ? "Deleting..." : "Delete"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete event</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this event? This action
                      cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      variant="destructive"
                      onClick={() => deleteMutation.mutate()}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {validTransitions.length > 0 && (
                <Select
                  value={statusValue || undefined}
                  onValueChange={handleStatusChange}
                  disabled={statusMutation.isPending}
                >
                  <SelectTrigger className="w-auto">
                    <SelectValue placeholder="Change status..." />
                  </SelectTrigger>
                  <SelectContent>
                    {validTransitions.map((status) => (
                      <SelectItem key={status} value={status}>
                        {STATUS_LABELS[status] ?? status}
                      </SelectItem>
                    ))}
                  </SelectContent>
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
