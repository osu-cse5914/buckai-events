import { useState } from "react";
import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { UserButton } from "@clerk/clerk-react";
import {
  BugIcon,
  MenuIcon,
  SearchIcon,
  SparklesIcon,
  UserRoundIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export const navLinks = [
  { to: "/featured", label: "Featured" },
  { to: "/events", label: "Events" },
  { to: "/gigs", label: "Gigs" },
  { to: "/you", label: "You" },
] as const;

const mobileNavLinks = [
  ...navLinks,
  { to: "/search", label: "Search" },
  { to: "/ai", label: "AI" },
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
  const navigate = useNavigate();
  const location = useRouterState({
    select: (state) => state.location,
  });
  const routeQuery =
    location.pathname === "/search" && typeof location.search.q === "string"
      ? location.search.q
      : "";

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
                  <Link
                    to={to}
                    activeProps={{ className: "bg-accent" }}
                    activeOptions={{ exact: true }}
                  >
                    {label}
                  </Link>
                </Button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <HeaderSearchForm
              key={`${location.pathname}:${routeQuery}`}
              initialValue={routeQuery}
              onSubmit={(query) =>
                navigate({
                  to: "/search",
                  search: (current) => ({
                    q: query || undefined,
                    type:
                      location.pathname === "/search" &&
                      typeof current.type === "string"
                        ? current.type
                        : undefined,
                    category:
                      location.pathname === "/search" &&
                      typeof current.category === "string"
                        ? current.category
                        : undefined,
                    page: undefined,
                  }),
                })
              }
            />

            <Button variant="outline" size="icon" asChild>
              <Link to="/ai" aria-label="AI">
                <SparklesIcon className="size-4" />
              </Link>
            </Button>

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
                  {mobileNavLinks.map(({ to, label }) => (
                    <Button
                      key={to}
                      variant="ghost"
                      className="justify-start"
                      asChild
                    >
                      <Link
                        to={to}
                        activeProps={{ className: "bg-accent" }}
                        activeOptions={{ exact: true }}
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

function HeaderSearchForm({
  initialValue,
  onSubmit,
}: {
  initialValue: string;
  onSubmit: (query: string) => void;
}) {
  const [value, setValue] = useState(initialValue);

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(value.trim());
  }

  return (
    <form
      onSubmit={submitSearch}
      className="relative hidden md:flex md:w-64 lg:w-80"
    >
      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        aria-label="Search"
        placeholder="Search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="h-10 rounded-full pl-9"
      />
    </form>
  );
}
