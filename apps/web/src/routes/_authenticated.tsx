import { useState } from "react";
import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
} from "@tanstack/react-router";
import { UserButton } from "@clerk/clerk-react";
import { MenuIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export const navLinks = [
  { to: "/events", label: "Events" },
  { to: "/applications", label: "My Applications" },
  { to: "/profile", label: "Profile" },
  { to: "/debug", label: "Debug" },
] as const;

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: ({ context }) => {
    if (!context.auth.isSignedIn) {
      throw redirect({ to: "/sign-in" });
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <Link
              to="/"
              className="text-sm font-semibold tracking-tight hover:opacity-80"
            >
              Social OSU
            </Link>

            <nav className="hidden items-center gap-1 md:flex">
              {navLinks.map(({ to, label }) => (
                <Button key={to} variant="ghost" size="sm" asChild>
                  <Link
                    to={to}
                    activeProps={{ className: "bg-accent" }}
                  >
                    {label}
                  </Link>
                </Button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <UserButton />

            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  aria-label="Open menu"
                >
                  <MenuIcon className="size-5" />
                </Button>
              </SheetTrigger>

              <SheetContent side="right">
                <SheetHeader>
                  <SheetTitle>Social OSU</SheetTitle>
                </SheetHeader>

                <nav className="flex flex-col gap-1 px-4">
                  {navLinks.map(({ to, label }) => (
                    <Button
                      key={to}
                      variant="ghost"
                      className="justify-start"
                      asChild
                    >
                      <Link
                        to={to}
                        activeProps={{ className: "bg-accent" }}
                        onClick={() => setMobileOpen(false)}
                      >
                        {label}
                      </Link>
                    </Button>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <Outlet />
    </>
  );
}
