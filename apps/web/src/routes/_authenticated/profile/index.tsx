import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiClient } from "@/lib/api";
import {
  currentUserQueryOptions,
  queryKeys,
  type CurrentUser,
} from "@/lib/queries";
import {
  FollowListDialog,
  type FollowUser,
} from "@/components/users/public-profile";
import { ProfileOverview } from "@/components/users/profile-overview";

export const Route = createFileRoute("/_authenticated/profile/")({
  component: ProfilePage,
});

function useProfile() {
  const api = useApiClient();
  return useQuery<CurrentUser>(currentUserQueryOptions(api));
}

function useFollowersList(id: string, enabled: boolean) {
  const api = useApiClient();
  return useQuery<{ data: FollowUser[] }>({
    queryKey: ["users", id, "followers"],
    queryFn: async () => {
      const res = await api.api.v1.users[":id"].followers.$get({
        param: { id },
        query: {},
      });
      if (!res.ok) throw new Error("Failed to fetch followers");
      return res.json() as Promise<{ data: FollowUser[] }>;
    },
    enabled,
  });
}

function useFollowingList(id: string, enabled: boolean) {
  const api = useApiClient();
  return useQuery<{ data: FollowUser[] }>({
    queryKey: ["users", id, "following"],
    queryFn: async () => {
      const res = await api.api.v1.users[":id"].following.$get({
        param: { id },
        query: {},
      });
      if (!res.ok) throw new Error("Failed to fetch following");
      return res.json() as Promise<{ data: FollowUser[] }>;
    },
    enabled,
  });
}

export function ProfilePage() {
  const { data: user, isLoading, error } = useProfile();
  const [isEditing, setIsEditing] = useState(false);
  const [followersOpen, setFollowersOpen] = useState(false);
  const [followingOpen, setFollowingOpen] = useState(false);

  const followersQuery = useFollowersList(user?.id ?? "", followersOpen && !!user);
  const followingQuery = useFollowingList(user?.id ?? "", followingOpen && !!user);

  if (isLoading) {
    return (
      <section className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-10">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>
          <Skeleton className="h-10 w-20" />
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
          <Card className="gap-4">
            <CardHeader>
              <Skeleton className="h-7 w-32" />
              <Skeleton className="h-4 w-40" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </CardContent>
          </Card>

          <Card className="gap-4">
            <CardHeader>
              <Skeleton className="h-7 w-36" />
              <Skeleton className="h-4 w-56" />
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton
                  key={index}
                  className={index === 4 ? "h-24 rounded-xl sm:col-span-2" : "h-24 rounded-xl"}
                />
              ))}
            </CardContent>
          </Card>
        </div>
      </section>
    );
  }

  if (error || !user) {
    return (
      <section className="mx-auto max-w-5xl px-6 py-10">
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error instanceof Error ? error.message : "Failed to load profile"}
        </div>
      </section>
    );
  }

  return (
    <>
      {isEditing ? (
        <section className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1.5">
              <p className="text-sm text-muted-foreground">Account profile</p>
              <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Update the details people see across Social OSU and keep your academic info current for collaboration and discovery.
              </p>
            </div>
          </div>

        <Card className="gap-4 overflow-hidden rounded-2xl border bg-background py-0">
          <CardHeader className="border-b px-6 py-6 sm:px-8">
            <CardTitle>Edit profile</CardTitle>
            <CardDescription>
              These details help other students recognize you and make your public profile feel complete.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 py-6 sm:px-8">
            <ProfileEditForm user={user} onCancel={() => setIsEditing(false)} onSaved={() => setIsEditing(false)} />
          </CardContent>
        </Card>
        </section>
      ) : (
        <ProfileOverview
          eyebrow="Account profile"
          title="Profile"
          description="Update the details people see across Social OSU and keep your academic info current for collaboration and discovery."
          action={
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              Edit
            </Button>
          }
          communityTitle="Community"
          communityDescription="Your visibility and connections across Social OSU."
          stats={[
            {
              value: user.followerCount,
              label: user.followerCount === 1 ? "follower" : "followers",
              onClick: () => setFollowersOpen(true),
            },
            {
              value: user.followingCount,
              label: "following",
              onClick: () => setFollowingOpen(true),
            },
          ]}
          communityFooter={
            <p className="text-sm text-muted-foreground">
              These details appear across your Social OSU profile and help others recognize your interests and background.
            </p>
          }
          detailTitle="Profile details"
          detailDescription="Keep your academic details and interests current so your profile stays useful to others."
          detailFields={[
            { label: "Email", value: user.email },
            { label: "Display Name", value: user.displayName || "—" },
            { label: "Major", value: user.major || "—" },
            { label: "Graduation Year", value: user.gradYear?.toString() || "—" },
            {
              label: "Interests",
              value: user.interests.length > 0 ? user.interests.join(", ") : "—",
              className: "sm:col-span-2",
            },
          ]}
        />
      )}
      <FollowListDialog
        open={followersOpen}
        onOpenChange={setFollowersOpen}
        title="Followers"
        users={followersQuery.data?.data ?? []}
        isLoading={followersQuery.isLoading}
      />
      <FollowListDialog
        open={followingOpen}
        onOpenChange={setFollowingOpen}
        title="Following"
        users={followingQuery.data?.data ?? []}
        isLoading={followingQuery.isLoading}
      />
    </>
  );
}

function ProfileEditForm({
  user,
  onCancel,
  onSaved,
}: {
  user: CurrentUser;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = useState(user.displayName ?? "");
  const [major, setMajor] = useState(user.major ?? "");
  const [gradYear, setGradYear] = useState(user.gradYear?.toString() ?? "");
  const [interestsInput, setInterestsInput] = useState(user.interests.join(", "));

  const mutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await api.api.v1.users.me.$patch({ json: data });
      if (!res.ok) throw new Error("Failed to save profile");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile });
      onSaved();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data: Record<string, unknown> = {
      displayName: displayName || null,
      major: major || null,
      gradYear: gradYear ? parseInt(gradYear, 10) : null,
      interests: interestsInput
        ? interestsInput.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
    };

    mutation.mutate(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="displayName">Display Name</Label>
        <Input
          id="displayName"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={100}
          placeholder="e.g. Brutus Buckeye"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="major">Major</Label>
        <Input
          id="major"
          value={major}
          onChange={(e) => setMajor(e.target.value)}
          maxLength={100}
          placeholder="e.g. Computer Science"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="gradYear">Graduation Year</Label>
        <Input
          id="gradYear"
          type="number"
          value={gradYear}
          onChange={(e) => setGradYear(e.target.value)}
          placeholder="e.g. 2026"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="interests">Interests</Label>
        <Input
          id="interests"
          value={interestsInput}
          onChange={(e) => setInterestsInput(e.target.value)}
          placeholder="e.g. music, sports, tech"
        />
        <p className="text-xs text-muted-foreground">Comma-separated list</p>
      </div>

      {mutation.error && (
        <p className="text-sm text-destructive">
          {mutation.error instanceof Error ? mutation.error.message : "Failed to save profile"}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving..." : "Save"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={mutation.isPending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
