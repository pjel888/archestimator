import { createContext, useContext } from "react";
import { createStore } from "zustand/vanilla";

import type { EstimateRowMutationStatus, EstimateRowMutationStatusMap } from "@/hooks/use-estimate-row-mutations";
import { createEstimateTreeIndex, type EstimateTreeIndex } from "@/lib/estimates/estimate-tree-index";
import type { EstimateRowItem, EstimateTreeNode } from "../../estimate-tree-data";
import {
  buildEditableRowValue,
  computeEditableRowTotal,
  computeNodeTotals,
  type EditableRowValue,
} from "./editable-row-model";
import {
  classifyRowCommitIntent,
  createMakeProjectSpecificIntent,
  createSelectedVariantUpdateIntent,
  type RowCommitIntent,
  type SelectedVariantCommitInput,
} from "./row-commit-intent";

export type EditableRows = Record<string, EditableRowValue>;
export type EditableRowCommitPhase = "idle" | "dirty" | "awaiting-confirmation" | "pending" | "failed";

export type EditableRowCommitState = {
  phase: EditableRowCommitPhase;
  error: string | null;
  activeCommitToken: string | null;
  pendingIntent: RowCommitIntent | null;
  retainDraft: boolean;
};

export type EditableRowCommitLifecycle = {
  awaitingConfirmation: (affectedRowIds?: readonly string[]) => boolean;
  pending: (affectedRowIds?: readonly string[]) => boolean;
  committed: (authoritativeRows: EditableRows) => void;
  rejected: (error: Error, policy: "rollback" | "retain-draft") => void;
  cancelled: () => void;
};

export type EditableRowCommitAdapters = {
  commit: (intent: RowCommitIntent, lifecycle: EditableRowCommitLifecycle) => void;
  requestMakeProjectSpecific: (intent: Extract<RowCommitIntent, { kind: "make-project-specific" }>, lifecycle: EditableRowCommitLifecycle) => void;
  markDirty: () => void;
  markClean: () => void;
};

export type EditableRowStoreState = {
  rows: EditableRows;
  authoritativeRows: EditableRows;
  rowCommitStates: Record<string, EditableRowCommitState>;
  externalMutationStatuses: EstimateRowMutationStatusMap;
  componentSyncPendingRowIds: ReadonlySet<string>;
  tree: EstimateTreeNode[];
  treeIndex: EstimateTreeIndex;
  nodeTotals: Map<string, number>;
  projectTotal: number;
  revision: number;
  replaceRows: (rows: EditableRows) => void;
  syncTree: (tree: EstimateTreeNode[]) => void;
  stageRow: (item: EstimateRowItem, patch: Partial<EditableRowValue>) => void;
  commitRowFields: (item: EstimateRowItem, values: Partial<EditableRowValue>) => void;
  commitRowFieldsAwaited: (item: EstimateRowItem, values: Partial<EditableRowValue>) => Promise<void>;
  commitSelectedVariant: (item: EstimateRowItem, option: SelectedVariantCommitInput) => void;
  requestMakeProjectSpecific: (item: EstimateRowItem) => void;
  commitMakeProjectSpecific: (item: EstimateRowItem) => void;
  syncAuthoritativeRows: (rows: EditableRows) => void;
  syncExternalMutationStatuses: (
    statuses: EstimateRowMutationStatusMap,
    componentSyncPendingRowIds: ReadonlySet<string>,
  ) => void;
  setCommitAdapters: (adapters: EditableRowCommitAdapters) => void;
};

export type EditableRowStore = ReturnType<typeof createEditableRowStore>;
export const EditableRowStoreContext = createContext<EditableRowStore | null>(null);

export const EMPTY_EDITABLE_ROW_COMMIT_STATE: EditableRowCommitState = Object.freeze({
  phase: "idle",
  error: null,
  activeCommitToken: null,
  pendingIntent: null,
  retainDraft: false,
});

export function useEditableRowStore() {
  const store = useContext(EditableRowStoreContext);
  if (!store) throw new Error("Editable row store is unavailable.");
  return store;
}

export function selectEditableRowCommitState(state: EditableRowStoreState, rowId: string) {
  return state.rowCommitStates[rowId] ?? EMPTY_EDITABLE_ROW_COMMIT_STATE;
}

export function selectExternalRowMutationStatus(state: EditableRowStoreState, rowId: string): EstimateRowMutationStatus | undefined {
  return state.externalMutationStatuses[rowId];
}

