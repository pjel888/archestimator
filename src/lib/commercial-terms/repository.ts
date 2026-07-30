import "server-only";

import type { D1DatabaseLike, D1PreparedStatementLike, D1Value } from "@/lib/cloudflare/d1";
import { runRequiredD1Batch } from "@/lib/cloudflare/d1-batch";
import { assertD1MutationStatementLimit } from "@/lib/estimates/mutation-receipts";
import { prepareHistoryEventInsert } from "@/lib/estimates/d1-intents/history-events";
import {
  buildProjectPublicationRevisionForEstimate,
  prepareEstimateMutationIntent,
  readConcurrentEstimateMutationReceipt,
  type EstimateD1Actor,
  type EstimateMutationIntentContext,
} from "@/lib/estimates/d1-intents/intent-context";
import { buildGuardedReceiptStatement } from "@/lib/estimates/d1-intents/guarded-receipt";

import type { QuotationFacts, VatTreatment } from "./contracts";
import {
  normalizeQuotationFacts,
  projectQuotationAttachment,
  type QuotationAttachmentCandidate,
  type QuotationAttachmentProjection,
} from "./quotation-policy";

const MAX_BATCH_IDENTIFIERS = 500;

type PersistedRowCommercialTerms = {
  rowId: string;
  estimateId: string;
  projectId: string;
  workspaceId: string;
  selectedOptionId: string | null;
  selectedOptionTreatment: VatTreatment | null;
  selectedOptionRateBps: number | null;
  selectedOptionTermsRevision: number | null;
  overrideTreatment: VatTreatment | null;
  overrideRateBps: number | null;
  quotationRequirement: QuotationFacts["quotationRequirement"];
  quotationStatus: QuotationFacts["quotationStatus"];
  quotationReference: QuotationFacts["quotationReference"];
  quotationArtifactVersionId: string | null;
  quotationAttachment: QuotationAttachmentProjection;
  termsRevision: number;
};

export type EstimateQuotationOption = {
  versionId: string;
  title: string;
  revisionLabel: string | null;
  fileName: string;
};

type CommercialRepositoryErrorCode =
  | "invalid_batch"
  | "not_authorized"
  | "quotation_not_linkable"
  | "commercial_terms_conflict";

export type CommercialMutationReceipt = {
  termsRevision: number;
  rowRevision: number;
  eventId: string;
};

export type CommercialRepositoryResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: CommercialRepositoryErrorCode };

type RowTermsRow = {
  row_id: string;
  workspace_id: string;
  project_id: string;
  estimate_id: string;
  selected_option_id: string | null;
  selected_option_treatment: VatTreatment | null;
  selected_option_rate_bps: number | null;
  selected_option_terms_revision: number | null;
  override_treatment: VatTreatment | null;
  override_rate_bps: number | null;
  quotation_requirement: PersistedRowCommercialTerms["quotationRequirement"];
  quotation_status: PersistedRowCommercialTerms["quotationStatus"];
  quotation_reference: string | null;
  quotation_artifact_version_id: string | null;
  terms_revision: number;
};

type QuotationCandidateRow = {
  version_id: string;
  version_workspace_id: string;
  version_project_id: string;
  version_artifact_id: string;
  version_content_sha256: string;
  artifact_id: string;
  artifact_workspace_id: string;
  artifact_project_id: string;
  artifact_type: string;
  artifact_status: string;
  upload_workspace_id: string | null;
  upload_project_id: string | null;
  upload_surface: string | null;
  upload_status: string | null;
  upload_purge_state: string | null;
  upload_content_type: string | null;
  upload_checksum_sha256: string | null;
  upload_scan_status: string | null;
  scan_override_actor_user_id: string | null;
  scan_override_reason: string | null;
  scan_override_expires_at: string | null;
  scan_override_checksum_sha256: string | null;
};

function uniqueIdentifiers(values: readonly string[]) {
  const identifiers = [...new Set(values.map((value) => value.trim()).filter(Boolean))];
  return identifiers.length > 0 && identifiers.length <= MAX_BATCH_IDENTIFIERS ? identifiers : null;
}

function placeholders(values: readonly unknown[]) {
  return values.map(() => "?").join(", ");
}

async function all<T>(database: D1DatabaseLike, sql: string, values: D1Value[]) {
  const result = await database.prepare<T>(sql).bind(...values).all<T>();
  return result.results ?? [];
}

function d1Value(value: unknown): D1Value {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value instanceof ArrayBuffer) return value;
  if (value === undefined) return null;
  return JSON.stringify(value);
}

