import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeftIcon,
  CalendarIcon,
  MapPinIcon,
  PencilIcon,
  TrashIcon,
  UserIcon,
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
  browsePathForEventType,
  formatDateLong,
  STATUS_LABELS,
  STATUS_STYLES,
  TYPE_STYLES,
} from "@/lib/event-utils";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

const VALID_TRANSITIONS: Record<string, string[]> = {
  OPEN: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

type EventDetailSurfaceProps = {
  eventId: string;
  mode?: "page" | "panel";
  browsePath?: "/events" | "/gigs";
  browseLabel?: string;
  onDeleteSuccess?: () => void;
};

export function EventDetailSurface({
  eventId,
  mode = "page",
  browsePath,
  browseLabel,
  onDeleteSuccess,
}: EventDetailSurfaceProps) {
  const api = useApiClient();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isPageMode = mode === "page";

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
  const [statusValue, setStatusValue] = useState("");
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
      const patchEvent = api.api.v1.events[":id"].$patch as (args: {
        param: { id: string };
        json: { status: string };
      }) => Promise<Response>;
      const res = await patchEvent({
        param: { id: eventId },
        json: { status },
      });
      if (!res.ok) {
        throw new Error("Failed to update status");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.event(eventId) });
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await api.api.v1.events[":id"].$delete({
        param: { id: eventId },
      });
      if (!res.ok) {
        throw new Error("Failed to delete event");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      if (onDeleteSuccess) {
        onDeleteSuccess();
        return;
      }

      navigate({
        to: browsePathForEventType(event?.type),
      });
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
          if (body.detail) {
            detail = body.detail;
          }
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
    onError: (mutationError) => {
      setApplyErrorMessage(
        mutationError instanceof Error
          ? mutationError.message
          : "Failed to submit application",
      );
    },
  });

  function handleStatusChange(newStatus: string) {
    if (!newStatus) {
      return;
    }

    statusMutation.mutate(newStatus);
    setStatusValue("");
  }

  function handleApplySubmit(submitEvent: React.FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();
    setApplyErrorMessage(null);
    setApplySuccessMessage(null);
    applyMutation.mutate(applyMessage);
  }

  if (isLoading) {
    return (
      <section className={surfaceClassName(mode)}>
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
      <section className={surfaceClassName(mode)}>
        <div className="rounded-md border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          {error instanceof Error ? error.message : "Failed to load event"}
        </div>
      </section>
    );
  }

  if (!event) {
    const fallbackBrowsePath = browsePath ?? "/events";
    const fallbackBrowseLabel = browseLabel ?? "Events";
    return (
      <section className={surfaceClassName(mode)}>
        <h1 className="text-2xl font-bold">Event not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This event does not exist or has been removed.
        </p>
        <div className="mt-4 flex items-center gap-3">
          {isPageMode ? (
            <Button asChild>
              <Link to={fallbackBrowsePath}>Back to {fallbackBrowseLabel}</Link>
            </Button>
          ) : null}
          {!isPageMode ? (
            <p className="text-sm text-muted-foreground">
              Choose another listing from the left to continue browsing.
            </p>
          ) : null}
        </div>
      </section>
    );
  }

  const resolvedBrowsePath = browsePath ?? browsePathForEventType(event.type);
  const resolvedBrowseLabel =
    browseLabel ?? (event.type === "GIG" ? "Gigs" : "Events");
  const validTransitions = VALID_TRANSITIONS[event.status] || [];
  const currentApplication =
    submittedApplication ?? applicationsQuery.data ?? null;
  const hasApplied = !!currentApplication;

  return (
    <section className={surfaceClassName(mode)}>
      {isPageMode ? (
        <Link
          to={resolvedBrowsePath}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" />
          Back to {resolvedBrowseLabel}
        </Link>
      ) : null}

      <div className={cn(isPageMode ? "mt-6" : "")}>
        <div className="flex items-center gap-2">
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

        <h1 className="mt-3 text-3xl font-bold tracking-tight">{event.title}</h1>

        {event.category ? (
          <p className="mt-1 text-sm capitalize text-muted-foreground">
            {event.category}
          </p>
        ) : null}

        {event.summary ? (
          <p className="mt-2 text-muted-foreground">{event.summary}</p>
        ) : null}
      </div>

      <Separator className="my-6" />

      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm">
          <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
          <div>
            <p>{formatDateLong(event.startAt)}</p>
            {event.endAt ? (
              <p className="text-muted-foreground">
                to {formatDateLong(event.endAt)}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <MapPinIcon className="size-4 shrink-0 text-muted-foreground" />
          <span>{event.locationName}</span>
        </div>

        {event.creator ? (
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
        ) : null}

        {event.type === "GIG" && event.compensationAmount != null ? (
          <div className="rounded-md border bg-muted/50 p-3">
            <p className="text-sm font-medium">Compensation</p>
            <p className="text-lg font-semibold">
              ${event.compensationAmount}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                {event.compensationType === "HOURLY" ? "per hour" : "fixed"}
              </span>
            </p>
          </div>
        ) : null}
      </div>

      <Separator className="my-6" />

      <div>
        <h2 className="text-lg font-semibold">Description</h2>
        <MarkdownContent className="mt-2">
          {event.description}
        </MarkdownContent>
      </div>

      {showGigApplication ? (
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
                        onChange={(eventValue) =>
                          setApplyMessage(eventValue.target.value)
                        }
                        placeholder="Share relevant experience or availability"
                      />
                    </div>
                    {applyErrorMessage ? (
                      <p className="text-sm text-destructive">
                        {applyErrorMessage}
                      </p>
                    ) : null}
                    <DialogFooter>
                      <Button type="submit" disabled={applyMutation.isPending}>
                        {applyMutation.isPending
                          ? "Submitting..."
                          : "Submit application"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {currentApplication ? (
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
            ) : null}
            {applySuccessMessage ? (
              <p className="text-sm text-emerald-700">{applySuccessMessage}</p>
            ) : null}
            {applicationsQuery.error && !applyErrorMessage ? (
              <p className="text-sm text-destructive">
                {applicationsQuery.error instanceof Error
                  ? applicationsQuery.error.message
                  : "Failed to load application status"}
              </p>
            ) : null}
          </div>
        </>
      ) : null}

      {event.tags.length > 0 ? (
        <div className="mt-6">
          <h2 className="text-lg font-semibold">Tags</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {event.tags.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}

      {isCreator ? (
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

              {event.type === "GIG" ? (
                <Button asChild variant="outline" size="sm">
                  <Link
                    to="/events/$eventId/applications"
                    params={{ eventId: event.id }}
                  >
                    Manage Applications
                  </Link>
                </Button>
              ) : null}

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

              {validTransitions.length > 0 ? (
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
              ) : null}
            </div>

            {statusMutation.error ? (
              <p className="text-sm text-destructive">
                {statusMutation.error instanceof Error
                  ? statusMutation.error.message
                  : "Failed to update status"}
              </p>
            ) : null}
            {deleteMutation.error ? (
              <p className="text-sm text-destructive">
                {deleteMutation.error instanceof Error
                  ? deleteMutation.error.message
                  : "Failed to delete event"}
              </p>
            ) : null}
          </div>
        </>
      ) : null}
    </section>
  );
}

function surfaceClassName(mode: "page" | "panel") {
  return cn(
    mode === "page"
      ? "mx-auto max-w-3xl px-6 py-10"
      : "px-6 py-6 lg:px-8 lg:py-8",
  );
}
