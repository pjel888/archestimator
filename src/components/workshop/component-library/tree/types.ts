import type { DragEvent } from "react";

import type { ActionMenuGroup } from "@/components/ui/action-menu";
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
  selectedNodeId: string | null;
  expandedNodeIds: string[];
  searchQuery: string;
  onSelect: (nodeId: string) => void;
  onToggle: (nodeId: string) => void;
  onItemAdd?: (item: EstimateRowItem | undefined) => void;
  onItemPreview?: (itemId: string) => void;
  addDisabled?: boolean;
  addLabel?: string;
  onItemDragStart?: (event: DragEvent<HTMLElement>, item: EstimateRowItem | undefined) => void;
  showItemAddAction?: boolean;
};

export type LibraryFolderRowProps = {
  node: LibraryTreeNode;
  depth: number;
  expanded: boolean;
  selected: boolean;
  onToggle: () => void;
  onSelect: () => void;
  contextMenuGroups?: ActionMenuGroup[];
};

export type LibraryItemRowProps = {
  node: LibraryTreeNode;
  depth: number;
  selected: boolean;
  onPreview: () => void;
  onAdd: () => void;
  addDisabled?: boolean;
  addLabel?: string;
  showAddAction?: boolean;
  onDragStart?: (event: DragEvent<HTMLElement>) => void;
  contextMenuGroups?: ActionMenuGroup[];
};
