export type ShareReviewTargetKind = "proposal" | "estimate" | "row";

export type ShareReviewTarget = {
  kind: ShareReviewTargetKind;
  label: string;
  secondaryLabel?: string | null;
  estimateId?: string | null;
  rowId?: string | null;
};

export const PROPOSAL_REVIEW_TARGET: ShareReviewTarget = {
  kind: "proposal",
  label: "Proposal",
};

function cleanText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function normalizeShareReviewTarget(target: ShareReviewTarget | null | undefined): ShareReviewTarget {
  if (!target) return PROPOSAL_REVIEW_TARGET;

  const rowId = cleanText(target.rowId);
  const estimateId = cleanText(target.estimateId);
  const kind: ShareReviewTargetKind = target.kind === "row" && rowId ? "row" : target.kind === "estimate" && estimateId ? "estimate" : "proposal";
  const fallbackLabel = kind === "row" ? "Selected line item" : kind === "estimate" ? "Selected estimate" : "Proposal";

  return {
    kind,
    label: cleanText(target.label) ?? fallbackLabel,
    secondaryLabel: cleanText(target.secondaryLabel),
    estimateId: kind === "row" || kind === "estimate" ? estimateId : null,
    rowId: kind === "row" ? rowId : null,
  };
}

export function serializeShareReviewTarget(target: ShareReviewTarget | null | undefined) {
  const normalized = normalizeShareReviewTarget(target);
  return {
    estimateId: normalized.kind === "row" || normalized.kind === "estimate" ? normalized.estimateId ?? null : null,
    rowId: normalized.kind === "row" ? normalized.rowId ?? null : null,
  };
}

export function shareReviewTargetDisplay(target: ShareReviewTarget | null | undefined) {
  const normalized = normalizeShareReviewTarget(target);
  return normalized.kind === "proposal" ? "Proposal" : normalized.label;
}

export function isSpecificShareReviewTarget(target: ShareReviewTarget | null | undefined) {
  return normalizeShareReviewTarget(target).kind !== "proposal";
}
