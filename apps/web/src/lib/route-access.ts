import { redirect } from "@tanstack/react-router";

export const PUBLIC_DISCOVERY_NAV_PATHS = [
  "/featured",
  "/events",
  "/gigs",
] as const;

const PUBLIC_AUTHENTICATED_ROUTE_PATTERNS = [
  /^\/featured$/,
  /^\/events$/,
  /^\/gigs$/,
  /^\/events\/[^/]+$/,
  /^\/users\/[^/]+$/,
] as const;

export function isPublicAuthenticatedPath(pathname: string) {
  return PUBLIC_AUTHENTICATED_ROUTE_PATTERNS.some((pattern) => pattern.test(pathname));
}

export function requireSignedInBeforeLoad({
  context,
}: {
  context: { auth: { isSignedIn: boolean } };
}) {
  if (!context.auth.isSignedIn) {
    throw redirect({ to: "/sign-in" });
  }
}
