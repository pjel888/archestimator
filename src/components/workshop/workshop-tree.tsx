"use client";

import type { ButtonHTMLAttributes, ComponentProps, HTMLAttributes, ReactNode } from "react";

import { ContextActionMenuContent, type ActionMenuGroup } from "@/components/ui/action-menu";
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from "@/components/ui/context-menu";
import { cn } from "@/lib/ui/cn";
import {
  WORKSHOP_TREE_ROW_GAP_CLASS,
  WORKSHOP_TREE_ROW_MIN_HEIGHT_CLASS,
  WORKSHOP_TREE_TEXT_CLASS,
  workshopTreeIndentStyle,
} from "./tree-visual-style";

type WorkshopTreeContextMenuProps = {
  groups?: ActionMenuGroup[];
  contentProps?: Omit<ComponentProps<typeof ContextMenuContent>, "children">;
  children: ReactNode;
};

export function WorkshopTreeContextMenu({ groups, contentProps, children }: WorkshopTreeContextMenuProps) {
  const visibleGroups = groups ?? [];
  const hasItems = visibleGroups.some((group) => group.items.length);

  if (!hasItems) return children;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent data-workshop-tree-context-menu="true" alignOffset={4} {...contentProps}>
        <ContextActionMenuContent groups={visibleGroups} />
      </ContextMenuContent>
    </ContextMenu>
  );
}

type WorkshopTreeRowCommonProps = {
  depth?: number;
  selected?: boolean;
  editing?: boolean;
  intent?: boolean;
  className?: string;
  contextMenuGroups?: ActionMenuGroup[];
  contextMenuContentProps?: Omit<ComponentProps<typeof ContextMenuContent>, "children">;
  children: ReactNode;
};

type WorkshopTreeButtonRowProps = WorkshopTreeRowCommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof WorkshopTreeRowCommonProps | "children"> & {
    as?: "button";
  };

type WorkshopTreeDivRowProps = WorkshopTreeRowCommonProps &
  Omit<HTMLAttributes<HTMLDivElement>, keyof WorkshopTreeRowCommonProps | "children"> & {
    as: "div";
  };

type WorkshopTreeRowProps = WorkshopTreeButtonRowProps | WorkshopTreeDivRowProps;

export function WorkshopTreeRow({
  as = "button",
  depth,
  selected,
  editing,
  intent,
  className,
  contextMenuGroups,
  contextMenuContentProps,
  children,
  style,
  ...props
}: WorkshopTreeRowProps) {
  const rowClassName = cn(
    "group flex w-full min-w-0 items-center rounded-xs border px-1.5 py-0 text-left text-ink outline-none transition focus-visible:ring-2 focus-visible:ring-focus",
    WORKSHOP_TREE_ROW_MIN_HEIGHT_CLASS,
    WORKSHOP_TREE_TEXT_CLASS,
    selected ? "border-accent bg-accent-soft" : "border-transparent bg-white hover:bg-surfaceMuted",
    editing ? "overflow-visible border-accent bg-accentSoft ring-1 ring-accent shadow-[inset_0_0_0_1px_rgba(255,122,26,0.18)] hover:bg-accentSoft" : "overflow-hidden",
    intent ? "border-[#8bbce8] bg-[#eef7ff] ring-1 ring-[#8bbce8] shadow-[inset_0_0_0_1px_rgba(44,120,180,0.18)]" : "",
    className,
  );
  const rowStyle = depth === undefined ? style : { ...workshopTreeIndentStyle(depth), ...style };
  const row =
    as === "div" ? (
      <div data-workshop-tree-row="true" className={rowClassName} style={rowStyle} {...(props as HTMLAttributes<HTMLDivElement>)}>
        {children}
      </div>
    ) : (
      <button
        type="button"
        data-workshop-tree-row="true"
        className={rowClassName}
        style={rowStyle}
        {...(props as ButtonHTMLAttributes<HTMLButtonElement>)}
      >
        {children}
      </button>
    );

  return (
    <WorkshopTreeContextMenu groups={contextMenuGroups} contentProps={contextMenuContentProps}>
      {row}
    </WorkshopTreeContextMenu>
  );
}

export type WorkshopTreeRenderNodeArgs<TNode> = {
  node: TNode;
  depth: number;
  selected: boolean;
  expanded: boolean;
  hasChildren: boolean;
  children: ReactNode;
};

export type WorkshopTreeProps<TNode> = {
  nodes: TNode[];
  selectedNodeId: string | null;
  expandedNodeIds: string[];
  getNodeId: (node: TNode) => string;
  getChildren: (node: TNode) => TNode[] | undefined;
  renderNode: (args: WorkshopTreeRenderNodeArgs<TNode>) => ReactNode;
};

export function WorkshopTree<TNode>({
  nodes,
  selectedNodeId,
  expandedNodeIds,
  getNodeId,
  getChildren,
  renderNode,
}: WorkshopTreeProps<TNode>) {
  return (
    <ul role="tree" className={WORKSHOP_TREE_ROW_GAP_CLASS}>
      {nodes.map((node) => (
        <WorkshopTreeNode
          key={getNodeId(node)}
          node={node}
          depth={0}
          selectedNodeId={selectedNodeId}
          expandedNodeIds={expandedNodeIds}
          getNodeId={getNodeId}
          getChildren={getChildren}
          renderNode={renderNode}
        />
      ))}
    </ul>
  );
}

type WorkshopTreeNodeProps<TNode> = Omit<WorkshopTreeProps<TNode>, "nodes"> & {
  node: TNode;
  depth: number;
};

function WorkshopTreeNode<TNode>({
  node,
  depth,
  selectedNodeId,
  expandedNodeIds,
  getNodeId,
  getChildren,
  renderNode,
}: WorkshopTreeNodeProps<TNode>) {
  const nodeId = getNodeId(node);
  const children = getChildren(node) ?? [];
  const expanded = expandedNodeIds.includes(nodeId);
  const nested =
    children.length > 0 && expanded ? (
      <ul role="group" className={WORKSHOP_TREE_ROW_GAP_CLASS}>
        {children.map((child) => (
          <WorkshopTreeNode
            key={getNodeId(child)}
            node={child}
            depth={depth + 1}
            selectedNodeId={selectedNodeId}
            expandedNodeIds={expandedNodeIds}
            getNodeId={getNodeId}
            getChildren={getChildren}
            renderNode={renderNode}
          />
        ))}
      </ul>
    ) : null;

  return renderNode({
    node,
    depth,
    selected: selectedNodeId === nodeId,
    expanded,
    hasChildren: children.length > 0,
    children: nested,
  });
}

export type WorkshopTreeTabItem<TTab extends string = string> = {
  id: TTab;
  label: string;
};

export function WorkshopTreeTabs<TTab extends string>({
  tabs,
  activeTab,
  ariaLabel,
  onTabChange,
}: {
  tabs: readonly WorkshopTreeTabItem<TTab>[];
  activeTab: TTab;
  ariaLabel: string;
  onTabChange?: (tab: TTab) => void;
}) {
  return (
    <div className="flex h-[32px] items-end gap-0 border-b border-hairline bg-surfaceMuted" role="tablist" aria-label={ariaLabel}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.id}
          className={cn(
            "relative h-full rounded-xs border border-b-0 px-3 text-[10px] font-medium leading-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
            activeTab === tab.id
              ? "z-10 bg-white text-ink border-hairline -mb-px"
              : "bg-surfaceMuted text-tertiary border-transparent hover:text-ink hover:border-hairline",
          )}
          onClick={() => onTabChange?.(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
