import { Link } from "@tanstack/react-router";
import { CalendarIcon, UserCheckIcon, UserPlusIcon } from "lucide-react";
import { STATUS_STYLES, STATUS_LABELS } from "@/lib/event-utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FramedList,
  FramedListInset,
  FramedListItem,
  FramedListItems,
} from "@/components/ui/framed-list";
import { IconCircleButton } from "@/components/ui/icon-circle-button";
import { ProfileOverview } from "@/components/users/profile-overview";
import { STANDARD_PAGE_WIDTH } from "@/lib/page-layout";
import { cn } from "@/lib/utils";

export interface PublicProfileEvent {
  id: string;
  title: string;
  description: string | null;
  status: string;
  createdAt: string;
}

export interface PublicProfileData {
  id: string;
  displayName: string | null;
  imageUrl?: string | null;
  pronouns?: string | null;
  major: string | null;
  gradYear: number | null;
  interests: string[];
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
  createdEvents: {
    items: PublicProfileEvent[];
    meta: { total: number; limit: number; offset: number };
  };
}

export interface FollowUser {
  id: string;
  displayName: string | null;
  imageUrl?: string | null;
  major: string | null;
  gradYear: number | null;
}

export interface ProfileViewProps {
  user: PublicProfileData;
  onFollow?: () => void;
  onUnfollow?: () => void;
  followPending?: boolean;
  onFollowersClick?: () => void;
  onFollowingClick?: () => void;
}

export function ProfileView({
  user,
  onFollow,
  onUnfollow,
  followPending = false,
  onFollowersClick,
  onFollowingClick,
}: ProfileViewProps) {
  const hasFollowAction = !!onFollow || !!onUnfollow;

  return (
    <ProfileOverview
      title={user.displayName ?? "User"}
      metaLine={
        <>
          {user.pronouns ? <span>{user.pronouns}</span> : null}
          {user.pronouns ? <span aria-hidden="true">·</span> : null}
          <button
            type="button"
            className="underline-offset-4 hover:underline disabled:pointer-events-none"
            onClick={onFollowersClick}
            disabled={!onFollowersClick}
          >
            {user.followerCount} {user.followerCount === 1 ? "follower" : "followers"}
          </button>
          <span aria-hidden="true">·</span>
          <button
            type="button"
            className="underline-offset-4 hover:underline disabled:pointer-events-none"
            onClick={onFollowingClick}
            disabled={!onFollowingClick}
          >
            {user.followingCount} following
          </button>
        </>
      }
      action={
        <IconCircleButton
          variant="outline"
          aria-label={user.isFollowing ? "Unfollow" : "Follow"}
          title={user.isFollowing ? "Unfollow" : "Follow"}
          icon={
            user.isFollowing ? (
              <UserCheckIcon className="size-4" />
            ) : (
              <UserPlusIcon className="size-4" />
            )
          }
          disabled={!hasFollowAction || followPending}
          onClick={user.isFollowing ? onUnfollow : onFollow}
        >
          <span className="sr-only">{user.isFollowing ? "Unfollow" : "Follow"}</span>
        </IconCircleButton>
      }
      imageUrl={user.imageUrl ?? null}
      avatarFallback={(user.displayName ?? "?").charAt(0).toUpperCase()}
      detailFields={[
        { label: "Major", value: user.major || "—" },
        {
          label: "Graduation Year",
          value: user.gradYear ? `Class of ${user.gradYear}` : "—",
        },
        {
          label: "Interests",
          value:
            user.interests.length > 0 ? (
              <div className="flex flex-wrap gap-2 sm:justify-end">
                {user.interests.map((interest) => (
                  <Badge key={interest} variant="secondary">
                    {interest}
                  </Badge>
                ))}
              </div>
            ) : (
              "—"
            ),
        },
      ]}
      extraSection={
        <section className="space-y-3">
          <h2 className="text-xl font-semibold tracking-tight">Events</h2>
          <FramedList>
            {user.createdEvents.items.length === 0 ? (
              <FramedListInset>
                <p className="text-sm text-center text-muted-foreground">No active events.</p>
              </FramedListInset>
            ) : (
              <FramedListItems>
                {user.createdEvents.items.map((event) => (
                  <FramedListItem key={event.id}>
                    <Link
                      to="/events/$eventId"
                      params={{ eventId: event.id }}
                      className="block min-w-0"
                    >
                      <div className="min-w-0 space-y-1.5">
                        <h3 className="line-clamp-2 text-base font-semibold leading-tight hover:underline">
                          {event.title}
                        </h3>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarIcon className="size-3.5 shrink-0" />
                          <span>{new Date(event.createdAt).toLocaleDateString()}</span>
                        </span>
                        <Badge variant="secondary" className={STATUS_STYLES[event.status] ?? ""}>
                          {STATUS_LABELS[event.status] ?? event.status}
                        </Badge>
                      </div>

                      {event.description ? (
                        <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                          {event.description}
                        </p>
                      ) : null}
                    </Link>
                  </FramedListItem>
                ))}
              </FramedListItems>
            )}
          </FramedList>
        </section>
      }
    />
  );
}

export function FollowListDialog({
  open,
  onOpenChange,
  title,
  users,
  isLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  users: FollowUser[];
  isLoading: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2 py-2">
          {isLoading && (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          )}
          {!isLoading && users.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No users yet.</p>
          )}
          {!isLoading &&
            users.map((u) => (
              <Link
                key={u.id}
                to="/users/$id"
                params={{ id: u.id }}
                onClick={() => onOpenChange(false)}
                className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted transition-colors"
              >
                <Avatar size="sm" className="shrink-0">
                  {u.imageUrl ? (
                    <AvatarImage src={u.imageUrl} alt={u.displayName ?? "User"} />
                  ) : null}
                  <AvatarFallback>{(u.displayName ?? "?")[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium truncate">{u.displayName ?? "Unknown"}</span>
                  {u.major && (
                    <span className="text-xs text-muted-foreground truncate">
                      {u.major}
                      {u.gradYear ? ` · ${u.gradYear}` : ""}
                    </span>
                  )}
                </div>
              </Link>
            ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ProfileNotFound() {
  return (
    <section className={cn(STANDARD_PAGE_WIDTH, "py-10 text-center")}>
      <h1 className="text-2xl font-bold tracking-tight">User not found</h1>
      <p className="mt-2 text-muted-foreground">The user you're looking for doesn't exist.</p>
      <Button asChild className="mt-6" variant="outline">
        <Link to="/">Go home</Link>
      </Button>
    </section>
  );
}

export function ProfileError() {
  return (
    <section className={cn(STANDARD_PAGE_WIDTH, "py-10 text-center")}>
      <h1 className="text-2xl font-bold tracking-tight">Something went wrong</h1>
      <p className="mt-2 text-muted-foreground">
        Could not load this profile. Please try again later.
      </p>
      <Button asChild className="mt-6" variant="outline">
        <Link to="/">Go home</Link>
      </Button>
    </section>
  );
}

export function ProfileSkeleton() {
  return (
    <section className={cn(STANDARD_PAGE_WIDTH, "flex flex-col gap-6 py-10")}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-4">
          <Skeleton className="size-20 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="flex flex-wrap gap-6">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <Skeleton className="size-9 rounded-full" />
      </div>
      <FramedList>
        <FramedListItems>
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="flex flex-col gap-1 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5"
            >
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </FramedListItems>
      </FramedList>
      <div className="rounded-2xl border p-6">
        <Skeleton className="h-7 w-20" />
        <div className="mt-4 space-y-3">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      </div>
    </section>
  );
}
