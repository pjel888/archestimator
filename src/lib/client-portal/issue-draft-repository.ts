import "server-only";

import type { D1DatabaseLike, D1PreparedStatementLike, D1Value } from "@/lib/cloudflare/d1";
import type {
  ClientPortalIssueArtifactPurpose,
  ClientPortalIssueDraftStatus,
  ClientPortalIssueKind,
  ClientPortalIssueRequestRelationship,
} from "@/lib/client-portal/issue-draft-contracts";

export type ClientPortalIssueDraftMetadata = {
  assumptions: string[];
  basedOnBaselineId: string | null;
  basedOnIssueId: string | null;
  comparisonIssueId: string | null;
  decisionPolicy: Record<string, unknown>;
  exclusions: string[];
  issueKind: ClientPortalIssueKind;
  narrativeProvenance?: ClientPortalNarrativeProvenance | null;
  requestedDecision: "none" | "acknowledgement" | "formal";
  revisionNote: string | null;
  sectionOverrides: Record<string, unknown>;
  unresolvedItems: string[];
  versionLabel: string | null;
};

export type ClientPortalNarrativeProvenance = {
  aiDraft: string;
  approvedAt: string;
  approvedBy: string;
  generatedAt: string;
  inputFingerprint: string;
  inputHash: string;
  model: string;
  outputHash: string;
  provider: string;
  runId: string;
  schemaVersion: number;
  selection: Record<"summary" | "included" | "excluded" | "unresolved" | "warnings", string[]>;
};

export type ClientPortalIssueDraftEstimateSelection = {
  estimateId: string;
  included: boolean;
  sortOrder: number;
};

export type ClientPortalIssueDraftArtifactSelection = {
  artifactVersionId: string;
  commentable: boolean;
  decisionRelevant: boolean;
  description: string | null;
  displayTitle: string | null;
  downloadable: boolean;
  purpose: ClientPortalIssueArtifactPurpose;
  sortOrder: number;
};

export type ClientPortalIssueDraftRequestSelection = {
  relationship: ClientPortalIssueRequestRelationship;
  requestId: string;
  requestVersionId: string;
  sortOrder: number;
};

export type ClientPortalIssueDraft = ClientPortalIssueDraftMetadata & {
  abandonedAt: string | null;
  artifacts: ClientPortalIssueDraftArtifactSelection[];
  createdAt: string;
  createdBy: string;
  draftRevision: number;
  estimates: ClientPortalIssueDraftEstimateSelection[];
  id: string;
  portalId: string;
  projectId: string;
  publishedAt: string | null;
  publishedIssueId: string | null;
  requests: ClientPortalIssueDraftRequestSelection[];
  status: ClientPortalIssueDraftStatus;
  updatedAt: string;
  updatedBy: string;
  workspaceId: string;
};

type DraftRow = {
  abandoned_at: string | null;
  assumptions_json: string;
  based_on_baseline_id: string | null;
  based_on_issue_id: string | null;
  comparison_issue_id: string | null;
  created_at: string;
  created_by: string;
  decision_policy_json: string;
  draft_revision: number;
  exclusions_json: string;
  id: string;
  issue_kind: ClientPortalIssueKind;
  narrative_provenance_json: string | null;
  portal_id: string;
  project_id: string;
  published_at: string | null;
  published_issue_id: string | null;
  requested_decision: ClientPortalIssueDraftMetadata["requestedDecision"];
  revision_note: string | null;
  section_overrides_json: string;
  status: ClientPortalIssueDraftStatus;
  unresolved_items_json: string;
  updated_at: string;
  updated_by: string;
  version_label: string | null;
  workspace_id: string;
};

type EstimateRow = {
  estimate_id: string;
  included: number;
  sort_order: number;
};

type ArtifactRow = {
  artifact_version_id: string;
  commentable: number;
  decision_relevant: number;
  description: string | null;
  display_title: string | null;
  downloadable: number;
  purpose: ClientPortalIssueArtifactPurpose;
  sort_order: number;
};

type RequestRow = {
  relationship: ClientPortalIssueRequestRelationship;
  request_id: string;
  request_version_id: string;
  sort_order: number;
};

export type IssueDraftScope = {
  draftId: string;
  portalId: string;
  projectId: string;
  workspaceId: string;
};

