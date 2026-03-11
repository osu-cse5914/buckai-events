import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/profile/")({
  component: ProfilePage,
});

type User = {
  id: string;
  email: string;
  displayName: string | null;
  major: string | null;
  gradYear: number | null;
  interests: string[];
  createdAt: string;
  updatedAt: string;
  followerCount: number;
  followingCount: number;
};

function useProfile() {
  return useQuery<User>({
    queryKey: ["profile"],
    queryFn: async () => {
      const res = await api.api.v1.users.me.$get();
      if (!res.ok) throw new Error("Failed to load profile");
      return res.json() as Promise<User>;
    },
  });
}

function ProfilePage() {
  const { data: user, isLoading, error } = useProfile();
  const [isEditing, setIsEditing] = useState(false);

  if (isLoading) {
    return (
      <section className="mx-auto max-w-2xl px-6 py-10">
        <p className="text-muted-foreground">Loading profile...</p>
      </section>
    );
  }

  if (error || !user) {
    return (
      <section className="mx-auto max-w-2xl px-6 py-10">
        <p className="text-destructive">
          {error instanceof Error ? error.message : "Failed to load profile"}
        </p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-2xl px-6 py-10">
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
        <ProfileDisplay user={user} />
      )}
    </section>
  );
}

function ProfileDisplay({ user }: { user: User }) {
  return (
    <div className="mt-6 space-y-4">
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
  user: User;
  onCancel: () => void;
  onSaved: () => void;
}) {
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
      queryClient.invalidateQueries({ queryKey: ["profile"] });
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
