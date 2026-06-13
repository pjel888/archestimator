import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  TabStrip,
  getTabStripPanelId,
  getTabStripTabId,
  type TabStripItem,
} from "@/components/ui/tab-strip";

// Mock next/link so the link-variant renders a plain anchor with the href in jsdom.
vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const buttonTabs: TabStripItem[] = [
  { id: "alpha", label: "Alpha" },
  { id: "beta", label: "Beta" },
  { id: "gamma", label: "Gamma" },
];

const linkTabs: TabStripItem[] = [
  { id: "one", label: "One", href: "/one" },
  { id: "two", label: "Two", href: "/two" },
  { id: "three", label: "Three", href: "/three" },
];

describe("TabStrip — pure id helpers", () => {
  it("builds stable, distinct tab and panel ids", () => {
    expect(getTabStripTabId("base", "alpha")).toBe("base-tab-alpha");
    expect(getTabStripPanelId("base", "alpha")).toBe("base-panel-alpha");
    expect(getTabStripTabId("base", "alpha")).not.toBe(getTabStripPanelId("base", "alpha"));
  });
});

describe("TabStrip — roving tabIndex", () => {
  it("gives the active tab tabIndex=0 and all others tabIndex=-1 (button variant)", () => {
    render(<TabStrip tabs={buttonTabs} activeTab="beta" ariaLabel="Views" onTabChange={vi.fn()} />);
    expect(screen.getByRole("tab", { name: "Alpha" })).toHaveAttribute("tabindex", "-1");
    expect(screen.getByRole("tab", { name: "Beta" })).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("tab", { name: "Gamma" })).toHaveAttribute("tabindex", "-1");
  });

  it("applies the same roving tabIndex to the link variant", () => {
    render(<TabStrip tabs={linkTabs} activeTab="two" ariaLabel="Pages" />);
    expect(screen.getByRole("tab", { name: "One" })).toHaveAttribute("tabindex", "-1");
    expect(screen.getByRole("tab", { name: "Two" })).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("tab", { name: "Three" })).toHaveAttribute("tabindex", "-1");
  });
});

describe("TabStrip — keyboard navigation (button variant: automatic activation)", () => {
  it("ArrowRight moves focus to the next tab and activates it via onTabChange", () => {
    const onTabChange = vi.fn();
    render(<TabStrip tabs={buttonTabs} activeTab="alpha" ariaLabel="Views" onTabChange={onTabChange} />);
    const alpha = screen.getByRole("tab", { name: "Alpha" });
    const beta = screen.getByRole("tab", { name: "Beta" });

    alpha.focus();
    fireEvent.keyDown(alpha, { key: "ArrowRight" });

    expect(document.activeElement).toBe(beta);
    expect(onTabChange).toHaveBeenCalledWith("beta");
  });

  it("ArrowDown behaves like ArrowRight (next tab)", () => {
    const onTabChange = vi.fn();
    render(<TabStrip tabs={buttonTabs} activeTab="alpha" ariaLabel="Views" onTabChange={onTabChange} />);
    const alpha = screen.getByRole("tab", { name: "Alpha" });
    fireEvent.keyDown(alpha, { key: "ArrowDown" });
    expect(document.activeElement).toBe(screen.getByRole("tab", { name: "Beta" }));
    expect(onTabChange).toHaveBeenCalledWith("beta");
  });

  it("ArrowLeft moves focus to the previous tab and activates it", () => {
    const onTabChange = vi.fn();
    render(<TabStrip tabs={buttonTabs} activeTab="beta" ariaLabel="Views" onTabChange={onTabChange} />);
    const beta = screen.getByRole("tab", { name: "Beta" });
    const alpha = screen.getByRole("tab", { name: "Alpha" });

    fireEvent.keyDown(beta, { key: "ArrowLeft" });

    expect(document.activeElement).toBe(alpha);
    expect(onTabChange).toHaveBeenCalledWith("alpha");
  });

  it("wraps from the last tab to the first on ArrowRight", () => {
    const onTabChange = vi.fn();
    render(<TabStrip tabs={buttonTabs} activeTab="gamma" ariaLabel="Views" onTabChange={onTabChange} />);
    const gamma = screen.getByRole("tab", { name: "Gamma" });

    fireEvent.keyDown(gamma, { key: "ArrowRight" });

    expect(document.activeElement).toBe(screen.getByRole("tab", { name: "Alpha" }));
    expect(onTabChange).toHaveBeenCalledWith("alpha");
  });

  it("wraps from the first tab to the last on ArrowLeft", () => {
    const onTabChange = vi.fn();
    render(<TabStrip tabs={buttonTabs} activeTab="alpha" ariaLabel="Views" onTabChange={onTabChange} />);
    const alpha = screen.getByRole("tab", { name: "Alpha" });

    fireEvent.keyDown(alpha, { key: "ArrowLeft" });

    expect(document.activeElement).toBe(screen.getByRole("tab", { name: "Gamma" }));
    expect(onTabChange).toHaveBeenCalledWith("gamma");
  });

  it("Home focuses and activates the first tab; End focuses and activates the last", () => {
    const onTabChange = vi.fn();
    render(<TabStrip tabs={buttonTabs} activeTab="beta" ariaLabel="Views" onTabChange={onTabChange} />);
    const beta = screen.getByRole("tab", { name: "Beta" });

    fireEvent.keyDown(beta, { key: "Home" });
    expect(document.activeElement).toBe(screen.getByRole("tab", { name: "Alpha" }));
    expect(onTabChange).toHaveBeenLastCalledWith("alpha");

    fireEvent.keyDown(screen.getByRole("tab", { name: "Alpha" }), { key: "End" });
    expect(document.activeElement).toBe(screen.getByRole("tab", { name: "Gamma" }));
    expect(onTabChange).toHaveBeenLastCalledWith("gamma");
  });

  it("ignores unrelated keys (no focus move, no activation)", () => {
    const onTabChange = vi.fn();
    render(<TabStrip tabs={buttonTabs} activeTab="alpha" ariaLabel="Views" onTabChange={onTabChange} />);
    const alpha = screen.getByRole("tab", { name: "Alpha" });
    alpha.focus();
    fireEvent.keyDown(alpha, { key: "a" });
    expect(document.activeElement).toBe(alpha);
    expect(onTabChange).not.toHaveBeenCalled();
  });
});

