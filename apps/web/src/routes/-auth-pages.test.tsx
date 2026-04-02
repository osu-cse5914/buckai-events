import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  components: {} as Record<string, React.ComponentType | undefined>,
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute:
    (path: string) =>
    (config: { component: React.ComponentType }) => {
      state.components[path] = config.component;
      return {
        component: config.component,
      };
    },
}));

vi.mock("@clerk/clerk-react", () => ({
  SignIn: ({ routing }: { routing: string }) => (
    <div data-testid="clerk-sign-in">SignIn:{routing}</div>
  ),
  SignUp: ({ routing }: { routing: string }) => (
    <div data-testid="clerk-sign-up">SignUp:{routing}</div>
  ),
}));

async function renderRoute(path: string, modulePath: "./sign-in" | "./sign-up") {
  await import(modulePath);

  const Component = state.components[path];
  if (!Component) {
    throw new Error(`Route component was not captured for ${path}`);
  }

  return render(<Component />);
}

describe("[phase:0] [regression:always] Auth Pages", () => {
  beforeEach(() => {
    state.components = {};
    vi.resetModules();
  });

  it("TC-AUTH-007: Clerk sign-in UI renders on desktop", async () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 1280,
    });

    await renderRoute("/sign-in", "./sign-in");

    const widget = screen.getByTestId("clerk-sign-in");
    expect(widget).toBeInTheDocument();
    expect(widget).toHaveTextContent("SignIn:hash");
    expect(widget.parentElement).toHaveClass(
      "flex",
      "min-h-screen",
      "items-center",
      "justify-center",
    );
  });

  it("TC-AUTH-008: Clerk sign-in UI renders on mobile", async () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 375,
    });

    await renderRoute("/sign-in", "./sign-in");

    const widget = screen.getByTestId("clerk-sign-in");
    expect(widget).toBeInTheDocument();
    expect(widget).toHaveTextContent("SignIn:hash");
    expect(widget.parentElement).toHaveClass(
      "flex",
      "min-h-screen",
      "items-center",
      "justify-center",
    );
  });

  it("TC-AUTH-010: Clerk sign-up UI renders", async () => {
    await renderRoute("/sign-up", "./sign-up");

    const widget = screen.getByTestId("clerk-sign-up");
    expect(widget).toBeInTheDocument();
    expect(widget).toHaveTextContent("SignUp:hash");
    expect(widget.parentElement).toHaveClass(
      "flex",
      "min-h-screen",
      "items-center",
      "justify-center",
    );
  });
});
