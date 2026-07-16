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
import { ESTIMATE_CALCULATION_CURRENCY_SCALE } from "@/lib/estimates/estimate-row-total";
import { type ClientPortalInternalActor, evaluateClientPortalPolicy } from "@/lib/client-portal/policy";
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

export type ClientPortalIssueBuildInput = {
  actor: ClientPortalInternalActor;
  buildSectionPayload: (input: { draft: ClientPortalSectionDraft; sectionKey: string }) => Promise<unknown>;
  database: D1DatabaseLike;
  idempotencyKey: string;
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
  const statements: D1PreparedStatementLike[] = [
    statement(
      input.database,
      `INSERT INTO client_portal_issues (
        id, portal_id, issue_number, version_label, status, issued_at, issued_by, idempotency_key, valid_through, supersedes_issue_id,
        manifest_json, content_hash, total_cost, currency_code, selected_estimate_ids_json, brand_snapshot_json,
        decision_policy_snapshot_json, assumptions_json, exclusions_json, created_at
      )
      SELECT ?, ?, ?, ?, 'issued', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      FROM client_portals source_portal
      JOIN projects source_project
        ON source_project.id = source_portal.project_id
       AND source_project.workspace_id = source_portal.workspace_id
      WHERE source_portal.id = ?
        AND source_portal.workspace_id = ?
        AND source_portal.project_id = ?
        AND source_project.publication_source_revision = ?`,
      [
        issueId, portal.id, issueNumber, versionLabel, issuedAt, input.actor.userId, input.idempotencyKey, input.validThrough ?? null, latestIssue?.id ?? null,
        canonicalJson(manifest), contentHash, input.source.totalCost, input.source.currencyCode, JSON.stringify(input.source.selectedEstimateIds),
        canonicalJson(brandSnapshot), canonicalJson(input.source.decisionPolicySnapshot), JSON.stringify(input.source.assumptions),
        JSON.stringify(input.source.exclusions), issuedAt, portal.id, portal.workspace_id, portal.project_id, input.source.sourceRevision,
      ],
    ),
  ];

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

  if (latestIssue && latestIssue.status !== "superseded") {
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
    if (result.some((entry) => entry.success === false)) throw new Error("D1 batch statement failed");
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
