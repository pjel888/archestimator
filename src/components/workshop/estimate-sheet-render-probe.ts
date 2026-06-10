// Render observability for perf tests. The probe must stay null outside
// tests so production renders pay only a single null check.
type EstimateSheetRenderProbe = (tableNodeId: string) => void;

let activeProbe: EstimateSheetRenderProbe | null = null;

export function setEstimateSheetRenderProbe(probe: EstimateSheetRenderProbe | null) {
  activeProbe = probe;
}

export function reportEstimateRowItemsTableRender(tableNodeId: string) {
  activeProbe?.(tableNodeId);
}
