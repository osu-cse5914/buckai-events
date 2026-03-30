import { Link } from "@tanstack/react-router";
import { CompassIcon, SearchIcon, UserRoundIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function FeaturedPage() {
  return (
    <section className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10">
      <div className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Featured
        </p>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Personalized discovery is the home page.
          </h1>
          <p className="max-w-2xl text-base text-muted-foreground">
            Recommendation-driven ranking is not wired on this branch yet, so
            this page stays explicit about what is ready now instead of
            pretending the generic catalog is personalized.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CompassIcon className="size-5 text-muted-foreground" />
            <CardTitle>Browse the full catalog</CardTitle>
            <CardDescription>
              See every event and gig without recommendation framing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/catalog">Open Catalog</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <SearchIcon className="size-5 text-muted-foreground" />
            <CardTitle>Search directly</CardTitle>
            <CardDescription>
              Run a query-first search and hand off to AI when you want help.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/search">Open Search</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <UserRoundIcon className="size-5 text-muted-foreground" />
            <CardTitle>Improve future recommendations</CardTitle>
            <CardDescription>
              Update your profile and interests so recommendation work has
              something real to build on.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild>
              <Link to="/profile">Go to My Profile</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
