import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { ApiClientProvider, createApiClient } from "./lib/api";
import { isE2ETestAuthEnabled, readStoredE2ETestUserId, type AppAuth } from "./lib/e2e-auth";
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

function AppWithAuth() {
  const clerkAuth = useAuth();
  const e2eTestAuthEnabled = isE2ETestAuthEnabled(import.meta.env);
  const [e2eUserId, setE2EUserId] = useState<string | null>(() =>
    e2eTestAuthEnabled ? readStoredE2ETestUserId() : null,
  );

  useEffect(() => {
    if (!e2eTestAuthEnabled) {
      return;
    }

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
  }, [e2eTestAuthEnabled]);

  const auth: AppAuth = e2eTestAuthEnabled
    ? {
        isLoaded: true,
        isSignedIn: Boolean(e2eUserId),
        getToken: async () => null,
      }
    : {
        isLoaded: clerkAuth.isLoaded,
        isSignedIn: Boolean(clerkAuth.isSignedIn),
        getToken: clerkAuth.getToken,
      };

  if (!auth.isLoaded) {
    return null;
  }

  const api = createApiClient({
    getToken: auth.getToken,
    getE2ETestUserId: e2eTestAuthEnabled ? () => e2eUserId : undefined,
  });

  return (
    <ApiClientProvider client={api}>
      <RouterProvider router={router} context={{ auth, api, queryClient }} />
    </ApiClientProvider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ClerkProvider
        publishableKey={CLERK_PUBLISHABLE_KEY}
        signInUrl="/sign-in"
        signUpUrl="/sign-up"
        afterSignOutUrl="/sign-in"
      >
        <AppWithAuth />
      </ClerkProvider>
    </QueryClientProvider>
  </StrictMode>,
);
