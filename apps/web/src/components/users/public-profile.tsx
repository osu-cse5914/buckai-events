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

export function ProfileView({ user }: { user: PublicProfileData }) {
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
          <div className="flex items-center gap-1.5 text-sm">
            <UsersIcon className="size-4 text-muted-foreground" />
            <span className="font-semibold">{user.followerCount}</span>
            <span className="text-muted-foreground">
              {user.followerCount === 1 ? "follower" : "followers"}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <span className="font-semibold">{user.followingCount}</span>
            <span className="text-muted-foreground">following</span>
          </div>
        </div>

        {/* Follow button placeholder */}
        <div>
          <Button variant="outline" disabled>
            {user.isFollowing ? "Following" : "Follow"}
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
