import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MarkdownContent } from "./markdown-content";

describe("[phase:6] [regression:always] MarkdownContent", () => {
  it("TC-EVT-027: renders emphasis and line breaks from markdown content", () => {
    const { container } = render(
      <MarkdownContent>
        {"First line\r\n**Build overnight**\r\nSecond line"}
      </MarkdownContent>,
    );

    expect(
      screen.getByText("Build overnight", { selector: "strong" }),
    ).toBeInTheDocument();
    expect(container.textContent).toContain("First line");
    expect(container.textContent).toContain("Second line");
    expect(container.querySelectorAll("br")).toHaveLength(2);
  });
});
