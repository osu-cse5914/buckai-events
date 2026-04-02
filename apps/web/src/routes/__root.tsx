import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import type { ApiClient } from "@/lib/api";
import type { AppAuth } from "@/lib/e2e-auth";

type RouterContext = {
  auth: AppAuth;
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
