import { Link } from "@tanstack/react-router";
import { CompassIcon, SearchIcon, UserRoundIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function FeaturedPage() {
  return (
    <section className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10">
      <div className="flex items-center gap-3">
        <CompassIcon className="size-6 text-muted-foreground" />
        <h1 className="text-3xl font-bold tracking-tight">Featured</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CompassIcon className="size-5 text-muted-foreground" />
            <CardTitle>Catalog</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/catalog">Catalog</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <SearchIcon className="size-5 text-muted-foreground" />
            <CardTitle>Search</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/search">Search</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <UserRoundIcon className="size-5 text-muted-foreground" />
            <CardTitle>My Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild>
              <Link to="/profile">My Profile</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