describe("TabStrip — keyboard navigation (link variant: focus-only, manual activation)", () => {
  it("ArrowRight moves focus but does NOT call onTabChange (no navigation on arrow keys)", () => {
    const onTabChange = vi.fn();
    render(<TabStrip tabs={linkTabs} activeTab="one" ariaLabel="Pages" onTabChange={onTabChange} />);
    const one = screen.getByRole("tab", { name: "One" });
    const two = screen.getByRole("tab", { name: "Two" });

    one.focus();
    fireEvent.keyDown(one, { key: "ArrowRight" });

    // Focus moved to the next link tab...
    expect(document.activeElement).toBe(two);
    // ...but the link variant must NOT activate/navigate on arrow keys.
    expect(onTabChange).not.toHaveBeenCalled();
  });

  it("Home/End move focus on link tabs without calling onTabChange", () => {
    const onTabChange = vi.fn();
    render(<TabStrip tabs={linkTabs} activeTab="two" ariaLabel="Pages" onTabChange={onTabChange} />);
    const two = screen.getByRole("tab", { name: "Two" });

    fireEvent.keyDown(two, { key: "End" });
    expect(document.activeElement).toBe(screen.getByRole("tab", { name: "Three" }));

    fireEvent.keyDown(screen.getByRole("tab", { name: "Three" }), { key: "Home" });
    expect(document.activeElement).toBe(screen.getByRole("tab", { name: "One" }));

    expect(onTabChange).not.toHaveBeenCalled();
  });
});

describe("TabStrip — opt-in tabpanel wiring (idBase)", () => {
  it("adds tab id and aria-controls when idBase is provided", () => {
    render(<TabStrip tabs={buttonTabs} activeTab="alpha" ariaLabel="Views" idBase="demo" onTabChange={vi.fn()} />);
    const alpha = screen.getByRole("tab", { name: "Alpha" });
    expect(alpha).toHaveAttribute("id", "demo-tab-alpha");
    expect(alpha).toHaveAttribute("aria-controls", "demo-panel-alpha");
  });

  it("emits NO id or aria-controls when idBase is omitted (byte-identical to today)", () => {
    render(<TabStrip tabs={buttonTabs} activeTab="alpha" ariaLabel="Views" onTabChange={vi.fn()} />);
    const alpha = screen.getByRole("tab", { name: "Alpha" });
    expect(alpha).not.toHaveAttribute("id");
    expect(alpha).not.toHaveAttribute("aria-controls");
  });

  it("applies opt-in ids to the link variant too", () => {
    render(<TabStrip tabs={linkTabs} activeTab="one" ariaLabel="Pages" idBase="lib" />);
    const one = screen.getByRole("tab", { name: "One" });
    expect(one).toHaveAttribute("id", "lib-tab-one");
    expect(one).toHaveAttribute("aria-controls", "lib-panel-one");
  });
});