function prepareStatement(
  database: D1DatabaseLike,
  statement: { sql: string; values?: readonly unknown[] },
): D1PreparedStatementLike {
  return database.prepare(statement.sql).bind(...(statement.values ?? []).map(d1Value));
}

type CommercialMutationState = RowTermsRow & { row_revision: number; node_id: string };

async function readCommercialMutationState(input: {
  database: D1DatabaseLike;
  workspaceId: string;
  projectId: string;
  estimateId: string;
  rowId: string;
}) {
  return input.database.prepare<CommercialMutationState>(`
    SELECT terms.*, row.row_revision, row.node_id
    FROM estimate_row_commercial_terms AS terms
    JOIN estimate_row_items AS row ON row.id = terms.row_id AND row.estimate_id = terms.estimate_id
    WHERE terms.row_id = ? AND terms.workspace_id = ? AND terms.project_id = ? AND terms.estimate_id = ?
    LIMIT 1
  `).bind(input.rowId, input.workspaceId, input.projectId, input.estimateId).first<CommercialMutationState>();
}

function readCommercialReceipt(value: unknown): CommercialMutationReceipt {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("The committed commercial mutation receipt is invalid.");
  const receipt = value as Partial<CommercialMutationReceipt>;
  if (!Number.isSafeInteger(receipt.termsRevision) || !Number.isSafeInteger(receipt.rowRevision) || typeof receipt.eventId !== "string") {
    throw new Error("The committed commercial mutation receipt is invalid.");
  }
  return receipt as CommercialMutationReceipt;
}

function isValidCommercialOverride(
  treatment: "inclusive" | "exclusive" | "exempt" | null,
  rateBps: number | null,
) {
  const hasTreatment = treatment !== null;
  const hasRate = rateBps !== null;
  return hasTreatment === hasRate
    && (!hasRate || (Number.isInteger(rateBps) && rateBps >= 0 && rateBps <= 10_000))
    && (treatment !== "exempt" || rateBps === 0);
}

function buildGuardedCommercialReceiptStatement(input: {
  context: EstimateMutationIntentContext;
  rowId: string;
  estimateId: string;
  rowRevision: number;
  termsRevision: number;
  result: CommercialMutationReceipt;
  timestamp: string;
}) {
  return buildGuardedReceiptStatement({
    context: input.context,
    resourceType: "estimate_row_commercial_terms",
    resourceId: input.rowId,
    result: input.result,
    timestamp: input.timestamp,
    guardSql: `
          SELECT 1 FROM estimate_row_items AS row
          JOIN estimate_row_commercial_terms AS terms ON terms.row_id = row.id
          WHERE row.id = ? AND row.estimate_id = ? AND row.row_revision = ? AND terms.terms_revision = ?
    `,
    guardValues: [input.context.actorUserId, input.rowId, input.estimateId, input.rowRevision, input.termsRevision],
  });
}

