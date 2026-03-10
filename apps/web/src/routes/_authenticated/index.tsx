import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { InferResponseType } from "hono/client";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/")({
  component: IndexPage,
});

type HealthResponse = InferResponseType<typeof api.api.health.$get>;

// Manual type: InferResponseType can't use bracket notation in TSR's parser
type DbCheckResponse = { database: string; error?: string };

function IndexPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  const [dbStatus, setDbStatus] = useState<DbCheckResponse | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);
  const [isCheckingDb, setIsCheckingDb] = useState(false);

  const handleCheckDb = async () => {
    setIsCheckingDb(true);
    setDbError(null);

    try {
      const res = await api.api["db-check"].$get();
      const data = await res.json() as DbCheckResponse;
      setDbStatus(data);
      if (!res.ok) {
        setDbError(data.error ?? "Database check failed");
      }
    } catch (error) {
      setDbStatus(null);
      setDbError(
        error instanceof Error ? error.message : "Database check failed",
      );
    } finally {
      setIsCheckingDb(false);
    }
  };

  const handleViewApiHealth = async () => {
    setIsCheckingHealth(true);
    setHealthError(null);

    try {
      const res = await api.api.health.$get();
      if (!res.ok) {
        throw new Error(`Health check failed with status ${res.status}`);
      }
      const data = await res.json();
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
        <Button
          variant="outline"
          onClick={handleCheckDb}
          disabled={isCheckingDb}
        >
          {isCheckingDb ? "Checking..." : "Check DB Connection"}
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

      {(dbStatus || dbError) && (
        <div className="rounded-md border border-border bg-card p-4 text-sm">
          {dbError ? (
            <div className="space-y-1">
              <p className="text-destructive font-semibold">Database: disconnected</p>
              <p className="text-destructive">{dbError}</p>
            </div>
          ) : (
            <p>
              <span className="font-semibold">Database:</span>{" "}
              <span className="text-green-600">{dbStatus?.database}</span>
            </p>
          )}
        </div>
      )}
    </section>
  );
}
