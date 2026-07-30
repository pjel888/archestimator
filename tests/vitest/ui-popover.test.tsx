import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Popover } from "@/components/ui/overlays/popover";

describe("Popover", () => {
  it("closes on Escape and restores focus to its trigger", () => {
    const animationFrame = vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 1;
    });
    try {
      render(<Popover trigger="Details" triggerLabel="Open details">Popover content</Popover>);
      const trigger = screen.getByRole("button", { name: "Open details" });

      fireEvent.click(trigger);
      expect(screen.getByText("Popover content")).toBeInTheDocument();
      fireEvent.keyDown(document, { key: "Escape" });

      expect(screen.queryByText("Popover content")).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
    } finally {
      animationFrame.mockRestore();
    }
  });
});
