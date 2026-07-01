/**
 * Canonical estimate-list row shared by the repository, server actions, client
 * store, and table.
 *
 * It deliberately does NOT extend the generated database estimates row type, and
 * must never import broad generated database row types: the list UI must not carry
 * `metadata`, `created_by`,
 * `workspace_id`, or legacy `assumptions` to the client (over-fetch + data
 * exposure — finding F9). Only fields the list renders, or the optimistic store
 * reconciles, belong here. Adding a sensitive field here is a regression the
 * `project-estimate-list-row-contract` test is designed to catch.
 */

/** Client-only optimistic status. Never populated from server data. */
export type ProjectEstimateListRowStatus = "creating" | "duplicating";

export type ProjectEstimateListRow = {
  id: string;
  project_id: string;
  name: string;
  sheet_code: string;
  currency_code: string;
  notes: string | null;
  project_budget: number | null;
  created_at: string;
  updated_at: string;
  firstNodeId: string | null;
  nodeCount: number;
  rowItemCount: number;
  totalProjectCost: number;
  isFavorite: boolean;
  favoriteCreatedAt: string | null;
  /** Client-only optimistic metadata. Never serialized from the server. */
  pendingStatus?: ProjectEstimateListRowStatus;
  pendingError?: string | null;
};

/**
 * The settled (server-canonical) fields the mapper emits. Kept as a runtime
 * constant so the contract test can assert the mapper output never includes a
 * sensitive column even when its input row carries one.
 */
export const PROJECT_ESTIMATE_LIST_ROW_FIELDS = [
  "id",
  "project_id",
  "name",
  "sheet_code",
  "currency_code",
  "notes",
  "project_budget",
  "created_at",
  "updated_at",
  "firstNodeId",
  "nodeCount",
  "rowItemCount",
  "totalProjectCost",
  "isFavorite",
  "favoriteCreatedAt",
] as const;

/**
 * The estimate record fields the list row reads. The normalized estimate record
 * (and the generated estimates row type) is structurally assignable to this, so
 * callers can pass a normalized record directly without this module importing DB
 * types.
 */
export type ProjectEstimateListRowSource = {
  id: string;
  project_id: string;
  name: string;
  sheet_code: string;
  currency_code: string;
  notes: string | null;
  project_budget: number | null;
  created_at: string;
  updated_at: string;
};

export type ProjectEstimateListRowSummary = {
  firstNodeId: string | null;
  nodeCount: number;
  rowItemCount: number;
  totalProjectCost: number;
  isFavorite: boolean;
  favoriteCreatedAt: string | null;
};

/**
 * Build a canonical list row from a selected/normalized estimate record plus its
 * aggregate summary. Explicitly projects each field so sensitive columns present
 * on the source object (e.g. `metadata`, `created_by`) are never carried over.
 */
export function buildProjectEstimateListRow(
  estimate: ProjectEstimateListRowSource,
  summary: ProjectEstimateListRowSummary,
): ProjectEstimateListRow {
  return {
    ...projectEstimateListRowSource(estimate),
    firstNodeId: summary.firstNodeId,
    nodeCount: summary.nodeCount,
    rowItemCount: summary.rowItemCount,
    totalProjectCost: summary.totalProjectCost,
    isFavorite: summary.isFavorite,
    favoriteCreatedAt: summary.favoriteCreatedAt,
  };
}

/**
 * Project just the canonical estimate scalar fields, dropping any sensitive
 * columns the source object may carry. Used as the reconciliation payload for
 * scalar-only mutations (rename/notes/budget/auto-code) where the optimistic
 * store preserves its existing summary fields.
 */
export function projectEstimateListRowSource(
  estimate: ProjectEstimateListRowSource,
): ProjectEstimateListRowSource {
  return {
    id: estimate.id,
    project_id: estimate.project_id,
    name: estimate.name,
    sheet_code: estimate.sheet_code,
    currency_code: estimate.currency_code,
    notes: estimate.notes,
    project_budget: estimate.project_budget,
    created_at: estimate.created_at,
    updated_at: estimate.updated_at,
  };
}
