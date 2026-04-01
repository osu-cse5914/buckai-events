import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/lib/api";
import {
  currentUserQueryOptions,
  type CurrentUser,
} from "@/lib/queries";
import {
  EventsCollectionSkeleton,
  EventsEmptyState,
  EventsErrorState,
  EventsGrid,
  EventsPagination,
  useEventsQuery,
} from "@/components/events/events-browser";
import {
  YouSubpageHeader,
  YouSubpageHeaderSkeleton,
} from "@/components/you/you-subpage-header";

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
        <YouSubpageHeaderSkeleton />
        <EventsCollectionSkeleton showPagination />
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
      <YouSubpageHeader
        title="Your Events"
        description="Manage the events and gigs you created."
      />

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
