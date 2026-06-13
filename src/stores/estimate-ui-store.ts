import { create } from "zustand";

export type EstimateDragIntent = "move" | "copy" | "replace" | "nest";
export type EstimateDragType = "node" | "row" | "library-item";

type EstimateUiState = {
  selectedNodeId: string | null;
  focusedCell: { rowId: string; field: string } | null;
  selectedRowIds: string[];
  expandedNodeIds: string[];
  activityScopeDirectOnly: Record<string, boolean>;
  dragState: {
    type: EstimateDragType | null;
    id: string | null;
    overId: string | null;
    intent: EstimateDragIntent | null;
  };
  setSelectedNodeId: (nodeId: string | null) => void;
  setFocusedCell: (focusedCell: EstimateUiState["focusedCell"]) => void;
  setSelectedRowIds: (rowIds: string[]) => void;
  setExpandedNodeIds: (nodeIds: string[]) => void;
  setActivityScopeDirectOnly: (nodeId: string, directOnly: boolean) => void;
  setDragState: (dragState: EstimateUiState["dragState"]) => void;
  clearDragState: () => void;
};

const emptyDragState: EstimateUiState["dragState"] = {
  type: null,
  id: null,
  overId: null,
  intent: null,
};

export const useEstimateUiStore = create<EstimateUiState>((set) => ({
  selectedNodeId: null,
  focusedCell: null,
  selectedRowIds: [],
  expandedNodeIds: [],
  activityScopeDirectOnly: {},
  dragState: emptyDragState,
  setSelectedNodeId: (selectedNodeId) => set({ selectedNodeId }),
  setFocusedCell: (focusedCell) => set({ focusedCell }),
  setSelectedRowIds: (selectedRowIds) => set({ selectedRowIds }),
  setExpandedNodeIds: (expandedNodeIds) => set({ expandedNodeIds }),
  setActivityScopeDirectOnly: (nodeId, directOnly) =>
    set((s) => ({
      activityScopeDirectOnly: { ...s.activityScopeDirectOnly, [nodeId]: directOnly },
    })),
  setDragState: (dragState) => set({ dragState }),
  clearDragState: () => set({ dragState: emptyDragState }),
}));
