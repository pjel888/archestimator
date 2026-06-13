"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Blueprint, FolderSimple, MapPin, PencilSimple, Plus, Trash } from "@phosphor-icons/react/dist/ssr";

import { ContextActionMenuContent, type ActionMenuGroup } from "@/components/ui/action-menu";
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from "@/components/ui/context-menu";
import { TREE_ROW_ICON_SIZE, Tree, type TreeDropPosition, type TreeNode as UiTreeNode } from "@/components/ui/tree";
import type { EstimateTreeNode } from "@/lib/estimates/types";
import { pesoFormatter } from "../../component-library/helpers";
import {
  computeTemplateNodeTotal,
  summarizeEstimateTemplate,
  type EstimateTemplate,
} from "../../component-library/templates";
import { findTemplateNode } from "./template-editor-model";

export const TEMPLATE_EDITOR_ROOT_NODE_ID = "template-editor-root";

export type TemplateStructureTreeHandlers = {
  onAddNode: (parentId: string | null, kind: "group" | "area") => void;
  onRenameNode: (node: EstimateTreeNode) => void;
  onDeleteNode: (node: EstimateTreeNode) => void;
  onMoveNode: (nodeId: string, parentId: string | null, orderedSiblingIds: string[]) => void;
};

function NodeKindIcon({ kind }: { kind: EstimateTreeNode["kind"] }) {
  if (kind === "group") {
    return <FolderSimple size={TREE_ROW_ICON_SIZE} weight="regular" className="shrink-0 text-tertiary" aria-hidden="true" />;
  }
  return <MapPin size={TREE_ROW_ICON_SIZE} weight="regular" className="shrink-0 text-tertiary" aria-hidden="true" />;
}

function toStructureUiNode(node: EstimateTreeNode): UiTreeNode {
  const children = (node.children ?? []).map(toStructureUiNode);
  return {
    id: node.id,
    label: node.name,
    ariaLabel: `${node.name} template ${node.kind}`,
    isLeaf: children.length === 0,
    icon: <NodeKindIcon kind={node.kind} />,
    children,
  };
}

export function getTemplateStructureAllNodeIds(template: EstimateTemplate): string[] {
  const ids: string[] = [TEMPLATE_EDITOR_ROOT_NODE_ID];
  function visit(node: EstimateTreeNode) {
    ids.push(node.id);
    node.children?.forEach(visit);
  }
  template.nodes.forEach(visit);
  return ids;
}

type NodePlacement = { parent: EstimateTreeNode | null; siblings: EstimateTreeNode[] };

function findNodePlacement(template: EstimateTemplate, nodeId: string): NodePlacement | null {
  function visit(parent: EstimateTreeNode | null, siblings: EstimateTreeNode[]): NodePlacement | null {
    for (const node of siblings) {
      if (node.id === nodeId) return { parent, siblings };
      const childResult = visit(node, node.children ?? []);
      if (childResult) return childResult;
    }
    return null;
  }
  return visit(null, template.nodes);
}

/**
 * Left tree of one template's structure (root -> groups -> areas), with
 * context-menu CRUD and drag-to-reorder. Selecting a node scrolls the sheet
 * to it; every drag has a context-menu equivalent.
 */
