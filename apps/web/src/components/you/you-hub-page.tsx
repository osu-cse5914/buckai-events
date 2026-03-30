import { Link } from "@tanstack/react-router";
import {
  BookmarkIcon,
  BriefcaseBusinessIcon,
  PlusSquareIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function YouHubPage() {
  return (
    <section className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
          You
        </p>
        <h1 className="text-3xl font-bold tracking-tight">
          Personal management lives here.
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Applications, saved collections, and user-owned listings stay under
          this hub. Profile editing still belongs to the avatar menu.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <BriefcaseBusinessIcon className="size-5 text-muted-foreground" />
            <CardTitle>Applications</CardTitle>
            <CardDescription>
              Track the gigs you have applied to and their current status.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/you/applications">View Applications</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <PlusSquareIcon className="size-5 text-muted-foreground" />
            <CardTitle>Your Events & Gigs</CardTitle>
            <CardDescription>
              Manage the listings you own and create new ones.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/you/events">Manage Listings</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <BookmarkIcon className="size-5 text-muted-foreground" />
            <CardTitle>Collections</CardTitle>
            <CardDescription>
              Collection management is routed here even though the list and
              create endpoints are not merged on this branch yet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild>
              <Link to="/you/collections">Open Collections</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
