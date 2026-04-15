import { test, expect } from "@playwright/test";

test.describe("Navigation and auth redirect", () => {
  test("TC-AUTH-011: unauthenticated user visiting / is NOT redirected (public route)", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/featured/);
  });

  test("TC-AUTH-007: sign-in page renders Clerk widget", async ({ page }) => {
    await page.goto("/sign-in");

    // Clerk mounts its sign-in component into the page
    await expect(
      page.locator(".cl-signIn-root, .cl-rootBox, [data-clerk]").first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("TC-AUTH-010: sign-up page renders Clerk widget", async ({ page }) => {
    await page.goto("/sign-up");

    // Clerk mounts its sign-up component into the page
    await expect(
      page.locator(".cl-signUp-root, .cl-rootBox, [data-clerk]").first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("TC-AUTH-011: unauthenticated user visiting /events is NOT redirected (public route)", async ({
    page,
  }) => {
    await page.goto("/events");
    await expect(page).toHaveURL(/events/);
  });

  test("TC-AUTH-011: unauthenticated user visiting /gigs is NOT redirected (public route)", async ({
    page,
  }) => {
    await page.goto("/gigs");
    await expect(page).toHaveURL(/gigs/);
  });

  test("TC-AUTH-011: unauthenticated user visiting /profile is redirected to /sign-in", async ({
    page,
  }) => {
    await page.goto("/profile");
    await expect(page).toHaveURL(/sign-in/);
  });
});