async function commitCommercialMutation(input: {
  database: D1DatabaseLike;
  actor: EstimateD1Actor;
  workspaceId: string;
  projectId: string;
  estimateId: string;
  rowId: string;
  intentId: string;
  commandKind: string;
  request: unknown;
  expectedRowRevision: number;
  expectedTermsRevision: number;
  now: string;
  changedFields: string[];
  oldSnapshot: unknown;
  newSnapshot: unknown;
  termsStatement: { sql: string; values: readonly unknown[] };
}): Promise<CommercialRepositoryResult<CommercialMutationReceipt>> {
  const prepared = await prepareEstimateMutationIntent<CommercialMutationReceipt>(input.database, input.actor, {
    projectId: input.projectId,
    estimateId: input.estimateId,
    correlationId: input.intentId,
    commandKind: input.commandKind,
    request: input.request,
  });
  if (prepared.committedResult) return { ok: true, value: readCommercialReceipt(prepared.committedResult) };

  const state = await readCommercialMutationState(input);
  if (!state || state.row_revision !== input.expectedRowRevision || state.terms_revision !== input.expectedTermsRevision) {
    return { ok: false, code: "commercial_terms_conflict" };
  }
  const history = await prepareHistoryEventInsert(input.database, {
    projectId: input.projectId,
    estimateId: input.estimateId,
    workspaceId: input.workspaceId,
    estimateNodeId: state.node_id,
    targetRowId: input.rowId,
    eventType: "row_updated",
    actorUserId: input.actor.userId,
    correlationId: prepared.context.intentId,
    changedFields: input.changedFields,
    oldSnapshot: input.oldSnapshot,
    newSnapshot: input.newSnapshot,
    payload: { commercialTerms: true },
  });
  const result: CommercialMutationReceipt = {
    termsRevision: input.expectedTermsRevision + 1,
    rowRevision: input.expectedRowRevision + 1,
    eventId: history.eventId,
  };
  const statements = [
    {
      sql: `UPDATE estimate_row_items
            SET row_revision = row_revision + 1, updated_at = ?
            WHERE id = ? AND estimate_id = ? AND row_revision = ?`,
      values: [input.now, input.rowId, input.estimateId, input.expectedRowRevision],
    },
    input.termsStatement,
    buildProjectPublicationRevisionForEstimate(input.projectId, input.workspaceId, input.estimateId),
    ...(history.statement ? [history.statement, history.outboxStatement] : []),
    buildGuardedCommercialReceiptStatement({
      context: prepared.context,
      rowId: input.rowId,
      estimateId: input.estimateId,
      rowRevision: result.rowRevision,
      termsRevision: result.termsRevision,
      result,
      timestamp: input.now,
    }),
  ];
  assertD1MutationStatementLimit(statements.length);
  const recoverConcurrentMutation = async (): Promise<CommercialRepositoryResult<CommercialMutationReceipt> | undefined> => {
    const replay = await readConcurrentEstimateMutationReceipt<CommercialMutationReceipt>(input.database, prepared.context);
    if (replay) return { ok: true, value: readCommercialReceipt(replay) };
    const latest = await readCommercialMutationState(input);
    if (!latest || latest.row_revision !== input.expectedRowRevision || latest.terms_revision !== input.expectedTermsRevision) {
      return { ok: false, code: "commercial_terms_conflict" };
    }
  };
  try {
    await runRequiredD1Batch(
      input.database,
      statements.map((statement) => prepareStatement(input.database, statement)),
      "Commercial terms could not be saved.",
  );
  } catch (error) {
    const recovered = await recoverConcurrentMutation();
    if (recovered) return recovered;
    throw error;
  }
  return { ok: true, value: result };
}

function unavailableQuotationAttachment(): QuotationAttachmentProjection {
  return { attachmentState: "unavailable", hasAttachment: false, downloadableVersionId: null };
}

function quotationCandidate(
  row: QuotationCandidateRow,
  workspaceId: string,
  projectId: string,
): QuotationAttachmentCandidate {
  return {
    linkedVersionId: row.version_id,
    expectedWorkspaceId: workspaceId,
    expectedProjectId: projectId,
    versionWorkspaceId: row.version_workspace_id,
    versionProjectId: row.version_project_id,
    versionArtifactId: row.version_artifact_id,
    versionContentSha256: row.version_content_sha256,
    artifactId: row.artifact_id,
    artifactWorkspaceId: row.artifact_workspace_id,
    artifactProjectId: row.artifact_project_id,
    artifactType: row.artifact_type,
    artifactStatus: row.artifact_status,
    uploadWorkspaceId: row.upload_workspace_id,
    uploadProjectId: row.upload_project_id,
    uploadSurface: row.upload_surface,
    uploadStatus: row.upload_status,
    uploadPurgeState: row.upload_purge_state,
    uploadContentType: row.upload_content_type,
    uploadChecksumSha256: row.upload_checksum_sha256,
    uploadScanStatus: row.upload_scan_status,
    scanOverrideActorUserId: row.scan_override_actor_user_id,
    scanOverrideReason: row.scan_override_reason,
    scanOverrideExpiresAt: row.scan_override_expires_at,
    scanOverrideChecksumSha256: row.scan_override_checksum_sha256,
  };
}

/** Re-evaluates many retained quotation links with one bounded query. */
export async function readQuotationAttachmentPolicyBatch(input: {
  database: D1DatabaseLike;
  workspaceId: string;
  projectId: string;
  versionIds: readonly string[];
  now: string;
}): Promise<CommercialRepositoryResult<Map<string, QuotationAttachmentProjection>>> {
  const versionIds = uniqueIdentifiers(input.versionIds);
  if (!versionIds) return { ok: false, code: "invalid_batch" };

  const rows = await all<QuotationCandidateRow>(input.database, `
    SELECT
      version.id AS version_id,
      version.workspace_id AS version_workspace_id,
      version.project_id AS version_project_id,
      version.artifact_id AS version_artifact_id,
      version.content_sha256 AS version_content_sha256,
      artifact.id AS artifact_id,
      artifact.workspace_id AS artifact_workspace_id,
      artifact.project_id AS artifact_project_id,
      artifact.artifact_type,
      artifact.status AS artifact_status,
      asset.workspace_id AS upload_workspace_id,
      asset.project_id AS upload_project_id,
      asset.surface AS upload_surface,
      asset.status AS upload_status,
      asset.purge_state AS upload_purge_state,
      asset.content_type AS upload_content_type,
      asset.checksum_sha256 AS upload_checksum_sha256,
      asset.scan_status AS upload_scan_status,
      asset.scan_override_actor_user_id,
      asset.scan_override_reason,
      asset.scan_override_expires_at,
      asset.scan_override_checksum_sha256
    FROM project_artifact_versions AS version
    JOIN project_artifacts AS artifact ON artifact.id = version.artifact_id
    LEFT JOIN upload_assets AS asset ON asset.id = version.upload_asset_id
    WHERE version.workspace_id = ?
      AND version.project_id = ?
      AND version.id IN (${placeholders(versionIds)})
  `, [input.workspaceId, input.projectId, ...versionIds]);

  const projections = new Map(
    versionIds.map((versionId) => [versionId, unavailableQuotationAttachment()] as const),
  );
  for (const row of rows) {
    projections.set(
      row.version_id,
      projectQuotationAttachment(quotationCandidate(row, input.workspaceId, input.projectId), input.now),
    );
  }
  return { ok: true, value: projections };
}

