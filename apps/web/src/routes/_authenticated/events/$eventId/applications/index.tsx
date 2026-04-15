import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon } from "lucide-react";
import { useApiClient } from "@/lib/api";
import { STANDARD_PAGE_WIDTH } from "@/lib/page-layout";
import { loadOwnedEventRouteData } from "@/lib/route-loaders";
import {
  gigApplicationsQueryOptions,
  queryKeys,
  type GigApplication,
  type PaginatedResponse,
} from "@/lib/queries";
import {
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_STYLES,
} from "@/lib/event-utils";
import { ApplicationsListSkeleton } from "@/components/events/applications-list-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute(
  "/_authenticated/events/$eventId/applications/",
)({
  loader: ({ context, params }) =>
    loadOwnedEventRouteData({
      api: context.api,
      queryClient: context.queryClient,
      eventId: params.eventId,
      requireGig: true,
    }),
  component: ManageApplicationsPage,
});

type DecisionResponse = {
  id: string;
  message: string | null;
  status: string;
};

function ManageApplicationsPage() {
  const api = useApiClient();
  const { eventId } = Route.useParams();
  const { access, event } = Route.useLoaderData();
  const queryClient = useQueryClient();
  const applicationsQuery = useQuery({
    ...gigApplicationsQueryOptions(api, eventId),
    enabled: access === "ok",
  });

  const decisionMutation = useMutation({
    mutationFn: async ({
      appId,
      status,
    }: {
      appId: string;
      status: "ACCEPTED" | "REJECTED";
    }) => {
      const patchApplication =
        api.api.v1.gigs[":gigId"].applications[":appId"].$patch as (args: {
          param: { gigId: string; appId: string };
          json: { status: "ACCEPTED" | "REJECTED" };
        }) => Promise<Response>;
      const res = await patchApplication({
        param: { gigId: eventId, appId },
        json: { status },
      });
      if (!res.ok) throw new Error("Failed to update application");
      return res.json() as Promise<DecisionResponse>;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<PaginatedResponse<GigApplication> | undefined>(
        queryKeys.gigApplications(eventId),
        (current) =>
          current
            ? {
                ...current,
                data: current.data.map((application) =>
                  application.id === updated.id
                    ? { ...application, ...updated }
                    : application,
                ),
              }
            : current,
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.myApplications });
    },
  });

  if (access === "not-found" || !event) {
    return (
      <section className={`${STANDARD_PAGE_WIDTH} py-10`}>
        <div className="rounded-md border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load applications
        </div>
      </section>
    );
  }

  if (access !== "ok") {
    return (
      <section className={`${STANDARD_PAGE_WIDTH} py-10`}>
        <div className="rounded-md border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          Only the gig owner can manage applications.
        </div>
      </section>
    );
  }

  return (
    <section className={`${STANDARD_PAGE_WIDTH} py-10`}>
      <Link
        to="/events/$eventId"
        params={{ eventId }}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        Back to Event
      </Link>

      <div className="mt-6 space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">
          Manage Applications
        </h1>
        <p className="text-sm text-muted-foreground">{event.title}</p>
      </div>

      {applicationsQuery.isLoading ? (
        <ApplicationsListSkeleton count={2} showActions />
      ) : applicationsQuery.error ? (
        <div className="mt-8 rounded-md border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          {applicationsQuery.error instanceof Error
            ? applicationsQuery.error.message
            : "Failed to load applications"}
        </div>
      ) : applicationsQuery.data && applicationsQuery.data.data.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed p-8 text-center">
          <p className="text-lg font-medium">No applications yet</p>
          <p className="mt-2 text-sm text-muted-foreground">
            New gig applications will appear here.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-4">
          {applicationsQuery.data?.data.map((application) => {
            const isPending = application.status === "PENDING";
            const isUpdating =
              decisionMutation.isPending &&
              decisionMutation.variables?.appId === application.id;

            return (
              <Card key={application.id}>
                <CardHeader className="gap-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <CardTitle>
                        {application.applicant.displayName ||
                          application.applicant.email}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {application.applicant.email}
                      </p>
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
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {application.message || "No message provided."}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() =>
                        decisionMutation.mutate({
                          appId: application.id,
                          status: "ACCEPTED",
                        })
                      }
                      disabled={!isPending || isUpdating}
                    >
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        decisionMutation.mutate({
                          appId: application.id,
                          status: "REJECTED",
                        })
                      }
                      disabled={!isPending || isUpdating}
                    >
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
