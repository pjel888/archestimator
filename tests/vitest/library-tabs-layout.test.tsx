import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useEffect, useRef } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigationMock = vi.hoisted(() => ({
  pathname: "/workshop/library",
  segments: [] as string[],
  routePush: vi.fn(),
  routePrefetch: vi.fn(),
  navigationPush: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigationMock.pathname,
  useRouter: () => ({
    push: navigationMock.routePush,
    prefetch: navigationMock.routePrefetch,
  }),
  useSelectedLayoutSegments: () => navigationMock.segments,
}));
vi.mock("@/hooks/use-navigation-router", () => ({
  useNavigationRouter: () => ({
    push: navigationMock.navigationPush,
  }),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/components/workshop/library/overview/LibraryOverviewSearch", () => ({
  LibraryOverviewSearch: ({
    className,
    autoFocus,
    onDismiss,
  }: {
    className?: string;
    autoFocus?: boolean;
    onDismiss?: () => void;
  }) => {
    const inputRef = useRef<HTMLSelectElement | null>(null);
    useEffect(() => {
      if (autoFocus) inputRef.current?.focus();
    }, [autoFocus]);
    return (
      <select
        ref={inputRef}
        className={className}
        data-library-overview-search="mock"
        aria-label="Search components and templates"
        onKeyDown={(event) => {
          if (event.key === "Escape") onDismiss?.();
        }}
      >
        <option>Search</option>
      </select>
    );
  },
}));

import { LibraryTabsLayoutClient } from "@/components/workshop/library/LibraryTabsLayoutClient";

describe("LibraryTabsLayoutClient", () => {
  beforeEach(() => {
    navigationMock.pathname = "/workshop/library";
    navigationMock.segments = [];
    navigationMock.routePush.mockClear();
    navigationMock.routePrefetch.mockClear();
    navigationMock.navigationPush.mockClear();
  });

  it("renders link tabs and marks Overview active on the library index", () => {
    render(<LibraryTabsLayoutClient />);

    const tablist = screen.getByRole("tablist", { name: "Library sections" });
    const overviewTab = screen.getByRole("tab", { name: /Overview/ });
    const componentsTab = screen.getByRole("tab", { name: /Components/ });
    const templatesTab = screen.getByRole("tab", { name: /Templates/ });

    expect(tablist).toBeInTheDocument();
    expect(overviewTab).toHaveAttribute("aria-selected", "true");
    expect(overviewTab).toHaveAttribute("href", "/workshop/library");
    expect(componentsTab).toHaveAttribute("aria-selected", "false");
    expect(componentsTab).toHaveAttribute("href", "/workshop/library/components");
    expect(templatesTab).toHaveAttribute("aria-selected", "false");
    expect(templatesTab).toHaveAttribute("href", "/workshop/library/templates");
    expect(screen.getByRole("button", { name: "Add component" })).toHaveClass(
      "size-6",
      "bg-orange-100",
      "text-orange-700",
      "cursor-pointer",
    );
  });

  it("lists Overview as the first tab", () => {
    render(<LibraryTabsLayoutClient />);

    const tabs = screen.getAllByRole("tab");
    expect(tabs[0]).toHaveTextContent("Overview");
    expect(tabs).toHaveLength(3);
  });

  it("marks Components active on the components sub-route", () => {
    navigationMock.pathname = "/workshop/library/components";
    navigationMock.segments = ["components"];

    render(<LibraryTabsLayoutClient />);

    expect(screen.getByRole("tab", { name: /Components/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: /Overview/ })).toHaveAttribute("aria-selected", "false");
    expect(screen.queryByRole("button", { name: "Add component" })).not.toBeInTheDocument();
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

  it("keeps route tabs as native links instead of the global navigation overlay router", () => {
    render(<LibraryTabsLayoutClient />);

    const componentsTab = screen.getByRole("tab", { name: /Components/ });

    expect(componentsTab).toHaveAttribute("href", "/workshop/library/components");
    expect(navigationMock.routePush).not.toHaveBeenCalled();
    expect(navigationMock.navigationPush).not.toHaveBeenCalled();
  });

  it("does not prefetch inactive sibling routes on mount", () => {
    render(<LibraryTabsLayoutClient />);

    expect(navigationMock.routePrefetch).not.toHaveBeenCalled();
  });

  it("prefetches inactive tab routes on pointer and focus intent", () => {
    render(<LibraryTabsLayoutClient />);

    fireEvent.pointerEnter(screen.getByRole("tab", { name: /Components/ }));
    fireEvent.focus(screen.getByRole("tab", { name: /Templates/ }));

    const prefetchedHrefs = navigationMock.routePrefetch.mock.calls.map((call) => call[0]);
    expect(prefetchedHrefs).toContain("/workshop/library/components");
    expect(prefetchedHrefs).toContain("/workshop/library/templates");
    expect(prefetchedHrefs).not.toContain("/workshop/library");
  });

  it("does not prefetch an already warmed sibling route again on repeated intent", () => {
    render(<LibraryTabsLayoutClient />);

    const componentsTab = screen.getByRole("tab", { name: /Components/ });
    fireEvent.pointerEnter(componentsTab);
    fireEvent.focus(componentsTab);

    const componentPrefetchCount = navigationMock.routePrefetch.mock.calls.filter(
      (call) => call[0] === "/workshop/library/components",
    ).length;
    expect(componentPrefetchCount).toBe(1);
  });

  it("focuses the header search on open and closes it with Escape", async () => {
    render(<LibraryTabsLayoutClient />);

    const toggle = screen.getByRole("button", { name: "Show library search" });
    fireEvent.click(toggle);

    const searchInput = screen.getByRole("combobox", { name: "Search components and templates" });
    await waitFor(() => expect(searchInput).toHaveFocus());

    fireEvent.keyDown(searchInput, { key: "Escape" });

    expect(screen.queryByRole("combobox", { name: "Search components and templates" })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "Show library search" })).toHaveFocus());
  });
});
