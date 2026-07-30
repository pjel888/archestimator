import "server-only";

import { createHash, randomUUID } from "node:crypto";

import type { D1DatabaseLike, D1PreparedStatementLike, D1Value } from "@/lib/cloudflare/d1";
import { createIssuedClientPortalBrandSnapshot } from "@/lib/client-portal/brand";
import { buildClientPortalIssuedBrandSnapshot } from "@/lib/client-portal/brand-service";
import {
  buildClientPortalEstimateBrowserRowProjection,
  requiresClientPortalEstimateBrowserServerPaging,
  summarizeClientPortalEstimateBrowserPayload,
  type ClientPortalEstimateBrowserPayload,
} from "@/lib/client-portal/estimate-browser";
import type {
  ClientPortalIssueArtifactPurpose,
  ClientPortalIssueKind,
  ClientPortalIssueRequestRelationship,
} from "@/lib/client-portal/issue-draft-contracts";
import type { PrivateClientPortalChangeSet, PublicClientPortalChangeSet } from "@/lib/client-portal/change-set";
import type { ClientPortalIssueSourceProjection } from "@/lib/client-portal/issue-source-projection";
import { ESTIMATE_CALCULATION_CURRENCY_SCALE } from "@/lib/estimates/estimate-row-total";
import { type ClientPortalInternalActor, evaluateClientPortalPolicy } from "@/lib/client-portal/policy";
import { prepareProjectCommitmentEventWrites } from "@/lib/project-ledger/event-service";
import {
  CLIENT_PORTAL_SECTION_REGISTRY,
  buildClientPortalPublicSection,
  parseClientPortalSectionDraft,
  sanitizeClientPortalIssuedPayload,
  type ClientPortalPublicSectionManifest,
  type ClientPortalPublicValue,
  type ClientPortalSectionDraft,
} from "@/lib/client-portal/section-registry";

type PortalRow = {
  id: string;
  idempotency_key?: string;
  workspace_id: string;
  project_id: string;
  status: "draft" | "ready" | "live" | "access_off" | "archived";
  current_issue_id: string | null;
};

type IssueRow = {
  id: string;
  issue_number: number;
  version_label: string;
  content_hash: string;
  status: "issued" | "under_review" | "changes_requested" | "accepted" | "declined" | "superseded" | "withdrawn" | "archived";
};

type DraftSectionRow = {
  id: string;
  section_key: string;
  kind: string;
  title: string;
  description: string | null;
  sort_order: number;
  enabled: number;
  layout_mode: string;
  data_scope_json: string;
  visibility_policy_json: string;
  field_policy_json: string;
  interaction_policy_json: string;
  print_policy_json: string;
  config_json: string;
};

type JsonRecord = Record<string, unknown>;

const CLIENT_PORTAL_ESTIMATE_PROJECTION_INSERT_CHUNK_SIZE = 40;
const D1_MAX_BATCH_STATEMENTS = 1_000;
const CLIENT_PORTAL_SUPERSEDABLE_ISSUE_STATUSES = new Set<IssueRow["status"]>([
  "issued",
  "under_review",
  "changes_requested",
]);

export type ClientPortalIssueSource = {
  authoringSemanticHash: string;
  currencyCode: string;
  decisionPolicySnapshot: JsonRecord;
  exclusions: readonly string[];
  projectSnapshot: {
    code: string | null;
    name: string;
  };
  selectedEstimateIds: readonly string[];
  semanticHash: string;
  sourceRevision: number;
  totalCost: number;
  totalCostMinorUnits: number;
  projectionSchemaVersion: number;
  assumptions: readonly string[];
};

export type ClientPortalR2PayloadReference = {
  payloadBytes: number;
  payloadHash: string;
  r2ObjectKey: string;
  storage: "r2_object";
};

export type ClientPortalD1PayloadReference = {
  payloadBytes: number;
  payloadHash: string;
  payload: ClientPortalPublicValue;
  storage: "d1_json";
};

export type ClientPortalIssuePayloadReference = ClientPortalR2PayloadReference | ClientPortalD1PayloadReference;

export type ClientPortalIssuePackage = {
  artifacts: readonly {
    artifactId: string;
    artifactVersionId: string;
    commentable: boolean;
    contentSha256: string;
    contentType: string;
    decisionRelevant: boolean;
    description: string | null;
    displayTitle: string;
    downloadable: boolean;
    fileName: string;
    publicArtifactId: string;
    purpose: ClientPortalIssueArtifactPurpose;
    sizeBytes: number;
    sortOrder: number;
    versionLabel: string;
  }[];
  basedOnBaselineId: string | null;
  comparisonIssueId: string | null;
  draftId: string;
  draftRevision: number;
  estimates: readonly {
    publicEstimateId: string;
    sortOrder: number;
    sourceEstimateId: string;
    sourceHash: string;
    sourceRevision: number;
  }[];
  issueKind: ClientPortalIssueKind;
  requestedDecision: "none" | "acknowledgement" | "formal";
  requests: readonly {
    contentHash: string;
    relationship: ClientPortalIssueRequestRelationship;
    requestCode: string;
    requestId: string;
    requestVersionId: string;
    sortOrder: number;
    title: string;
    versionNumber: number;
  }[];
  revisionNote: string;
  sectionOverrides: JsonRecord;
  unresolvedItems: readonly string[];
};

type ClientPortalIssueChangeSet = {
  aiProvenance?: {
    aiDraft: string;
    approvedAt: string;
    approvedBy: string;
    generatedAt: string;
    inputHash: string;
    model: string;
    outputHash: string;
    provider: string;
    runId: string;
    schemaVersion: number;
  };
  deterministicSummary: string;
  finalNarrative: string;
  narrativeSource: "ai_reviewed" | "deterministic" | "human";
  privateChangeSet: PrivateClientPortalChangeSet;
  publicChangeSet: PublicClientPortalChangeSet;
  structuredDiffHash: string;
};

export type ClientPortalIssueBuildInput = {
  actor: ClientPortalInternalActor;
  buildSectionPayload: (input: { draft: ClientPortalSectionDraft; sectionKey: string }) => Promise<unknown>;
  database: D1DatabaseLike;
  idempotencyKey: string;
  changeSet?: ClientPortalIssueChangeSet;
  issuePackage?: ClientPortalIssuePackage;
  privateSourceProjection?: ClientPortalIssueSourceProjection;
  portalId: string;
  source: ClientPortalIssueSource;
  assertSourceCurrent?: () => Promise<void>;
  stagePayload?: (input: {
    draft: ClientPortalSectionDraft;
    payload: ClientPortalPublicValue;
    payloadBytes: number;
    payloadHash: string;
    sectionKey: string;
  }) => Promise<ClientPortalIssuePayloadReference>;
  validThrough?: string | null;
  versionLabel?: string;
};

