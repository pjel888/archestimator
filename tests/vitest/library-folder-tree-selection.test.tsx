import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import type { TreeItem, TreeItemIndex } from "react-complex-tree";

import { LibraryFolderTree } from "@/components/workshop/component-library-manager/LibraryFolderTree";
import { ALL_COMPONENTS_FOLDER_ID } from "@/components/workshop/component-library-manager/library-folder-tree-shared";
import {
  type LibraryFolderRecord,
  type LibraryFolderTreeNode,
  toLibraryFolderTreeItemId,
} from "@/lib/component-library/library-folder-reorder";
import type { EstimateRowItem } from "@/lib/estimates/types";

vi.mock("@/lib/component-library/actions", () => ({
  reorderLibraryFolders: vi.fn(),
}));

type CapturedTreeItemData = {
  kind: "folder" | "component";
  folderId: string | null;
  label: string;
  item?: EstimateRowItem;
  parentFolderId?: string;
};

const rctHarness = vi.hoisted(() => ({
  environment: null as (Record<string, unknown> & {
    items: Record<TreeItemIndex, TreeItem<CapturedTreeItemData>>;
    getItemTitle: (item: TreeItem<CapturedTreeItemData>) => string;
    renderItem?: (props: Record<string, unknown>) => ReactNode;
    renderItemTitle?: (props: Record<string, unknown>) => ReactNode;
    renderItemArrow?: (props: Record<string, unknown>) => ReactNode;
    onPrimaryAction?: (item: TreeItem<CapturedTreeItemData>) => void;
  }) | null,
}));

vi.mock("react-complex-tree", () => ({
  InteractionMode: { ClickArrowToExpand: "ClickArrowToExpand" },
  ControlledTreeEnvironment: (props: Record<string, unknown> & { children: ReactNode }) => {
    rctHarness.environment = props as typeof rctHarness.environment;
    return <div data-rct-environment="true">{props.children}</div>;
  },
  Tree: ({ rootItem, treeLabel }: { rootItem: TreeItemIndex; treeLabel: string }) => {
    const environment = rctHarness.environment;
    if (!environment) return null;

    function renderChildren(parentId: TreeItemIndex, depth = 0): ReactNode {
      const parent = environment?.items[parentId];
      return (
        <ol>
          {(parent?.children ?? []).map((childId) => {
            const item = environment.items[childId]!;
            const title = environment.renderItemTitle?.({ title: environment.getItemTitle(item), item }) ?? environment.getItemTitle(item);
            const arrow = environment.renderItemArrow?.({
              item,
              context: { isExpanded: true, arrowProps: { role: "button" } },
            });
            const children = renderChildren(childId, depth + 1);
            return environment.renderItem?.({
              item,
              depth,
              title,
              arrow,
              children,
              context: {
                isExpanded: true,
                itemContainerWithChildrenProps: {},
                itemContainerWithoutChildrenProps: {},
                interactiveElementProps: {
                  onClick: () => environment.onPrimaryAction?.(item),
                },
              },
            });
          })}
        </ol>
      );
    }

    return <div role="tree" aria-label={treeLabel}>{renderChildren(rootItem)}</div>;
  },
}));

const folders: LibraryFolderRecord[] = [
  {
    id: "folder-fabrication",
    workspace_id: "workspace-1",
    parent_id: null,
    name: "Fabrication",
    sort_order: 10,
    source_category_node_id: null,
    folder_kind: "custom",
  },
  {
    id: "folder-details",
    workspace_id: "workspace-1",
    parent_id: "folder-fabrication",
    name: "Details",
    sort_order: 10,
    source_category_node_id: null,
    folder_kind: "custom",
  },
];

const nodes: LibraryFolderTreeNode[] = [
  {
    id: toLibraryFolderTreeItemId(ALL_COMPONENTS_FOLDER_ID),
    folderId: ALL_COMPONENTS_FOLDER_ID,
    label: "All Components",
    parentId: null,
    sortOrder: 0,
    sourceCategoryNodeId: null,
    folderKind: "custom",
    children: [
      {
        id: toLibraryFolderTreeItemId("folder-fabrication"),
        folderId: "folder-fabrication",
        label: "Fabrication",
        parentId: null,
        sortOrder: 10,
        sourceCategoryNodeId: null,
        folderKind: "custom",
        children: [
          {
            id: toLibraryFolderTreeItemId("folder-details"),
            folderId: "folder-details",
            label: "Details",
            parentId: "folder-fabrication",
            sortOrder: 10,
            sourceCategoryNodeId: null,
            folderKind: "custom",
            children: [],
          },
        ],
      },
    ],
  },
];

