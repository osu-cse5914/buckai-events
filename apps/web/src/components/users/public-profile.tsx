import { Link } from "@tanstack/react-router";
import { UsersIcon, CalendarIcon } from "lucide-react";
import { STATUS_STYLES, STATUS_LABELS } from "@/lib/event-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

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
    <section className="mx-auto max-w-3xl px-6 py-10">
      <div className="flex flex-col gap-6">
        {/* Profile header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {user.displayName}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {user.major && <span>{user.major}</span>}
            {user.gradYear && <span>Class of {user.gradYear}</span>}
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-6">
          <button
            className="flex items-center gap-1.5 text-sm disabled:pointer-events-none"
            onClick={onFollowersClick}
            disabled={!onFollowersClick}
            type="button"
          >
            <UsersIcon className="size-4 text-muted-foreground" />
            <span className="font-semibold">{user.followerCount}</span>
            <span className={onFollowersClick ? "underline-offset-4 hover:underline" : "text-muted-foreground"}>
              {user.followerCount === 1 ? "follower" : "followers"}
            </span>
          </button>
          <button
            className="flex items-center gap-1.5 text-sm disabled:pointer-events-none"
            onClick={onFollowingClick}
            disabled={!onFollowingClick}
            type="button"
          >
            <span className="font-semibold">{user.followingCount}</span>
            <span className={onFollowingClick ? "underline-offset-4 hover:underline" : "text-muted-foreground"}>
              following
            </span>
          </button>
        </div>

        {/* Follow button */}
        <div>
          <Button
            variant="outline"
            disabled={!hasFollowAction || followPending}
            onClick={user.isFollowing ? onUnfollow : onFollow}
          >
            {user.isFollowing ? "Unfollow" : "Follow"}
          </Button>
        </div>

        <Separator />

        {/* Interests */}
        {user.interests.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground">
              Interests
            </h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {user.interests.map((interest) => (
                <Badge key={interest} variant="secondary">
                  {interest}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Created events */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground">
            Events
          </h2>
          {user.createdEvents.items.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              No active events.
            </p>
          ) : (
            <div className="mt-3 grid gap-3">
              {user.createdEvents.items.map((event) => (
                <Link
                  key={event.id}
                  to="/events/$eventId"
                  params={{ eventId: event.id }}
                  className="group"
                >
                  <Card className="transition-shadow group-hover:shadow-md">
                    <CardHeader>
                      <CardTitle className="text-base group-hover:underline">
                        {event.title}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="size-3.5" />
                          {new Date(event.createdAt).toLocaleDateString()}
                        </span>
                        <Badge
                          variant="secondary"
                          className={STATUS_STYLES[event.status] ?? ""}
                        >
                          {STATUS_LABELS[event.status] ?? event.status}
                        </Badge>
                      </CardDescription>
                    </CardHeader>
                    {event.description && (
                      <CardContent>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {event.description}
                        </p>
                      </CardContent>
                    )}
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
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
            <p className="text-sm text-muted-foreground text-center py-4">
              No users yet.
            </p>
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
                <div className="size-8 rounded-full bg-muted-foreground/20 flex items-center justify-center text-sm font-semibold shrink-0">
                  {(u.displayName ?? "?")[0]?.toUpperCase()}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium truncate">
                    {u.displayName ?? "Unknown"}
                  </span>
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
    <section className="mx-auto max-w-3xl px-6 py-10 text-center">
      <h1 className="text-2xl font-bold tracking-tight">User not found</h1>
      <p className="mt-2 text-muted-foreground">
        The user you're looking for doesn't exist.
      </p>
      <Button asChild className="mt-6" variant="outline">
        <Link to="/">Go home</Link>
      </Button>
    </section>
  );
}

export function ProfileError() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-10 text-center">
      <h1 className="text-2xl font-bold tracking-tight">
        Something went wrong
      </h1>
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
    <section className="mx-auto max-w-3xl px-6 py-10">
      <div className="flex flex-col gap-6">
        <div>
          <Skeleton className="h-9 w-48" />
          <Skeleton className="mt-2 h-5 w-32" />
        </div>
        <div className="flex gap-6">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-24" />
        </div>
        <Skeleton className="h-9 w-20" />
        <Separator />
        <div>
          <Skeleton className="h-4 w-16" />
          <div className="mt-2 flex gap-2">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </div>
        <div>
          <Skeleton className="h-4 w-14" />
          <Skeleton className="mt-3 h-24 w-full rounded-xl" />
        </div>
      </div>
    </section>
  );
}
