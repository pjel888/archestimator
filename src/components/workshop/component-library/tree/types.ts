import type { DragEvent } from "react";

import type { EstimateRowItem } from "../../estimate-tree-data";

export type LibraryTreeTab = "categories" | "suppliers" | "brands" | "custom";

export type LibraryTreeNode = {
  id: string;
  label: string;
  meta?: string;
  code?: string;
  kind?: string;
  aliases?: string[];
  children?: LibraryTreeNode[];
  item?: EstimateRowItem;
};

export type LibraryTreeProps = {
  nodes: LibraryTreeNode[];
  /** Highlighted node id, e.g. the item currently shown in the preview panel. */
  selectedNodeId: string | null;
  expandedNodeIds: string[];
  searchQuery: string;
  /** Folder row click and context-menu "Select"; defaults to `onToggle`. */
  onSelect?: (nodeId: string) => void;
  /** Toggles a single folder's expansion (caret and context-menu actions). */
  onToggle: (nodeId: string) => void;
  onItemAdd?: (item: EstimateRowItem | undefined) => void;
  onItemPreview?: (itemId: string) => void;
  /** Context-menu CRUD on component rows; items appear only when provided. */
  onItemEdit?: (item: EstimateRowItem) => void;
  onItemDuplicate?: (item: EstimateRowItem) => void;
  onItemToggleFavorite?: (item: EstimateRowItem) => void;
  onItemDelete?: (item: EstimateRowItem) => void;
  onItemPermanentDelete?: (item: EstimateRowItem) => void;
  itemDestructiveActionLabel?: string;
  /** Context-menu create on folder rows (opens the add-component flow). */
  onCreateComponent?: (folderId: string) => void;
  /** Context-menu rename on editable folder rows. */
  onFolderRename?: (nodeId: string) => void;
  /** Context-menu delete on editable folder rows. */
  onFolderDelete?: (nodeId: string) => void;
  addDisabled?: boolean;
  isItemAddDisabled?: (item: EstimateRowItem) => boolean;
  addLabel?: string;
  onItemDragStart?: (event: DragEvent<HTMLElement>, item: EstimateRowItem | undefined) => void;
  /** Moves a library component into a folder through an intra-tree drop. */
  onItemMoveToFolder?: (item: EstimateRowItem, targetFolderId: string | null) => Promise<void> | void;
  /** Shows fixed-size decorative thumbnails for component leaf rows only. */
  showThumbnails?: boolean;
  editingNodeId?: string | null;
  editingNodeValue?: string;
  onEditingNodeValueChange?: (value: string) => void;
  onEditingNodeCommit?: (value: string) => void;
  onEditingNodeCancel?: () => void;
  /** Accessible label for the rendered tree. Defaults to Library components. */
  treeAriaLabel?: string;
  /** Renders fixed in-tree skeleton rows while this tab's tree data is pending. */
  loading?: boolean;
  loadingAriaLabel?: string;
  /** Visible source scope shown on component rows, e.g. Library or Project. */
  sourceScopeLabel?: string;
  showItemAddAction?: boolean;
  /** Enables bulk-select checkboxes; cascade rules live with the consumer. */
  selectable?: boolean;
  checkedIds?: string[];
  onCheckToggle?: (nodeId: string, checked: boolean) => void;
  /** Folder reordering; folders become draggable when provided. */
  onReorder?: (draggedId: string, targetId: string, position: "before" | "after" | "inside") => void;
  /** Enables folder-to-folder containment drops instead of sibling-only ordering. */
  folderNestingEnabled?: boolean;
  /** Pauses reordering, e.g. while a search filters the visible siblings. */
  reorderDisabled?: boolean;
};
