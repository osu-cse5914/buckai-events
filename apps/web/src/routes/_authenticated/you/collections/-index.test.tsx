import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

let capturedComponent: React.ComponentType | null = null;

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (config: { component: React.ComponentType }) => {
    capturedComponent = config.component;
    return { component: config.component };
  },
  Link: ({
    children,
    to,
    ...props
  }: {
    children: React.ReactNode;
    to: string;
  }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

beforeEach(() => {
  capturedComponent = null;
  vi.resetModules();
});

async function renderCollectionsPage() {
  await import("./index");
  if (!capturedComponent) {
    throw new Error("YouCollectionsPage component was not captured");
  }

  const Component = capturedComponent;
  return render(<Component />);
}

describe("[phase:6] [regression:always] YouCollectionsPage", () => {
  it("TC-PAGES-019: shows navigation back to the You hub", async () => {
    await renderCollectionsPage();

    expect(screen.getByRole("heading", { name: "Collections" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to You" })).toHaveAttribute(
      "href",
      "/you",
    );
  });
});
