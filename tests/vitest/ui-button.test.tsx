import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Button } from "@/components/ui/button";

describe("shared Button primitive", () => {
  it("uses a pointer cursor for actionable buttons, including scrim buttons", () => {
    render(
      <div>
        <Button>Action</Button>
        <Button size="scrim" aria-label="Dismiss overlay" />
      </div>,
    );

    expect(screen.getByRole("button", { name: "Action" })).toHaveClass("cursor-pointer");
    expect(screen.getByRole("button", { name: "Dismiss overlay" })).toHaveClass("cursor-pointer");
  });

  it("supports the compact xs-lg text size scale", () => {
    render(
      <div>
        <Button size="xs">Extra small</Button>
        <Button size="lg">Large</Button>
      </div>,
    );

    expect(screen.getByRole("button", { name: "Extra small" })).toHaveClass("min-h-7", "px-1.5", "py-1");
    expect(screen.getByRole("button", { name: "Large" })).toHaveClass("min-h-10", "px-3", "py-2");
  });

  it("separates solid background variants from quiet no-background variants", () => {
    render(
      <div>
        <Button variant="success">Approve</Button>
        <Button variant="warning">Flag</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="plain">Plain</Button>
      </div>,
    );

    expect(screen.getByRole("button", { name: "Approve" })).toHaveClass("bg-success", "text-white");
    expect(screen.getByRole("button", { name: "Flag" })).toHaveClass("bg-warning", "text-white");
    expect(screen.getByRole("button", { name: "Outline" })).toHaveClass("border", "bg-transparent");
    expect(screen.getByRole("button", { name: "Plain" })).toHaveClass("bg-transparent", "text-secondary");
  });

  it("keeps mode buttons visible through aria-pressed styling", () => {
    render(
      <Button variant="ghost" aria-pressed="true">
        Mode
      </Button>,
    );

    expect(screen.getByRole("button", { name: "Mode" })).toHaveClass("aria-pressed:bg-surfaceMuted", "aria-pressed:text-ink");
  });
});
