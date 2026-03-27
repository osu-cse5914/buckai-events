import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import type { useAuth } from "@clerk/clerk-react";
import type { ApiClient } from "@/lib/api";

type RouterContext = {
  auth: ReturnType<typeof useAuth>;
  api: ApiClient;
  queryClient: QueryClient;
};

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
});

function RootLayout() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Outlet />
    </main>
  );
}
