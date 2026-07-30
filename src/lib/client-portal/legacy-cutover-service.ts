import "server-only";

import { createHash } from "node:crypto";

import type { D1DatabaseLike, D1PreparedStatementLike, D1Value } from "@/lib/cloudflare/d1";
import {
  migrateLegacyPublicationToClientPortal,
  type LegacyCutoverBarrierLease,
} from "@/lib/client-portal/legacy-migration-service";
import { logAppError } from "@/lib/observability/logger";

type CountRow = { count: number | null };
type StatusCountRow = { count: number; status: string };
type LegacyPublicationRow = { id: string };
type LegacyWorkspaceCutoverOperator = { email: string; userId: string };
type LegacyWorkspaceCutoverBarrier = {
  frozenAt: string | null;
  mode: "complete" | "none" | "pending";
  ownerUserId: string | null;
};
type CutoverMappingRow = {
  issue_id: string;
  legacy_publication_id: string;
  migration_status: string;
  portal_id: string;
};

type LegacyWorkspaceInventory = {
  capturedAt: string;
  comments: number;
  events: number;
  fingerprint: string;
  hosted: boolean;
  inconsistentMappings: number;
  legacyPublications: number;
  mappingStatuses: Record<string, number>;
  missingEncryptedTokens: number;
  modernPortals: number;
  projects: number;
  projectsWithBothSystems: number;
  publicationStatuses: Record<string, number>;
  recipients: number;
  responses: number;
  workspaceId: string;
};

export type LegacyWorkspaceCutoverReport = {
  barrier: LegacyWorkspaceCutoverBarrier;
  cutoverAt: string | null;
  dryRun: boolean;
  freezeEnabled: boolean;
  inventory: LegacyWorkspaceInventory;
  migrated: number;
  skipped: number;
  status: "cutover_complete" | "planned";
  unresolved: Array<{ legacyPublicationId: string; reason: string }>;
};

export type LegacyWorkspaceCutoverRecoveryReport = {
  action: "release" | "takeover";
  barrierAfter: LegacyWorkspaceCutoverBarrier;
  barrierBefore: LegacyWorkspaceCutoverBarrier;
  recoveredAt: string;
  workspaceId: string;
};

export class LegacyWorkspaceCutoverError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "LegacyWorkspaceCutoverError";
  }
}

function statement(database: D1DatabaseLike, sql: string, values: D1Value[]): D1PreparedStatementLike {
  return database.prepare(sql).bind(...values);
}

async function count(database: D1DatabaseLike, sql: string, values: D1Value[]) {
  const row = await database.prepare<CountRow>(sql).bind(...values).first<CountRow>();
  return Number(row?.count ?? 0);
}

async function groupedCounts(database: D1DatabaseLike, sql: string, workspaceId: string) {
  const result = await database.prepare<StatusCountRow>(sql).bind(workspaceId).all<StatusCountRow>();
  if (result.success === false) throw new LegacyWorkspaceCutoverError("Legacy cutover inventory query failed.");
  return Object.fromEntries((result.results ?? []).map((row) => [row.status, Number(row.count)]));
}

