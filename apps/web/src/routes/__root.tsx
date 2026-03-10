import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import type { useAuth } from "@clerk/clerk-react";

type RouterContext = {
  auth: ReturnType<typeof useAuth>;
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