export async function listAvailableEstimateQuotationOptions(input: {
  database: D1DatabaseLike;
  workspaceId: string;
  projectId: string;
  now: string;
}): Promise<CommercialRepositoryResult<EstimateQuotationOption[]>> {
  const rows = await all<{
    version_id: string;
    title: string;
    revision_label: string | null;
    file_name: string;
  }>(input.database, `
    SELECT version.id AS version_id,
           artifact.title,
           version.revision_label,
           version.file_name
    FROM project_artifacts AS artifact
    JOIN project_artifact_versions AS version
      ON version.id = artifact.current_version_id
     AND version.artifact_id = artifact.id
    WHERE artifact.workspace_id = ?
      AND artifact.project_id = ?
      AND artifact.artifact_type = 'quotation'
      AND artifact.status = 'active'
    ORDER BY artifact.updated_at DESC, artifact.id DESC
    LIMIT 100
  `, [input.workspaceId, input.projectId]);
  if (rows.length === 0) return { ok: true, value: [] };

  const policy = await readQuotationAttachmentPolicyBatch({
    ...input,
    versionIds: rows.map((row) => row.version_id),
  });
  if (!policy.ok) return policy;

  return {
    ok: true,
    value: rows.flatMap((row) => (
      policy.value.get(row.version_id)?.attachmentState === "available"
        ? [{
            versionId: row.version_id,
            title: row.title,
            revisionLabel: row.revision_label,
            fileName: row.file_name,
          }]
        : []
    )),
  };
}

async function canEditCommercialTerms(input: {
  database: D1DatabaseLike;
  workspaceId: string;
  projectId: string;
  estimateId: string;
  actorUserId: string;
}) {
  const row = await input.database.prepare<{ allowed: number }>(`
    SELECT CASE WHEN EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = ? AND workspace_id = ? AND user_id = ?
        AND role IN ('owner', 'admin', 'editor')
    ) OR EXISTS (
      SELECT 1 FROM estimate_sheet_members
      WHERE estimate_id = ? AND project_id = ? AND user_id = ?
        AND role IN ('owner', 'admin', 'editor')
    ) THEN 1 ELSE 0 END AS allowed
  `).bind(
    input.projectId,
    input.workspaceId,
    input.actorUserId,
    input.estimateId,
    input.projectId,
    input.actorUserId,
  ).first<{ allowed: number }>();
  return Number(row?.allowed) === 1;
}