export function TemplateStructureTree({
  template,
  selectedNodeId,
  onSelectNode,
  expandedIds,
  onToggle,
  handlers,
}: {
  template: EstimateTemplate;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  expandedIds: string[];
  onToggle: (nodeId: string) => void;
  handlers: TemplateStructureTreeHandlers;
}) {
  const [contextMenuNodeId, setContextMenuNodeId] = useState<string | null>(null);
  // U12 (UX-5): polite SR announcement after a keyboard reorder.
  const [moveAnnouncement, setMoveAnnouncement] = useState("");

  const nodes = useMemo<UiTreeNode[]>(
    () => [
      {
        id: TEMPLATE_EDITOR_ROOT_NODE_ID,
        label: template.name,
        ariaLabel: `${template.name} template root`,
        isLeaf: template.nodes.length === 0,
        icon: <Blueprint size={TREE_ROW_ICON_SIZE} weight="regular" className="shrink-0 text-tertiary" aria-hidden="true" />,
        draggable: false,
        children: template.nodes.map(toStructureUiNode),
      },
    ],
    [template],
  );

  const totalsByNodeId = useMemo(() => {
    const totals = new Map<string, number>();
    totals.set(TEMPLATE_EDITOR_ROOT_NODE_ID, summarizeEstimateTemplate(template).total);
    function visit(node: EstimateTreeNode) {
      totals.set(node.id, computeTemplateNodeTotal(node));
      node.children?.forEach(visit);
    }
    template.nodes.forEach(visit);
    return totals;
  }, [template]);

  function resolveDropTarget(targetId: string, position: TreeDropPosition): { parentId: string | null; index: number } | null {
    if (targetId === TEMPLATE_EDITOR_ROOT_NODE_ID) {
      return position === "inside" ? { parentId: null, index: template.nodes.length } : null;
    }
    const targetNode = findTemplateNode(template.nodes, targetId);
    if (!targetNode) return null;
    if (position === "inside") {
      return { parentId: targetNode.id, index: targetNode.children?.length ?? 0 };
    }
    const placement = findNodePlacement(template, targetId);
    if (!placement) return null;
    const targetIndex = placement.siblings.findIndex((sibling) => sibling.id === targetId);
    return {
      parentId: placement.parent?.id ?? null,
      index: position === "before" ? targetIndex : targetIndex + 1,
    };
  }

  function canDropNode(draggedId: string, targetId: string, position: TreeDropPosition) {
    const dragged = findTemplateNode(template.nodes, draggedId);
    const target = resolveDropTarget(targetId, position);
    if (!dragged || !target) return false;
    if (target.parentId === null) return dragged.kind === "group";
    const parentNode = findTemplateNode(template.nodes, target.parentId);
    return parentNode?.kind === "group";
  }

  function handleDropNode(draggedId: string, targetId: string, position: TreeDropPosition) {
    const target = resolveDropTarget(targetId, position);
    if (!target) return;
    const currentSiblings =
      target.parentId === null
        ? template.nodes
        : findTemplateNode(template.nodes, target.parentId)?.children ?? [];
    const withoutDragged = currentSiblings.filter((sibling) => sibling.id !== draggedId);
    const draggedWasBefore = currentSiblings.findIndex((sibling) => sibling.id === draggedId);
    const insertionIndex =
      draggedWasBefore !== -1 && draggedWasBefore < target.index ? target.index - 1 : target.index;
    const orderedSiblingIds = [
      ...withoutDragged.slice(0, insertionIndex).map((sibling) => sibling.id),
      draggedId,
      ...withoutDragged.slice(insertionIndex).map((sibling) => sibling.id),
    ];
    handlers.onMoveNode(draggedId, target.parentId, orderedSiblingIds);
  }

  const contextMenuGroups = useMemo<ActionMenuGroup[]>(() => {
    if (!contextMenuNodeId) return [];

    if (contextMenuNodeId === TEMPLATE_EDITOR_ROOT_NODE_ID) {
      return [
        {
          id: "template-root-actions",
          items: [
            {
              id: "add-root-group",
              label: "Add group",
              icon: <FolderSimple size={12} weight="regular" aria-hidden="true" />,
              onSelect: () => handlers.onAddNode(null, "group"),
            },
          ],
        },
      ];
    }

    const node = findTemplateNode(template.nodes, contextMenuNodeId);
    if (!node) return [];
    const isTemporary = node.id.startsWith("temp-");

    const addItems =
      node.kind === "group"
        ? [
            {
              id: "add-group",
              label: "Add group",
              icon: <FolderSimple size={12} weight="regular" aria-hidden="true" />,
              disabled: isTemporary,
              onSelect: () => handlers.onAddNode(node.id, "group"),
            },
            {
              id: "add-area",
              label: "Add area",
              icon: <Plus size={12} weight="regular" aria-hidden="true" />,
              disabled: isTemporary,
              onSelect: () => handlers.onAddNode(node.id, "area"),
            },
          ]
        : [];

    // U12 (UX-4): keyboard-reachable reorder. The context menu is keyboard-
    // navigable, so "Move up/down" gives a non-drag path to reorder a node
    // among its siblings via the existing onMoveNode handler.
    const placement = findNodePlacement(template, node.id);
    const moveSiblings = placement?.siblings ?? [];
    const moveIndex = moveSiblings.findIndex((sibling) => sibling.id === node.id);
    const reorderNode = (direction: -1 | 1) => {
      const targetIndex = moveIndex + direction;
      if (moveIndex === -1 || targetIndex < 0 || targetIndex >= moveSiblings.length) return;
      const orderedSiblingIds = moveSiblings.map((sibling) => sibling.id);
      [orderedSiblingIds[moveIndex], orderedSiblingIds[targetIndex]] = [orderedSiblingIds[targetIndex], orderedSiblingIds[moveIndex]];
      handlers.onMoveNode(node.id, placement?.parent?.id ?? null, orderedSiblingIds);
      setMoveAnnouncement(`Moved ${node.name} ${direction === -1 ? "up" : "down"}.`);
    };
    const moveItems = [
      {
        id: "move-up",
        label: "Move up",
        icon: <ArrowUp size={12} weight="regular" aria-hidden="true" />,
        disabled: isTemporary || moveIndex <= 0,
        onSelect: () => reorderNode(-1),
      },
      {
        id: "move-down",
        label: "Move down",
        icon: <ArrowDown size={12} weight="regular" aria-hidden="true" />,
        disabled: isTemporary || moveIndex === -1 || moveIndex >= moveSiblings.length - 1,
        onSelect: () => reorderNode(1),
      },
    ];

    return [
      ...(addItems.length > 0 ? [{ id: "template-node-add", items: addItems }] : []),
      { id: "template-node-move", items: moveItems },
      {
        id: "template-node-edit",
        items: [
          {
            id: "rename-node",
            label: "Rename",
            icon: <PencilSimple size={12} weight="regular" aria-hidden="true" />,
            disabled: isTemporary,
            onSelect: () => handlers.onRenameNode(node),
          },
        ],
      },
      {
        id: "template-node-danger",
        items: [
          {
            id: "delete-node",
            label: "Delete",
            icon: <Trash size={12} weight="regular" aria-hidden="true" />,
            tone: "destructive" as const,
            disabled: isTemporary,
            onSelect: () => handlers.onDeleteNode(node),
          },
        ],
      },
    ];
  }, [contextMenuNodeId, handlers, template.nodes]);

  return (
    <>
    <span className="sr-only" role="status" aria-live="polite">{moveAnnouncement}</span>
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className="block w-full"
          onContextMenu={(event) => {
            if (!(event.target instanceof Element) || !event.target.closest("[data-tree-row]")) {
              event.preventDefault();
            }
          }}
        >
          <Tree
            nodes={nodes}
            ariaLabel="Template structure"
            className="relative min-h-7 overflow-visible"
            expandedIds={expandedIds}
            onToggle={(nodeId) => onToggle(nodeId)}
            currentId={selectedNodeId}
            onRowClick={(nodeId) => onSelectNode(nodeId)}
            onContextMenu={(nodeId) => setContextMenuNodeId(nodeId)}
            draggable
            canDrag={(node) => node.id !== TEMPLATE_EDITOR_ROOT_NODE_ID}
            canDrop={canDropNode}
            onDrop={handleDropNode}
            renderRow={(treeNode) => (
              <span className="flex min-w-0 flex-1 items-center gap-1.5">
                <span className="min-w-0 flex-1 truncate">{treeNode.label}</span>
                <span className="shrink-0 text-[9px] tabular-nums text-tertiary">
                  {pesoFormatter.format(totalsByNodeId.get(treeNode.id) ?? 0)}
                </span>
              </span>
            )}
          />
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent data-template-structure-context-menu="true" alignOffset={4}>
        <ContextActionMenuContent groups={contextMenuGroups} />
      </ContextMenuContent>
    </ContextMenu>
    </>
  );
}
