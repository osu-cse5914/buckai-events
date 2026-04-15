import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarIcon, MapPinIcon } from "lucide-react";
import { useApiClient } from "@/lib/api";
import {
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_STYLES,
  formatDate,
} from "@/lib/event-utils";
import {
  myApplicationsQueryOptions,
  type MyApplication,
  type PaginatedResponse,
} from "@/lib/queries";
import { Badge } from "@/components/ui/badge";
import { ApplicationsListSkeleton } from "@/components/events/applications-list-skeleton";
import { EventsErrorState } from "@/components/events/events-browser";
import {
  FramedList,
  FramedListInset,
  FramedListItem,
  FramedListItems,
} from "@/components/ui/framed-list";
import {
  YouSubpageHeader,
  YouSubpageHeaderSkeleton,
} from "@/components/you/you-subpage-header";
import { YouTabsNav } from "@/components/you/you-tabs-nav";
import { STANDARD_PAGE_WIDTH } from "@/lib/page-layout";
import { cn } from "@/lib/utils";

function useMyApplications() {
  const api = useApiClient();
  return useQuery<PaginatedResponse<MyApplication>>(myApplicationsQueryOptions(api));
}

export function MyApplicationsPage() {
  const { data, isLoading, error } = useMyApplications();
  const applications = data?.data ?? [];

  if (isLoading) {
    return (
      <section className={cn(STANDARD_PAGE_WIDTH, "py-10")}>
        <YouSubpageHeaderSkeleton />
        <ApplicationsListSkeleton count={3} />
      </section>
    );
  }

  if (error) {
    return (
      <section className={cn(STANDARD_PAGE_WIDTH, "py-10")}>
        <EventsErrorState
          message={
            error instanceof Error ? error.message : "Failed to load applications"
          }
          className="mt-0"
        />
      </section>
    );
  }

  return (
    <section className={cn(STANDARD_PAGE_WIDTH, "flex flex-col gap-6 py-10")}>
      <YouTabsNav currentTab="applications" />

      <YouSubpageHeader
        title="Applications"
        showBackLink={false}
        action={applications.length > 0 ? (
          <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-medium">
            {applications.length} total
          </Badge>
        ) : undefined}
      />

      <FramedList>
        {applications.length === 0 ? (
          <FramedListInset>
            <p className="text-lg font-medium text-center">No applications yet</p>
            <p className="mt-2 text-sm text-center text-muted-foreground">
              Apply to a gig to see it here.
            </p>
          </FramedListInset>
        ) : (
          <FramedListItems>
            {applications.map((application) => (
              <FramedListItem key={application.id}>
                <div className="flex items-start gap-3">
                  <Link
                    to="/events/$eventId"
                    params={{ eventId: application.gig.id }}
                    className="min-w-0 flex-1"
                  >
                    <div className="min-w-0 space-y-1.5">
                      <p className="truncate text-sm text-muted-foreground">Gig application</p>
                      <h2 className="line-clamp-2 text-base font-semibold leading-tight">
                        {application.gig.title}
                      </h2>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <MapPinIcon className="size-3.5 shrink-0" />
                        <span className="truncate">{application.gig.locationName}</span>
                      </span>
                    </div>

                    <div className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
                      <CalendarIcon className="size-3.5 shrink-0" />
                      <span>{formatDate(application.gig.startAt)}</span>
                    </div>

                    <p className="mt-3 text-sm text-muted-foreground">
                      {application.message || "No message provided."}
                    </p>
                  </Link>

                  <div className="flex shrink-0 items-start gap-2">
                    <Badge
                      variant="secondary"
                      className={APPLICATION_STATUS_STYLES[application.status]}
                    >
                      {APPLICATION_STATUS_LABELS[application.status] ??
                        application.status}
                    </Badge>
                  </div>
                </div>
              </FramedListItem>
            ))}
          </FramedListItems>
        )}
      </FramedList>
    </section>
  );
}
