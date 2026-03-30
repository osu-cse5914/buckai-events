import { Link } from "@tanstack/react-router";
import {
  BookmarkIcon,
  BriefcaseBusinessIcon,
  PlusSquareIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function YouHubPage() {
  return (
    <section className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10">
      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-bold tracking-tight">You</h1>
      </div>

      <div className="overflow-hidden rounded-2xl border">
        <section className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <BriefcaseBusinessIcon className="size-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Applications</h2>
          </div>
          <Button asChild>
            <Link to="/you/applications">Applications</Link>
          </Button>
        </section>

        <section className="flex flex-col gap-4 border-t px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <PlusSquareIcon className="size-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Events</h2>
          </div>
          <Button asChild>
            <Link to="/you/events">Events</Link>
          </Button>
        </section>

        <section className="flex flex-col gap-4 border-t px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <BookmarkIcon className="size-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Collections</h2>
          </div>
          <Button variant="outline" asChild>
            <Link to="/you/collections">Collections</Link>
          </Button>
        </section>
      </div>
    </section>
  );
}
