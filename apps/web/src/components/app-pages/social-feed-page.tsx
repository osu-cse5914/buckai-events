import { Link } from "@tanstack/react-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { CalendarIcon, UserPlusIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  EventsEmptyState,
  EventsErrorState,
  EventsListSkeleton,
} from "@/components/events/events-browser";
import { useApiClient } from "@/lib/api";
import {
  currentUserQueryOptions,
  fetchSocialFeedPage,
  PAGE_SIZE,
  queryKeys,
  type SocialFeedItem,
} from "@/lib/queries";
import {
  STATUS_LABELS,
  STATUS_STYLES,
  TYPE_STYLES,
  formatDateLong,
} from "@/lib/event-utils";

export function SocialFeedPage() {
  const api = useApiClient();
  const currentUserQuery = useQuery(currentUserQueryOptions(api));
  const socialFeedQuery = useInfiniteQuery({
    queryKey: queryKeys.socialFeed(PAGE_SIZE),
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      fetchSocialFeedPage(api, {
        offset: pageParam,
        limit: PAGE_SIZE,
      }),
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce(
        (count, page) => count + page.data.length,
        0,
      );

      return loaded < lastPage.pagination.total ? loaded : undefined;
    },
  });

  const pages = socialFeedQuery.data?.pages ?? [];
  const items = pages.flatMap((page) => page.data);
  const pagination = pages[0]?.pagination;

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <header className="animate-in fade-in-0 slide-in-from-bottom-3 duration-500">
        <div className="max-w-3xl">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Social
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight">Social Feed</h1>
          <p className="mt-3 text-base text-muted-foreground">
            Track what people you follow are creating and saving across Social OSU.
          </p>
        </div>
      </header>

      {socialFeedQuery.isPending ? (
        <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-700">
          <EventsListSkeleton showHeader={false} />
        </div>
      ) : null}

      {socialFeedQuery.isError ? (
        <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-700">
          <EventsErrorState
            className="mt-0"
            message={
              socialFeedQuery.error instanceof Error
                ? socialFeedQuery.error.message
                : "Failed to fetch social feed"
            }
          />
        </div>
      ) : null}

      {!socialFeedQuery.isPending &&
      !socialFeedQuery.isError &&
      items.length === 0 ? (
        <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-700">
          <EventsEmptyState
            className="mt-0 rounded-3xl border border-dashed bg-muted/40 px-8 py-12"
            title="Your social feed is quiet"
            description={buildFollowGuidance(
              currentUserQuery.data?.major ?? null,
              currentUserQuery.data?.interests ?? [],
            )}
            action={
              <div className="flex flex-wrap justify-center gap-3">
                <Button asChild>
                  <Link to="/featured">Browse featured picks</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/profile">Update your profile</Link>
                </Button>
              </div>
            }
          />
        </div>
      ) : null}

      {items.length > 0 ? (
        <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-700">
          <div className="overflow-hidden rounded-3xl border bg-background shadow-sm">
            <div className="border-b bg-muted/30 px-5 py-4">
              <p className="text-sm text-muted-foreground">
                Showing {items.length} of {pagination?.total ?? items.length}
              </p>
            </div>

            <div className="divide-y">
              {items.map((item) => (
                <SocialFeedListItem key={`${item.actor.id}:${item.event.id}`} item={item} />
              ))}
            </div>

            {socialFeedQuery.hasNextPage ? (
              <div className="flex items-center justify-between gap-4 border-t px-5 py-4">
                <p className="text-sm text-muted-foreground">
                  More activity is waiting below.
                </p>
                <Button
                  variant="outline"
                  onClick={() => socialFeedQuery.fetchNextPage()}
                  disabled={socialFeedQuery.isFetchingNextPage}
                >
                  {socialFeedQuery.isFetchingNextPage ? "Loading..." : "Load more"}
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function SocialFeedListItem({ item }: { item: SocialFeedItem }) {
  const actorName = item.actor.displayName ?? "Someone";
  const actionLabel = item.action === "created" ? "created" : "saved";

  return (
    <article
      role="article"
      aria-label={`${item.event.title} social feed item`}
      className="px-5 py-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="bg-orange-100 text-orange-800">
              <UserPlusIcon className="mr-1 size-3" />
              {actorName} {actionLabel}
            </Badge>
            <Badge variant="secondary" className={TYPE_STYLES[item.event.type] ?? ""}>
              {item.event.type}
            </Badge>
            <Badge variant="secondary" className={STATUS_STYLES[item.event.status] ?? ""}>
              {STATUS_LABELS[item.event.status] ?? item.event.status}
            </Badge>
          </div>

          <Link
            to="/events/$eventId"
            params={{ eventId: item.event.id }}
            className="mt-3 block text-xl font-semibold tracking-tight hover:underline"
          >
            {item.event.title}
          </Link>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <span>by {actorName}</span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarIcon className="size-3.5 shrink-0" />
              <span>{formatDateLong(item.actionAt)}</span>
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

function buildFollowGuidance(
  major: string | null,
  interests: string[],
) {
  const trimmedInterests = interests.filter(Boolean);

  if (major && trimmedInterests.length > 0) {
    return `Follow classmates in ${major} or people who share ${trimmedInterests.join(", ")} to start your feed.`;
  }

  if (major) {
    return `Follow classmates in ${major} to start seeing what your community is creating and saving.`;
  }

  if (trimmedInterests.length > 0) {
    return `Follow people who share ${trimmedInterests.join(", ")} to start your feed.`;
  }

  return "Follow classmates and creators you know to start seeing their latest activity here.";
}
