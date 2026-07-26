import { createHash } from "node:crypto";

import type { D1DatabaseLike, D1Value } from "@/lib/cloudflare/d1";
import type {
  ChangeSetComparison,
  NarrativePolicyItem,
  PrivateArtifactProjection,
  PrivateEstimateProjection,
  PrivateIssueProjection,
  PrivateRequestProjection,
} from "@/lib/client-portal/change-set";
import type { ClientPortalIssuePackage } from "@/lib/client-portal/issue-builder";
import type { ClientPortalIssueSourceProjection } from "@/lib/client-portal/issue-source-projection";

type ComparisonIssueRow = {
  assumptions_json: string;
  content_hash: string;
  currency_code: string;
  exclusions_json: string;
  id: string;
  manifest_json: string;
  total_cost: number;
  valid_through: string | null;
};

type SourceEstimateRow = {
  currency_code: string;
  name_snapshot: string;
  public_estimate_id: string | null;
  sheet_code_snapshot: string | null;
  source_estimate_id: string;
  total_minor_units: number;
};

type SourceRow = {
  adjustment_basis_points: number;
  contingency_basis_points: number;
  description: string;
  designation: string;
  discipline: string;
  link_state: "unlinked" | "linked-clean" | "linked-overridden" | "source-changed" | "detached";
  material: string;
  misc_cost_minor_units: number;
  quantity_scaled: number;
  row_revision: number;
  row_total_minor_units: number;
  scope_status: "included" | "excluded" | "allowance" | "alternate" | "informational";
  sort_order: number;
  source_component_id: string | null;
  source_estimate_id: string;
  source_node_id: string | null;
  source_row_id: string;
  source_tab_id: string | null;
  source_variant_id: string | null;
  unit: string;
  unit_cost_minor_units: number;
};

type SourceNodeRow = {
  kind: "tab" | "group" | "area" | "category" | "subgroup" | "other";
  name: string;
  parent_source_node_id: string | null;
  sort_order: number;
  source_estimate_id: string;
  source_node_id: string;
  source_tab_id: string | null;
};

type ArtifactRow = {
  artifact_id: string;
  commentable: number;
  decision_relevant: number;
  downloadable: number;
  display_title: string;
  public_artifact_id: string;
  purpose: PrivateArtifactProjection["purpose"];
  revision_label: string | null;
  version_number: number;
  artifact_version_id: string;
};

type RequestRow = {
  relationship: PrivateRequestProjection["relationship"];
  request_code_snapshot: string;
  request_id: string;
  request_version_id: string;
  title_snapshot: string;
  version_number: number;
};

export class ClientPortalChangeSetComparisonError extends Error {
  readonly code = "client_portal_comparison_stale" as const;
}

function canonicalText(value: string) {
  return value.normalize("NFC").replace(/\s+/g, " ").trim();
}

function opaqueId(prefix: string, namespace: string, ...parts: Array<string | null>) {
  const digest = createHash("sha256").update([namespace, prefix, ...parts.map((part) => part ?? "")].join("\u001f")).digest("hex");
  return `${prefix}_${digest.slice(0, 32)}`;
}

function narrativeItems(kind: string, values: readonly string[]): NarrativePolicyItem[] {
  return values.map((value) => {
    const text = canonicalText(value);
    return { stableId: opaqueId("narrative", kind, text.toLocaleLowerCase("en-US")), text };
  });
}

function parseArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === "string" && Boolean(entry.trim())) : [];
  } catch {
    return [];
  }
}

function parsePackage(value: string): { requestedDecision: PrivateIssueProjection["narrativePolicy"]["requestedDecision"]; unresolvedItems: string[] } {
  try {
    const parsed = JSON.parse(value) as { package?: { requestedDecision?: unknown; unresolvedItems?: unknown } };
    const requestedDecision = parsed.package?.requestedDecision;
    return {
      requestedDecision: requestedDecision === "formal" || requestedDecision === "acknowledgement" ? requestedDecision : "none" as const,
      unresolvedItems: Array.isArray(parsed.package?.unresolvedItems)
        ? parsed.package.unresolvedItems.filter((entry): entry is string => typeof entry === "string" && Boolean(entry.trim()))
        : [],
    };
  } catch {
    return { requestedDecision: "none" as const, unresolvedItems: [] as string[] };
  }
}

async function all<T>(database: D1DatabaseLike, sql: string, values: D1Value[]) {
  const result = await database.prepare<T>(sql).bind(...values).all<T>();
  if (result.success === false) throw new Error("Client Portal comparison source could not be loaded.");
  return result.results ?? [];
}

