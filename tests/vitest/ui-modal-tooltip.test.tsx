import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Modal } from "@/components/ui/modal";
import { ToolbarIconButton } from "@/components/ui/toolbar-icon-button";
import { ToolbarIconSelect } from "@/components/ui/toolbar-icon-select";

describe("shared modal and toolbar tooltip primitives", () => {
  it("renders modal content through a fixed viewport portal", () => {
    const { container } = render(
      <div data-testid="panel" className="overflow-hidden">
        <Modal open title="Add estimate node" onOpenChange={() => undefined}>
          <p>Modal body</p>
        </Modal>
      </div>,
    );

    const dialog = screen.getByRole("dialog", { name: "Add estimate node" });
    expect(dialog).toBeInTheDocument();
    expect(dialog.closest("[data-archestimator-modal-root]")).toHaveClass("fixed", "inset-0", "z-[1000]");
    expect(container.querySelector("[data-archestimator-modal-root]")).toBeNull();
  });

  it("ports icon button tooltips outside clipped toolbar panels", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <div data-testid="clipped-panel" className="overflow-hidden">
        <ToolbarIconButton label="Filter estimate tree">
          <span aria-hidden="true">F</span>
        </ToolbarIconButton>
      </div>,
    );

    await user.hover(screen.getByRole("button", { name: "Filter estimate tree" }));

    const tooltip = await screen.findByRole("tooltip");
    expect(tooltip).toHaveTextContent("Filter estimate tree");
    expect(tooltip).toHaveClass("fixed", "z-[1100]");
    expect(container.querySelector("[role='tooltip']")).toBeNull();
  });

  it("ports icon select tooltips outside clipped toolbar panels", async () => {
    const { container } = render(
      <div className="overflow-hidden">
        <ToolbarIconSelect label="Group component library" icon={<span aria-hidden="true">G</span>}>
          <option value="category">Category</option>
          <option value="supplier">Supplier</option>
        </ToolbarIconSelect>
      </div>,
    );

    fireEvent.focus(screen.getByLabelText("Group component library"));

    const tooltip = await screen.findByRole("tooltip");
    expect(tooltip).toHaveTextContent("Group component library");
    expect(tooltip).toHaveClass("fixed", "z-[1100]");
    expect(container.querySelector("[role='tooltip']")).toBeNull();
  });
});
