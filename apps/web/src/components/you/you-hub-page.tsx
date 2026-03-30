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
      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-bold tracking-tight">You</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <BriefcaseBusinessIcon className="size-5 text-muted-foreground" />
            <CardTitle>Applications</CardTitle>
            <CardDescription>Track your applications.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/you/applications">Applications</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <PlusSquareIcon className="size-5 text-muted-foreground" />
            <CardTitle>Events</CardTitle>
            <CardDescription>Manage your events and gigs.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/you/events">Events</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <BookmarkIcon className="size-5 text-muted-foreground" />
            <CardTitle>Collections</CardTitle>
            <CardDescription>Coming soon.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild>
              <Link to="/you/collections">Collections</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