function getProjectTotal(tree: EstimateTreeNode[], nodeTotals: ReadonlyMap<string, number>) {
  return tree.reduce((total, node) => total + (nodeTotals.get(node.id) ?? 0), 0);
}

function calculateTotals(tree: EstimateTreeNode[], rows: EditableRows) {
  const nodeTotals = computeNodeTotals(tree, rows);
  return { nodeTotals, projectTotal: getProjectTotal(tree, nodeTotals) };
}

function editableRowValuesEqual(left: EditableRowValue | undefined, right: EditableRowValue | undefined) {
  if (left === right) return true;
  if (!left || !right) return false;
  const leftKeys = Object.keys(left) as Array<keyof EditableRowValue>;
  const rightKeys = Object.keys(right) as Array<keyof EditableRowValue>;
  return leftKeys.length === rightKeys.length && leftKeys.every((key) => left[key] === right[key]);
}

function shareEditableRows(current: EditableRows, next: EditableRows) {
  let allRowsEqual = Object.keys(current).length === Object.keys(next).length;
  let shared: EditableRows | null = null;
  for (const [rowId, nextRow] of Object.entries(next)) {
    const currentRow = current[rowId];
    if (!editableRowValuesEqual(currentRow, nextRow)) {
      allRowsEqual = false;
      continue;
    }
    if (currentRow !== nextRow) {
      shared ??= { ...next };
      shared[rowId] = currentRow;
    }
  }
  if (allRowsEqual) return current;
  return shared ?? next;
}

