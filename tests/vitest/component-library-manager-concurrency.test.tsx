import { act, type ReactNode } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ComponentLibraryManager } from "@/components/workshop/component-library-manager/ComponentLibraryManager";
import type { EstimateRowItem } from "@/components/workshop/estimate-tree-data";

const actionMocks = vi.hoisted(() => ({
  createCostLibraryComponent: vi.fn(),
  createLibraryFolder: vi.fn(),
  deleteLibraryFolder: vi.fn(),
  duplicateCostLibraryComponent: vi.fn(),
  executeBulkArchiveLibraryComponents: vi.fn(),
  executeBulkDeleteLibraryComponents: vi.fn(),
  loadCostLibraryComponentEditorDetail: vi.fn(),
  loadCostLibraryComponentRowDetail: vi.fn(),
  moveCostLibraryComponentToFolder: vi.fn(),
  previewBulkArchiveLibraryComponents: vi.fn(),
  previewBulkDeleteLibraryComponents: vi.fn(),
  renameLibraryFolder: vi.fn(),
}));

vi.mock("@/lib/component-library/actions", () => actionMocks);

vi.mock("next/navigation", () => ({
  usePathname: () => "/workshop/library/components",
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

vi.mock("next/dynamic", () => ({
  default: (loader: () => Promise<unknown>) => {
    const source = String(loader);
    if (source.includes("AddComponentModal")) {
      return function MockAddComponentModal({ open, editingItem }: { open: boolean; editingItem?: EstimateRowItem | null }) {
        return open ? (
          <div role="dialog" aria-label={editingItem ? "Edit Component" : "Add Component"}>
            {editingItem?.name ?? editingItem?.material ?? "New component"}
          </div>
        ) : null;
      };
    }
    if (source.includes("LibraryFolderTree")) {
      return function MockLibraryFolderTreeSurface({
        libraryItems,
        onMoveComponentToFolder,
      }: {
        libraryItems: EstimateRowItem[];
        onMoveComponentToFolder?: (item: EstimateRowItem, targetFolderId: string) => Promise<void> | void;
      }) {
        const item = libraryItems[0];
        return (
          <div aria-label="Component library tree">
            <button type="button" onClick={() => item && void onMoveComponentToFolder?.(item, "folder-details")}>Move to Details</button>
            <button type="button" onClick={() => item && void onMoveComponentToFolder?.(item, "folder-archive")}>Move to Archive</button>
          </div>
        );
      };
    }
    if (source.includes("ComponentInspectorDock")) {
      return function MockComponentInspectorDock({
        item,
        onEdit,
        onDuplicate,
      }: {
        item: EstimateRowItem;
        onEdit?: () => void;
        onDuplicate?: () => void;
      }) {
        const name = item.name ?? item.material;
        return (
          <div role="region" aria-label={`Component details for ${name}`}>
            <button type="button" aria-label="Edit component" onClick={onEdit}>Edit</button>
            <button type="button" aria-label="Duplicate" onClick={onDuplicate}>Duplicate</button>
          </div>
        );
      };
    }
    return function MockDynamicComponent({ children }: { children?: ReactNode }) {
      return children ?? null;
    };
  },
}));

const folders = [
  { id: "folder-source", workspace_id: "workspace-1", parent_id: null, name: "Source", sort_order: 10, source_category_node_id: null, folder_kind: "custom" as const },
  { id: "folder-details", workspace_id: "workspace-1", parent_id: null, name: "Details", sort_order: 20, source_category_node_id: null, folder_kind: "custom" as const },
  { id: "folder-archive", workspace_id: "workspace-1", parent_id: null, name: "Archive", sort_order: 30, source_category_node_id: null, folder_kind: "custom" as const },
];

function item(id: string, name: string): EstimateRowItem {
  return {
    id,
    material: name,
    name,
    description: "",
    supplier: "Supplier",
    source: "library",
    unit: "pc",
    itemCost: 100,
    quantity: 1,
    subTotal: 100,
    miscCost: 0,
    totalItemCosts: 100,
    category: "Components",
    libraryFolderId: "folder-source",
    lifecycleState: "available",
  };
}

const firstItem = item("component-1", "First component");
const secondItem = item("component-2", "Second component");

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

function renderManager(libraryItems = [firstItem, secondItem]) {
  return render(
    <ComponentLibraryManager
      categoryTree={[]}
      suppliers={[]}
      brands={[]}
      libraryFolders={folders}
      libraryItems={libraryItems}
      canManageLibrary
    />,
  );
}

function inspect(itemId: string) {
  const trigger = document.querySelector(`[data-component-card-inspect="${itemId}"]`);
  if (!(trigger instanceof HTMLElement)) throw new Error(`Missing inspect trigger for ${itemId}`);
  fireEvent.click(trigger);
}

describe("ComponentLibraryManager lifecycle concurrency", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/workshop/library/components");
    Object.values(actionMocks).forEach((mock) => mock.mockReset());
    actionMocks.loadCostLibraryComponentRowDetail.mockResolvedValue(null);
    actionMocks.moveCostLibraryComponentToFolder.mockResolvedValue(undefined);
  });

  it("ignores stale editor hydration after selection changes", async () => {
    const firstRequest = deferred<{
      component: EstimateRowItem;
      expectedComponentImpactFingerprint: string;
      optionUsageCounts: Record<string, number>;
    }>();
    const secondRequest = deferred<{
      component: EstimateRowItem;
      expectedComponentImpactFingerprint: string;
      optionUsageCounts: Record<string, number>;
    }>();
    actionMocks.loadCostLibraryComponentEditorDetail
      .mockReturnValueOnce(firstRequest.promise)
      .mockReturnValueOnce(secondRequest.promise);

    renderManager();
    await screen.findByRole("button", { name: "Add component" });

    inspect(firstItem.id);
    fireEvent.click(within(await screen.findByRole("region", { name: "Component details for First component" })).getByRole("button", { name: "Edit component" }));

    inspect(secondItem.id);
    fireEvent.click(within(await screen.findByRole("region", { name: "Component details for Second component" })).getByRole("button", { name: "Edit component" }));

    await act(async () => {
      secondRequest.resolve({ component: secondItem, expectedComponentImpactFingerprint: "second", optionUsageCounts: {} });
      await secondRequest.promise;
    });
    expect(await screen.findByRole("dialog", { name: "Edit Component" })).toHaveTextContent("Second component");

    await act(async () => {
      firstRequest.resolve({ component: firstItem, expectedComponentImpactFingerprint: "first", optionUsageCounts: {} });
      await firstRequest.promise;
    });
    expect(screen.getByRole("dialog", { name: "Edit Component" })).toHaveTextContent("Second component");
  });

  it("serializes rapid folder moves for one component", async () => {
    const firstMove = deferred<void>();
    const secondMove = deferred<void>();
    actionMocks.moveCostLibraryComponentToFolder
      .mockReturnValueOnce(firstMove.promise)
      .mockReturnValueOnce(secondMove.promise);

    renderManager([firstItem]);
    fireEvent.click(await screen.findByRole("button", { name: "Move to Details" }));
    fireEvent.click(screen.getByRole("button", { name: "Move to Archive" }));

    await waitFor(() => expect(actionMocks.moveCostLibraryComponentToFolder).toHaveBeenCalledTimes(1));
    expect(actionMocks.moveCostLibraryComponentToFolder).toHaveBeenNthCalledWith(1, {
      itemId: firstItem.id,
      libraryFolderId: "folder-details",
    });

    await act(async () => {
      firstMove.resolve();
      await firstMove.promise;
    });
    await waitFor(() => expect(actionMocks.moveCostLibraryComponentToFolder).toHaveBeenCalledTimes(2));
    expect(actionMocks.moveCostLibraryComponentToFolder).toHaveBeenNthCalledWith(2, {
      itemId: firstItem.id,
      libraryFolderId: "folder-archive",
    });

    await act(async () => {
      secondMove.resolve();
      await secondMove.promise;
    });
  });

  it("routes duplication through the authoritative full-detail action", async () => {
    const duplicate = { ...firstItem, id: "component-copy", name: "First component copy", material: "First component copy" };
    actionMocks.duplicateCostLibraryComponent.mockResolvedValue({ component: duplicate });

    renderManager([firstItem]);
    await screen.findByRole("button", { name: "Add component" });
    inspect(firstItem.id);
    fireEvent.click(within(await screen.findByRole("region", { name: "Component details for First component" })).getByRole("button", { name: "Duplicate" }));

    await waitFor(() => expect(actionMocks.duplicateCostLibraryComponent).toHaveBeenCalledWith({ itemId: firstItem.id }));
    expect(actionMocks.createCostLibraryComponent).not.toHaveBeenCalled();
    expect(await screen.findByRole("region", { name: "Component details for First component copy" })).toBeInTheDocument();
  });
});
