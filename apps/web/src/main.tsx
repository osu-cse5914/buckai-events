import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { getClerkPublishableKey } from "./lib/env";
import "./index.css";

const queryClient = new QueryClient();

const CLERK_PUBLISHABLE_KEY = getClerkPublishableKey(import.meta.env);

const router = createRouter({
  routeTree,
  context: { auth: undefined! },
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

function AppWithAuth() {
  const auth = useAuth();

  if (!auth.isLoaded) {
    return null;
  }

  return <RouterProvider router={router} context={{ auth }} />;
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
