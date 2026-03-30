import { useDeferredValue, useState } from "react";
import { Link } from "@tanstack/react-router";
import { SearchIcon, SparklesIcon, XIcon } from "lucide-react";
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

export function SearchPage() {
  const [search, setSearch] = useState("");
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
    setSearch("");
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
    <section className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-10">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <SearchIcon className="size-4" />
          Search
        </div>
        <h1 className="text-3xl font-bold tracking-tight">
          Query-first discovery with an AI handoff.
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Search stays results-driven. Use AI when you want conversational help
          interpreting or refining what you typed.
        </p>
      </div>

      <div className="rounded-2xl border bg-card p-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_160px_160px_auto]">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search events or gigs..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(0);
              }}
              className="pl-9"
            />
          </div>

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

          <div className="flex gap-2">
            <Button variant="outline" onClick={clearFilters}>
              <XIcon className="mr-1 size-4" />
              Clear
            </Button>
            <Button asChild>
              <Link to="/ai" search={{ prompt: handoffPrompt }}>
                <SparklesIcon className="mr-1 size-4" />
                Ask AI
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {!hasStartedSearch ? (
        <EventsEmptyState
          title="Start with a direct query"
          description="Search is for explicit intent. Enter a keyword, type, or category to load matching events and gigs, or jump straight into AI mode."
        />
      ) : null}

      {hasStartedSearch && isLoading ? <EventsLoadingGrid /> : null}
      {hasStartedSearch && isError ? (
        <EventsErrorState
          message={
            error instanceof Error ? error.message : "Failed to fetch events"
          }
        />
      ) : null}
      {hasStartedSearch && data && data.data.length === 0 ? (
        <EventsEmptyState
          title="No results matched your search"
          description="Try a broader query, switch event type, or hand the same prompt to AI for help."
        />
      ) : null}
      {hasStartedSearch && data && data.data.length > 0 ? (
        <>
          <EventsGrid events={data.data} />
          <EventsPagination
            page={page}
            total={data.pagination.total}
            onPageChange={setPage}
          />
        </>
      ) : null}
    </section>
  );
}
