import "server-only";

import type { D1DatabaseLike, D1Value } from "@/lib/cloudflare/d1";
import { buildClientPortalCostBreakdownPayload, buildClientPortalEstimateComparisonPayload, buildClientPortalFinancialSummaryPayload } from "@/lib/client-portal/financial-sections";
import { publishClientPortalIssue, type ClientPortalPublishedIssue } from "@/lib/client-portal/issue-builder";
import { buildClientPortalEstimateBrowserPayload } from "@/lib/client-portal/estimate-browser";
import type { ClientPortalInternalActor } from "@/lib/client-portal/policy";
import { parseClientPortalSectionDraft, type ClientPortalSectionDraft } from "@/lib/client-portal/section-registry";
import { buildProjectPublicationSnapshot, sanitizeProjectPublicationSnapshotForPublicRead } from "@/lib/publication/snapshot";

type PortalSource = { id: string; project_id: string; status: "draft" | "ready" | "live" | "access_off" | "archived"; workspace_id: string };
type ProjectSource = { currency_code: string; id: string; name: string; project_code: string | null };
type EstimateSource = { id: string; name: string; sheet_code: string; updated_at: string | null };
type RowSource = { adjustment_percentage: number | string | null; contingency_percentage: number | string | null; description: string; designation: string; discipline: string; estimate_id: string; id: string; material: string; misc_cost: number | string | null; node_id: string | null; quantity: number | string | null; quantity_base: number | string | null; quantity_contingency_amount: number | string | null; unit: string; unit_cost: number | string | null };
type SectionSource = { config_json: string; description: string | null; enabled: number; field_policy_json: string; id: string; interaction_policy_json: string; kind: string; layout_mode: string; print_policy_json: string; sort_order: number; title: string };

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
  const registryDraft = {
    schemaVersion: 1,
    id: row.id,
    kind: row.kind,
    title: row.title,
    description: row.description,
    sortOrder: row.sort_order,
    enabled: Number(row.enabled) === 1,
    layoutMode: row.layout_mode,
    visibleFields: Array.isArray(parseObject(row.field_policy_json).visibleFields) ? parseObject(row.field_policy_json).visibleFields : [],
    commentable: parseObject(row.interaction_policy_json).commentable !== false,
    downloadable: parseObject(row.print_policy_json).downloadable === true,
    config: parseObject(row.config_json),
  };
  return parseClientPortalSectionDraft(registryDraft);
}

function selectedEstimateIds(drafts: readonly ClientPortalSectionDraft[]) {
  const ids = new Set<string>();
  for (const draft of drafts) {
    if (!draft.enabled || draft.kind !== "estimate_browser") continue;
    for (const id of draft.config.selectedEstimateIds ?? []) ids.add(id);
  }
  return [...ids];
}

function payloadForSection(draft: ClientPortalSectionDraft, input: { currencyCode: string; estimates: ReturnType<typeof sanitizeProjectPublicationSnapshotForPublicRead>["estimates"]; project: { code: string | null; name: string }; totalCost: number }) {
  switch (draft.kind) {
    case "overview":
      return { schemaVersion: 1, project: input.project, estimateCount: input.estimates.length, totalCost: input.totalCost, currencyCode: input.currencyCode };
    case "estimate_browser":
      return buildClientPortalEstimateBrowserPayload({ currencyCode: input.currencyCode, estimates: input.estimates });
    case "financial_summary":
      return buildClientPortalFinancialSummaryPayload({ currencyCode: input.currencyCode, estimates: input.estimates });
    case "cost_breakdown":
      return buildClientPortalCostBreakdownPayload({ currencyCode: input.currencyCode, estimates: input.estimates });
    case "estimate_comparison":
      return buildClientPortalEstimateComparisonPayload({ currencyCode: input.currencyCode, estimates: input.estimates });
    case "assumptions_exclusions":
      return { schemaVersion: 1, assumptions: [], exclusions: [] };
    case "discussion":
      return { schemaVersion: 1, defaultTarget: draft.config.defaultTarget ?? "all", allowClientCreation: draft.config.allowClientCreation ?? false };
    case "activity":
      return { schemaVersion: 1, mode: draft.config.mode ?? "none", events: [] };
    case "decision":
      return { schemaVersion: 1, scope: "issue", totalCost: input.totalCost, currencyCode: input.currencyCode, showFormalDecision: draft.config.showFormalDecision ?? true, confirmationCopy: draft.config.confirmationCopy ?? null };
  }
}

