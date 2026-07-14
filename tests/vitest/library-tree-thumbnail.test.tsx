import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LibraryTree } from "@/components/workshop/component-library/tree/LibraryTree";
import type { EstimateRowItem } from "@/lib/estimates/types";

const componentItem: EstimateRowItem = {
  id: "component-pergo",
  material: "Dark Cottage Oak",
  name: "Dark Cottage Oak",
  description: "Oak flooring",
  supplier: "",
  source: "library",
  unit: "box",
  itemCost: 2500.5,
  price: 2500.5,
  currency: "PHP",
  quantity: 1,
  subTotal: 2500.5,
  miscCost: 0,
  totalItemCosts: 2500.5,
  category: "Flooring",
  imageUrl: "11111111-1111-4111-8111-111111111111/user-1/component-images/pergo-thumb.webp",
};

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
    setData: (key: string, value: string) => store.set(key, value),
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

function dispatchDragEvent(
  element: HTMLElement,
  type: "dragstart" | "dragover" | "drop" | "dragend",
  options: { clientY?: number; dataTransfer: ReturnType<typeof mockDataTransfer> },
) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, "dataTransfer", { value: options.dataTransfer });
  if (options.clientY !== undefined) Object.defineProperty(event, "clientY", { value: options.clientY });
  fireEvent(element, event);
}

