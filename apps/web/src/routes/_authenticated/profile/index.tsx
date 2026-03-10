import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/profile/")({
  component: ProfilePage,
});

function ProfilePage() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
      <p className="mt-2 text-muted-foreground">Coming soon.</p>
    </section>
  );
}
