function readRequiredExpoPublicEnv(name: "EXPO_PUBLIC_API_BASE_URL" | "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY") {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required for the mobile app`);
  }

  return value;
}

export const API_BASE_URL = readRequiredExpoPublicEnv("EXPO_PUBLIC_API_BASE_URL");
export const CLERK_PUBLISHABLE_KEY = readRequiredExpoPublicEnv(
  "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY",
);
