import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon } from "lucide-react";
import { api } from "@/lib/api";
import {
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_STYLES,
} from "@/lib/event-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute(
  "/_authenticated/events/$eventId/applications/",
)({
  component: ManageApplicationsPage,
});

type GigApplication = {
  id: string;
  message: string | null;
  status: string;
  applicant: {
    id: string;
    displayName: string | null;
    email: string;
  };
};

type DecisionResponse = {
  id: string;
  message: string | null;
  status: string;
};

type ApplicationsResponse = {
  data: GigApplication[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
};

type EventRecord = {
  id: string;
  title: string;
  type: string;
  creatorId: string | null;
};

function useEvent(eventId: string) {
  return useQuery<EventRecord | null>({
    queryKey: ["event", eventId],
    queryFn: async () => {
      const res = await api.api.v1.events[":id"].$get({
        param: { id: eventId },
      });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to load event");
      return res.json() as Promise<EventRecord>;
    },
  });
}

function useCurrentUser() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const res = await api.api.v1.users.me.$get();
      if (!res.ok) throw new Error("Failed to load profile");
      return res.json() as Promise<{ id: string; email: string }>;
    },
  });
}

function useApplications(eventId: string, enabled: boolean) {
  return useQuery<ApplicationsResponse>({
    queryKey: ["gig-applications", eventId],
    enabled,
    queryFn: async () => {
      const res = await api.api.v1.gigs[":gigId"].applications.$get({
        param: { gigId: eventId },
      });
      if (!res.ok) throw new Error("Failed to load applications");
      return res.json() as Promise<ApplicationsResponse>;
    },
  });
}

function ManageApplicationsPage() {
  const { eventId } = Route.useParams();
  const queryClient = useQueryClient();
  const { data: event, isLoading: eventLoading, error: eventError } =
    useEvent(eventId);
  const { data: currentUser, isLoading: userLoading, error: userError } =
    useCurrentUser();

  const isOwner = !!(event && currentUser && event.creatorId === currentUser.id);
  const applicationsQuery = useApplications(eventId, !!event && !!currentUser);

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
      queryClient.setQueryData<ApplicationsResponse | undefined>(
        ["gig-applications", eventId],
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
      queryClient.invalidateQueries({ queryKey: ["my-applications"] });
    },
  });

  if (eventLoading || userLoading) {
    return (
      <section className="mx-auto max-w-4xl px-6 py-10">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="mt-6 h-8 w-64" />
        <div className="mt-6 grid gap-4">
          {Array.from({ length: 2 }).map((_, index) => (
            <Card key={index}>
              <CardHeader>
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-28" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="mt-4 h-9 w-48" />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    );
  }

  if (eventError || userError || !event) {
    return (
      <section className="mx-auto max-w-4xl px-6 py-10">
        <div className="rounded-md border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          {eventError instanceof Error
            ? eventError.message
            : userError instanceof Error
              ? userError.message
              : "Failed to load applications"}
        </div>
      </section>
    );
  }

  if (!isOwner) {
    return (
      <section className="mx-auto max-w-4xl px-6 py-10">
        <div className="rounded-md border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          Only the gig owner can manage applications.
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-4xl px-6 py-10">
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
        <div className="mt-8 grid gap-4">
          {Array.from({ length: 2 }).map((_, index) => (
            <Card key={index}>
              <CardHeader>
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-28" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="mt-4 h-9 w-48" />
              </CardContent>
            </Card>
          ))}
        </div>
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
