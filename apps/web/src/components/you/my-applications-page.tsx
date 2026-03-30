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
import { Skeleton } from "@/components/ui/skeleton";

function useMyApplications() {
  const api = useApiClient();
  return useQuery<PaginatedResponse<MyApplication>>(myApplicationsQueryOptions(api));
}

export function MyApplicationsPage() {
  const { data, isLoading, error } = useMyApplications();

  if (isLoading) {
    return (
      <section className="mx-auto max-w-4xl px-6 py-10">
        <Skeleton className="h-8 w-48" />
        <div className="mt-6 grid gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index}>
              <CardHeader>
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="mt-2 h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mx-auto max-w-4xl px-6 py-10">
        <div className="rounded-md border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          {error instanceof Error ? error.message : "Failed to load applications"}
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-4xl px-6 py-10">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Your Applications</h1>
        <p className="text-sm text-muted-foreground">
          Track the gigs you have applied to and their current statuses.
        </p>
      </div>

      {data && data.data.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed p-8 text-center">
          <p className="text-lg font-medium">No applications yet</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Apply to a gig from its detail page and it will appear here.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-4">
          {data?.data.map((application) => (
            <Card key={application.id}>
              <CardHeader className="gap-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
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
    </section>
  );
}
