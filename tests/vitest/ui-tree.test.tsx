import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { Tree, moveTreeNode, type TreeNode } from "@/components/ui/tree";

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
