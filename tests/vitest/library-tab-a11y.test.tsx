import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/workshop/library/components",
  useRouter: () => ({ push: vi.fn(), prefetch: vi.fn() }),
  useSelectedLayoutSegments: () => ["components"],
}));
vi.mock("@/hooks/use-navigation-router", () => ({
  useNavigationRouter: () => ({ push: vi.fn() }),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/components/workshop/library/overview/LibraryOverviewSearch", () => ({
  LibraryOverviewSearch: ({ className }: { className?: string }) => (
    <div className={className} data-library-overview-search="mock" />
  ),
}));

import { LibraryTabsLayoutClient } from "@/components/workshop/library/LibraryTabsLayoutClient";
import { LibraryTabPanel } from "@/components/workshop/library/LibraryTabPanel";
import { Tabs } from "@/components/ui/tabs";

describe("Library tab/panel a11y wiring (P3 T21 / F27)", () => {
  it("tabs expose role=tab with aria-controls pointing at the panel", () => {
    render(<LibraryTabsLayoutClient />);
    const componentsTab = screen.getByRole("tab", { name: /Components/ });
    expect(componentsTab).toHaveAttribute("id", "library-tab-components");
    expect(componentsTab).toHaveAttribute("aria-controls", "library-panel-components");
    expect(componentsTab).toHaveAttribute("aria-selected", "true");
  });

  it("content region is the labeled tabpanel controlled by the active tab", () => {
    render(
      <LibraryTabPanel>
        <div>panel content</div>
      </LibraryTabPanel>,
    );
    const panel = screen.getByRole("tabpanel");
    expect(panel).toHaveAttribute("id", "library-panel-components");
    expect(panel).toHaveAttribute("aria-labelledby", "library-tab-components");
    expect(panel).toHaveTextContent("panel content");
  });

  it("keeps page-level library tab IDs unique when nested tabsets also use component IDs", () => {
    render(
      <>
        <LibraryTabsLayoutClient />
        <LibraryTabPanel>
          <Tabs
            tabs={[
              { id: "components", label: "Nested components" },
              { id: "templates", label: "Nested templates" },
            ]}
            activeId="components"
            onChange={() => {}}
            ariaLabel="Nested library manager views"
          />
        </LibraryTabPanel>
      </>,
    );

    const ids = Array.from(document.querySelectorAll("[id]"), (element) => element.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(document.getElementById("library-tab-components")).not.toBeNull();
    expect(document.getElementById("tab-components")).not.toBeNull();
  });
});
