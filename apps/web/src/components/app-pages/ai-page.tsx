import { useState } from "react";
import {
  BotMessageSquareIcon,
  SparklesIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

export function AiPage({ initialPrompt }: { initialPrompt?: string }) {
  const [draft, setDraft] = useState(initialPrompt ?? "");

  return (
    <section className="mx-auto grid max-w-6xl gap-6 px-6 py-10 lg:grid-cols-[280px_minmax(0,1fr)]">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Recent Conversations</CardTitle>
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
        <CardHeader>
          <div className="flex items-center gap-3">
            <BotMessageSquareIcon className="size-6 text-muted-foreground" />
            <CardTitle className="text-3xl tracking-tight">AI</CardTitle>
          </div>
        </CardHeader>

        <CardContent className="flex h-full flex-col gap-6">
          <div className="flex-1 rounded-xl border border-dashed bg-muted/20 p-6">
            <div className="flex items-start gap-3">
              <SparklesIcon className="mt-0.5 size-4 text-muted-foreground" />
              <div className="flex flex-wrap gap-2 text-sm">
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
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium" htmlFor="ai-prompt">
              Message
            </label>
            <Textarea
              id="ai-prompt"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={initialPrompt ?? "Ask AI"}
              className="min-h-28"
            />
            <div className="flex justify-end">
              <Button disabled>Send</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
