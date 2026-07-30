"use client";

import { useCallback, useSyncExternalStore } from "react";

import { evaluateAssemblyQuantityRule } from "@/lib/estimates/assembly-quantity-rule";
import { resolveEffectiveContribution } from "@/lib/estimates/effective-contribution";
import type { EstimateRowItem, EstimateTreeLoadLimitState, EstimateTreeNode } from "@/lib/estimates/types";

export const LEGACY_ESTIMATE_TREE_TOTALS_TAB_ID = "legacy-main";

export type EstimateTreeTotalsDataState =
  | "loading"
  | "ready"
  | "updating"
  | "partial"
  | "stale-error"
  | "unavailable";

export type EstimateTreeTotalsMutationState =
  | "authoritative"
  | "optimistic"
  | "pending"
  | "rejected-retained"
  | "rolled-back";

export type EstimateTreeTotalsCompletenessReason =
  | "node-limit"
  | "row-limit"
  | "subarea-not-loaded"
  | "rows-not-loaded";

export type EstimateTreeTotalsCompleteness = Readonly<{
  nodes: "complete" | "partial";
  rows: "complete" | "partial";
  reasons: readonly EstimateTreeTotalsCompletenessReason[];
}>;

export type EstimateTreeTotalsLookup = Readonly<{
  size: number;
  get: (nodeId: string) => number | undefined;
  has: (nodeId: string) => boolean;
  entries: () => IterableIterator<readonly [string, number]>;
  [Symbol.iterator]: () => IterableIterator<readonly [string, number]>;
}>;

export type EstimateTreeTotalsSnapshot = Readonly<{
  scope: Readonly<{
    estimateId: string;
    tabId: string;
  }>;
  currencyCode: string | null;
  nodeTotals: EstimateTreeTotalsLookup;
  projectTotal: number | null;
  dataState: EstimateTreeTotalsDataState;
  mutationState: EstimateTreeTotalsMutationState;
  completeness: EstimateTreeTotalsCompleteness;
  safeErrorCode: string | null;
  revision: number;
}>;

export type PublishEstimateTreeTotalsInput = Readonly<{
  estimateId: string;
  tabId?: string | null;
  currencyCode?: string | null;
  nodeTotals: ReadonlyMap<string, number>;
  projectTotal: number;
  dataState: EstimateTreeTotalsDataState;
  mutationState: EstimateTreeTotalsMutationState;
  completeness: EstimateTreeTotalsCompleteness;
  safeErrorCode?: string | null;
  revision: number;
}>;

export type EstimateTreeSubtotalPresentation = Readonly<{
  amountText: string | null;
  statusText: string | null;
  ariaLabel: string;
  title: string;
  showSkeleton: boolean;
}>;

export type EffectiveEstimateTreeTotalsResult =
  | Readonly<{
    ok: true;
    nodeTotals: ReadonlyMap<string, number>;
    projectTotal: number;
  }>
  | Readonly<{
    ok: false;
    safeErrorCode: string;
  }>;

type SnapshotEntry = {
  snapshot: EstimateTreeTotalsSnapshot;
  sourceTotals: ReadonlyMap<string, number>;
};

const COMPLETE_TOTALS: EstimateTreeTotalsCompleteness = Object.freeze({
  nodes: "complete",
  rows: "complete",
  reasons: Object.freeze([]),
});
const EMPTY_TOTALS = createTotalsLookup(new Map());
const snapshots = new Map<string, SnapshotEntry>();
const listeners = new Map<string, Set<() => void>>();

export function normalizeEstimateTreeTotalsTabId(tabId?: string | null) {
  return tabId?.trim() || LEGACY_ESTIMATE_TREE_TOTALS_TAB_ID;
}

function createScope(estimateId: string, tabId?: string | null) {
  return Object.freeze({
    estimateId: estimateId.trim(),
    tabId: normalizeEstimateTreeTotalsTabId(tabId),
  });
}

function getScopeKey(estimateId: string, tabId?: string | null) {
  const scope = createScope(estimateId, tabId);
  return JSON.stringify([scope.estimateId, scope.tabId]);
}

