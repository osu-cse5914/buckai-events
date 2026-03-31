import { useState } from "react";
import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useRouterState,
} from "@tanstack/react-router";
import { UserButton } from "@clerk/clerk-react";
import {
  BugIcon,
  BriefcaseBusinessIcon,
  CalendarIcon,
  MenuIcon,
  SearchIcon,
  SparklesIcon,
  StarIcon,
  UserRoundIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export const navLinks = [
  { to: "/featured", label: "Featured" },
  { to: "/events", label: "Events" },
  { to: "/gigs", label: "Gigs" },
  { to: "/you", label: "You" },
] as const;

export const utilityNavLinks = [
  { to: "/search", label: "Search" },
  { to: "/ai", label: "Agent" },
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
  const location = useRouterState({
    select: (state) => state.location,
  });

  return (
    <div className="min-h-screen bg-background md:flex">
      <aside className="hidden h-screen w-24 shrink-0 border-r border-border md:sticky md:top-0 md:flex md:flex-col md:px-3 md:py-4">
        <BrandLink />

        <nav className="mt-6 flex flex-col gap-1.5">
          {navLinks.map((item) => (
            <ShellNavLink
              key={item.to}
              item={item}
              pathname={location.pathname}
              variant="rail"
            />
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-4 pt-6">
          <div className="flex flex-col gap-1.5 border-t border-border pt-4">
            {utilityNavLinks.map((item) => (
              <ShellNavLink
                key={item.to}
                item={item}
                pathname={location.pathname}
                variant="rail"
              />
            ))}
          </div>

          <div className="flex flex-col items-center gap-1.5 py-1.5">
            <AccountMenu />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-border md:hidden">
          <div className="flex items-center justify-between px-4 py-2.5">
            <BrandLink compact />

            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open menu">
                  <MenuIcon className="size-5" />
                </Button>
              </SheetTrigger>

              <SheetContent side="left" className="flex w-64 flex-col px-0">
                <SheetHeader className="px-3 pb-1">
                  <SheetTitle>
                    <BrandLink compact />
                  </SheetTitle>
                </SheetHeader>

                <div className="flex flex-1 flex-col px-3 pb-4">
                  <nav className="mt-4 flex flex-col gap-1.5">
                    {navLinks.map((item) => (
                      <ShellNavLink
                        key={item.to}
                        item={item}
                        pathname={location.pathname}
                        variant="drawer"
                        onClick={() => setMobileOpen(false)}
                      />
                    ))}
                  </nav>

                  <div className="mt-auto flex flex-col gap-4 pt-4">
                    <div className="flex flex-col gap-1.5 border-t border-border pt-4">
                      {utilityNavLinks.map((item) => (
                        <ShellNavLink
                          key={item.to}
                          item={item}
                          pathname={location.pathname}
                          variant="drawer"
                          onClick={() => setMobileOpen(false)}
                        />
                      ))}
                    </div>

                    <div className="border-t border-border pt-4">
                      <div className="flex items-center gap-3 rounded-2xl bg-accent/50 px-3 py-2.5">
                        <AccountMenu />
                        <div className="min-w-0">
                          <p className="text-sm font-medium">Account</p>
                          <p className="text-xs text-muted-foreground">
                            Profile and session
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </header>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function BrandLink({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      to="/featured"
      className={cn(
        "group inline-flex shrink-0 items-center",
        compact ? "flex-row" : "flex-col text-center",
      )}
    >
      <span className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 via-amber-500 to-red-500 text-sm font-semibold tracking-tight text-white shadow-sm">
        SO
      </span>
    </Link>
  );
}

function ShellNavLink({
  item,
  pathname,
  variant,
  onClick,
}: {
  item: (typeof navLinks)[number] | (typeof utilityNavLinks)[number];
  pathname: string;
  variant: "rail" | "drawer";
  onClick?: () => void;
}) {
  const Icon = NAV_ICONS[item.to];
  const isActive = isNavActive(pathname, item.to);

  return (
    <Button
      variant="ghost"
      asChild
      className={cn(
        variant === "rail"
          ? "h-auto w-full flex-col gap-1 rounded-xl px-1.5 py-2 text-center"
          : "h-11 w-full justify-start gap-2.5 rounded-xl px-3",
        isActive
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Link
        to={item.to}
        onClick={onClick}
        aria-current={isActive ? "page" : undefined}
      >
        <Icon className={cn("shrink-0", "size-4")} />
        <span
          className={cn(
            "font-medium",
            variant === "rail" ? "text-[11px] leading-tight" : "text-sm",
          )}
        >
          {item.label}
        </span>
      </Link>
    </Button>
  );
}

function AccountMenu() {
  return (
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
  );
}

const NAV_ICONS = {
  "/featured": StarIcon,
  "/events": CalendarIcon,
  "/gigs": BriefcaseBusinessIcon,
  "/you": UserRoundIcon,
  "/search": SearchIcon,
  "/ai": SparklesIcon,
} as const;

function isNavActive(pathname: string, to: string) {
  if (to === "/featured") {
    return pathname === "/featured";
  }

  return pathname === to || pathname.startsWith(`${to}/`);
}
