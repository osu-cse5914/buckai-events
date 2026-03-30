import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/lib/api";
import {
  currentUserQueryOptions,
  type CurrentUser,
} from "@/lib/queries";
import { Button } from "@/components/ui/button";
import {
  EventsEmptyState,
  EventsErrorState,
  EventsGrid,
  EventsLoadingGrid,
  EventsPagination,
  useEventsQuery,
} from "@/components/events/events-browser";

function useCurrentUser() {
  const api = useApiClient();
  return useQuery<CurrentUser>(currentUserQueryOptions(api));
}

export function YouEventsPage() {
  const [page, setPage] = useState(0);
  const {
    data: currentUser,
    isLoading: isLoadingUser,
    error: userError,
  } = useCurrentUser();
  const {
    data,
    isLoading: isLoadingEvents,
    isError,
    error,
  } = useEventsQuery(
    {
      userId: currentUser?.id,
    },
    page,
    Boolean(currentUser?.id),
  );

  if (isLoadingUser || isLoadingEvents) {
    return (
      <section className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-48 rounded bg-muted" />
            <div className="h-4 w-72 rounded bg-muted" />
          </div>
          <div className="h-9 w-28 rounded bg-muted" />
        </div>
        <EventsLoadingGrid />
      </section>
    );
  }

  if (userError) {
    return (
      <section className="mx-auto max-w-5xl px-6 py-10">
        <EventsErrorState
          message={
            userError instanceof Error
              ? userError.message
              : "Failed to load current user"
          }
        />
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Events</h1>
        <Button asChild>
          <Link to="/events/new">Create Event</Link>
        </Button>
      </div>

      {isError ? (
        <EventsErrorState
          message={
            error instanceof Error ? error.message : "Failed to fetch events"
          }
        />
      ) : null}
      {data && data.data.length === 0 ? (
        <EventsEmptyState
          title="No events yet"
          description="Create an event to see it here."
          action={
            <Button asChild>
              <Link to="/events/new">Create Event</Link>
            </Button>
          }
        />
      ) : null}
      {data && data.data.length > 0 ? (
        <>
          <EventsGrid events={data.data} />
          <EventsPagination
            page={page}
            total={data.pagination.total}
            onPageChange={setPage}
          />
        </>
      ) : null}
    </section>
  );
}
