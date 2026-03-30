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
      <h1 className="text-2xl font-bold tracking-tight">Collections</h1>

      <Card className="border-dashed">
        <CardHeader>
          <BookmarkIcon className="size-5 text-muted-foreground" />
          <CardTitle>Coming soon</CardTitle>
          <CardDescription>Collections are not available yet.</CardDescription>
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
