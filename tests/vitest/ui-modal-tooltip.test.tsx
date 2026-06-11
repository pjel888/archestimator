import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AppModal } from "@/components/ui/overlays/modal";
import { ConfirmDialog } from "@/components/ui/overlays/confirm-dialog";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { InspectorDrawer } from "@/components/ui/overlays/sheet-drawer";
import { Modal } from "@/components/ui/modal";
import { ResizableModal } from "@/components/ui/overlays/resizable-modal";
import { Tooltip } from "@/components/ui/overlays/tooltip";
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

  it("keeps application modals blurred by default and closes through the close control", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(
      <AppModal open title="Review proposal package" onOpenChange={onOpenChange}>
        <p>Proposal body</p>
      </AppModal>,
    );

    expect(screen.getByRole("dialog", { name: "Review proposal package" })).toBeInTheDocument();
    expect(document.body.querySelector("[data-archestimator-dialog-overlay]")).toHaveClass("backdrop-blur-md");

    await user.click(screen.getByRole("button", { name: "Close modal" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("keeps resizable popup windows non-blurred and overlay-free by default", () => {
    render(
      <ResizableModal open title="Inspector popup" onOpenChange={() => undefined}>
        <p>Inspector body</p>
      </ResizableModal>,
    );

    const dialog = screen.getByRole("dialog", { name: "Inspector popup" });
    expect(dialog.closest("[data-archestimator-resizable-modal-root]")).toHaveClass("pointer-events-none");
    expect(dialog).toHaveStyle({ resize: "both" });
    expect(document.body.querySelector("[data-archestimator-dialog-overlay]")).toBeNull();
  });

  it("closes confirm dialogs after running the confirm callback", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const onConfirm = vi.fn();

    render(
      <ConfirmDialog
        open
        onOpenChange={onOpenChange}
        onConfirm={onConfirm}
        title="Apply review decision?"
        description="Static confirmation"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("renders inspector drawers without blur or scrim overlays", () => {
    render(
      <InspectorDrawer open title="Estimate inspector" onOpenChange={() => undefined}>
        <p>Inspector body</p>
      </InspectorDrawer>,
    );

    const dialog = screen.getByRole("dialog", { name: "Estimate inspector" });
    expect(dialog.closest("[data-archestimator-sheet-root]")).toHaveClass("fixed", "inset-0", "z-[1000]");
    expect(dialog).toHaveAttribute("data-side", "right");
    expect(document.body.querySelector("[data-archestimator-dialog-overlay]")).toBeNull();
  });

  it("renders generic tooltip content for pinned Storybook review states", () => {
    render(
      <Tooltip defaultOpen label="Review tooltip">
        <button type="button">Tooltip target</button>
      </Tooltip>,
    );

    expect(screen.getByRole("tooltip")).toHaveTextContent("Review tooltip");
    expect(screen.getByRole("button", { name: "Tooltip target" })).toHaveAccessibleDescription("Review tooltip");
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

  it("closes only an open dropdown on Escape; the second Escape closes the modal", () => {
    const onOpenChange = vi.fn();
    render(
      <Modal open title="Edit component" onOpenChange={onOpenChange}>
        <DropdownSelect
          options={[
            { value: "draft", label: "Draft" },
            { value: "active", label: "Active" },
          ]}
          defaultValue="draft"
          aria-label="Lifecycle state"
        />
      </Modal>,
    );

    fireEvent.click(screen.getByRole("combobox", { name: "Lifecycle state" }));
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(onOpenChange).not.toHaveBeenCalled();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("still closes a plain modal on Escape when no popup is open", () => {
    const onOpenChange = vi.fn();
    render(
      <Modal open title="Plain modal" onOpenChange={onOpenChange}>
        <p>Body</p>
      </Modal>,
    );

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("closes only the dropdown when the overlay is clicked while a listbox is open", () => {
    const onOpenChange = vi.fn();
    render(
      <Modal open title="Edit component" onOpenChange={onOpenChange}>
        <DropdownSelect
          options={[
            { value: "draft", label: "Draft" },
            { value: "active", label: "Active" },
          ]}
          defaultValue="draft"
          aria-label="Lifecycle state"
        />
      </Modal>,
    );

    fireEvent.click(screen.getByRole("combobox", { name: "Lifecycle state" }));
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    const overlay = document.querySelector("[data-archestimator-dialog-overlay]") as HTMLElement;
    expect(overlay).not.toBeNull();

    // The pointerdown dismisses the listbox; the same gesture's click is
    // suppressed by the popup core, so the overlay's close never fires.
    fireEvent.pointerDown(overlay);
    expect(screen.queryByRole("listbox")).toBeNull();
    fireEvent.click(overlay);
    expect(onOpenChange).not.toHaveBeenCalled();

    // A separate overlay click with no popup open closes the modal normally.
    fireEvent.pointerDown(overlay);
    fireEvent.click(overlay);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
