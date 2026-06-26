import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ResizableSidePanel } from "@/components/workshop/ResizableSidePanel";

function installMatchMedia(matches = false) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe("ResizableSidePanel accessibility", () => {
  beforeEach(() => {
    installMatchMedia(false);
    window.localStorage.clear();
  });

  it("links the collapse toggle to its controlled panel", () => {
    render(
      <ResizableSidePanel
        side="left"
        ariaLabel="Tree"
        storageKey="estimate_sheet_tree_width"
        defaultWidth={272}
        minWidth={216}
        maxWidth={432}
      >
        <p>Tree panel body</p>
      </ResizableSidePanel>,
    );

    const panel = screen.getByRole("complementary", { name: "Tree" });
    const toggle = screen.getByRole("button", { name: "Collapse Tree" });

    expect(panel).toHaveAttribute("id");
    expect(toggle).toHaveAttribute("aria-controls", panel.id);
  });

  it("persists collapse state under the panel storage key", () => {
    const { unmount } = render(
      <ResizableSidePanel
        side="right"
        ariaLabel="Library"
        storageKey="estimate_sheet_library_width"
        defaultWidth={320}
        minWidth={240}
        maxWidth={560}
      >
        <p>Library panel body</p>
      </ResizableSidePanel>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Collapse Library" }));

    expect(window.localStorage.getItem("estimate_sheet_library_width:collapsed")).toBe("true");
    unmount();

    render(
      <ResizableSidePanel
        side="right"
        ariaLabel="Library"
        storageKey="estimate_sheet_library_width"
        defaultWidth={320}
        minWidth={240}
        maxWidth={560}
      >
        <p>Library panel body</p>
      </ResizableSidePanel>,
    );

    expect(screen.getByRole("button", { name: "Expand Library" })).toHaveAttribute("aria-expanded", "false");
  });

  it("opens compact side panels as drawers and returns focus on Escape", async () => {
    installMatchMedia(true);
    render(
      <ResizableSidePanel
        side="right"
        ariaLabel="Library"
        storageKey="estimate_sheet_library_width"
        defaultWidth={320}
        minWidth={240}
        maxWidth={560}
      >
        <button type="button">Library action</button>
      </ResizableSidePanel>,
    );

    const trigger = screen.getByRole("button", { name: "Open Library drawer" });
    trigger.focus();
    fireEvent.click(trigger);

    const drawer = screen.getByRole("dialog", { name: "Library drawer" });
    expect(drawer).toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("button", { name: "Library action" })).toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    fireEvent.keyDown(drawer, { key: "Escape" });

    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Library drawer" })).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("lets product surfaces opt out of the generic compact drawer", () => {
    installMatchMedia(true);
    render(
      <ResizableSidePanel
        side="right"
        ariaLabel="Sources"
        storageKey="estimate_sheet_sources_width"
        defaultWidth={320}
        minWidth={240}
        maxWidth={560}
        compactDrawer={false}
      >
        <button type="button">Sources action</button>
      </ResizableSidePanel>,
    );

    expect(screen.queryByRole("button", { name: "Open Sources drawer" })).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Sources drawer" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sources action" })).not.toBeInTheDocument();
  });
});
