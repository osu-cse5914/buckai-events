import type { AppStatus } from "@prisma/client";
import type { Browser, BrowserContext, Page } from "@playwright/test";
import { getPrismaClient } from "../../apps/backend/src/lib/prisma";
import { E2E_TEST_AUTH_STORAGE_KEY } from "../../apps/web/src/lib/e2e-auth";

const BASE_URL = "http://localhost:5173";
const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/social_osu_app?schema=public";
const prisma = getPrismaClient(DATABASE_URL);

export const E2E_OWNER_ID = "user_e2e_owner";
export const E2E_APPLICANT_ID = "user_e2e_applicant";
export const E2E_GIG_ID = "evt_e2e_gig";

const OWNER = {
  id: E2E_OWNER_ID,
  clerkId: "clerk_e2e_owner",
  email: "owner-e2e@osu.edu",
  displayName: "E2E Owner",
  role: "USER" as const,
};

const APPLICANT = {
  id: E2E_APPLICANT_ID,
  clerkId: "clerk_e2e_applicant",
  email: "applicant-e2e@osu.edu",
  displayName: "E2E Applicant",
  role: "USER" as const,
};

const GIG = {
  id: E2E_GIG_ID,
  title: "E2E Calculus Tutor",
  description: "Help with derivatives and integration techniques.",
  type: "GIG" as const,
  source: "USER" as const,
  category: "tutoring",
  tags: ["tutoring", "calculus"],
  locationName: "Thompson Library",
  startAt: new Date("2026-04-20T16:00:00.000Z"),
  endAt: new Date("2026-04-20T18:00:00.000Z"),
  compensationAmount: 30,
  compensationCurrency: "USD",
  compensationType: "HOURLY" as const,
  status: "OPEN" as const,
  creatorId: OWNER.id,
};

export async function resetGigApplicationFixtures() {
  await prisma.interaction.deleteMany({
    where: { eventId: E2E_GIG_ID },
  });
  await prisma.application.deleteMany({
    where: { gigId: E2E_GIG_ID },
  });
  await prisma.event.deleteMany({
    where: { id: E2E_GIG_ID },
  });
  await prisma.user.deleteMany({
    where: {
      id: {
        in: [E2E_OWNER_ID, E2E_APPLICANT_ID],
      },
    },
  });
}

export async function seedGigApplicationFixtures(input?: {
  applicationStatus?: AppStatus;
  applicationMessage?: string | null;
}) {
  await resetGigApplicationFixtures();

  await prisma.user.create({
    data: OWNER,
  });
  await prisma.user.create({
    data: APPLICANT,
  });
  await prisma.event.create({
    data: GIG,
  });

  if (input?.applicationStatus) {
    await prisma.application.create({
      data: {
        gigId: E2E_GIG_ID,
        applicantId: E2E_APPLICANT_ID,
        message: input.applicationMessage ?? null,
        status: input.applicationStatus,
      },
    });
  }
}

export async function disconnectGigApplicationFixtures() {
  await prisma.$disconnect();
}

export async function signInAs(page: Page, userId: string) {
  await page.addInitScript(
    ({ storageKey, nextUserId }) => {
      window.localStorage.setItem(storageKey, nextUserId);
    },
    {
      storageKey: E2E_TEST_AUTH_STORAGE_KEY,
      nextUserId: userId,
    },
  );
}

export async function createAuthenticatedPage(
  browser: Browser,
  userId: string,
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ baseURL: BASE_URL });
  const page = await context.newPage();

  await signInAs(page, userId);
  await page.goto(BASE_URL);

  return { context, page };
}
