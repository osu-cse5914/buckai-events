import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: IndexPage,
});

type HealthResponse = {
  status: string;
  service: string;
  timestamp: string;
};

function IndexPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  const configuredApiBaseUrl = import.meta.env.VITE_API_URL?.replace(
    /\/$/,
    "",
  );
  const healthEndpoint = configuredApiBaseUrl
    ? `${configuredApiBaseUrl}/health`
    : "/api/health";

  const handleViewApiHealth = async () => {
    setIsCheckingHealth(true);
    setHealthError(null);

    try {
      const response = await fetch(healthEndpoint);
      if (!response.ok) {
        throw new Error(`Health check failed with status ${response.status}`);
      }

      const data = (await response.json()) as HealthResponse;
      setHealth(data);
    } catch (error) {
      setHealth(null);
      setHealthError(
        error instanceof Error ? error.message : "Health check failed",
      );
    } finally {
      setIsCheckingHealth(false);
    }
  };

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-20">
      <p className="text-sm font-medium text-muted-foreground">
        social-osu-app
      </p>
      <h1 className="text-4xl font-bold tracking-tight">
        React + Vite + Tailwind + shadcn/ui
      </h1>
      <p className="max-w-2xl text-base text-muted-foreground">
        Frontend and backend are now wired in a Bun + Turbo monorepo.
      </p>
      <div className="flex items-center gap-3">
        <Button asChild>
          <Link to="/quick-start">Get Started</Link>
        </Button>
        <Button
          variant="outline"
          onClick={handleViewApiHealth}
          disabled={isCheckingHealth}
        >
          {isCheckingHealth ? "Checking..." : "View API Health"}
        </Button>
      </div>

      {(health || healthError) && (
        <div className="rounded-md border border-border bg-card p-4 text-sm">
          {healthError ? (
            <p className="text-destructive">{healthError}</p>
          ) : (
            <div className="space-y-1">
              <p>
                <span className="font-semibold">API:</span> {health?.service}
              </p>
              <p>
                <span className="font-semibold">Status:</span> {health?.status}
              </p>
              <p>
                <span className="font-semibold">Timestamp:</span>{" "}
                {health?.timestamp}
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
