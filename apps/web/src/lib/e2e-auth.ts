export const E2E_TEST_AUTH_HEADER = "x-social-osu-e2e-user-id";
export const E2E_TEST_AUTH_STORAGE_KEY = "social-osu.e2e-user-id";

type E2ETestAuthEnv = {
  readonly [key: string]: string | boolean | undefined;
  VITE_E2E_TEST_AUTH_ENABLED?: string | boolean;
};

export type AppAuth = {
  isLoaded: boolean;
  isSignedIn: boolean;
  getToken: () => Promise<string | null>;
};

function readEnabledFlag(value: string | boolean | undefined) {
  if (typeof value === "boolean") {
    return value;
  }

  const normalized = value?.trim().toLowerCase();
  return normalized === "1" || normalized === "true";
}

export function isE2ETestAuthEnabled(env: E2ETestAuthEnv) {
  return readEnabledFlag(env.VITE_E2E_TEST_AUTH_ENABLED);
}

export function readStoredE2ETestUserId() {
  if (typeof window === "undefined") {
    return null;
  }

  const value = window.localStorage.getItem(E2E_TEST_AUTH_STORAGE_KEY)?.trim();
  return value ? value : null;
}
