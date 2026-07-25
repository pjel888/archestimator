import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ToastProvider, useToast } from "@/components/ui/toast";

function ToastA11yHarness() {
  const { toast } = useToast();

  return (
    <div>
      <button type="button" onClick={() => toast({ id: "info", message: "Informational", tone: "info", durationMs: null })}>
        Show info
      </button>
      <button type="button" onClick={() => toast({ id: "error", message: "Error", tone: "error", durationMs: null })}>
        Show error
      </button>
    </div>
  );
}

describe("toast accessibility", () => {
  it("uses status and polite live region for non-error toasts", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <ToastA11yHarness />
      </ToastProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Show info" }));

    expect(document.querySelector("[data-toast-viewport='true']")).not.toHaveAttribute(
      "aria-label",
    );
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
    expect(screen.getByRole("status")).toHaveAttribute("data-toast-tone", "info");
  });

  it("uses alert and assertive live region for error toasts", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <ToastA11yHarness />
      </ToastProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Show error" }));

    expect(screen.getByRole("alert")).toHaveAttribute("aria-live", "assertive");
    expect(screen.getByRole("alert")).toHaveAttribute("data-toast-tone", "error");
  });
});
