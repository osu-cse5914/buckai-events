import { useEffect } from "react";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useAuth, UserButton } from "@clerk/clerk-react";
import { api, setTokenGetter } from "@/lib/api";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: ({ context }) => {
    if (!context.auth.isSignedIn) {
      throw redirect({ to: "/sign-in" });
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { getToken } = useAuth();

  useEffect(() => {
    setTokenGetter(getToken);

    // Trigger user provisioning on first authenticated load
    api.api.v1.auth.me.$get().catch(() => {
      // Provisioning errors are non-fatal for the UI
    });
  }, [getToken]);

  return (
    <>
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <span className="text-sm font-semibold tracking-tight">
            Social OSU
          </span>
          <UserButton />
        </div>
      </header>
      <Outlet />
    </>
  );
}