export type ReplaceIssueDraftInput = IssueDraftScope & {
  actorId: string;
  artifacts: ClientPortalIssueDraftArtifactSelection[];
  estimates: ClientPortalIssueDraftEstimateSelection[];
  expectedRevision: number;
  metadata: ClientPortalIssueDraftMetadata;
  now: string;
  requests: ClientPortalIssueDraftRequestSelection[];
};

const DRAFT_COLUMNS = `
  id, workspace_id, project_id, portal_id, status, draft_revision, issue_kind,
  version_label, based_on_issue_id, based_on_baseline_id, comparison_issue_id,
  revision_note, assumptions_json, exclusions_json, unresolved_items_json,
  narrative_provenance_json,
  requested_decision, decision_policy_json, section_overrides_json,
  created_by, updated_by, created_at, updated_at, published_issue_id,
  published_at, abandoned_at
`;

function parseStringArray(value: string): string[] {
  const parsed = JSON.parse(value) as unknown;
  if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== "string")) {
    throw new Error("Invalid issue draft string-array payload.");
  }
  return parsed;
}

function parseObject(value: string): Record<string, unknown> {
  const parsed = JSON.parse(value) as unknown;
  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
    throw new Error("Invalid issue draft object payload.");
  }
  return parsed as Record<string, unknown>;
}

function parseNarrativeProvenance(value: string | null): ClientPortalNarrativeProvenance | null {
  if (value === null) return null;
  const parsed = JSON.parse(value) as unknown;
  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") throw new Error("Invalid issue draft narrative provenance.");
  const record = parsed as Record<string, unknown>;
  const selection = record.selection;
  const categories = ["summary", "included", "excluded", "unresolved", "warnings"] as const;
  if (!selection || Array.isArray(selection) || typeof selection !== "object") throw new Error("Invalid issue draft narrative provenance selection.");
  const selected = selection as Record<string, unknown>;
  if (categories.some((category) => !Array.isArray(selected[category]) || (selected[category] as unknown[]).some((id) => typeof id !== "string"))) {
    throw new Error("Invalid issue draft narrative provenance selection.");
  }
  const stringFields = ["aiDraft", "approvedAt", "approvedBy", "generatedAt", "inputFingerprint", "inputHash", "model", "outputHash", "provider", "runId"] as const;
  if (stringFields.some((field) => typeof record[field] !== "string" || !(record[field] as string).trim()) || !Number.isSafeInteger(record.schemaVersion) || Number(record.schemaVersion) < 1) {
    throw new Error("Invalid issue draft narrative provenance.");
  }
  return {
    aiDraft: record.aiDraft as string,
    approvedAt: record.approvedAt as string,
    approvedBy: record.approvedBy as string,
    generatedAt: record.generatedAt as string,
    inputFingerprint: record.inputFingerprint as string,
    inputHash: record.inputHash as string,
    model: record.model as string,
    outputHash: record.outputHash as string,
    provider: record.provider as string,
    runId: record.runId as string,
    schemaVersion: Number(record.schemaVersion),
    selection: Object.fromEntries(categories.map((category) => [category, [...selected[category] as string[]]])) as ClientPortalNarrativeProvenance["selection"],
  };
}

async function allRows<T>(database: D1DatabaseLike, sql: string, values: D1Value[]): Promise<T[]> {
  const result = await database.prepare(sql).bind(...values).all<T>();
  return result.results ?? [];
}

async function firstRow<T>(database: D1DatabaseLike, sql: string, values: D1Value[]): Promise<T | null> {
  return database.prepare(sql).bind(...values).first<T>();
}

function activeDraftSql(predicate: string): string {
  return `SELECT ${DRAFT_COLUMNS} FROM client_portal_issue_drafts WHERE ${predicate} AND status IN ('draft', 'ready', 'publishing') LIMIT 1`;
}

