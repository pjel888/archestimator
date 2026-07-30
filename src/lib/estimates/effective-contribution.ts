export type DirectRowContribution = {
  rowId: string;
  directMinorUnits: number;
  quantity: number;
};

export type AlternativeGroup = {
  groupId: string;
  memberRowIds: readonly string[];
  selectedRowId: string;
};

export type OptionalItem = {
  rowId: string;
  included: boolean;
};

export type EvaluatedAdditiveEdge = {
  parentRowId: string;
  childRowId: string;
  effectiveDirectMinorUnits: number;
  effectiveQuantity: number;
};

export type ContributionInclusionReason =
  | "included"
  | "alternative_not_selected"
  | "optional_excluded"
  | "ancestor_excluded";

export type EffectiveRowContribution = {
  rowId: string;
  rootRowId: string;
  effectiveDirectMinorUnits: number;
  effectiveQuantity: number;
  presentationRollupMinorUnits: number;
  inclusionReason: ContributionInclusionReason;
};

export type EffectiveContributionErrorCode =
  | "duplicate_row"
  | "invalid_amount"
  | "invalid_quantity"
  | "missing_row"
  | "duplicate_parent"
  | "cycle"
  | "invalid_alternative_group"
  | "duplicate_alternative_membership"
  | "conflicting_root_role";

export type EffectiveContributionResult =
  | { ok: true; rows: EffectiveRowContribution[]; totalMinorUnits: number }
  | { ok: false; code: EffectiveContributionErrorCode; subjectId: string };

export type ResolveEffectiveContributionInput = {
  rows: readonly DirectRowContribution[];
  alternativeGroups?: readonly AlternativeGroup[];
  optionalItems?: readonly OptionalItem[];
  additiveEdges?: readonly EvaluatedAdditiveEdge[];
};

function invalid(
  code: EffectiveContributionErrorCode,
  subjectId: string,
): EffectiveContributionResult {
  return { ok: false, code, subjectId };
}

