import { test, expect } from "@playwright/test";
import {
  E2E_APPLICANT_ID,
  E2E_GIG_ID,
  E2E_OWNER_ID,
  disconnectGigApplicationFixtures,
  resetGigApplicationFixtures,
  seedGigApplicationFixtures,
} from "./helpers/gig-application-fixtures";
import { createAuthenticatedPage, signInAs } from "./helpers/auth";

test.describe("[phase:2] [regression:always] Gig application flows", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async () => {
    await resetGigApplicationFixtures();
  });

  test.afterEach(async () => {
    await resetGigApplicationFixtures();
  });

  test.afterAll(async () => {
    await disconnectGigApplicationFixtures();
  });

  test("TC-APP-010: applicant can apply from the gig detail page", async ({
    page,
  }) => {
    await seedGigApplicationFixtures();
    await signInAs(page, E2E_APPLICANT_ID);

    await page.goto(`/events/${E2E_GIG_ID}`);

    await expect(
      page.getByRole("heading", { name: "E2E Calculus Tutor" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Apply" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Apply to this gig")).toBeVisible();
    await dialog
      .getByLabel("Message (optional)")
      .fill("I have tutoring experience.");
    await dialog.getByRole("button", { name: "Submit application" }).click();

    await expect(page.getByText("Application submitted.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Applied" })).toBeDisabled();
  });

  test('TC-APP-011: applicant can review submitted applications in "My Applications"', async ({
    page,
  }) => {
    await seedGigApplicationFixtures({
      applicationStatus: "PENDING",
      applicationMessage: "I have tutoring experience.",
    });
    await signInAs(page, E2E_APPLICANT_ID);

    await page.goto("/you/applications");

    await expect(
      page.getByRole("heading", { name: "Applications" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /E2E Calculus Tutor/i }),
    ).toBeVisible();
    await expect(page.getByText("Pending")).toBeVisible();
    await expect(page.getByText("I have tutoring experience.")).toBeVisible();
  });

  test("TC-APP-012: gig owner can manage applications and applicant sees the updated status", async ({
    browser,
  }) => {
    await seedGigApplicationFixtures({
      applicationStatus: "PENDING",
      applicationMessage: "I have tutoring experience.",
    });

    const { context: ownerContext, page: ownerPage } = await createAuthenticatedPage(
      browser,
      E2E_OWNER_ID,
    );
    const {
      context: applicantContext,
      page: applicantPage,
    } = await createAuthenticatedPage(browser, E2E_APPLICANT_ID);

    try {
      await ownerPage.goto(`/events/${E2E_GIG_ID}/applications`);

      await expect(
        ownerPage.getByRole("heading", { name: "Manage Applications" }),
      ).toBeVisible();
      await expect(ownerPage.getByText("E2E Applicant")).toBeVisible();
      await ownerPage.getByRole("button", { name: "Accept" }).click();
      await expect(ownerPage.getByText("Accepted")).toBeVisible();

      await applicantPage.goto("/you/applications");
      await expect(
        applicantPage.getByRole("link", { name: /E2E Calculus Tutor/i }),
      ).toBeVisible();
      await expect(applicantPage.getByText("Accepted")).toBeVisible();
    } finally {
      await ownerContext.close();
      await applicantContext.close();
    }
  });
});
