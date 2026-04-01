-- AlterTable
ALTER TABLE "Conversation"
ADD COLUMN "pendingAction" JSONB,
ADD COLUMN "pendingActionCreatedAt" TIMESTAMP(3);
