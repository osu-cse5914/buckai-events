import { useDeferredValue, useState } from "react";
import { Link } from "@tanstack/react-router";
import { SparklesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  EventsEmptyState,
  EventsErrorState,
  EventsGrid,
  EventsLoadingGrid,
  EventsPagination,
  useEventsQuery,
} from "@/components/events/events-browser";

export function SearchPage({ initialSearch }: { initialSearch?: string }) {
  const search = initialSearch ?? "";
  const [type, setType] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(0);

  const deferredSearch = useDeferredValue(search.trim());
  const deferredCategory = useDeferredValue(category.trim());
  const hasStartedSearch = Boolean(
    deferredSearch || type || deferredCategory,
  );

  const { data, isLoading, isError, error } = useEventsQuery(
    {
      search: deferredSearch || undefined,
      type: type || undefined,
      category: deferredCategory || undefined,
    },
    page,
    hasStartedSearch,
  );

  function clearFilters() {
    setType("");
    setCategory("");
    setPage(0);
  }

  function updateType(value: string) {
    setType(value === "ALL" ? "" : value);
    setPage(0);
  }

  const handoffPrompt = search.trim() || category.trim() || undefined;

  return (
    <section className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10">
      <div className="animate-in fade-in-0 slide-in-from-bottom-3 duration-500">
        <h1 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
          {search || "Search"}
        </h1>
      </div>

      <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-700">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="grid flex-1 gap-3 sm:grid-cols-2">
            <Select value={type || "ALL"} onValueChange={updateType}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Any Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Any Type</SelectItem>
                <SelectItem value="EVENT">Event</SelectItem>
                <SelectItem value="GIG">Gig</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="Category"
              value={category}
              onChange={(event) => {
                setCategory(event.target.value);
                setPage(0);
              }}
            />
          </div>

          <div className="flex gap-3">
            {(type || category) ? (
              <Button variant="outline" onClick={clearFilters}>
                Clear
              </Button>
            ) : null}

            <Button variant="outline" asChild>
              <Link to="/ai" search={{ prompt: handoffPrompt }}>
                <SparklesIcon className="mr-1 size-4" />
                Ask AI
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {!hasStartedSearch ? (
        <div className="animate-in fade-in-0 slide-in-from-bottom-5 duration-700 py-12 text-sm text-muted-foreground">
          Use the search bar above.
        </div>
      ) : null}

      {hasStartedSearch && isLoading ? (
        <div className="animate-in fade-in-0 slide-in-from-bottom-5 duration-700">
          <EventsLoadingGrid />
        </div>
      ) : null}
      {hasStartedSearch && isError ? (
        <div className="animate-in fade-in-0 slide-in-from-bottom-5 duration-700">
          <EventsErrorState
            message={
              error instanceof Error ? error.message : "Failed to fetch events"
            }
          />
        </div>
      ) : null}
      {hasStartedSearch && data && data.data.length === 0 ? (
        <div className="animate-in fade-in-0 slide-in-from-bottom-5 duration-700">
          <EventsEmptyState
            title="No results matched your search"
            description="Try a broader query or Ask AI."
          />
        </div>
      ) : null}
      {hasStartedSearch && data && data.data.length > 0 ? (
        <div className="animate-in fade-in-0 slide-in-from-bottom-5 duration-700 space-y-6">
          <EventsGrid events={data.data} />
          <EventsPagination
            page={page}
            total={data.pagination.total}
            onPageChange={setPage}
          />
        </div>
      ) : null}
    </section>
  );
}
