import { describe, expect, it, vi } from "vitest";
import { navLinks } from "@/routes/_authenticated";

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

describe("[phase:6] [regression:always] App Pages Shell", () => {
  it("TC-PAGES-011: primary nav exposes only the app-pages destinations", () => {
    expect(navLinks).toEqual([
      { to: "/featured", label: "Featured" },
      { to: "/events", label: "Events" },
      { to: "/gigs", label: "Gigs" },
      { to: "/you", label: "You" },
    ]);
  });

  it("TC-PAGES-010: the authenticated root redirects to Featured", async () => {
    await import("./index");

    const beforeLoad = state.beforeLoads["/_authenticated/"];
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

  it("TC-AUTH-011: the shared authenticated shell redirects signed-out users to /sign-in", async () => {
    await import("../_authenticated");

    const beforeLoad = state.beforeLoads["/_authenticated"];
    if (!beforeLoad) {
      throw new Error("Authenticated shell beforeLoad handler was not captured");
    }

    let thrown: unknown;
    try {
      beforeLoad({ context: { auth: { isSignedIn: false } } });
    } catch (error) {
      thrown = error;
    }

    expect(redirectMock).toHaveBeenCalledWith({ to: "/sign-in" });
    expect(thrown).toEqual({ to: "/sign-in" });
  });
});
