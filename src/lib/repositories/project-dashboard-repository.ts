import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/types";
import type {
  DashboardCostRollup,
  DashboardEstimateSheet,
  DashboardHeadline,
  DashboardOtherEstimate,
  DashboardReadiness,
  DashboardReadinessItem,
  DashboardRisk,
  DashboardVariance,
  ProjectDashboardSummary,
} from "@/lib/workshop/dashboard-types";
import type { ProjectPublicationSummary } from "@/lib/publication/types";

import { buildEstimateSeries } from "../project-charts/project-comparison-view";
import { getCurrentWorkspaceProject, getProjectPublicationSummary, listProjectEstimates } from "./workspace-repository";
import type {
  ProjectChartCategoryNodeFact,
  ProjectChartEstimateOption,
  ProjectChartEstimateSeries,
  ProjectChartGroupingMode,
  ProjectChartNodeFact,
  ProjectChartRowFact,
  ProjectChartSupplierFact,
} from "../project-charts/types";

/**
 * Single-estimate cost-series source for the project dashboard's cost-mix donut
 * (Zone B). Deliberately NOT a wrapper around `getProjectChartsData`: in
 * `all-estimates` mode that loader fetches rows+nodes for EVERY estimate and
 * ignores `selectedEstimateIds` (`00-current-state-audit.md` §4.1 / KTD-1), so
 * rendering one donut would over-fetch the whole project. This loads exactly one
 * estimate's facts and reuses the pure `buildEstimateSeries` so the dashboard
 * donut, table, colours, and figures cannot drift from the Compare tab (R14).
 *
 * Caps are re-derived per-estimate (KTD-1): they bound a single estimate, not a
 * shared budget split across ~20 estimates like the charts repo's cross-estimate
 * loader.
 */
export const DASHBOARD_ESTIMATE_ROW_LIMIT = 5000;
export const DASHBOARD_ESTIMATE_NODE_LIMIT = 1500;
const CATEGORY_FACT_LIMIT = 1000;
const SUPPLIER_FACT_LIMIT = 1000;

type JsonRecord = Record<string, unknown>;
type EstimateRowItemChartRow = Pick<
  Tables<"estimate_row_items">,
  "id" | "estimate_id" | "node_id" | "source_snapshot" | "supplier" | "quantity" | "unit_cost" | "contingency_percentage" | "misc_cost"
>;
type EstimateNodeChartRow = Pick<Tables<"estimate_nodes">, "id" | "estimate_id" | "parent_id" | "kind" | "name" | "sort_order">;
type EstimateMetaRow = Pick<Tables<"estimates">, "id" | "name" | "sheet_code" | "currency_code" | "updated_at">;

type LimitedLoadResult<T> = {
  rows: T[];
  didHitLimit: boolean;
};

export type DashboardEstimateSeriesResult = {
  estimateId: string;
  estimateName: string;
  currencyCode: string;
  /** Pre-bucketed series for every grouping mode (space / category / supplier). */
  series: ProjectChartEstimateSeries;
  /** Whether row/node loads hit their per-estimate cap, so figures may be partial. */
  didTruncate: boolean;
};

/**
 * Load one estimate's pre-bucketed cost series. Returns `null` when the project
 * or the estimate is not visible to the caller (RLS / foreign id), never a leak.
 */