function createTotalsLookup(source: ReadonlyMap<string, number>): EstimateTreeTotalsLookup {
  const totals = new Map(source);
  const entries = function* (): IterableIterator<readonly [string, number]> {
    for (const [nodeId, amount] of totals) yield Object.freeze([nodeId, amount] as const);
  };
  return Object.freeze({
    size: totals.size,
    get: (nodeId: string) => totals.get(nodeId),
    has: (nodeId: string) => totals.has(nodeId),
    entries,
    [Symbol.iterator]: entries,
  });
}

function normalizeCurrencyCode(currencyCode?: string | null) {
  const normalized = currencyCode?.trim().toUpperCase() ?? "";
  if (!/^[A-Z]{3}$/.test(normalized)) return null;
  try {
    new Intl.NumberFormat("en-PH", { style: "currency", currency: normalized }).format(0);
    return normalized;
  } catch {
    return null;
  }
}

function freezeCompleteness(completeness: EstimateTreeTotalsCompleteness) {
  const reasons = Object.freeze([...new Set(completeness.reasons)]);
  return Object.freeze({
    nodes: completeness.nodes,
    rows: completeness.rows,
    reasons,
  });
}

function hasValidTotals(nodeTotals: ReadonlyMap<string, number>, projectTotal: number) {
  if (!Number.isFinite(projectTotal)) return false;
  for (const [nodeId, amount] of nodeTotals) {
    if (!nodeId || !Number.isFinite(amount)) return false;
  }
  return true;
}

function emit(scopeKey: string) {
  for (const listener of listeners.get(scopeKey) ?? []) listener();
}

function snapshotsMatch(previous: SnapshotEntry, input: PublishEstimateTreeTotalsInput, currencyCode: string | null) {
  const snapshot = previous.snapshot;
  return previous.sourceTotals === input.nodeTotals
    && snapshot.revision === input.revision
    && snapshot.currencyCode === currencyCode
    && snapshot.projectTotal === input.projectTotal
    && snapshot.dataState === input.dataState
    && snapshot.mutationState === input.mutationState
    && snapshot.safeErrorCode === (input.safeErrorCode ?? null)
    && snapshot.completeness.nodes === input.completeness.nodes
    && snapshot.completeness.rows === input.completeness.rows
    && snapshot.completeness.reasons.length === input.completeness.reasons.length
    && snapshot.completeness.reasons.every((reason, index) => reason === input.completeness.reasons[index]);
}

export function publishEstimateTreeTotals(input: PublishEstimateTreeTotalsInput) {
  const scope = createScope(input.estimateId, input.tabId);
  if (!scope.estimateId || !Number.isInteger(input.revision) || input.revision < 0) return false;

  const scopeKey = getScopeKey(scope.estimateId, scope.tabId);
  const previous = snapshots.get(scopeKey);
  if (previous && input.revision < previous.snapshot.revision) return false;

  const currencyCode = normalizeCurrencyCode(input.currencyCode);
  if (previous && snapshotsMatch(previous, input, currencyCode)) return false;

  const preciseAmountsAllowed = input.dataState !== "loading" && input.dataState !== "unavailable";
  const totalsValid = hasValidTotals(input.nodeTotals, input.projectTotal);
  const canPublishAmounts = preciseAmountsAllowed && currencyCode !== null && totalsValid;
  const dataState = canPublishAmounts ? input.dataState : preciseAmountsAllowed ? "unavailable" : input.dataState;
  const safeErrorCode = canPublishAmounts
    ? input.safeErrorCode ?? null
    : input.safeErrorCode ?? (currencyCode === null ? "invalid-currency" : totalsValid ? null : "invalid-total");
  const snapshot = Object.freeze({
    scope,
    currencyCode,
    nodeTotals: canPublishAmounts ? createTotalsLookup(input.nodeTotals) : EMPTY_TOTALS,
    projectTotal: canPublishAmounts ? input.projectTotal : null,
    dataState,
    mutationState: input.mutationState,
    completeness: freezeCompleteness(input.completeness),
    safeErrorCode,
    revision: input.revision,
  });

  snapshots.set(scopeKey, { snapshot, sourceTotals: input.nodeTotals });
  emit(scopeKey);
  return true;
}