async function readSelections(database: D1DatabaseLike, draftId: string) {
  const [estimateRows, artifactRows, requestRows] = await Promise.all([
    allRows<EstimateRow>(
      database,
      `SELECT estimate_id, sort_order, included
       FROM client_portal_issue_draft_estimates
       WHERE draft_id = ?
       ORDER BY sort_order ASC, estimate_id ASC`,
      [draftId],
    ),
    allRows<ArtifactRow>(
      database,
      `SELECT artifact_version_id, purpose, commentable, downloadable,
              decision_relevant, sort_order, display_title, description
       FROM client_portal_issue_draft_artifacts
       WHERE draft_id = ?
       ORDER BY sort_order ASC, artifact_version_id ASC`,
      [draftId],
    ),
    allRows<RequestRow>(
      database,
      `SELECT request_id, request_version_id, relationship, sort_order
       FROM client_portal_issue_draft_requests
       WHERE draft_id = ?
       ORDER BY sort_order ASC, request_version_id ASC`,
      [draftId],
    ),
  ]);
  return {
    artifacts: artifactRows.map((row) => ({
      artifactVersionId: row.artifact_version_id,
      commentable: row.commentable === 1,
      decisionRelevant: row.decision_relevant === 1,
      description: row.description,
      displayTitle: row.display_title,
      downloadable: row.downloadable === 1,
      purpose: row.purpose,
      sortOrder: row.sort_order,
    })),
    estimates: estimateRows.map((row) => ({
      estimateId: row.estimate_id,
      included: row.included === 1,
      sortOrder: row.sort_order,
    })),
    requests: requestRows.map((row) => ({
      relationship: row.relationship,
      requestId: row.request_id,
      requestVersionId: row.request_version_id,
      sortOrder: row.sort_order,
    })),
  };
}

function toDraft(row: DraftRow, selections: Awaited<ReturnType<typeof readSelections>>): ClientPortalIssueDraft {
  return {
    abandonedAt: row.abandoned_at,
    artifacts: selections.artifacts,
    assumptions: parseStringArray(row.assumptions_json),
    basedOnBaselineId: row.based_on_baseline_id,
    basedOnIssueId: row.based_on_issue_id,
    comparisonIssueId: row.comparison_issue_id,
    createdAt: row.created_at,
    createdBy: row.created_by,
    decisionPolicy: parseObject(row.decision_policy_json),
    draftRevision: row.draft_revision,
    estimates: selections.estimates,
    exclusions: parseStringArray(row.exclusions_json),
    id: row.id,
    issueKind: row.issue_kind,
    narrativeProvenance: parseNarrativeProvenance(row.narrative_provenance_json),
    portalId: row.portal_id,
    projectId: row.project_id,
    publishedAt: row.published_at,
    publishedIssueId: row.published_issue_id,
    requestedDecision: row.requested_decision,
    requests: selections.requests,
    revisionNote: row.revision_note,
    sectionOverrides: parseObject(row.section_overrides_json),
    status: row.status,
    unresolvedItems: parseStringArray(row.unresolved_items_json),
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
    versionLabel: row.version_label,
    workspaceId: row.workspace_id,
  };
}

export async function findActiveIssueDraft(
  database: D1DatabaseLike,
  scope: Omit<IssueDraftScope, "draftId">,
): Promise<ClientPortalIssueDraft | null> {
  const row = await firstRow<DraftRow>(
    database,
    activeDraftSql("workspace_id = ? AND project_id = ? AND portal_id = ?"),
    [scope.workspaceId, scope.projectId, scope.portalId],
  );
  if (!row) return null;
  return toDraft(row, await readSelections(database, row.id));
}

export async function readIssueDraft(
  database: D1DatabaseLike,
  scope: IssueDraftScope,
): Promise<ClientPortalIssueDraft | null> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const row = await firstRow<DraftRow>(
      database,
      `SELECT ${DRAFT_COLUMNS}
       FROM client_portal_issue_drafts
       WHERE id = ? AND workspace_id = ? AND project_id = ? AND portal_id = ?
       LIMIT 1`,
      [scope.draftId, scope.workspaceId, scope.projectId, scope.portalId],
    );
    if (!row) return null;
    const selections = await readSelections(database, row.id);
    const revision = await firstRow<{ draft_revision: number; status: ClientPortalIssueDraftStatus }>(
      database,
      `SELECT draft_revision, status
       FROM client_portal_issue_drafts
       WHERE id = ? AND workspace_id = ? AND project_id = ? AND portal_id = ?`,
      [scope.draftId, scope.workspaceId, scope.projectId, scope.portalId],
    );
    if (revision?.draft_revision === row.draft_revision && revision.status === row.status) {
      return toDraft(row, selections);
    }
  }
  return null;
}

