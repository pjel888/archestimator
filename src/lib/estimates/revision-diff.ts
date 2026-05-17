import type { Estimate, EstimateLineItem } from "@/lib/local-data/schemas";

export type RevisionChangeKind =
  | "line-added"
  | "line-removed"
  | "space-moved"
  | "proposal-remapped"
  | "commercial-changed"
  | "scope-changed";

export type RevisionChange = {
  kind: RevisionChangeKind;
  lineItemId: string;
  itemName: string;
  fromSpacePath?: string;
  toSpacePath?: string;
  fromProposalSectionName?: string;
  toProposalSectionName?: string;
  changedFields?: string[];
};

export type RevisionDiffSummary = {
  addedLines: number;
  removedLines: number;
  spaceMoves: number;
  proposalRemaps: number;
  commercialChanges: number;
  scopeChanges: number;
};

export type RevisionDiff = {
  fromEstimateId: string;
  toEstimateId: string;
  summary: RevisionDiffSummary;
  changes: RevisionChange[];
};

const commercialFields: (keyof EstimateLineItem)[] = [
  "quantity",
  "unit",
  "unitCost",
  "materialUnitCost",
  "laborUnitCost",
  "wastePercent",
];

function formatSpacePath(estimate: Estimate, spaceId?: string) {
  if (!spaceId) return "Unassigned location";
  const space = estimate.spaces.find((entry) => entry.id === spaceId);
  if (!space) return "Unassigned location";
  const floor = estimate.floors.find((entry) => entry.id === space.floorId);
  return [floor?.name, space.name].filter(Boolean).join(" / ") || space.name;
}

function proposalSectionName(estimate: Estimate, proposalSectionId?: string) {
  if (!proposalSectionId) return "Unassigned proposal section";
  return estimate.proposalSections.find((section) => section.id === proposalSectionId)?.name ?? "Unassigned proposal section";
}

function summarize(changes: RevisionChange[]): RevisionDiffSummary {
  return {
    addedLines: changes.filter((change) => change.kind === "line-added").length,
    removedLines: changes.filter((change) => change.kind === "line-removed").length,
    spaceMoves: changes.filter((change) => change.kind === "space-moved").length,
    proposalRemaps: changes.filter((change) => change.kind === "proposal-remapped").length,
    commercialChanges: changes.filter((change) => change.kind === "commercial-changed").length,
    scopeChanges: changes.filter((change) => change.kind === "scope-changed").length,
  };
}

function revisionMatchKey(line: EstimateLineItem) {
  return line.revisionSourceLineItemId ?? line.id;
}

export function compareEstimateRevisions(fromEstimate: Estimate, toEstimate: Estimate): RevisionDiff {
  const changes: RevisionChange[] = [];
  const fromLines = new Map(fromEstimate.lineItems.map((line) => [revisionMatchKey(line), line]));
  const toLines = new Map(toEstimate.lineItems.map((line) => [revisionMatchKey(line), line]));

  for (const fromLine of fromEstimate.lineItems) {
    if (!toLines.has(revisionMatchKey(fromLine))) {
      changes.push({ kind: "line-removed", lineItemId: fromLine.id, itemName: fromLine.itemName });
    }
  }

  for (const toLine of toEstimate.lineItems) {
    const fromLine = fromLines.get(revisionMatchKey(toLine));
    if (!fromLine) {
      changes.push({ kind: "line-added", lineItemId: toLine.id, itemName: toLine.itemName });
      continue;
    }

    if (fromLine.spaceId !== toLine.spaceId) {
      changes.push({
        kind: "space-moved",
        lineItemId: toLine.id,
        itemName: toLine.itemName,
        fromSpacePath: formatSpacePath(fromEstimate, fromLine.spaceId),
        toSpacePath: formatSpacePath(toEstimate, toLine.spaceId),
      });
    }

    if (fromLine.proposalSectionId !== toLine.proposalSectionId) {
      changes.push({
        kind: "proposal-remapped",
        lineItemId: toLine.id,
        itemName: toLine.itemName,
        fromProposalSectionName: proposalSectionName(fromEstimate, fromLine.proposalSectionId),
        toProposalSectionName: proposalSectionName(toEstimate, toLine.proposalSectionId),
      });
    }

    const changedCommercialFields = commercialFields.filter((field) => fromLine[field] !== toLine[field]);
    if (changedCommercialFields.length > 0) {
      changes.push({
        kind: "commercial-changed",
        lineItemId: toLine.id,
        itemName: toLine.itemName,
        changedFields: changedCommercialFields,
      });
    }

    if (fromLine.scopeStatus !== toLine.scopeStatus) {
      changes.push({
        kind: "scope-changed",
        lineItemId: toLine.id,
        itemName: toLine.itemName,
        changedFields: ["scopeStatus"],
      });
    }
  }

  return {
    fromEstimateId: fromEstimate.id,
    toEstimateId: toEstimate.id,
    summary: summarize(changes),
    changes,
  };
}
