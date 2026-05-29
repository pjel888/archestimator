"use client";

import React, { useState } from "react";
import Image from "next/image";
import { FolderSimple, Cube, CaretDown } from "@phosphor-icons/react";

import {
  WorkshopTree,
  WorkshopTreeRow,
  type WorkshopTreeRenderNodeArgs,
} from "@/components/workshop/workshop-tree";
import {
  WORKSHOP_TREE_INDENT_STEP,
  WORKSHOP_TREE_MAX_INDENT,
} from "@/components/workshop/tree-visual-style";
import type { ShareTreeNode } from "@/lib/share/reconstruct-share-tree";

/**
 * P3 + P5 polish: Read-only Tree View for the /share/[token] receiver.
 *
 * Reuses WorkshopTree<TNode> + renderNode contract (A9b) for recursion/ARIA/expand.
 * Node headers use WorkshopTreeRow (as="div") for consistent workshop hover/focus,
 * rounded-xs, min-h-7, indent via shared workshopTreeIndentStyle.
 * Under "area" nodes (leaves), renders the actual PublicationSnapshotRow[] items
 * (description, qty, unit, rowTotal, optional thumbnail) with +1 level indent.
 *
 * Design: SF Pro ≤12px (body 10px), regular icons, hairline, xs radius, proposalPaper
 * where appropriate for receiver. Minimal compact row items per spec. Currency-aware.
 *
 * All data from reconstructTreeFromRows (validated). Read-only, no mutations.
 */

interface ShareEstimateTreeViewProps {
  nodes: ShareTreeNode[];
  currencyCode: string;
  disclaimer?: string;
}

function formatMoney(value: number, currencyCode: string) {
  return `${currencyCode} ${new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}`;
}

type TreeNodeRendererProps = WorkshopTreeRenderNodeArgs<ShareTreeNode> & {
  currencyCode: string;
  onToggle?: (id: string) => void;
};

