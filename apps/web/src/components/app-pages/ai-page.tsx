import { useEffect, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarIcon,
  LoaderCircleIcon,
  MapPinIcon,
  MessageSquarePlusIcon,
  SendHorizontalIcon,
} from "lucide-react";
import { useApiClient } from "@/lib/api";
import {
  conversationMessagesQueryOptions,
  conversationsQueryOptions,
  type ConversationMessage,
  type ConversationPendingAction,
  type ConversationReplySuggestionsPart,
  type ConversationSearchResultsPart,
} from "@/lib/queries";
import { formatDate, TYPE_STYLES } from "@/lib/event-utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const CONVERSATION_LIMIT = 50;
const MESSAGE_LIMIT = 100;
const INITIAL_BUCKAI_MESSAGE =
  "Hi, I'm BuckAI. I can help you find events, gigs, and campus activity around Social OSU. Ask for recommendations, what's happening tonight, or help narrowing down options.";

async function readErrorMessage(res: Response, fallback: string) {
  try {
    const body = (await res.json()) as { detail?: string };
    return body.detail || fallback;
  } catch {
    return fallback;
  }
}

async function readSseText(
  res: Response,
  onChunk: (chunk: string) => void,
) {
  const reader = res.body?.getReader();
  if (!reader) {
    throw new Error("Streaming response body is unavailable");
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";

  function flushBuffer() {
    const normalizedBuffer = buffer.replace(/\r\n/g, "\n");
    const events = normalizedBuffer.split("\n\n");
    buffer = events.pop() ?? "";

    for (const rawEvent of events) {
      const dataLines = rawEvent
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) =>
          line.startsWith("data: ") ? line.slice("data: ".length) : line.slice(5),
        );

      if (!dataLines.length) {
        continue;
      }

      const chunk = dataLines.join("\n");
      fullText += chunk;
      onChunk(chunk);
    }
  }

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
    flushBuffer();

    if (done) {
      break;
    }
  }

  if (buffer.startsWith("data:")) {
    const trailingDataLines = buffer
      .replace(/\r\n/g, "\n")
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) =>
        line.startsWith("data: ") ? line.slice("data: ".length) : line.slice(5),
      );

    if (trailingDataLines.length) {
      const chunk = trailingDataLines.join("\n");
      fullText += chunk;
      onChunk(chunk);
    }
  }

  return fullText;
}

function normalizeAssistantText(value: string) {
  return value.replace(/\r\n/g, "\n").trim();
}

function formatCompensation(
  compensation: ConversationSearchResultsPart["items"][number]["compensation"],
) {
  if (compensation?.amount == null) {
    return null;
  }

  const amount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: compensation.currency ?? "USD",
    maximumFractionDigits: Number.isInteger(compensation.amount) ? 0 : 2,
  }).format(compensation.amount);

  return compensation.type === "HOURLY" ? `${amount}/hr` : amount;
}

