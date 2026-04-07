import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { ApiClientProvider, createApiClient } from "./lib/api";
import {
  isE2ETestAuthEnabled,
  readStoredE2ETestUserId,
  type AppAuth,
} from "./lib/e2e-auth";
import { getClerkPublishableKey } from "./lib/env";
import "./index.css";

const queryClient = new QueryClient();

const CLERK_PUBLISHABLE_KEY = getClerkPublishableKey(import.meta.env);

const router = createRouter({
  routeTree,
  context: {
    auth: undefined!,
    api: undefined!,
    queryClient: undefined!,
  },
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

function RouterApp({
  auth,
  getE2ETestUserId,
}: {
  auth: AppAuth;
  getE2ETestUserId?: () => string | null;
}) {
  if (!auth.isLoaded) {
    return null;
  }

  const api = createApiClient({
    getToken: auth.getToken,
    getE2ETestUserId,
  });

  return (
    <ApiClientProvider client={api}>
      <RouterProvider router={router} context={{ auth, api, queryClient }} />
    </ApiClientProvider>
  );
}

function E2ETestApp() {
  const [e2eUserId, setE2EUserId] = useState<string | null>(() =>
    readStoredE2ETestUserId(),
  );

  useEffect(() => {
    const syncE2EUserId = () => {
      setE2EUserId(readStoredE2ETestUserId());
    };

    syncE2EUserId();
    window.addEventListener("storage", syncE2EUserId);
    window.addEventListener("focus", syncE2EUserId);

    return () => {
      window.removeEventListener("storage", syncE2EUserId);
      window.removeEventListener("focus", syncE2EUserId);
    };
  }, []);

  const auth: AppAuth = {
    isLoaded: true,
    isSignedIn: Boolean(e2eUserId),
    getToken: async () => null,
  };

  return <RouterApp auth={auth} getE2ETestUserId={() => e2eUserId} />;
}

function ClerkApp() {
  const clerkAuth = useAuth();

  const auth: AppAuth = {
    isLoaded: clerkAuth.isLoaded,
    isSignedIn: Boolean(clerkAuth.isSignedIn),
    getToken: clerkAuth.getToken,
  };

  return (
    <RouterApp auth={auth} />
  );
}

const e2eTestAuthEnabled = isE2ETestAuthEnabled(import.meta.env);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      {e2eTestAuthEnabled ? (
        <E2ETestApp />
      ) : (
        <ClerkProvider
          publishableKey={CLERK_PUBLISHABLE_KEY}
          signInUrl="/sign-in"
          signUpUrl="/sign-up"
          afterSignOutUrl="/sign-in"
        >
          <ClerkApp />
        </ClerkProvider>
      )}
    </QueryClientProvider>
  </StrictMode>,
);
