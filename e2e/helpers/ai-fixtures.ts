import { getPrismaClient } from "../../apps/backend/src/lib/prisma";

const DATABASE_URL =
  process.env.PLAYWRIGHT_DATABASE_URL ??
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/social_osu_app?schema=public";
const prisma = getPrismaClient(DATABASE_URL);

export const E2E_AI_USER_ID = "user_e2e_ai";
export const E2E_AI_OWNER_ID = "user_e2e_ai_owner";
export const E2E_AI_GIG_ID = "evt_e2e_ai_gig";
export const E2E_AI_CONVERSATION_A = "conv_e2e_ai_music";
export const E2E_AI_CONVERSATION_B = "conv_e2e_ai_tutoring";
export const E2E_AI_PENDING_CONVERSATION_ID = "conv_e2e_ai_pending";

const AI_USER = {
  id: E2E_AI_USER_ID,
  clerkId: "clerk_e2e_ai",
  email: "buckai-e2e@osu.edu",
  displayName: "BuckAI E2E User",
  role: "USER" as const,
};

const AI_OWNER = {
  id: E2E_AI_OWNER_ID,
  clerkId: "clerk_e2e_ai_owner",
  email: "buckai-owner-e2e@osu.edu",
  displayName: "BuckAI E2E Owner",
  role: "USER" as const,
};

const AI_GIG = {
  id: E2E_AI_GIG_ID,
  title: "E2E AI Tutor Gig",
  description: "Help first-year students with calculus review sessions.",
  type: "GIG" as const,
  source: "USER" as const,
  category: "tutoring",
  tags: ["tutoring", "calculus"],
  locationName: "Thompson Library",
  startAt: new Date("2026-04-25T17:00:00.000Z"),
  endAt: new Date("2026-04-25T19:00:00.000Z"),
  compensationAmount: 28,
  compensationCurrency: "USD",
  compensationType: "HOURLY" as const,
  status: "OPEN" as const,
  creatorId: E2E_AI_OWNER_ID,
};

export async function resetAiFixtures() {
  await prisma.message.deleteMany({
    where: {
      conversationId: {
        in: [
          E2E_AI_CONVERSATION_A,
          E2E_AI_CONVERSATION_B,
          E2E_AI_PENDING_CONVERSATION_ID,
        ],
      },
    },
  });
  await prisma.conversation.deleteMany({
    where: {
      id: {
        in: [
          E2E_AI_CONVERSATION_A,
          E2E_AI_CONVERSATION_B,
          E2E_AI_PENDING_CONVERSATION_ID,
        ],
      },
    },
  });
  await prisma.event.deleteMany({
    where: { id: E2E_AI_GIG_ID },
  });
  await prisma.user.deleteMany({
    where: {
      id: {
        in: [E2E_AI_USER_ID, E2E_AI_OWNER_ID],
      },
    },
  });
}

export async function seedAiFixtures() {
  await resetAiFixtures();

  await prisma.user.create({ data: AI_USER });
  await prisma.user.create({ data: AI_OWNER });
  await prisma.event.create({ data: AI_GIG });

  await prisma.conversation.createMany({
    data: [
      {
        id: E2E_AI_CONVERSATION_A,
        userId: E2E_AI_USER_ID,
        title: "Music picks",
        createdAt: new Date("2026-04-01T10:00:00.000Z"),
        updatedAt: new Date("2026-04-01T10:05:00.000Z"),
      },
      {
        id: E2E_AI_CONVERSATION_B,
        userId: E2E_AI_USER_ID,
        title: "Tutoring gigs",
        createdAt: new Date("2026-04-02T11:00:00.000Z"),
        updatedAt: new Date("2026-04-02T11:05:00.000Z"),
      },
      {
        id: E2E_AI_PENDING_CONVERSATION_ID,
        userId: E2E_AI_USER_ID,
        title: "Gig application",
        pendingAction: {
          id: "pending_e2e_ai_apply",
          toolName: "applyToGig",
          summary: "Apply to E2E AI Tutor Gig",
          args: {
            gigId: E2E_AI_GIG_ID,
            message: "I have tutoring experience.",
          },
        },
        pendingActionCreatedAt: new Date("2026-04-03T12:00:00.000Z"),
        createdAt: new Date("2026-04-03T12:00:00.000Z"),
        updatedAt: new Date("2026-04-03T12:05:00.000Z"),
      },
    ],
  });

  await prisma.message.createMany({
    data: [
      {
        id: "msg_e2e_ai_music_user",
        conversationId: E2E_AI_CONVERSATION_A,
        role: "USER",
        content: "Show me music events this weekend.",
        createdAt: new Date("2026-04-01T10:01:00.000Z"),
      },
      {
        id: "msg_e2e_ai_music_assistant",
        conversationId: E2E_AI_CONVERSATION_A,
        role: "ASSISTANT",
        content: "Looking for something this weekend? I found a few music events.",
        createdAt: new Date("2026-04-01T10:02:00.000Z"),
      },
      {
        id: "msg_e2e_ai_tutoring_user",
        conversationId: E2E_AI_CONVERSATION_B,
        role: "USER",
        content: "Find me tutoring gigs.",
        createdAt: new Date("2026-04-02T11:01:00.000Z"),
      },
      {
        id: "msg_e2e_ai_tutoring_assistant",
        conversationId: E2E_AI_CONVERSATION_B,
        role: "ASSISTANT",
        content: "I found a few tutoring gigs worth checking out.",
        createdAt: new Date("2026-04-02T11:02:00.000Z"),
      },
      {
        id: "msg_e2e_ai_pending_assistant",
        conversationId: E2E_AI_PENDING_CONVERSATION_ID,
        role: "ASSISTANT",
        content: "I found a tutoring gig and staged the application for your approval.",
        createdAt: new Date("2026-04-03T12:01:00.000Z"),
      },
    ],
  });
}

export async function findAiApplication() {
  return prisma.application.findUnique({
    where: {
      gigId_applicantId: {
        gigId: E2E_AI_GIG_ID,
        applicantId: E2E_AI_USER_ID,
      },
    },
  });
}

export async function disconnectAiFixtures() {
  await prisma.$disconnect();
}