function SearchResultsCards({
  part,
}: {
  part: ConversationSearchResultsPart;
}) {
  if (!part.items.length) {
    return null;
  }

  const resultLabel = part.toolName === "searchGigs" ? "gigs" : "events";

  return (
    <div className="space-y-2">
      <p className="px-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {part.total} matching {resultLabel}
      </p>

      <div className="grid gap-3">
        {part.items.map((item) => {
          const compensation = formatCompensation(item.compensation);

          return (
            <a key={item.id} href={`/events/${item.id}`} className="block">
              <Card className="gap-0 rounded-2xl border-border/70 py-0 shadow-none transition-colors hover:bg-accent/20">
                <CardContent className="space-y-3 px-4 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {item.type ? (
                      <Badge
                        variant="secondary"
                        className={TYPE_STYLES[item.type] ?? ""}
                      >
                        {item.type}
                      </Badge>
                    ) : null}
                    {item.category ? (
                      <Badge variant="outline" className="capitalize">
                        {item.category}
                      </Badge>
                    ) : null}
                  </div>

                  <div className="space-y-1">
                    <p className="font-semibold text-foreground">{item.title}</p>
                    {item.summary || item.description ? (
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {item.summary ?? item.description}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-2 text-sm text-muted-foreground">
                    {item.startAt ? (
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="size-3.5 shrink-0" />
                        <span>{formatDate(item.startAt)}</span>
                      </div>
                    ) : null}
                    {item.location.name ? (
                      <div className="flex items-center gap-2">
                        <MapPinIcon className="size-3.5 shrink-0" />
                        <span className="truncate">{item.location.name}</span>
                      </div>
                    ) : null}
                  </div>

                  {compensation ? (
                    <p className="text-sm font-medium text-foreground">
                      {compensation}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            </a>
          );
        })}
      </div>
    </div>
  );
}

function ReplySuggestions({
  part,
  disabled,
  onSelect,
}: {
  part: ConversationReplySuggestionsPart;
  disabled: boolean;
  onSelect: (suggestion: string) => void;
}) {
  if (!part.suggestions.length) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {part.suggestions.map((suggestion) => (
        <Button
          key={suggestion}
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full"
          disabled={disabled}
          onClick={() => onSelect(suggestion)}
        >
          {suggestion}
        </Button>
      ))}
    </div>
  );
}

type DisplayMessage = {
  id: string;
  role: ConversationMessage["role"];
  content: string;
  parts?: ConversationMessage["parts"];
  pending?: boolean;
};

type PendingActionDetail = {
  label: string;
  value: string;
};

function getPendingActionDescription(action: ConversationPendingAction) {
  switch (action.toolName) {
    case "applyToGig":
      return "BuckAI is ready to submit this gig application for you.";
    case "saveEvent":
      return "BuckAI is ready to save this event to one of your collections.";
    case "createEvent":
      return "BuckAI is ready to create this listing on Social OSU.";
  }
}

function getPendingActionDetails(
  action: ConversationPendingAction,
): PendingActionDetail[] {
  switch (action.toolName) {
    case "applyToGig":
      return action.args.message
        ? [{ label: "Application message", value: action.args.message }]
        : [];
    case "saveEvent":
      return [
        {
          label: "Destination",
          value: action.args.collectionId
            ? "Selected collection"
            : "Most recent collection or a new Saved collection",
        },
      ];
    case "createEvent": {
      const details: PendingActionDetail[] = [
        {
          label: "Type",
          value: action.args.type === "GIG" ? "Gig" : "Event",
        },
        {
          label: "Starts",
          value: formatDate(action.args.startAt),
        },
        {
          label: "Location",
          value: action.args.location.name,
        },
      ];

      if (action.args.endAt) {
        details.push({
          label: "Ends",
          value: formatDate(action.args.endAt),
        });
      }

      const compensation = formatCompensation(action.args.compensation);
      if (compensation) {
        details.push({
          label: "Compensation",
          value: compensation,
        });
      }

      return details;
    }
  }
}

export function AiPage({
  conversationId,
  prompt,
  onConversationSelect,
}: {
  conversationId?: string;
  prompt: string;
  onConversationSelect: (conversationId: string) => void;
}) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(prompt);
  const [isSending, setIsSending] = useState(false);
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const [pendingConversationId, setPendingConversationId] = useState<string | null>(
    null,
  );
  const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(null);
  const [streamingAssistantMessage, setStreamingAssistantMessage] = useState("");
  const [assistantNotice, setAssistantNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const conversationsQuery = useQuery(
    conversationsQueryOptions(api, CONVERSATION_LIMIT, 0),
  );
  const activeConversationId = pendingConversationId ?? conversationId ?? null;
  const messagesQuery = useQuery({
    ...conversationMessagesQueryOptions(
      api,
      activeConversationId ?? "",
      MESSAGE_LIMIT,
      0,
    ),
    enabled: Boolean(activeConversationId),
  });

  useEffect(() => {
    if (!conversationId) {
      setDraft(prompt);
    }
  }, [conversationId, prompt]);

  useEffect(() => {
    if (conversationId && pendingConversationId === conversationId) {
      setPendingConversationId(null);
    }
  }, [conversationId, pendingConversationId]);

  useEffect(() => {
    if (
      conversationId ||
      prompt.trim() ||
      isSending ||
      isCreatingConversation ||
      !conversationsQuery.data?.data.length
    ) {
      return;
    }

    onConversationSelect(conversationsQuery.data.data[0]!.id);
  }, [
    conversationId,
    conversationsQuery.data,
    isCreatingConversation,
    isSending,
    onConversationSelect,
    prompt,
  ]);

  const persistedMessages = messagesQuery.data?.data ?? [];
  const latestPersistedMessage = persistedMessages.at(-1) ?? null;
  const shouldShowPendingUserMessage =
    Boolean(pendingUserMessage) &&
    !(
      latestPersistedMessage?.role === "USER" &&
      latestPersistedMessage.content === pendingUserMessage
    );

  const displayedMessages: DisplayMessage[] = [
    ...persistedMessages,
    ...(shouldShowPendingUserMessage && pendingUserMessage
      ? [
          {
            id: "pending-user",
            role: "USER" as const,
            content: pendingUserMessage,
            parts: null,
            pending: true,
          },
        ]
      : []),
    ...(streamingAssistantMessage
      ? [
          {
            id: "pending-assistant",
            role: "ASSISTANT" as const,
            content: streamingAssistantMessage,
            parts: null,
            pending: true,
          },
        ]
      : []),
    ...(assistantNotice
      ? [
          {
            id: "assistant-notice",
            role: "ASSISTANT" as const,
            content: assistantNotice,
            parts: null,
          },
        ]
      : []),
  ];
  const latestReplySuggestionsMessageId =
    [...displayedMessages]
      .reverse()
      .find(
        (message) =>
          message.role === "ASSISTANT" &&
          message.parts?.some((part) => part.type === "reply-suggestions"),
      )?.id ?? null;
  const conversationCount =
    conversationsQuery.data?.pagination.total ??
    conversationsQuery.data?.data.length ??
    0;
  const activeConversation =
    conversationsQuery.data?.data.find(
      (conversation) => conversation.id === activeConversationId,
    ) ?? null;
  const pendingAction = activeConversation?.pendingAction ?? null;
  const pendingActionDetails = pendingAction
    ? getPendingActionDetails(pendingAction)
    : [];
  const activeConversationTitle = activeConversationId
    ? activeConversation?.title ?? "New chat"
    : "Start a new chat";

  async function refreshConversationState(targetConversationId: string) {
    await queryClient.invalidateQueries({
      queryKey: ["conversations"],
    });

    const [refreshedMessages] = await Promise.all([
      queryClient.fetchQuery(
        conversationMessagesQueryOptions(api, targetConversationId, MESSAGE_LIMIT, 0),
      ),
      queryClient.fetchQuery(conversationsQueryOptions(api, CONVERSATION_LIMIT, 0)),
    ]);

    return refreshedMessages;
  }

  async function createConversation() {
    setIsCreatingConversation(true);

    try {
      const res = await api.api.v1.conversations.$post();
      if (!res.ok) {
        throw new Error(
          await readErrorMessage(res, "Failed to create conversation"),
        );
      }

      const created = (await res.json()) as {
        id: string;
      };
      setPendingConversationId(created.id);
      await queryClient.invalidateQueries({
        queryKey: ["conversations"],
      });
      onConversationSelect(created.id);
      return created.id;
    } finally {
      setIsCreatingConversation(false);
    }
  }

  async function ensureConversationId() {
    if (activeConversationId) {
      return activeConversationId;
    }

    return createConversation();
  }

  async function handleNewConversation() {
    setErrorMessage(null);
    setAssistantNotice(null);

    try {
      const createdConversationId = await createConversation();
      setDraft("");
      setPendingConversationId(createdConversationId);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to create conversation",
      );
    }
  }

  async function sendMessage(
    content: string,
    options?: {
      clearDraft?: boolean;
    },
  ) {
    const trimmedContent = content.trim();
    if (!trimmedContent || isSending) {
      return;
    }

    const shouldClearDraft = options?.clearDraft ?? true;
    const previousDraft = draft;

    setErrorMessage(null);
    setAssistantNotice(null);
    setPendingUserMessage(trimmedContent);
    setStreamingAssistantMessage("");
    if (shouldClearDraft) {
      setDraft("");
    }
    setIsSending(true);

    try {
      const targetConversationId = await ensureConversationId();
      const sendConversationMessage =
        api.api.v1.conversations[":id"].messages.$post as (args: {
          param: { id: string };
          json: { content: string };
        }) => Promise<Response>;
      const response = await sendConversationMessage({
        param: { id: targetConversationId },
        json: { content: trimmedContent },
      });

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Failed to send message"),
        );
      }

      const assistantText = await readSseText(response, (chunk) => {
        setStreamingAssistantMessage((current) => current + chunk);
      });
      const refreshedMessages = await refreshConversationState(targetConversationId);
      const normalizedAssistantText = normalizeAssistantText(assistantText);
      const persistedAssistantMessage = refreshedMessages.data.some(
        (message) =>
          message.role === "ASSISTANT" &&
          normalizeAssistantText(message.content) === normalizedAssistantText,
      );

      if (normalizedAssistantText && !persistedAssistantMessage) {
        setAssistantNotice(assistantText);
      }
    } catch (error) {
      if (shouldClearDraft) {
        setDraft(previousDraft);
      }
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to send message",
      );
    } finally {
      setIsSending(false);
      setPendingUserMessage(null);
      setStreamingAssistantMessage("");
      setPendingConversationId(null);
    }
  }

  async function handlePendingDecision(decision: "Confirm" | "Cancel") {
    await sendMessage(decision, { clearDraft: false });
  }

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await sendMessage(draft);
  }

  return (
    <section className="flex w-full flex-col gap-8 px-6 py-10 lg:h-screen lg:min-h-0 lg:gap-6 lg:overflow-hidden lg:py-6">
      <AlertDialog open={Boolean(pendingAction)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm action</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction ? getPendingActionDescription(pendingAction) : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {pendingAction ? (
            <div className="flex flex-col gap-4">
              <div className="rounded-2xl border bg-muted/30 px-4 py-4">
                <p className="text-sm font-semibold text-foreground">
                  {pendingAction.summary}
                </p>

                {pendingActionDetails.length ? (
                  <dl className="mt-3 flex flex-col gap-2">
                    {pendingActionDetails.map((detail) => (
                      <div
                        key={`${pendingAction.id}-${detail.label}`}
                        className="flex flex-col gap-1 text-sm sm:flex-row sm:gap-2"
                      >
                        <dt className="font-medium text-foreground sm:min-w-28">
                          {detail.label}
                        </dt>
                        <dd className="text-muted-foreground">{detail.value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
              </div>

              <AlertDialogFooter>
                <AlertDialogCancel
                  onClick={() => void handlePendingDecision("Cancel")}
                  disabled={isSending}
                >
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => void handlePendingDecision("Confirm")}
                  disabled={isSending}
                >
                  Confirm
                </AlertDialogAction>
              </AlertDialogFooter>
            </div>
          ) : null}
        </AlertDialogContent>
      </AlertDialog>

      <div className="min-w-0">
        <h1 className="text-3xl font-bold tracking-tight">Ask BuckAI</h1>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-background lg:grid lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,25rem)_minmax(0,1fr)]">
        <aside className="border-b lg:flex lg:min-h-0 lg:flex-col lg:border-r lg:border-b-0">
          <div className="border-b px-4 py-4 sm:px-5">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">
                  {conversationCount} conversation{conversationCount === 1 ? "" : "s"}
                </p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight">
                  Recent chats
                </h2>
              </div>

              <Button
                type="button"
                size="icon"
                variant="outline"
                className="shrink-0"
                aria-label="New conversation"
                title="New conversation"
                onClick={handleNewConversation}
                disabled={isSending || isCreatingConversation}
              >
                {isCreatingConversation ? (
                  <LoaderCircleIcon className="size-4 animate-spin" />
                ) : (
                  <MessageSquarePlusIcon className="size-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
            {conversationsQuery.isLoading ? (
              <p className="px-4 py-4 text-sm text-muted-foreground sm:px-5">
                Loading conversations...
              </p>
            ) : conversationsQuery.error ? (
              <p className="px-4 py-4 text-sm text-destructive sm:px-5">
                {conversationsQuery.error instanceof Error
                  ? conversationsQuery.error.message
                  : "Failed to load conversations"}
              </p>
            ) : conversationsQuery.data?.data.length ? (
              conversationsQuery.data.data.map((conversation) => {
                const isActive = conversation.id === activeConversationId;

                return (
                  <button
                    key={conversation.id}
                    type="button"
                    className={cn(
                      "w-full border-b px-4 py-4 text-left transition-colors last:border-b-0 sm:px-5",
                      isActive
                        ? "bg-accent/50 text-accent-foreground"
                        : "hover:bg-muted/40",
                    )}
                    disabled={isSending}
                    onClick={() => {
                      setAssistantNotice(null);
                      setErrorMessage(null);
                      onConversationSelect(conversation.id);
                    }}
                  >
                    <p className="truncate text-sm font-medium">
                      {conversation.title ?? "New chat"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(conversation.updatedAt).toLocaleString()}
                    </p>
                  </button>
                );
              })
            ) : (
              <p className="px-4 py-4 text-sm text-muted-foreground sm:px-5">
                No conversations yet. Start a new one below.
              </p>
            )}
          </div>
        </aside>

        <div className="flex min-h-[32rem] flex-col lg:min-h-0">
          <div className="border-b px-4 py-4 sm:px-5">
            <p className="text-sm text-muted-foreground">
              {activeConversationId ? "Conversation" : "Draft"}
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight">
              {activeConversationTitle}
            </h2>
          </div>

          <div className="flex flex-1 flex-col lg:min-h-0">
            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-5">
              {messagesQuery.isLoading && !displayedMessages.length ? (
                <p className="text-sm text-muted-foreground">
                  Loading conversation...
                </p>
              ) : displayedMessages.length ? (
                displayedMessages.map((message) =>
                  message.role === "USER" ? (
                    <article
                      key={message.id}
                      className={cn(
                        "ml-auto w-fit max-w-[85%] rounded-2xl bg-primary px-4 py-3 text-sm text-primary-foreground sm:max-w-xl",
                        message.pending && "opacity-80",
                      )}
                    >
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </article>
                  ) : (
                    <div
                      key={message.id}
                      className={cn(
                        "mr-auto flex max-w-[85%] flex-col gap-3 sm:max-w-2xl",
                        message.pending && "opacity-80",
                      )}
                    >
                      {message.content ? (
                        <article className="w-fit max-w-full rounded-2xl border bg-muted/30 px-4 py-3 text-sm text-foreground">
                          <MarkdownContent className="text-sm [&_p]:whitespace-pre-line">
                            {message.content}
                          </MarkdownContent>
                        </article>
                      ) : null}

                      {message.parts?.map((part, index) => (
                        part.type === "search-results" ? (
                          <SearchResultsCards
                            key={`${message.id}-${part.type}-${index}`}
                            part={part}
                          />
                        ) : message.id === latestReplySuggestionsMessageId ? (
                          <ReplySuggestions
                            key={`${message.id}-${part.type}-${index}`}
                            part={part}
                            disabled={isSending || Boolean(pendingAction)}
                            onSelect={(suggestion) => {
                              void sendMessage(suggestion, { clearDraft: false });
                            }}
                          />
                        ) : null
                      ))}
                    </div>
                  ),
                )
              ) : (
                <article className="mr-auto w-fit max-w-[85%] rounded-2xl border bg-muted/30 px-4 py-3 text-sm text-foreground sm:max-w-xl">
                  <MarkdownContent className="text-sm [&_p]:whitespace-pre-line">
                    {INITIAL_BUCKAI_MESSAGE}
                  </MarkdownContent>
                </article>
              )}
            </div>

            <div className="border-t px-4 py-4 sm:px-5">
              <form className="space-y-3" onSubmit={handleSend}>
                <label htmlFor="ai-message" className="sr-only">
                  Message
                </label>
                <div className="rounded-2xl border bg-muted/20 p-3">
                  <Textarea
                    id="ai-message"
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="Ask about events, gigs, or campus activities"
                    rows={4}
                    disabled={isSending || Boolean(pendingAction)}
                    className="min-h-24 border-0 bg-transparent px-0 py-0 shadow-none focus-visible:ring-0"
                  />
                </div>

                {pendingAction ? (
                  <p className="text-sm text-muted-foreground">
                    Confirm or cancel the pending action to keep chatting in this
                    conversation.
                  </p>
                ) : null}

                {errorMessage ? (
                  <p className="text-sm text-destructive">{errorMessage}</p>
                ) : null}

                <div className="flex items-center justify-end gap-3">
                  <Button
                    type="submit"
                    size="icon"
                    aria-label="Send"
                    title="Send"
                    disabled={!draft.trim() || isSending || Boolean(pendingAction)}
                  >
                    {isSending ? (
                      <LoaderCircleIcon className="size-4 animate-spin" />
                    ) : (
                      <SendHorizontalIcon className="size-4" />
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
