import { test, expect } from "@playwright/test";
import {
  E2E_AI_CONVERSATION_A,
  E2E_AI_CONVERSATION_B,
  E2E_AI_USER_ID,
  disconnectAiFixtures,
  resetAiFixtures,
  seedAiFixtures,
} from "./helpers/ai-fixtures";
import { signInAs } from "./helpers/auth";

test.describe("BuckAI browser integration", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async () => {
    await resetAiFixtures();
  });

  test.afterEach(async () => {
    await resetAiFixtures();
  });

  test.afterAll(async () => {
    await disconnectAiFixtures();
  });

  test("TC-CONV-009: conversation sidebar renders existing chats and switches histories", async ({
    page,
  }) => {
    await seedAiFixtures();
    await signInAs(page, E2E_AI_USER_ID);

    await page.goto(`/ai?conversationId=${E2E_AI_CONVERSATION_A}`);

    await expect(page.getByRole("heading", { name: "Ask BuckAI" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Music picks" })).toBeVisible();
    await expect(
      page.getByText("Looking for something this weekend? I found a few music events."),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /Tutoring gigs/i })).toBeVisible();

    await page.getByRole("button", { name: /Tutoring gigs/i }).click();

    await expect(page).toHaveURL(new RegExp(`conversationId=${E2E_AI_CONVERSATION_B}`));
    await expect(page.getByRole("heading", { name: "Tutoring gigs" })).toBeVisible();
    await expect(
      page.getByText("I found a few tutoring gigs worth checking out."),
    ).toBeVisible();
  });
});