export function resolveEffectiveContribution(
  input: ResolveEffectiveContributionInput,
): EffectiveContributionResult {
  const rowById = new Map<string, DirectRowContribution>();
  for (const row of input.rows) {
    if (!row.rowId.trim() || rowById.has(row.rowId)) return invalid("duplicate_row", row.rowId);
    if (!Number.isSafeInteger(row.directMinorUnits) || row.directMinorUnits < 0) {
      return invalid("invalid_amount", row.rowId);
    }
    if (!Number.isFinite(row.quantity) || row.quantity < 0) {
      return invalid("invalid_quantity", row.rowId);
    }
    rowById.set(row.rowId, row);
  }

  const parentByChild = new Map<string, EvaluatedAdditiveEdge>();
  const childrenByParent = new Map<string, EvaluatedAdditiveEdge[]>();
  for (const edge of input.additiveEdges ?? []) {
    if (!rowById.has(edge.parentRowId)) return invalid("missing_row", edge.parentRowId);
    if (!rowById.has(edge.childRowId)) return invalid("missing_row", edge.childRowId);
    if (edge.parentRowId === edge.childRowId) return invalid("cycle", edge.childRowId);
    if (parentByChild.has(edge.childRowId)) return invalid("duplicate_parent", edge.childRowId);
    if (!Number.isSafeInteger(edge.effectiveDirectMinorUnits) || edge.effectiveDirectMinorUnits < 0) {
      return invalid("invalid_amount", edge.childRowId);
    }
    if (!Number.isFinite(edge.effectiveQuantity) || edge.effectiveQuantity < 0) {
      return invalid("invalid_quantity", edge.childRowId);
    }
    parentByChild.set(edge.childRowId, edge);
    const children = childrenByParent.get(edge.parentRowId) ?? [];
    children.push(edge);
    childrenByParent.set(edge.parentRowId, children);
  }

  const rootFor = new Map<string, string>();
  for (const rowId of rowById.keys()) {
    const visited = new Set<string>();
    let cursor = rowId;
    while (parentByChild.has(cursor)) {
      if (visited.has(cursor)) return invalid("cycle", cursor);
      visited.add(cursor);
      cursor = parentByChild.get(cursor)!.parentRowId;
    }
    rootFor.set(rowId, cursor);
  }

  const alternativeSelection = new Map<string, boolean>();
  const alternativeMembership = new Set<string>();
  for (const group of input.alternativeGroups ?? []) {
    const members = [...new Set(group.memberRowIds)];
    if (
      !group.groupId.trim() ||
      members.length !== group.memberRowIds.length ||
      members.length < 2 ||
      !members.includes(group.selectedRowId)
    ) {
      return invalid("invalid_alternative_group", group.groupId);
    }
    for (const rowId of members) {
      if (!rowById.has(rowId) || parentByChild.has(rowId)) {
        return invalid("invalid_alternative_group", group.groupId);
      }
      if (alternativeMembership.has(rowId)) {
        return invalid("duplicate_alternative_membership", rowId);
      }
      alternativeMembership.add(rowId);
      alternativeSelection.set(rowId, rowId === group.selectedRowId);
    }
  }

  const optionalSelection = new Map<string, boolean>();
  for (const optional of input.optionalItems ?? []) {
    if (!rowById.has(optional.rowId) || parentByChild.has(optional.rowId)) {
      return invalid("missing_row", optional.rowId);
    }
    if (alternativeMembership.has(optional.rowId)) {
      return invalid("conflicting_root_role", optional.rowId);
    }
    optionalSelection.set(optional.rowId, optional.included);
  }

  const inclusionForRoot = (rootRowId: string): ContributionInclusionReason => {
    if (alternativeSelection.get(rootRowId) === false) return "alternative_not_selected";
    if (optionalSelection.get(rootRowId) === false) return "optional_excluded";
    return "included";
  };

  const directById = new Map<string, number>();
  const quantityById = new Map<string, number>();
  for (const row of input.rows) {
    const edge = parentByChild.get(row.rowId);
    directById.set(row.rowId, edge?.effectiveDirectMinorUnits ?? row.directMinorUnits);
    quantityById.set(row.rowId, edge?.effectiveQuantity ?? row.quantity);
  }

  const rollup = (rowId: string): number | null => {
    let total = directById.get(rowId) ?? 0;
    for (const edge of childrenByParent.get(rowId) ?? []) {
      const childTotal = rollup(edge.childRowId);
      if (childTotal === null || !Number.isSafeInteger(total + childTotal)) return null;
      total += childTotal;
    }
    return total;
  };

  const rows: EffectiveRowContribution[] = [];
  let totalMinorUnits = 0;
  for (const row of input.rows) {
    const rootRowId = rootFor.get(row.rowId)!;
    const rootReason = inclusionForRoot(rootRowId);
    const inclusionReason =
      rootReason === "included"
        ? "included"
        : row.rowId === rootRowId
          ? rootReason
          : "ancestor_excluded";
    const included = inclusionReason === "included";
    const effectiveDirectMinorUnits = included ? directById.get(row.rowId)! : 0;
    const effectiveQuantity = included ? quantityById.get(row.rowId)! : 0;
    const rawRollup = rollup(row.rowId);
    if (rawRollup === null) return invalid("invalid_amount", row.rowId);
    const presentationRollupMinorUnits = included ? rawRollup : 0;
    rows.push({
      rowId: row.rowId,
      rootRowId,
      effectiveDirectMinorUnits,
      effectiveQuantity,
      presentationRollupMinorUnits,
      inclusionReason,
    });
    if (included && !parentByChild.has(row.rowId)) {
      if (!Number.isSafeInteger(totalMinorUnits + presentationRollupMinorUnits)) {
        return invalid("invalid_amount", row.rowId);
      }
      totalMinorUnits += presentationRollupMinorUnits;
    }
  }

  return { ok: true, rows, totalMinorUnits };
}
