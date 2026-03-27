import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/lib/api";
import {
  ProfileView,
  ProfileNotFound,
  ProfileError,
  ProfileSkeleton,
  type PublicProfileData,
} from "@/components/users/public-profile";

export const Route = createFileRoute("/_authenticated/users/$id/")({
  component: PublicProfilePage,
});

function usePublicProfile(id: string) {
  const api = useApiClient();
  return useQuery<PublicProfileData>({
    queryKey: ["users", id],
    queryFn: async () => {
      const res = await api.api.v1.users[":id"].$get({
        param: { id },
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

class NotFoundError extends Error {
  constructor() {
    super("User not found");
    this.name = "NotFoundError";
  }
}

function PublicProfilePage() {
  const { id } = Route.useParams();
  const { data: user, isLoading, error } = usePublicProfile(id);

  if (isLoading) {
    return <ProfileSkeleton />;
  }

  if (error instanceof Error && error.name === "NotFoundError") {
    return <ProfileNotFound />;
  }

  if (error || !user) {
    return <ProfileError />;
  }

  return <ProfileView user={user} />;
}