export async function insertIssueDraft(
  database: D1DatabaseLike,
  input: Omit<IssueDraftScope, "draftId"> & {
    actorId: string;
    draftId: string;
    issueKind: ClientPortalIssueKind;
    now: string;
  },
): Promise<boolean> {
  const result = await database.prepare(
    `INSERT INTO client_portal_issue_drafts (
       id, workspace_id, project_id, portal_id, status, draft_revision,
       issue_kind, created_by, updated_by, created_at, updated_at
     )
     SELECT ?, portal.workspace_id, portal.project_id, portal.id, 'draft', 1,
            ?, ?, ?, ?, ?
     FROM client_portals AS portal
     JOIN projects AS project
       ON project.id = portal.project_id AND project.workspace_id = portal.workspace_id
     WHERE portal.id = ? AND portal.project_id = ? AND portal.workspace_id = ?
       AND NOT EXISTS (
         SELECT 1 FROM client_portal_issue_drafts AS active
         WHERE active.portal_id = portal.id AND active.status IN ('draft', 'ready', 'publishing')
       )`,
  ).bind(
    input.draftId,
    input.issueKind,
    input.actorId,
    input.actorId,
    input.now,
    input.now,
    input.portalId,
    input.projectId,
    input.workspaceId,
  ).run();
  return (result.meta?.changes ?? 0) === 1;
}

function mutableDraftExistsSql(alias: string): string {
  return `EXISTS (
    SELECT 1 FROM client_portal_issue_drafts AS ${alias}
    WHERE ${alias}.id = ? AND ${alias}.workspace_id = ? AND ${alias}.project_id = ?
      AND ${alias}.portal_id = ? AND ${alias}.draft_revision = ?
      AND ${alias}.status IN ('draft', 'ready')
  )`;
}

function selectionDelete(
  database: D1DatabaseLike,
  table: string,
  input: ReplaceIssueDraftInput,
): D1PreparedStatementLike {
  return database.prepare(
    `DELETE FROM ${table}
     WHERE draft_id = ? AND ${mutableDraftExistsSql("draft")}`,
  ).bind(
    input.draftId,
    input.draftId,
    input.workspaceId,
    input.projectId,
    input.portalId,
    input.expectedRevision,
  );
}

function selectionGuardValues(input: ReplaceIssueDraftInput): D1Value[] {
  return [input.draftId, input.workspaceId, input.projectId, input.portalId, input.expectedRevision];
}

