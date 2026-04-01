-- CreateEnum
CREATE TYPE "EventPipelineTrigger" AS ENUM (
  'EVENT_CREATE',
  'EVENT_UPDATE',
  'ADMIN_RERUN',
  'EMBEDDING_BACKFILL'
);

-- CreateEnum
CREATE TYPE "EventPipelineJobStatus" AS ENUM (
  'QUEUED',
  'RUNNING',
  'SUCCEEDED',
  'PARTIAL',
  'FAILED'
);

-- CreateEnum
CREATE TYPE "EventPipelineRunStatus" AS ENUM (
  'QUEUED',
  'RUNNING',
  'SUCCEEDED',
  'SKIPPED',
  'FAILED'
);

-- CreateEnum
CREATE TYPE "EventPipelineStage" AS ENUM ('TAGGING', 'EMBEDDING');

-- CreateTable
CREATE TABLE "EventPipelineJob" (
  "id" TEXT NOT NULL,
  "trigger" "EventPipelineTrigger" NOT NULL,
  "status" "EventPipelineJobStatus" NOT NULL DEFAULT 'QUEUED',
  "stages" TEXT[],
  "error" TEXT,
  "requestedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),

  CONSTRAINT "EventPipelineJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventPipelineRun" (
  "id" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "stage" "EventPipelineStage" NOT NULL,
  "status" "EventPipelineRunStatus" NOT NULL DEFAULT 'QUEUED',
  "textHash" TEXT,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),

  CONSTRAINT "EventPipelineRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventPipelineJob_requestedByUserId_idx"
ON "EventPipelineJob"("requestedByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "EventPipelineRun_jobId_eventId_stage_key"
ON "EventPipelineRun"("jobId", "eventId", "stage");

-- CreateIndex
CREATE INDEX "EventPipelineRun_jobId_idx"
ON "EventPipelineRun"("jobId");

-- CreateIndex
CREATE INDEX "EventPipelineRun_eventId_idx"
ON "EventPipelineRun"("eventId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EventEmbedding_embedding_hnsw_idx"
ON "EventEmbedding"
USING hnsw ("embedding" vector_cosine_ops);

-- AddForeignKey
ALTER TABLE "EventPipelineJob"
ADD CONSTRAINT "EventPipelineJob_requestedByUserId_fkey"
FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventPipelineRun"
ADD CONSTRAINT "EventPipelineRun_jobId_fkey"
FOREIGN KEY ("jobId") REFERENCES "EventPipelineJob"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventPipelineRun"
ADD CONSTRAINT "EventPipelineRun_eventId_fkey"
FOREIGN KEY ("eventId") REFERENCES "Event"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
