import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Button } from "@/components/ui/button";
import { AppModal } from "@/components/ui/overlays/modal";
import { ConfirmDialog } from "@/components/ui/overlays/confirm-dialog";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/overlays/dialog";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { HoverCard } from "@/components/ui/overlays/hover-card";
import { InspectorDrawer } from "@/components/ui/overlays/sheet-drawer";
import { Modal } from "@/components/ui/modal";
import { Popover } from "@/components/ui/overlays/popover";
import { ResizableModal } from "@/components/ui/overlays/resizable-modal";
import { Tooltip } from "@/components/ui/overlays/tooltip";
import { ToolbarIconButton } from "@/components/ui/toolbar-icon-button";

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

  it("lets pointer events pass through non-scrim inspector drawers", () => {
    render(
      <InspectorDrawer open title="Pass-through inspector" onOpenChange={() => undefined}>
        <p>Inspector body</p>
      </InspectorDrawer>,
    );

    const dialog = screen.getByRole("dialog", { name: "Pass-through inspector" });
    expect(dialog.closest("[data-archestimator-sheet-root]")).toHaveClass("pointer-events-none");
    expect(dialog).toHaveClass("pointer-events-auto");
  });

  it("names hover card dialogs from their visible title", () => {
    render(
      <HoverCard defaultOpen trigger={<Button>Reviewer</Button>} title="Client reviewer">
        <p>Reviewer details</p>
      </HoverCard>,
    );

    expect(screen.getByRole("dialog", { name: "Client reviewer" })).toBeInTheDocument();
  });

  it("does not add a duplicate tab stop around focusable hover card triggers", () => {
    const { container } = render(
      <HoverCard defaultOpen trigger={<Button>Reviewer</Button>} title="Client reviewer">
        <p>Reviewer details</p>
      </HoverCard>,
    );

    expect(screen.getByRole("button", { name: "Reviewer" })).toHaveAccessibleDescription("Client reviewer Reviewer details");
    expect(container.querySelectorAll("[tabindex='0']")).toHaveLength(0);
  });

  it("names popover dialogs from their visible title", async () => {
    const user = userEvent.setup();
    render(
      <Popover trigger="Details" triggerLabel="Toggle story popover" title="Popover surface">
        <p>Popover body</p>
      </Popover>,
    );

    await user.click(screen.getByRole("button", { name: "Toggle story popover" }));

    expect(screen.getByRole("dialog", { name: "Popover surface" })).toBeInTheDocument();
  });

  it("moves popover trigger behavior onto interactive button triggers", async () => {
    const user = userEvent.setup();
    render(
      <Popover trigger={<Button>Details</Button>} triggerLabel="Toggle story popover" title="Popover surface">
        <p>Popover body</p>
      </Popover>,
    );

    expect(screen.getAllByRole("button")).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "Details" }));

    expect(screen.getByRole("dialog", { name: "Popover surface" })).toBeInTheDocument();
  });

  it("preserves requested autofocus inside confirm dialogs", async () => {
    render(
      <ConfirmDialog
        open
        onOpenChange={() => undefined}
        title="Apply review decision?"
        description="Static confirmation"
      />,
    );

    await waitFor(() => expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus());
  });

  it("traps focus inside modal dialogs when tab starts outside the dialog", () => {
    render(
      <>
        <button type="button">Behind modal</button>
        <Dialog open onOpenChange={() => undefined}>
          <DialogPortal>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Modal focus trap</DialogTitle>
              </DialogHeader>
              <DialogBody>
                <button type="button" hidden>
                  Hidden action
                </button>
                <button type="button">First action</button>
                <button type="button">Last action</button>
              </DialogBody>
            </DialogContent>
          </DialogPortal>
        </Dialog>
      </>,
    );

    screen.getByRole("button", { name: "Behind modal" }).focus();
    fireEvent.keyDown(document, { key: "Tab" });

    expect(screen.getByRole("button", { name: "First action" })).toHaveFocus();
    expect(document.querySelector("[hidden]")).not.toHaveFocus();
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

  // ToolbarIconSelect retired with the DropdownSelect migration; its
  // portal-escapes-overflow regression coverage lives in
  // ui-dropdown-popup-core.test.tsx against the shared popup core.

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
    fireEvent.click(overlay, { detail: 1 });
    expect(onOpenChange).not.toHaveBeenCalled();

    // A separate overlay click with no popup open closes the modal normally.
    fireEvent.pointerDown(overlay);
    fireEvent.click(overlay, { detail: 1 });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