export function clearEstimateTreeTotals(estimateId: string, tabId?: string | null) {
  const scopeKey = getScopeKey(estimateId, tabId);
  if (!snapshots.delete(scopeKey)) return false;
  emit(scopeKey);
  return true;
}

export function readEstimateTreeTotals(estimateId: string, tabId?: string | null) {
  return snapshots.get(getScopeKey(estimateId, tabId))?.snapshot ?? null;
}

export function useEstimateTreeTotals(estimateId: string, tabId?: string | null) {
  const scopeKey = getScopeKey(estimateId, tabId);
  const subscribe = useCallback((listener: () => void) => {
    const scopeListeners = listeners.get(scopeKey) ?? new Set<() => void>();
    scopeListeners.add(listener);
    listeners.set(scopeKey, scopeListeners);
    return () => {
      scopeListeners.delete(listener);
      if (scopeListeners.size === 0) listeners.delete(scopeKey);
    };
  }, [scopeKey]);
  const getSnapshot = useCallback(
    () => snapshots.get(scopeKey)?.snapshot ?? null,
    [scopeKey],
  );
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}

export function getEstimateTreeTotalsCompleteness(
  nodes: readonly EstimateTreeNode[],
  loadLimitState?: EstimateTreeLoadLimitState,
): EstimateTreeTotalsCompleteness {
  const reasons = new Set<EstimateTreeTotalsCompletenessReason>();
  if (loadLimitState?.didExceedNodeLimit) reasons.add("node-limit");
  if (loadLimitState?.didExceedRowItemLimit) reasons.add("row-limit");

  const visit = (items: readonly EstimateTreeNode[]) => {
    for (const node of items) {
      if (node.childrenLoaded === false) reasons.add("subarea-not-loaded");
      if (node.rowItemsLoaded === false) reasons.add("rows-not-loaded");
      visit(node.children ?? []);
    }
  };
  visit(nodes);

  if (reasons.size === 0) return COMPLETE_TOTALS;
  const orderedReasons = [
    "node-limit",
    "row-limit",
    "subarea-not-loaded",
    "rows-not-loaded",
  ].filter((reason): reason is EstimateTreeTotalsCompletenessReason => reasons.has(reason as EstimateTreeTotalsCompletenessReason));
  return Object.freeze({
    nodes: reasons.has("node-limit") || reasons.has("subarea-not-loaded") ? "partial" : "complete",
    rows: reasons.has("row-limit") || reasons.has("rows-not-loaded") ? "partial" : "complete",
    reasons: Object.freeze(orderedReasons),
  });
}

