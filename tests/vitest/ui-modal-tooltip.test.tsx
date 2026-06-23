import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ControlField, ControlInput } from "@/components/ui/control-input";
import { AppModal } from "@/components/ui/overlays/modal";
import { ConfirmDialog } from "@/components/ui/overlays/confirm-dialog";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { InspectorDrawer } from "@/components/ui/overlays/sheet-drawer";
import { Modal } from "@/components/ui/modal";
import { ResizableModal } from "@/components/ui/overlays/resizable-modal";
import { SectionLabel } from "@/components/ui/section-label";
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

  it("focuses cancel first for destructive confirm dialogs", async () => {
    render(
      <ConfirmDialog
        open
        tone="destructive"
        onOpenChange={() => undefined}
        onConfirm={() => undefined}
        title="Delete estimate?"
        description="This cannot be undone."
      />,
    );

    await waitFor(() => expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus());
  });

  it("binds ControlField labels/help/errors without broad descendant traversal", () => {
    render(
      <>
        <ControlField label="Client name" helperText="Shown on the proposal">
          <ControlInput />
        </ControlField>
        <ControlField label="Expiry" as="div" helperText="Use local time" errorText="Expiry is required">
          {({ controlId, labelId, describedBy, invalid }) => (
            <input
              id={controlId}
              aria-labelledby={labelId}
              aria-describedby={describedBy}
              aria-invalid={invalid}
            />
          )}
        </ControlField>
        <SectionLabel data-testid="section-label">Access</SectionLabel>
      </>,
    );

    const clientName = screen.getByRole("textbox", { name: "Client name" });
    expect(clientName).toHaveAttribute("aria-describedby");
    expect(screen.getByText("Shown on the proposal")).toHaveAttribute("id", clientName.getAttribute("aria-describedby"));

    const expiryGroup = screen.getByRole("group", { name: "Expiry field" });
    const expiryInput = screen.getByRole("textbox", { name: "Expiry" });
    expect(expiryGroup).toContainElement(expiryInput);
    expect(expiryInput).toHaveAttribute("aria-invalid", "true");
    expect(expiryInput.getAttribute("aria-describedby")).toContain(screen.getByText("Expiry is required").id);
    expect(screen.getByText("Expiry is required")).toHaveAttribute("role", "alert");
    expect(screen.getByTestId("section-label")).toHaveClass("text-[10px]", "text-secondary", "tracking-normal");
  });

  it("keeps only the top stacked modal interactive and closes only the top modal on Escape", () => {
    const closeFirst = vi.fn();
    const closeSecond = vi.fn();

    function StackHarness({ first = true, second = true }: { first?: boolean; second?: boolean }) {
      return (
        <>
          <main data-workshop-page-shell-root>Workspace shell</main>
          <Modal open={first} title="First modal" onOpenChange={closeFirst}>
            <button type="button">First action</button>
          </Modal>
          <Modal open={second} title="Second modal" onOpenChange={closeSecond}>
            <button type="button">Second action</button>
          </Modal>
        </>
      );
    }

    const { rerender } = render(<StackHarness />);
    const roots = Array.from(document.body.querySelectorAll<HTMLElement>("[data-archestimator-modal-root]"));
    const shell = screen.getByText("Workspace shell");

    expect(roots).toHaveLength(2);
    expect(roots[0]).toHaveAttribute("inert");
    expect(roots[1]).toHaveAttribute("data-archestimator-modal-top", "true");
    expect(roots[1]).toHaveStyle({ zIndex: "1002" });
    expect(shell).toHaveAttribute("inert");
    expect(document.body.style.overflow).toBe("hidden");

    fireEvent.keyDown(document, { key: "Escape" });
    expect(closeSecond).toHaveBeenCalledWith(false);
    expect(closeFirst).not.toHaveBeenCalled();

    rerender(<StackHarness second={false} />);
    expect(shell).toHaveAttribute("inert");
    expect(document.body.style.overflow).toBe("hidden");
    expect(document.body.querySelector("[data-archestimator-modal-root]")).toHaveAttribute("data-archestimator-modal-top", "true");

    rerender(<StackHarness first={false} second={false} />);
    expect(shell).not.toHaveAttribute("inert");
    expect(document.body.style.overflow).toBe("");
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
