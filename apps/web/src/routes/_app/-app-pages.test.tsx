import { describe, expect, it, vi } from "vitest";
import {
  getVisibleNavLinks,
  getVisibleUtilityNavLinks,
  navLinks,
  utilityNavLinks,
} from "@/components/layout/app-shell";
import { requireSignedInBeforeLoad } from "@/lib/route-access";

const state = vi.hoisted(() => ({
  beforeLoads: {} as Record<string, ((args?: unknown) => unknown) | undefined>,
}));
const redirectMock = vi.fn((options: { to: string }) => options);

vi.mock("@tanstack/react-router", () => ({
  createFileRoute:
    (path: string) =>
    (config: { beforeLoad?: () => unknown; component?: React.ComponentType }) => {
      state.beforeLoads[path] = config.beforeLoad;
      return {
        beforeLoad: config.beforeLoad,
        component: config.component,
        fullPath: path,
      };
    },
  redirect: (options: { to: string }) => redirectMock(options),
  Link: () => null,
  Outlet: () => null,
}));

vi.mock("@clerk/clerk-react", () => ({
  useAuth: () => ({ isSignedIn: true }),
  UserButton: () => null,
}));

describe("[phase:6] [regression:always] App Pages Shell", () => {
  it("TC-PAGES-011: primary nav exposes only the app-pages destinations", () => {
    expect(navLinks).toEqual([
      { to: "/search", label: "Search" },
      { to: "/featured", label: "Featured" },
      { to: "/events", label: "Events" },
      { to: "/gigs", label: "Gigs" },
      { to: "/you", label: "You" },
    ]);

    expect(utilityNavLinks).toEqual([{ to: "/ai", label: "BuckAI" }]);
  });

  it("TC-SFEED-011: primary nav does not expose the Social destination", () => {
    expect(navLinks).not.toContainEqual({ to: "/social", label: "Social" });
  });

  it("signed-out shell navigation keeps only the public discovery destinations", () => {
    expect(getVisibleNavLinks(false)).toEqual([
      { to: "/featured", label: "Featured" },
      { to: "/events", label: "Events" },
      { to: "/gigs", label: "Gigs" },
    ]);
    expect(getVisibleUtilityNavLinks(false)).toEqual([]);
  });

  it("TC-PAGES-010: the authenticated root redirects to Featured", async () => {
    await import("./index");

    const beforeLoad = state.beforeLoads["/_app/"];
    if (!beforeLoad) {
      throw new Error("Root beforeLoad handler was not captured");
    }

    let thrown: unknown;
    try {
      beforeLoad();
    } catch (error) {
      thrown = error;
    }

    expect(redirectMock).toHaveBeenCalledWith({ to: "/featured" });
    expect(thrown).toEqual({ to: "/featured" });
  });

  it("TC-AUTH-011: the shared shell stays layout-only for public discovery routes", async () => {
    await import("../_app");

    expect(state.beforeLoads["/_app"]).toBeUndefined();
  });

  it("TC-AUTH-012: private route guards redirect signed-out users to /sign-in", () => {
    let thrown: unknown;
    try {
      requireSignedInBeforeLoad({
        context: { auth: { isSignedIn: false } },
      });
    } catch (error) {
      thrown = error;
    }

    expect(redirectMock).toHaveBeenCalledWith({ to: "/sign-in" });
    expect(thrown).toEqual({ to: "/sign-in" });
  });
});
