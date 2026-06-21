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
  /** Context-menu create on folder rows (opens the add-component flow). */
  onCreateComponent?: () => void;
  addDisabled?: boolean;
  addLabel?: string;
  onItemDragStart?: (event: DragEvent<HTMLElement>, item: EstimateRowItem | undefined) => void;
  /** Shows fixed-size decorative thumbnails for component leaf rows only. */
  showThumbnails?: boolean;
  showItemAddAction?: boolean;
  /** Enables bulk-select checkboxes; cascade rules live with the consumer. */
  selectable?: boolean;
  checkedIds?: string[];
  onCheckToggle?: (nodeId: string, checked: boolean) => void;
  /** Same-parent sibling reordering; folders become draggable when provided. */
  onReorder?: (draggedId: string, targetId: string, position: "before" | "after") => void;
  /** Pauses reordering, e.g. while a search filters the visible siblings. */
  reorderDisabled?: boolean;
};