function TreeNodeRenderer({
  node,
  depth,
  expanded,
  hasChildren,
  children,
  currencyCode,
  onToggle,
}: TreeNodeRendererProps) {
  const isGroup = node.kind === "group";
  const Icon = isGroup ? FolderSimple : Cube;

  // Row items under this node (only areas carry direct rows per reconstruction contract)
  const rowItems = node.kind === "area" && node.rows && node.rows.length > 0 ? (
    <div
      className="border-l border-hairline/60"
      style={{
        paddingLeft: `${Math.min((depth + 1) * WORKSHOP_TREE_INDENT_STEP, WORKSHOP_TREE_MAX_INDENT) + 4}px`,
      }}
    >
      {node.rows.map((row) => (
        <div
          key={row.id}
          className="group flex min-h-[22px] items-center gap-1.5 border-b border-hairline/40 py-0.5 pr-2 text-[10px] text-secondary last:border-b-0 hover:bg-surfaceMuted/40"
        >
          {/* Optional thumbnail (P9 snapshot imageUrl) — compact 20px for tree density */}
          {row.imageUrl ? (
            <div className="h-5 w-5 flex-shrink-0 overflow-hidden rounded-xs border border-hairline bg-surfaceMuted">
              <Image
                src={row.imageUrl}
                alt=""
                width={20}
                height={20}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
          ) : (
            <div className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
          )}

          {/* Description (primary, truncate) */}
          <span className="min-w-0 flex-1 truncate" title={row.description}>
            {row.description}
          </span>

          {/* Qty */}
          <span className="w-10 flex-shrink-0 text-right tabular-nums text-[9px] text-tertiary">
            {row.quantity}
          </span>

          {/* Unit */}
          <span className="w-9 flex-shrink-0 text-left text-[9px] text-tertiary">
            {row.unit}
          </span>

          {/* rowTotal */}
          <span className="w-[92px] flex-shrink-0 text-right font-medium tabular-nums text-ink text-[10px]">
            {formatMoney(row.rowTotal, currencyCode)}
          </span>
        </div>
      ))}
    </div>
  ) : null;

  return (
    <>
      {/* Node header — reuse WorkshopTreeRow for canonical hover/focus/indent/rounded-xs/min-h-7 per workshop patterns + DESIGN tokens */}
      <WorkshopTreeRow
        as="div"
        id={node.id}
        depth={depth}
        className="border-l border-hairline/70 cursor-pointer"
        data-share-tree-node={node.kind}
        data-share-tree-expanded={expanded ? "true" : "false"}
        onClick={hasChildren && onToggle ? () => onToggle(node.id) : undefined}
        aria-expanded={hasChildren ? expanded : undefined}
      >
        <div className="flex w-full items-center gap-1.5">
          {hasChildren ? (
            <CaretDown
              size={11}
              weight="regular"
              className={`flex-shrink-0 text-tertiary transition-transform ${expanded ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          ) : (
            <span className="w-[11px] flex-shrink-0" aria-hidden="true" />
          )}

          <Icon size={12} weight="regular" className="flex-shrink-0 text-secondary" aria-hidden="true" />

          <span
            className={`min-w-0 flex-1 truncate font-medium ${isGroup ? "text-ink" : "text-secondary"}`}
            title={node.label}
          >
            {node.label}
          </span>

          <span className="flex-shrink-0 tabular-nums text-right font-medium text-ink">
            {formatMoney(node.total, currencyCode)}
          </span>

          {node.rowCount > 0 && (
            <span className="ml-1 flex-shrink-0 text-[9px] text-tertiary tabular-nums">
              ({node.rowCount})
            </span>
          )}
        </div>
      </WorkshopTreeRow>

      {/* Inline row items (only under area nodes) — +1 level indent, compact read-only presentation */}
      {rowItems}

      {/* Subtree children (other groups/areas) from WorkshopTree engine */}
      {children}
    </>
  );
}

export function ShareEstimateTreeView({ nodes, currencyCode, disclaimer }: ShareEstimateTreeViewProps) {
  const [expandedNodeIds, setExpandedNodeIds] = useState<string[]>(() => {
    // Default: expand first two levels
    const ids: string[] = [];
    const collect = (nodeList: ShareTreeNode[], level: number) => {
      nodeList.forEach((n) => {
        if (level < 2) ids.push(n.id);
        collect(n.children, level + 1);
      });
    };
    collect(nodes, 0);
    return ids;
  });

  const getNodeId = (n: ShareTreeNode) => n.id;
  const getChildren = (n: ShareTreeNode) => n.children;

  // Toggle handler (P3/P5): wire expand/collapse since WorkshopTree delegates interaction to renderNode consumer.
  // This makes the caret functional and removes dead-code warning on the state setter.
  const toggleNode = (id: string) => {
    setExpandedNodeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Close over currencyCode + toggle so the read-only renderer (and its row items) are currency-aware + interactive.
  // This keeps the WorkshopTree<TNode> contract unchanged (renderNode receives only the standard args + our thin extras).
  const renderNode = (args: WorkshopTreeRenderNodeArgs<ShareTreeNode>) => (
    <TreeNodeRenderer {...args} currencyCode={currencyCode} onToggle={toggleNode} />
  );

  if (nodes.length === 0) {
    return (
      <div className="p-4 text-[10px] text-tertiary border border-hairline bg-[#FFFDF8]">
        No estimate items.
      </div>
    );
  }

  return (
    <div className="border border-hairline bg-[#FFFDF8]">
      {disclaimer && (
        <div className="border-b border-hairline bg-surfaceMuted px-3 py-1 text-[9px] text-tertiary">
          {disclaimer}
        </div>
      )}

      <WorkshopTree<ShareTreeNode>
        nodes={nodes}
        selectedNodeId={null}
        expandedNodeIds={expandedNodeIds}
        getNodeId={getNodeId}
        getChildren={getChildren}
        renderNode={renderNode}
      />
    </div>
  );
}
