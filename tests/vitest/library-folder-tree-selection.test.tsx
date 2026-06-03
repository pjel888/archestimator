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

vi.mock("@/lib/component-library/actions", () => ({
  reorderLibraryFolders: vi.fn(),
}));

const rctHarness = vi.hoisted(() => ({
  environment: null as (Record<string, unknown> & {
    items: Record<TreeItemIndex, TreeItem<{ folderId: string | null; label: string }>>;
    getItemTitle: (item: TreeItem<{ folderId: string | null; label: string }>) => string;
    renderItem?: (props: Record<string, unknown>) => ReactNode;
    renderItemTitle?: (props: Record<string, unknown>) => ReactNode;
    renderItemArrow?: (props: Record<string, unknown>) => ReactNode;
    onPrimaryAction?: (item: TreeItem<{ folderId: string | null; label: string }>) => void;
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

function renderTree(onDeleteFolders = vi.fn()) {
  render(
    <LibraryFolderTree
      folders={folders}
      nodes={nodes}
      selectedFolderId="folder-fabrication"
      searchQuery=""
      disabled={false}
      onSelectFolder={vi.fn()}
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
});
