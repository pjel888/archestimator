import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { Tree, type TreeNode } from "@/components/ui/tree";
import { moveTreeNode } from "@/components/ui/tree-utils";

function sampleNodes(): TreeNode[] {
  return [
    {
      id: "a",
      label: "Alpha",
      children: [
        { id: "a1", label: "Alpha One", isLeaf: true },
        { id: "a2", label: "Alpha Two", isLeaf: true },
      ],
    },
    {
      id: "b",
      label: "Beta",
      children: [{ id: "b1", label: "Beta One", isLeaf: true }],
    },
    { id: "c", label: "Gamma", isLeaf: true },
  ];
}

function row(id: string) {
  const element = document.querySelector(`[data-tree-row="${id}"]`);
  if (!(element instanceof HTMLElement)) throw new Error(`Missing tree row ${id}`);
  return element;
}

function dragHandle(id: string) {
  const element = row(id).querySelector(`[data-tree-drag-handle="${id}"]`);
  if (!(element instanceof HTMLElement)) throw new Error(`Missing drag handle ${id}`);
  return element;
}

function mockDataTransfer() {
  const store = new Map<string, string>();
  return {
    dropEffect: "move",
    effectAllowed: "all",
    getData: (key: string) => store.get(key) ?? "",
    setData: (key: string, value: string) => {
      store.set(key, value);
    },
    setDragImage: () => undefined,
  };
}

function setRowRect(element: HTMLElement, top = 0, height = 28) {
  element.getBoundingClientRect = () => ({
    x: 0,
    y: top,
    top,
    left: 0,
    right: 200,
    bottom: top + height,
    width: 200,
    height,
    toJSON: () => ({}),
  });
}

/**
 * fireEvent drops MouseEvent fields for drag events in jsdom, so build the
 * event manually to steer the drop-position bands by clientY.
 */
function dispatchDragEvent(
  element: HTMLElement,
  type: "dragstart" | "dragover" | "drop" | "dragend",
  options: { clientY?: number; dataTransfer: ReturnType<typeof mockDataTransfer> },
) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, "dataTransfer", { value: options.dataTransfer });
  if (options.clientY !== undefined) {
    Object.defineProperty(event, "clientY", { value: options.clientY });
  }
  fireEvent(element, event);
}

