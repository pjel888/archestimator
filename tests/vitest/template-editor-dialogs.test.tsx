import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TemplateEditorDialogs } from "@/components/workshop/library/template-editor/TemplateEditorDialogs";
import type { EstimateTreeNode } from "@/lib/estimates/types";

vi.mock("@/components/ui/overlays/confirm-dialog", () => ({
  ConfirmDialog: ({
    title,
    description,
    confirmLabel = "Confirm",
    onOpenChange,
    onConfirm,
    children,
  }: {
    title: string;
    description: string;
    confirmLabel?: string;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    children?: React.ReactNode;
  }) => (
    <section aria-label={title}>
      <p>{description}</p>
      {children}
      <button type="button" onClick={() => onOpenChange(true)}>Keep open</button>
      <button type="button" onClick={() => onOpenChange(false)}>Close</button>
      <button type="button" onClick={onConfirm}>{confirmLabel}</button>
    </section>
  ),
}));

const baseProps = {
  deleteNodeTarget: null,
  onCloseDeleteNode: vi.fn(),
  onConfirmDeleteNode: vi.fn(),
  pendingSharedMutation: null,
  onCancelSharedMutation: vi.fn(),
  onConfirmSharedMutation: vi.fn(async () => true),
  textPrompt: null,
  textPromptValue: "",
  onCloseTextPrompt: vi.fn(),
  onTextPromptValueChange: vi.fn(),
  onSubmitTextPrompt: vi.fn(),
};

function buildNode(kind: EstimateTreeNode["kind"], name: string): EstimateTreeNode {
  return {
    id: `${kind}-1`,
    kind,
    name,
    total: "0",
    children: [],
    estimateRowItems: [],
  };
}

describe("TemplateEditorDialogs", () => {
  beforeEach(() => {
    for (const callback of [
      baseProps.onCloseDeleteNode,
      baseProps.onConfirmDeleteNode,
      baseProps.onCancelSharedMutation,
      baseProps.onConfirmSharedMutation,
      baseProps.onCloseTextPrompt,
      baseProps.onTextPromptValueChange,
      baseProps.onSubmitTextPrompt,
    ]) {
      callback.mockClear();
    }
  });

  it("renders nothing when no editor action requires confirmation", () => {
    const { container } = render(<TemplateEditorDialogs {...baseProps} />);

    expect(container).toBeEmptyDOMElement();
  });

  it.each([
    ["group", "Ground Floor", "Delete group?"],
    ["area", "Kitchen", "Delete area?"],
  ] as const)("confirms and dismisses a %s deletion", (kind, name, title) => {
    render(
      <TemplateEditorDialogs
        {...baseProps}
        deleteNodeTarget={buildNode(kind, name)}
      />,
    );

    const dialog = screen.getByRole("region", { name: title });
    expect(dialog).toHaveTextContent(`\"${name}\" and its rows and child nodes are removed from this template.`);

    fireEvent.click(screen.getByRole("button", { name: "Keep open" }));
    expect(baseProps.onCloseDeleteNode).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(baseProps.onCloseDeleteNode).toHaveBeenCalledTimes(1);
    expect(baseProps.onConfirmDeleteNode).toHaveBeenCalledTimes(1);
  });

  it.each([
    [1, 1, 1, "1 linked instance across 1 project and 1 estimate will update."],
    [2, 3, 4, "2 linked instances across 3 projects and 4 estimates will update."],
  ])("describes, confirms, and dismisses shared mutations", (activeInstanceCount, affectedProjectCount, affectedEstimateCount, description) => {
    render(
      <TemplateEditorDialogs
        {...baseProps}
        pendingSharedMutation={{
          actionLabel: "Rename structure",
          impact: {
            activeInstanceCount,
            affectedProjectCount,
            affectedEstimateCount,
            currentVersionNumber: 3,
            fingerprint: "impact-fingerprint",
          },
        }}
      />,
    );

    expect(screen.getByText(description)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Keep open" }));
    expect(baseProps.onCancelSharedMutation).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    fireEvent.click(screen.getByRole("button", { name: "Update linked instances" }));

    expect(baseProps.onCancelSharedMutation).toHaveBeenCalledTimes(1);
    expect(baseProps.onConfirmSharedMutation).toHaveBeenCalledTimes(1);
  });

  it("edits and submits a text prompt through its controls and Enter shortcut", () => {
    render(
      <TemplateEditorDialogs
        {...baseProps}
        textPrompt={{
          title: "Rename area",
          label: "Area name",
          confirmLabel: "Rename",
          initialValue: "Kitchen",
          onSubmit: vi.fn(),
        }}
        textPromptValue="Kitchen"
      />,
    );

    const input = screen.getByRole("textbox", { name: "Area name" });
    fireEvent.change(input, { target: { value: "Galley" } });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(baseProps.onSubmitTextPrompt).not.toHaveBeenCalled();

    const enterEvent = new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true });
    input.dispatchEvent(enterEvent);
    expect(enterEvent.defaultPrevented).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Keep open" }));
    expect(baseProps.onCloseTextPrompt).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    fireEvent.click(screen.getByRole("button", { name: "Rename" }));

    expect(baseProps.onTextPromptValueChange).toHaveBeenCalledWith("Galley");
    expect(baseProps.onSubmitTextPrompt).toHaveBeenCalledTimes(2);
    expect(baseProps.onCloseTextPrompt).toHaveBeenCalledTimes(1);
  });
});
