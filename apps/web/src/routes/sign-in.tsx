import { createFileRoute } from "@tanstack/react-router";
import { SignIn } from "@clerk/clerk-react";
import { isE2ETestAuthEnabled } from "@/lib/e2e-auth";

export const Route = createFileRoute("/sign-in")({
  component: SignInPage,
});

export function SignInPage() {
  const e2eTestAuthEnabled = isE2ETestAuthEnabled(import.meta.env);

  return (
    <div className="flex min-h-screen items-center justify-center">
      {e2eTestAuthEnabled ? (
        <div
          data-clerk
          className="cl-rootBox cl-signIn-root w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm"
        >
          <h1 className="text-xl font-semibold">Sign in</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Playwright auth mode is enabled. Tests sign in by seeding local
            storage instead of using the live Clerk widget.
          </p>
        </div>
      ) : (
        <SignIn routing="hash" />
      )}
    </div>
  );
}
