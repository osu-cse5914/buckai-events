import { useEffect, useState } from "react";
import {
  BotMessageSquareIcon,
  MessageSquareIcon,
  SparklesIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

export function AiPage({ initialPrompt }: { initialPrompt?: string }) {
  const [draft, setDraft] = useState(initialPrompt ?? "");

  useEffect(() => {
    setDraft(initialPrompt ?? "");
  }, [initialPrompt]);

  return (
    <section className="mx-auto grid max-w-6xl gap-6 px-6 py-10 lg:grid-cols-[280px_minmax(0,1fr)]">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Recent Conversations</CardTitle>
          <CardDescription>
            Conversation history belongs here once the chat APIs land.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            "Weekend music ideas",
            "Looking for tutoring gigs",
            "Student org events this week",
          ].map((title) => (
            <div
              key={title}
              className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground"
            >
              {title}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="min-h-[32rem]">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BotMessageSquareIcon className="size-4" />
            AI
          </div>
          <div>
            <CardTitle className="text-3xl tracking-tight">
              Conversation-first event discovery
            </CardTitle>
            <CardDescription className="mt-2 max-w-2xl text-sm">
              This route owns the chat UI. The backend conversation APIs are not
              on this branch yet, so the page is an explicit shell instead of a
              fake working chat.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="flex h-full flex-col gap-6">
          <div className="flex-1 rounded-xl border border-dashed bg-muted/20 p-6">
            <div className="flex items-start gap-3">
              <SparklesIcon className="mt-0.5 size-4 text-muted-foreground" />
              <div className="space-y-2 text-sm">
                <p className="font-medium">Suggested prompts</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    "Find free events tonight",
                    "Show gigs paying at least $20/hr",
                    "What should I do this weekend?",
                  ].map((prompt) => (
                    <span
                      key={prompt}
                      className="rounded-full border px-3 py-1 text-muted-foreground"
                    >
                      {prompt}
                    </span>
                  ))}
                </div>
                {initialPrompt ? (
                  <p className="text-muted-foreground">
                    Search handed off:{" "}
                    <span className="font-medium">{initialPrompt}</span>
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium" htmlFor="ai-prompt">
              Message the assistant
            </label>
            <Textarea
              id="ai-prompt"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Describe what you want to find"
              className="min-h-28"
            />
            <div className="flex items-center justify-between gap-3">
              <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <MessageSquareIcon className="size-4" />
                Live sending is coming in the chat phase.
              </p>
              <Button disabled>Start Conversation</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
