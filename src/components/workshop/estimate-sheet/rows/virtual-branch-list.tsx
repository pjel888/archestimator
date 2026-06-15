"use client";

import { useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

import { WORKSHOP_ESTIMATE_MASTER_COLUMN_VIRTUALIZATION } from "@/lib/workshop/virtualization-flags";
import type { EstimateTreeNode } from "../../estimate-tree-data";
import { EstimateSheetBranch, type BreadcrumbNode, type EstimateSheetBranchProps } from "./branch";
import { useEstimateSheetExpansion } from "./expansion";
import { getNodeCode } from "./node-visuals";

type EstimateSheetVirtualBranchListProps = Omit<
  EstimateSheetBranchProps,
  "depth" | "siblingIndex" | "renderChildBranches"
> & {
  virtualization?: {
    enabled?: boolean;
    minSections?: number;
    estimateSectionHeight?: number;
    overscan?: number;
    useFlushSync?: boolean;
    initialViewportHeight?: number;
  };
};

type VirtualBranch = {
  node: EstimateTreeNode;
  nodeCode: string;
  ancestorPath: BreadcrumbNode[];
  depth: number;
  siblingIndex: number;
};

function findScrollParent(element: HTMLElement | null): HTMLElement | null {
  let parent = element?.parentElement ?? null;
  while (parent) {
    const style = window.getComputedStyle(parent);
    if (/(auto|scroll|overlay)/.test(`${style.overflow}${style.overflowY}${style.overflowX}`)) return parent;
    parent = parent.parentElement;
  }
  return element;
}

function flattenVisibleBranches({
  node,
  nodeCode,
  ancestorPath,
  depth,
  siblingIndex,
  collapsedNodeIds,
  searchActive,
}: VirtualBranch & {
  collapsedNodeIds: ReadonlySet<string>;
  searchActive: boolean;
}): VirtualBranch[] {
  const branches: VirtualBranch[] = [{ node, nodeCode, ancestorPath, depth, siblingIndex }];
  if (!searchActive && collapsedNodeIds.has(node.id)) return branches;
  node.children?.forEach((child, childIndex) => {
    branches.push(
      ...flattenVisibleBranches({
        node: child,
        nodeCode: getNodeCode(nodeCode, childIndex),
        ancestorPath: [...ancestorPath, { id: node.id, name: node.name }],
        depth: depth + 1,
        siblingIndex: childIndex,
        collapsedNodeIds,
        searchActive,
      })
    );
  });
  return branches;
}

export function EstimateSheetVirtualBranchList({
  virtualization = WORKSHOP_ESTIMATE_MASTER_COLUMN_VIRTUALIZATION,
  ...branchProps
}: EstimateSheetVirtualBranchListProps) {
  const { collapsedNodeIds, searchActive = false } = useEstimateSheetExpansion();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const branches = useMemo(
    () =>
      flattenVisibleBranches({
        node: branchProps.node,
        nodeCode: branchProps.nodeCode,
        ancestorPath: branchProps.ancestorPath,
        depth: 0,
        siblingIndex: 0,
        collapsedNodeIds,
        searchActive,
      }),
    [branchProps.ancestorPath, branchProps.node, branchProps.nodeCode, collapsedNodeIds, searchActive]
  );
  const virtualEnabled = Boolean(virtualization.enabled && branches.length >= (virtualization.minSections ?? 80));
  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Virtual intentionally returns imperative helpers; this default-off path is isolated and covered by activation tests.
  const branchVirtualizer = useVirtualizer({
    count: branches.length,
    getScrollElement: () => findScrollParent(rootRef.current),
    estimateSize: () => virtualization.estimateSectionHeight ?? 192,
    overscan: virtualization.overscan ?? 5,
    getItemKey: (index) => branches[index]?.node.id ?? index,
    enabled: virtualEnabled,
    useFlushSync: virtualization.useFlushSync ?? false,
    initialRect: { height: virtualization.initialViewportHeight ?? 900, width: 0 },
  });
  const virtualEstimateSectionHeight = virtualization.estimateSectionHeight ?? 192;
  const virtualOverscan = virtualization.overscan ?? 5;
  const virtualInitialViewportHeight = virtualization.initialViewportHeight ?? 900;
  const measuredVirtualBranches = branchVirtualizer.getVirtualItems();
  const renderedVirtualBranches = virtualEnabled && measuredVirtualBranches.length === 0
    ? Array.from(
        {
          length: Math.min(
            branches.length,
            Math.ceil(virtualInitialViewportHeight / virtualEstimateSectionHeight) + virtualOverscan * 2
          ),
        },
        (_, index) => ({
          index,
          key: branches[index]?.node.id ?? index,
          start: index * virtualEstimateSectionHeight,
        })
      )
    : measuredVirtualBranches;

  if (!virtualEnabled) return <EstimateSheetBranch {...branchProps} />;

  return (
    <>
      <div
        ref={rootRef}
        data-estimate-branch-virtualizer="true"
        data-estimate-branch-virtual-total-count={branches.length}
        data-estimate-branch-virtual-mounted-count={renderedVirtualBranches.length}
        className="relative w-full"
        style={{ height: branchVirtualizer.getTotalSize() }}
      >
        {renderedVirtualBranches.map((virtualBranch) => {
          const branch = branches[virtualBranch.index];
          if (!branch) return null;
          return (
            <div
              key={virtualBranch.key}
              ref={branchVirtualizer.measureElement}
              data-index={virtualBranch.index}
              data-estimate-branch-virtual-row={branch.node.id}
              className="absolute left-0 top-0 w-full"
              style={{ transform: `translateY(${virtualBranch.start}px)` }}
            >
              <EstimateSheetBranch
                {...branchProps}
                node={branch.node}
                nodeCode={branch.nodeCode}
                ancestorPath={branch.ancestorPath}
                depth={branch.depth}
                siblingIndex={branch.siblingIndex}
                renderChildBranches={false}
              />
            </div>
          );
        })}
      </div>
      <div aria-hidden="true" className="h-32 shrink-0" />
    </>
  );
}
