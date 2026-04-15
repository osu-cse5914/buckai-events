import type { Browser, BrowserContext, Page } from "@playwright/test";
import { E2E_TEST_AUTH_STORAGE_KEY } from "../../apps/web/src/lib/e2e-auth";

export const BASE_URL = "http://localhost:5173";

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
