export const DEFAULT_CLERK_PUBLISHABLE_KEY =
  "pk_test_ZHJpdmVuLWVhZ2xlLTI2LmNsZXJrLmFjY291bnRzLmRldiQ";

export function ensureClerkPublishableKey() {
  if (typeof process === "undefined") {
    return;
  }

  const existing = process.env.CLERK_PUBLISHABLE_KEY?.trim();
  if (!existing) {
    process.env.CLERK_PUBLISHABLE_KEY = DEFAULT_CLERK_PUBLISHABLE_KEY;
  }
}
