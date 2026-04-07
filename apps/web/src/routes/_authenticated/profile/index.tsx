import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
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
      const json = await res.json();
      return { data: Array.isArray(json.data) ? json.data as FollowUser[] : [] };
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
      const json = await res.json();
      return { data: Array.isArray(json.data) ? json.data as FollowUser[] : [] };
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
      <section className="mx-auto max-w-3xl px-6 py-10">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-9 w-16" />
        </div>
        <div className="mt-6 space-y-4">
          <div>
            <Skeleton className="h-4 w-16" />
            <Skeleton className="mt-1 h-5 w-48" />
          </div>
          <div>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-1 h-5 w-36" />
          </div>
          <div>
            <Skeleton className="h-4 w-12" />
            <Skeleton className="mt-1 h-5 w-40" />
          </div>
          <div>
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-1 h-5 w-20" />
          </div>
          <div>
            <Skeleton className="h-4 w-20" />
            <Skeleton className="mt-1 h-5 w-56" />
          </div>
        </div>
      </section>
    );
  }

  if (error || !user) {
    return (
      <section className="mx-auto max-w-3xl px-6 py-10">
        <div className="rounded-md border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          {error instanceof Error ? error.message : "Failed to load profile"}
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-3xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        {!isEditing && (
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            Edit
          </Button>
        )}
      </div>

      {isEditing ? (
        <ProfileEditForm user={user} onCancel={() => setIsEditing(false)} onSaved={() => setIsEditing(false)} />
      ) : (
        <ProfileDisplay
          user={user}
          onFollowersClick={() => setFollowersOpen(true)}
          onFollowingClick={() => setFollowingOpen(true)}
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
    </section>
  );
}

function ProfileDisplay({
  user,
  onFollowersClick,
  onFollowingClick,
}: {
  user: CurrentUser;
  onFollowersClick?: () => void;
  onFollowingClick?: () => void;
}) {
  return (
    <div className="mt-6 space-y-4">
      <div className="flex gap-6">
        <button
          type="button"
          className="text-left"
          onClick={onFollowersClick}
        >
          <p className="text-2xl font-bold">{user.followerCount}</p>
          <p className="text-sm text-muted-foreground underline-offset-4 hover:underline">
            {user.followerCount === 1 ? "follower" : "followers"}
          </p>
        </button>
        <button
          type="button"
          className="text-left"
          onClick={onFollowingClick}
        >
          <p className="text-2xl font-bold">{user.followingCount}</p>
          <p className="text-sm text-muted-foreground underline-offset-4 hover:underline">following</p>
        </button>
      </div>
      <Field label="Email" value={user.email} />
      <Field label="Display Name" value={user.displayName} />
      <Field label="Major" value={user.major} />
      <Field label="Graduation Year" value={user.gradYear?.toString()} />
      <Field label="Interests" value={user.interests.length > 0 ? user.interests.join(", ") : null} />
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-1">{value || "—"}</p>
    </div>
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
    <form onSubmit={handleSubmit} className="mt-6 space-y-5">
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
