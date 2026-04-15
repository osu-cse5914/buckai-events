import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useApiClient } from "@/lib/api";
import {
  ProfileView,
  ProfileNotFound,
  ProfileError,
  ProfileSkeleton,
  FollowListDialog,
  type PublicProfileData,
  type FollowUser,
} from "@/components/users/public-profile";

export const Route = createFileRoute("/_app/users/$id/")({
  component: PublicProfilePage,
});

function usePublicProfile(id: string) {
  const api = useApiClient();
  return useQuery<PublicProfileData>({
    queryKey: ["users", id],
    queryFn: async () => {
      const res = await api.api.v1.users[":id"].$get({
        param: { id },
        query: {},
      });
      if (res.status === 404) {
        throw new NotFoundError();
      }
      if (!res.ok) {
        throw new Error("Failed to fetch user profile");
      }
      return res.json() as Promise<PublicProfileData>;
    },
  });
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

class NotFoundError extends Error {
  constructor() {
    super("User not found");
    this.name = "NotFoundError";
  }
}

function PublicProfilePage() {
  const { id } = Route.useParams();
  const api = useApiClient();
  const queryClient = useQueryClient();
  const { data: user, isLoading, error } = usePublicProfile(id);

  const [followersOpen, setFollowersOpen] = useState(false);
  const [followingOpen, setFollowingOpen] = useState(false);

  const followersQuery = useFollowersList(id, followersOpen);
  const followingQuery = useFollowingList(id, followingOpen);

  const followMutation = useMutation({
    mutationFn: async () => {
      const res = await (
        api.api.v1.users[":id"].follow.$post as (args: {
          param: { id: string };
        }) => Promise<Response>
      )({ param: { id } });
      if (!res.ok) throw new Error("Failed to follow user");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users", id] });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: async () => {
      const res = await (
        api.api.v1.users[":id"].follow.$delete as (args: {
          param: { id: string };
        }) => Promise<Response>
      )({ param: { id } });
      if (!res.ok) throw new Error("Failed to unfollow user");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users", id] });
    },
  });

  if (isLoading) {
    return <ProfileSkeleton />;
  }

  if (error instanceof Error && error.name === "NotFoundError") {
    return <ProfileNotFound />;
  }

  if (error || !user) {
    return <ProfileError />;
  }

  const followPending = followMutation.isPending || unfollowMutation.isPending;

  return (
    <>
      <ProfileView
        user={user}
        onFollow={() => followMutation.mutate()}
        onUnfollow={() => unfollowMutation.mutate()}
        followPending={followPending}
        onFollowersClick={() => setFollowersOpen(true)}
        onFollowingClick={() => setFollowingOpen(true)}
      />
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