describe("ui tree", () => {
  it("indents content per depth while drag and selection rails stay at the left edge", () => {
    render(
      <Tree
        nodes={sampleNodes()}
        ariaLabel="Sample tree"
        draggable
        selectable
        defaultExpandedIds={["a", "b"]}
        onDrop={() => undefined}
      />,
    );

    expect(row("a").querySelector("[data-tree-indent]")).toBeNull();
    expect((row("a1").querySelector("[data-tree-indent]") as HTMLElement).style.width).toBe("16px");
    expect((row("a2").querySelector("[data-tree-indent]") as HTMLElement).style.width).toBe("16px");

    // Rail order on every row: grip, checkbox, then the indent spacer.
    const indent = row("a1").querySelector("[data-tree-indent]") as HTMLElement;
    const grip = row("a1").querySelector(".cursor-grab") as HTMLElement;
    const checkbox = screen.getByRole("checkbox", { name: "Select Alpha One" });
    expect(grip.compareDocumentPosition(indent) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(checkbox.compareDocumentPosition(indent) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("allows callers to widen the content indent without changing the default", () => {
    render(
      <Tree
        nodes={sampleNodes()}
        ariaLabel="Sample tree"
        defaultExpandedIds={["a"]}
        indentStep={24}
      />,
    );

    expect((row("a1").querySelector("[data-tree-indent]") as HTMLElement).style.width).toBe("24px");
  });

  it("reserves rail slots for non-draggable and non-selectable nodes so siblings align", () => {
    const nodes = sampleNodes();
    nodes[2] = { ...nodes[2], draggable: false, selectable: false };
    render(<Tree nodes={nodes} ariaLabel="Sample tree" draggable selectable onDrop={() => undefined} />);

    const gamma = row("c");
    expect(gamma.querySelector(".cursor-grab")).toBeNull();
    expect(gamma.querySelector("[role=checkbox]")).toBeNull();
    // Rail wrappers stay so the label aligns with sibling rows.
    expect(gamma.querySelectorAll(":scope > span.shrink-0").length).toBeGreaterThanOrEqual(2);
  });

  it("collapses affordance rails at rest, opens them on tree hover, and pins them while a selection exists", () => {
    const { rerender } = render(
      <Tree nodes={sampleNodes()} ariaLabel="Sample tree" draggable selectable selectedIds={[]} onDrop={() => undefined} />,
    );

    const tree = screen.getByRole("tree", { name: "Sample tree" });
    expect(tree).toHaveClass("group/tree");

    // At rest the rails take no width; they open when the pointer or focus
    // enters the tree, while the icons stay row-hover-only.
    const dragRail = row("a").querySelector('[data-tree-rail="drag"]') as HTMLElement;
    const selectRail = row("a").querySelector('[data-tree-rail="select"]') as HTMLElement;
    expect(dragRail).toHaveClass("w-0", "group-hover/tree:w-4", "group-focus-within/tree:w-4");
    expect(selectRail).toHaveClass("w-0", "group-hover/tree:w-3.5", "group-focus-within/tree:w-3.5");
    expect(dragRail.querySelector(".cursor-grab")).toHaveClass("opacity-0", "group-hover/tree-row:opacity-100");

    // While anything is selected, the rails stay open so the checked state
    // never hides itself when the pointer leaves the tree.
    rerender(
      <Tree nodes={sampleNodes()} ariaLabel="Sample tree" draggable selectable selectedIds={["c"]} onDrop={() => undefined} />,
    );
    expect(row("a").querySelector('[data-tree-rail="drag"]')).toHaveClass("w-4");
    expect(row("a").querySelector('[data-tree-rail="select"]')).toHaveClass("w-3.5");
    expect(row("a").querySelector('[data-tree-rail="drag"]')).not.toHaveClass("w-0");
  });

  it("keeps row drag activation as the default", () => {
    const onNodeDragStart = vi.fn();
    render(
      <Tree
        nodes={sampleNodes()}
        ariaLabel="Sample tree"
        draggable
        onDrop={() => undefined}
        onNodeDragStart={onNodeDragStart}
      />,
    );

    expect(row("c")).toHaveAttribute("draggable", "true");
    expect(row("c")).toHaveAttribute("data-tree-drag-activation", "row");

    const dataTransfer = mockDataTransfer();
    dispatchDragEvent(row("c"), "dragstart", { dataTransfer });

    expect(dataTransfer.getData("text/plain")).toBe("c");
    expect(onNodeDragStart).toHaveBeenCalledWith("c", expect.any(Object));
  });

  it("can require drag activation from the handle while leaving the row body inert", () => {
    const onNodeDragStart = vi.fn();
    render(
      <Tree
        nodes={sampleNodes()}
        ariaLabel="Sample tree"
        draggable
        dragActivation="handle"
        onDrop={() => undefined}
        onNodeDragStart={onNodeDragStart}
      />,
    );

    expect(row("c")).toHaveAttribute("draggable", "false");
    expect(row("c")).toHaveAttribute("data-tree-drag-activation", "handle");

    const rowDataTransfer = mockDataTransfer();
    dispatchDragEvent(row("c"), "dragstart", { dataTransfer: rowDataTransfer });
    expect(rowDataTransfer.getData("text/plain")).toBe("");
    expect(onNodeDragStart).not.toHaveBeenCalled();

    const handleDataTransfer = mockDataTransfer();
    expect(dragHandle("c")).toHaveAttribute("draggable", "true");
    dispatchDragEvent(dragHandle("c"), "dragstart", { dataTransfer: handleDataTransfer });

    expect(handleDataTransfer.getData("text/plain")).toBe("c");
    expect(onNodeDragStart).toHaveBeenCalledWith("c", expect.any(Object));
  });

  it("keeps the keyboard-focused row distinct with an inset focus ring", async () => {
    render(
      <Tree
        nodes={sampleNodes()}
        ariaLabel="Sample tree"
        selectedIds={["a"]}
      />,
    );

    row("a").focus();
    fireEvent.keyDown(row("a"), { key: "ArrowDown" });

    await waitFor(() => expect(row("b")).toHaveFocus());
    expect(row("b")).toHaveAttribute("tabindex", "0");
    expect(row("b")).toHaveClass("focus-visible:ring-1", "focus-visible:ring-inset", "focus-visible:ring-focus");
    expect(row("b")).not.toHaveClass("bg-surfaceMuted");
    expect(row("a")).toHaveClass("bg-accentSoft");
    expect(row("a")).not.toHaveClass("border-l-focus");
  });

  it("keeps the current left rail exclusive when keyboard focus moves elsewhere", async () => {
    render(
      <Tree
        nodes={sampleNodes()}
        ariaLabel="Sample tree"
        currentId="a"
      />,
    );

    row("a").focus();
    fireEvent.keyDown(row("a"), { key: "ArrowDown" });

    await waitFor(() => expect(row("b")).toHaveFocus());
    expect(row("a")).toHaveClass("border-l-focus");
    expect(row("b")).not.toHaveClass("border-l-focus");
  });

  it("supports typeahead and complete left/right tree navigation", async () => {
    render(
      <Tree
        nodes={sampleNodes()}
        ariaLabel="Sample tree"
        defaultExpandedIds={["a"]}
      />,
    );

    const tree = screen.getByRole("tree", { name: "Sample tree" });
    row("a").focus();

    fireEvent.keyDown(tree, { key: "g" });
    await waitFor(() => expect(row("c")).toHaveFocus());

    fireEvent.keyDown(tree, { key: "Home" });
    await waitFor(() => expect(row("a")).toHaveFocus());

    fireEvent.keyDown(tree, { key: "ArrowRight" });
    await waitFor(() => expect(row("a1")).toHaveFocus());

    fireEvent.keyDown(tree, { key: "ArrowLeft" });
    await waitFor(() => expect(row("a")).toHaveFocus());

    fireEvent.keyDown(tree, { key: "ArrowLeft" });
    expect(row("a")).toHaveAttribute("aria-expanded", "false");
  });

  it("emits rename and context-menu keyboard shortcuts for the focused row", () => {
    const onRenameShortcut = vi.fn();
    const onKeyboardContextMenu = vi.fn();
    render(
      <Tree
        nodes={sampleNodes()}
        ariaLabel="Sample tree"
        onRenameShortcut={onRenameShortcut}
        onKeyboardContextMenu={onKeyboardContextMenu}
      />,
    );

    const tree = screen.getByRole("tree", { name: "Sample tree" });
    row("a").focus();

    fireEvent.keyDown(tree, { key: "F2" });
    expect(onRenameShortcut).toHaveBeenCalledWith("a", expect.objectContaining({ id: "a" }), expect.any(Object));

    fireEvent.keyDown(tree, { key: "F10", shiftKey: true });
    expect(onKeyboardContextMenu).toHaveBeenCalledWith("a", expect.objectContaining({ id: "a" }), expect.any(Object));
  });

  it("does not run typeahead from editable controls inside a row", () => {
    render(
      <Tree
        nodes={sampleNodes()}
        ariaLabel="Sample tree"
        renderRow={(node) => <input aria-label={`Rename ${node.label}`} defaultValue={node.label} />}
      />,
    );

    const input = screen.getByLabelText("Rename Alpha");
    input.focus();

    fireEvent.keyDown(input, { key: "g" });

    expect(input).toHaveFocus();
    expect(row("c")).not.toHaveFocus();
  });

  it("remaps the bottom band of an expanded folder to before its first child", () => {
    const onDrop = vi.fn();
    render(
      <Tree
        nodes={sampleNodes()}
        ariaLabel="Sample tree"
        draggable
        defaultExpandedIds={["a", "b"]}
        onDrop={onDrop}
      />,
    );

    const dataTransfer = mockDataTransfer();
    const alpha = row("a");
    setRowRect(alpha, 0, 28);

    dispatchDragEvent(row("c"), "dragstart", { dataTransfer });
    dispatchDragEvent(alpha, "dragover", { dataTransfer, clientY: 26 });
    expect(row("a1")).toHaveAttribute("data-tree-drop-state", "valid");
    expect(row("a1")).toHaveAttribute("data-tree-drop-position", "before");
    dispatchDragEvent(alpha, "drop", { dataTransfer, clientY: 26 });

    expect(onDrop).toHaveBeenCalledWith("c", "a1", "before");
  });

  it("keeps the bottom band of a collapsed folder as an after-sibling drop", () => {
    const onDrop = vi.fn();
    render(<Tree nodes={sampleNodes()} ariaLabel="Sample tree" draggable onDrop={onDrop} />);

    const dataTransfer = mockDataTransfer();
    const alpha = row("a");
    setRowRect(alpha, 0, 28);

    dispatchDragEvent(row("c"), "dragstart", { dataTransfer });
    dispatchDragEvent(alpha, "dragover", { dataTransfer, clientY: 26 });
    dispatchDragEvent(alpha, "drop", { dataTransfer, clientY: 26 });

    expect(onDrop).toHaveBeenCalledWith("c", "a", "after");
  });

  it("expands a collapsed folder after a drop inside it so the moved node stays visible", () => {
    function Harness() {
      const [nodes, setNodes] = useState(sampleNodes());
      return (
        <Tree
          nodes={nodes}
          ariaLabel="Sample tree"
          draggable
          onDrop={(draggedId, targetId, position) =>
            setNodes((current) => moveTreeNode(current, draggedId, targetId, position))}
        />
      );
    }
    render(<Harness />);

    const dataTransfer = mockDataTransfer();
    const beta = row("b");
    setRowRect(beta, 0, 28);

    dispatchDragEvent(row("c"), "dragstart", { dataTransfer });
    dispatchDragEvent(beta, "dragover", { dataTransfer, clientY: 14 });
    dispatchDragEvent(beta, "drop", { dataTransfer, clientY: 14 });

    expect(row("b")).toHaveAttribute("aria-expanded", "true");
    expect(row("c")).toBeInTheDocument();
    expect((row("c").querySelector("[data-tree-indent]") as HTMLElement).style.width).toBe("16px");
  });

  it("blocks self drops and descendant cycles in the drag layer", () => {
    const onDrop = vi.fn();
    render(
      <Tree
        nodes={sampleNodes()}
        ariaLabel="Sample tree"
        draggable
        defaultExpandedIds={["a"]}
        onDrop={onDrop}
      />,
    );

    const dataTransfer = mockDataTransfer();
    const alphaChild = row("a1");
    setRowRect(alphaChild, 0, 28);

    dispatchDragEvent(row("a"), "dragstart", { dataTransfer });
    dispatchDragEvent(alphaChild, "dragover", { dataTransfer, clientY: 14 });
    expect(alphaChild).toHaveAttribute("data-tree-drop-state", "invalid");
    expect(alphaChild).toHaveAttribute("data-tree-drop-position", "after");
    expect(alphaChild).toHaveAttribute("data-tree-drop-reason", "Cannot move a node inside its own descendant.");
    expect(screen.getByRole("status")).toHaveTextContent("Cannot move a node inside its own descendant.");
    dispatchDragEvent(alphaChild, "drop", { dataTransfer, clientY: 14 });

    expect(onDrop).not.toHaveBeenCalled();
  });

  it("names rows from node.ariaLabel and fires onRowDoubleClick", () => {
    const onRowDoubleClick = vi.fn();
    const nodes = sampleNodes();
    nodes[2].ariaLabel = "Gamma component";

    render(
      <Tree
        nodes={nodes}
        ariaLabel="Sample tree"
        onRowDoubleClick={onRowDoubleClick}
      />,
    );

    const gamma = screen.getByRole("treeitem", { name: "Gamma component" });
    fireEvent.doubleClick(gamma);
    expect(onRowDoubleClick).toHaveBeenCalledWith("c", expect.objectContaining({ id: "c" }));
  });

  it("focuses rows with selector metacharacters in node IDs without querying invalid selectors", async () => {
    const malformedId = 'imported-node"with]selector\\characters';
    const onRowClick = vi.fn();
    render(
      <Tree
        nodes={[{ id: malformedId, label: "Imported first node", isLeaf: true }]}
        ariaLabel="Imported tree"
        onRowClick={onRowClick}
      />,
    );

    const importedRow = screen.getByRole("treeitem", { name: "Imported first node" });
    expect(() => fireEvent.click(importedRow)).not.toThrow();

    await waitFor(() => expect(document.activeElement).toBe(importedRow));
    expect(onRowClick).toHaveBeenCalledWith(malformedId, expect.objectContaining({ id: malformedId }));
  });

  it("passes the drag event to onNodeDragStart so consumers can restamp the payload", () => {
    const onNodeDragStart = vi.fn();
    render(
      <Tree
        nodes={sampleNodes()}
        ariaLabel="Sample tree"
        draggable
        onDrop={() => undefined}
        onNodeDragStart={onNodeDragStart}
      />,
    );

    const dataTransfer = mockDataTransfer();
    dispatchDragEvent(row("c"), "dragstart", { dataTransfer });

    expect(onNodeDragStart).toHaveBeenCalledTimes(1);
    const [nodeId, event] = onNodeDragStart.mock.calls[0];
    expect(nodeId).toBe("c");
    // Default payload is already stamped when the callback runs, so the
    // consumer can override data, effect, and drag image.
    expect(event.dataTransfer.getData("text/plain")).toBe("c");
    event.dataTransfer.setData("application/x-custom", "payload");
    expect(dataTransfer.getData("application/x-custom")).toBe("payload");
  });

  it("uses bounded virtual rows when virtualization is enabled past the threshold", async () => {
    const nodes = Array.from({ length: 120 }, (_, index) => ({
      id: `node-${index + 1}`,
      label: `Node ${index + 1}`,
      isLeaf: true,
    }));
    const scrollElement = document.createElement("div");
    Object.defineProperty(scrollElement, "clientHeight", { value: 84 });
    scrollElement.getBoundingClientRect = () => ({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 240,
      bottom: 84,
      width: 240,
      height: 84,
      toJSON: () => ({}),
    });

    render(
      <Tree
        nodes={nodes}
        ariaLabel="Virtual tree"
        virtualization={{
          enabled: true,
          minRows: 1,
          estimateRowHeight: 28,
          overscan: 2,
          getScrollElement: () => scrollElement,
        }}
      />,
    );

    const virtualizer = document.querySelector("[data-tree-virtualizer]") as HTMLElement;
    expect(virtualizer).not.toBeNull();
    expect(virtualizer).toHaveAttribute("data-tree-virtual-total-count", "120");
    await waitFor(() => expect(Number(virtualizer.getAttribute("data-tree-virtual-mounted-count"))).toBeGreaterThan(0));
    const mountedCount = Number(virtualizer.getAttribute("data-tree-virtual-mounted-count"));
    expect(mountedCount).toBeGreaterThan(0);
    expect(mountedCount).toBeLessThan(120);
    expect(document.querySelectorAll("[data-tree-virtual-row]").length).toBe(mountedCount);
  });

  describe("moveTreeNode", () => {
    it("moves nodes before, after, and inside targets", () => {
      const before = moveTreeNode(sampleNodes(), "c", "a", "before");
      expect(before.map((node) => node.id)).toEqual(["c", "a", "b"]);

      const after = moveTreeNode(sampleNodes(), "a", "b", "after");
      expect(after.map((node) => node.id)).toEqual(["b", "a", "c"]);

      const inside = moveTreeNode(sampleNodes(), "c", "b", "inside");
      expect(inside.map((node) => node.id)).toEqual(["a", "b"]);
      expect(inside[1].children?.map((node) => node.id)).toEqual(["b1", "c"]);
    });

    it("reparents nested nodes across branches", () => {
      const next = moveTreeNode(sampleNodes(), "a2", "b1", "before");
      expect(next[0].children?.map((node) => node.id)).toEqual(["a1"]);
      expect(next[1].children?.map((node) => node.id)).toEqual(["a2", "b1"]);
    });

    it("returns the input for self drops, cycles, and unknown nodes", () => {
      const nodes = sampleNodes();
      expect(moveTreeNode(nodes, "a", "a", "inside")).toBe(nodes);
      expect(moveTreeNode(nodes, "a", "a1", "before")).toBe(nodes);
      expect(moveTreeNode(nodes, "missing", "a", "before")).toBe(nodes);
      expect(moveTreeNode(nodes, "a", "missing", "before")).toBe(nodes);
    });
  });
});
