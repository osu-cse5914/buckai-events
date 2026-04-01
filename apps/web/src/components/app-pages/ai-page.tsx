import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function AiPage({
  prompt,
  onPromptSubmit,
}: {
  prompt: string;
  onPromptSubmit: (value: string) => void;
}) {
  const [draftPrompt, setDraftPrompt] = useState(prompt);

  useEffect(() => {
    setDraftPrompt(prompt);
  }, [prompt]);

  return (
    <section className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-10">
      <div className="max-w-3xl space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">BuckAI</h1>
        <p className="text-sm text-muted-foreground">
          Bring a search prompt into AI mode, refine it here, and keep the draft
          ready for the conversation flow.
        </p>
      </div>

      <form
        className="max-w-3xl rounded-[2rem] border bg-background p-6 shadow-sm"
        onSubmit={(event) => {
          event.preventDefault();
          onPromptSubmit(draftPrompt);
        }}
      >
        <div className="space-y-2">
          <label
            htmlFor="ai-prompt-draft"
            className="text-sm font-medium text-foreground"
          >
            AI prompt draft
          </label>
          <Textarea
            id="ai-prompt-draft"
            aria-label="AI prompt draft"
            placeholder="Describe what you want BuckAI to help with"
            value={draftPrompt}
            onChange={(event) => setDraftPrompt(event.target.value)}
            className="min-h-36 resize-y"
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button type="submit">Update draft</Button>
          <p className="text-sm text-muted-foreground">
            Conversation creation stays on the separate AI chat track; this page
            preserves the prompt you want to bring there.
          </p>
        </div>
      </form>
    </section>
  );
}
