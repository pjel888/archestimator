"use client";

import { useRouter } from "next/navigation";
import { startTransition, useCallback, useEffect, useMemo, useRef, useState, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from "react";
import {
  ControlledTreeEnvironment,
  InteractionMode,
  Tree,
  type TreeItem,
  type TreeItemIndex,
  type TreeViewState,
} from "react-complex-tree";
import { useQueryClient } from "@tanstack/react-query";
import { CaretDown, Cube, FolderSimple } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { ControlInput } from "@/components/ui/control-input";
import { ControlSelect } from "@/components/ui/control-select";
import { HeaderIconToolbar } from "@/components/ui/header-icon-toolbar";
import { Modal } from "@/components/ui/modal";
import { SearchInput } from "@/components/ui/search-input";
import { canNestEstimateNodeKind, getEstimateNodeDisplayKind, isEstimateGroupNodeKind, type EstimateTreeNodeKind } from "@/lib/estimates/tree-hierarchy";
import { createEstimateNode, reorderEstimateTreeNodes } from "@/lib/estimates/actions";
import { estimateQueryKeys } from "@/hooks/use-estimate-query";
import { useEstimateWorkspaceSelection } from "@/hooks/use-estimate-workspace-state";
import { cn } from "@/lib/ui/cn";
import {
  ESTIMATE_TREE_ROOT_ITEM_ID,
  evaluateEstimateTreeDrop,
  getEstimateTreeStructureSignature,
} from "@/lib/estimates/estimate-tree-reorder";
import { getExpandedNodeIds, type EstimateTreeNode } from "./estimate-tree-data";
import { ResizableSidePanel } from "./ResizableSidePanel";

type EstimateSheetTreeProps = {
  projectId: string;
  estimateId: string;
  projectName: string;
  selectedNodeId: string | null;
  nodes: EstimateTreeNode[];
};

const ESTIMATE_TREE_LEFT_EXTENSION_WIDTH = 104;
const ESTIMATE_TREE_ID = "estimate-sheet-tree";
const TREE_INDENT_STEP = 20;
const TREE_MAX_INDENT = 140;

type ParentOption = {
  id: string;
  label: string;
  kind: EstimateTreeNodeKind | null;
};

type EstimateTreeItemData = {
  node: EstimateTreeNode | null;
};

type EstimateTreeModel = {
  items: Record<TreeItemIndex, TreeItem<EstimateTreeItemData>>;
  folderIds: Set<string>;
};

type CreateEstimateNodeKind = "group" | "area";

type ReorderStatus =
  | { state: "idle" }
  | { state: "saving"; message: string }
  | { state: "saved"; message: string }
  | { state: "error"; message: string };

function toStoredCreateNodeKind(kind: CreateEstimateNodeKind): EstimateTreeNodeKind {
  return kind === "group" ? "group" : "area";
}

function NodeIcon({ kind }: { kind: EstimateTreeNode["kind"] }) {
  if (getEstimateNodeDisplayKind(kind) === "group") return <FolderSimple size={12} weight="bold" aria-hidden="true" />;
  return <Cube size={12} weight="bold" aria-hidden="true" />;
}

function getParentOptions(nodes: EstimateTreeNode[]) {
  const options: ParentOption[] = [{ id: "", label: "Estimate root", kind: null }];

  function visit(node: EstimateTreeNode, path: string[]) {
    const nextPath = [...path, node.name];
    if (isEstimateGroupNodeKind(node.kind)) options.push({ id: node.id, label: nextPath.join(" / "), kind: node.kind });
    node.children?.forEach((child) => visit(child, nextPath));
  }

  nodes.forEach((node) => visit(node, []));
  return options;
}

function getDefaultParentId(nodes: EstimateTreeNode[], selectedNodeId: string | null) {
  if (!selectedNodeId) return "";
  let parentId = "";

  function visit(node: EstimateTreeNode, parent: EstimateTreeNode | null): boolean {
    if (node.id === selectedNodeId) {
      parentId = getEstimateNodeDisplayKind(node.kind) === "area" ? parent?.id ?? "" : node.id;
      return true;
    }

    return Boolean(node.children?.some((child) => visit(child, node)));
  }

  nodes.some((node) => visit(node, null));
  return parentId;
}

function buildTreeModel(nodes: EstimateTreeNode[]): EstimateTreeModel {
  const items: Record<TreeItemIndex, TreeItem<EstimateTreeItemData>> = {
    [ESTIMATE_TREE_ROOT_ITEM_ID]: {
      index: ESTIMATE_TREE_ROOT_ITEM_ID,
      isFolder: true,
      canMove: false,
      children: nodes.map((node) => node.id),
      data: { node: null },
    },
  };
  const folderIds = new Set<string>();

  function visit(node: EstimateTreeNode) {
    const children = node.children?.map((child) => child.id) ?? [];
    const isFolder = isEstimateGroupNodeKind(node.kind);
    if (isFolder) folderIds.add(node.id);

    items[node.id] = {
      index: node.id,
      isFolder,
      children: isFolder ? children : undefined,
      data: { node },
    };

    node.children?.forEach((child) => visit(child));
  }

  nodes.forEach((node) => visit(node));
  return { items, folderIds };
}

function getDefaultNodeKind(parentOptions: ParentOption[], defaultParentId: string): CreateEstimateNodeKind {
  const defaultParentKind = parentOptions.find((option) => option.id === defaultParentId)?.kind ?? null;
  return canNestEstimateNodeKind("area", defaultParentKind) ? "area" : "group";
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1">
      <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-tertiary">{label}</span>
      {children}
    </label>
  );
}