export async function getDashboardEstimateSeries(
  projectId: string,
  estimateId: string,
): Promise<DashboardEstimateSeriesResult | null> {
  const { workspace, project } = await getCurrentWorkspaceProject(projectId);
  if (!project) return null;

  const supabase = await createSupabaseServerClient();

  // Scope on BOTH project_id and id: an estimate id from another project (or an
  // unknown id) returns no row, so the dashboard never renders foreign cost.
  const { data: estimateRow, error: estimateError } = await supabase
    .from("estimates")
    .select("id, name, sheet_code, currency_code, updated_at")
    .eq("project_id", project.id)
    .eq("id", estimateId)
    .maybeSingle();

  if (estimateError) {
    throw new Error(`Failed to load dashboard estimate: ${estimateError.message}`);
  }
  if (!estimateRow) return null;

  const meta = estimateRow as EstimateMetaRow;

  const [rowFactsResult, nodeFactsResult, categoryNodeFactsResult, supplierFactsResult] = await Promise.all([
    loadEstimateRowFacts(supabase, estimateId),
    loadEstimateNodeFacts(supabase, estimateId),
    loadCategoryFacts(supabase),
    loadSupplierFacts(supabase, workspace.id),
  ]);

  const rowFacts = rowFactsResult.rows;

  const estimateOption: ProjectChartEstimateOption = {
    id: meta.id,
    name: meta.name,
    sheetCode: meta.sheet_code,
    currencyCode: meta.currency_code,
    updatedAt: meta.updated_at,
    rowCount: rowFacts.length,
    totalCost: rowFacts.reduce((sum, row) => {
      const subTotal = finite(row.quantity) * finite(row.unitCost);
      return sum + subTotal + finite(row.miscCost) + (subTotal * finite(row.contingencyPercentage ?? 0)) / 100;
    }, 0),
  };

  // Reuse the pure aggregation engine so colours/figures match Compare (R14).
  // Raw facts (qty, unit cost, supplier ids) never leave the server; only the
  // pre-bucketed series is returned.
  const series = buildEstimateSeries(
    {
      estimates: [estimateOption],
      rows: rowFacts,
      nodes: nodeFactsResult.rows,
      categoryNodes: categoryNodeFactsResult.rows,
      suppliers: supplierFactsResult.rows,
    },
    estimateId,
  );

  return {
    estimateId: meta.id,
    estimateName: meta.name,
    currencyCode: meta.currency_code || "PHP",
    series,
    didTruncate: rowFactsResult.didHitLimit || nodeFactsResult.didHitLimit,
  };
}

async function loadEstimateRowFacts(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  estimateId: string,
): Promise<LimitedLoadResult<ProjectChartRowFact>> {
  const { data, error } = await supabase
    .from("estimate_row_items")
    .select("id, estimate_id, node_id, supplier, source_snapshot, quantity, unit_cost, contingency_percentage, misc_cost")
    .eq("estimate_id", estimateId)
    // Deterministic order before truncation: a capped estimate keeps the SAME
    // rows across loads, so totals don't silently shuffle.
    .order("id", { ascending: true })
    .limit(DASHBOARD_ESTIMATE_ROW_LIMIT + 1);

  if (error) {
    throw new Error(`Failed to load dashboard rows: ${error.message}`);
  }

  const limited = limitLoadedRows((data ?? []) as EstimateRowItemChartRow[], DASHBOARD_ESTIMATE_ROW_LIMIT);
  return {
    didHitLimit: limited.didHitLimit,
    rows: limited.rows.map((row) => {
      const sourceSnapshot = readJsonRecord(row.source_snapshot);
      const supplierId = readString(sourceSnapshot.supplierId);
      return {
        id: row.id,
        estimateId: row.estimate_id,
        nodeId: row.node_id,
        categoryNodeId: readString(sourceSnapshot.categoryNodeId),
        supplierId,
        supplierName: row.supplier,
        sourceSupplierId: supplierId,
        sourceSupplierName: readString(sourceSnapshot.supplier),
        quantity: finite(Number(row.quantity)),
        unitCost: finite(Number(row.unit_cost)),
        contingencyPercentage: finite(Number(row.contingency_percentage ?? 0)),
        miscCost: finite(Number(row.misc_cost)),
      };
    }),
  };
}

