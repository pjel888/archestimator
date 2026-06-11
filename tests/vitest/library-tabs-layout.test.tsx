import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigationMock = vi.hoisted(() => ({
  pathname: "/workshop/library",
  segments: [] as string[],
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigationMock.pathname,
  useSelectedLayoutSegments: () => navigationMock.segments,
}));

import { LibraryTabsLayoutClient } from "@/components/workshop/library/LibraryTabsLayoutClient";

describe("LibraryTabsLayoutClient", () => {
  beforeEach(() => {
    navigationMock.pathname = "/workshop/library";
    navigationMock.segments = [];
  });

  it("renders link tabs and marks Components active on the library index", () => {
    render(<LibraryTabsLayoutClient />);

    const tablist = screen.getByRole("tablist", { name: "Library sections" });
    const componentsTab = screen.getByRole("tab", { name: /Components/ });
    const templatesTab = screen.getByRole("tab", { name: /Templates/ });

    expect(tablist).toBeInTheDocument();
    expect(componentsTab).toHaveAttribute("aria-selected", "true");
    expect(componentsTab).toHaveAttribute("href", "/workshop/library/components");
    expect(templatesTab).toHaveAttribute("aria-selected", "false");
    expect(templatesTab).toHaveAttribute("href", "/workshop/library/templates");
  });

  it("marks Components active on the components sub-route", () => {
    navigationMock.pathname = "/workshop/library/components";
    navigationMock.segments = ["components"];

    render(<LibraryTabsLayoutClient />);

    expect(screen.getByRole("tab", { name: /Components/ })).toHaveAttribute("aria-selected", "true");
  });

  it("marks Templates active on the templates browse route", () => {
    navigationMock.pathname = "/workshop/library/templates";
    navigationMock.segments = ["templates"];

    render(<LibraryTabsLayoutClient />);

    expect(screen.getByRole("tab", { name: /Templates/ })).toHaveAttribute("aria-selected", "true");
  });

  it("hides the strip on the template editor route", () => {
    navigationMock.pathname = "/workshop/library/templates/template-1";
    navigationMock.segments = ["templates", "template-1"];

    render(<LibraryTabsLayoutClient />);

    expect(screen.queryByRole("tablist", { name: "Library sections" })).not.toBeInTheDocument();
  });
});