let commitTokenSequence = 0;
function createCommitToken(prefix: "draft" | "commit") {
  commitTokenSequence += 1;
  const randomPart = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${commitTokenSequence}`;
  return `${prefix}:${randomPart}`;
}

function isProtectedDraft(state: EditableRowCommitState | undefined) {
  return Boolean(state && (
    state.phase === "dirty"
    || state.phase === "pending"
    || state.phase === "awaiting-confirmation"
    || (state.phase === "failed" && state.retainDraft)
  ));
}

function hasDirtyCommitState(states: Record<string, EditableRowCommitState>) {
  return Object.values(states).some((state) => isProtectedDraft(state));
}

const failClosedCommitAdapters: EditableRowCommitAdapters = {
  commit: (_intent, lifecycle) => lifecycle.rejected(new Error("Row commit adapters are unavailable."), "rollback"),
  requestMakeProjectSpecific: (_intent, lifecycle) => lifecycle.rejected(new Error("Row commit adapters are unavailable."), "rollback"),
  markDirty: () => undefined,
  markClean: () => undefined,
};

export function createEditableRowStore(initialRows: EditableRows, initialTree: EstimateTreeNode[]) {
  const initialTotals = calculateTotals(initialTree, initialRows);
  let commitAdapters: EditableRowCommitAdapters = failClosedCommitAdapters;

  const store = createStore<EditableRowStoreState>((set, get) => {
    const notifyDirtyState = () => {
      if (hasDirtyCommitState(get().rowCommitStates)) commitAdapters.markDirty();
      else commitAdapters.markClean();
    };

    const applyRowPatch = (
      item: EstimateRowItem,
      patch: Partial<EditableRowValue>,
      commitState?: EditableRowCommitState,
    ) => {
      set((state) => {
        const previousRowTotal = computeEditableRowTotal(item, state.rows);
        const nextRow = buildEditableRowValue(item, state.rows[item.id], patch);
        const nextRows = { ...state.rows, [item.id]: nextRow };
        const nextRowTotal = computeEditableRowTotal(item, nextRows);
        const totalDelta = nextRowTotal - previousRowTotal;
        const nextNodeTotals = totalDelta === 0 ? state.nodeTotals : new Map(state.nodeTotals);
        if (totalDelta !== 0) {
          const location = state.treeIndex.rowsById.get(item.id);
          if (location) {
            for (const nodeId of location.ancestorNodeIds) {
              nextNodeTotals.set(nodeId, (nextNodeTotals.get(nodeId) ?? 0) + totalDelta);
            }
          }
        }
        return {
          rows: nextRows,
          nodeTotals: nextNodeTotals,
          projectTotal: state.projectTotal + totalDelta,
          revision: state.revision + 1,
          ...(commitState ? { rowCommitStates: { ...state.rowCommitStates, [item.id]: commitState } } : {}),
        };
      });
    };

    const settleNoop = (rowId: string) => {
      set((state) => {
        const current = state.rowCommitStates[rowId];
        const authoritativeRow = state.authoritativeRows[rowId];
        const hasDraft = Boolean(authoritativeRow && !editableRowValuesEqual(state.rows[rowId], authoritativeRow));
        if (current?.phase === "pending" || current?.phase === "awaiting-confirmation" || hasDraft) return state;
        if (!current) return state;
        const nextStates = { ...state.rowCommitStates };
        delete nextStates[rowId];
        return { rowCommitStates: nextStates };
      });
      notifyDirtyState();
    };

    const beginIntent = (
      intent: RowCommitIntent,
      mode: "commit" | "request",
      completion?: { resolve: () => void; reject: (error: Error) => void },
    ) => {
      const token = createCommitToken("commit");
      const affectedRowIds = new Set<string>([intent.rowId]);
      set((state) => ({
        rowCommitStates: {
          ...state.rowCommitStates,
          [intent.rowId]: {
            phase: mode === "request" ? "awaiting-confirmation" : "pending",
            error: null,
            activeCommitToken: token,
            pendingIntent: intent,
            retainDraft: false,
          },
        },
      }));
      notifyDirtyState();

      const bindAffectedRows = (phase: "awaiting-confirmation" | "pending", rowIds?: readonly string[]) => {
        const nextAffectedRowIds = rowIds?.length ? rowIds : [intent.rowId];
        nextAffectedRowIds.forEach((rowId) => affectedRowIds.add(rowId));
        let ownsInitiatingRow = false;
        set((state) => {
          let didChange = false;
          const nextStates = { ...state.rowCommitStates };
          for (const rowId of nextAffectedRowIds) {
            const current = state.rowCommitStates[rowId];
            const ownsToken = current?.activeCommitToken === token;
            if (rowId === intent.rowId && !ownsToken) continue;
            if (rowId !== intent.rowId && !ownsToken && (current?.activeCommitToken || isProtectedDraft(current))) continue;
            nextStates[rowId] = {
              phase,
              error: null,
              activeCommitToken: token,
              pendingIntent: intent,
              retainDraft: false,
            };
            if (rowId === intent.rowId) ownsInitiatingRow = true;
            didChange = true;
          }
          return didChange ? { rowCommitStates: nextStates } : state;
        });
        notifyDirtyState();
        return ownsInitiatingRow;
      };

      const lifecycle: EditableRowCommitLifecycle = {
        awaitingConfirmation: (rowIds) => bindAffectedRows("awaiting-confirmation", rowIds),
        pending: (rowIds) => bindAffectedRows("pending", rowIds),
        committed: (authoritativeRows) => {
          set((state) => {
            const affectedAuthoritativeRows = Object.fromEntries(
              Object.entries(authoritativeRows).filter(([rowId]) => (
                affectedRowIds.has(rowId)
                && state.rowCommitStates[rowId]?.activeCommitToken === token
              )),
            );
            if (Object.keys(affectedAuthoritativeRows).length === 0) return state;
            const nextAuthoritativeRows = shareEditableRows(state.authoritativeRows, {
              ...state.authoritativeRows,
              ...affectedAuthoritativeRows,
            });
            let nextRows = state.rows;
            let nextStates = state.rowCommitStates;
            for (const rowId of Object.keys(affectedAuthoritativeRows)) {
              const authoritativeRow = nextAuthoritativeRows[rowId];
              if (!authoritativeRow) continue;
              if (!editableRowValuesEqual(nextRows[rowId], authoritativeRow)) {
                if (nextRows === state.rows) nextRows = { ...state.rows };
                nextRows[rowId] = authoritativeRow;
              }
              if (nextStates === state.rowCommitStates) nextStates = { ...state.rowCommitStates };
              delete nextStates[rowId];
            }
            return {
              authoritativeRows: nextAuthoritativeRows,
              rows: nextRows,
              rowCommitStates: nextStates,
              ...calculateTotals(state.tree, nextRows),
              revision: nextRows === state.rows ? state.revision : state.revision + 1,
            };
          });
          notifyDirtyState();
          completion?.resolve();
        },
        rejected: (error, policy) => {
          set((state) => {
            let nextRows = state.rows;
            let nextStates = state.rowCommitStates;
            for (const rowId of affectedRowIds) {
              const current = state.rowCommitStates[rowId];
              if (current?.activeCommitToken !== token) continue;
              if (policy === "rollback") {
                const authoritativeRow = state.authoritativeRows[rowId];
                if (authoritativeRow && !editableRowValuesEqual(nextRows[rowId], authoritativeRow)) {
                  if (nextRows === state.rows) nextRows = { ...state.rows };
                  nextRows[rowId] = authoritativeRow;
                }
              }
              if (nextStates === state.rowCommitStates) nextStates = { ...state.rowCommitStates };
              nextStates[rowId] = {
                phase: "failed",
                error: error.message,
                activeCommitToken: policy === "retain-draft" ? token : null,
                pendingIntent: policy === "retain-draft" ? intent : null,
                retainDraft: policy === "retain-draft",
              };
            }
            return {
              rows: nextRows,
              rowCommitStates: nextStates,
              ...calculateTotals(state.tree, nextRows),
              revision: nextRows === state.rows ? state.revision : state.revision + 1,
            };
          });
          notifyDirtyState();
          completion?.reject(error);
        },
        cancelled: () => {
          set((state) => {
            let nextRows = state.rows;
            let nextStates = state.rowCommitStates;
            for (const rowId of affectedRowIds) {
              const current = state.rowCommitStates[rowId];
              if (current?.activeCommitToken !== token) continue;
              const authoritativeRow = state.authoritativeRows[rowId];
              if (authoritativeRow && !editableRowValuesEqual(nextRows[rowId], authoritativeRow)) {
                if (nextRows === state.rows) nextRows = { ...state.rows };
                nextRows[rowId] = authoritativeRow;
              }
              if (nextStates === state.rowCommitStates) nextStates = { ...state.rowCommitStates };
              delete nextStates[rowId];
            }
            return {
              rows: nextRows,
              rowCommitStates: nextStates,
              ...calculateTotals(state.tree, nextRows),
              revision: nextRows === state.rows ? state.revision : state.revision + 1,
            };
          });
          notifyDirtyState();
          completion?.reject(new Error("Row save was cancelled."));
        },
      };

      try {
        if (mode === "request" && intent.kind === "make-project-specific") {
          commitAdapters.requestMakeProjectSpecific(intent, lifecycle);
        } else {
          commitAdapters.commit(intent, lifecycle);
        }
      } catch (error) {
        lifecycle.rejected(error instanceof Error ? error : new Error("Could not save the row change."), "rollback");
      }
    };

    return {
      rows: initialRows,
      authoritativeRows: initialRows,
      rowCommitStates: {},
      externalMutationStatuses: {},
      componentSyncPendingRowIds: new Set(),
      tree: initialTree,
      treeIndex: createEstimateTreeIndex(initialTree),
      ...initialTotals,
      revision: 0,
      replaceRows: (rows) => {
        set((state) => {
          const nextRows = shareEditableRows(state.rows, rows);
          const nextRowIds = new Set(Object.keys(nextRows));
          const retainedStates = Object.fromEntries(
            Object.entries(state.rowCommitStates).filter(([rowId]) => nextRowIds.has(rowId)),
          );
          const nextStates = Object.keys(retainedStates).length === Object.keys(state.rowCommitStates).length
            ? state.rowCommitStates
            : retainedStates;
          const retainedAuthoritativeRows = Object.fromEntries(
            Object.entries(state.authoritativeRows).filter(([rowId]) => nextRowIds.has(rowId)),
          );
          for (const rowId of nextRowIds) {
            retainedAuthoritativeRows[rowId] ??= nextRows[rowId];
          }
          const nextAuthoritativeRows = shareEditableRows(state.authoritativeRows, retainedAuthoritativeRows);
          if (
            state.rows === nextRows
            && state.rowCommitStates === nextStates
            && state.authoritativeRows === nextAuthoritativeRows
          ) return state;
          return {
            rows: nextRows,
            authoritativeRows: nextAuthoritativeRows,
            rowCommitStates: nextStates,
            ...calculateTotals(state.tree, nextRows),
            revision: state.rows === nextRows ? state.revision : state.revision + 1,
          };
        });
        notifyDirtyState();
      },
      syncTree: (tree) => set((state) => {
        if (state.tree === tree) return state;
        return {
          tree,
          treeIndex: createEstimateTreeIndex(tree),
          ...calculateTotals(tree, state.rows),
          revision: state.revision + 1,
        };
      }),
      stageRow: (item, patch) => {
        const commitState: EditableRowCommitState = {
          phase: "dirty",
          error: null,
          activeCommitToken: createCommitToken("draft"),
          pendingIntent: null,
          retainDraft: true,
        };
        applyRowPatch(item, patch, commitState);
        notifyDirtyState();
      },
      commitRowFields: (item, values) => {
        if (Object.keys(values).length === 0) {
          settleNoop(item.id);
          return;
        }
        applyRowPatch(item, values, {
          phase: "dirty",
          error: null,
          activeCommitToken: createCommitToken("draft"),
          pendingIntent: null,
          retainDraft: true,
        });
        beginIntent(classifyRowCommitIntent(item, values), "commit");
      },
      commitRowFieldsAwaited: (item, values) => {
        if (Object.keys(values).length === 0) {
          settleNoop(item.id);
          return Promise.resolve();
        }
        applyRowPatch(item, values, {
          phase: "dirty",
          error: null,
          activeCommitToken: createCommitToken("draft"),
          pendingIntent: null,
          retainDraft: true,
        });
        return new Promise<void>((resolve, reject) => {
          beginIntent(classifyRowCommitIntent(item, values), "commit", { resolve, reject });
        });
      },
      commitSelectedVariant: (item, option) => {
        const intent = createSelectedVariantUpdateIntent(item, option);
        applyRowPatch(item, intent.values, {
          phase: "dirty",
          error: null,
          activeCommitToken: createCommitToken("draft"),
          pendingIntent: null,
          retainDraft: true,
        });
        beginIntent(intent, "commit");
      },
      requestMakeProjectSpecific: (item) => {
        const row = get().rows[item.id] ?? buildEditableRowValue(item, undefined, {});
        beginIntent(createMakeProjectSpecificIntent(item, row), "request");
      },
      commitMakeProjectSpecific: (item) => {
        const row = get().rows[item.id] ?? buildEditableRowValue(item, undefined, {});
        beginIntent(createMakeProjectSpecificIntent(item, row), "commit");
      },
      syncAuthoritativeRows: (rows) => {
        set((state) => {
          let candidateAuthoritativeRows = rows;
          let nextRows = rows;
          for (const [rowId, currentRow] of Object.entries(state.rows)) {
            const nextAuthoritativeRow = rows[rowId];
            const rowState = state.rowCommitStates[rowId];
            if (!nextAuthoritativeRow || !isProtectedDraft(rowState)) continue;
            const confirmedRow = state.authoritativeRows[rowId];
            if (confirmedRow && !editableRowValuesEqual(nextAuthoritativeRow, confirmedRow)) {
              if (candidateAuthoritativeRows === rows) candidateAuthoritativeRows = { ...rows };
              candidateAuthoritativeRows[rowId] = confirmedRow;
            }
            if (!editableRowValuesEqual(currentRow, nextAuthoritativeRow)) {
              if (nextRows === rows) nextRows = { ...rows };
              nextRows[rowId] = currentRow;
            }
          }
          const nextAuthoritativeRows = shareEditableRows(state.authoritativeRows, candidateAuthoritativeRows);
          nextRows = shareEditableRows(state.rows, nextRows);
          const nextRowIds = new Set(Object.keys(rows));
          const retainedStates = Object.fromEntries(
            Object.entries(state.rowCommitStates).filter(([rowId]) => nextRowIds.has(rowId)),
          );
          const nextStates = Object.keys(retainedStates).length === Object.keys(state.rowCommitStates).length
            ? state.rowCommitStates
            : retainedStates;
          if (
            nextRows === state.rows
            && nextAuthoritativeRows === state.authoritativeRows
            && nextStates === state.rowCommitStates
          ) return state;
          return {
            rows: nextRows,
            authoritativeRows: nextAuthoritativeRows,
            rowCommitStates: nextStates,
            ...calculateTotals(state.tree, nextRows),
            revision: nextRows === state.rows ? state.revision : state.revision + 1,
          };
        });
        notifyDirtyState();
      },
      syncExternalMutationStatuses: (statuses, pendingRowIds) => set({
        externalMutationStatuses: statuses,
        componentSyncPendingRowIds: pendingRowIds,
      }),
      setCommitAdapters: (adapters) => {
        commitAdapters = adapters;
      },
    };
  });

  return store;
}