export function buildEffectiveEstimateTreeTotals(
  nodes: readonly EstimateTreeNode[],
  getEditableRowAmount: (row: EstimateRowItem, quantityOverride?: number) => Readonly<{
    amount: number;
    quantity: number;
  }>,
): EffectiveEstimateTreeTotalsResult {
  type EstimateRow = NonNullable<EstimateTreeNode["estimateRowItems"]>[number];
  const rows: EstimateRow[] = [];
  const rowById = new Map<string, EstimateRow>();
  const nodeIdByRowId = new Map<string, string>();
  const alternativeGroups = new Map<string, NonNullable<EstimateRow["alternativeGroup"]>>();
  const accessoryParentByChild = new Map<string, NonNullable<EstimateRow["accessoryParent"]>>();
  const accessoryChildrenByParent = new Map<string, NonNullable<EstimateRow["accessoryChildren"]>>();

  const collect = (items: readonly EstimateTreeNode[]) => {
    for (const node of items) {
      for (const row of node.estimateRowItems ?? []) {
        if (nodeIdByRowId.has(row.id)) return false;
        rows.push(row);
        rowById.set(row.id, row);
        nodeIdByRowId.set(row.id, node.id);
        if (row.alternativeGroup) {
          const existing = alternativeGroups.get(row.alternativeGroup.id);
          if (existing && JSON.stringify(existing) !== JSON.stringify(row.alternativeGroup)) return false;
          alternativeGroups.set(row.alternativeGroup.id, row.alternativeGroup);
        }
        if (row.accessoryParent) accessoryParentByChild.set(row.id, row.accessoryParent);
        if (row.accessoryChildren?.length) accessoryChildrenByParent.set(row.id, row.accessoryChildren);
      }
      if (!collect(node.children ?? [])) return false;
    }
    return true;
  };
  if (!collect(nodes)) return Object.freeze({ ok: false, safeErrorCode: "invalid-contribution-projection" });

  const directRows: Array<{ rowId: string; directMinorUnits: number; quantity: number }> = [];
  const directMinorUnitsByRowId = new Map<string, number>();
  const quantityByRowId = new Map<string, number>();
  for (const row of rows) {
    const editable = getEditableRowAmount(row);
    const directMinorUnits = Math.round(editable.amount * 100);
    if (!Number.isSafeInteger(directMinorUnits) || directMinorUnits < 0 || !Number.isFinite(editable.quantity) || editable.quantity < 0) {
      return Object.freeze({ ok: false, safeErrorCode: "invalid-contribution-amount" });
    }
    directRows.push({ rowId: row.id, directMinorUnits, quantity: editable.quantity });
    directMinorUnitsByRowId.set(row.id, directMinorUnits);
    quantityByRowId.set(row.id, editable.quantity);
  }

  const alternativeInputs = [...alternativeGroups.values()].map((group) => ({
    groupId: group.id,
    memberRowIds: group.memberRowItemIds,
    selectedRowId: group.selectedRowItemId,
  }));
  for (const group of alternativeInputs) {
    const memberNodeIds = new Set(group.memberRowIds.map((rowId) => nodeIdByRowId.get(rowId)));
    if (memberNodeIds.has(undefined) || memberNodeIds.size !== 1) {
      return Object.freeze({ ok: false, safeErrorCode: "invalid-alternative-area" });
    }
  }

  const optionalInputs = rows
    .filter((row) => row.optionalContribution)
    .map((row) => ({ rowId: row.id, included: row.optionalContribution!.isIncluded }));
  const additiveEdges = [] as Array<{
    parentRowId: string;
    childRowId: string;
    effectiveDirectMinorUnits: number;
    effectiveQuantity: number;
  }>;
  for (const [parentRowId, children] of accessoryChildrenByParent) {
    for (const child of children) {
      const loadedChildParent = accessoryParentByChild.get(child.childRowItemId);
      if (nodeIdByRowId.has(child.childRowItemId) && (
        !loadedChildParent
        || loadedChildParent.parentRowItemId !== parentRowId
        || loadedChildParent.edgeId !== child.edgeId
      )) {
        return Object.freeze({ ok: false, safeErrorCode: "invalid-accessory-projection" });
      }
    }
  }
  for (const [childRowId, edge] of accessoryParentByChild) {
    const childNodeId = nodeIdByRowId.get(childRowId);
    const parentNodeId = nodeIdByRowId.get(edge.parentRowItemId);
    if (!childNodeId || !parentNodeId || childNodeId !== parentNodeId) {
      return Object.freeze({ ok: false, safeErrorCode: "invalid-accessory-area" });
    }
    if (edge.mode === "required" && !edge.isIncluded) {
      return Object.freeze({ ok: false, safeErrorCode: "invalid-accessory-projection" });
    }
    const parentProjection = accessoryChildrenByParent.get(edge.parentRowItemId)?.find(
      (candidate) => candidate.childRowItemId === childRowId,
    );
    if (parentProjection && (
      parentProjection.edgeId !== edge.edgeId
      || parentProjection.mode !== edge.mode
      || parentProjection.isIncluded !== edge.isIncluded
    )) {
      return Object.freeze({ ok: false, safeErrorCode: "invalid-accessory-projection" });
    }
  }

  const effectiveAccessoryByRowId = new Map<string, {
    amountMinorUnits: number;
    quantity: number;
    isIncluded: boolean;
  }>();
  const resolvingAccessories = new Set<string>();
  const resolveAccessory = (rowId: string): {
    ok: true;
    amountMinorUnits: number;
    quantity: number;
    isIncluded: boolean;
  } | { ok: false; safeErrorCode: string } => {
    const cached = effectiveAccessoryByRowId.get(rowId);
    if (cached) return { ok: true, ...cached };
    if (resolvingAccessories.has(rowId)) return { ok: false, safeErrorCode: "invalid-accessory-cycle" };
    const row = rowById.get(rowId);
    if (!row) return { ok: false, safeErrorCode: "invalid-accessory-projection" };
    const edge = accessoryParentByChild.get(rowId);
    if (!edge) {
      const base = {
        amountMinorUnits: directMinorUnitsByRowId.get(rowId) ?? 0,
        quantity: quantityByRowId.get(rowId) ?? 0,
        isIncluded: true,
      };
      effectiveAccessoryByRowId.set(rowId, base);
      return { ok: true, ...base };
    }
    resolvingAccessories.add(rowId);
    const parent = resolveAccessory(edge.parentRowItemId);
    if (!parent.ok) return parent;
    const isIncluded = parent.isIncluded && edge.isIncluded;
    const evaluatedQuantity = isIncluded
      ? evaluateAssemblyQuantityRule(edge.quantityRule, { parentQuantity: parent.quantity })
      : { ok: true as const, quantity: 0 };
    if (!evaluatedQuantity.ok) {
      resolvingAccessories.delete(rowId);
      return { ok: false, safeErrorCode: `accessory-quantity-${evaluatedQuantity.error.code}` };
    }
    const effective = getEditableRowAmount(row, evaluatedQuantity.quantity);
    const amountMinorUnits = Math.round(effective.amount * 100);
    if (!Number.isSafeInteger(amountMinorUnits) || amountMinorUnits < 0) {
      resolvingAccessories.delete(rowId);
      return { ok: false, safeErrorCode: "invalid-contribution-amount" };
    }
    const resolved = { amountMinorUnits, quantity: evaluatedQuantity.quantity, isIncluded };
    resolvingAccessories.delete(rowId);
    effectiveAccessoryByRowId.set(rowId, resolved);
    return { ok: true, ...resolved };
  };
  for (const [childRowId, edge] of accessoryParentByChild) {
    const effective = resolveAccessory(childRowId);
    if (!effective.ok) return Object.freeze(effective);
    additiveEdges.push({
      parentRowId: edge.parentRowItemId,
      childRowId,
      effectiveDirectMinorUnits: effective.amountMinorUnits,
      effectiveQuantity: effective.quantity,
    });
  }

  const contribution = resolveEffectiveContribution({
    rows: directRows,
    alternativeGroups: alternativeInputs,
    optionalItems: optionalInputs,
    additiveEdges,
  });
  if (!contribution.ok) {
    return Object.freeze({ ok: false, safeErrorCode: `effective-contribution-${contribution.code}` });
  }

  const effectiveDirectByRowId = new Map(
    contribution.rows.map((row) => [row.rowId, row.effectiveDirectMinorUnits]),
  );
  const nodeTotals = new Map<string, number>();
  const visit = (node: EstimateTreeNode): number => {
    let totalMinorUnits = 0;
    for (const row of node.estimateRowItems ?? []) totalMinorUnits += effectiveDirectByRowId.get(row.id) ?? 0;
    for (const child of node.children ?? []) totalMinorUnits += visit(child);
    nodeTotals.set(node.id, totalMinorUnits / 100);
    return totalMinorUnits;
  };
  let projectTotalMinorUnits = 0;
  for (const node of nodes) projectTotalMinorUnits += visit(node);
  if (!Number.isSafeInteger(projectTotalMinorUnits) || projectTotalMinorUnits !== contribution.totalMinorUnits) {
    return Object.freeze({ ok: false, safeErrorCode: "effective-contribution-parity" });
  }
  return Object.freeze({ ok: true, nodeTotals, projectTotal: projectTotalMinorUnits / 100 });
}

