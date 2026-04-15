import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeftIcon,
  CalendarIcon,
  ExternalLinkIcon,
  MapPinIcon,
  PencilIcon,
  TrashIcon,
  UserIcon,
} from "lucide-react";
import { useApiClient } from "@/lib/api";
import { recordInteraction } from "@/lib/interactions";
import {
  currentGigApplicationQueryOptions,
  currentUserQueryOptions,
  eventDetailQueryOptions,
  queryKeys,
  relatedEventsQueryOptions,
  type ApplicationSummary,
} from "@/lib/queries";
import type {
  BrowseRouteSearch,
  EventDetailRouteSearch,
  SearchRouteSearch,
} from "@/lib/event-route-search";
import {
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_STYLES,
  buildEventMetaLine,
  browsePathForEventType,
  formatDateLong,
  STATUS_LABELS,
} from "@/lib/event-utils";
import { STANDARD_PAGE_WIDTH } from "@/lib/page-layout";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { IconCircleButton } from "@/components/ui/icon-circle-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SaveToCollectionButton } from "@/components/collections/save-to-collection-button";
import { Label } from "@/components/ui/label";
import { MarkdownContent } from "@/components/ui/markdown-content";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  browsePath?: "/events" | "/gigs" | "/search" | "/featured" | "/you/collections/$collectionId";
  browseLabel?: string;
  browseSearch?: SearchRouteSearch | BrowseRouteSearch;
  detailSearch?: EventDetailRouteSearch;
  onDeleteSuccess?: () => void;
};

function toPreviousEventSearch(search: EventDetailRouteSearch) {
  return {
    returnTo: search.returnTo,
    q: search.q,
    type: search.type,
    category: search.category,
    tag: search.tag,
    page: search.page,
    browseType: search.browseType,
    statusMode: search.statusMode,
    source: search.source,
    sort: search.sort,
    selected: search.selected,
    collectionId: search.collectionId,
    collectionName: search.collectionName,
  } satisfies EventDetailRouteSearch;
}

function buildRelatedEventSearch({
  event,
  mode,
  detailSearch,
  browsePath,
  browseSearch,
}: {
  event: { id: string; title: string; type: string };
  mode: "page" | "panel";
  detailSearch?: EventDetailRouteSearch;
  browsePath?: "/events" | "/gigs" | "/search" | "/featured" | "/you/collections/$collectionId";
  browseSearch?: SearchRouteSearch | BrowseRouteSearch;
}) {
  if (mode === "page") {
    return {
      ...detailSearch,
      previousEventId: event.id,
      previousEventTitle: event.title,
    } satisfies EventDetailRouteSearch;
  }

  if (browsePath === "/search") {
    return {
      ...(browseSearch as SearchRouteSearch | undefined),
      returnTo: "search",
    } satisfies EventDetailRouteSearch;
  }

  if (browsePath === "/featured") {
    return {
      ...(browseSearch as SearchRouteSearch | undefined),
      returnTo: "featured",
    } satisfies EventDetailRouteSearch;
  }

  if (browsePath === "/you/collections/$collectionId") {
    return {
      ...(browseSearch as SearchRouteSearch | undefined),
      returnTo: "collections",
    } satisfies EventDetailRouteSearch;
  }

  return {
    ...(browseSearch as BrowseRouteSearch | undefined),
    returnTo: "browse",
    browseType: event.type === "GIG" ? "GIG" : "EVENT",
    selected: event.id,
  } satisfies EventDetailRouteSearch;
}

function buildEventDescription(event: {
  description: string;
  source: string;
  ticketUrl: string | null;
}) {
  const trimmedDescription = event.description.trim();

  if (event.source === "TICKETMASTER" && event.ticketUrl) {
    if (/ticketmaster\.com/i.test(trimmedDescription)) {
      return trimmedDescription;
    }

    const ticketmasterLink = `[View on Ticketmaster](${event.ticketUrl})`;

    return trimmedDescription
      ? `${trimmedDescription}\n\n${ticketmasterLink}`
      : `More details are available on ${ticketmasterLink} for this event.`;
  }

  return trimmedDescription || "Description unavailable.";
}