function currentEstimates(input: {
  namespace: string;
  issuePackage: ClientPortalIssuePackage;
  sourceProjection: ClientPortalIssueSourceProjection;
}): PrivateEstimateProjection[] {
  const packages = new Map(input.issuePackage.estimates.map((estimate) => [estimate.sourceEstimateId, estimate]));
  return input.sourceProjection.estimates.map((estimate) => {
    const packageEstimate = packages.get(estimate.sourceEstimateId);
    if (!packageEstimate) throw new Error("Current issue source projection does not match its package estimates.");
    return {
      sourceEstimateId: estimate.sourceEstimateId,
      publicId: packageEstimate.publicEstimateId,
      publicLabel: estimate.name,
      name: estimate.name,
      sheetCode: estimate.sheetCode,
      context: estimate.sourceEstimateId,
      totalMinorUnits: estimate.totalMinorUnits,
      nodes: estimate.nodes.map((node) => ({
        sourceNodeId: node.sourceNodeId,
        sourceTabId: node.sourceTabId,
        parentSourceNodeId: node.parentSourceNodeId,
        publicId: opaqueId("node", input.namespace, estimate.sourceEstimateId, node.sourceNodeId),
        publicLabel: node.name,
        kind: node.kind,
        name: node.name,
        sortOrder: node.sortOrder,
      })),
      rows: estimate.rows.map((row) => ({
        sourceRowId: row.sourceRowId,
        sourceTabId: row.sourceTabId,
        sourceNodeId: row.sourceNodeId,
        sourceComponentId: row.sourceComponentId,
        sourceVariantId: row.sourceVariantId,
        matchContext: [estimate.sourceEstimateId, row.discipline.toLocaleLowerCase("en-US"), row.sourceNodeId ?? ""].join("\u001f"),
        publicId: opaqueId("row", input.namespace, estimate.sourceEstimateId, row.sourceRowId),
        publicLabel: row.description || row.designation,
        rowRevision: row.rowRevision,
        description: row.description,
        designation: row.designation,
        discipline: row.discipline,
        material: row.material,
        quantityScaled: row.quantityScaled,
        unit: row.unit,
        unitCostMinorUnits: row.unitCostMinorUnits,
        miscCostMinorUnits: row.miscCostMinorUnits,
        contingencyBasisPoints: row.contingencyBasisPoints,
        adjustmentBasisPoints: row.adjustmentBasisPoints,
        rowTotalMinorUnits: row.rowTotalMinorUnits,
        scopeStatus: row.scopeStatus,
        linkState: row.linkState,
        sortOrder: row.sortOrder,
      })),
    };
  });
}

export function createCurrentClientPortalIssueProjection(input: {
  assumptions: readonly string[];
  exclusions: readonly string[];
  issuePackage: ClientPortalIssuePackage;
  namespace: string;
  sourceProjection: ClientPortalIssueSourceProjection;
  validThrough?: string | null;
}): PrivateIssueProjection {
  const artifacts: PrivateArtifactProjection[] = input.issuePackage.artifacts.map((artifact) => ({
    sourceArtifactId: artifact.artifactId,
    sourceVersionId: artifact.artifactVersionId,
    publicId: artifact.publicArtifactId,
    publicLabel: artifact.displayTitle,
    versionLabel: artifact.versionLabel,
    purpose: artifact.purpose,
    downloadAllowed: artifact.downloadable,
    commentAllowed: artifact.commentable,
    decisionRelevant: artifact.decisionRelevant,
  }));
  const requests: PrivateRequestProjection[] = input.issuePackage.requests.map((request) => ({
    sourceRequestId: request.requestId,
    sourceRequestVersionId: request.requestVersionId,
    publicId: opaqueId("request", input.namespace, request.requestId),
    publicCode: request.requestCode,
    publicTitle: request.title,
    versionNumber: request.versionNumber,
    relationship: request.relationship,
  }));
  return {
    currencyCode: input.sourceProjection.currencyCode,
    estimates: currentEstimates(input),
    artifacts,
    requests,
    narrativePolicy: {
      assumptions: narrativeItems("assumption", input.assumptions),
      exclusions: narrativeItems("exclusion", input.exclusions),
      unresolvedItems: narrativeItems("unresolved", input.issuePackage.unresolvedItems),
      requestedDecision: input.issuePackage.requestedDecision,
      validThrough: input.validThrough ?? null,
    },
  };
}