export function resolveEstimateTreeTotalsMutationState(input: Readonly<{
  hasOptimistic: boolean;
  hasPending: boolean;
  hasRejectedRetained: boolean;
  hasRolledBack: boolean;
}>): EstimateTreeTotalsMutationState {
  if (input.hasRejectedRetained) return "rejected-retained";
  if (input.hasRolledBack) return "rolled-back";
  if (input.hasPending) return "pending";
  if (input.hasOptimistic) return "optimistic";
  return "authoritative";
}

function getSnapshotStatusParts(snapshot: EstimateTreeTotalsSnapshot) {
  const statusParts: string[] = [];
  if (snapshot.dataState === "updating") statusParts.push("updating");
  if (snapshot.dataState === "stale-error") statusParts.push("stale after update error");
  if (
    snapshot.dataState === "partial"
    || snapshot.completeness.nodes === "partial"
    || snapshot.completeness.rows === "partial"
  ) statusParts.push("partial");
  if (snapshot.mutationState === "optimistic") statusParts.push("unsaved");
  if (snapshot.mutationState === "pending") statusParts.push("saving");
  if (snapshot.mutationState === "rejected-retained") statusParts.push("unsaved after rejection");
  if (snapshot.mutationState === "rolled-back") statusParts.push("rolled back");
  return statusParts;
}

