"use client";

import React, { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { FolderSimple, Cube, CaretDown } from "@phosphor-icons/react";

import { SearchInput } from "@/components/ui/search-input";
import { HeaderIconToolbar } from "@/components/ui/header-icon-toolbar";
import {
  WorkshopTree,
  WorkshopTreeRow,
  WorkshopTreeTabs,
  type WorkshopTreeRenderNodeArgs,
} from "@/components/workshop/workshop-tree";
import {
  WORKSHOP_TREE_INDENT_STEP,
  WORKSHOP_TREE_MAX_INDENT,
} from "@/components/workshop/tree-visual-style";
import { normalizePublicationImageUrl } from "@/lib/publication/image-url";
import type { ShareTreeNode } from "@/lib/share/reconstruct-share-tree";

/**
 * Read-only tree panel for the /share/[token] receiver.
 *
 * Mirrors the visual shell of the workshop EstimateSheetTree sidebar:
 * - Search input header
 * - Icon toolbar header (expand/collapse only — no add actions)
 * - "Tabs" tab
 * - Tree content with WorkshopTree/WorkshopTreeRow primitives
 *
 * Supports search filtering and expand/collapse all.
 *
 * When `showInlineRows` is false (sidebar mode), renders only tree nodes without
 * inline row items — clicking a node calls `onNavigate` to scroll the right panel.
 * When `showInlineRows` is true (standalone mode), renders row items under area nodes.
 */

interface ShareEstimateTreePanelProps {
  nodes: ShareTreeNode[];
  currencyCode: string;
  disclaimer?: string;
  className?: string;
  /** When false, renders only tree node headers (no inline rows). Default: true */
  showInlineRows?: boolean;
  /** Called when a tree node header is clicked. Used for scroll-to-navigate in sidebar mode. */
  onNavigate?: (id: string) => void;
  /** Width of the sidebar panel. Default: "280px". Only used as a CSS hint. */
  panelWidth?: string;
}

function formatMoney(value: number, currencyCode: string) {
  return `${currencyCode} ${new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}`;
}

function collectAllNodeIds(nodeList: ShareTreeNode[]): string[] {
  const ids: string[] = [];
  const walk = (list: ShareTreeNode[]) => {
    list.forEach((n) => {
      ids.push(n.id);
      walk(n.children);
    });
  };
  walk(nodeList);
  return ids;
}

function filterTreeNodes(
  nodes: ShareTreeNode[],
  query: string
): ShareTreeNode[] {
  const lower = query.toLowerCase().trim();
  if (!lower) return nodes;

  function visit(node: ShareTreeNode): ShareTreeNode | null {
    const labelMatch = node.label.toLowerCase().includes(lower);
    const filteredChildren = node.children
      .map(visit)
      .filter(Boolean) as ShareTreeNode[];

    // Also check rows for description matches
    const rowMatches =
      node.kind === "area" && node.rows
        ? node.rows.filter((r) =>
            r.description.toLowerCase().includes(lower)
          )
        : [];

    if (labelMatch || filteredChildren.length > 0 || rowMatches.length > 0) {
      return {
        ...node,
        children: filteredChildren,
        rows: rowMatches.length > 0 ? rowMatches : node.rows,
      };
    }
    return null;
  }

  return nodes.map(visit).filter(Boolean) as ShareTreeNode[];
}

type TreeNodeRendererProps = WorkshopTreeRenderNodeArgs<ShareTreeNode> & {
  currencyCode: string;
  onToggle?: (id: string) => void;
  isMobile?: boolean;
  showInlineRows?: boolean;
  onNavigate?: (id: string) => void;
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
  showInlineRows = true,
  onNavigate,
}: TreeNodeRendererProps) {
  const isGroup = node.kind === "group";
  const Icon = isGroup ? FolderSimple : Cube;

  const indentStep = isMobile ? 12 : WORKSHOP_TREE_INDENT_STEP;
  const maxIndent = isMobile ? 80 : WORKSHOP_TREE_MAX_INDENT;

  const handleHeaderClick = () => {
    if (hasChildren && onToggle) {
      onToggle(node.id);
    }
    onNavigate?.(node.id);
  };

  const handleHeaderKeyDown = (e: React.KeyboardEvent) => {
    if (hasChildren && onToggle && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onToggle(node.id);
    }
    if (onNavigate && (e.key === "Enter" || e.key === " ")) {
      onNavigate(node.id);
    }
  };

  const rowItems =
    showInlineRows && node.kind === "area" && node.rows && node.rows.length > 0 ? (
      <div
        className="border-l border-hairline/60"
        style={{
          paddingLeft: `${Math.min((depth + 1) * indentStep, maxIndent) + 4}px`,
        }}
      >
        {node.rows.map((row) => {
          const imageUrl = normalizePublicationImageUrl(row.imageUrl);

          if (isMobile) {
            return (
              <div
                key={row.id}
                className="group flex min-h-[26px] items-center gap-2 border-b border-hairline/40 py-0.5 pr-2 text-[10px] text-secondary last:border-b-0 hover:bg-surfaceMuted/50 active:bg-surfaceMuted touch-manipulation"
              >
                {imageUrl ? (
                  <div className="h-4 w-4 flex-shrink-0 overflow-hidden rounded-xs border border-hairline bg-surfaceMuted">
                    <Image
                      src={imageUrl}
                      alt=""
                      width={16}
                      height={16}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                )}
                <span
                  className="min-w-0 flex-1 truncate"
                  title={row.description}
                >
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
              className="group flex min-h-[20px] items-center gap-1.5 border-b border-hairline/30 py-px pr-2 text-[10px] text-secondary last:border-b-0 hover:bg-surfaceMuted/60 active:bg-surfaceMuted touch-manipulation"
            >
              {imageUrl ? (
                <div className="h-4 w-4 flex-shrink-0 overflow-hidden rounded-xs border border-hairline bg-surfaceMuted">
                  <Image
                    src={imageUrl}
                    alt=""
                    width={16}
                    height={16}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              )}
              <span
                className="min-w-0 flex-1 truncate"
                title={row.description}
              >
                {row.description}
              </span>
              <span className="w-9 flex-shrink-0 text-right tabular-nums text-[9px] text-tertiary">
                {row.quantity}
              </span>
              <span className="w-8 flex-shrink-0 text-left text-[9px] text-tertiary">
                {row.unit}
              </span>
              <span className="w-[88px] flex-shrink-0 text-right font-medium tabular-nums text-ink text-[10px]">
                {formatMoney(row.rowTotal, currencyCode)}
              </span>
            </div>
          );
        })}
      </div>
    ) : null;

  return (
    <>
      <WorkshopTreeRow
        as="div"
        id={node.id}
        depth={depth}
        role="treeitem"
        aria-expanded={hasChildren ? expanded : undefined}
        tabIndex={hasChildren ? 0 : -1}
        className={`border-l border-hairline/70 cursor-pointer ${depth === 0 && hasChildren ? "bg-[#FFFDF8]" : ""}`}
        data-share-tree-node={node.kind}
        data-share-tree-expanded={expanded ? "true" : "false"}
        data-share-tree-depth={depth}
        onClick={handleHeaderClick}
        onKeyDown={handleHeaderKeyDown}
        style={
          isMobile
            ? { paddingLeft: `${Math.min(depth * 12, 80)}px` }
            : undefined
        }
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

          <Icon
            size={12}
            weight="regular"
            className="flex-shrink-0 text-secondary"
            aria-hidden="true"
          />

          <span
            className={`min-w-0 flex-1 truncate font-medium ${isGroup ? "text-ink" : "text-secondary"}`}
            title={node.label}
          >
            {node.label}
          </span>

          {showInlineRows ? (
            <>
              <span className="flex-shrink-0 tabular-nums text-right font-medium text-ink">
                {formatMoney(node.total, currencyCode)}
              </span>

              {node.rowCount > 0 && (
                <span className="ml-1 flex-shrink-0 text-[9px] text-tertiary tabular-nums">
                  ({node.rowCount})
                </span>
              )}
            </>
          ) : null}
        </div>
      </WorkshopTreeRow>

      {rowItems}
      {children}
    </>
  );
}

export function ShareEstimateTreePanel({
  nodes,
  currencyCode,
  disclaimer,
  className,
  showInlineRows = true,
  onNavigate,
  panelWidth,
}: ShareEstimateTreePanelProps) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  const [searchQuery, setSearchQuery] = useState("");
  const [manualExpandedNodeIds, setManualExpandedNodeIds] = useState<string[] | null>(null);

  const filteredNodes = useMemo(() => {
    return filterTreeNodes(nodes, searchQuery);
  }, [nodes, searchQuery]);

  const defaultExpandedNodeIds = useMemo(() => {
    if (searchQuery.trim()) return collectAllNodeIds(filteredNodes);
    if (nodes.length === 0) return [];
    const ids: string[] = [];
    const collect = (nodeList: ShareTreeNode[], level: number) => {
      nodeList.forEach((n) => {
        if (!isMobile && level < 2) ids.push(n.id);
        collect(n.children, level + 1);
      });
    };
    collect(nodes, 0);
    return ids;
  }, [filteredNodes, isMobile, nodes, searchQuery]);

  const expandedNodeIds = manualExpandedNodeIds ?? defaultExpandedNodeIds;

  const handleExpandAll = () => {
    setManualExpandedNodeIds(collectAllNodeIds(nodes));
  };

  const handleCollapseAll = () => {
    setManualExpandedNodeIds([]);
  };

  const toggleNode = (id: string) => {
    setManualExpandedNodeIds((prev) => {
      const current = prev ?? expandedNodeIds;
      return current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    });
  };

  const updateSearchQuery = (nextQuery: string) => {
    setSearchQuery(nextQuery);
    setManualExpandedNodeIds(null);
  };

  const clearSearchQuery = () => {
    setSearchQuery("");
    setManualExpandedNodeIds(null);
  };

  const renderNode = (args: WorkshopTreeRenderNodeArgs<ShareTreeNode>) => (
    <TreeNodeRenderer
      {...args}
      currencyCode={currencyCode}
      onToggle={toggleNode}
      isMobile={isMobile}
      showInlineRows={showInlineRows}
      onNavigate={onNavigate}
    />
  );

  return (
    <div
      className={"flex h-full flex-col overflow-hidden bg-white " + (className ?? "")}
      style={panelWidth ? { width: panelWidth } : undefined}
    >
      <div className="sticky top-0 z-20 shrink-0 bg-white">
        <div className="flex h-[38px] items-center">
          <SearchInput
            wrapperClassName="w-full"
            placeholder="Search Tree"
            aria-label="Search Tree"
            value={searchQuery}
            onChange={(e) => updateSearchQuery(e.target.value)}
            onClear={clearSearchQuery}
          />
        </div>
        <HeaderIconToolbar
          ariaLabel="Tree tools"
          labelPrefix="tree"
          onExpandAll={handleExpandAll}
          onCollapseAll={handleCollapseAll}
          showDefaultActions={false}
          addActions={[]}
        />
        <WorkshopTreeTabs
          tabs={[{ id: "sheets", label: "Tabs" }]}
          activeTab="sheets"
          ariaLabel="Estimate tree views"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-2">
        {disclaimer && (
          <div className="bg-surfaceMuted px-3 py-1 text-[9px] text-tertiary">
            {disclaimer}
          </div>
        )}
        {filteredNodes.length === 0 ? (
          <div className="p-4 text-[10px] text-tertiary">
            {searchQuery.trim()
              ? "No matching nodes."
              : "No estimate items."}
          </div>
        ) : (
          <WorkshopTree<ShareTreeNode>
            nodes={filteredNodes}
            selectedNodeId={null}
            expandedNodeIds={expandedNodeIds}
            getNodeId={(n) => n.id}
            getChildren={(n) => n.children}
            renderNode={renderNode}
          />
        )}
      </div>
    </div>
  );
}
