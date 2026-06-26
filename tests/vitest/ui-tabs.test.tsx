import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Tabs } from "@/components/ui/tabs";

const tabs = [
  { id: "scope", label: "Scope" },
  { id: "pricing", label: "Pricing" },
];

describe("shared Tabs primitive", () => {
  it("uses an orange underline for the active tab", () => {
    render(<Tabs tabs={tabs} activeId="scope" onChange={vi.fn()} variant="underline" />);

    expect(screen.getByRole("tab", { name: "Scope" })).toHaveClass("border-brand-orange", "cursor-pointer");
  });

  it("keeps inactive underline tabs visually muted", () => {
    render(<Tabs tabs={tabs} activeId="scope" onChange={vi.fn()} variant="underline" />);

    expect(screen.getByRole("tab", { name: "Pricing" })).toHaveClass("border-transparent", "text-tertiary/60");
  });

  it("renders an end action outside the scrollable tablist", () => {
    render(
      <Tabs
        tabs={tabs}
        activeId="scope"
        onChange={vi.fn()}
        endAction={<button type="button">New tab</button>}
      />,
    );

    const tablist = screen.getByRole("tablist");
    const action = screen.getByRole("button", { name: "New tab" });
    expect(action).toBeInTheDocument();
    expect(tablist.contains(action)).toBe(false);
  });

  it("can omit aria-controls for tabsets with one dynamic panel", () => {
    render(
      <Tabs
        tabs={tabs}
        activeId="scope"
        onChange={vi.fn()}
        controlsPanels={false}
        idBase="dynamic"
      />,
    );

    expect(screen.getByRole("tab", { name: "Scope" })).not.toHaveAttribute("aria-controls");
  });
});