async function loadEstimateNodeFacts(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  estimateId: string,
): Promise<LimitedLoadResult<ProjectChartNodeFact>> {
  const { data, error } = await supabase
    .from("estimate_nodes")
    .select("id, estimate_id, parent_id, kind, name, sort_order")
    .eq("estimate_id", estimateId)
    .order("sort_order", { ascending: true })
    .limit(DASHBOARD_ESTIMATE_NODE_LIMIT + 1);

  if (error) {
    throw new Error(`Failed to load dashboard estimate nodes: ${error.message}`);
  }

  const limited = limitLoadedRows((data ?? []) as EstimateNodeChartRow[], DASHBOARD_ESTIMATE_NODE_LIMIT);
  return {
    didHitLimit: limited.didHitLimit,
    rows: limited.rows.map((node) => ({
      id: node.id,
      estimateId: node.estimate_id,
      parentId: node.parent_id,
      kind: node.kind === "area" ? "Area" : "Group",
      name: node.name,
      sortOrder: node.sort_order ?? 0,
    })),
  };
}

async function loadCategoryFacts(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
): Promise<LimitedLoadResult<ProjectChartCategoryNodeFact>> {
  // Global taxonomy by design (no workspace_id, `using(true)` read policy):
  // buckets key on the global category id so identical categories share a bucket.
  const { data, error } = await supabase
    .from("component_category_nodes")
    .select("id, parent_id, node_type, label, sort_order")
    .order("sort_order", { ascending: true })
    .limit(CATEGORY_FACT_LIMIT + 1);

  if (error) {
    throw new Error(`Failed to load dashboard categories: ${error.message}`);
  }

  const limited = limitLoadedRows(data ?? [], CATEGORY_FACT_LIMIT);
  return {
    didHitLimit: limited.didHitLimit,
    rows: limited.rows.map((node) => ({
      id: node.id,
      parentId: node.parent_id,
      nodeType: node.node_type,
      label: node.label,
      sortOrder: node.sort_order ?? 0,
    })),
  };
}

async function loadSupplierFacts(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  workspaceId: string,
): Promise<LimitedLoadResult<ProjectChartSupplierFact>> {
  const { data, error } = await supabase
    .from("component_suppliers")
    .select("id, name, normalized_name, sort_order")
    .eq("workspace_id", workspaceId)
    .order("sort_order", { ascending: true })
    .limit(SUPPLIER_FACT_LIMIT + 1);

  if (error) {
    throw new Error(`Failed to load dashboard suppliers: ${error.message}`);
  }

  const limited = limitLoadedRows(data ?? [], SUPPLIER_FACT_LIMIT);
  return {
    didHitLimit: limited.didHitLimit,
    rows: limited.rows.map((supplier) => ({
      id: supplier.id,
      name: supplier.name,
      normalizedName: supplier.normalized_name,
      sortOrder: supplier.sort_order ?? 0,
    })),
  };
}

function limitLoadedRows<T>(rows: T[], limit: number): LimitedLoadResult<T> {
  return {
    didHitLimit: rows.length > limit,
    rows: rows.slice(0, limit),
  };
}

