import { createFileRoute } from "@tanstack/react-router";
import { SignUp } from "@clerk/clerk-react";
import { isE2ETestAuthEnabled } from "@/lib/e2e-auth";

export const Route = createFileRoute("/sign-up")({
  component: SignUpPage,
});

export function SignUpPage() {
  const e2eTestAuthEnabled = isE2ETestAuthEnabled(import.meta.env);

  return (
    <div className="flex min-h-screen items-center justify-center">
      {e2eTestAuthEnabled ? (
        <div
          data-clerk
          className="cl-rootBox cl-signUp-root w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm"
        >
          <h1 className="text-xl font-semibold">Sign up</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Playwright auth mode is enabled. Tests provision users directly and
            bypass the live Clerk sign-up flow.
          </p>
        </div>
      ) : (
        <SignUp routing="hash" />
      )}
    </div>
  );
}