const componentItem: EstimateRowItem = {
  id: "component-monthly",
  material: "General Requirements Monthly",
  name: "General Requirements Monthly",
  description: "Contractor allowance",
  supplier: "Contractor allowance",
  source: "library",
  unit: "month",
  itemCost: 185000,
  price: 185000,
  currency: "PHP",
  quantity: 1,
  subTotal: 185000,
  miscCost: 0,
  totalItemCosts: 185000,
  category: "Project Requirements",
  categoryNodeId: "category-general-requirements",
  categoryPath: ["Administration", "Project Requirements", "General Requirements"],
  libraryFolderId: "folder-details",
  pricingSource: "Contractor allowance",
  pricingDate: "2026-05-23",
};

type RenderTreeOptions = {
  libraryItems?: EstimateRowItem[];
  selectedComponentIds?: Set<string>;
  onToggleComponentSelected?: (itemId: string) => void;
  onMoveComponentToFolder?: (item: EstimateRowItem, targetFolderId: string) => Promise<void> | void;
};

function renderTree(onDeleteFolders = vi.fn(), options: RenderTreeOptions = {}) {
  render(
    <LibraryFolderTree
      folders={folders}
      nodes={nodes}
      libraryItems={options.libraryItems}
      selectedComponentIds={options.selectedComponentIds}
      selectedFolderId="folder-fabrication"
      searchQuery=""
      disabled={false}
      onSelectFolder={vi.fn()}
      onToggleComponentSelected={options.onToggleComponentSelected}
      onMoveComponentToFolder={options.onMoveComponentToFolder}
      onFoldersChange={vi.fn()}
      onReorderStatus={vi.fn()}
      onCreateFolder={vi.fn()}
      onRenameFolder={vi.fn()}
      onDeleteFolder={vi.fn()}
      onDeleteFolders={onDeleteFolders}
    />,
  );
  return onDeleteFolders;
}

describe("library folder tree bulk selection", () => {
  it("protects the synthetic root while allowing folder checkbox selection and bulk delete", async () => {
    const onDeleteFolders = renderTree();

    expect(screen.getByRole("checkbox", { name: "Selection disabled for All Components" })).toBeDisabled();

    fireEvent.click(screen.getByRole("checkbox", { name: "Select Details" }));

    expect(screen.getByRole("toolbar", { name: "Bulk actions" })).toHaveTextContent("1 folder selected");
    fireEvent.click(screen.getByRole("button", { name: "Delete selected" }));

    await waitFor(() => expect(onDeleteFolders).toHaveBeenCalledWith(["folder-details"]));
  });

  it("cascades folder selection to child folders and keeps navigation selection separate", () => {
    renderTree();

    fireEvent.click(screen.getByRole("checkbox", { name: "Select Fabrication" }));

    expect(screen.getByRole("checkbox", { name: "Select Details" })).toBeChecked();
    expect(screen.getByRole("treeitem", { name: "Fabrication" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("toolbar", { name: "Bulk actions" })).toHaveTextContent("2 folders selected");
  });

  it("shows component rows with a checkbox and drag handle", () => {
    const onToggleComponentSelected = vi.fn();

    renderTree(vi.fn(), {
      libraryItems: [componentItem],
      selectedComponentIds: new Set(["component-monthly"]),
      onToggleComponentSelected,
      onMoveComponentToFolder: vi.fn(),
    });

    const checkbox = screen.getByRole("checkbox", { name: "Select General Requirements Monthly" });
    expect(checkbox).toBeChecked();
    const row = screen.getByRole("treeitem", { name: "General Requirements Monthly" });
    expect(row).toHaveAttribute("data-library-component-bulk-selected", "true");
    expect(row.querySelector('[title="Drag row"]')).not.toBeNull();

    fireEvent.click(checkbox);

    expect(onToggleComponentSelected).toHaveBeenCalledWith("component-monthly");
  });
});