function readJsonRecord(value: unknown): JsonRecord {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as JsonRecord;
  }
  return {};
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function finite(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

type AssembleDashboardSummaryInput = {
  projectId: string;
  project?: Pick<Tables<"projects">, "id" | "name" | "client_name" | "location"> | null;
  /** Estimates already ordered `updated_at` DESC by `listProjectEstimates`. */
  estimates: Tables<"estimates">[];
  totalCostByEstimateId: Map<string, number>;
  firstNodeByEstimateId: Map<string, string>;
  nodeCountByEstimateId?: Map<string, number>;
  rowCountByEstimateId?: Map<string, number>;
  selectedEstimateId?: string | null;
  selectedGroupingMode?: ProjectChartGroupingMode | string | null;
  publicationSummary?: ProjectPublicationSummary | null;
};

/**
 * Pure assembler: pick the headline (most-recently-updated) estimate, derive its
 * variance, build the other-estimates list, and apply the single-currency guard.
 * No I/O. The selected cost series is attached separately by
 * `getProjectDashboardSummary` (KTD-4 / R1, R2, R4, R9).
 */
export function assembleDashboardSummary(input: AssembleDashboardSummaryInput): ProjectDashboardSummary {
  const {
    projectId,
    project,
    estimates,
    totalCostByEstimateId,
    firstNodeByEstimateId,
    nodeCountByEstimateId = new Map<string, number>(),
    rowCountByEstimateId = new Map<string, number>(),
    selectedEstimateId,
    selectedGroupingMode,
    publicationSummary = null,
  } = input;
  const totalFor = (id: string) => finite(totalCostByEstimateId.get(id) ?? 0);
  const groupingMode = normalizeGroupingMode(selectedGroupingMode);

  if (estimates.length === 0) {
    return {
      projectId,
      estimateCount: 0,
      selectedEstimateId: null,
      selectedGroupingMode: groupingMode,
      selectedEstimate: null,
      estimateSheets: [],
      headline: null,
      costMix: null,
      otherEstimates: [],
      readiness: buildReadiness({
        projectId,
        project,
        selectedEstimate: null,
        publicationSummary,
      }),
      risks: [],
      rollup: { kind: "single-currency", total: 0, currencyCode: "PHP" },
    };
  }

  const selectedEstimateRow = estimates.find((estimate) => estimate.id === selectedEstimateId) ?? estimates[0];
  const rollup = computeProjectCostRollup(estimates, totalFor);
  const selectedEstimateTotal = totalFor(selectedEstimateRow.id);
  const headline: DashboardHeadline = {
    id: selectedEstimateRow.id,
    name: selectedEstimateRow.name,
    total: selectedEstimateTotal,
    currencyCode: selectedEstimateRow.currency_code || "PHP",
    updatedAt: selectedEstimateRow.updated_at,
    budget: selectedEstimateRow.project_budget,
    variance: computeVariance(selectedEstimateTotal, selectedEstimateRow.project_budget),
  };

  const includedEstimateIds = new Set(publicationSummary?.selectedEstimateIds ?? []);
  const estimateSheets: DashboardEstimateSheet[] = estimates.map((estimate) => {
    const total = totalFor(estimate.id);
    return {
      id: estimate.id,
      name: estimate.name,
      sheetCode: estimate.sheet_code,
      total,
      currencyCode: estimate.currency_code || "PHP",
      updatedAt: estimate.updated_at,
      rowCount: rowCountByEstimateId.get(estimate.id) ?? 0,
      nodeCount: nodeCountByEstimateId.get(estimate.id) ?? 0,
      firstNodeId: firstNodeByEstimateId.get(estimate.id) ?? null,
      budget: estimate.project_budget,
      variance: computeVariance(total, estimate.project_budget),
      isSelected: estimate.id === selectedEstimateRow.id,
      isIncludedInProposal: includedEstimateIds.has(estimate.id),
    };
  });
  const selectedEstimate = estimateSheets.find((estimate) => estimate.id === selectedEstimateRow.id) ?? null;

  const otherEstimates: DashboardOtherEstimate[] = estimateSheets
    .filter((estimate) => estimate.id !== selectedEstimateRow.id)
    .map((estimate) => ({
      id: estimate.id,
      name: estimate.name,
      total: estimate.total,
      currencyCode: estimate.currencyCode,
      updatedAt: estimate.updatedAt,
      firstNodeId: estimate.firstNodeId,
      overBudget: Boolean(estimate.variance?.isOver),
    }));

  return {
    projectId,
    estimateCount: estimates.length,
    selectedEstimateId: selectedEstimateRow.id,
    selectedGroupingMode: groupingMode,
    selectedEstimate,
    estimateSheets,
    headline,
    costMix: null,
    otherEstimates,
    readiness: buildReadiness({
      projectId,
      project,
      selectedEstimate,
      publicationSummary,
    }),
    risks: buildRisks({
      projectId,
      selectedEstimate,
      rollup,
      publicationSummary,
      costMixTruncated: false,
    }),
    rollup,
  };
}

export function normalizeGroupingMode(value: ProjectChartGroupingMode | string | null | undefined): ProjectChartGroupingMode {
  return value === "space" || value === "supplier" || value === "category" ? value : "category";
}

function computeVariance(total: number, budget: number | null): DashboardVariance | null {
  // No budget (or a non-positive one): no variance, never a fabricated zero (R3).
  if (budget == null || budget <= 0) return null;
  const delta = total - budget;
  return { budget, delta, percent: delta / budget, isOver: delta > 0 };
}

/** Sum totals ONLY under one shared currency; otherwise mark mixed (KTD-4 / R9). */
function computeProjectCostRollup(
  estimates: Tables<"estimates">[],
  totalFor: (id: string) => number,
): DashboardCostRollup {
  const currencies = new Set(estimates.map((estimate) => estimate.currency_code || "PHP"));
  if (currencies.size > 1) return { kind: "mixed" };
  const currencyCode = estimates[0]?.currency_code || "PHP";
  const total = estimates.reduce((sum, estimate) => sum + totalFor(estimate.id), 0);
  return { kind: "single-currency", total, currencyCode };
}

function buildReadiness({
  projectId,
  project,
  selectedEstimate,
  publicationSummary,
}: {
  projectId: string;
  project?: Pick<Tables<"projects">, "id" | "name" | "client_name" | "location"> | null;
  selectedEstimate: DashboardEstimateSheet | null;
  publicationSummary?: ProjectPublicationSummary | null;
}): DashboardReadiness {
  const baseHref = `/workshop/projects/${projectId}`;
  const estimatesHref = `${baseHref}/estimates`;
  const exportItems: DashboardReadinessItem[] = [
    selectedEstimate
      ? {
          id: "estimate-selected",
          label: "Estimate selected",
          detail: selectedEstimate.sheetCode ? `${selectedEstimate.sheetCode} - ${selectedEstimate.name}` : selectedEstimate.name,
          status: "ready",
          actionLabel: "Open estimate sheet",
          href: `${baseHref}/estimates/${selectedEstimate.firstNodeId ?? selectedEstimate.id}`,
        }
      : {
          id: "estimate-selected",
          label: "Estimate selected",
          detail: "Create an estimate sheet before preparing a proposal.",
          status: "needs-setup",
          actionLabel: "Open estimates",
          href: estimatesHref,
        },
    selectedEstimate && selectedEstimate.rowCount > 0
      ? {
          id: "rows-available",
          label: "Rows available",
          detail: `${selectedEstimate.rowCount} estimate ${selectedEstimate.rowCount === 1 ? "row" : "rows"}`,
          status: "ready",
        }
      : {
          id: "rows-available",
          label: "Rows available",
          detail: "No rows yet. Add priced rows before export.",
          status: "needs-setup",
          actionLabel: "Open estimate sheet",
          href: selectedEstimate ? `${baseHref}/estimates/${selectedEstimate.firstNodeId ?? selectedEstimate.id}` : estimatesHref,
        },
    project?.client_name?.trim()
      ? { id: "client", label: "Client", detail: project.client_name, status: "ready" }
      : {
          id: "client",
          label: "Client",
          detail: "Client name is missing from project details.",
          status: "needs-setup",
          actionLabel: "Review project details",
          href: baseHref,
        },
    project?.location?.trim()
      ? { id: "address", label: "Address", detail: project.location, status: "ready" }
      : {
          id: "address",
          label: "Address",
          detail: "Project address is missing from project details.",
          status: "needs-setup",
          actionLabel: "Review project details",
          href: baseHref,
        },
  ];

  const shareItems: DashboardReadinessItem[] = [
    buildSharedLinkReadinessItem(baseHref, publicationSummary),
    publicationSummary?.staleSnapshotWarning
      ? {
          id: "snapshot-freshness",
          label: "Snapshot freshness",
          detail: `Snapshot is ${publicationSummary.staleSnapshotWarning.daysBehind} days behind estimate changes.`,
          status: "needs-refresh",
          actionLabel: "Refresh shared link",
          href: baseHref,
        }
      : {
          id: "snapshot-freshness",
          label: "Snapshot freshness",
          detail: publicationSummary?.status === "published" ? "Shared snapshot is current." : "No shared snapshot yet.",
          status: publicationSummary?.status === "published" ? "ready" : "info",
        },
    publicationSummary?.latestRecipientOpen
      ? {
          id: "recipient-activity",
          label: "Recipient activity",
          detail: `${publicationSummary.latestRecipientOpen.displayName ?? publicationSummary.latestRecipientOpen.email} opened the link.`,
          status: "live",
        }
      : {
          id: "recipient-activity",
          label: "Recipient activity",
          detail: publicationSummary?.openCount ? `${publicationSummary.openCount} opens recorded.` : "No recipient activity yet.",
          status: publicationSummary?.openCount ? "live" : "info",
        },
    {
      id: "email-delivery",
      label: "Email delivery",
      detail: "Use proposal export or copy-link sharing from the Share controls.",
      status: "manual-send",
    },
  ];

  const hasSetupBlocker = exportItems.some((item) => item.status === "needs-setup");
  const shareStatus = publicationSummary?.status;
  const status =
    shareStatus === "revoked"
      ? "revoked"
      : shareStatus === "expired"
        ? "expired"
        : publicationSummary?.staleSnapshotWarning
          ? "needs-refresh"
          : hasSetupBlocker
            ? "needs-setup"
            : "ready";

  const primaryAction =
    status === "needs-refresh"
      ? { label: "Refresh shared link", href: baseHref }
      : shareStatus === "published" || shareStatus === "expired" || shareStatus === "revoked"
        ? { label: "Review share settings", href: baseHref }
        : { label: "Prepare proposal", href: `${baseHref}/estimates` };

  return {
    status,
    primaryAction,
    exportItems,
    shareItems,
  };
}

function buildSharedLinkReadinessItem(
  projectHref: string,
  publicationSummary?: ProjectPublicationSummary | null,
): DashboardReadinessItem {
  if (!publicationSummary || publicationSummary.status === "unpublished") {
    return {
      id: "shared-link",
      label: "Shared link",
      detail: "No shared client link yet.",
      status: "needs-setup",
      actionLabel: "Prepare proposal",
      href: projectHref,
    };
  }

  if (publicationSummary.status === "revoked") {
    return {
      id: "shared-link",
      label: "Shared link",
      detail: "Shared link is revoked.",
      status: "revoked",
      actionLabel: "Review share settings",
      href: projectHref,
    };
  }

  if (publicationSummary.status === "expired") {
    return {
      id: "shared-link",
      label: "Shared link",
      detail: "Shared link is expired.",
      status: "expired",
      actionLabel: "Review share settings",
      href: projectHref,
    };
  }

  return {
    id: "shared-link",
    label: "Shared link",
    detail: publicationSummary.passwordRequired
      ? `${publicationSummary.selectedEstimateCount} selected, password protected.`
      : `${publicationSummary.selectedEstimateCount} selected, link live.`,
    status: "live",
    actionLabel: "Review share settings",
    href: projectHref,
  };
}

function buildRisks({
  projectId,
  selectedEstimate,
  rollup,
  publicationSummary,
  costMixTruncated,
}: {
  projectId: string;
  selectedEstimate: DashboardEstimateSheet | null;
  rollup: DashboardCostRollup;
  publicationSummary?: ProjectPublicationSummary | null;
  costMixTruncated: boolean;
}): DashboardRisk[] {
  const baseHref = `/workshop/projects/${projectId}`;
  const risks: DashboardRisk[] = [];

  if (selectedEstimate?.variance?.isOver) {
    risks.push({
      id: "over-budget",
      label: "Over budget",
      detail: `${selectedEstimate.name} is above budget.`,
      severity: "danger",
      actionLabel: "Compare breakdown",
      href: `${baseHref}/data?left=${selectedEstimate.id}`,
    });
  }

  if (selectedEstimate && (selectedEstimate.budget == null || selectedEstimate.budget <= 0)) {
    risks.push({
      id: "missing-budget",
      label: "No budget set",
      detail: "Set a budget to track variance before issuing the proposal.",
      severity: "warning",
      actionLabel: "Open estimates",
      href: `${baseHref}/estimates`,
    });
  }

  if (selectedEstimate && selectedEstimate.rowCount === 0) {
    risks.push({
      id: "zero-rows",
      label: "No rows yet",
      detail: "The selected estimate has no priced rows.",
      severity: "warning",
      actionLabel: "Open estimate sheet",
      href: `${baseHref}/estimates/${selectedEstimate.firstNodeId ?? selectedEstimate.id}`,
    });
  }

  if (rollup.kind === "mixed") {
    risks.push({
      id: "mixed-currency",
      label: "Mixed currencies",
      detail: "Project-wide total is hidden because estimate currencies differ.",
      severity: "warning",
    });
  }

  if (costMixTruncated) {
    risks.push({
      id: "truncated-cost-data",
      label: "Partial cost data",
      detail: "Cost composition is capped for this large estimate.",
      severity: "warning",
      actionLabel: "Open estimate sheet",
      href: selectedEstimate ? `${baseHref}/estimates/${selectedEstimate.firstNodeId ?? selectedEstimate.id}` : `${baseHref}/estimates`,
    });
  }

  if (publicationSummary?.staleSnapshotWarning) {
    risks.push({
      id: "stale-snapshot",
      label: "Snapshot needs refresh",
      detail: `Shared link is ${publicationSummary.staleSnapshotWarning.daysBehind} days behind estimate changes.`,
      severity: "warning",
      actionLabel: "Refresh shared link",
      href: baseHref,
    });
  }

  if (publicationSummary?.status === "expired" || publicationSummary?.status === "revoked") {
    risks.push({
      id: `publication-${publicationSummary.status}`,
      label: publicationSummary.status === "expired" ? "Shared link expired" : "Shared link revoked",
      detail: publicationSummary.status === "expired" ? "Client link is no longer active." : "Client link has been revoked.",
      severity: "danger",
      actionLabel: "Review share settings",
      href: baseHref,
    });
  }

  return risks;
}

export type GetProjectDashboardSummaryOptions = {
  selectedEstimateId?: string | null;
  selectedGroupingMode?: ProjectChartGroupingMode | string | null;
};

/**
 * Server entry point for the dashboard `<main>`: assemble the summary from
 * `listProjectEstimates`, then attach the resolved selected estimate's
 * pre-bucketed cost series for the donut. Returns `null` when the project is not
 * visible.
 */
export async function getProjectDashboardSummary(
  projectId: string,
  options: GetProjectDashboardSummaryOptions = {},
): Promise<ProjectDashboardSummary | null> {
  const listResult = await listProjectEstimates(projectId);
  if (!listResult.project) return null;

  const publicationSummary = await getProjectPublicationSummary(projectId);
  const summary = assembleDashboardSummary({
    projectId: listResult.project.id,
    project: listResult.project,
    estimates: listResult.estimates,
    totalCostByEstimateId: listResult.totalCostByEstimateId,
    firstNodeByEstimateId: listResult.firstNodeByEstimateId,
    nodeCountByEstimateId: listResult.nodeCountByEstimateId,
    rowCountByEstimateId: listResult.rowCountByEstimateId,
    selectedEstimateId: options.selectedEstimateId,
    selectedGroupingMode: options.selectedGroupingMode,
    publicationSummary,
  });

  if (!summary.selectedEstimateId) return summary;

  const selectedSeries = await getDashboardEstimateSeries(projectId, summary.selectedEstimateId);
  if (selectedSeries) {
    summary.costMix = {
      series: selectedSeries.series,
      currencyCode: selectedSeries.currencyCode,
      truncated: selectedSeries.didTruncate,
    };
    if (selectedSeries.didTruncate) {
      summary.risks = buildRisks({
        projectId: summary.projectId,
        selectedEstimate: summary.selectedEstimate,
        rollup: summary.rollup,
        publicationSummary,
        costMixTruncated: true,
      });
    }
  }

  return summary;
}
