import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MarkdownContent } from "./markdown-content";

describe("[phase:6] [regression:always] MarkdownContent", () => {
  it("TC-EVT-027: renders emphasis and line breaks from markdown content", () => {
    const { container } = render(
      <MarkdownContent>{"First line\r\n**Build overnight**\r\nSecond line"}</MarkdownContent>,
    );

    expect(screen.getByText("Build overnight", { selector: "strong" })).toBeInTheDocument();
    expect(container.textContent).toContain("First line");
    expect(container.textContent).toContain("Second line");
    expect(container.querySelectorAll("br")).toHaveLength(2);
  });

  it("TC-EVT-027: normalizes escaped markdown payloads before rendering", () => {
    const { container } = render(
      <MarkdownContent>
        {String.raw`## Schedule\n\n- \*\*Build overnight\*\*\nVisit &lbrack;docs&rbrack;&lpar;https://example.com&rpar;`}
      </MarkdownContent>,
    );

    expect(screen.getByRole("heading", { name: "Schedule" })).toBeInTheDocument();
    expect(screen.getByText("Build overnight", { selector: "strong" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "docs" })).toHaveAttribute(
      "href",
      "https://example.com",
    );
    expect(container.querySelector("br")).not.toBeNull();
  });

  it("TC-EVT-027: normalizes imported markdown with trailing emphasis whitespace", () => {
    const { container } = render(
      <MarkdownContent>
        {
          "**Try a group fitness class and discover how movement can make you feel happier, stronger and more connected! **\n\n614-292-7671[View schedule and register here](https://example.com)"
        }
      </MarkdownContent>,
    );

    expect(
      screen.getByText(
        "Try a group fitness class and discover how movement can make you feel happier, stronger and more connected!",
        { selector: "strong" },
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View schedule and register here" })).toHaveAttribute(
      "href",
      "https://example.com",
    );
    expect(container.textContent).toContain("614-292-7671 View schedule and register here");
  });
});
