import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ToastProvider, useToast } from "@/components/ui/toast";

function ToastHarness() {
  const { toast } = useToast();

  return (
    <div>
      <button
        type="button"
        onClick={() => toast({ id: "estimate-tree-mutation", message: "Saving tree order", tone: "loading" })}
      >
        Show saving
      </button>
      <button
        type="button"
        onClick={() => toast({ id: "estimate-tree-mutation", message: "Tree order saved", tone: "success", durationMs: null })}
      >
        Show saved
      </button>
    </div>
  );
}

describe("ToastProvider", () => {
  it("renders notifications in a fixed viewport and updates an existing toast by id", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <ToastHarness />
      </ToastProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Show saving" }));

    const viewport = document.querySelector("[data-toast-viewport='true']");
    expect(viewport).not.toBeNull();
    expect(viewport).toHaveClass("fixed");
    expect(viewport).toHaveClass("bottom-3");
    expect(viewport).toHaveClass("left-1/2");
    expect(screen.getByRole("status")).toHaveTextContent("Saving tree order");

    await user.click(screen.getByRole("button", { name: "Show saved" }));

    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(screen.getByRole("status")).toHaveTextContent("Tree order saved");
    await user.click(screen.getByRole("button", { name: "Dismiss notification" }));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
