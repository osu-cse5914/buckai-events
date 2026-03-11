import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/debug/")({
  component: DebugPage,
});

type HealthResponse = { service: string; status: string; timestamp: string };

export function DebugPage() {
  const navigate = useNavigate();

  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  const [userId, setUserId] = useState("");

  const handleViewApiHealth = async () => {
    setIsCheckingHealth(true);
    setHealthError(null);

    try {
      const res = await api.api.health.$get();
      if (!res.ok) {
        throw new Error(`Health check failed with status ${res.status}`);
      }
      const data = (await res.json()) as HealthResponse;
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

  const handleViewProfile = () => {
    if (userId.trim()) {
      navigate({ to: "/users/$id", params: { id: userId.trim() } });
    }
  };

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Debug Tools</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Developer-only diagnostic tools
        </p>
      </div>

      {/* API Health Check */}
      <div className="rounded-lg border border-dashed border-border p-5">
        <h2 className="text-lg font-semibold">API Health</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Check the API server health status
        </p>
        <Button
          variant="outline"
          className="mt-3"
          onClick={handleViewApiHealth}
          disabled={isCheckingHealth}
        >
          {isCheckingHealth ? "Checking..." : "View API Health"}
        </Button>

        {healthError && (
          <div className="mt-3 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
            {healthError}
          </div>
        )}

        {health && (
          <div className="mt-3 space-y-1 rounded-md border border-border bg-card p-3 text-sm">
            <p>
              <span className="font-semibold">Service:</span> {health.service}
            </p>
            <p>
              <span className="font-semibold">Status:</span> {health.status}
            </p>
            <p>
              <span className="font-semibold">Timestamp:</span>{" "}
              {health.timestamp}
            </p>
          </div>
        )}
      </div>

      {/* User Profile Viewer */}
      <div className="rounded-lg border border-dashed border-border p-5">
        <h2 className="text-lg font-semibold">User Profile Viewer</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Navigate to a user&apos;s public profile by ID
        </p>
        <div className="mt-3 flex items-center gap-2">
          <Input
            placeholder="Enter user ID"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="max-w-sm"
          />
          <Button variant="outline" onClick={handleViewProfile}>
            View Profile
          </Button>
        </div>
      </div>
    </section>
  );
}
