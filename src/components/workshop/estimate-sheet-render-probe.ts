// Render observability for perf tests. The probe must stay null outside
// tests so production renders pay only a single null check.
type EstimateSheetRenderProbe = (tableNodeId: string) => void;
type EstimateRowItemRenderProbe = (rowItemId: string) => void;
type EstimateSheetBranchRenderProbe = (nodeId: string) => void;
type EstimateProposalPreviewSignatureProbe = () => void;
type EstimateNodeTotalProbe = (nodeId: string) => void;
type EstimateNodeTotalsProbe = (rootNodeIds: readonly string[]) => void;
type EstimateSelectedNodePresentationProbe = (kind: "code" | "path") => void;

let activeProbe: EstimateSheetRenderProbe | null = null;
let activeRowProbe: EstimateRowItemRenderProbe | null = null;
let activeBranchProbe: EstimateSheetBranchRenderProbe | null = null;
let activeProposalSignatureProbe: EstimateProposalPreviewSignatureProbe | null = null;
let activeNodeTotalProbe: EstimateNodeTotalProbe | null = null;
let activeNodeTotalsProbe: EstimateNodeTotalsProbe | null = null;
let activeSelectedNodePresentationProbe: EstimateSelectedNodePresentationProbe | null = null;

export function setEstimateSheetRenderProbe(probe: EstimateSheetRenderProbe | null) {
  activeProbe = probe;
}

export function reportEstimateRowItemsTableRender(tableNodeId: string) {
  activeProbe?.(tableNodeId);
}

export function setEstimateRowItemRenderProbe(probe: EstimateRowItemRenderProbe | null) {
  activeRowProbe = probe;
}

export function reportEstimateRowItemRender(rowItemId: string) {
  activeRowProbe?.(rowItemId);
}

export function setEstimateSheetBranchRenderProbe(probe: EstimateSheetBranchRenderProbe | null) {
  activeBranchProbe = probe;
}

export function reportEstimateSheetBranchRender(nodeId: string) {
  activeBranchProbe?.(nodeId);
}

export function setEstimateProposalPreviewSignatureProbe(probe: EstimateProposalPreviewSignatureProbe | null) {
  activeProposalSignatureProbe = probe;
}

export function reportEstimateProposalPreviewSignatureCompute() {
  activeProposalSignatureProbe?.();
}

function setEstimateNodeTotalProbe(probe: EstimateNodeTotalProbe | null) {
  activeNodeTotalProbe = probe;
}

export function reportEstimateNodeTotalCompute(nodeId: string) {
  activeNodeTotalProbe?.(nodeId);
}

export function setEstimateNodeTotalsProbe(probe: EstimateNodeTotalsProbe | null) {
  activeNodeTotalsProbe = probe;
}

export function reportEstimateNodeTotalsCompute(rootNodeIds: readonly string[]) {
  activeNodeTotalsProbe?.(rootNodeIds);
}

export function setEstimateSelectedNodePresentationProbe(probe: EstimateSelectedNodePresentationProbe | null) {
  activeSelectedNodePresentationProbe = probe;
}

export function reportEstimateSelectedNodePresentationCompute(kind: "code" | "path") {
  activeSelectedNodePresentationProbe?.(kind);
}

let sheetContentProbe: (() => void) | null = null;

export function setEstimateSheetContentRenderProbe(probe: (() => void) | null) {
  sheetContentProbe = probe;
}

export function reportEstimateSheetContentRender() {
  sheetContentProbe?.();
}
