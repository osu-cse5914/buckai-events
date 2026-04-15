import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/clerk-react";
import { PencilIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApiClient } from "@/lib/api";
import { requireSignedInBeforeLoad } from "@/lib/route-access";
import {
  currentUserQueryOptions,
  queryKeys,
  type CurrentUser,
} from "@/lib/queries";
import {
  FollowListDialog,
  ProfileSkeleton,
  type FollowUser,
} from "@/components/users/public-profile";
import { IconCircleButton } from "@/components/ui/icon-circle-button";
import { ProfileOverview } from "@/components/users/profile-overview";

export const Route = createFileRoute("/_app/profile/")({
  beforeLoad: requireSignedInBeforeLoad,
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
  const { user: clerkUser } = useUser();
  const { data: user, isLoading, error } = useProfile();
  const [isEditing, setIsEditing] = useState(false);
  const [followersOpen, setFollowersOpen] = useState(false);
  const [followingOpen, setFollowingOpen] = useState(false);

  const followersQuery = useFollowersList(user?.id ?? "", followersOpen && !!user);
  const followingQuery = useFollowingList(user?.id ?? "", followingOpen && !!user);
  const clerkPronouns =
    typeof clerkUser?.publicMetadata?.pronouns === "string"
      ? clerkUser.publicMetadata.pronouns
      : typeof clerkUser?.unsafeMetadata?.pronouns === "string"
        ? clerkUser.unsafeMetadata.pronouns
        : null;

  if (isLoading) {
    return <ProfileSkeleton />;
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
          <h1 className="text-3xl font-bold tracking-tight">Edit profile</h1>

        <Card className="gap-4 overflow-hidden rounded-2xl border bg-background py-0">
          <CardHeader className="border-b px-6 py-6 sm:px-8">
            <CardTitle>Edit profile</CardTitle>
          </CardHeader>
          <CardContent className="px-6 py-6 sm:px-8">
            <ProfileEditForm user={user} onCancel={() => setIsEditing(false)} onSaved={() => setIsEditing(false)} />
          </CardContent>
        </Card>
        </section>
      ) : (
        <ProfileOverview
          title={user.displayName ?? "Your profile"}
          metaLine={
            <>
              {clerkPronouns ? <span>{clerkPronouns}</span> : null}
              {clerkPronouns ? <span aria-hidden="true">·</span> : null}
              <button
                type="button"
                className="underline-offset-4 hover:underline"
                onClick={() => setFollowersOpen(true)}
              >
                {user.followerCount} {user.followerCount === 1 ? "follower" : "followers"}
              </button>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                className="underline-offset-4 hover:underline"
                onClick={() => setFollowingOpen(true)}
              >
                {user.followingCount} following
              </button>
            </>
          }
          action={<IconCircleButton variant="outline" aria-label="Edit profile" title="Edit profile" icon={<PencilIcon className="size-4" />} onClick={() => setIsEditing(true)}><span className="sr-only">Edit profile</span></IconCircleButton>}
          imageUrl={clerkUser?.imageUrl ?? null}
          avatarFallback={(user.displayName ?? user.email).charAt(0).toUpperCase()}
          detailFields={[
            { label: "Email", value: user.email },
            { label: "Major", value: user.major || "—" },
            { label: "Graduation Year", value: user.gradYear?.toString() || "—" },
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