/** Links or unlinks retained quotation provenance behind editor and CAS checks. */
export async function updateRowQuotationLink(input: {
  database: D1DatabaseLike;
  actor: EstimateD1Actor;
  workspaceId: string;
  projectId: string;
  estimateId: string;
  rowId: string;
  intentId: string;
  expectedRowRevision: number;
  expectedTermsRevision: number;
  quotationArtifactVersionId: string | null;
  now: string;
}): Promise<CommercialRepositoryResult<CommercialMutationReceipt>> {
  const quotationArtifactVersionId = input.quotationArtifactVersionId?.trim() || null;
  if (
    !Number.isSafeInteger(input.expectedTermsRevision)
    || input.expectedTermsRevision < 1
    || (input.quotationArtifactVersionId !== null && !quotationArtifactVersionId)
  ) {
    return { ok: false, code: "invalid_batch" };
  }
  if (!await canEditCommercialTerms({ ...input, actorUserId: input.actor.userId })) return { ok: false, code: "not_authorized" };

  if (quotationArtifactVersionId) {
    const policy = await readQuotationAttachmentPolicyBatch({
      database: input.database,
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      versionIds: [quotationArtifactVersionId],
      now: input.now,
    });
    if (!policy.ok || policy.value.get(quotationArtifactVersionId)?.attachmentState !== "available") {
      return { ok: false, code: "quotation_not_linkable" };
    }
  }

  return commitCommercialMutation({
    ...input,
    commandKind: "estimate.row.commercial.quotation_link",
    request: {
      projectId: input.projectId,
      estimateId: input.estimateId,
      rowId: input.rowId,
      expectedRowRevision: input.expectedRowRevision,
      expectedTermsRevision: input.expectedTermsRevision,
      quotationArtifactVersionId,
    },
    changedFields: ["quotation_artifact_version_id", "commercial_terms_revision"],
    oldSnapshot: { termsRevision: input.expectedTermsRevision },
    newSnapshot: { termsRevision: input.expectedTermsRevision + 1, hasQuotationAttachment: Boolean(quotationArtifactVersionId) },
    termsStatement: {
      sql: `UPDATE estimate_row_commercial_terms
            SET quotation_artifact_version_id = ?, terms_revision = terms_revision + 1,
                updated_by = ?, updated_at = ?
            WHERE row_id = ? AND workspace_id = ? AND project_id = ? AND estimate_id = ?
              AND terms_revision = ?`,
      values: [
        quotationArtifactVersionId, input.actor.userId, input.now, input.rowId,
        input.workspaceId, input.projectId, input.estimateId, input.expectedTermsRevision,
      ],
    },
  });
}

/** Updates row-owned commercial facts behind editor and revision guards. */
export async function updateRowCommercialTerms(input: {
  database: D1DatabaseLike;
  actor: EstimateD1Actor;
  workspaceId: string;
  projectId: string;
  estimateId: string;
  rowId: string;
  intentId: string;
  expectedRowRevision: number;
  expectedTermsRevision: number;
  overrideTreatment: "inclusive" | "exclusive" | "exempt" | null;
  overrideRateBps: number | null;
  quotationRequirement: QuotationFacts["quotationRequirement"];
  quotationStatus: QuotationFacts["quotationStatus"];
  quotationReference: string | null;
  now: string;
}): Promise<CommercialRepositoryResult<CommercialMutationReceipt & QuotationFacts>> {
  if (!isValidCommercialOverride(input.overrideTreatment, input.overrideRateBps)) {
    return { ok: false, code: "invalid_batch" };
  }
  const quotationFacts = normalizeQuotationFacts(input);
  if (!quotationFacts.ok) return { ok: false, code: "invalid_batch" };
  if (!await canEditCommercialTerms({ ...input, actorUserId: input.actor.userId })) return { ok: false, code: "not_authorized" };
  const result = await commitCommercialMutation({
    ...input,
    commandKind: "estimate.row.commercial.update",
    request: {
      projectId: input.projectId,
      estimateId: input.estimateId,
      rowId: input.rowId,
      expectedRowRevision: input.expectedRowRevision,
      expectedTermsRevision: input.expectedTermsRevision,
      overrideTreatment: input.overrideTreatment,
      overrideRateBps: input.overrideRateBps,
      ...quotationFacts.value,
    },
    changedFields: [
      "commercial_vat_treatment", "commercial_vat_rate_bps", "quotation_requirement",
      "quotation_status", "quotation_reference", "commercial_terms_revision",
    ],
    oldSnapshot: { termsRevision: input.expectedTermsRevision },
    newSnapshot: {
      termsRevision: input.expectedTermsRevision + 1,
      overrideTreatment: input.overrideTreatment,
      overrideRateBps: input.overrideRateBps,
      ...quotationFacts.value,
    },
    termsStatement: {
      sql: `UPDATE estimate_row_commercial_terms
            SET override_treatment = ?, override_rate_bps = ?,
                quotation_requirement = ?, quotation_status = ?, quotation_reference = ?,
                terms_revision = terms_revision + 1, updated_by = ?, updated_at = ?
            WHERE row_id = ? AND workspace_id = ? AND project_id = ? AND estimate_id = ?
              AND terms_revision = ?`,
      values: [
        input.overrideTreatment, input.overrideRateBps, quotationFacts.value.quotationRequirement,
        quotationFacts.value.quotationStatus, quotationFacts.value.quotationReference,
        input.actor.userId, input.now, input.rowId, input.workspaceId, input.projectId,
        input.estimateId, input.expectedTermsRevision,
      ],
    },
  });
  if (!result.ok) return result;
  return {
    ok: true,
    value: {
      ...result.value,
      ...quotationFacts.value,
    },
  };
}