function normalizeDisplayTag(tag: string): string | null {
  const normalized = tag.trim().replace(/^#+/, "").trim();
  return normalized || null;
}

function buildDisplayTags(tags: string[]) {
  const seen = new Set<string>();
  const normalizedTags: string[] = [];

  for (const tag of tags) {
    const normalized = normalizeDisplayTag(tag);
    if (!normalized) {
      continue;
    }

    const dedupeKey = normalized.toLowerCase();
    if (seen.has(dedupeKey)) {
      continue;
    }

    seen.add(dedupeKey);
    normalizedTags.push(normalized);
  }

  return normalizedTags;
}

function normalizeSearchTag(tag: string) {
  return tag.trim().replace(/^#+/, "").trim().toLowerCase();
}

export function EventDetailSurface({
  eventId,
  mode = "page",
  browsePath,
  browseLabel,
  browseSearch,
  detailSearch,
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
  const showGigApplicationSection = !!(
    event &&
    currentUser &&
    event.type === "GIG" &&
    currentUser.id !== event.creatorId
  );
  const canApplyToGig = !!(showGigApplicationSection && event?.status === "OPEN");
  const applicationsQuery = useQuery({
    ...currentGigApplicationQueryOptions(api, eventId),
    enabled: showGigApplicationSection,
  });
  const relatedEventsQuery = useQuery({
    ...relatedEventsQueryOptions(api, eventId, 3),
    enabled: !!event,
  });
  const eventDescription = event ? buildEventDescription(event) : "";
  const displayTags = event ? buildDisplayTags(event.tags) : [];
  const relatedEvents = relatedEventsQuery.data?.data ?? [];
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
  const lastRecordedViewEventId = useRef<string | null>(null);

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

      const deleteBrowsePath = browsePath ?? browsePathForEventType(event?.type);
      const deleteBrowseSearch = browseSearch;

      navigate({
        to: deleteBrowsePath,
        search: deleteBrowseSearch as never,
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

  useEffect(() => {
    if (!event?.id || error || isLoading) {
      return;
    }

    if (lastRecordedViewEventId.current === event.id) {
      return;
    }

    lastRecordedViewEventId.current = event.id;
    recordInteraction(api, {
      eventId: event.id,
      action: "VIEW",
    });
  }, [api, error, event?.id, isLoading]);

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
        <Skeleton className="h-4 w-32" />
        <div className="mt-6 flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
          <Skeleton className="size-9 rounded-full" />
        </div>

        <div className="my-6 h-px bg-border" />

        <div className="space-y-4">
          <Skeleton className="h-5 w-56" />
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-5 w-36" />
        </div>

        <div className="my-6 h-px bg-border" />

        <div className="space-y-3">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
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
    const fallbackBrowseSearch = browseSearch;
    return (
      <section className={surfaceClassName(mode)}>
        <h1 className="text-2xl font-bold">Event not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This event does not exist or has been removed.
        </p>
        <div className="mt-4 flex items-center gap-3">
          {isPageMode ? (
            <Button asChild>
              <Link
                to={fallbackBrowsePath}
                search={fallbackBrowseSearch as never}
              >
                Back to {fallbackBrowseLabel}
              </Link>
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
  const resolvedBrowseSearch = browseSearch;
  const resolvedBrowseLabel =
    browseLabel ??
    (resolvedBrowsePath === "/search"
      ? "Search results"
      : resolvedBrowsePath === "/you/collections/$collectionId"
        ? detailSearch?.collectionName ?? "Collection"
      : resolvedBrowsePath === "/featured"
        ? "Featured"
      : event.type === "GIG"
        ? "Gigs"
        : "Events");
  const previousEventSearch = detailSearch ? toPreviousEventSearch(detailSearch) : undefined;
  const relatedEventSearch = buildRelatedEventSearch({
    event,
    mode,
    detailSearch,
    browsePath,
    browseSearch,
  });
  const validTransitions = VALID_TRANSITIONS[event.status] || [];
  const currentApplication =
    submittedApplication ?? applicationsQuery.data ?? null;
  const hasApplied = !!currentApplication;

  return (
    <section className={surfaceClassName(mode)}>
      {isPageMode ? (
        detailSearch?.previousEventId ? (
          <Link
            to="/events/$eventId"
            params={{ eventId: detailSearch.previousEventId }}
            search={previousEventSearch as never}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeftIcon className="size-4" />
            Back to {detailSearch.previousEventTitle ?? "previous event"}
          </Link>
        ) : detailSearch?.returnTo === "collections" && detailSearch.collectionId ? (
          <Link
            to="/you/collections/$collectionId"
            params={{ collectionId: detailSearch.collectionId }}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeftIcon className="size-4" />
            Back to {detailSearch.collectionName ?? "Collection"}
          </Link>
        ) : (
          <Link
            to={resolvedBrowsePath}
            search={resolvedBrowseSearch as never}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeftIcon className="size-4" />
            Back to {resolvedBrowseLabel}
          </Link>
        )
      ) : null}

      <div className={cn(isPageMode ? "mt-6" : "")}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted-foreground">
              {buildEventMetaLine({
                type: event.type,
                source: event.source,
                category: event.category,
                status: event.status,
              })}
            </p>

            <h1 className="mt-3 text-3xl font-bold tracking-tight">{event.title}</h1>

            {event.summary ? (
              <p className="mt-2 text-muted-foreground">{event.summary}</p>
            ) : null}
          </div>

          <div className="mt-0.5 flex shrink-0 items-center gap-2">
            {isCreator && event.type === "GIG" ? (
              <IconCircleButton asChild variant="outline" aria-label="Manage applications" title="Manage applications" icon={<UserIcon className="size-4" />}>
                <Link
                  to="/events/$eventId/applications"
                  params={{ eventId: event.id }}
                >
                  <UserIcon className="size-4" />
                  <span className="sr-only">Manage applications</span>
                </Link>
              </IconCircleButton>
            ) : null}

            {isCreator ? (
              <IconCircleButton asChild variant="outline" aria-label="Edit event" title="Edit event" icon={<PencilIcon className="size-4" />}>
                <Link
                  to="/events/$eventId/edit"
                  params={{ eventId: event.id }}
                >
                  <PencilIcon className="size-4" />
                  <span className="sr-only">Edit event</span>
                </Link>
              </IconCircleButton>
            ) : null}

            {isCreator ? (
              <DeleteConfirmDialog
                title="Delete event"
                description="Are you sure you want to delete this event? This action cannot be undone."
                onConfirm={() => deleteMutation.mutate()}
                trigger={
                  <IconCircleButton
                    variant="outline"
                    aria-label="Delete"
                    title="Delete event"
                    icon={<TrashIcon className="size-4" />}
                    className="border-destructive/30 text-destructive hover:text-destructive"
                    disabled={deleteMutation.isPending}
                  >
                    <span className="sr-only">
                      {deleteMutation.isPending ? "Deleting" : "Delete"}
                    </span>
                  </IconCircleButton>
                }
              />
            ) : null}

            <SaveToCollectionButton eventId={event.id} variant="outline" className="mt-0" />
          </div>
        </div>
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

      {isCreator && validTransitions.length > 0 ? (
        <div className="mt-6 flex flex-wrap items-center gap-3">
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
      ) : null}

      <Separator className="my-6" />

      <div>
        <h2 className="text-lg font-semibold">Description</h2>
        <MarkdownContent className="mt-2">
          {eventDescription}
        </MarkdownContent>
      </div>

      {event.ticketUrl ? (
        <>
          <Separator className="my-6" />
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild>
              <a
                href={event.ticketUrl}
                target="_blank"
                rel="noreferrer"
                onClick={() => {
                  recordInteraction(api, {
                    eventId: event.id,
                    action: "CLICK",
                  });
                }}
              >
                <ExternalLinkIcon className="mr-2 size-4" />
                Get tickets
              </a>
            </Button>
          </div>
        </>
      ) : null}

      {showGigApplicationSection ? (
        <>
          <Separator className="my-6" />
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Application</h2>
                <p className="text-sm text-muted-foreground">
                  {canApplyToGig
                    ? "Send a short message to the gig owner."
                    : "Applications are closed for this gig."}
                </p>
              </div>
              {canApplyToGig ? (
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
              ) : null}
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

      {displayTags.length > 0 ? (
        <div className="mt-6">
          <h2 className="text-lg font-semibold">Tags</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {displayTags.map((tag) => (
              <Badge key={tag} variant="outline" asChild>
                <Link
                  to="/search"
                  search={{ tag: normalizeSearchTag(tag) }}
                >
                  {tag}
                </Link>
              </Badge>
            ))}
          </div>
        </div>
      ) : null}

      {relatedEvents.length > 0 ? (
        <div className="mt-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold">You might also be interested in</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {relatedEvents.map((relatedEvent) => (
              <Link
                key={relatedEvent.id}
                to="/events/$eventId"
                params={{ eventId: relatedEvent.id }}
                search={relatedEventSearch as never}
                className="h-full rounded-xl border p-4 transition-colors hover:bg-muted/30"
              >
                <p className="font-medium leading-tight">{relatedEvent.title}</p>
                {relatedEvent.summary ?? relatedEvent.category ? (
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {relatedEvent.summary ?? relatedEvent.category}
                  </p>
                ) : null}
                <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <CalendarIcon className="size-3.5 shrink-0" />
                    <span>{formatDateLong(relatedEvent.startAt)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPinIcon className="size-3.5 shrink-0" />
                    <span>{relatedEvent.locationName}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

    </section>
  );
}

function surfaceClassName(mode: "page" | "panel") {
  return cn(
    mode === "page"
      ? `${STANDARD_PAGE_WIDTH} py-10`
      : "px-6 py-6 lg:px-8 lg:py-8",
  );
}
