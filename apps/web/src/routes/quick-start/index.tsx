import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/quick-start/")({
  component: QuickStartPage,
});

function QuickStartPage() {
  const configuredApiBaseUrl = import.meta.env.VITE_API_URL?.replace(
    /\/$/,
    "",
  );
  const healthEndpoint = configuredApiBaseUrl
    ? `${configuredApiBaseUrl}/api/health`
    : "/api/health";

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-20">
      <Link to="/" className="text-sm text-muted-foreground hover:underline">
        &larr; Back
      </Link>
      <h1 className="text-4xl font-bold tracking-tight">Quick Start</h1>
      <p className="text-base text-muted-foreground">
        Core commands and API endpoint details for local development.
      </p>
      <div className="space-y-3 text-sm">
        <p className="text-muted-foreground">
          Run{" "}
          <code className="rounded bg-muted px-1.5 py-0.5">bun run dev</code>{" "}
          to start both apps.
        </p>
        <p className="text-muted-foreground">
          Frontend:{" "}
          <code className="rounded bg-muted px-1.5 py-0.5">
            http://localhost:5173
          </code>
        </p>
        <p className="text-muted-foreground">
          API:{" "}
          <code className="rounded bg-muted px-1.5 py-0.5">
            http://localhost:3001
          </code>
        </p>
        <p className="text-muted-foreground">
          Health endpoint:{" "}
          <code className="rounded bg-muted px-1.5 py-0.5">
            {healthEndpoint}
          </code>
        </p>
        <p className="text-muted-foreground">
          Optional override:{" "}
          <code className="rounded bg-muted px-1.5 py-0.5">VITE_API_URL</code>
        </p>
      </div>
      <div>
        <Button asChild>
          <Link to="/">Back to Home</Link>
        </Button>
      </div>
    </section>
  );
}
