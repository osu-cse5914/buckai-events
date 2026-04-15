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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ApplicationsListSkeleton } from "@/components/events/applications-list-skeleton";
import { EventsErrorState } from "@/components/events/events-browser";
import {
  YouSubpageHeader,
  YouSubpageHeaderSkeleton,
} from "@/components/you/you-subpage-header";
import { YouTabsNav } from "@/components/you/you-tabs-nav";

function useMyApplications() {
  const api = useApiClient();
  return useQuery<PaginatedResponse<MyApplication>>(myApplicationsQueryOptions(api));
}

export function MyApplicationsPage() {
  const { data, isLoading, error } = useMyApplications();
  const applications = data?.data ?? [];

  if (isLoading) {
    return (
      <section className="mx-auto max-w-5xl px-6 py-10">
        <YouSubpageHeaderSkeleton />
        <ApplicationsListSkeleton count={3} />
      </section>
    );
  }

  if (error) {
    return (
      <section className="mx-auto max-w-5xl px-6 py-10">
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
    <section className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-10">
      <YouTabsNav currentTab="applications" />

      <YouSubpageHeader
        title="Applications"
        description="Track the gigs you have applied to and their latest status."
        showBackLink={false}
        action={
          <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-medium">
            {applications.length} total
          </Badge>
        }
      />

      <div className="overflow-hidden rounded-2xl border bg-background">
        <div className="border-b px-6 py-5 sm:px-8">
          <p className="text-sm text-muted-foreground">Your submitted gigs</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight">
            {applications.length === 0 ? "No applications yet" : "Application history"}
          </h2>
        </div>

        {applications.length === 0 ? (
          <div className="px-6 py-10 sm:px-8">
            <p className="text-lg font-medium text-center">No applications yet</p>
            <p className="mt-2 text-sm text-center text-muted-foreground">
              Apply to a gig to see it here.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 px-6 py-6 sm:px-8">
            {applications.map((application) => (
              <Card key={application.id} className="gap-4">
                <CardHeader className="gap-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1.5">
                      <CardTitle>
                        <Link
                          to="/events/$eventId"
                          params={{ eventId: application.gig.id }}
                          className="hover:underline"
                        >
                          {application.gig.title}
                        </Link>
                      </CardTitle>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarIcon className="size-4" />
                          {formatDate(application.gig.startAt)}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <MapPinIcon className="size-4" />
                          {application.gig.locationName}
                        </span>
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className={APPLICATION_STATUS_STYLES[application.status]}
                    >
                      {APPLICATION_STATUS_LABELS[application.status] ??
                        application.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {application.message || "No message provided."}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
