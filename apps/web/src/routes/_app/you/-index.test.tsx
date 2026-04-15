import { describe, expect, it, vi, beforeEach } from "vitest";

const state = {
  beforeLoads: {} as Record<string, ((args: unknown) => unknown) | undefined>,
};
const redirectMock = vi.fn((options: { to: string }) => options);

vi.mock("@tanstack/react-router", () => ({
  createFileRoute:
    (path: string) => (config: { beforeLoad?: () => unknown; component?: React.ComponentType }) => {
      state.beforeLoads[path] = config.beforeLoad;
      return {
        beforeLoad: config.beforeLoad,
        component: config.component,
        fullPath: path,
      };
    },
  redirect: (options: { to: string }) => redirectMock(options),
  Link: () => null,
}));

beforeEach(() => {
  vi.clearAllMocks();
  state.beforeLoads = {};
});

describe("[phase:6] [regression:always] You Index Route", () => {
  it("TC-PAGES-026: redirects the You landing to the default Applications tab", async () => {
    await import("./index");

    const beforeLoad = state.beforeLoads["/_app/you/"];
    if (!beforeLoad) {
      throw new Error("You beforeLoad handler was not captured");
    }

    let thrown: unknown;
    try {
      beforeLoad({ context: { auth: { isSignedIn: true } } });
    } catch (error) {
      thrown = error;
    }

    expect(redirectMock).toHaveBeenCalledWith({ to: "/you/applications" });
    expect(thrown).toEqual({ to: "/you/applications" });
  });
});
