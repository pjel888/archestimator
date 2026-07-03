import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LibraryOverview } from "@/components/workshop/library/overview/LibraryOverview";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

describe("LibraryOverview", () => {
  it("renders the intentionally empty landing surface without data-driven child content", () => {
    const { container } = render(<LibraryOverview />);

    const overview = container.querySelector("[data-library-overview='empty']");
    expect(overview).toBeInTheDocument();
    expect(overview).toHaveClass("h-full", "min-h-0", "bg-transparent");
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("keeps the index route as a shell and leaves search and add actions to the persistent layout", () => {
    const route = read("src/app/workshop/library/page.tsx");
    const overview = read("src/components/workshop/library/overview/LibraryOverview.tsx");
    const layout = read("src/components/workshop/library/LibraryTabsLayoutClient.tsx");

    expect(route).toContain("return <LibraryOverview />;");
    expect(route).not.toContain("getLibraryOverview");
    expect(overview).toContain('data-library-overview="empty"');
    expect(overview).not.toContain("searchLibraryOverview");
    expect(layout).toContain("LibraryOverviewSearch");
    expect(layout).toContain('label: "Add component"');
    expect(layout).toContain("/workshop/library/components?add=component");
  });
});
