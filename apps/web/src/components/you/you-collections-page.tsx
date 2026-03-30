import { Link } from "@tanstack/react-router";
import { BookmarkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function YouCollectionsPage() {
  return (
    <section className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-10">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Your Collections</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Collections are intentionally nested under You, but the list and
          create endpoints have not been merged on this branch yet.
        </p>
      </div>

      <Card className="border-dashed">
        <CardHeader>
          <BookmarkIcon className="size-5 text-muted-foreground" />
          <CardTitle>Collections are routed, not fully wired</CardTitle>
          <CardDescription>
            This page holds the correct IA boundary today and leaves the actual
            collection management flow to the follow-up API and UI work.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Button asChild>
            <Link to="/catalog">Browse Catalog</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/you">Back to You</Link>
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}
