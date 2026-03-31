import { test, expect } from "@playwright/test";

test.describe("Navigation and auth redirect", () => {
  test("unauthenticated user visiting / is redirected to /sign-in", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/sign-in/);
  });

  test("sign-in page renders Clerk widget", async ({ page }) => {
    await page.goto("/sign-in");

    // Clerk mounts its sign-in component into the page
    await expect(
      page.locator(".cl-signIn-root, .cl-rootBox, [data-clerk]").first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("sign-up page renders Clerk widget", async ({ page }) => {
    await page.goto("/sign-up");

    // Clerk mounts its sign-up component into the page
    await expect(
      page.locator(".cl-signUp-root, .cl-rootBox, [data-clerk]").first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("unauthenticated user visiting /catalog is redirected to /sign-in", async ({
    page,
  }) => {
    await page.goto("/catalog");
    await expect(page).toHaveURL(/sign-in/);
  });

  test("unauthenticated user visiting /profile is redirected to /sign-in", async ({
    page,
  }) => {
    await page.goto("/profile");
    await expect(page).toHaveURL(/sign-in/);
  });
});
