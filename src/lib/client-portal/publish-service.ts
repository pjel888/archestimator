import "server-only";

import { createHash } from "node:crypto";

import type { D1DatabaseLike, D1Value } from "@/lib/cloudflare/d1";
import { buildClientPortalCostBreakdownPayload, buildClientPortalEstimateComparisonPayload, buildClientPortalFinancialSummaryPayload } from "@/lib/client-portal/financial-sections";
import { publishClientPortalIssue, type ClientPortalPublishedIssue } from "@/lib/client-portal/issue-builder";
import { buildClientPortalEstimateBrowserPayload } from "@/lib/client-portal/estimate-browser";
import type { ClientPortalInternalActor } from "@/lib/client-portal/policy";
import { parseClientPortalSectionDraft, type ClientPortalSectionDraft } from "@/lib/client-portal/section-registry";
import { ESTIMATE_CALCULATION_CURRENCY_SCALE } from "@/lib/estimates/estimate-row-total";
import {
  createPublicationAuthoringSemanticHash,
  createPublicationOpaqueIdNamespace,
  projectPublicationAuthoringRow,
} from "@/lib/publication/authoring-projection";
import { buildProjectPublicationSnapshot, sanitizeProjectPublicationSnapshotForPublicRead } from "@/lib/publication/snapshot";
import type { PublicationSnapshotEstimate } from "@/lib/publication/types";

type PortalSource = { id: string; project_id: string; status: "draft" | "ready" | "live" | "access_off" | "archived"; workspace_id: string };
type ProjectSource = { currency_code: string; id: string; name: string; project_code: string | null; publication_source_revision: number | string };
type EstimateSource = { id: string; name: string; sheet_code: string; updated_at: string | null };
type NodeSource = { estimate_id: string; estimate_tab_id: string | null; id: string; kind: string; name: string; parent_id: string | null; sort_order: number };
type RowSource = {
  adjustment_percentage: number | string | null;
  contingency_percentage: number | string | null;
  description: string;
  designation: string;
  discipline: string;
  estimate_id: string;
  id: string;
  link_state: string;
  material: string;
  misc_cost: number | string | null;
  metadata_json: string;
  node_id: string | null;
  quantity: number | string | null;
  quantity_base: number | string | null;
  quantity_contingency_amount: number | string | null;
  row_revision: number | string | null;
  source_library_item_id: string | null;
  source_snapshot_json: string;
  supplier: string | null;
  unit: string;
  unit_cost: number | string | null;
};
type SectionSource = {
  config_json: string;
  data_scope_json: string;
  description: string | null;
  enabled: number;
  field_policy_json: string;
  id: string;
  interaction_policy_json: string;
  kind: string;
  layout_mode: string;
  print_policy_json: string;
  section_key: string;
  sort_order: number;
  title: string;
  visibility_policy_json: string;
};
type TabSource = { estimate_id: string; id: string; is_default: number; name: string; sort_order: number };
type PublicationSource = {
  drafts: ClientPortalSectionDraft[];
  estimateIds: string[];
  estimates: EstimateSource[];
  nodes: NodeSource[];
  project: ProjectSource;
  rows: RowSource[];
  sectionRows: SectionSource[];
  tabs: TabSource[];
};

const CLIENT_PORTAL_PROJECTION_SCHEMA_VERSION = 2;
const MAX_CONSISTENCY_SOURCE_READS = 3;
const MINOR_UNIT_FACTOR = 10 ** ESTIMATE_CALCULATION_CURRENCY_SCALE;

export class ClientPortalPublishError extends Error {
  constructor(public readonly code: "client_portal_publish_invalid" | "client_portal_publish_not_found", message: string) {
    super(message);
    this.name = "ClientPortalPublishError";
  }
}

