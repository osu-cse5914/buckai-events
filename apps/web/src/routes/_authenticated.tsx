import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { UserButton } from "@clerk/clerk-react";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: ({ context }) => {
    if (!context.auth.isSignedIn) {
      throw redirect({ to: "/sign-in" });
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
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
