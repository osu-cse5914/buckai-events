import { useEffect, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LoaderCircleIcon, MessageSquarePlusIcon, SparklesIcon } from "lucide-react";
import { useApiClient } from "@/lib/api";
import {
  conversationMessagesQueryOptions,
  conversationsQueryOptions,
  queryKeys,
  type ConversationMessage,
} from "@/lib/queries";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const CONVERSATION_LIMIT = 50;
const MESSAGE_LIMIT = 100;

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
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const rawLine of lines) {
      const line = rawLine.replace(/\r$/, "");
      if (!line.startsWith("data: ")) {
        continue;
      }

      const chunk = line.slice("data: ".length);
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

  if (buffer.startsWith("data: ")) {
    const chunk = buffer.slice("data: ".length).replace(/\r$/, "");
    fullText += chunk;
    onChunk(chunk);
  }

  return fullText;
}

type DisplayMessage = {
  id: string;
  role: ConversationMessage["role"];
  content: string;
  pending?: boolean;
};

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

  const displayedMessages: DisplayMessage[] = [
    ...(messagesQuery.data?.data ?? []),
    ...(pendingUserMessage
      ? [
          {
            id: "pending-user",
            role: "USER" as const,
            content: pendingUserMessage,
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
          },
        ]
      : []),
  ];

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

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = draft.trim();

    if (!content || isSending) {
      return;
    }

    const previousDraft = content;
    setErrorMessage(null);
    setAssistantNotice(null);
    setPendingUserMessage(content);
    setStreamingAssistantMessage("");
    setDraft("");
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
        json: { content },
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
      const persistedAssistantMessage = refreshedMessages.data.some(
        (message) =>
          message.role === "ASSISTANT" && message.content === assistantText,
      );

      if (assistantText.trim() && !persistedAssistantMessage) {
        setAssistantNotice(assistantText);
      }
    } catch (error) {
      setDraft(previousDraft);
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

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-orange-700">
            <SparklesIcon className="size-3.5" />
            BuckAI
          </div>
          <h1 className="text-3xl font-bold tracking-tight">AI</h1>
          <p className="text-sm text-muted-foreground">
            Ask about events, gigs, and campus activity on Social OSU.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={handleNewConversation}
          disabled={isSending || isCreatingConversation}
        >
          {isCreatingConversation ? (
            <LoaderCircleIcon className="size-4 animate-spin" />
          ) : (
            <MessageSquarePlusIcon className="size-4" />
          )}
          New conversation
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="overflow-hidden rounded-3xl border bg-background">
          <div className="border-b px-4 py-4">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Conversations
            </p>
          </div>

          <div className="flex max-h-[560px] flex-col overflow-y-auto p-2">
            {conversationsQuery.isLoading ? (
              <p className="px-3 py-4 text-sm text-muted-foreground">
                Loading conversations...
              </p>
            ) : conversationsQuery.error ? (
              <p className="px-3 py-4 text-sm text-destructive">
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
                      "rounded-2xl px-3 py-3 text-left transition-colors",
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent/60",
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
              <p className="px-3 py-4 text-sm text-muted-foreground">
                No conversations yet. Start a new one below.
              </p>
            )}
          </div>
        </aside>

        <div className="flex min-h-[560px] flex-col overflow-hidden rounded-3xl border bg-background">
          <div className="border-b px-5 py-4">
            <p className="text-sm font-medium">
              {activeConversationId ? "Conversation" : "Start a new chat"}
            </p>
          </div>

          <div className="flex flex-1 flex-col">
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
              {!activeConversationId && !displayedMessages.length ? (
                <div className="rounded-3xl border border-dashed bg-muted/30 px-5 py-8 text-sm text-muted-foreground">
                  Ask BuckAI to find events, discover gigs, or help with campus plans.
                </div>
              ) : messagesQuery.isLoading && !displayedMessages.length ? (
                <p className="text-sm text-muted-foreground">
                  Loading conversation...
                </p>
              ) : displayedMessages.length ? (
                displayedMessages.map((message) => (
                  <article
                    key={message.id}
                    className={cn(
                      "max-w-3xl rounded-3xl px-4 py-3 text-sm shadow-sm",
                      message.role === "USER"
                        ? "ml-auto bg-orange-500 text-white"
                        : "mr-auto border bg-muted/30 text-foreground",
                      message.pending && "opacity-80",
                    )}
                  >
                    <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.16em] opacity-70">
                      {message.role === "USER" ? "You" : "BuckAI"}
                    </p>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </article>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  This conversation does not have any messages yet.
                </p>
              )}
            </div>

            <div className="border-t px-5 py-4">
              <form className="space-y-3" onSubmit={handleSend}>
                <label htmlFor="ai-message" className="text-sm font-medium">
                  Message
                </label>
                <Textarea
                  id="ai-message"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Ask about events, gigs, or campus activities"
                  rows={4}
                  disabled={isSending}
                />

                {errorMessage ? (
                  <p className="text-sm text-destructive">{errorMessage}</p>
                ) : null}

                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    Responses stream as they arrive.
                  </p>

                  <Button type="submit" disabled={!draft.trim() || isSending}>
                    {isSending ? (
                      <>
                        <LoaderCircleIcon className="size-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      "Send"
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
