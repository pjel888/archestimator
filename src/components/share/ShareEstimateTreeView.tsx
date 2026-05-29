"use client";

import React, { useState, useEffect } from "react";
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
 * P5 FINAL POLISH (per 03-ux-ui-spec §7.2 + §9):
 * - Mobile adaptations: start collapsed, 12px indent (vs 20px), simplified row items (desc + total only).
 * - A11y: role="treeitem" + aria-expanded + tabIndex + Enter/Space keyboard toggle on headers (fulfills spec keyboard + roles).
 * - Touch: touch-manipulation + responsive padding for better mobile targets (compact visual preserved).
 * - Graph impact pre-edit (get_impact_radius + detect_changes + minimal_context): 0 affected flows, low runtime risk, isolated to receiver surface.
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
  isMobile?: boolean;
};

function TreeNodeRenderer({
  node,
  depth,
  expanded,
  hasChildren,
  children,
  currencyCode,
  onToggle,
  isMobile = false,
}: TreeNodeRendererProps) {
  const isGroup = node.kind === "group";
  const Icon = isGroup ? FolderSimple : Cube;

  // P5 mobile: per spec §7.2 use 12px step / 80px cap; desktop uses shared 20px/140px constants.
  const indentStep = isMobile ? 12 : WORKSHOP_TREE_INDENT_STEP;
  const maxIndent = isMobile ? 80 : WORKSHOP_TREE_MAX_INDENT;

  // Row items under this node (only areas carry direct rows per reconstruction contract)
  const rowItems = node.kind === "area" && node.rows && node.rows.length > 0 ? (
    <div
      className="border-l border-hairline/60"
      style={{
        paddingLeft: `${Math.min((depth + 1) * indentStep, maxIndent) + 4}px`,
      }}
    >
      {node.rows.map((row) => {
        // P5 mobile simplification (spec §7.2): Description + Total only (thumb retained for recognition).
        // Desktop: full desc/qty/unit/total + thumb.
        if (isMobile) {
          return (
            <div
              key={row.id}
              className="group flex min-h-[28px] items-center gap-2 border-b border-hairline/40 py-1 pr-2 text-[10px] text-secondary last:border-b-0 hover:bg-surfaceMuted/40 touch-manipulation sm:min-h-[22px] sm:py-0.5"
            >
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
              <span className="min-w-0 flex-1 truncate" title={row.description}>
                {row.description}
              </span>
              <span className="flex-shrink-0 tabular-nums text-right font-medium text-ink text-[10px]">
                {formatMoney(row.rowTotal, currencyCode)}
              </span>
            </div>
          );
        }
        return (
          <div
            key={row.id}
            className="group flex min-h-[22px] items-center gap-1.5 border-b border-hairline/40 py-0.5 pr-2 text-[10px] text-secondary last:border-b-0 hover:bg-surfaceMuted/40 touch-manipulation"
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
        );
      })}
    </div>
  ) : null;

  return (
    <>
      {/* Node header — reuse WorkshopTreeRow for canonical hover/focus/indent/rounded-xs/min-h-7 per workshop patterns + DESIGN tokens */}
      {/* P5 a11y (spec §9): role=treeitem + aria-expanded + tabIndex + Enter/Space keyboard toggle for full keyboard operability + screen reader tree structure. */}
      <WorkshopTreeRow
        as="div"
        id={node.id}
        depth={depth}
        role="treeitem"
        aria-expanded={hasChildren ? expanded : undefined}
        tabIndex={hasChildren ? 0 : -1}
        className="border-l border-hairline/70 cursor-pointer"
        data-share-tree-node={node.kind}
        data-share-tree-expanded={expanded ? "true" : "false"}
        onClick={hasChildren && onToggle ? () => onToggle(node.id) : undefined}
        onKeyDown={(e) => {
          if (hasChildren && onToggle && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            onToggle(node.id);
          }
        }}
        // P5 mobile indent override (12px step) — style after depth so it wins over workshopTreeIndentStyle(20px*depth)
        style={isMobile ? { paddingLeft: `${Math.min(depth * 12, 80)}px` } : undefined}
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
  // P5 mobile detection (per spec §7.2 breakpoints <768px): drives collapsed default, reduced indent, simplified rows.
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  const [expandedNodeIds, setExpandedNodeIds] = useState<string[]>([]);

  // P5: Default expansion respects mobile (collapsed to save space) vs desktop (first 2 levels).
  // Re-runs when sheet nodes or viewport changes.
  useEffect(() => {
    if (nodes.length === 0) return;
    const ids: string[] = [];
    const collect = (nodeList: ShareTreeNode[], level: number) => {
      nodeList.forEach((n) => {
        if (!isMobile && level < 2) ids.push(n.id);
        collect(n.children, level + 1);
      });
    };
    collect(nodes, 0);
    setExpandedNodeIds(ids);
  }, [nodes, isMobile]);

  const getNodeId = (n: ShareTreeNode) => n.id;
  const getChildren = (n: ShareTreeNode) => n.children;

  // Toggle handler (P3/P5): wire expand/collapse since WorkshopTree delegates interaction to renderNode consumer.
  // This makes the caret functional and removes dead-code warning on the state setter.
  const toggleNode = (id: string) => {
    setExpandedNodeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Close over currencyCode + toggle + isMobile so the read-only renderer (and its row items) are currency-aware + interactive + mobile-aware.
  // This keeps the WorkshopTree<TNode> contract unchanged (renderNode receives only the standard args + our thin extras).
  const renderNode = (args: WorkshopTreeRenderNodeArgs<ShareTreeNode>) => (
    <TreeNodeRenderer {...args} currencyCode={currencyCode} onToggle={toggleNode} isMobile={isMobile} />
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
