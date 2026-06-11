import { describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach } from "vitest";

import { Tree, type TreeNode } from "@/components/ui/tree";

const EXTERNAL_TYPE = "application/x-test-payload";

const nodes: TreeNode[] = [
  { id: "alpha", label: "Alpha", isLeaf: false, children: [{ id: "alpha-child", label: "Alpha Child" }] },
  { id: "beta", label: "Beta", isLeaf: true },
];

function createDataTransferStub(types: string[]) {
  const store = new Map<string, string>();
  return {
    types,
    dropEffect: "none",
    effectAllowed: "all",
    setData: vi.fn((type: string, value: string) => {
      store.set(type, value);
    }),
    getData: vi.fn((type: string) => store.get(type) ?? ""),
    setDragImage: vi.fn(),
  };
}

function row(id: string): HTMLElement {
  const element = document.querySelector(`[data-tree-row="${id}"]`);
  if (!(element instanceof HTMLElement)) throw new Error(`Missing tree row ${id}`);
  return element;
}

describe("Tree external drops", () => {
  afterEach(cleanup);

  it("routes matching external drags through canDrop and onDrop with an inside fallback", () => {
    const canDrop = vi.fn(
      (_types: readonly string[], targetId: string, position: string) => targetId === "alpha" && position === "inside",
    );
    const onDrop = vi.fn();
    render(
      <Tree
        nodes={nodes}
        ariaLabel="External drop tree"
        externalDrop={{ types: [EXTERNAL_TYPE], canDrop, onDrop }}
      />,
    );

    const dataTransfer = createDataTransferStub([EXTERNAL_TYPE, "text/plain"]);
    dataTransfer.setData(EXTERNAL_TYPE, "payload-1");

    // Folder row: jsdom rects are empty, so the band resolves to "inside".
    fireEvent.dragOver(row("alpha"), { dataTransfer });
    expect(row("alpha")).toHaveClass("bg-surfaceMuted");
    fireEvent.drop(row("alpha"), { dataTransfer });

    expect(onDrop).toHaveBeenCalledTimes(1);
    const [dropEvent, targetId, position, node] = onDrop.mock.calls[0];
    expect(dropEvent.dataTransfer.getData(EXTERNAL_TYPE)).toBe("payload-1");
    expect(targetId).toBe("alpha");
    expect(position).toBe("inside");
    expect((node as TreeNode).id).toBe("alpha");

    // Leaf row: banded "after" and the "inside" fallback are both rejected.
    fireEvent.dragOver(row("beta"), { dataTransfer });
    expect(row("beta")).not.toHaveClass("bg-surfaceMuted");
    fireEvent.drop(row("beta"), { dataTransfer });
    expect(onDrop).toHaveBeenCalledTimes(1);
  });

  it("ignores drags whose payload types are not accepted", () => {
    const canDrop = vi.fn(() => true);
    const onDrop = vi.fn();
    render(
      <Tree
        nodes={nodes}
        ariaLabel="External drop tree"
        externalDrop={{ types: [EXTERNAL_TYPE], canDrop, onDrop }}
      />,
    );

    const dataTransfer = createDataTransferStub(["text/plain"]);
    fireEvent.dragOver(row("alpha"), { dataTransfer });
    fireEvent.drop(row("alpha"), { dataTransfer });

    expect(canDrop).not.toHaveBeenCalled();
    expect(onDrop).not.toHaveBeenCalled();
  });

  it("expands a collapsed folder after an inside drop so the result stays visible", () => {
    const onDrop = vi.fn();
    const onToggle = vi.fn();
    render(
      <Tree
        nodes={nodes}
        ariaLabel="External drop tree"
        onToggle={onToggle}
        externalDrop={{ types: [EXTERNAL_TYPE], canDrop: () => true, onDrop }}
      />,
    );

    const dataTransfer = createDataTransferStub([EXTERNAL_TYPE]);
    fireEvent.drop(row("alpha"), { dataTransfer });

    expect(onDrop).toHaveBeenCalledTimes(1);
    expect(onToggle).toHaveBeenCalledWith("alpha", true);
  });
});