function AddEstimateNodeForm({
  action,
  parentOptions,
  defaultParentId,
}: {
  action: (formData: FormData) => void | Promise<void>;
  parentOptions: ParentOption[];
  defaultParentId: string;
}) {
  const [nodeKind, setNodeKind] = useState<CreateEstimateNodeKind>(() => getDefaultNodeKind(parentOptions, defaultParentId));
  const [selectedParentId, setSelectedParentId] = useState(defaultParentId);
  const storedNodeKind = toStoredCreateNodeKind(nodeKind);
  const validParentOptions = parentOptions.filter((option) => canNestEstimateNodeKind(storedNodeKind, option.kind));
  const parentValue = validParentOptions.some((option) => option.id === selectedParentId) ? selectedParentId : validParentOptions[0]?.id ?? "";

  return (
    <form action={action} className="grid gap-3">
      <Field label="Node name">
        <ControlInput
          name="name"
          required
          autoFocus
          placeholder="Kitchen, Ground Floor, Site Works"
          className="h-8 border-hairline px-2"
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Node type">
          <ControlSelect
            name="kind"
            value={nodeKind}
            onChange={(event) => setNodeKind(event.target.value as CreateEstimateNodeKind)}
            aria-label="Node type"
            wrapperClassName="h-8 w-full"
            className="h-8 w-full rounded-sm border border-hairline bg-white px-2 pr-6 !text-[10px]"
          >
            <option value="area">Area Node</option>
            <option value="group">Group Node</option>
          </ControlSelect>
        </Field>
        <Field label="Parent context">
          <ControlSelect
            name="parentId"
            value={parentValue}
            onChange={(event) => setSelectedParentId(event.target.value)}
            aria-label="Parent context"
            wrapperClassName="h-8 w-full"
            className="h-8 w-full rounded-sm border border-hairline bg-white px-2 pr-6 !text-[10px]"
          >
            {validParentOptions.map((option) => (
              <option key={option.id || "root"} value={option.id}>
                {option.label}
              </option>
            ))}
          </ControlSelect>
        </Field>
      </div>
      <div className="flex justify-end gap-1.5 border-t border-hairline pt-3">
        <Button type="submit" variant="primary" size="sm">
          Add node
        </Button>
      </div>
    </form>
  );
}