describe("LibraryTree thumbnails", () => {
  it("keeps unavailable components visible for management while disabling insertion", async () => {
    const onItemAdd = vi.fn();
    const unavailableItem = { ...componentItem, lifecycleState: "discontinued" as const };
    render(
      <LibraryTree
        nodes={[{ id: unavailableItem.id, label: unavailableItem.name, item: unavailableItem }]}
        selectedNodeId={null}
        expandedNodeIds={[]}
        searchQuery=""
        onToggle={vi.fn()}
        onItemAdd={onItemAdd}
        onItemEdit={vi.fn()}
        isItemAddDisabled={(item) => item.lifecycleState !== "available"}
      />,
    );

    expect(row(unavailableItem.id)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: `Select an area before adding ${unavailableItem.name}` })).toBeDisabled();
    fireEvent.doubleClick(row(unavailableItem.id));
    expect(onItemAdd).not.toHaveBeenCalled();

    fireEvent.contextMenu(row(unavailableItem.id));
    expect(await screen.findByRole("menuitem", { name: "Edit" })).toBeInTheDocument();
  });

  it("brokers stored component thumbnail keys into the component image route", () => {
    const { container } = render(
      <LibraryTree
        nodes={[{ id: componentItem.id, label: componentItem.name, item: componentItem }]}
        selectedNodeId={null}
        expandedNodeIds={[]}
        searchQuery=""
        onToggle={vi.fn()}
        showThumbnails
      />,
    );

    const thumbnail = container.querySelector("[data-component-library-row-thumbnail] img") as HTMLImageElement | null;
    expect(thumbnail).not.toBeNull();
    expect(decodeURIComponent(thumbnail.src)).toContain(
      "/api/component-library/images?path=11111111-1111-4111-8111-111111111111/user-1/component-images/pergo-thumb.webp",
    );
  });

  it("renders an existing project-backed component thumbnail", () => {
    const projectThumbnailPath = "11111111-1111-4111-8111-111111111111/user-1/project-images/22222222-2222-4222-8222-222222222222/pergo-thumb.webp";
    const item = { ...componentItem, imageUrl: `/api/projects/images?path=${encodeURIComponent(projectThumbnailPath)}` };
    const { container } = render(
      <LibraryTree
        nodes={[{ id: item.id, label: item.name, item }]}
        selectedNodeId={null}
        expandedNodeIds={[]}
        searchQuery=""
        onToggle={vi.fn()}
        showThumbnails
      />,
    );

    const thumbnail = container.querySelector("[data-component-library-row-thumbnail] img") as HTMLImageElement | null;
    expect(thumbnail).not.toBeNull();
    expect(decodeURIComponent(thumbnail.src)).toContain(`/api/projects/images?path=${projectThumbnailPath}`);
  });

  it("treats the full folder row as a component containment target", () => {
    const onItemMoveToFolder = vi.fn();
    render(
      <LibraryTree
        nodes={[
          { id: "folder-flooring", label: "Flooring", children: [] },
          { id: componentItem.id, label: componentItem.name, item: componentItem },
        ]}
        selectedNodeId={null}
        expandedNodeIds={[]}
        searchQuery=""
        onToggle={vi.fn()}
        onItemMoveToFolder={onItemMoveToFolder}
      />,
    );

    const folderRow = row("folder-flooring");
    setRowRect(folderRow);
    const dataTransfer = mockDataTransfer();
    dispatchDragEvent(row(componentItem.id), "dragstart", { dataTransfer });
    dispatchDragEvent(folderRow, "dragover", { dataTransfer, clientY: 2 });
    dispatchDragEvent(folderRow, "drop", { dataTransfer, clientY: 2 });

    expect(onItemMoveToFolder).toHaveBeenCalledWith(componentItem, "folder-flooring");
  });

  it("moves a nested component to the root bottom edge", () => {
    const onItemMoveToFolder = vi.fn();
    const nestedItem = { ...componentItem, libraryFolderId: "folder-flooring" };
    render(
      <LibraryTree
        nodes={[
          {
            id: "folder-flooring",
            label: "Flooring",
            children: [{ id: nestedItem.id, label: nestedItem.name, item: nestedItem }],
          },
        ]}
        selectedNodeId={null}
        expandedNodeIds={["folder-flooring"]}
        searchQuery=""
        onToggle={vi.fn()}
        onItemMoveToFolder={onItemMoveToFolder}
      />,
    );

    const rootEdge = document.querySelector('[data-tree-root-drop-edge="bottom"]');
    expect(rootEdge).toBeInstanceOf(HTMLElement);
    const dataTransfer = mockDataTransfer();
    dispatchDragEvent(row(nestedItem.id), "dragstart", { dataTransfer });
    dispatchDragEvent(rootEdge as HTMLElement, "dragover", { dataTransfer });
    dispatchDragEvent(rootEdge as HTMLElement, "drop", { dataTransfer });

    expect(onItemMoveToFolder).toHaveBeenCalledWith(nestedItem, null);
  });

  it("uses a parent folder outer band to lift a nested component one level", () => {
    const onItemMoveToFolder = vi.fn();
    const nestedItem = { ...componentItem, libraryFolderId: "folder-flooring" };
    render(
      <LibraryTree
        nodes={[
          {
            id: "folder-flooring",
            label: "Flooring",
            children: [{ id: nestedItem.id, label: nestedItem.name, item: nestedItem }],
          },
        ]}
        selectedNodeId={null}
        expandedNodeIds={["folder-flooring"]}
        searchQuery=""
        onToggle={vi.fn()}
        onItemMoveToFolder={onItemMoveToFolder}
      />,
    );

    const folderRow = row("folder-flooring");
    setRowRect(folderRow);
    const dataTransfer = mockDataTransfer();
    dispatchDragEvent(row(nestedItem.id), "dragstart", { dataTransfer });
    dispatchDragEvent(folderRow, "dragover", { dataTransfer, clientY: 2 });
    dispatchDragEvent(folderRow, "drop", { dataTransfer, clientY: 2 });

    expect(onItemMoveToFolder).toHaveBeenCalledWith(nestedItem, null);
  });

  it("allows a nested folder to move to the root bottom edge", () => {
    const onReorder = vi.fn();
    render(
      <LibraryTree
        nodes={[
          {
            id: "folder-flooring",
            label: "Flooring",
            children: [{ id: "folder-laminate", label: "Laminate", children: [] }],
          },
          { id: componentItem.id, label: componentItem.name, item: componentItem },
        ]}
        selectedNodeId={null}
        expandedNodeIds={["folder-flooring"]}
        searchQuery=""
        onToggle={vi.fn()}
        onReorder={onReorder}
        folderNestingEnabled
      />,
    );

    const rootEdge = document.querySelector('[data-tree-root-drop-edge="bottom"]');
    expect(rootEdge).toBeInstanceOf(HTMLElement);
    const dataTransfer = mockDataTransfer();
    dispatchDragEvent(row("folder-laminate"), "dragstart", { dataTransfer });
    dispatchDragEvent(rootEdge as HTMLElement, "dragover", { dataTransfer });
    dispatchDragEvent(rootEdge as HTMLElement, "drop", { dataTransfer });

    expect(onReorder).toHaveBeenCalledWith("folder-laminate", "folder-flooring", "after");
  });
});
