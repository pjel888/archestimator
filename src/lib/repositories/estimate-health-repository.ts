import "server-only";

import {
  DEFAULT_PRICE_FRESHNESS_POLICY,
  ESTIMATE_HEALTH_EVALUATOR_VERSION,
  evaluateEstimateHealth,
  getEstimateCostDrivers,
  type EstimateCostDriver,
  type EstimateHealthIssue,
  type EstimateHealthRowFact,
  type EstimateHealthSummary,
  type PriceFreshnessPolicy,
} from "@/lib/estimate-health";
import { getCloudflareD1Database, type D1DatabaseLike, type D1Value } from "@/lib/cloudflare/d1";
import { listProjectEstimates } from "@/lib/repositories/workspace-repository";

const FACT_LIMIT = 5_000;
const ISSUE_PAGE_SIZE = 100;

type EstimateHealthFactRow = {
  id: string;
  estimate_id: string;
  quantity: number | null;
  unit_cost: number | null;
  misc_cost: number | null;
  pricing_provenance_origin: EstimateHealthRowFact["pricingProvenanceOrigin"];
  source_snapshot_json: string | null;
  link_state: EstimateHealthRowFact["linkState"];
};

type ProjectBudgetRow = { target_budget: number | null };
type PolicyRow = {
  category_folder_id: string | null;
  category_node_id: string | null;
  revision: number;
  stale_days: number;
  very_stale_days: number;
};

export type EstimateHealthIssueSummary = Omit<EstimateHealthIssue, "rowIds">;
export type EstimateHealthIssueReference = {
  estimateId: string;
  rowId: string;
  ruleId: EstimateHealthIssue["ruleId"];
};
export type EstimateHealthIssuePage = {
  items: EstimateHealthIssueReference[];
  nextCursor: string | null;
  totalCount: number;
};
export type ProjectEstimateHealthData = {
  evaluatorVersion: typeof ESTIMATE_HEALTH_EVALUATOR_VERSION;
  selectedEstimateIds: string[];
  summary: EstimateHealthSummary;
  issues: EstimateHealthIssueSummary[];
  issuePage: EstimateHealthIssuePage;
  costDrivers: EstimateCostDriver[];
  policy: { workspace: PriceFreshnessPolicy; categories: Array<PriceFreshnessPolicy & { categoryId: string }> };
  truncated: boolean;
  rowLimit: number;
};

export async function getProjectEstimateHealthData(
  projectId: string,
  options: { selectedEstimateIds?: string[]; issueCursor?: string | null } = {},
): Promise<ProjectEstimateHealthData | null> {
  const authorized = await listProjectEstimates(projectId);
  if (!authorized.project) return null;

  const permittedEstimateIds = new Set(authorized.estimates.map((estimate) => estimate.id));
  const requested = options.selectedEstimateIds?.filter((id) => permittedEstimateIds.has(id)) ?? [];
  const selectedEstimateIds = [...new Set(requested.length > 0 ? requested : authorized.estimates.map((estimate) => estimate.id))].slice(0, 3);
  const database = await requireEstimateHealthDatabase();
  const budget = await first<ProjectBudgetRow>(database, "SELECT target_budget FROM projects WHERE id = ? AND workspace_id = ? LIMIT 1", [authorized.project.id, authorized.workspace.id]);
  const factResult = await loadFacts(database, selectedEstimateIds);
  const policies = await loadPolicies(database, authorized.workspace.id, factResult.categoryIds);
  const estimateBudgetById = new Map(authorized.estimates.map((estimate) => [estimate.id, estimate.project_budget]));
  const evaluation = evaluateEstimateHealth({
    clock: new Date().toISOString(),
    workspacePolicy: policies.workspace,
    categoryPolicies: policies.categories,
    projectTargetBudget: budget?.target_budget ?? null,
    estimateBudget: selectedEstimateIds.length === 1 ? estimateBudgetById.get(selectedEstimateIds[0]!) ?? null : null,
    rows: factResult.rows,
  });
  const issueReferences = evaluation.issues.flatMap((issue) => issue.rowIds.map((rowId) => ({
    estimateId: factResult.estimateIdByRowId.get(rowId) ?? "",
    rowId,
    ruleId: issue.ruleId,
  }))).filter((reference) => reference.estimateId);
  const offset = parseCursor(options.issueCursor);
  const pageItems = issueReferences.slice(offset, offset + ISSUE_PAGE_SIZE);
  const nextOffset = offset + pageItems.length;
  return {
    evaluatorVersion: ESTIMATE_HEALTH_EVALUATOR_VERSION,
    selectedEstimateIds,
    summary: { ...evaluation.summary, incomplete: evaluation.summary.incomplete || factResult.truncated },
    issues: evaluation.issues.map((issue) => ({
      ruleId: issue.ruleId,
      severity: issue.severity,
      messageKey: issue.messageKey,
      estimateId: issue.estimateId,
      count: issue.count,
      amountImpact: issue.amountImpact,
      filter: issue.filter,
    })),
    issuePage: { items: pageItems, totalCount: issueReferences.length, nextCursor: nextOffset < issueReferences.length ? `v1:${nextOffset}` : null },
    costDrivers: getEstimateCostDrivers(factResult.rows),
    policy: policies,
    truncated: factResult.truncated,
    rowLimit: FACT_LIMIT,
  };
}