export type ClientPortalPublishedIssue = {
  contentHash: string;
  issueId: string;
  issueNumber: number;
  reusedExistingIssue: boolean;
  sections: readonly ClientPortalPublicSectionManifest[];
  versionLabel: string;
};

export class ClientPortalIssueBuildError extends Error {
  constructor(
    readonly code:
      | "client_portal_batch_required"
      | "client_portal_invalid_input"
      | "client_portal_not_found"
      | "client_portal_publish_denied"
      | "client_portal_source_changed"
      | "client_portal_source_invalid"
      | "client_portal_write_failed",
    message: string,
  ) {
    super(message);
    this.name = "ClientPortalIssueBuildError";
  }
}

function canonicalJson(value: unknown): string {
  const normalize = (entry: unknown): unknown => {
    if (Array.isArray(entry)) return entry.map(normalize);
    if (entry && typeof entry === "object") {
      return Object.fromEntries(Object.keys(entry as JsonRecord).sort().map((key) => [key, normalize((entry as JsonRecord)[key])]));
    }
    return entry;
  };
  return JSON.stringify(normalize(value));
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function parseJsonRecord(value: string, name: string): JsonRecord {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not an object");
    return parsed as JsonRecord;
  } catch {
    throw new ClientPortalIssueBuildError("client_portal_source_invalid", `${name} must be a JSON object.`);
  }
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

function requireSource(source: ClientPortalIssueSource) {
  if (!Number.isFinite(source.totalCost) || source.totalCost < 0) {
    throw new ClientPortalIssueBuildError("client_portal_source_invalid", "Issue totalCost must be a non-negative finite number.");
  }
  if (!/^[A-Z]{3}$/.test(source.currencyCode)) {
    throw new ClientPortalIssueBuildError("client_portal_source_invalid", "Issue currencyCode must be a three-letter uppercase ISO code.");
  }
  if (!source.projectSnapshot.name.trim()) {
    throw new ClientPortalIssueBuildError("client_portal_source_invalid", "Issue projectSnapshot.name must be non-empty.");
  }
  const duplicate = source.selectedEstimateIds.some((id, index) => source.selectedEstimateIds.indexOf(id) !== index || !id.trim());
  if (duplicate) throw new ClientPortalIssueBuildError("client_portal_source_invalid", "Selected estimate IDs must be unique non-empty strings.");
  if (!/^[a-f0-9]{64}$/.test(source.semanticHash)) {
    throw new ClientPortalIssueBuildError("client_portal_source_invalid", "Issue semanticHash must be a lowercase SHA-256 digest.");
  }
  if (!/^[a-f0-9]{64}$/.test(source.authoringSemanticHash)) {
    throw new ClientPortalIssueBuildError("client_portal_source_invalid", "Issue authoringSemanticHash must be a lowercase SHA-256 digest.");
  }
  if (!Number.isSafeInteger(source.sourceRevision) || source.sourceRevision < 0) {
    throw new ClientPortalIssueBuildError("client_portal_source_invalid", "Issue sourceRevision must be a non-negative safe integer.");
  }
  if (!Number.isSafeInteger(source.totalCostMinorUnits) || source.totalCostMinorUnits < 0) {
    throw new ClientPortalIssueBuildError("client_portal_source_invalid", "Issue totalCostMinorUnits must be a non-negative safe integer.");
  }
  if (source.totalCost !== source.totalCostMinorUnits / (10 ** ESTIMATE_CALCULATION_CURRENCY_SCALE)) {
    throw new ClientPortalIssueBuildError("client_portal_source_invalid", "Issue totalCost must reconcile with totalCostMinorUnits.");
  }
  if (!Number.isSafeInteger(source.projectionSchemaVersion) || source.projectionSchemaVersion < 1) {
    throw new ClientPortalIssueBuildError("client_portal_source_invalid", "Issue projectionSchemaVersion must be a positive integer.");
  }
}

function requireIssuePackage(issuePackage: ClientPortalIssuePackage | undefined, source: ClientPortalIssueSource) {
  if (!issuePackage) return;
  if (!issuePackage.draftId.trim() || !Number.isSafeInteger(issuePackage.draftRevision) || issuePackage.draftRevision < 1) {
    throw new ClientPortalIssueBuildError("client_portal_source_invalid", "Issue package draft identity is invalid.");
  }
  if (!issuePackage.revisionNote.trim()) {
    throw new ClientPortalIssueBuildError("client_portal_source_invalid", "Issue package revision note is required.");
  }
  const packageEstimateIds = issuePackage.estimates.map((estimate) => estimate.sourceEstimateId);
  if (packageEstimateIds.length !== source.selectedEstimateIds.length || packageEstimateIds.some((id) => !source.selectedEstimateIds.includes(id))) {
    throw new ClientPortalIssueBuildError("client_portal_source_invalid", "Issue package estimates must match the issued source selection.");
  }
  const publicEstimateIds = issuePackage.estimates.map((estimate) => estimate.publicEstimateId);
  if (new Set(publicEstimateIds).size !== publicEstimateIds.length || issuePackage.estimates.some((estimate) => !/^[a-f0-9]{64}$/.test(estimate.sourceHash))) {
    throw new ClientPortalIssueBuildError("client_portal_source_invalid", "Issue package estimate projections are invalid.");
  }
  const publicArtifactIds = issuePackage.artifacts.map((artifact) => artifact.publicArtifactId);
  if (new Set(publicArtifactIds).size !== publicArtifactIds.length || issuePackage.artifacts.some((artifact) => !/^[a-f0-9]{64}$/.test(artifact.contentSha256))) {
    throw new ClientPortalIssueBuildError("client_portal_source_invalid", "Issue package artifact projections are invalid.");
  }
  if (issuePackage.requests.some((request) => !/^[a-f0-9]{64}$/.test(request.contentHash))) {
    throw new ClientPortalIssueBuildError("client_portal_source_invalid", "Issue package request projections are invalid.");
  }
}

function requirePrivateSourceProjection(
  projection: ClientPortalIssueSourceProjection | undefined,
  issuePackage: ClientPortalIssuePackage | undefined,
  source: ClientPortalIssueSource,
) {
  if (!projection) return;
  if (!issuePackage) {
    throw new ClientPortalIssueBuildError("client_portal_source_invalid", "Private issue source projections require an issue package draft.");
  }
  if (projection.currencyCode !== source.currencyCode || projection.totalMinorUnits !== source.totalCostMinorUnits) {
    throw new ClientPortalIssueBuildError("client_portal_source_invalid", "Private issue source projection totals must reconcile with the issued source.");
  }
  const packageEstimates = new Map(issuePackage.estimates.map((estimate) => [estimate.sourceEstimateId, estimate]));
  if (projection.estimates.length !== packageEstimates.size) {
    throw new ClientPortalIssueBuildError("client_portal_source_invalid", "Private issue source projections must match the package estimate selection.");
  }
  for (const estimate of projection.estimates) {
    const packageEstimate = packageEstimates.get(estimate.sourceEstimateId);
    if (!packageEstimate || packageEstimate.sourceHash !== estimate.sourceHash || estimate.currencyCode !== source.currencyCode) {
      throw new ClientPortalIssueBuildError("client_portal_source_invalid", "Private issue estimate projections must match the package source hashes.");
    }
  }
}

function requireChangeSet(changeSet: ClientPortalIssueChangeSet | undefined, issuePackage: ClientPortalIssuePackage | undefined) {
  if (!changeSet) return;
  if (!issuePackage) throw new ClientPortalIssueBuildError("client_portal_source_invalid", "Issue change sets require an issue package draft.");
  if (!/^[a-f0-9]{64}$/.test(changeSet.structuredDiffHash)) {
    throw new ClientPortalIssueBuildError("client_portal_source_invalid", "Issue change-set hash must be a lowercase SHA-256 digest.");
  }
  if (!changeSet.deterministicSummary.trim() || !changeSet.finalNarrative.trim()) {
    throw new ClientPortalIssueBuildError("client_portal_source_invalid", "Issue change-set narratives must be non-empty.");
  }
  if (changeSet.narrativeSource === "ai_reviewed") {
    const provenance = changeSet.aiProvenance;
    if (
      !provenance
      || !provenance.aiDraft.trim()
      || !provenance.approvedBy.trim()
      || !provenance.runId.trim()
      || !provenance.model.trim()
      || !provenance.provider.trim()
      || !Number.isSafeInteger(provenance.schemaVersion)
      || provenance.schemaVersion < 1
      || !/^[a-f0-9]{64}$/.test(provenance.inputHash)
      || !/^[a-f0-9]{64}$/.test(provenance.outputHash)
      || !Number.isFinite(Date.parse(provenance.generatedAt))
      || !Number.isFinite(Date.parse(provenance.approvedAt))
    ) {
      throw new ClientPortalIssueBuildError("client_portal_source_invalid", "AI-reviewed issue narratives require verified generation and approval provenance.");
    }
  } else if (changeSet.aiProvenance) {
    throw new ClientPortalIssueBuildError("client_portal_source_invalid", "Non-AI issue narratives cannot include AI provenance.");
  }
  if (changeSet.privateChangeSet.currencyCode !== changeSet.publicChangeSet.currencyCode) {
    throw new ClientPortalIssueBuildError("client_portal_source_invalid", "Private and public issue change sets must use one currency.");
  }
}

function toSectionDraft(row: DraftSectionRow): { draft: ClientPortalSectionDraft; policySnapshot: JsonRecord; sectionKey: string } {
  const visibilityPolicy = parseJsonRecord(row.visibility_policy_json, `visibility policy for ${row.section_key}`);
  const fieldPolicy = parseJsonRecord(row.field_policy_json, `field policy for ${row.section_key}`);
  const interactionPolicy = parseJsonRecord(row.interaction_policy_json, `interaction policy for ${row.section_key}`);
  const printPolicy = parseJsonRecord(row.print_policy_json, `print policy for ${row.section_key}`);
  const registryEntry = CLIENT_PORTAL_SECTION_REGISTRY[row.kind as keyof typeof CLIENT_PORTAL_SECTION_REGISTRY];
  if (!registryEntry) throw new ClientPortalIssueBuildError("client_portal_source_invalid", `Unknown stored section kind: ${row.kind}.`);

  return {
    sectionKey: row.section_key,
    policySnapshot: {
      allowedOrganizations: Array.isArray(visibilityPolicy.allowedOrganizations) ? visibilityPolicy.allowedOrganizations : [],
      allowedRecipientIds: Array.isArray(visibilityPolicy.allowedRecipientIds) ? visibilityPolicy.allowedRecipientIds : [],
      commentable: typeof interactionPolicy.commentable === "boolean" ? interactionPolicy.commentable : registryEntry.defaultCommentable,
      downloadable: typeof printPolicy.downloadable === "boolean" ? printPolicy.downloadable : registryEntry.defaultDownloadable,
      enabled: Boolean(row.enabled),
      layoutMode: row.layout_mode,
      minimumCapability: typeof visibilityPolicy.minimumCapability === "string" ? visibilityPolicy.minimumCapability : null,
      visibleFields: Array.isArray(fieldPolicy.visibleFields) ? fieldPolicy.visibleFields : [],
    },
    draft: parseClientPortalSectionDraft({
      schemaVersion: 1,
      id: row.id,
      kind: row.kind,
      title: row.title,
      description: row.description,
      sortOrder: row.sort_order,
      enabled: Boolean(row.enabled),
      layoutMode: row.layout_mode,
      visibleFields: stringArray(fieldPolicy.visibleFields),
      commentable: typeof interactionPolicy.commentable === "boolean" ? interactionPolicy.commentable : registryEntry.defaultCommentable,
      downloadable: typeof printPolicy.downloadable === "boolean" ? printPolicy.downloadable : registryEntry.defaultDownloadable,
      dataScope: parseJsonRecord(row.data_scope_json, `data scope for ${row.section_key}`),
      config: parseJsonRecord(row.config_json, `config for ${row.section_key}`),
    }),
  };
}

function statement(database: D1DatabaseLike, sql: string, values: D1Value[]): D1PreparedStatementLike {
  return database.prepare(sql).bind(...values);
}

type IssueCommitGuard = {
  contentHash: string;
  issueId: string;
  portalId: string;
};

function issueCommitGuardSql() {
  return "EXISTS (SELECT 1 FROM client_portal_issues committed_issue WHERE committed_issue.id = ? AND committed_issue.portal_id = ? AND committed_issue.content_hash = ?)";
}

function issueCommitGuardValues(guard: IssueCommitGuard): D1Value[] {
  return [guard.issueId, guard.portalId, guard.contentHash];
}

function conditionalInsertStatement(
  database: D1DatabaseLike,
  table: string,
  columns: readonly string[],
  values: readonly D1Value[],
  guard: IssueCommitGuard,
) {
  return statement(
    database,
    `INSERT INTO ${table} (${columns.join(", ")})
     SELECT ${columns.map(() => "?").join(", ")}
     WHERE ${issueCommitGuardSql()}`,
    [...values, ...issueCommitGuardValues(guard)],
  );
}

function packedInsertStatements(
  database: D1DatabaseLike,
  table: string,
  columns: readonly string[],
  rows: readonly D1Value[][],
  guard: IssueCommitGuard,
) {
  const statements: D1PreparedStatementLike[] = [];
  for (let index = 0; index < rows.length; index += CLIENT_PORTAL_ESTIMATE_PROJECTION_INSERT_CHUNK_SIZE) {
    const chunk = rows.slice(index, index + CLIENT_PORTAL_ESTIMATE_PROJECTION_INSERT_CHUNK_SIZE);
    const sourceColumns = columns.map((_, columnIndex) => `value_${columnIndex}`);
    const sourceRows = chunk.map((row, rowIndex) => `SELECT ${row.map((_, columnIndex) => rowIndex === 0 ? `? AS ${sourceColumns[columnIndex]}` : "?").join(", ")}`).join(" UNION ALL ");
    statements.push(statement(
      database,
      `INSERT INTO ${table} (${columns.join(", ")})
       SELECT ${sourceColumns.join(", ")}
       FROM (${sourceRows}) packed_rows
       WHERE ${issueCommitGuardSql()}`,
      [...chunk.flat(), ...issueCommitGuardValues(guard)],
    ));
  }
  return statements;
}

function estimateBrowserPayload(value: ClientPortalPublicValue): ClientPortalEstimateBrowserPayload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const payload = value as unknown as ClientPortalEstimateBrowserPayload;
  return payload.schemaVersion === 1 && Array.isArray(payload.estimates) && Number.isInteger(payload.totalRowCount) ? payload : null;
}

