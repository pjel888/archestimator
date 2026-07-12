import { createContext, useContext } from "react";
import { createStore } from "zustand/vanilla";

import { createEstimateTreeIndex, type EstimateTreeIndex } from "@/lib/estimates/estimate-tree-index";
import type { EstimateRowItem, EstimateTreeNode } from "../../estimate-tree-data";
import {
  buildEditableRowValue,
  computeEditableRowTotal,
  computeNodeTotals,
  type EditableRowValue,
} from "./editable-row-model";

export type EditableRows = Record<string, EditableRowValue>;

type EditableRowStoreState = {
  rows: EditableRows;
  tree: EstimateTreeNode[];
  treeIndex: EstimateTreeIndex;
  nodeTotals: Map<string, number>;
  projectTotal: number;
  revision: number;
  replaceRows: (rows: EditableRows) => void;
  syncTree: (tree: EstimateTreeNode[]) => void;
  updateRow: (item: EstimateRowItem, patch: Partial<EditableRowValue>) => void;
};

export type EditableRowStore = ReturnType<typeof createEditableRowStore>;
export const EditableRowStoreContext = createContext<EditableRowStore | null>(null);

export function useEditableRowStore() {
  const store = useContext(EditableRowStoreContext);
  if (!store) throw new Error("Editable row store is unavailable.");
  return store;
}

function getProjectTotal(tree: EstimateTreeNode[], nodeTotals: ReadonlyMap<string, number>) {
  return tree.reduce((total, node) => total + (nodeTotals.get(node.id) ?? 0), 0);
}

function calculateTotals(tree: EstimateTreeNode[], rows: EditableRows) {
  const nodeTotals = computeNodeTotals(tree, rows);
  return { nodeTotals, projectTotal: getProjectTotal(tree, nodeTotals) };
}

export function createEditableRowStore(initialRows: EditableRows, initialTree: EstimateTreeNode[]) {
  const initialTotals = calculateTotals(initialTree, initialRows);
  return createStore<EditableRowStoreState>((set) => ({
    rows: initialRows,
    tree: initialTree,
    treeIndex: createEstimateTreeIndex(initialTree),
    ...initialTotals,
    revision: 0,
    replaceRows: (rows) => set((state) => {
      if (state.rows === rows) return state;
      return { rows, ...calculateTotals(state.tree, rows), revision: state.revision + 1 };
    }),
    syncTree: (tree) => set((state) => {
      if (state.tree === tree) return state;
      return {
        tree,
        treeIndex: createEstimateTreeIndex(tree),
        ...calculateTotals(tree, state.rows),
        revision: state.revision + 1,
      };
    }),
    updateRow: (item, patch) => set((state) => {
      const previousRowTotal = computeEditableRowTotal(item, state.rows);
      state.rows[item.id] = buildEditableRowValue(item, state.rows[item.id], patch);
      const nextRowTotal = computeEditableRowTotal(item, state.rows);
      const totalDelta = nextRowTotal - previousRowTotal;
      if (totalDelta === 0) return { rows: state.rows, revision: state.revision + 1 };

      const location = state.treeIndex.rowsById.get(item.id);
      if (location) {
        for (const nodeId of location.ancestorNodeIds) {
          state.nodeTotals.set(nodeId, (state.nodeTotals.get(nodeId) ?? 0) + totalDelta);
        }
      }
      return {
        rows: state.rows,
        nodeTotals: state.nodeTotals,
        projectTotal: state.projectTotal + totalDelta,
        revision: state.revision + 1,
      };
    }),
  }));
}
