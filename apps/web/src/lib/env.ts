const DEFAULT_CLERK_PUBLISHABLE_KEY = "pk_test_ZHJpdmVuLWVhZ2xlLTI2LmNsZXJrLmFjY291bnRzLmRldiQ";

type WebEnv = {
  VITE_CLERK_PUBLISHABLE_KEY?: string;
};

export function getClerkPublishableKey(env: WebEnv): string {
  const override = env.VITE_CLERK_PUBLISHABLE_KEY?.trim();
  return override && override.length > 0 ? override : DEFAULT_CLERK_PUBLISHABLE_KEY;
}
