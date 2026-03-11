import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/")({
  component: HomePage,
});

function HomePage() {
  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-20">
      <h1 className="text-4xl font-bold tracking-tight">Welcome to Social OSU</h1>
      <p className="max-w-2xl text-base text-muted-foreground">
        Discover events, find gigs, and connect with the Ohio State community.
      </p>
      <div className="flex items-center gap-3">
        <Button asChild>
          <Link to="/events">Browse Events</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/profile">Your Profile</Link>
        </Button>
      </div>
    </section>
  );
}
