import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/workshop/library/components",
  useSelectedLayoutSegments: () => ["components"],
}));

import { LibraryTabsLayoutClient } from "@/components/workshop/library/LibraryTabsLayoutClient";
import { LibraryTabPanel } from "@/components/workshop/library/LibraryTabPanel";

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
});
