import type { ComponentType } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  currentSearch: {} as { prompt?: string },
  navigateMock: vi.fn(),
}));

let capturedValidateSearch:
  | ((search: Record<string, unknown>) => Record<string, unknown>)
  | null = null;
let capturedComponent: ComponentType | null = null;

vi.mock("@tanstack/react-router", () => ({
  createFileRoute:
    (path: string) =>
    (config: {
      validateSearch?: (search: Record<string, unknown>) => Record<string, unknown>;
      component: ComponentType;
    }) => {
      if (path === "/_authenticated/ai/") {
        capturedValidateSearch = config.validateSearch ?? null;
        capturedComponent = config.component;
      }

      return {
        component: config.component,
        fullPath: path,
        useSearch: () => state.currentSearch,
      };
    },
  useNavigate: () => state.navigateMock,
}));

beforeEach(() => {
  capturedValidateSearch = null;
  capturedComponent = null;
  state.currentSearch = {};
  state.navigateMock.mockReset();
  vi.resetModules();
});

describe("[phase:6] [regression:always] AiPage", () => {
  it("TC-PAGES-024: preserves and allows editing a carried prompt draft", async () => {
    state.currentSearch = { prompt: "  campus jazz tonight  " };

    await import("./index");

    if (!capturedValidateSearch || !capturedComponent) {
      throw new Error("AI route config was not captured");
    }

    expect(
      capturedValidateSearch({ prompt: "  campus jazz tonight  " }),
    ).toEqual({
      prompt: "  campus jazz tonight  ",
    });

    const user = userEvent.setup();
    const Component = capturedComponent;
    render(<Component />);

    const promptField = screen.getByRole("textbox", {
      name: "AI prompt draft",
    });
    expect(promptField).toHaveValue("  campus jazz tonight  ");

    await user.clear(promptField);
    await user.type(promptField, "find design gigs this weekend");
    await user.click(screen.getByRole("button", { name: "Update draft" }));

    expect(state.navigateMock).toHaveBeenCalledWith({
      search: expect.any(Function),
    });
    const navigateSearch = state.navigateMock.mock.calls.at(-1)?.[0]?.search as (
      current: Record<string, unknown>,
    ) => Record<string, unknown>;
    expect(navigateSearch({})).toEqual({
      prompt: "find design gigs this weekend",
    });
  });
});
