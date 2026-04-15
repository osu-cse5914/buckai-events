import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/lib/api";
import { currentUserQueryOptions, type CurrentUser } from "@/lib/queries";
import {
  EventsEmptyState,
  EventsErrorState,
  EventsList,
  EventsListSkeleton,
  EventsPagination,
  useEventsQuery,
} from "@/components/events/events-browser";
import { FramedList, FramedListFooter, FramedListInset } from "@/components/ui/framed-list";
import { YouSubpageHeader, YouSubpageHeaderSkeleton } from "@/components/you/you-subpage-header";
import { YouTabsNav } from "@/components/you/you-tabs-nav";
import { STANDARD_PAGE_WIDTH } from "@/lib/page-layout";
import { cn } from "@/lib/utils";

function useCurrentUser() {
  const api = useApiClient();
  return useQuery<CurrentUser>(currentUserQueryOptions(api));
}

export function YouEventsPage() {
  const [page, setPage] = useState(0);
  const { data: currentUser, isLoading: isLoadingUser, error: userError } = useCurrentUser();
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
      <section className={cn(STANDARD_PAGE_WIDTH, "flex flex-col gap-6 py-10")}>
        <YouTabsNav currentTab="events" />
        <YouSubpageHeaderSkeleton showBackLink={false} showDescription={false} />
        <EventsListSkeleton showPagination />
      </section>
    );
  }

  if (userError) {
    return (
      <section className={cn(STANDARD_PAGE_WIDTH, "py-10")}>
        <EventsErrorState
          message={userError instanceof Error ? userError.message : "Failed to load current user"}
        />
      </section>
    );
  }

  return (
    <section className={cn(STANDARD_PAGE_WIDTH, "flex flex-col gap-6 py-10")}>
      <YouTabsNav currentTab="events" />

      <YouSubpageHeader title="Your Events" showBackLink={false} />

      {isError ? (
        <EventsErrorState
          message={error instanceof Error ? error.message : "Failed to fetch events"}
          className="mt-0"
        />
      ) : null}
      {data ? (
        <FramedList>
          {data.data.length === 0 ? (
            <FramedListInset>
              <EventsEmptyState
                title="No events yet"
                description="Create an event to see it here."
                className="mt-0"
              />
            </FramedListInset>
          ) : (
            <>
              <EventsList events={data.data} showSaveAction={false} />
              {data.pagination.total > data.pagination.limit ? (
                <FramedListFooter>
                  <EventsPagination
                    page={page}
                    total={data.pagination.total}
                    onPageChange={setPage}
                    className="mt-0"
                  />
                </FramedListFooter>
              ) : null}
            </>
          )}
        </FramedList>
      ) : null}
    </section>
  );
}