function fingerprint(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

async function readLegacyWorkspaceInventory({
  database,
  hosted = process.env.CLOUDFLARE_ENV === "production" || process.env.NODE_ENV === "production",
  workspaceId,
}: {
  database: D1DatabaseLike;
  hosted?: boolean;
  workspaceId: string;
}): Promise<LegacyWorkspaceInventory> {
  const capturedAt = new Date().toISOString();
  const [
    projects,
    legacyPublications,
    missingEncryptedTokens,
    recipients,
    comments,
    responses,
    events,
    modernPortals,
    projectsWithBothSystems,
    inconsistentMappings,
    publicationStatuses,
    mappingStatuses,
  ] = await Promise.all([
    count(database, "SELECT COUNT(*) AS count FROM projects WHERE workspace_id = ?", [workspaceId]),
    count(database, "SELECT COUNT(*) AS count FROM project_publications WHERE workspace_id = ?", [workspaceId]),
    count(database, "SELECT COUNT(*) AS count FROM project_publications WHERE workspace_id = ? AND (encrypted_token IS NULL OR length(trim(encrypted_token)) = 0)", [workspaceId]),
    count(database, "SELECT COUNT(*) AS count FROM shared_link_recipients WHERE publication_id IN (SELECT id FROM project_publications WHERE workspace_id = ?)", [workspaceId]),
    count(database, "SELECT COUNT(*) AS count FROM shared_link_comments WHERE publication_id IN (SELECT id FROM project_publications WHERE workspace_id = ?)", [workspaceId]),
    count(database, "SELECT COUNT(*) AS count FROM shared_link_responses WHERE publication_id IN (SELECT id FROM project_publications WHERE workspace_id = ?)", [workspaceId]),
    count(database, "SELECT COUNT(*) AS count FROM shared_link_events WHERE publication_id IN (SELECT id FROM project_publications WHERE workspace_id = ?)", [workspaceId]),
    count(database, "SELECT COUNT(*) AS count FROM client_portals WHERE workspace_id = ?", [workspaceId]),
    count(database, "SELECT COUNT(DISTINCT publication.project_id) AS count FROM project_publications publication JOIN client_portals portal ON portal.project_id = publication.project_id AND portal.workspace_id = publication.workspace_id WHERE publication.workspace_id = ?", [workspaceId]),
    count(database, `SELECT COUNT(*) AS count
      FROM client_portal_legacy_mappings mapping
      JOIN project_publications publication ON publication.id = mapping.legacy_publication_id
      LEFT JOIN client_portals portal ON portal.id = mapping.portal_id
      LEFT JOIN client_portal_issues issue ON issue.id = mapping.issue_id
      WHERE publication.workspace_id = ?
        AND (portal.id IS NULL OR issue.id IS NULL OR portal.workspace_id <> publication.workspace_id OR portal.project_id <> publication.project_id OR issue.portal_id <> portal.id)`, [workspaceId]),
    groupedCounts(database, "SELECT status, COUNT(*) AS count FROM project_publications WHERE workspace_id = ? GROUP BY status ORDER BY status", workspaceId),
    groupedCounts(database, "SELECT mapping.migration_status AS status, COUNT(*) AS count FROM client_portal_legacy_mappings mapping JOIN project_publications publication ON publication.id = mapping.legacy_publication_id WHERE publication.workspace_id = ? GROUP BY mapping.migration_status ORDER BY mapping.migration_status", workspaceId),
  ]);
  const facts = {
    comments,
    events,
    inconsistentMappings,
    legacyPublications,
    mappingStatuses,
    missingEncryptedTokens,
    modernPortals,
    projects,
    projectsWithBothSystems,
    publicationStatuses,
    recipients,
    responses,
    workspaceId,
  };
  return { ...facts, capturedAt, fingerprint: fingerprint(facts), hosted };
}

async function listLegacyPublications(database: D1DatabaseLike, workspaceId: string) {
  const result = await database.prepare<LegacyPublicationRow>(
    "SELECT id FROM project_publications WHERE workspace_id = ? ORDER BY published_at ASC, id ASC",
  ).bind(workspaceId).all<LegacyPublicationRow>();
  if (result.success === false) throw new LegacyWorkspaceCutoverError("Legacy publications could not be inventoried.");
  return result.results ?? [];
}

async function readMappings(database: D1DatabaseLike, workspaceId: string) {
  const result = await database.prepare<CutoverMappingRow>(`SELECT
      mapping.legacy_publication_id, mapping.portal_id, mapping.issue_id, mapping.migration_status
    FROM client_portal_legacy_mappings mapping
    JOIN project_publications publication ON publication.id = mapping.legacy_publication_id
    WHERE publication.workspace_id = ?
    ORDER BY mapping.legacy_publication_id ASC`).bind(workspaceId).all<CutoverMappingRow>();
  if (result.success === false) throw new LegacyWorkspaceCutoverError("Legacy mapping verification failed.");
  return result.results ?? [];
}

async function readLegacyWorkspaceWriteBarrier(
  database: D1DatabaseLike,
  workspaceId: string,
): Promise<LegacyWorkspaceCutoverBarrier> {
  const row = await database.prepare<{ frozen_at: string; frozen_by: string }>(
    "SELECT frozen_at, frozen_by FROM client_portal_legacy_workspace_cutovers WHERE workspace_id = ? LIMIT 1",
  ).bind(workspaceId).first<{ frozen_at: string; frozen_by: string }>();
  if (!row) return { frozenAt: null, mode: "none", ownerUserId: null };
  if (row.frozen_by === "legacy_cutover" || row.frozen_by === "migration_0122_backfill") {
    return { frozenAt: row.frozen_at, mode: "complete", ownerUserId: null };
  }
  const prefix = "legacy_cutover_pending:";
  return {
    frozenAt: row.frozen_at,
    mode: "pending",
    ownerUserId: row.frozen_by.startsWith(prefix) ? row.frozen_by.slice(prefix.length) : null,
  };
}

async function readLegacyWorkspaceBarrierLease(
  database: D1DatabaseLike,
  workspaceId: string,
): Promise<LegacyCutoverBarrierLease | null> {
  const row = await database.prepare<{ frozen_at: string; frozen_by: string }>(
    "SELECT frozen_at, frozen_by FROM client_portal_legacy_workspace_cutovers WHERE workspace_id = ? LIMIT 1",
  ).bind(workspaceId).first<{ frozen_at: string; frozen_by: string }>();
  return row ? { frozenAt: row.frozen_at, frozenBy: row.frozen_by } : null;
}

async function acquireLegacyWorkspaceWriteBarrier(
  database: D1DatabaseLike,
  workspaceId: string,
  operator: LegacyWorkspaceCutoverOperator,
) {
  const pendingOwner = `legacy_cutover_pending:${operator.userId}`;
  const frozenAt = new Date().toISOString();
  const result = await database.prepare(`INSERT INTO client_portal_legacy_workspace_cutovers(workspace_id, frozen_at, frozen_by)
    VALUES (?, ?, ?)
    ON CONFLICT(workspace_id) DO NOTHING`).bind(workspaceId, frozenAt, pendingOwner).run();
  if (result.success === false) {
    throw new LegacyWorkspaceCutoverError("Legacy cutover could not acquire the workspace write barrier.");
  }
  const barrier = await database.prepare<{ frozen_by: string }>(
    "SELECT frozen_by FROM client_portal_legacy_workspace_cutovers WHERE workspace_id = ? LIMIT 1",
  ).bind(workspaceId).first<{ frozen_by: string }>();
  if (!barrier || ![pendingOwner, "legacy_cutover", "migration_0122_backfill"].includes(barrier.frozen_by)) {
    throw new LegacyWorkspaceCutoverError("Legacy cutover is already controlled by another operator.");
  }
}

function cutoverStatements({
  appliedAt,
  barrierLease,
  cutoverAt,
  cutoverLease,
  database,
  fingerprint: preflightFingerprint,
  migrated,
  operator,
  skipped,
  workspaceId,
}: {
  appliedAt: string;
  barrierLease: LegacyCutoverBarrierLease;
  cutoverAt: string;
  cutoverLease?: LegacyCutoverBarrierLease;
  database: D1DatabaseLike;
  fingerprint: string;
  migrated: number;
  operator: LegacyWorkspaceCutoverOperator;
  skipped: number;
  workspaceId: string;
}) {
  const adminAuditId = `admin_audit_legacy_cutover_${fingerprint(workspaceId).slice(0, 32)}`;
  return [
    statement(database, `INSERT OR IGNORE INTO client_portal_baseline_backfill_exceptions
      (id, portal_id, issue_id, reason, details_json, detected_at, resolved_at)
      SELECT 'baseline_exception_' || lower(hex(randomblob(16))), mapping.portal_id, mapping.issue_id,
             'source_identity_missing', json_object('legacyPublicationId', mapping.legacy_publication_id, 'cutoverAt', ?), ?, NULL
      FROM client_portal_legacy_mappings mapping
      JOIN project_publications publication ON publication.id = mapping.legacy_publication_id
      JOIN client_portal_issues issue ON issue.id = mapping.issue_id
      WHERE publication.workspace_id = ? AND mapping.migration_status = 'verified'
        AND EXISTS (
          SELECT 1 FROM client_portal_legacy_workspace_cutovers barrier
          WHERE barrier.workspace_id = ? AND barrier.frozen_at = ? AND barrier.frozen_by = ?
        )
        AND NOT EXISTS (SELECT 1 FROM client_portal_baselines baseline WHERE baseline.issue_id = mapping.issue_id)
        AND NOT EXISTS (SELECT 1 FROM client_portal_issue_source_estimates source WHERE source.issue_id = mapping.issue_id)`, [
      cutoverAt,
      cutoverAt,
      workspaceId,
      workspaceId,
      barrierLease.frozenAt,
      barrierLease.frozenBy,
    ]),
    statement(database, `UPDATE client_portal_legacy_mappings
      SET migration_status = 'cutover_complete', verified_at = COALESCE(verified_at, ?),
          notes = json_remove(
            json_set(CASE WHEN json_valid(notes) THEN notes ELSE '{}' END, '$.cutover_at', ?, '$.workspace_id', ?),
            '$.cutover_lease_frozen_at', '$.cutover_lease_frozen_by'
          )
      WHERE legacy_publication_id IN (SELECT id FROM project_publications WHERE workspace_id = ?)
        AND migration_status = 'verified'
        AND (? IS NULL OR (
          json_extract(notes, '$.cutover_lease_frozen_at') = ?
          AND json_extract(notes, '$.cutover_lease_frozen_by') = ?
        ))`, [
      cutoverAt,
      cutoverAt,
      workspaceId,
      workspaceId,
      cutoverLease?.frozenAt ?? null,
      cutoverLease?.frozenAt ?? null,
      cutoverLease?.frozenBy ?? null,
    ]),
    statement(database, `UPDATE client_portal_legacy_workspace_cutovers
      SET frozen_by = 'legacy_cutover'
      WHERE workspace_id = ? AND frozen_at = ? AND frozen_by = ?
        AND NOT EXISTS (
          SELECT 1 FROM client_portal_legacy_mappings mapping
          JOIN project_publications publication ON publication.id = mapping.legacy_publication_id
          WHERE publication.workspace_id = ? AND mapping.migration_status <> 'cutover_complete'
        )`, [
      workspaceId,
      barrierLease.frozenAt,
      barrierLease.frozenBy,
      workspaceId,
    ]),
    statement(database, `INSERT INTO client_portal_audit_events
      (id, workspace_id, portal_id, issue_id, actor_type, actor_id, event_type, visibility, metadata_json, occurred_at, created_at)
      SELECT 'audit_' || lower(hex(randomblob(16))), ?, mapping.portal_id, mapping.issue_id, 'system', 'legacy_cutover', 'legacy_migration_cutover_completed', 'owner',
             json_object('legacyPublicationId', mapping.legacy_publication_id, 'cutoverAt', ?), ?, ?
      FROM client_portal_legacy_mappings mapping
      JOIN project_publications publication ON publication.id = mapping.legacy_publication_id
      WHERE publication.workspace_id = ? AND mapping.migration_status = 'cutover_complete'
        AND EXISTS (
          SELECT 1 FROM client_portal_legacy_workspace_cutovers barrier
          WHERE barrier.workspace_id = ? AND barrier.frozen_at = ? AND barrier.frozen_by = 'legacy_cutover'
        )
        AND NOT EXISTS (
          SELECT 1 FROM client_portal_audit_events audit
          WHERE audit.portal_id = mapping.portal_id AND audit.issue_id = mapping.issue_id
            AND audit.event_type = 'legacy_migration_cutover_completed'
        )`, [
      workspaceId,
      cutoverAt,
      cutoverAt,
      cutoverAt,
      workspaceId,
      workspaceId,
      barrierLease.frozenAt,
    ]),
    statement(database, `INSERT INTO admin_audit_events
      (id, actor_user_id, actor_email, action, target_type, target_id, summary_json, request_id, created_at)
      SELECT ?, ?, ?, 'client_portal.legacy_workspace_cutover_applied', 'workspace', ?, ?, NULL, ?
      FROM client_portal_legacy_workspace_cutovers
      WHERE workspace_id = ? AND frozen_at = ? AND frozen_by = 'legacy_cutover'
      ON CONFLICT(id) DO NOTHING`, [
      adminAuditId,
      operator.userId,
      operator.email,
      workspaceId,
      JSON.stringify({
        appliedAt,
        cutoverAt,
        fingerprint: preflightFingerprint,
        freezeEnabled: true,
        migrated,
        skipped,
      }),
      appliedAt,
      workspaceId,
      barrierLease.frozenAt,
    ]),
  ];
}

async function preflightLegacyWorkspace({
  database,
  inventory,
  publications,
}: {
  database: D1DatabaseLike;
  inventory: LegacyWorkspaceInventory;
  publications: LegacyPublicationRow[];
}) {
  let migrated = 0;
  let skipped = 0;
  const unresolved: Array<{ legacyPublicationId: string; reason: string }> = [];
  const publicationPlans: Array<{
    audienceStrategy: string;
    issueId: string;
    legacyPublicationId: string;
    portalId: string;
    snapshot: unknown;
    status: string;
    unresolved: unknown;
  }> = [];

  for (const publication of publications) {
    try {
      const report = await migrateLegacyPublicationToClientPortal({
        apply: false,
        database,
        legacyPublicationId: publication.id,
      });
      if (report.status === "already_migrated") skipped += 1;
      else migrated += 1;
      for (const item of report.unresolved) {
        unresolved.push({
          legacyPublicationId: publication.id,
          reason: `${item.kind}:${item.id}:${item.reason}`,
        });
      }
      publicationPlans.push({
        audienceStrategy: report.audienceStrategy,
        issueId: report.issueId,
        legacyPublicationId: publication.id,
        portalId: report.portalId,
        snapshot: report.snapshot,
        status: report.status,
        unresolved: report.unresolved,
      });
    } catch (error) {
      throw new LegacyWorkspaceCutoverError(
        `Legacy publication ${publication.id} could not be preflighted: ${error instanceof Error ? error.message : "unknown error"}`,
      );
    }
  }

  return {
    inventory: {
      ...inventory,
      fingerprint: fingerprint({
        inventory: inventory.fingerprint,
        publications: publicationPlans,
      }),
    },
    migrated,
    skipped,
    unresolved,
  };
}

export async function cutoverLegacyWorkspaceToClientPortals({
  apply = false,
  database,
  expectedFingerprint,
  operator,
  workspaceId,
}: {
  apply?: boolean;
  database: D1DatabaseLike;
  expectedFingerprint?: string;
  operator?: LegacyWorkspaceCutoverOperator;
  workspaceId: string;
}): Promise<LegacyWorkspaceCutoverReport> {
  const initialInventory = await readLegacyWorkspaceInventory({ database, workspaceId });
  if (initialInventory.inconsistentMappings > 0) {
    throw new LegacyWorkspaceCutoverError("Legacy cutover stopped because mapping ownership is inconsistent.");
  }
  const publications = await listLegacyPublications(database, workspaceId);
  const preflight = await preflightLegacyWorkspace({
    database,
    inventory: initialInventory,
    publications,
  });
  if (!apply) {
    const barrier = await readLegacyWorkspaceWriteBarrier(database, workspaceId);
    return {
      barrier,
      cutoverAt: null,
      dryRun: true,
      freezeEnabled: barrier.mode !== "none",
      inventory: preflight.inventory,
      migrated: preflight.migrated,
      skipped: preflight.skipped,
      status: "planned",
      unresolved: preflight.unresolved,
    };
  }
  if (!expectedFingerprint || expectedFingerprint !== preflight.inventory.fingerprint) {
    throw new LegacyWorkspaceCutoverError("Legacy cutover preflight is stale. Run a new dry check before applying.");
  }
  if (preflight.unresolved.length > 0) {
    throw new LegacyWorkspaceCutoverError("Legacy cutover stopped because unresolved legacy records remain.");
  }
  if (!operator) {
    throw new LegacyWorkspaceCutoverError("Legacy workspace cutover requires an attributed platform administrator.");
  }
  if (!database.batch) throw new LegacyWorkspaceCutoverError("Legacy workspace cutover requires D1 batch support.");

  await acquireLegacyWorkspaceWriteBarrier(database, workspaceId, operator);
  const acquiredBarrier = await readLegacyWorkspaceWriteBarrier(database, workspaceId);
  const acquiredLease = await readLegacyWorkspaceBarrierLease(database, workspaceId);
  if (!acquiredBarrier.frozenAt || !acquiredLease) {
    throw new LegacyWorkspaceCutoverError("Legacy workspace write barrier could not be verified.");
  }
  const pendingOwner = `legacy_cutover_pending:${operator.userId}`;
  const cutoverLease: LegacyCutoverBarrierLease | undefined = acquiredBarrier.mode === "pending"
    ? { frozenAt: acquiredBarrier.frozenAt, frozenBy: pendingOwner }
    : undefined;
  if (acquiredBarrier.mode === "pending" && acquiredBarrier.ownerUserId !== operator.userId) {
    throw new LegacyWorkspaceCutoverError("Legacy workspace write barrier ownership changed before migration.");
  }
  const barrierInventory = await readLegacyWorkspaceInventory({ database, workspaceId });
  const barrierPublications = await listLegacyPublications(database, workspaceId);
  const barrierPreflight = await preflightLegacyWorkspace({
    database,
    inventory: barrierInventory,
    publications: barrierPublications,
  });
  if (barrierPreflight.inventory.fingerprint !== expectedFingerprint) {
    throw new LegacyWorkspaceCutoverError("Legacy source changed before the write barrier was acquired. Run a new dry check before applying.");
  }
  if (barrierPreflight.unresolved.length > 0) {
    throw new LegacyWorkspaceCutoverError("Legacy cutover stopped because unresolved legacy records remain under the write barrier.");
  }

  let migrated = 0;
  let skipped = 0;
  for (const publication of barrierPublications) {
    try {
      const report = await migrateLegacyPublicationToClientPortal({
        apply: true,
        cutoverLease,
        database,
        legacyPublicationId: publication.id,
      });
      if (report.unresolved.length > 0) {
        throw new LegacyWorkspaceCutoverError("Legacy source changed after preflight; unresolved records remain.");
      }
      if (report.status === "already_migrated") skipped += 1;
      else migrated += 1;
    } catch (error) {
      throw new LegacyWorkspaceCutoverError(`Legacy publication ${publication.id} could not be migrated: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  }

  const mappings = await readMappings(database, workspaceId);
  const invalid = mappings.filter((mapping) => mapping.migration_status !== "verified" && mapping.migration_status !== "cutover_complete");
  if (mappings.length !== barrierPublications.length || invalid.length > 0) {
    throw new LegacyWorkspaceCutoverError("Legacy cutover stopped because not every publication has a verified modern mapping.");
  }

  const domainBarrier = await readLegacyWorkspaceWriteBarrier(database, workspaceId);
  const domainLease = await readLegacyWorkspaceBarrierLease(database, workspaceId);
  if (!domainBarrier.frozenAt) {
    throw new LegacyWorkspaceCutoverError("Legacy workspace write barrier was removed during migration.");
  }
  const leaseChanged = !domainLease
    || domainLease.frozenAt !== acquiredLease.frozenAt
    || domainLease.frozenBy !== acquiredLease.frozenBy
    || (cutoverLease
      ? domainBarrier.mode !== "pending" || domainBarrier.ownerUserId !== operator.userId
      : domainBarrier.mode !== "complete");
  if (leaseChanged) {
    throw new LegacyWorkspaceCutoverError("Legacy workspace write barrier changed during migration; finalization was stopped.");
  }
  const cutoverAt = domainBarrier.frozenAt;
  const appliedAt = new Date().toISOString();
  let results;
  try {
    results = await database.batch(cutoverStatements({
      appliedAt,
      barrierLease: acquiredLease,
      cutoverAt,
      cutoverLease,
      database,
      fingerprint: preflight.inventory.fingerprint,
      migrated,
      operator,
      skipped,
      workspaceId,
    }));
  } catch (error) {
    logAppError(error, {
      action: "finalize_legacy_workspace_cutover",
      context: { workspaceId },
      event: "legacy_workspace_cutover_finalization_error",
    });
    throw new LegacyWorkspaceCutoverError("Legacy cutover finalization failed; the write freeze was not confirmed.", { cause: error });
  }
  if (results.some((result) => result.success === false)) {
    const error = new Error("D1 batch returned an unsuccessful legacy cutover finalization result.");
    logAppError(error, {
      action: "finalize_legacy_workspace_cutover",
      context: { workspaceId },
      event: "legacy_workspace_cutover_finalization_error",
    });
    throw new LegacyWorkspaceCutoverError("Legacy cutover finalization failed; the write freeze was not confirmed.", { cause: error });
  }
  const finalized = await readMappings(database, workspaceId);
  if (finalized.some((mapping) => mapping.migration_status !== "cutover_complete")) {
    throw new LegacyWorkspaceCutoverError("Legacy cutover mappings were not finalized.");
  }
  const freeze = await readLegacyWorkspaceWriteBarrier(database, workspaceId);
  if (freeze.mode !== "complete" || freeze.frozenAt !== acquiredLease.frozenAt) {
    throw new LegacyWorkspaceCutoverError("Legacy workspace write freeze was not finalized under the acquired barrier lease.");
  }

  return {
    barrier: freeze,
    cutoverAt: freeze.frozenAt,
    dryRun: false,
    freezeEnabled: true,
    inventory: preflight.inventory,
    migrated,
    skipped,
    status: "cutover_complete",
    unresolved: [],
  };
}

async function countModernWorkspaceWritesAfterBarrier(
  database: D1DatabaseLike,
  workspaceId: string,
  frozenAt: string,
) {
  const [issues, messages, decisions, requests, auditEvents] = await Promise.all([
    count(database, `SELECT COUNT(*) AS count
      FROM client_portal_issues issue
      JOIN client_portals portal ON portal.id = issue.portal_id
      WHERE portal.workspace_id = ? AND issue.created_at >= ?`, [workspaceId, frozenAt]),
    count(database, `SELECT COUNT(*) AS count
      FROM client_portal_messages message
      JOIN client_portal_threads thread ON thread.id = message.thread_id
      JOIN client_portals portal ON portal.id = thread.portal_id
      WHERE portal.workspace_id = ? AND message.created_at >= ?`, [workspaceId, frozenAt]),
    count(database, `SELECT COUNT(*) AS count
      FROM client_portal_decisions decision
      JOIN client_portals portal ON portal.id = decision.portal_id
      WHERE portal.workspace_id = ? AND decision.submitted_at >= ?`, [workspaceId, frozenAt]),
    count(database, `SELECT COUNT(*) AS count
      FROM project_change_requests request
      WHERE request.workspace_id = ? AND request.origin_portal_id IS NOT NULL AND request.requested_at >= ?`, [workspaceId, frozenAt]),
    count(database, `SELECT COUNT(*) AS count
      FROM client_portal_audit_events
      WHERE workspace_id = ? AND occurred_at >= ? AND actor_type <> 'system'`, [workspaceId, frozenAt]),
  ]);
  return { auditEvents, decisions, issues, messages, requests };
}

export async function recoverLegacyWorkspaceCutoverBarrier({
  action,
  database,
  expectedFingerprint,
  operator,
  workspaceId,
}: {
  action: "release" | "takeover";
  database: D1DatabaseLike;
  expectedFingerprint: string;
  operator: LegacyWorkspaceCutoverOperator;
  workspaceId: string;
}): Promise<LegacyWorkspaceCutoverRecoveryReport> {
  if (!database.batch) throw new LegacyWorkspaceCutoverError("Legacy workspace cutover recovery requires D1 batch support.");
  if (action !== "takeover" && action !== "release") {
    throw new LegacyWorkspaceCutoverError("Legacy workspace cutover recovery action is invalid.");
  }
  const barrierBefore = await readLegacyWorkspaceWriteBarrier(database, workspaceId);
  if (!barrierBefore.frozenAt || !barrierBefore.ownerUserId) {
    throw new LegacyWorkspaceCutoverError("There is no pending legacy cutover barrier to recover.");
  }

  const inventory = await readLegacyWorkspaceInventory({ database, workspaceId });
  const publications = await listLegacyPublications(database, workspaceId);
  const preflight = await preflightLegacyWorkspace({ database, inventory, publications });
  if (preflight.inventory.fingerprint !== expectedFingerprint) {
    throw new LegacyWorkspaceCutoverError("Legacy cutover recovery preflight is stale. Run a new dry check.");
  }

  const recoveredAt = new Date().toISOString();
  const previousOwner = barrierBefore.ownerUserId;
  const recoveryAuditId = `admin_audit_legacy_cutover_recovery_${fingerprint(`${workspaceId}:${action}:${recoveredAt}:${operator.userId}`).slice(0, 32)}`;
  let modernWrites = { auditEvents: 0, decisions: 0, issues: 0, messages: 0, requests: 0 };
  if (action === "release") {
    modernWrites = await countModernWorkspaceWritesAfterBarrier(database, workspaceId, barrierBefore.frozenAt);
    const mappings = await readMappings(database, workspaceId);
    if (mappings.some((mapping) => ["imported", "verified", "cutover_complete"].includes(mapping.migration_status))) {
      throw new LegacyWorkspaceCutoverError("A legacy cutover barrier cannot be released after modern migration rows exist.");
    }
    if (Object.values(modernWrites).some((value) => value > 0)) {
      throw new LegacyWorkspaceCutoverError("Legacy cutover recovery cannot release the write barrier because modern workspace activity exists after the freeze.");
    }
  }

  const pendingOwner = `legacy_cutover_pending:${operator.userId}`;
  const previousPendingOwner = `legacy_cutover_pending:${previousOwner}`;
  const auditValues: D1Value[] = [
    recoveryAuditId,
    operator.userId,
    operator.email,
    `client_portal.legacy_workspace_cutover_${action}`,
    workspaceId,
    JSON.stringify({
      action,
      expectedFingerprint,
      frozenAt: barrierBefore.frozenAt,
      modernWrites,
      previousOwner,
    }),
    recoveredAt,
  ];
  const takeoverStatements = [
    statement(database, `UPDATE client_portal_legacy_mappings
      SET notes = json_set(
        CASE WHEN json_valid(notes) THEN notes ELSE '{}' END,
        '$.cutover_lease_frozen_at', ?,
        '$.cutover_lease_frozen_by', ?
      )
      WHERE legacy_publication_id IN (SELECT id FROM project_publications WHERE workspace_id = ?)
        AND migration_status IN ('imported', 'verified')
        AND json_extract(notes, '$.cutover_lease_frozen_at') = ?
        AND json_extract(notes, '$.cutover_lease_frozen_by') = ?`, [
      barrierBefore.frozenAt,
      pendingOwner,
      workspaceId,
      barrierBefore.frozenAt,
      previousPendingOwner,
    ]),
    statement(database, "UPDATE client_portal_legacy_workspace_cutovers SET frozen_by = ? WHERE workspace_id = ? AND frozen_at = ? AND frozen_by = ?", [pendingOwner, workspaceId, barrierBefore.frozenAt, previousPendingOwner]),
    statement(database, `INSERT INTO admin_audit_events
      (id, actor_user_id, actor_email, action, target_type, target_id, summary_json, request_id, created_at)
      SELECT ?, ?, ?, ?, 'workspace', ?, ?, NULL, ?
      FROM client_portal_legacy_workspace_cutovers
      WHERE workspace_id = ? AND frozen_at = ? AND frozen_by = ?`, [...auditValues, workspaceId, barrierBefore.frozenAt, pendingOwner]),
  ];
  const releaseSafety = `
      AND NOT EXISTS (
        SELECT 1 FROM client_portal_legacy_mappings mapping
        JOIN project_publications publication ON publication.id = mapping.legacy_publication_id
        WHERE publication.workspace_id = barrier.workspace_id
          AND mapping.migration_status IN ('imported', 'verified', 'cutover_complete')
      )
      AND NOT EXISTS (
        SELECT 1 FROM client_portal_issues issue
        JOIN client_portals portal ON portal.id = issue.portal_id
        WHERE portal.workspace_id = barrier.workspace_id AND issue.created_at >= barrier.frozen_at
      )
      AND NOT EXISTS (
        SELECT 1 FROM client_portal_messages message
        JOIN client_portal_threads thread ON thread.id = message.thread_id
        JOIN client_portals portal ON portal.id = thread.portal_id
        WHERE portal.workspace_id = barrier.workspace_id AND message.created_at >= barrier.frozen_at
      )
      AND NOT EXISTS (
        SELECT 1 FROM client_portal_decisions decision
        JOIN client_portals portal ON portal.id = decision.portal_id
        WHERE portal.workspace_id = barrier.workspace_id AND decision.submitted_at >= barrier.frozen_at
      )
      AND NOT EXISTS (
        SELECT 1 FROM project_change_requests request
        WHERE request.workspace_id = barrier.workspace_id
          AND request.origin_portal_id IS NOT NULL
          AND request.requested_at >= barrier.frozen_at
      )
      AND NOT EXISTS (
        SELECT 1 FROM client_portal_audit_events audit
        WHERE audit.workspace_id = barrier.workspace_id
          AND audit.occurred_at >= barrier.frozen_at
          AND audit.actor_type <> 'system'
      )`;
  const releaseStatements = [
    statement(database, `INSERT INTO admin_audit_events
      (id, actor_user_id, actor_email, action, target_type, target_id, summary_json, request_id, created_at)
      SELECT ?, ?, ?, ?, 'workspace', ?, ?, NULL, ?
      FROM client_portal_legacy_workspace_cutovers barrier
      WHERE barrier.workspace_id = ? AND barrier.frozen_at = ? AND barrier.frozen_by = ?${releaseSafety}`, [...auditValues, workspaceId, barrierBefore.frozenAt, previousPendingOwner]),
    statement(database, `DELETE FROM client_portal_legacy_workspace_cutovers
      WHERE workspace_id = ? AND frozen_at = ? AND frozen_by = ?
        AND EXISTS (
          SELECT 1 FROM client_portal_legacy_workspace_cutovers barrier
          WHERE barrier.workspace_id = client_portal_legacy_workspace_cutovers.workspace_id${releaseSafety}
        )`, [workspaceId, barrierBefore.frozenAt, previousPendingOwner]),
  ];
  const results = await database.batch(action === "takeover" ? takeoverStatements : releaseStatements);
  if (results.some((result) => result.success === false)) {
    throw new LegacyWorkspaceCutoverError("Legacy workspace cutover recovery could not be recorded atomically.");
  }
  const barrierAfter = await readLegacyWorkspaceWriteBarrier(database, workspaceId);
  if ((action === "takeover" && (barrierAfter.mode !== "pending" || barrierAfter.ownerUserId !== operator.userId || barrierAfter.frozenAt !== barrierBefore.frozenAt))
    || (action === "release" && barrierAfter.mode !== "none")) {
    throw new LegacyWorkspaceCutoverError("Legacy workspace cutover recovery did not change the write barrier as requested.");
  }
  return { action, barrierAfter, barrierBefore, recoveredAt, workspaceId };
}
