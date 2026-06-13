import { createStore } from "zustand/vanilla";

import type { ProjectEstimateListRow } from "@/lib/estimates/project-estimate-list-row";

export type { ProjectEstimateListRow };

/**
 * Per-mount client store holding the project's estimate list. This is the
 * optimistic-UI unlock (D2): create/duplicate/delete/inline-edit mutate the
 * store synchronously so the table reflects the change before the server
 * resolves, replacing the global blur overlay + full `router.refresh()`.
 *
 * Conflict policy (D9 / P-1.3):
 * - `pendingInsertIds` tracks optimistic inserts (create + duplicate) until they
 *   reconcile or roll back.
 * - `reseed` (driven by a server-prop change) refreshes settled rows but never
 *   erases a still-pending optimistic row.
 * - `removeOptimistic` returns a position-restoring rollback so a failed delete
 *   puts rows back where they were even if the list shifted meanwhile.
 */
export type ProjectEstimatesStoreState = {
  estimates: ProjectEstimateListRow[];
  pendingInsertIds: Set<string>;
  reseed: (rows: ProjectEstimateListRow[]) => void;
  insertOptimistic: (row: ProjectEstimateListRow) => void;
  reconcileInsert: (tempId: string, row: ProjectEstimateListRow) => void;
  rollbackInsert: (tempId: string) => void;
  /** Removes rows optimistically and returns a rollback that restores them. */
  removeOptimistic: (ids: string[]) => () => void;
  patch: (id: string, patch: Partial<ProjectEstimateListRow>) => void;
};

export type ProjectEstimatesStore = ReturnType<typeof createProjectEstimatesStore>;

export function createProjectEstimatesStore(initial: ProjectEstimateListRow[]) {
  return createStore<ProjectEstimatesStoreState>((set, get) => ({
    estimates: initial,
    pendingInsertIds: new Set<string>(),

    reseed: (rows) =>
      set((s) => {
        // Keep pending optimistic rows (not yet reconciled) ahead of the server
        // rows so an external prop reseed never erases an in-flight mutation.
        const pendingRows = s.estimates.filter((e) => s.pendingInsertIds.has(e.id));
        const pendingIds = new Set(pendingRows.map((r) => r.id));
        const settledRows = rows.filter((r) => !pendingIds.has(r.id));
        return { estimates: [...pendingRows, ...settledRows] };
      }),

    insertOptimistic: (row) =>
      set((s) => {
        const pendingInsertIds = new Set(s.pendingInsertIds);
        pendingInsertIds.add(row.id);
        return { estimates: [row, ...s.estimates], pendingInsertIds };
      }),

    reconcileInsert: (tempId, row) =>
      set((s) => {
        const pendingInsertIds = new Set(s.pendingInsertIds);
        pendingInsertIds.delete(tempId);
        return {
          pendingInsertIds,
          estimates: s.estimates.map((e) => (e.id === tempId ? row : e)),
        };
      }),

    rollbackInsert: (tempId) =>
      set((s) => {
        const pendingInsertIds = new Set(s.pendingInsertIds);
        pendingInsertIds.delete(tempId);
        return {
          pendingInsertIds,
          estimates: s.estimates.filter((e) => e.id !== tempId),
        };
      }),

    removeOptimistic: (ids) => {
      const idSet = new Set(ids);
      const removed = get()
        .estimates.map((row, index) => ({ row, index }))
        .filter((entry) => idSet.has(entry.row.id));
      set((s) => ({ estimates: s.estimates.filter((e) => !idSet.has(e.id)) }));

      return () =>
        set((s) => {
          const present = new Set(s.estimates.map((e) => e.id));
          const missing = removed.filter((entry) => !present.has(entry.row.id));
          if (missing.length === 0) return s;
          const next = [...s.estimates];
          for (const { row, index } of [...missing].sort((a, b) => a.index - b.index)) {
            next.splice(Math.min(index, next.length), 0, row);
          }
          return { estimates: next };
        });
    },

    patch: (id, patch) =>
      set((s) => ({
        estimates: s.estimates.map((e) => (e.id === id ? { ...e, ...patch } : e)),
      })),
  }));
}
