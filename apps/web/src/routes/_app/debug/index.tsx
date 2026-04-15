import { useCallback, useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth, useUser } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApiClient } from "@/lib/api";
import { requireSignedInBeforeLoad } from "@/lib/route-access";

export const Route = createFileRoute("/_app/debug/")({
  beforeLoad: requireSignedInBeforeLoad,
  component: DebugPage,
});

type HealthResponse = { service: string; status: string; timestamp: string };
type DebugUser = { id: string; role: "USER" | "ADMIN" };
type SyncSourceSummary = {
  fetched: number;
  created: number;
  updated: number;
  skipped: number;
  completed: number;
};
type SyncSummary = {
  startedAt: string;
  finishedAt: string;
  sources: {
    osu: SyncSourceSummary;
    ticketmaster: SyncSourceSummary;
  };
};
type ProblemDetails = {
  detail?: string;
};
type PipelineRunSummary = {
  id: string;
  eventId: string;
  stage: string;
  status: string;
  textHash?: string | null;
  error?: string | null;
  event?: {
    id: string;
    title: string;
  };
};
type PipelineJobSummary = {
  id: string;
  trigger: string;
  status: string;
  stages: string[];
  error?: string | null;
  runs: PipelineRunSummary[];
};

export function DebugPage() {
  const api = useApiClient();
  const navigate = useNavigate();
  const { userId: authUserId, sessionId, orgId } = useAuth();
  const { user } = useUser();

  const [currentUser, setCurrentUser] = useState<DebugUser | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [syncSummary, setSyncSummary] = useState<SyncSummary | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [userId, setUserId] = useState("");
  const [pipelineEventId, setPipelineEventId] = useState("");
  const [pipelineJobs, setPipelineJobs] = useState<PipelineJobSummary[]>([]);
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [pipelineNotice, setPipelineNotice] = useState<string | null>(null);
  const [isLoadingPipelineJobs, setIsLoadingPipelineJobs] = useState(false);
  const [isRerunningPipeline, setIsRerunningPipeline] = useState(false);
  const [isBackfillingEmbeddings, setIsBackfillingEmbeddings] = useState(false);

  useEffect(() => {
    api.api.v1.users.me
      .$get()
      .then(async (res) => {
        if (res.ok) {
          const data = (await res.json()) as DebugUser;
          setCurrentUser(data);
        }
      })
      .catch(() => {});
  }, [api]);

  const refreshPipelineJobs = useCallback(async () => {
    setIsLoadingPipelineJobs(true);
    setPipelineError(null);

    try {
      const res = await api.api.v1.admin["ai-pipeline"].jobs.$get();
      if (!res.ok) {
        throw new Error(`AI pipeline jobs failed with status ${res.status}`);
      }
      const data = (await res.json()) as PipelineJobSummary[];
      setPipelineJobs(data);
    } catch (error) {
      setPipelineError(
        error instanceof Error ? error.message : "Failed to load AI pipeline jobs",
      );
      setPipelineJobs([]);
    } finally {
      setIsLoadingPipelineJobs(false);
    }
  }, [api]);

  useEffect(() => {
    if (currentUser?.role !== "ADMIN") {
      return;
    }

    void refreshPipelineJobs();
  }, [currentUser?.role, refreshPipelineJobs]);

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

  const handleSyncExternalEvents = async () => {
    setIsSyncing(true);
    setSyncError(null);
    setSyncSummary(null);

    try {
      const res = await api.api.v1.admin["external-ingestion"].sync.$post();
      if (!res.ok) {
        const problem = (await res
          .json()
          .catch(() => ({}))) as ProblemDetails;
        throw new Error(problem.detail ?? `Sync failed with status ${res.status}`);
      }

      const data = (await res.json()) as SyncSummary;
      setSyncSummary(data);
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : "Sync failed");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleViewProfile = () => {
    if (userId.trim()) {
      navigate({ to: "/users/$id", params: { id: userId.trim() } });
    }
  };

  const handleRerunPipeline = async (mode: "FULL_PIPELINE" | "EMBEDDING") => {
    const eventId = pipelineEventId.trim();
    if (!eventId) {
      setPipelineError("Event ID is required to rerun the AI pipeline");
      return;
    }

    setIsRerunningPipeline(true);
    setPipelineError(null);
    setPipelineNotice(null);

    try {
      const res = await api.api.v1.admin["ai-pipeline"].events[":id"].rerun.$post({
        param: { id: eventId },
        json: { mode },
      });
      if (!res.ok) {
        const problem = (await res
          .json()
          .catch(() => ({}))) as ProblemDetails;
        throw new Error(problem.detail ?? `Rerun failed with status ${res.status}`);
      }

      const job = (await res.json()) as PipelineJobSummary;
      setPipelineNotice(`Queued ${job.trigger} job ${job.id}`);
      await refreshPipelineJobs();
    } catch (error) {
      setPipelineError(error instanceof Error ? error.message : "Rerun failed");
    } finally {
      setIsRerunningPipeline(false);
    }
  };

  const handleEmbeddingBackfill = async () => {
    setIsBackfillingEmbeddings(true);
    setPipelineError(null);
    setPipelineNotice(null);

    try {
      const res = await api.api.v1.admin["ai-pipeline"].backfill.$post();
      if (!res.ok) {
        const problem = (await res
          .json()
          .catch(() => ({}))) as ProblemDetails;
        throw new Error(problem.detail ?? `Backfill failed with status ${res.status}`);
      }

      const job = (await res.json()) as PipelineJobSummary;
      setPipelineNotice(`Queued ${job.trigger} job ${job.id}`);
      await refreshPipelineJobs();
    } catch (error) {
      setPipelineError(error instanceof Error ? error.message : "Backfill failed");
    } finally {
      setIsBackfillingEmbeddings(false);
    }
  };

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Debug Tools</h1>
      </div>

      <div className="rounded-lg border border-dashed border-border p-5">
        <h2 className="text-lg font-semibold">Current User</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Authenticated user information from Clerk
        </p>
        <div className="mt-3 space-y-1 rounded-md border border-border bg-card p-3 text-sm">
          <p>
            <span className="font-semibold">Clerk ID:</span>{" "}
            <code>{authUserId ?? "—"}</code>
          </p>
          <p>
            <span className="font-semibold">DB User ID:</span>{" "}
            <code>{currentUser?.id ?? "—"}</code>
          </p>
          <p>
            <span className="font-semibold">Role:</span>{" "}
            <code>{currentUser?.role ?? "—"}</code>
          </p>
          <p>
            <span className="font-semibold">Session ID:</span>{" "}
            <code>{sessionId ?? "—"}</code>
          </p>
          <p>
            <span className="font-semibold">Org ID:</span>{" "}
            <code>{orgId ?? "—"}</code>
          </p>
          {user && (
            <>
              <p>
                <span className="font-semibold">Name:</span>{" "}
                {user.fullName ?? "—"}
              </p>
              <p>
                <span className="font-semibold">Email:</span>{" "}
                {user.primaryEmailAddress?.emailAddress ?? "—"}
              </p>
              <p>
                <span className="font-semibold">Created:</span>{" "}
                {user.createdAt?.toLocaleString() ?? "—"}
              </p>
              <p>
                <span className="font-semibold">Last Sign-In:</span>{" "}
                {user.lastSignInAt?.toLocaleString() ?? "—"}
              </p>
            </>
          )}
        </div>
      </div>

      {currentUser?.role === "ADMIN" && (
        <div className="rounded-lg border border-dashed border-border p-5">
          <h2 className="text-lg font-semibold">External Sync</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Trigger the external OSU and Ticketmaster sync on demand
          </p>
          <Button
            variant="outline"
            className="mt-3"
            onClick={handleSyncExternalEvents}
            disabled={isSyncing}
          >
            {isSyncing ? "Syncing..." : "Sync External Events"}
          </Button>

          {syncError && (
            <div className="mt-3 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
              {syncError}
            </div>
          )}

          {syncSummary && (
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <SyncSummaryCard title="OSU" summary={syncSummary.sources.osu} />
              <SyncSummaryCard
                title="Ticketmaster"
                summary={syncSummary.sources.ticketmaster}
              />
            </div>
          )}
        </div>
      )}

      {currentUser?.role === "ADMIN" && (
        <div className="rounded-lg border border-dashed border-border p-5">
          <h2 className="text-lg font-semibold">AI Pipeline</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Inspect recent enrichment jobs and trigger reruns or missing-embedding backfills
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={() => void refreshPipelineJobs()}
              disabled={isLoadingPipelineJobs}
            >
              {isLoadingPipelineJobs ? "Refreshing..." : "Refresh AI Pipeline Jobs"}
            </Button>
            <Button
              variant="outline"
              onClick={handleEmbeddingBackfill}
              disabled={isBackfillingEmbeddings}
            >
              {isBackfillingEmbeddings
                ? "Backfilling..."
                : "Backfill Missing Embeddings"}
            </Button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Input
              placeholder="Enter event ID"
              value={pipelineEventId}
              onChange={(e) => setPipelineEventId(e.target.value)}
              className="max-w-sm"
            />
            <Button
              variant="outline"
              onClick={() => void handleRerunPipeline("FULL_PIPELINE")}
              disabled={isRerunningPipeline}
            >
              {isRerunningPipeline ? "Queueing..." : "Rerun Full Pipeline"}
            </Button>
            <Button
              variant="outline"
              onClick={() => void handleRerunPipeline("EMBEDDING")}
              disabled={isRerunningPipeline}
            >
              {isRerunningPipeline ? "Queueing..." : "Rerun Embedding Only"}
            </Button>
          </div>

          {pipelineNotice && (
            <div className="mt-3 rounded-md border border-border bg-card p-3 text-sm">
              {pipelineNotice}
            </div>
          )}

          {pipelineError && (
            <div className="mt-3 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
              {pipelineError}
            </div>
          )}

          <div className="mt-3 space-y-3">
            {pipelineJobs.length === 0 ? (
              <div className="rounded-md border border-border bg-card p-3 text-sm text-muted-foreground">
                No recent AI pipeline jobs
              </div>
            ) : (
              pipelineJobs.map((job) => (
                <PipelineJobCard key={job.id} job={job} />
              ))
            )}
          </div>
        </div>
      )}

      <div className="rounded-lg border border-dashed border-border p-5">
        <h2 className="text-lg font-semibold">Environment</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Browser and runtime information
        </p>
        <div className="mt-3 space-y-1 rounded-md border border-border bg-card p-3 text-sm">
          <p>
            <span className="font-semibold">User Agent:</span>{" "}
            <code className="break-all">{navigator.userAgent}</code>
          </p>
          <p>
            <span className="font-semibold">Language:</span>{" "}
            {navigator.language}
          </p>
          <p>
            <span className="font-semibold">Platform:</span>{" "}
            {navigator.platform}
          </p>
          <p>
            <span className="font-semibold">Online:</span>{" "}
            {navigator.onLine ? "Yes" : "No"}
          </p>
          <p>
            <span className="font-semibold">Viewport:</span>{" "}
            {window.innerWidth} × {window.innerHeight}
          </p>
          <p>
            <span className="font-semibold">Device Pixel Ratio:</span>{" "}
            {window.devicePixelRatio}
          </p>
          <p>
            <span className="font-semibold">URL:</span>{" "}
            <code className="break-all">{window.location.href}</code>
          </p>
          <p>
            <span className="font-semibold">Timezone:</span>{" "}
            {Intl.DateTimeFormat().resolvedOptions().timeZone}
          </p>
        </div>
      </div>

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

function SyncSummaryCard({
  title,
  summary,
}: {
  title: string;
  summary: SyncSourceSummary;
}) {
  return (
    <div className="rounded-md border border-border bg-card p-3 text-sm">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2">Fetched: {summary.fetched}</p>
      <p>Created: {summary.created}</p>
      <p>Updated: {summary.updated}</p>
      <p>Skipped: {summary.skipped}</p>
      <p>Completed: {summary.completed}</p>
    </div>
  );
}

function PipelineJobCard({ job }: { job: PipelineJobSummary }) {
  return (
    <div className="rounded-md border border-border bg-card p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold">{job.trigger}</h3>
          <p className="text-muted-foreground">Job {job.id}</p>
        </div>
        <span className="font-semibold">{job.status}</span>
      </div>

      <p className="mt-2">
        <span className="font-semibold">Stages:</span> {job.stages.join(", ")}
      </p>
      {job.error ? (
        <p className="mt-1 text-destructive">{job.error}</p>
      ) : null}

      <div className="mt-3 space-y-2">
        {job.runs.map((run) => (
          <div key={run.id} className="rounded border border-border p-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold">
                {run.event?.title ?? run.eventId}
              </span>
              <span>{run.status}</span>
            </div>
            <p className="mt-1 text-muted-foreground">
              {run.stage} • {run.eventId}
            </p>
            {run.error ? <p className="mt-1 text-destructive">{run.error}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