export function EstimateSheetTree({ projectId, estimateId, projectName, selectedNodeId, nodes }: EstimateSheetTreeProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const pendingReordersRef = useRef(0);
  const lastAcceptedPropStructureRef = useRef(getEstimateTreeStructureSignature(nodes));
  const [localNodes, setLocalNodes] = useState<EstimateTreeNode[]>(nodes);
  const [reorderStatus, setReorderStatus] = useState<ReorderStatus>({ state: "idle" });
  const { selectedNodeId: activeSelectedNodeId, setSelectedNodeId } = useEstimateWorkspaceSelection(estimateId, selectedNodeId);
  const treeModel = useMemo(() => buildTreeModel(localNodes), [localNodes]);
  const defaultExpandedItems = useMemo<TreeItemIndex[]>(() => Array.from(getExpandedNodeIds(localNodes)), [localNodes]);
  const [expandedOverrides, setExpandedOverrides] = useState<{ expanded: TreeItemIndex[]; collapsed: TreeItemIndex[] }>({ expanded: [], collapsed: [] });
  const [focusedOverride, setFocusedOverride] = useState<{ routeNodeId: string | null; item: TreeItemIndex } | null>(null);
  const [showAddNode, setShowAddNode] = useState(false);
  const parentOptions = useMemo(() => getParentOptions(localNodes), [localNodes]);
  const defaultParentId = useMemo(() => getDefaultParentId(localNodes, activeSelectedNodeId), [activeSelectedNodeId, localNodes]);
  const createNodeAction = createEstimateNode.bind(null, projectId, estimateId);
  const allFolderItemIds = useMemo<TreeItemIndex[]>(() => Array.from(treeModel.folderIds).filter((itemId) => treeModel.items[itemId]), [treeModel.folderIds, treeModel.items]);

  useEffect(() => {
    if (pendingReordersRef.current > 0) return;
    setLocalNodes((currentNodes) => {
      const incomingStructure = getEstimateTreeStructureSignature(nodes);
      const currentStructure = getEstimateTreeStructureSignature(currentNodes);
      if (currentStructure === incomingStructure) {
        lastAcceptedPropStructureRef.current = incomingStructure;
        return currentNodes;
      }
      if (incomingStructure === lastAcceptedPropStructureRef.current) return currentNodes;
      lastAcceptedPropStructureRef.current = incomingStructure;
      return nodes;
    });
  }, [nodes]);

  const expandedItems = useMemo(() => {
    const next = new Set(defaultExpandedItems);
    expandedOverrides.collapsed.forEach((itemId) => next.delete(itemId));
    expandedOverrides.expanded.forEach((itemId) => {
      if (treeModel.items[itemId]) next.add(itemId);
    });
    return Array.from(next).filter((itemId) => treeModel.items[itemId]);
  }, [defaultExpandedItems, expandedOverrides.collapsed, expandedOverrides.expanded, treeModel.items]);

  const routeSelectedItems = useMemo<TreeItemIndex[]>(
    () => (activeSelectedNodeId && treeModel.items[activeSelectedNodeId] ? [activeSelectedNodeId] : []),
    [activeSelectedNodeId, treeModel.items],
  );
  const focusedItem = useMemo<TreeItemIndex | undefined>(() => {
    if (focusedOverride?.routeNodeId === activeSelectedNodeId && treeModel.items[focusedOverride.item]) return focusedOverride.item;
    return routeSelectedItems[0];
  }, [activeSelectedNodeId, focusedOverride, routeSelectedItems, treeModel.items]);
  const handleExpandAll = useCallback(() => {
    setExpandedOverrides({ expanded: allFolderItemIds, collapsed: [] });
  }, [allFolderItemIds]);
  const handleCollapseAll = useCallback(() => {
    setExpandedOverrides({ expanded: [], collapsed: allFolderItemIds });
  }, [allFolderItemIds]);

  const viewState = useMemo<TreeViewState>(() => ({
    [ESTIMATE_TREE_ID]: {
      expandedItems,
      selectedItems: routeSelectedItems,
      focusedItem,
    },
  }), [expandedItems, focusedItem, routeSelectedItems]);

  const canReorderNow = reorderStatus.state !== "saving";
  const handleCanDrag = useCallback((items: TreeItem<EstimateTreeItemData>[]) => (
    canReorderNow && items.length === 1 && Boolean(items[0]?.data.node)
  ), [canReorderNow]);

  const handleCanDropAt = useCallback((items: TreeItem<EstimateTreeItemData>[], target: Parameters<typeof evaluateEstimateTreeDrop>[0]["target"]) => {
    if (!handleCanDrag(items)) return false;
    return evaluateEstimateTreeDrop({
      nodes: localNodes,
      draggedItemIds: items.map((item) => item.index),
      target,
    }).ok;
  }, [handleCanDrag, localNodes]);

  const handleDrop = useCallback((items: TreeItem<EstimateTreeItemData>[], target: Parameters<typeof evaluateEstimateTreeDrop>[0]["target"]) => {
    if (!handleCanDrag(items)) return;

    const result = evaluateEstimateTreeDrop({
      nodes: localNodes,
      draggedItemIds: items.map((item) => item.index),
      target,
    });
    if (!result.ok) return;

    const previousNodes = localNodes;
    const nextNodes = result.plan.nextNodes;
    pendingReordersRef.current += 1;
    setLocalNodes(nextNodes);
    queryClient.setQueryData(estimateQueryKeys.areaTree(estimateId), nextNodes);
    setReorderStatus({ state: "saving", message: "Saving tree order" });

    void (async () => {
      try {
        const confirmed = await reorderEstimateTreeNodes(projectId, estimateId, { updates: result.plan.updates });
        pendingReordersRef.current = Math.max(0, pendingReordersRef.current - 1);
        setLocalNodes(confirmed.tree);
        queryClient.setQueryData(estimateQueryKeys.areaTree(estimateId), confirmed.tree);
        setReorderStatus({ state: "saved", message: "Tree order saved" });
      } catch (error) {
        pendingReordersRef.current = Math.max(0, pendingReordersRef.current - 1);
        setLocalNodes(previousNodes);
        queryClient.setQueryData(estimateQueryKeys.areaTree(estimateId), previousNodes);
        setReorderStatus({ state: "error", message: error instanceof Error ? error.message : "Could not save tree order." });
      }
    })();
  }, [estimateId, handleCanDrag, localNodes, projectId, queryClient]);

  return (
    <ResizableSidePanel
      side="left"
      ariaLabel="Tree"
      storageKey="estimate_sheet_tree_width"
      defaultWidth={272}
      minWidth={216}
      maxWidth={432}
      widthOffset={ESTIMATE_TREE_LEFT_EXTENSION_WIDTH}
    >
      <div className="flex h-full flex-col overflow-hidden border-r border-hairline bg-white">
        <div className="sticky top-0 z-20 shrink-0 bg-white">
          <div className="flex h-[38px] items-center">
            <SearchInput
              wrapperClassName="w-full"
              placeholder="Search Tree"
              aria-label="Search Tree"
            />
          </div>
          <HeaderIconToolbar
            ariaLabel="Tree tools"
            labelPrefix="tree"
            onExpandAll={handleExpandAll}
            onCollapseAll={handleCollapseAll}
            onAdd={() => setShowAddNode(true)}
          />
          {reorderStatus.state !== "idle" ? (
            <div
              role="status"
              aria-live="polite"
              className={cn(
                "border-t border-hairline px-2 py-1 text-[10px] leading-4",
                reorderStatus.state === "error" ? "text-red-700" : "text-tertiary",
              )}
            >
              {reorderStatus.message}
            </div>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-2">
          {nodes.length === 0 ? (
            <div className="rounded-md border border-dashed border-hairline bg-surface-muted p-2 text-[10px] leading-4 text-tertiary">
              This estimate has no tree nodes yet. Add a Group Node or Area Node to begin rebuilding the estimate structure.
            </div>
          ) : (
            <ControlledTreeEnvironment<EstimateTreeItemData>
              items={treeModel.items}
              getItemTitle={(item) => item.data.node?.name ?? projectName}
              viewState={viewState}
              defaultInteractionMode={InteractionMode.ClickArrowToExpand}
              canInvokePrimaryActionOnItemContainer
              canSearch={false}
              canDragAndDrop
              canReorderItems
              canDropOnFolder
              canDropOnNonFolder={false}
              canDropBelowOpenFolders
              canDrag={handleCanDrag}
              canDropAt={handleCanDropAt}
              onDrop={handleDrop}
              renderDepthOffset={TREE_INDENT_STEP}
              onPrimaryAction={(item) => {
                const node = item.data.node;
                if (!node) return;
                setSelectedNodeId(node.id);
                setFocusedOverride({ routeNodeId: node.id, item: node.id });
                startTransition(() => {
                  router.push(`/workshop/projects/${projectId}/estimates/${node.id}`);
                });
              }}
              onExpandItem={(item) => {
                setExpandedOverrides((current) => ({
                  expanded: current.expanded.includes(item.index) ? current.expanded : [...current.expanded, item.index],
                  collapsed: current.collapsed.filter((itemId) => itemId !== item.index),
                }));
              }}
              onCollapseItem={(item) => {
                setExpandedOverrides((current) => ({
                  expanded: current.expanded.filter((itemId) => itemId !== item.index),
                  collapsed: current.collapsed.includes(item.index) ? current.collapsed : [...current.collapsed, item.index],
                }));
              }}
              onFocusItem={(item) => setFocusedOverride({ routeNodeId: activeSelectedNodeId, item: item.index })}
              renderTreeContainer={({ children, containerProps }) => {
                const { className, ...treeContainerProps } = containerProps as HTMLAttributes<HTMLDivElement>;
                return (
                  <nav aria-label={`${projectName} estimate areas`}>
                    <div {...treeContainerProps} className={cn("relative min-h-7 outline-none", className)}>
                      {children}
                    </div>
                  </nav>
                );
              }}
              renderItemsContainer={({ children, containerProps }) => {
                const { className, ...itemsContainerProps } = containerProps as HTMLAttributes<HTMLOListElement>;
                return (
                  <ol {...itemsContainerProps} className={cn("space-y-0", className)}>
                    {children}
                  </ol>
                );
              }}
              renderItemTitle={({ title, item }) => {
                const node = item.data.node;
                if (!node) return null;
                return (
                  <>
                    <span className="mr-1 flex size-4 shrink-0 items-center justify-center text-tertiary" aria-hidden="true">
                      <NodeIcon kind={node.kind} />
                    </span>
                    <span className="min-w-0 truncate text-left">{title}</span>
                  </>
                );
              }}
              renderItemArrow={({ item, context }) => {
                const node = item.data.node;
                const { className, ...arrowProps } = context.arrowProps as HTMLAttributes<HTMLSpanElement>;
                if (!item.isFolder || !node) return <span className="size-5" aria-hidden="true" />;
                return (
                  <span
                    {...arrowProps}
                    className={cn("flex size-5 cursor-pointer items-center justify-center rounded-sm text-tertiary transition hover:bg-surface-muted", className)}
                  >
                    <CaretDown size={12} aria-hidden="true" className={context.isExpanded ? "" : "-rotate-90"} />
                  </span>
                );
              }}
              renderItem={({ item, depth, children, title, arrow, context }) => {
                const node = item.data.node;
                if (!node) return null;

                const { className: liClassName, ...liProps } = context.itemContainerWithChildrenProps as HTMLAttributes<HTMLLIElement>;
                const { className: rowClassName, ...rowProps } = context.itemContainerWithoutChildrenProps as HTMLAttributes<HTMLDivElement>;
                const {
                  className: buttonClassName,
                  ...interactiveProps
                } = context.interactiveElementProps as ButtonHTMLAttributes<HTMLButtonElement>;
                const isRouteSelected = activeSelectedNodeId === node.id;

                return (
                  <li {...liProps} className={cn("list-none", liClassName)}>
                    <div
                      {...rowProps}
                      className={cn(
                        "relative grid h-8 grid-cols-[minmax(0,1fr)_20px] items-center gap-1 py-0.5",
                        rowClassName,
                      )}
                    >
                      <button
                        {...interactiveProps}
                        type="button"
                        aria-current={isRouteSelected ? "page" : undefined}
                        data-estimate-tree-active-node={isRouteSelected ? "true" : undefined}
                        data-estimate-tree-node-id={node.id}
                        className={cn(
                          "relative inline-flex h-7 min-w-0 items-center justify-start gap-0 overflow-hidden rounded-md p-1 !text-[10px] !font-normal leading-none text-ink transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c8d2df] focus-visible:ring-offset-2",
                          isRouteSelected ? "bg-surface-muted ring-1 ring-[#d7dee8]" : "hover:bg-surface-muted",
                          buttonClassName,
                        )}
                      >
                        <span
                          data-estimate-tree-title-offset
                          className="flex h-full min-w-0 flex-1 items-center"
                          style={{ paddingLeft: `${Math.min(depth * TREE_INDENT_STEP, TREE_MAX_INDENT)}px` }}
                        >
                          {title}
                        </span>
                      </button>

                      {arrow}
                    </div>
                    {children}
                  </li>
                );
              }}
            >
              <Tree treeId={ESTIMATE_TREE_ID} rootItem={ESTIMATE_TREE_ROOT_ITEM_ID} treeLabel={`${projectName} estimate areas`} />
            </ControlledTreeEnvironment>
          )}
        </div>
      </div>
      <Modal
        open={showAddNode}
        title="Add estimate tree node"
        description="Add a Group Node or Area Node inside a valid parent context."
        onOpenChange={setShowAddNode}
      >
        <AddEstimateNodeForm key={`${defaultParentId}-${parentOptions.length}`} action={createNodeAction} parentOptions={parentOptions} defaultParentId={defaultParentId} />
      </Modal>
    </ResizableSidePanel>
  );
}