async function first<T>(database: D1DatabaseLike, sql: string, values: D1Value[]): Promise<T | null> {
  return database.prepare<T>(sql).bind(...values).first<T>();
}

async function all<T>(database: D1DatabaseLike, sql: string, values: D1Value[]): Promise<T[]> {
  const result = await database.prepare<T>(sql).bind(...values).all<T>();
  if (result.success === false) throw new ClientPortalIssueBuildError("client_portal_write_failed", "Client Portal source read failed.");
  return result.results ?? [];
}

function sameIssue(issue: IssueRow): ClientPortalPublishedIssue {
  return {
    contentHash: issue.content_hash,
    issueId: issue.id,
    issueNumber: issue.issue_number,
    reusedExistingIssue: true,
    sections: [],
    versionLabel: issue.version_label,
  };
}

export async function publishClientPortalIssue(input: ClientPortalIssueBuildInput): Promise<ClientPortalPublishedIssue> {
  if (!input.database.batch) throw new ClientPortalIssueBuildError("client_portal_batch_required", "Client Portal publish requires D1 batch support.");
  if (!input.idempotencyKey.trim()) throw new ClientPortalIssueBuildError("client_portal_invalid_input", "An idempotency key is required.");
  requireSource(input.source);
  requireIssuePackage(input.issuePackage, input.source);
  requirePrivateSourceProjection(input.privateSourceProjection, input.issuePackage, input.source);
  requireChangeSet(input.changeSet, input.issuePackage);

  const portal = await first<PortalRow>(
    input.database,
    "SELECT id, workspace_id, project_id, status, current_issue_id FROM client_portals WHERE id = ? LIMIT 1",
    [input.portalId],
  );
  if (!portal) throw new ClientPortalIssueBuildError("client_portal_not_found", "Client Portal was not found.");
  const brandSnapshot = createIssuedClientPortalBrandSnapshot(await buildClientPortalIssuedBrandSnapshot({ database: input.database, portalId: portal.id }));

  const authorization = evaluateClientPortalPolicy({
    actor: input.actor,
    action: "portal:publish",
    portal: {
      id: portal.id,
      workspaceId: portal.workspace_id,
      projectId: portal.project_id,
      status: portal.status,
      allowAnonymousView: false,
    },
  });
  if (!authorization.allowed) throw new ClientPortalIssueBuildError("client_portal_publish_denied", "Actor cannot publish this Client Portal.");

  const rows = await all<DraftSectionRow>(
    input.database,
    `SELECT id, section_key, kind, title, description, sort_order, enabled, layout_mode,
            visibility_policy_json, data_scope_json, field_policy_json, interaction_policy_json, print_policy_json, config_json
     FROM client_portal_sections
     WHERE portal_id = ? AND enabled = 1
     ORDER BY sort_order ASC, section_key ASC`,
    [portal.id],
  );
  const draftedSections = rows.map(toSectionDraft);
  if (draftedSections.length === 0) throw new ClientPortalIssueBuildError("client_portal_source_invalid", "Client Portal needs at least one enabled section before publishing.");

  const priorIdempotencyIssue = await first<IssueRow>(
    input.database,
    "SELECT id, issue_number, version_label, content_hash, status FROM client_portal_issues WHERE portal_id = ? AND idempotency_key = ? LIMIT 1",
    [portal.id, input.idempotencyKey],
  );
  if (priorIdempotencyIssue) return sameIssue(priorIdempotencyIssue);

  const contentHash = sha256(canonicalJson({
    portalId: portal.id,
    brandSnapshot,
    source: input.source,
    changeSet: input.changeSet ?? null,
    issuePackage: input.issuePackage ?? null,
    privateSourceProjection: input.privateSourceProjection ?? null,
    sections: draftedSections.map(({ draft, policySnapshot, sectionKey }) => ({ draft, policySnapshot, sectionKey })),
    validThrough: input.validThrough ?? null,
    versionLabel: input.versionLabel?.trim() || null,
  }));
  const priorSameIssue = portal.current_issue_id
    ? await first<IssueRow>(
        input.database,
        `SELECT id, issue_number, version_label, content_hash, status
         FROM client_portal_issues
         WHERE id = ? AND portal_id = ? AND content_hash = ?
           AND status IN ('issued', 'under_review', 'changes_requested')
         LIMIT 1`,
        [portal.current_issue_id, portal.id, contentHash],
      )
    : null;
  if (priorSameIssue) {
    await input.assertSourceCurrent?.();
    return sameIssue(priorSameIssue);
  }

  const issuedSections: Array<{ manifest: ClientPortalPublicSectionManifest; policySnapshot: JsonRecord; sectionKey: string; storage: ClientPortalIssuePayloadReference }> = [];
  for (const { draft, policySnapshot, sectionKey } of draftedSections) {
    const payload = await input.buildSectionPayload({ draft, sectionKey });
    const safePayload = sanitizeClientPortalIssuedPayload(payload, draft.visibleFields);
    const payloadHash = sha256(canonicalJson(safePayload));
    const publicSection = buildClientPortalPublicSection(draft, payloadHash, safePayload);
    const payloadJson = canonicalJson(publicSection.payload);
    const defaultStorage: ClientPortalD1PayloadReference = {
      storage: "d1_json",
      payload: publicSection.payload,
      payloadHash,
      payloadBytes: new TextEncoder().encode(payloadJson).byteLength,
    };
    const storage = input.stagePayload
      ? await input.stagePayload({ draft, payload: publicSection.payload, payloadBytes: defaultStorage.payloadBytes, payloadHash, sectionKey })
      : defaultStorage;
    if (storage.payloadHash !== payloadHash || storage.payloadBytes < 0 || (storage.storage === "r2_object" && !storage.r2ObjectKey.trim())) {
      throw new ClientPortalIssueBuildError("client_portal_source_invalid", `Payload staging is invalid for ${sectionKey}.`);
    }
    issuedSections.push({ manifest: publicSection, policySnapshot, sectionKey, storage });
  }
  await input.assertSourceCurrent?.();

  const latestIssue = await first<IssueRow>(
    input.database,
    "SELECT id, issue_number, version_label, content_hash, status FROM client_portal_issues WHERE portal_id = ? ORDER BY issue_number DESC LIMIT 1",
    [portal.id],
  );
  const activeRecipients = await all<{ id: string }>(
    input.database,
    "SELECT id FROM client_portal_recipients WHERE portal_id = ? AND status = 'active' ORDER BY id ASC",
    [portal.id],
  );
  const issueNumber = (latestIssue?.issue_number ?? 0) + 1;
  const issueId = `issue_${randomUUID()}`;
  const issuedAt = new Date().toISOString();
  const versionLabel = input.versionLabel?.trim() || `Issue ${issueNumber}`;
  const replacesPendingIssue = Boolean(latestIssue && CLIENT_PORTAL_SUPERSEDABLE_ISSUE_STATUSES.has(latestIssue.status));
  const manifest = {
    schemaVersion: 1,
    portalId: portal.id,
    issueId,
    issueNumber,
    versionLabel,
    issuedAt,
    contentHash,
    authoringSemanticHash: input.source.authoringSemanticHash,
    sourceRevision: input.source.sourceRevision,
    sourceSemanticHash: input.source.semanticHash,
    projectionSchemaVersion: input.source.projectionSchemaVersion,
    totalCost: input.source.totalCost,
    currencyCode: input.source.currencyCode,
    project: input.source.projectSnapshot,
    package: input.issuePackage ? {
      issueKind: input.issuePackage.issueKind,
      revisionNote: input.issuePackage.revisionNote,
      requestedDecision: input.issuePackage.requestedDecision,
      unresolvedItems: input.issuePackage.unresolvedItems,
      estimates: input.issuePackage.estimates.map((estimate) => ({
        id: estimate.publicEstimateId,
        sortOrder: estimate.sortOrder,
      })),
      artifacts: input.issuePackage.artifacts.map((artifact) => ({
        id: artifact.publicArtifactId,
        purpose: artifact.purpose,
        title: artifact.displayTitle,
        description: artifact.description,
        contentType: artifact.contentType,
        sizeBytes: artifact.sizeBytes,
        commentable: artifact.commentable,
        downloadable: artifact.downloadable,
        decisionRelevant: artifact.decisionRelevant,
        sortOrder: artifact.sortOrder,
      })),
      requests: input.issuePackage.requests.map((request) => ({
        code: request.requestCode,
        title: request.title,
        relationship: request.relationship,
        sortOrder: request.sortOrder,
      })),
    } : null,
    changeSet: input.changeSet ? {
      structured: input.changeSet.publicChangeSet,
      deterministicSummary: input.changeSet.deterministicSummary,
      finalNarrative: input.changeSet.finalNarrative,
      narrativeSource: input.changeSet.narrativeSource,
    } : null,
    sections: issuedSections.map(({ manifest: section, sectionKey }) => ({
      id: `section_${randomUUID()}`,
      kind: section.kind,
      title: section.title,
      sortOrder: section.sortOrder,
      layoutMode: section.layoutMode,
      payloadHash: section.payloadHash,
      sectionKey,
    })),
  };

  const commitGuard = { contentHash, issueId, portalId: portal.id };
  const rootRequestId = input.issuePackage?.requests.find((request) => request.relationship === "origin")?.requestId ?? null;
  const issueEvent = prepareProjectCommitmentEventWrites({
    actor: { actorId: input.actor.userId, actorType: "internal_user", domainRoleSnapshot: "publisher" },
    clientSafeSnapshot: {
      currencyCode: input.source.currencyCode,
      issueNumber,
      requestCodes: input.issuePackage?.requests.filter((request) => request.relationship === "origin" || request.relationship === "addresses").map((request) => request.requestCode) ?? [],
      status: "issued",
      totalCost: input.source.totalCost,
      versionLabel,
      ...(replacesPendingIssue && latestIssue ? { replacesIssueNumber: latestIssue.issue_number } : {}),
    },
    correlationId: `issue:${contentHash}:published`,
    database: input.database,
    eventId: `commitment_${issueId}`,
    eventType: replacesPendingIssue ? "issue.replaced" : "issue.issued",
    exposure: {
      exposureKind: "automatic",
      policySnapshot: { capability: "timeline:view", issueNumber },
      portalId: portal.id,
      publicEventId: `issue_event_${issueNumber}_${contentHash.slice(0, 16)}`,
    },
    internalMetadata: { contentHash, sourceRevision: input.source.sourceRevision, supersedesIssueId: replacesPendingIssue ? latestIssue?.id ?? null : null },
    occurredAt: issuedAt,
    originPortalId: portal.id,
    projectId: portal.project_id,
    rootRequestId,
    source: { issueId, sourceType: "issue" },
    summary: input.changeSet?.finalNarrative ?? input.issuePackage?.revisionNote ?? null,
    title: replacesPendingIssue ? `${versionLabel} replaced the pending proposal` : `${versionLabel} was issued`,
    workspaceId: portal.workspace_id,
  });
  const artifactExposureEvents = input.issuePackage?.artifacts.map((artifact) => {
    const publicEventSuffix = sha256(`${issueId}:${artifact.artifactVersionId}:${artifact.publicArtifactId}`).slice(0, 20);
    return prepareProjectCommitmentEventWrites({
      actor: { actorId: input.actor.userId, actorType: "internal_user", domainRoleSnapshot: "publisher" },
      clientSafeSnapshot: {
        issueNumber,
        publicArtifactId: artifact.publicArtifactId,
        title: artifact.displayTitle,
        versionLabel: artifact.versionLabel,
      },
      correlationId: `artifact:${artifact.artifactId}:version:${artifact.artifactVersionId}:issue:${issueId}:exposed`,
      database: input.database,
      eventType: "artifact.exposed",
      exposure: {
        exposureKind: "automatic",
        policySnapshot: { capability: "timeline:view", issueNumber, publicArtifactId: artifact.publicArtifactId },
        portalId: portal.id,
        publicEventId: `artifact_event_${publicEventSuffix}`,
      },
      internalMetadata: {
        issueId,
        publicArtifactId: artifact.publicArtifactId,
        purpose: artifact.purpose,
      },
      occurredAt: issuedAt,
      originPortalId: portal.id,
      projectId: portal.project_id,
      rootRequestId,
      source: {
        artifactId: artifact.artifactId,
        artifactVersionId: artifact.artifactVersionId,
        sourceType: "artifact",
      },
      summary: `${artifact.versionLabel} was included in ${versionLabel}.`,
      title: `${artifact.displayTitle} was shared for review`,
      workspaceId: portal.workspace_id,
    });
  }) ?? [];
  const statements: D1PreparedStatementLike[] = [
    statement(
      input.database,
      `INSERT INTO client_portal_issues (
        id, portal_id, issue_number, version_label, status, issued_at, issued_by, idempotency_key, valid_through, supersedes_issue_id,
        manifest_json, content_hash, total_cost, currency_code, selected_estimate_ids_json, brand_snapshot_json,
        decision_policy_snapshot_json, assumptions_json, exclusions_json, created_at,
        issue_kind, draft_id, based_on_baseline_id, comparison_issue_id, revision_note, change_set_hash
      )
      SELECT ?, ?, ?, ?, 'issued', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      FROM client_portals source_portal
      JOIN projects source_project
        ON source_project.id = source_portal.project_id
       AND source_project.workspace_id = source_portal.workspace_id
      ${input.issuePackage ? `JOIN client_portal_issue_drafts source_draft
        ON source_draft.id = ?
       AND source_draft.portal_id = source_portal.id
       AND source_draft.project_id = source_portal.project_id
       AND source_draft.workspace_id = source_portal.workspace_id
       AND source_draft.status = 'ready'
       AND source_draft.draft_revision = ?` : ""}
      WHERE source_portal.id = ?
        AND source_portal.workspace_id = ?
        AND source_portal.project_id = ?
        AND source_project.publication_source_revision = ?`,
      [
        issueId, portal.id, issueNumber, versionLabel, issuedAt, input.actor.userId, input.idempotencyKey, input.validThrough ?? null, latestIssue?.id ?? null,
        canonicalJson(manifest), contentHash, input.source.totalCost, input.source.currencyCode, JSON.stringify(input.source.selectedEstimateIds),
        canonicalJson(brandSnapshot), canonicalJson(input.source.decisionPolicySnapshot), JSON.stringify(input.source.assumptions),
        JSON.stringify(input.source.exclusions), issuedAt,
        input.issuePackage?.issueKind ?? "initial_estimate", input.issuePackage?.draftId ?? null,
        input.issuePackage?.basedOnBaselineId ?? null, input.issuePackage?.comparisonIssueId ?? null,
        input.issuePackage?.revisionNote ?? null, input.changeSet?.structuredDiffHash ?? null,
        ...(input.issuePackage ? [input.issuePackage.draftId, input.issuePackage.draftRevision] : []),
        portal.id, portal.workspace_id, portal.project_id, input.source.sourceRevision,
      ],
    ),
    ...issueEvent.statements,
    ...artifactExposureEvents.flatMap((event) => event.statements),
  ];

  if (input.issuePackage) {
    statements.push(
      ...packedInsertStatements(
        input.database,
        "client_portal_issue_estimates",
        ["issue_id", "source_estimate_id", "public_estimate_id", "sort_order", "source_revision", "source_hash"],
        input.issuePackage.estimates.map((estimate) => [
          issueId,
          estimate.sourceEstimateId,
          estimate.publicEstimateId,
          estimate.sortOrder,
          estimate.sourceRevision,
          estimate.sourceHash,
        ]),
        commitGuard,
      ),
      ...input.issuePackage.artifacts.map((artifact) => conditionalInsertStatement(
        input.database,
        "client_portal_issue_artifacts",
        [
          "id", "issue_id", "artifact_id", "artifact_version_id", "public_artifact_id", "purpose", "display_title",
          "description", "file_name_snapshot", "content_type_snapshot", "size_bytes_snapshot", "content_sha256_snapshot",
          "commentable", "downloadable", "decision_relevant", "sort_order", "policy_snapshot_json", "created_at",
        ],
        [
          `issue-artifact_${randomUUID()}`, issueId, artifact.artifactId, artifact.artifactVersionId, artifact.publicArtifactId,
          artifact.purpose, artifact.displayTitle, artifact.description, artifact.fileName, artifact.contentType, artifact.sizeBytes,
          artifact.contentSha256, artifact.commentable ? 1 : 0, artifact.downloadable ? 1 : 0,
          artifact.decisionRelevant ? 1 : 0, artifact.sortOrder,
          canonicalJson({ commentable: artifact.commentable, downloadable: artifact.downloadable }), issuedAt,
        ],
        commitGuard,
      )),
      ...input.issuePackage.requests.map((request) => conditionalInsertStatement(
        input.database,
        "client_portal_issue_requests",
        [
          "issue_id", "request_id", "request_version_id", "relationship", "request_code_snapshot",
          "title_snapshot", "content_hash_snapshot", "sort_order",
        ],
        [
          issueId, request.requestId, request.requestVersionId, request.relationship, request.requestCode,
          request.title, request.contentHash, request.sortOrder,
        ],
        commitGuard,
      )),
    );
    for (const request of input.issuePackage.requests.filter((candidate) => candidate.relationship === "origin" || candidate.relationship === "addresses")) {
      const requestTransitionKey = `issue:${issueId}:proposal-issued`;
      statements.push(
        statement(
          input.database,
          `INSERT INTO project_change_request_state_events (
            id, request_id, from_status, to_status, actor_type, actor_id, note, idempotency_key, occurred_at, metadata_json
          )
          SELECT ?, request.id, request.status, 'proposal_issued', 'system', 'client-portal-issue',
                 'Proposal issued in Client Portal', ?, ?, json_object('issueId', ?, 'issueNumber', ?)
          FROM project_change_requests request
          WHERE request.id = ? AND request.workspace_id = ? AND request.project_id = ?
            AND request.current_version_id = ? AND request.status = 'under_assessment'
            AND EXISTS (SELECT 1 FROM client_portal_issue_requests linked WHERE linked.issue_id = ? AND linked.request_id = request.id)
            AND NOT EXISTS (
              SELECT 1 FROM project_change_request_state_events existing
              WHERE existing.request_id = request.id AND existing.actor_type = 'system'
                AND existing.actor_id = 'client-portal-issue' AND existing.idempotency_key = ?
            )`,
          [`request-event_${randomUUID()}`, requestTransitionKey, issuedAt, issueId, issueNumber, request.requestId, portal.workspace_id, portal.project_id, request.requestVersionId, issueId, requestTransitionKey],
        ),
        statement(
          input.database,
          `UPDATE project_change_requests
           SET status = 'proposal_issued', updated_at = ?
           WHERE id = ? AND workspace_id = ? AND project_id = ? AND status = 'under_assessment'
             AND EXISTS (
               SELECT 1 FROM project_change_request_state_events event
               WHERE event.request_id = project_change_requests.id AND event.actor_type = 'system'
                 AND event.actor_id = 'client-portal-issue' AND event.idempotency_key = ? AND event.to_status = 'proposal_issued'
             )`,
          [issuedAt, request.requestId, portal.workspace_id, portal.project_id, requestTransitionKey],
        ),
      );
    }
  }

  if (input.privateSourceProjection) {
    statements.push(
      ...packedInsertStatements(
        input.database,
        "client_portal_issue_source_estimates",
        ["issue_id", "source_estimate_id", "sheet_code_snapshot", "name_snapshot", "total_minor_units", "currency_code", "source_hash"],
        input.privateSourceProjection.estimates.map((estimate) => [
          issueId,
          estimate.sourceEstimateId,
          estimate.sheetCode,
          estimate.name,
          estimate.totalMinorUnits,
          estimate.currencyCode,
          estimate.sourceHash,
        ]),
        commitGuard,
      ),
      ...packedInsertStatements(
        input.database,
        "client_portal_issue_source_rows",
        [
          "issue_id", "source_estimate_id", "source_tab_id", "source_node_id", "source_row_id", "source_component_id",
          "source_variant_id", "row_revision", "description", "designation", "discipline", "material", "quantity_scaled",
          "unit", "unit_cost_minor_units", "misc_cost_minor_units", "contingency_basis_points", "adjustment_basis_points",
          "row_total_minor_units", "scope_status", "link_state", "canonical_row_hash", "sort_order",
        ],
        input.privateSourceProjection.estimates.flatMap((estimate) => estimate.rows.map((row) => [
          issueId,
          row.sourceEstimateId,
          row.sourceTabId,
          row.sourceNodeId,
          row.sourceRowId,
          row.sourceComponentId,
          row.sourceVariantId,
          row.rowRevision,
          row.description,
          row.designation,
          row.discipline,
          row.material,
          row.quantityScaled,
          row.unit,
          row.unitCostMinorUnits,
          row.miscCostMinorUnits,
          row.contingencyBasisPoints,
          row.adjustmentBasisPoints,
          row.rowTotalMinorUnits,
          row.scopeStatus,
          row.linkState,
          row.canonicalRowHash,
          row.sortOrder,
        ])),
        commitGuard,
      ),
      ...packedInsertStatements(
        input.database,
        "client_portal_issue_source_nodes",
        [
          "issue_id", "source_estimate_id", "source_tab_id", "source_node_id", "parent_source_node_id", "kind", "name",
          "sort_order", "canonical_node_hash",
        ],
        input.privateSourceProjection.estimates.flatMap((estimate) => estimate.nodes.map((node) => [
          issueId,
          node.sourceEstimateId,
          node.sourceTabId,
          node.sourceNodeId,
          node.parentSourceNodeId,
          node.kind,
          node.name,
          node.sortOrder,
          node.canonicalNodeHash,
        ])),
        commitGuard,
      ),
    );
  }

  if (input.changeSet) {
    statements.push(conditionalInsertStatement(
      input.database,
      "client_portal_issue_change_sets",
      [
        "issue_id", "comparison_issue_id", "comparison_baseline_id", "schema_version", "structured_diff_json",
        "structured_diff_hash", "deterministic_summary", "ai_draft", "ai_run_id", "ai_model_snapshot", "ai_prompt_schema_version",
        "ai_provider_snapshot", "ai_input_hash", "ai_output_hash", "ai_generated_at", "final_narrative", "narrative_source",
        "narrative_approved_by", "narrative_approved_at", "created_at",
      ],
      [
        issueId,
        input.changeSet.privateChangeSet.comparison.issueId,
        input.changeSet.privateChangeSet.comparison.baselineId,
        input.changeSet.privateChangeSet.schemaVersion,
        canonicalJson(input.changeSet.privateChangeSet),
        input.changeSet.structuredDiffHash,
        input.changeSet.deterministicSummary,
        input.changeSet.aiProvenance?.aiDraft ?? null,
        input.changeSet.aiProvenance?.runId ?? null,
        input.changeSet.aiProvenance?.model ?? null,
        input.changeSet.aiProvenance?.schemaVersion ?? null,
        input.changeSet.aiProvenance?.provider ?? null,
        input.changeSet.aiProvenance?.inputHash ?? null,
        input.changeSet.aiProvenance?.outputHash ?? null,
        input.changeSet.aiProvenance?.generatedAt ?? null,
        input.changeSet.finalNarrative,
        input.changeSet.narrativeSource,
        input.changeSet.aiProvenance?.approvedBy ?? null,
        input.changeSet.aiProvenance?.approvedAt ?? null,
        issuedAt,
      ],
      commitGuard,
    ));
  }

  for (const [index, section] of issuedSections.entries()) {
    const manifestSection = manifest.sections[index];
    statements.push(
      conditionalInsertStatement(
        input.database,
        "client_portal_issue_sections",
        [
          "id", "issue_id", "section_key", "kind", "title", "sort_order", "payload_storage", "payload_json", "r2_object_key",
          "payload_hash", "payload_bytes", "schema_version", "policy_snapshot_json", "created_at",
        ],
        [
          manifestSection.id,
          issueId,
          section.sectionKey,
          section.manifest.kind,
          section.manifest.title,
          section.manifest.sortOrder,
          section.storage.storage,
          section.storage.storage === "d1_json" ? canonicalJson(section.storage.payload) : null,
          section.storage.storage === "r2_object" ? section.storage.r2ObjectKey : null,
          section.storage.payloadHash,
          section.storage.payloadBytes,
          section.manifest.schemaVersion,
          canonicalJson(section.policySnapshot),
          issuedAt,
        ],
        commitGuard,
      ),
    );
    const browser = section.manifest.kind === "estimate_browser" ? estimateBrowserPayload(section.manifest.payload) : null;
    if (browser && requiresClientPortalEstimateBrowserServerPaging(browser, section.storage.payloadBytes)) {
      const summary = summarizeClientPortalEstimateBrowserPayload(browser);
      const projectedRows = buildClientPortalEstimateBrowserRowProjection(browser);
      statements.push(
        conditionalInsertStatement(
          input.database,
          "client_portal_issue_estimate_projections",
          ["section_id", "payload_hash", "summary_json", "row_count", "created_at"],
          [manifestSection.id, section.storage.payloadHash, canonicalJson(summary), projectedRows.length, issuedAt],
          commitGuard,
        ),
        ...packedInsertStatements(
          input.database,
          "client_portal_issue_estimate_rows",
          ["section_id", "payload_hash", "estimate_id", "tab_id", "sort_order", "row_id", "branch_ids_json", "search_text", "row_json"],
          projectedRows.map((projection) => [
            manifestSection.id,
            section.storage.payloadHash,
            projection.estimateId,
            projection.tabId,
            projection.sortOrder,
            projection.row.id,
            canonicalJson(projection.branchIds),
            projection.searchText,
            canonicalJson(projection.row),
          ]),
          commitGuard,
        ),
      );
    }
  }

  if (latestIssue && CLIENT_PORTAL_SUPERSEDABLE_ISSUE_STATUSES.has(latestIssue.status)) {
    statements.push(statement(
      input.database,
      `UPDATE client_portal_issues
       SET status = 'superseded'
       WHERE id = ? AND ${issueCommitGuardSql()}`,
      [latestIssue.id, ...issueCommitGuardValues(commitGuard)],
    ));
  }
  statements.push(
    statement(
      input.database,
      `UPDATE client_portals
       SET current_issue_id = ?, status = 'live', updated_at = ?
       WHERE id = ? AND workspace_id = ? AND project_id = ?
         AND ${issueCommitGuardSql()}`,
      [issueId, issuedAt, portal.id, portal.workspace_id, portal.project_id, ...issueCommitGuardValues(commitGuard)],
    ),
    conditionalInsertStatement(
      input.database,
      "client_portal_audit_events",
      ["id", "workspace_id", "portal_id", "issue_id", "actor_type", "actor_id", "event_type", "visibility", "metadata_json", "occurred_at", "created_at"],
      [randomUUID(), portal.workspace_id, portal.id, issueId, "internal_user", input.actor.userId, "issue_issued", "client_safe", JSON.stringify({ contentHash, issueNumber, sourceRevision: input.source.sourceRevision }), issuedAt, issuedAt],
      commitGuard,
    ),
  );
  if (input.issuePackage) {
    statements.push(statement(
      input.database,
      `UPDATE client_portal_issue_drafts
       SET status = 'published', published_issue_id = ?, published_at = ?, updated_at = ?, updated_by = ?
       WHERE id = ? AND portal_id = ? AND project_id = ? AND workspace_id = ?
         AND status = 'ready' AND draft_revision = ?
         AND ${issueCommitGuardSql()}`,
      [
        issueId, issuedAt, issuedAt, input.actor.userId,
        input.issuePackage.draftId, portal.id, portal.project_id, portal.workspace_id, input.issuePackage.draftRevision,
        ...issueCommitGuardValues(commitGuard),
      ],
    ));
  }
  for (const recipient of activeRecipients) {
    statements.push(
      conditionalInsertStatement(
        input.database,
        "client_portal_notification_outbox",
        ["id", "portal_id", "issue_id", "recipient_id", "event_type", "idempotency_key", "payload_json", "state", "attempt_count", "next_attempt_at", "created_at", "updated_at"],
        [`outbox_${randomUUID()}`, portal.id, issueId, recipient.id, "issue_issued", `issue:${contentHash}:issued:${recipient.id}`, JSON.stringify({ issueId, issueNumber, recipientId: recipient.id }), "pending", 0, issuedAt, issuedAt, issuedAt],
        commitGuard,
      ),
    );
  }

  if (statements.length > D1_MAX_BATCH_STATEMENTS) {
    throw new ClientPortalIssueBuildError("client_portal_source_invalid", "Client Portal issue projection exceeds the atomic D1 statement budget.");
  }

  try {
    const result = await input.database.batch(statements);
    if (result.some((entry) => entry.success === false)) throw new Error("Something went wrong. Try again in a moment.");
    if (result[0]?.meta?.changes === 0) {
      throw new ClientPortalIssueBuildError("client_portal_source_changed", "Client Portal source content changed before issue commit. Publish again to issue one consistent revision.");
    }
  } catch (error) {
    if (error instanceof ClientPortalIssueBuildError && error.code === "client_portal_source_changed") throw error;
    const retry = await first<IssueRow>(
      input.database,
      "SELECT id, issue_number, version_label, content_hash, status FROM client_portal_issues WHERE portal_id = ? AND (content_hash = ? OR idempotency_key = ?) LIMIT 1",
      [portal.id, contentHash, input.idempotencyKey],
    );
    if (retry) return sameIssue(retry);
    throw new ClientPortalIssueBuildError("client_portal_write_failed", error instanceof Error ? error.message : "Client Portal issue publish failed.");
  }

  return { contentHash, issueId, issueNumber, reusedExistingIssue: false, sections: issuedSections.map((section) => section.manifest), versionLabel };
}
