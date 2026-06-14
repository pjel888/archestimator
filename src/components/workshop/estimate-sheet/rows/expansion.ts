import { createContext, useContext, type Dispatch, type SetStateAction } from "react";

import type { EstimateTreeNode } from "../../estimate-tree-data";

export type EstimateSheetExpansionContextValue = {
  collapsedNodeIds: Set<string>;
  setCollapsedNodeIds: Dispatch<SetStateAction<Set<string>>>;
  // While a sheet search is active the host force-reveals every match (collapse
  // state is overridden to empty) but keeps setCollapsedNodeIds live. Branches
  // read this to SUPPRESS the per-node disclosure caret during search, so a user
  // can't toggle collapse state they can't see take effect; carets return (and
  // the preserved state is restored) when search clears. See OD-3.
  searchActive?: boolean;
};

export const EstimateSheetExpansionContext = createContext<EstimateSheetExpansionContextValue | null>(null);

export function useEstimateSheetExpansion() {
  const context = useContext(EstimateSheetExpansionContext);
  if (!context) throw new Error("useEstimateSheetExpansion must be used inside EstimateSheetExpansionContext.Provider");
  return context;
}

// Returns EVERY node id in the subtree (recurses children). Under P6 every
// visited node is collapsible (it can own rows even with no children), so the
// id set is safe for collapse-all: each id has a matching per-node caret
// (branch.tsx gates the caret on hasContents). Keep this child-recursive.
export function collectAllNodeIds(nodes: EstimateTreeNode[]): string[] {
  const ids: string[] = [];
  function visit(node: EstimateTreeNode) {
    ids.push(node.id);
    node.children?.forEach(visit);
  }
  nodes.forEach(visit);
  return ids;
}