function parseObject(value: string) {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function canonicalJson(value: unknown): string {
  const normalize = (entry: unknown): unknown => {
    if (Array.isArray(entry)) return entry.map(normalize);
    if (entry && typeof entry === "object") {
      return Object.fromEntries(Object.keys(entry as Record<string, unknown>).sort().map((key) => [key, normalize((entry as Record<string, unknown>)[key])]));
    }
    return entry;
  };
  return JSON.stringify(normalize(value));
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function numberValue(value: number | string | null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function all<T>(database: D1DatabaseLike, sql: string, values: D1Value[]) {
  const result = await database.prepare<T>(sql).bind(...values).all<T>();
  if (result.success === false) throw new ClientPortalPublishError("client_portal_publish_invalid", "Client Portal source data could not be loaded.");
  return result.results ?? [];
}

function draftFromRow(row: SectionSource): ClientPortalSectionDraft {
  const fieldPolicy = parseObject(row.field_policy_json);
  const interactionPolicy = parseObject(row.interaction_policy_json);
  const printPolicy = parseObject(row.print_policy_json);
  return parseClientPortalSectionDraft({
    schemaVersion: 1,
    id: row.id,
    kind: row.kind,
    title: row.title,
    description: row.description,
    sortOrder: row.sort_order,
    enabled: Number(row.enabled) === 1,
    layoutMode: row.layout_mode,
    visibleFields: Array.isArray(fieldPolicy.visibleFields) ? fieldPolicy.visibleFields : [],
    commentable: interactionPolicy.commentable !== false,
    downloadable: printPolicy.downloadable === true,
    dataScope: parseObject(row.data_scope_json),
    config: parseObject(row.config_json),
  });
}

function selectedEstimateIds(drafts: readonly ClientPortalSectionDraft[]) {
  const ids = new Set<string>();
  for (const draft of drafts) {
    if (!draft.enabled) continue;
    for (const id of draft.dataScope?.selectedEstimateIds ?? []) ids.add(id);
    if (draft.kind === "estimate_browser") for (const id of draft.config.selectedEstimateIds ?? []) ids.add(id);
  }
  return [...ids].sort();
}

function sameStringSet(left: readonly string[], right: readonly string[]) {
  const sortedLeft = [...left].sort();
  const sortedRight = [...right].sort();
  return sortedLeft.length === sortedRight.length && sortedLeft.every((value, index) => value === sortedRight[index]);
}

function estimateIdsForSection(draft: ClientPortalSectionDraft, fallbackEstimateIds: readonly string[]) {
  const explicitScope = draft.dataScope?.selectedEstimateIds;
  if (explicitScope && explicitScope.length === 0) {
    throw new ClientPortalPublishError("client_portal_publish_invalid", `${draft.title} has an empty estimate data scope.`);
  }
  if (draft.kind === "estimate_browser") {
    const configured = draft.config.selectedEstimateIds ?? [];
    if (configured.length === 0) throw new ClientPortalPublishError("client_portal_publish_invalid", `${draft.title} needs at least one selected estimate.`);
    if (explicitScope && !sameStringSet(explicitScope, configured)) {
      throw new ClientPortalPublishError("client_portal_publish_invalid", `${draft.title} has conflicting estimate selections in config and data scope.`);
    }
    return explicitScope ?? configured;
  }
  return explicitScope ?? fallbackEstimateIds;
}

function rowProjectionInput(row: RowSource) {
  return projectPublicationAuthoringRow({
    id: row.id,
    nodeId: row.node_id,
    sourceLibraryItemId: row.source_library_item_id,
    sourceSnapshot: row.source_snapshot_json,
    metadata: row.metadata_json,
    linkState: row.link_state,
    rowRevision: row.row_revision,
    supplier: row.supplier,
    description: row.description,
    designation: row.designation,
    discipline: row.discipline,
    material: row.material,
    quantity: row.quantity,
    quantityBase: row.quantity_base,
    quantityContingencyAmount: row.quantity_contingency_amount,
    unit: row.unit,
    unitCost: row.unit_cost,
    miscCost: row.misc_cost,
    contingencyPercentage: row.contingency_percentage,
    adjustmentPercentage: row.adjustment_percentage,
  });
}

function authoringEstimates(source: PublicationSource) {
  const rowsByEstimate = groupByEstimate(source.rows);
  const nodesByEstimate = groupByEstimate(source.nodes);
  const tabsByEstimate = groupByEstimate(source.tabs);
  return source.estimates.map((estimate) => ({
    id: estimate.id,
    name: estimate.name,
    sheetCode: estimate.sheet_code,
    updatedAt: estimate.updated_at,
    rows: (rowsByEstimate.get(estimate.id) ?? []).map(rowProjectionInput),
    nodes: (nodesByEstimate.get(estimate.id) ?? []).map((node) => ({
      id: node.id,
      name: node.name,
      kind: node.kind === "area" ? "area" as const : "group" as const,
      parentId: node.parent_id,
      sortOrder: node.sort_order,
      estimateTabId: node.estimate_tab_id,
    })),
    tabs: (tabsByEstimate.get(estimate.id) ?? []).map((tab) => ({
      id: tab.id,
      name: tab.name,
      sortOrder: tab.sort_order,
      isDefault: Boolean(tab.is_default),
    })),
  }));
}

function sourceFingerprint(source: PublicationSource, authoringSemanticHash: string) {
  return sha256(canonicalJson({
    projectionSchemaVersion: CLIENT_PORTAL_PROJECTION_SCHEMA_VERSION,
    authoringSemanticHash,
    drafts: source.drafts,
    sectionPolicies: source.sectionRows.map((row) => ({
      id: row.id,
      sectionKey: row.section_key,
      visibilityPolicy: parseObject(row.visibility_policy_json),
      fieldPolicy: parseObject(row.field_policy_json),
      interactionPolicy: parseObject(row.interaction_policy_json),
      printPolicy: parseObject(row.print_policy_json),
    })),
    project: source.project,
    estimates: source.estimates.map(({ id, name, sheet_code, updated_at }) => ({ id, name, sheet_code, updated_at })),
  }));
}

async function loadPublicationSource(database: D1DatabaseLike, portal: PortalSource): Promise<PublicationSource> {
  const sectionRows = await all<SectionSource>(
    database,
    `SELECT id, section_key, kind, title, description, sort_order, enabled, layout_mode, visibility_policy_json, data_scope_json,
            field_policy_json, interaction_policy_json, print_policy_json, config_json
     FROM client_portal_sections
     WHERE portal_id = ? AND enabled = 1
     ORDER BY sort_order ASC, section_key ASC`,
    [portal.id],
  );
  const drafts = sectionRows.map(draftFromRow);
  if (!drafts.length) throw new ClientPortalPublishError("client_portal_publish_invalid", "Add at least one visible section before publishing.");
  const estimateIds = selectedEstimateIds(drafts);
  if (!estimateIds.length) throw new ClientPortalPublishError("client_portal_publish_invalid", "Choose at least one estimate source before publishing.");

  const project = await database.prepare<ProjectSource>("SELECT id, name, project_code, currency_code, publication_source_revision FROM projects WHERE id = ? AND workspace_id = ? LIMIT 1").bind(portal.project_id, portal.workspace_id).first<ProjectSource>();
  if (!project) throw new ClientPortalPublishError("client_portal_publish_not_found", "Client Portal project was not found.");
  const placeholders = estimateIds.map(() => "?").join(", ");
  const estimates = await all<EstimateSource>(database, `SELECT id, name, sheet_code, updated_at FROM estimates WHERE project_id = ? AND id IN (${placeholders}) ORDER BY sheet_code ASC, id ASC`, [project.id, ...estimateIds]);
  if (estimates.length !== estimateIds.length) throw new ClientPortalPublishError("client_portal_publish_invalid", "One or more selected estimate sources are unavailable for this project.");
  const [rows, nodes, tabs] = await Promise.all([
    all<RowSource>(database, `SELECT id, estimate_id, node_id, description, designation, discipline, material, supplier, quantity, quantity_base, quantity_contingency_amount, unit, unit_cost, misc_cost, contingency_percentage, adjustment_percentage, row_revision, source_library_item_id, source_snapshot_json, metadata_json, link_state FROM estimate_row_items WHERE estimate_id IN (${placeholders}) ORDER BY estimate_id ASC, sort_order ASC, id ASC`, estimateIds),
    all<NodeSource>(database, `SELECT id, estimate_id, estimate_tab_id, parent_id, kind, name, sort_order FROM estimate_nodes WHERE estimate_id IN (${placeholders}) ORDER BY estimate_id ASC, sort_order ASC, id ASC`, estimateIds),
    all<TabSource>(database, `SELECT id, estimate_id, name, sort_order, is_default FROM estimate_tabs WHERE estimate_id IN (${placeholders}) AND archived_at IS NULL ORDER BY estimate_id ASC, sort_order ASC, id ASC`, estimateIds),
  ]);
  return { drafts, estimateIds, estimates, nodes, project, rows, sectionRows, tabs };
}

async function loadConsistentPublicationSource(database: D1DatabaseLike, portal: PortalSource) {
  for (let read = 0; read < MAX_CONSISTENCY_SOURCE_READS; read += 1) {
    const source = await loadPublicationSource(database, portal);
    const sourceRevision = Math.max(0, Math.trunc(numberValue(source.project.publication_source_revision)));
    const revisionAfterRead = await database.prepare<{ publication_source_revision: number | string }>(
      "SELECT publication_source_revision FROM projects WHERE id = ? AND workspace_id = ? LIMIT 1",
    ).bind(portal.project_id, portal.workspace_id).first<{ publication_source_revision: number | string }>();
    if (revisionAfterRead && Math.max(0, Math.trunc(numberValue(revisionAfterRead.publication_source_revision))) === sourceRevision) {
      const estimates = authoringEstimates(source);
      const authoringSemanticHash = createPublicationAuthoringSemanticHash({
        projectId: source.project.id,
        currencyCode: source.project.currency_code,
        estimates,
      });
      return {
        authoringSemanticHash,
        estimates,
        fingerprint: sourceFingerprint(source, authoringSemanticHash),
        source,
        sourceRevision,
      };
    }
  }
  throw new ClientPortalPublishError("client_portal_publish_invalid", "The selected estimate sources changed repeatedly while the issue was being prepared. Publish again after edits settle.");
}

function groupByEstimate<T extends { estimate_id: string }>(rows: readonly T[]) {
  const grouped = new Map<string, T[]>();
  for (const row of rows) grouped.set(row.estimate_id, [...(grouped.get(row.estimate_id) ?? []), row]);
  return grouped;
}

function scopedEstimates(draft: ClientPortalSectionDraft, input: { estimateIds: readonly string[]; estimatesBySourceId: ReadonlyMap<string, PublicationSnapshotEstimate> }) {
  return estimateIdsForSection(draft, input.estimateIds).map((estimateId) => {
    const estimate = input.estimatesBySourceId.get(estimateId);
    if (!estimate) throw new ClientPortalPublishError("client_portal_publish_invalid", `${draft.title} references an estimate outside the issued source set.`);
    return estimate;
  });
}

function estimatesTotal(estimates: readonly PublicationSnapshotEstimate[]) {
  const totalCostMinorUnits = estimates.reduce((total, estimate) => {
    const next = total + (estimate.totalCostMinorUnits ?? Math.round(estimate.totalCost * MINOR_UNIT_FACTOR));
    if (!Number.isSafeInteger(next)) throw new ClientPortalPublishError("client_portal_publish_invalid", "Issued estimate totals exceed the supported minor-unit range.");
    return next;
  }, 0);
  return { totalCost: totalCostMinorUnits / MINOR_UNIT_FACTOR, totalCostMinorUnits };
}

function payloadForSection(
  draft: ClientPortalSectionDraft,
  input: {
    currencyCode: string;
    estimateIds: readonly string[];
    estimatesBySourceId: ReadonlyMap<string, PublicationSnapshotEstimate>;
    project: { code: string | null; name: string };
  },
) {
  const estimates = scopedEstimates(draft, input);
  const totals = estimatesTotal(estimates);
  switch (draft.kind) {
    case "overview":
      if (draft.config.showProjectDates) throw new ClientPortalPublishError("client_portal_publish_invalid", `${draft.title} cannot publish project dates because no client-safe date source is configured.`);
      if (draft.config.showPreparedFor) throw new ClientPortalPublishError("client_portal_publish_invalid", `${draft.title} cannot publish prepared-for details because no client-safe recipient source is configured.`);
      return { schemaVersion: 1, project: input.project, estimateCount: estimates.length, ...(draft.config.showIssueTotal === false ? {} : { totalCost: totals.totalCost, totalCostMinorUnits: totals.totalCostMinorUnits, currencyCode: input.currencyCode }) };
    case "estimate_browser":
      return buildClientPortalEstimateBrowserPayload({ allowRowDiscussion: draft.config.allowRowDiscussion, currencyCode: input.currencyCode, defaultGrouping: draft.config.defaultGrouping, estimates });
    case "financial_summary":
      if (draft.config.metricIds?.length) throw new ClientPortalPublishError("client_portal_publish_invalid", `${draft.title} contains unsupported custom financial metrics.`);
      if (draft.config.includeContingency) throw new ClientPortalPublishError("client_portal_publish_invalid", `${draft.title} cannot publish a separate contingency metric from the current issued-row basis.`);
      return buildClientPortalFinancialSummaryPayload({ currencyCode: input.currencyCode, estimates });
    case "cost_breakdown":
      if (draft.config.groupBy === "supplier" && !draft.visibleFields.includes("supplier")) {
        throw new ClientPortalPublishError("client_portal_publish_invalid", `${draft.title} must make supplier visible before grouping by supplier.`);
      }
      if (draft.config.groupBy === "category" && !draft.visibleFields.includes("category")) {
        throw new ClientPortalPublishError("client_portal_publish_invalid", `${draft.title} must make category visible before grouping by category.`);
      }
      return buildClientPortalCostBreakdownPayload({ currencyCode: input.currencyCode, estimates, groupBy: draft.config.groupBy ?? "area", includeCharts: draft.config.includeCharts });
    case "estimate_comparison":
      if (draft.config.compareIssueIds?.length) throw new ClientPortalPublishError("client_portal_publish_invalid", `${draft.title} contains historical issue comparisons that are not supported by the current issued projection.`);
      if (draft.config.displayMode === "percentage") throw new ClientPortalPublishError("client_portal_publish_invalid", `${draft.title} cannot use percentage comparison without a configured historical baseline.`);
      return buildClientPortalEstimateComparisonPayload({ currencyCode: input.currencyCode, estimates, displayMode: "absolute" });
    case "assumptions_exclusions":
      return { schemaVersion: 1, assumptions: [], exclusions: [] };
    case "discussion":
      return { schemaVersion: 1, defaultTarget: draft.config.defaultTarget ?? "all", allowClientCreation: draft.config.allowClientCreation ?? false };
    case "activity":
      return { schemaVersion: 1, mode: draft.config.mode ?? "none", source: "live_issued_activity" };
    case "decision":
      return { schemaVersion: 1, scope: "issue", totalCost: totals.totalCost, totalCostMinorUnits: totals.totalCostMinorUnits, currencyCode: input.currencyCode, showFormalDecision: draft.config.showFormalDecision ?? true, confirmationCopy: draft.config.confirmationCopy ?? null };
  }
}

export async function publishClientPortalDraft({ actor, database, idempotencyKey, portalId }: { actor: ClientPortalInternalActor; database: D1DatabaseLike; idempotencyKey: string; portalId: string }): Promise<ClientPortalPublishedIssue> {
  const portal = await database.prepare<PortalSource>("SELECT id, workspace_id, project_id, status FROM client_portals WHERE id = ? LIMIT 1").bind(portalId).first<PortalSource>();
  if (!portal || portal.project_id !== actor.projectId || portal.workspace_id !== actor.workspaceId) throw new ClientPortalPublishError("client_portal_publish_not_found", "Client Portal was not found.");
  const { authoringSemanticHash, estimates, fingerprint, source, sourceRevision } = await loadConsistentPublicationSource(database, portal);
  const snapshot = sanitizeProjectPublicationSnapshotForPublicRead(buildProjectPublicationSnapshot({
    generatedAt: new Date().toISOString(),
    idNamespace: createPublicationOpaqueIdNamespace(source.project.id, authoringSemanticHash),
    semanticHash: authoringSemanticHash,
    sourceRevision,
    project: { id: source.project.id, name: source.project.name, projectCode: source.project.project_code, clientName: null, location: null, locationVisibility: "hidden", currencyCode: source.project.currency_code },
    estimates,
  }));
  const estimatesBySourceId = new Map(source.estimates.map((estimate, index) => [estimate.id, snapshot.estimates[index]!]));
  const totalCostMinorUnits = snapshot.totalCostMinorUnits ?? Math.round(snapshot.totalCost * MINOR_UNIT_FACTOR);

  return publishClientPortalIssue({
    actor,
    database,
    idempotencyKey,
    portalId: portal.id,
    source: {
      currencyCode: source.project.currency_code,
      decisionPolicySnapshot: { requiredApprovals: 1, rule: "any_approver", scope: "issue" },
      exclusions: [],
      projectSnapshot: { code: source.project.project_code, name: source.project.name },
      projectionSchemaVersion: CLIENT_PORTAL_PROJECTION_SCHEMA_VERSION,
      authoringSemanticHash,
      sourceRevision,
      selectedEstimateIds: source.estimateIds,
      semanticHash: fingerprint,
      totalCost: snapshot.totalCost,
      totalCostMinorUnits,
      assumptions: [],
    },
    assertSourceCurrent: async () => {
      const current = await loadPublicationSource(database, portal);
      const currentRevision = Math.max(0, Math.trunc(numberValue(current.project.publication_source_revision)));
      const currentEstimates = authoringEstimates(current);
      const currentAuthoringSemanticHash = createPublicationAuthoringSemanticHash({
        projectId: current.project.id,
        currencyCode: current.project.currency_code,
        estimates: currentEstimates,
      });
      if (currentRevision !== sourceRevision || sourceFingerprint(current, currentAuthoringSemanticHash) !== fingerprint) {
        throw new ClientPortalPublishError("client_portal_publish_invalid", "Client Portal source content changed before issue commit. Publish again to issue one consistent revision.");
      }
    },
    buildSectionPayload: async ({ draft }) => payloadForSection(draft, {
      currencyCode: source.project.currency_code,
      estimateIds: source.estimateIds,
      estimatesBySourceId,
      project: { code: source.project.project_code, name: source.project.name },
    }),
  });
}
