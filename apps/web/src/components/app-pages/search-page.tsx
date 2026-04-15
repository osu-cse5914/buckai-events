import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { SparklesIcon } from "lucide-react";
import type { SearchRouteSearch } from "@/lib/event-route-search";
import {
  buildSearchInputValue,
  parseSearchInputValue,
  toOptionalPage,
} from "@/lib/event-route-search";
import {
  EventsEmptyState,
  EventsErrorState,
  EventsList,
  EventsListSkeleton,
  EventsPagination,
  useSearchResultsQuery,
} from "@/components/events/events-browser";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TYPE_FILTER_OPTIONS = [
  { value: "", label: "All" },
  { value: "EVENT", label: "Events" },
  { value: "GIG", label: "Gigs" },
] as const satisfies ReadonlyArray<{
  value: NonNullable<SearchRouteSearch["type"]> | "";
  label: string;
}>;

function getSelectionTextOffset(root: HTMLElement) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return null;
  }

  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer)) {
    return null;
  }

  const preCaretRange = range.cloneRange();
  preCaretRange.selectNodeContents(root);
  preCaretRange.setEnd(range.startContainer, range.startOffset);

  return preCaretRange.toString().length;
}

function restoreSelectionTextOffset(root: HTMLElement, offset: number) {
  const selection = window.getSelection();
  if (!selection) {
    return;
  }

  const range = document.createRange();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let remaining = offset;
  let node = walker.nextNode();

  while (node) {
    const textLength = node.textContent?.length ?? 0;
    if (remaining <= textLength) {
      range.setStart(node, remaining);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      return;
    }

    remaining -= textLength;
    node = walker.nextNode();
  }

  range.selectNodeContents(root);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

function escapeSearchInputText(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildSearchInputHighlightMarkup(value: string) {
  return buildSearchInputHighlightParts(value)
    .map((part) => {
      const className = part.highlighted
        ? "rounded-sm bg-primary/10 px-1 font-mono text-base text-primary"
        : "text-foreground";
      return `<span${part.highlighted ? ' data-search-token-type="filter"' : ""} class="${className}">${escapeSearchInputText(part.text)}</span>`;
    })
    .join("");
}

function syncEditableSearchMarkup(root: HTMLDivElement, value: string) {
  root.innerHTML = value ? buildSearchInputHighlightMarkup(value) : "";
}

function buildSearchInputHighlightParts(value: string) {
  const parts: Array<{ text: string; highlighted: boolean }> = [];
  const pattern = /(^|\s)((?:tag|type|category):\s*[^\s]+)/gi;
  let lastIndex = 0;

  for (const match of value.matchAll(pattern)) {
    const matchIndex = match.index ?? 0;
    const leadingWhitespace = match[1] ?? "";
    const token = match[2] ?? "";
    const tokenStart = matchIndex + leadingWhitespace.length;

    if (tokenStart > lastIndex) {
      parts.push({
        text: value.slice(lastIndex, tokenStart),
        highlighted: false,
      });
    }

    if (token) {
      parts.push({ text: token, highlighted: true });
      lastIndex = tokenStart + token.length;
    }
  }

  if (lastIndex < value.length) {
    parts.push({ text: value.slice(lastIndex), highlighted: false });
  }

  return parts;
}

export function SearchPage({
  search,
  type,
  category,
  tag,
  page,
  onSearchSubmit,
  onPageChange,
}: {
  search: string;
  type: NonNullable<SearchRouteSearch["type"]> | "";
  category: string;
  tag: string;
  page: number;
  onSearchSubmit: (value: {
    search: string;
    type: NonNullable<SearchRouteSearch["type"]> | "";
    category: string;
    tag: string;
  }) => void;
  onPageChange: (page: number) => void;
}) {
  const queryInputRef = useRef<HTMLDivElement>(null);
  const selectionOffsetRef = useRef<number | null>(null);
  const searchInputValue = buildSearchInputValue({
    query: search,
    type,
    category,
    tag,
  });
  const [draftSearchInput, setDraftSearchInput] = useState(searchInputValue);
  const parsedDraftSearch = useMemo(
    () => parseSearchInputValue(draftSearchInput),
    [draftSearchInput],
  );
  const filterSuggestions = useMemo(() => {
    const suggestions: Array<{
      text: string;
    }> = [];

    if (!parsedDraftSearch.query) {
      return suggestions;
    }

    return [
      parsedDraftSearch.query,
      `${parsedDraftSearch.query} events`,
      `${parsedDraftSearch.query} gigs`,
      `${parsedDraftSearch.query} this week`,
    ]
      .map((value) => value.trim())
      .filter((value, index, values) => value.length > 0 && values.indexOf(value) === index)
      .map((text) => ({ text }));
  }, [parsedDraftSearch.query]);
  const trimmedSearch = search.trim();
  const trimmedCategory = category.trim();
  const trimmedTag = tag.trim();
  const hasActiveQuery = Boolean(trimmedSearch);
  const hasStartedSearch = Boolean(trimmedSearch || type || trimmedCategory || trimmedTag);

  useEffect(() => {
    if (document.activeElement === queryInputRef.current) {
      return;
    }

    setDraftSearchInput((currentValue) =>
      currentValue === searchInputValue ? currentValue : searchInputValue,
    );
  }, [searchInputValue]);

  useLayoutEffect(() => {
    const input = queryInputRef.current;
    const selectionOffset = selectionOffsetRef.current;
    if (!input) {
      return;
    }

    syncEditableSearchMarkup(input, draftSearchInput);

    if (selectionOffset == null || document.activeElement !== input) {
      return;
    }

    restoreSelectionTextOffset(input, selectionOffset);
  }, [draftSearchInput]);

  function submitSearch(
    nextSearch: string,
    options?: {
      typeOverride?: NonNullable<SearchRouteSearch["type"]> | "";
    },
  ) {
    const parsedSearch = parseSearchInputValue(nextSearch);
    const normalizedQuery = parsedSearch.query ?? "";
    const normalizedTag = parsedSearch.tag ?? "";
    const normalizedCategory = parsedSearch.category ?? "";
    const normalizedType =
      options?.typeOverride !== undefined
        ? options.typeOverride
        : (parsedSearch.type ?? "");

    if (
      normalizedQuery === trimmedSearch &&
      normalizedTag === trimmedTag &&
      normalizedCategory === trimmedCategory &&
      normalizedType === type
    ) {
      return;
    }

    onSearchSubmit({
      search: normalizedQuery,
      type: normalizedType,
      category: normalizedCategory,
      tag: normalizedTag,
    });
  }

  function clearPendingSearchUpdate() {
  }

  function submitCurrentSearch(
    nextTypeOverride?: NonNullable<SearchRouteSearch["type"]> | "",
  ) {
    clearPendingSearchUpdate();
    submitSearch(draftSearchInput, { typeOverride: nextTypeOverride });
  }

  function applySuggestion(suggestionText: string) {
    const nextSearchValue = suggestionText.trim();

    clearPendingSearchUpdate();
    selectionOffsetRef.current = nextSearchValue.length;
    setDraftSearchInput(nextSearchValue);
    submitSearch(nextSearchValue);
    requestAnimationFrame(() => {
      queryInputRef.current?.focus();
    });
  }

  function scheduleSearchUpdate(nextSearch: string, nextCaretOffset = nextSearch.length) {
    selectionOffsetRef.current = nextCaretOffset;
    setDraftSearchInput(nextSearch);
  }
  const detailSearch = hasStartedSearch
    ? {
        returnTo: "search" as const,
        q: trimmedSearch || undefined,
        type: type || undefined,
        category: trimmedCategory || undefined,
        tag: trimmedTag || undefined,
        page: toOptionalPage(page),
      }
    : undefined;

  const { data, isLoading, isError, error } = useSearchResultsQuery(
    {
      query: trimmedSearch || undefined,
      type: type || undefined,
      category: trimmedCategory || undefined,
      tag: trimmedTag || undefined,
    },
    page,
    hasStartedSearch,
  );

  return (
    <section
      className={cn(
        "mx-auto flex w-full max-w-6xl flex-col px-6",
        hasStartedSearch
          ? "gap-10 py-10"
          : "min-h-[calc(100vh-9rem)] justify-center gap-6 py-16",
      )}
    >
      <div className="animate-in fade-in-0 slide-in-from-bottom-3 duration-500">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submitCurrentSearch();
          }}
          className="mx-auto w-full max-w-3xl"
        >
          <div className="relative rounded-full bg-muted/60 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-0">
            {!draftSearchInput ? (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 left-6 right-6 flex items-center text-lg text-muted-foreground"
              >
                Search events and gigs
              </div>
            ) : null}
            <div
              ref={queryInputRef}
              role="textbox"
              aria-label="Search query"
              aria-multiline="false"
              contentEditable
              suppressContentEditableWarning
              spellCheck={false}
              onInput={(event) => {
                selectionOffsetRef.current = getSelectionTextOffset(event.currentTarget);
                scheduleSearchUpdate(event.currentTarget.textContent ?? "");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  submitCurrentSearch();
                }
              }}
              className="block min-h-16 overflow-x-auto whitespace-pre rounded-full bg-transparent px-6 py-[18px] text-lg text-foreground outline-none"
            />
          </div>
          {!draftSearchInput.trim() ? (
            <p className="mt-3 px-2 text-center text-sm text-muted-foreground">
              Try filters like <span className="font-mono text-xs">tag:group-fitness</span>,{" "}
              <span className="font-mono text-xs">type:gig</span>, or{" "}
              <span className="font-mono text-xs">category:fitness</span>.
            </p>
          ) : null}
          {filterSuggestions.length > 0 ? (
            <div className="mt-3 overflow-hidden rounded-3xl border bg-background">
              {filterSuggestions.map((suggestion) => (
                <button
                  key={suggestion.text}
                  type="button"
                  className="block w-full px-5 py-3 text-left text-[15px] text-foreground transition-colors hover:bg-muted/40"
                  onClick={() => applySuggestion(suggestion.text)}
                >
                  {suggestion.text}
                </button>
              ))}
            </div>
          ) : null}
        </form>
      </div>

      {hasStartedSearch && isLoading ? (
        <div className="animate-in fade-in-0 slide-in-from-bottom-5 duration-700">
          <EventsListSkeleton showPagination />
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
      {hasStartedSearch && data ? (
        <div className="animate-in fade-in-0 slide-in-from-bottom-5 duration-700">
          <div className="overflow-hidden rounded-2xl border bg-background">
            <div className="flex flex-col gap-4 border-b px-4 py-4 sm:px-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {data.pagination.total} results
                </p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight">
                  {trimmedSearch
                    ? `Results for "${trimmedSearch}"`
                    : trimmedTag
                      ? `Results for tag "${trimmedTag}"`
                    : "Filtered results"}
                </h2>
                {trimmedTag && trimmedSearch ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {`Filtered by tag "${trimmedTag}"`}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3">
                <div
                  className="flex flex-wrap gap-2"
                  role="group"
                  aria-label="Type filter"
                >
                  {TYPE_FILTER_OPTIONS.map((option) => (
                    <Button
                      key={option.value || "ALL"}
                      type="button"
                      variant={type === option.value ? "default" : "outline"}
                      size="sm"
                      className="rounded-full px-4"
                      onClick={() => submitCurrentSearch(option.value)}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>

                {hasActiveQuery ? (
                  <Button asChild variant="outline">
                    <Link
                      to="/ai"
                      search={{
                        prompt: trimmedSearch,
                      }}
                    >
                      <SparklesIcon />
                      Ask BuckAI
                    </Link>
                  </Button>
                ) : null}
              </div>
            </div>

            {data.data.length === 0 ? (
              <EventsEmptyState
                title={
                  trimmedTag && !trimmedSearch
                    ? `No results matched tag "${trimmedTag}"`
                    : "No results matched your search"
                }
                description={trimmedTag && !trimmedSearch ? "Try a different tag." : "Try a broader query."}
              />
            ) : (
              <>
                <EventsList events={data.data} detailSearch={detailSearch} />

                {data.pagination.total > data.pagination.limit ? (
                  <div className="border-t px-4 py-4 sm:px-5">
                    <EventsPagination
                      page={page}
                      total={data.pagination.total}
                      onPageChange={onPageChange}
                      className="mt-0"
                    />
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