export function getEstimateTreeSubtotalPresentation(
  snapshot: EstimateTreeTotalsSnapshot | null,
  nodeId: string,
  nodeName: string,
): EstimateTreeSubtotalPresentation {
  if (!snapshot || snapshot.dataState === "loading") {
    return Object.freeze({
      amountText: null,
      statusText: "Loading",
      ariaLabel: `${nodeName} subtotal. Loading subtotal.`,
      title: "Loading subtotal.",
      showSkeleton: true,
    });
  }

  const amount = snapshot.nodeTotals.get(nodeId);
  if (
    snapshot.dataState === "unavailable"
    || snapshot.currencyCode === null
    || amount === undefined
    || !Number.isFinite(amount)
  ) {
    return Object.freeze({
      amountText: null,
      statusText: "Unavailable",
      ariaLabel: `${nodeName} subtotal. Subtotal unavailable.`,
      title: "Subtotal unavailable.",
      showSkeleton: false,
    });
  }

  const amountText = new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: snapshot.currencyCode,
    currencyDisplay: "code",
    minimumFractionDigits: 2,
  }).format(amount);
  const statusParts = getSnapshotStatusParts(snapshot);
  const statusText = statusParts.length > 0 ? statusParts.join(" · ") : null;
  const statusSuffix = statusParts.length > 0 ? `, ${statusParts.join(", ")}` : "";
  return Object.freeze({
    amountText,
    statusText,
    ariaLabel: `${nodeName} subtotal, ${amountText}${statusSuffix}.`,
    title: statusParts.length > 0 ? `Subtotal ${statusParts.join(", ")}.` : "Live recursive subtotal.",
    showSkeleton: false,
  });
}

export function getEstimateTreeTotalsAnnouncement(snapshot: EstimateTreeTotalsSnapshot | null) {
  if (!snapshot || snapshot.dataState === "loading") return "Loading subtotals.";
  if (snapshot.dataState === "unavailable") return "Subtotals unavailable.";
  if (snapshot.mutationState === "rejected-retained") return "Subtotal changes were rejected and remain unsaved.";
  if (snapshot.mutationState === "rolled-back") return "Rejected subtotal changes were rolled back.";
  if (snapshot.dataState === "stale-error") return "Subtotals are stale because the latest update failed.";
  if (
    snapshot.dataState === "partial"
    || snapshot.completeness.nodes === "partial"
    || snapshot.completeness.rows === "partial"
  ) return "Subtotals are partial because not all estimate data is loaded.";
  if (snapshot.dataState === "updating") return "Updating subtotals.";
  return "";
}