export async function publishClientPortalDraft({ actor, database, idempotencyKey, portalId }: { actor: ClientPortalInternalActor; database: D1DatabaseLike; idempotencyKey: string; portalId: string }): Promise<ClientPortalPublishedIssue> {
  const portal = await database.prepare<PortalSource>("SELECT id, workspace_id, project_id, status FROM client_portals WHERE id = ? LIMIT 1").bind(portalId).first<PortalSource>();
  if (!portal || portal.project_id !== actor.projectId || portal.workspace_id !== actor.workspaceId) throw new ClientPortalPublishError("client_portal_publish_not_found", "Client Portal was not found.");
  const sectionRows = await all<SectionSource>(database, "SELECT id, kind, title, description, sort_order, enabled, layout_mode, field_policy_json, interaction_policy_json, print_policy_json, config_json FROM client_portal_sections WHERE portal_id = ? AND enabled = 1 ORDER BY sort_order ASC, id ASC", [portal.id]);
  const drafts = sectionRows.map(draftFromRow);
  if (!drafts.length) throw new ClientPortalPublishError("client_portal_publish_invalid", "Add at least one visible section before publishing.");
  const estimateIds = selectedEstimateIds(drafts);
  if (!estimateIds.length) throw new ClientPortalPublishError("client_portal_publish_invalid", "Choose at least one estimate source before publishing.");

  const project = await database.prepare<ProjectSource>("SELECT id, name, project_code, currency_code FROM projects WHERE id = ? AND workspace_id = ? LIMIT 1").bind(portal.project_id, portal.workspace_id).first<ProjectSource>();
  if (!project) throw new ClientPortalPublishError("client_portal_publish_not_found", "Client Portal project was not found.");
  const placeholders = estimateIds.map(() => "?").join(", ");
  const estimates = await all<EstimateSource>(database, `SELECT id, name, sheet_code, updated_at FROM estimates WHERE project_id = ? AND id IN (${placeholders}) ORDER BY sheet_code ASC, id ASC`, [project.id, ...estimateIds]);
  if (estimates.length !== estimateIds.length) throw new ClientPortalPublishError("client_portal_publish_invalid", "One or more selected estimate sources are unavailable for this project.");
  const rows = await all<RowSource>(database, `SELECT id, estimate_id, node_id, description, designation, discipline, material, quantity, quantity_base, quantity_contingency_amount, unit, unit_cost, misc_cost, contingency_percentage, adjustment_percentage FROM estimate_row_items WHERE estimate_id IN (${placeholders}) ORDER BY estimate_id ASC, sort_order ASC, id ASC`, estimateIds);
  const rowsByEstimate = new Map<string, RowSource[]>();
  for (const row of rows) rowsByEstimate.set(row.estimate_id, [...(rowsByEstimate.get(row.estimate_id) ?? []), row]);
  const snapshot = sanitizeProjectPublicationSnapshotForPublicRead(buildProjectPublicationSnapshot({
    generatedAt: new Date().toISOString(),
    project: { id: project.id, name: project.name, projectCode: project.project_code, clientName: null, location: null, locationVisibility: "hidden", currencyCode: project.currency_code },
    estimates: estimates.map((estimate) => ({
      id: estimate.id,
      name: estimate.name,
      sheetCode: estimate.sheet_code,
      updatedAt: estimate.updated_at,
      rows: (rowsByEstimate.get(estimate.id) ?? []).map((row) => ({ id: row.id, nodeId: row.node_id, description: row.description, designation: row.designation, discipline: row.discipline, material: row.material, quantity: numberValue(row.quantity), quantityBase: row.quantity_base === null ? null : numberValue(row.quantity_base), quantityContingencyAmount: row.quantity_contingency_amount === null ? null : numberValue(row.quantity_contingency_amount), unit: row.unit, unitCost: numberValue(row.unit_cost), miscCost: numberValue(row.misc_cost), contingencyPercentage: numberValue(row.contingency_percentage), adjustmentPercentage: numberValue(row.adjustment_percentage) })),
    })),
  }));

  return publishClientPortalIssue({
    actor,
    database,
    idempotencyKey,
    portalId: portal.id,
    source: { currencyCode: project.currency_code, decisionPolicySnapshot: { requiredApprovals: 1, rule: "any_approver", scope: "issue" }, exclusions: [], projectSnapshot: { code: project.project_code, name: project.name }, selectedEstimateIds: estimateIds, totalCost: snapshot.totalCost, assumptions: [] },
    buildSectionPayload: async ({ draft }) => payloadForSection(draft, { currencyCode: project.currency_code, estimates: snapshot.estimates, project: { code: project.project_code, name: project.name }, totalCost: snapshot.totalCost }),
  });
}