async function loadFullProjection(database: D1DatabaseLike, issue: ComparisonIssueRow): Promise<PrivateIssueProjection | null> {
  const estimates = await all<SourceEstimateRow>(database, `
    SELECT source.source_estimate_id, source.sheet_code_snapshot, source.name_snapshot,
           source.total_minor_units, source.currency_code, issued.public_estimate_id
    FROM client_portal_issue_source_estimates source
    LEFT JOIN client_portal_issue_estimates issued
      ON issued.issue_id = source.issue_id AND issued.source_estimate_id = source.source_estimate_id
    WHERE source.issue_id = ?
    ORDER BY issued.sort_order ASC, source.source_estimate_id ASC
  `, [issue.id]);
  if (estimates.length === 0) return null;
  const [rows, nodes, artifacts, requests] = await Promise.all([
    all<SourceRow>(database, `
      SELECT source_estimate_id, source_tab_id, source_node_id, source_row_id, source_component_id, source_variant_id,
             row_revision, description, designation, discipline, material, quantity_scaled, unit, unit_cost_minor_units,
             misc_cost_minor_units, contingency_basis_points, adjustment_basis_points, row_total_minor_units,
             scope_status, link_state, sort_order
      FROM client_portal_issue_source_rows WHERE issue_id = ?
      ORDER BY source_estimate_id ASC, sort_order ASC, source_row_id ASC
    `, [issue.id]),
    all<SourceNodeRow>(database, `
      SELECT source_estimate_id, source_tab_id, source_node_id, parent_source_node_id, kind, name, sort_order
      FROM client_portal_issue_source_nodes WHERE issue_id = ?
      ORDER BY source_estimate_id ASC, sort_order ASC, source_node_id ASC
    `, [issue.id]),
    all<ArtifactRow>(database, `
      SELECT issued.artifact_id, issued.artifact_version_id, issued.public_artifact_id, issued.purpose,
             issued.display_title, issued.commentable, issued.downloadable, issued.decision_relevant,
             version.version_number, version.revision_label
      FROM client_portal_issue_artifacts issued
      JOIN project_artifact_versions version ON version.id = issued.artifact_version_id
      WHERE issued.issue_id = ? ORDER BY issued.sort_order ASC, issued.id ASC
    `, [issue.id]),
    all<RequestRow>(database, `
      SELECT issued.request_id, issued.request_version_id, issued.relationship, issued.request_code_snapshot,
             issued.title_snapshot, version.version_number
      FROM client_portal_issue_requests issued
      JOIN project_change_request_versions version ON version.id = issued.request_version_id
      WHERE issued.issue_id = ? ORDER BY issued.sort_order ASC, issued.request_version_id ASC
    `, [issue.id]),
  ]);
  const namespace = issue.content_hash;
  const rowsByEstimate = new Map<string, SourceRow[]>();
  const nodesByEstimate = new Map<string, SourceNodeRow[]>();
  for (const row of rows) rowsByEstimate.set(row.source_estimate_id, [...(rowsByEstimate.get(row.source_estimate_id) ?? []), row]);
  for (const node of nodes) nodesByEstimate.set(node.source_estimate_id, [...(nodesByEstimate.get(node.source_estimate_id) ?? []), node]);
  const packageData = parsePackage(issue.manifest_json);
  return {
    currencyCode: issue.currency_code,
    estimates: estimates.map((estimate) => ({
      sourceEstimateId: estimate.source_estimate_id,
      publicId: estimate.public_estimate_id ?? opaqueId("estimate", namespace, estimate.source_estimate_id),
      publicLabel: estimate.name_snapshot,
      name: estimate.name_snapshot,
      sheetCode: estimate.sheet_code_snapshot,
      context: estimate.source_estimate_id,
      totalMinorUnits: Number(estimate.total_minor_units),
      nodes: (nodesByEstimate.get(estimate.source_estimate_id) ?? []).map((node) => ({
        sourceNodeId: node.source_node_id,
        sourceTabId: node.source_tab_id,
        parentSourceNodeId: node.parent_source_node_id,
        publicId: opaqueId("node", namespace, estimate.source_estimate_id, node.source_node_id),
        publicLabel: node.name,
        kind: node.kind,
        name: node.name,
        sortOrder: Number(node.sort_order),
      })),
      rows: (rowsByEstimate.get(estimate.source_estimate_id) ?? []).map((row) => ({
        sourceRowId: row.source_row_id,
        sourceTabId: row.source_tab_id,
        sourceNodeId: row.source_node_id,
        sourceComponentId: row.source_component_id,
        sourceVariantId: row.source_variant_id,
        matchContext: [estimate.source_estimate_id, row.discipline.toLocaleLowerCase("en-US"), row.source_node_id ?? ""].join("\u001f"),
        publicId: opaqueId("row", namespace, estimate.source_estimate_id, row.source_row_id),
        publicLabel: row.description || row.designation,
        rowRevision: Number(row.row_revision),
        description: row.description,
        designation: row.designation,
        discipline: row.discipline,
        material: row.material,
        quantityScaled: Number(row.quantity_scaled),
        unit: row.unit,
        unitCostMinorUnits: Number(row.unit_cost_minor_units),
        miscCostMinorUnits: Number(row.misc_cost_minor_units),
        contingencyBasisPoints: Number(row.contingency_basis_points),
        adjustmentBasisPoints: Number(row.adjustment_basis_points),
        rowTotalMinorUnits: Number(row.row_total_minor_units),
        scopeStatus: row.scope_status,
        linkState: row.link_state,
        sortOrder: Number(row.sort_order),
      })),
    })),
    artifacts: artifacts.map((artifact) => ({
      sourceArtifactId: artifact.artifact_id,
      sourceVersionId: artifact.artifact_version_id,
      publicId: artifact.public_artifact_id,
      publicLabel: artifact.display_title,
      versionLabel: artifact.revision_label?.trim() || `Version ${artifact.version_number}`,
      purpose: artifact.purpose,
      downloadAllowed: artifact.downloadable === 1,
      commentAllowed: artifact.commentable === 1,
      decisionRelevant: artifact.decision_relevant === 1,
    })),
    requests: requests.map((request) => ({
      sourceRequestId: request.request_id,
      sourceRequestVersionId: request.request_version_id,
      publicId: opaqueId("request", namespace, request.request_id),
      publicCode: request.request_code_snapshot,
      publicTitle: request.title_snapshot,
      versionNumber: Number(request.version_number),
      relationship: request.relationship,
    })),
    narrativePolicy: {
      assumptions: narrativeItems("assumption", parseArray(issue.assumptions_json)),
      exclusions: narrativeItems("exclusion", parseArray(issue.exclusions_json)),
      unresolvedItems: narrativeItems("unresolved", packageData.unresolvedItems),
      requestedDecision: packageData.requestedDecision,
      validThrough: issue.valid_through,
    },
  };
}

