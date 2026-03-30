import { useState } from "react";
import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
} from "@tanstack/react-router";
import { UserButton } from "@clerk/clerk-react";
import { BugIcon, MenuIcon, UserRoundIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export const navLinks = [
  { to: "/featured", label: "Featured" },
  { to: "/catalog", label: "Catalog" },
  { to: "/search", label: "Search" },
  { to: "/ai", label: "AI" },
  { to: "/you", label: "You" },
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
              to="/featured"
              className="text-sm font-semibold tracking-tight hover:opacity-80"
            >
              Social OSU
            </Link>

            <nav className="hidden items-center gap-1 md:flex">
              {navLinks.map(({ to, label }) => (
                <Button key={to} variant="ghost" size="sm" asChild>
                  <Link to={to} activeProps={{ className: "bg-accent" }}>
                    {label}
                  </Link>
                </Button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <UserButton>
              <UserButton.MenuItems>
                <UserButton.Link
                  label="My Profile"
                  labelIcon={<UserRoundIcon className="size-4" />}
                  href="/profile"
                />
                {import.meta.env.DEV ? (
                  <UserButton.Link
                    label="Debug"
                    labelIcon={<BugIcon className="size-4" />}
                    href="/debug"
                  />
                ) : null}
                <UserButton.Action label="manageAccount" />
                <UserButton.Action label="signOut" />
              </UserButton.MenuItems>
            </UserButton>

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
