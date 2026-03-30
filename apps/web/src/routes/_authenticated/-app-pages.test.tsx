import { describe, expect, it, vi } from "vitest";
import { navLinks } from "@/routes/_authenticated";

const state = vi.hoisted(() => ({
  capturedBeforeLoad: null as (() => unknown) | null,
}));
const redirectMock = vi.fn((options: { to: string }) => options);

vi.mock("@tanstack/react-router", () => ({
  createFileRoute:
    () =>
    (config: { beforeLoad?: () => unknown; component?: React.ComponentType }) => {
      state.capturedBeforeLoad = config.beforeLoad ?? null;
      return { beforeLoad: config.beforeLoad, component: config.component };
    },
  redirect: (options: { to: string }) => redirectMock(options),
  Link: () => null,
  Outlet: () => null,
}));

describe("[phase:6] [regression:always] App Pages Shell", () => {
  it("TC-PAGES-011: primary nav exposes only the app-pages destinations", () => {
    expect(navLinks).toEqual([
      { to: "/featured", label: "Featured" },
      { to: "/catalog", label: "Catalog" },
      { to: "/search", label: "Search" },
      { to: "/ai", label: "AI" },
      { to: "/you", label: "You" },
    ]);
  });

  it("TC-PAGES-010: the authenticated root redirects to Featured", async () => {
    await import("./index");

    if (!state.capturedBeforeLoad) {
      throw new Error("Root beforeLoad handler was not captured");
    }

    let thrown: unknown;
    try {
      state.capturedBeforeLoad();
    } catch (error) {
      thrown = error;
    }

    expect(redirectMock).toHaveBeenCalledWith({ to: "/featured" });
    expect(thrown).toEqual({ to: "/featured" });
  });
});