export async function loadClientPortalChangeSetComparison(input: {
  basedOnBaselineId: string | null;
  comparisonIssueId: string | null;
  database: D1DatabaseLike;
  portalId: string;
}): Promise<{ comparison: ChangeSetComparison; previous: PrivateIssueProjection | null }> {
  let comparisonIssueId = input.comparisonIssueId;
  let baselineId: string | undefined;
  if (input.basedOnBaselineId) {
    const baseline = await input.database.prepare<{ id: string; issue_id: string }>(
      "SELECT id, issue_id FROM client_portal_baselines WHERE id = ? AND portal_id = ? AND status = 'active' LIMIT 1",
    ).bind(input.basedOnBaselineId, input.portalId).first<{ id: string; issue_id: string }>();
    if (!baseline) throw new ClientPortalChangeSetComparisonError("The selected comparison baseline is no longer active.");
    baselineId = baseline.id;
    comparisonIssueId = baseline.issue_id;
  }
  if (!comparisonIssueId) {
    return {
      comparison: { capability: "unavailable", limitationReason: "No prior issue was selected." },
      previous: null,
    };
  }
  const issue = await input.database.prepare<ComparisonIssueRow>(`
    SELECT id, content_hash, total_cost, currency_code, valid_through, assumptions_json, exclusions_json, manifest_json
    FROM client_portal_issues WHERE id = ? AND portal_id = ? LIMIT 1
  `).bind(comparisonIssueId, input.portalId).first<ComparisonIssueRow>();
  if (!issue) throw new ClientPortalChangeSetComparisonError("The selected comparison issue is unavailable.");
  const fullProjection = await loadFullProjection(input.database, issue);
  if (fullProjection) {
    return {
      comparison: { issueId: issue.id, baselineId, capability: "full" },
      previous: fullProjection,
    };
  }
  const totalMinorUnits = Math.round(Number(issue.total_cost) * 100);
  if (!Number.isSafeInteger(totalMinorUnits)) throw new Error("Legacy comparison total is outside the supported minor-unit range.");
  return {
    comparison: {
      issueId: issue.id,
      baselineId,
      capability: "aggregate_only",
      limitationReason: "This legacy issue has no private stable row mapping.",
    },
    previous: {
      currencyCode: issue.currency_code,
      estimates: [{
        sourceEstimateId: `legacy:${issue.id}`,
        publicId: opaqueId("estimate", issue.content_hash, issue.id),
        publicLabel: "Previous issued total",
        name: "Previous issued total",
        sheetCode: null,
        context: `legacy:${issue.id}`,
        totalMinorUnits,
        nodes: [],
        rows: [],
      }],
      artifacts: [],
      requests: [],
      narrativePolicy: {
        assumptions: narrativeItems("assumption", parseArray(issue.assumptions_json)),
        exclusions: narrativeItems("exclusion", parseArray(issue.exclusions_json)),
        unresolvedItems: [],
        requestedDecision: "none",
        validThrough: issue.valid_through,
      },
    },
  };
}