async function loadFacts(database: D1DatabaseLike, estimateIds: string[]) {
  if (estimateIds.length === 0) return { rows: [] as EstimateHealthRowFact[], truncated: false, categoryIds: [] as string[], estimateIdByRowId: new Map<string, string>() };
  const placeholders = estimateIds.map(() => "?").join(", ");
  const records = await all<EstimateHealthFactRow>(database, `SELECT id, estimate_id, quantity, unit_cost, misc_cost, pricing_provenance_origin, source_snapshot_json, link_state FROM estimate_row_items WHERE estimate_id IN (${placeholders}) ORDER BY id ASC LIMIT ?`, [...estimateIds, FACT_LIMIT + 1]);
  const limited = records.slice(0, FACT_LIMIT);
  const estimateIdByRowId = new Map<string, string>();
  const categoryIds = new Set<string>();
  const rows = limited.map((record) => {
    const snapshot = readJsonRecord(record.source_snapshot_json);
    const categoryId = readString(snapshot.categoryId);
    if (categoryId) categoryIds.add(categoryId);
    estimateIdByRowId.set(record.id, record.estimate_id);
    const quantity = finite(record.quantity);
    const unitCost = finite(record.unit_cost);
    return {
      id: record.id,
      estimateId: record.estimate_id,
      categoryId,
      quantity,
      unitCost,
      amount: quantity * unitCost + finite(record.misc_cost),
      scopeStatus: readScopeStatus(snapshot.scopeStatus),
      pricingProvenanceOrigin: record.pricing_provenance_origin ?? null,
      pricingSource: readString(snapshot.pricingSource),
      pricingDate: readString(snapshot.pricingDate),
      linkState: record.link_state ?? "unlinked",
      lifecycleState: readLifecycleState(snapshot.lifecycleState),
    } satisfies EstimateHealthRowFact;
  });
  return { rows, truncated: records.length > FACT_LIMIT, categoryIds: [...categoryIds], estimateIdByRowId };
}

async function loadPolicies(database: D1DatabaseLike, workspaceId: string, categoryIds: string[]) {
  const records = await all<PolicyRow>(database, `SELECT category_folder_id, category_node_id, revision, stale_days, very_stale_days FROM workspace_price_freshness_policies WHERE workspace_id = ?${categoryIds.length ? ` AND ((category_folder_id IS NULL AND category_node_id IS NULL) OR category_folder_id IN (${categoryIds.map(() => "?").join(", ")}))` : " AND category_folder_id IS NULL AND category_node_id IS NULL"}`, [workspaceId, ...categoryIds]);
  const workspaceRecord = records.find((record) => record.category_folder_id === null && record.category_node_id === null);
  const workspace = toPolicy(workspaceRecord) ?? DEFAULT_PRICE_FRESHNESS_POLICY;
  const categories: Array<PriceFreshnessPolicy & { categoryId: string }> = [];
  for (const record of records) {
    const policy = toPolicy(record);
    if (record.category_folder_id && policy) {
      categories.push({ ...policy, categoryId: record.category_folder_id });
    }
  }
  return { workspace, categories };
}

function toPolicy(record: PolicyRow | undefined): PriceFreshnessPolicy | null {
  if (!record || !Number.isInteger(record.revision) || record.revision < 1 || !Number.isFinite(record.stale_days) || !Number.isFinite(record.very_stale_days) || record.stale_days <= 0 || record.very_stale_days <= record.stale_days) return null;
  return { revision: record.revision, staleDays: record.stale_days, veryStaleDays: record.very_stale_days };
}

function parseCursor(cursor: string | null | undefined) {
  const match = /^v1:(\d+)$/.exec(cursor ?? "");
  return match ? Math.min(Number(match[1]), Number.MAX_SAFE_INTEGER) : 0;
}

function finite(value: number | null) { return typeof value === "number" && Number.isFinite(value) ? value : 0; }
function readString(value: unknown) { return typeof value === "string" && value.trim() ? value : null; }
function readJsonRecord(value: string | null): Record<string, unknown> { try { const parsed = value ? JSON.parse(value) : null; return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {}; } catch { return {}; } }
function readScopeStatus(value: unknown): EstimateHealthRowFact["scopeStatus"] { return value === "excluded" || value === "by_owner" ? value : "included"; }
function readLifecycleState(value: unknown): EstimateHealthRowFact["lifecycleState"] { return value === "available" || value === "discontinued" || value === "archived" ? value : null; }
async function requireEstimateHealthDatabase() { const database = await getCloudflareD1Database(); if (!database) throw new Error("Something went wrong. Try again in a moment."); return database; }
async function all<T>(database: D1DatabaseLike, sql: string, values: D1Value[]) { const result = await database.prepare<T>(sql).bind(...values).all<T>(); if (result.success === false) throw new Error("Something went wrong. Try again in a moment."); return result.results ?? []; }
async function first<T>(database: D1DatabaseLike, sql: string, values: D1Value[]) { return database.prepare<T>(sql).bind(...values).first<T>(); }
