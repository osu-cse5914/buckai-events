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
  type CurrentUser,
  type SocialFeedItem,
} from "@/lib/queries";
import {
  STATUS_LABELS,
  STATUS_STYLES,
  TYPE_STYLES,
  formatDateLong,
} from "@/lib/event-utils";
import { cn } from "@/lib/utils";

type SocialFeedVariant = "featured" | "page";

export function FollowingSection({ className }: { className?: string }) {
  const socialFeed = useSocialFeedSectionData();

  return (
    <section className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 text-left">
          <h2 className="text-2xl font-bold tracking-tight">Following</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Recent activity from people you follow.
          </p>
        </div>

        <p className="text-sm text-muted-foreground">
          Showing {socialFeed.items.length} of {socialFeed.total}
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-background">
        <SocialFeedBody variant="featured" {...socialFeed} />
      </div>
    </section>
  );
}

export function SocialFeedPageContent() {
  const socialFeed = useSocialFeedSectionData();

  return (
    <div className="overflow-hidden rounded-3xl border bg-background shadow-sm">
      <SocialFeedBody variant="page" {...socialFeed} />
    </div>
  );
}

function useSocialFeedSectionData() {
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
  const total = pages[0]?.pagination.total ?? items.length;

  return {
    currentUser: currentUserQuery.data,
    items,
    total,
    isPending: socialFeedQuery.isPending,
    isError: socialFeedQuery.isError,
    error: socialFeedQuery.error,
    hasNextPage: socialFeedQuery.hasNextPage,
    isFetchingNextPage: socialFeedQuery.isFetchingNextPage,
    fetchNextPage: () => socialFeedQuery.fetchNextPage(),
  };
}

function SocialFeedBody({
  variant,
  currentUser,
  items,
  total,
  isPending,
  isError,
  error,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: {
  variant: SocialFeedVariant;
  currentUser: CurrentUser | undefined;
  items: SocialFeedItem[];
  total: number;
  isPending: boolean;
  isError: boolean;
  error: unknown;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => Promise<unknown>;
}) {
  if (isPending) {
    return (
      <EventsListSkeleton
        rows={variant === "featured" ? 3 : 6}
        showHeader={false}
        framed={false}
      />
    );
  }

  if (isError) {
    return (
      <div className="px-4 py-5 sm:px-5">
        <EventsErrorState
          className="mt-0"
          message={
            error instanceof Error ? error.message : "Failed to fetch social feed"
          }
        />
      </div>
    );
  }

  if (items.length === 0) {
    const featuredEmptyAction = (
      <Button variant="outline" asChild>
        <Link to="/profile">Update your profile</Link>
      </Button>
    );

    const pageEmptyAction = (
      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link to="/featured">Browse featured picks</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/profile">Update your profile</Link>
        </Button>
      </div>
    );

    return (
      <div className={variant === "featured" ? "px-4 py-5 sm:px-5" : "p-6"}>
        <EventsEmptyState
          className={cn(
            "mt-0",
            variant === "page"
              ? "rounded-3xl border border-dashed bg-muted/40 px-8 py-12"
              : "",
          )}
          title={
            variant === "page"
              ? "Your social feed is quiet"
              : "No activity from people you follow yet"
          }
          description={buildFollowGuidance(
            currentUser?.major ?? null,
            currentUser?.interests ?? [],
          )}
          action={variant === "page" ? pageEmptyAction : featuredEmptyAction}
        />
      </div>
    );
  }

  return (
    <>
      {variant === "page" ? (
        <div className="border-b bg-muted/30 px-5 py-4">
          <p className="text-sm text-muted-foreground">
            Showing {items.length} of {total}
          </p>
        </div>
      ) : null}

      <div className="divide-y">
        {items.map((item) => (
          <SocialFeedListItem key={`${item.actor.id}:${item.event.id}`} item={item} />
        ))}
      </div>

      {hasNextPage ? (
        <div className="flex items-center justify-between gap-4 border-t px-5 py-4">
          <p className="text-sm text-muted-foreground">
            {variant === "page"
              ? "More activity is waiting below."
              : "See more from the people you follow."}
          </p>
          <Button
            variant="outline"
            onClick={() => void fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? "Loading..." : "Load more"}
          </Button>
        </div>
      ) : null}
    </>
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