export async function replaceIssueDraft(
  database: D1DatabaseLike,
  input: ReplaceIssueDraftInput,
): Promise<boolean> {
  if (!database.batch) throw new Error("D1 batch support is required for issue draft updates.");
  const statements: D1PreparedStatementLike[] = [
    selectionDelete(database, "client_portal_issue_draft_estimates", input),
    selectionDelete(database, "client_portal_issue_draft_artifacts", input),
    selectionDelete(database, "client_portal_issue_draft_requests", input),
  ];

  for (const estimate of input.estimates) {
    statements.push(database.prepare(
      `INSERT INTO client_portal_issue_draft_estimates (draft_id, estimate_id, sort_order, included)
       SELECT ?, ?, ?, ?
       WHERE ${mutableDraftExistsSql("draft")}`,
    ).bind(
      input.draftId,
      estimate.estimateId,
      estimate.sortOrder,
      estimate.included ? 1 : 0,
      ...selectionGuardValues(input),
    ));
  }
  for (const artifact of input.artifacts) {
    statements.push(database.prepare(
      `INSERT INTO client_portal_issue_draft_artifacts (
         draft_id, artifact_version_id, purpose, commentable, downloadable,
         decision_relevant, sort_order, display_title, description
       )
       SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?
       WHERE ${mutableDraftExistsSql("draft")}`,
    ).bind(
      input.draftId,
      artifact.artifactVersionId,
      artifact.purpose,
      artifact.commentable ? 1 : 0,
      artifact.downloadable ? 1 : 0,
      artifact.decisionRelevant ? 1 : 0,
      artifact.sortOrder,
      artifact.displayTitle,
      artifact.description,
      ...selectionGuardValues(input),
    ));
  }
  for (const request of input.requests) {
    statements.push(database.prepare(
      `INSERT INTO client_portal_issue_draft_requests (
         draft_id, request_id, request_version_id, relationship, sort_order
       )
       SELECT ?, ?, ?, ?, ?
       WHERE ${mutableDraftExistsSql("draft")}`,
    ).bind(
      input.draftId,
      request.requestId,
      request.requestVersionId,
      request.relationship,
      request.sortOrder,
      ...selectionGuardValues(input),
    ));
  }

  statements.push(database.prepare(
    `UPDATE client_portal_issue_drafts
     SET status = 'draft', draft_revision = draft_revision + 1,
         issue_kind = ?, version_label = ?, based_on_issue_id = ?,
         based_on_baseline_id = ?, comparison_issue_id = ?, revision_note = ?, narrative_provenance_json = ?,
         assumptions_json = ?, exclusions_json = ?, unresolved_items_json = ?,
         requested_decision = ?, decision_policy_json = ?, section_overrides_json = ?,
         updated_by = ?, updated_at = ?
     WHERE id = ? AND workspace_id = ? AND project_id = ? AND portal_id = ?
       AND draft_revision = ? AND status IN ('draft', 'ready')`,
  ).bind(
    input.metadata.issueKind,
    input.metadata.versionLabel,
    input.metadata.basedOnIssueId,
    input.metadata.basedOnBaselineId,
    input.metadata.comparisonIssueId,
    input.metadata.revisionNote,
    input.metadata.narrativeProvenance ? JSON.stringify(input.metadata.narrativeProvenance) : null,
    JSON.stringify(input.metadata.assumptions),
    JSON.stringify(input.metadata.exclusions),
    JSON.stringify(input.metadata.unresolvedItems),
    input.metadata.requestedDecision,
    JSON.stringify(input.metadata.decisionPolicy),
    JSON.stringify(input.metadata.sectionOverrides),
    input.actorId,
    input.now,
    input.draftId,
    input.workspaceId,
    input.projectId,
    input.portalId,
    input.expectedRevision,
  ));

  const results = await database.batch(statements);
  return (results.at(-1)?.meta?.changes ?? 0) === 1;
}

async function runRevisionTransition(
  database: D1DatabaseLike,
  input: IssueDraftScope & { actorId: string; expectedRevision: number; now: string },
  transition: "ready" | "abandoned",
): Promise<boolean> {
  const abandonedAt = transition === "abandoned" ? input.now : null;
  const result = await database.prepare(
    `UPDATE client_portal_issue_drafts
     SET status = ?, draft_revision = draft_revision + 1, updated_by = ?, updated_at = ?, abandoned_at = ?
     WHERE id = ? AND workspace_id = ? AND project_id = ? AND portal_id = ?
       AND draft_revision = ? AND status IN ('draft', 'ready')`,
  ).bind(
    transition,
    input.actorId,
    input.now,
    abandonedAt,
    input.draftId,
    input.workspaceId,
    input.projectId,
    input.portalId,
    input.expectedRevision,
  ).run();
  return (result.meta?.changes ?? 0) === 1;
}

export function markIssueDraftReady(
  database: D1DatabaseLike,
  input: IssueDraftScope & { actorId: string; expectedRevision: number; now: string },
): Promise<boolean> {
  return runRevisionTransition(database, input, "ready");
}

export function abandonIssueDraft(
  database: D1DatabaseLike,
  input: IssueDraftScope & { actorId: string; expectedRevision: number; now: string },
): Promise<boolean> {
  return runRevisionTransition(database, input, "abandoned");
}

export async function readIssueDraftStatus(
  database: D1DatabaseLike,
  scope: IssueDraftScope,
): Promise<{ draftRevision: number; status: ClientPortalIssueDraftStatus } | null> {
  const row = await firstRow<{ draft_revision: number; status: ClientPortalIssueDraftStatus }>(
    database,
    `SELECT draft_revision, status
     FROM client_portal_issue_drafts
     WHERE id = ? AND workspace_id = ? AND project_id = ? AND portal_id = ?`,
    [scope.draftId, scope.workspaceId, scope.projectId, scope.portalId],
  );
  return row ? { draftRevision: row.draft_revision, status: row.status } : null;
}
