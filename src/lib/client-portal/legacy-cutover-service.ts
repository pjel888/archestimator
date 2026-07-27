import "server-only";

import { createHash } from "node:crypto";

import type { D1DatabaseLike, D1PreparedStatementLike, D1Value } from "@/lib/cloudflare/d1";
import { migrateLegacyPublicationToClientPortal } from "@/lib/client-portal/legacy-migration-service";

type CountRow = { count: number | null };
type StatusCountRow = { count: number; status: string };
type LegacyPublicationRow = { id: string };
type CutoverMappingRow = {
  issue_id: string;
  legacy_publication_id: string;
  migration_status: string;
  portal_id: string;
};

export type LegacyWorkspaceInventory = {
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
  cutoverAt: string | null;
  dryRun: boolean;
  freezeEnabled: boolean;
  inventory: LegacyWorkspaceInventory;
  migrated: number;
  skipped: number;
  status: "cutover_complete" | "planned";
  unresolved: Array<{ legacyPublicationId: string; reason: string }>;
};

export class LegacyWorkspaceCutoverError extends Error {
  constructor(message: string) {
    super(message);
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

export async function readLegacyWorkspaceInventory({
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

function cutoverStatements(database: D1DatabaseLike, workspaceId: string, cutoverAt: string) {
  return [
    statement(database, `UPDATE client_portal_issues
      SET status = CASE
        WHEN EXISTS (SELECT 1 FROM client_portal_decisions decision WHERE decision.issue_id = client_portal_issues.id AND decision.voided_at IS NULL AND decision.decision = 'approved') THEN 'accepted'
        WHEN EXISTS (SELECT 1 FROM client_portal_decisions decision WHERE decision.issue_id = client_portal_issues.id AND decision.voided_at IS NULL AND decision.decision = 'declined') THEN 'declined'
        WHEN EXISTS (SELECT 1 FROM client_portal_decisions decision WHERE decision.issue_id = client_portal_issues.id AND decision.voided_at IS NULL AND decision.decision = 'changes_requested') THEN 'changes_requested'
        ELSE status
      END
      WHERE id IN (
        SELECT mapping.issue_id FROM client_portal_legacy_mappings mapping
        JOIN project_publications publication ON publication.id = mapping.legacy_publication_id
        WHERE publication.workspace_id = ? AND mapping.migration_status = 'verified'
      )`, [workspaceId]),
    statement(database, `INSERT OR IGNORE INTO client_portal_baseline_backfill_exceptions
      (id, portal_id, issue_id, reason, details_json, detected_at, resolved_at)
      SELECT 'baseline_exception_' || lower(hex(randomblob(16))), mapping.portal_id, mapping.issue_id,
             'source_identity_missing', json_object('legacyPublicationId', mapping.legacy_publication_id, 'cutoverAt', ?), ?, NULL
      FROM client_portal_legacy_mappings mapping
      JOIN project_publications publication ON publication.id = mapping.legacy_publication_id
      JOIN client_portal_issues issue ON issue.id = mapping.issue_id AND issue.status = 'accepted'
      WHERE publication.workspace_id = ? AND mapping.migration_status = 'verified'
        AND NOT EXISTS (SELECT 1 FROM client_portal_baselines baseline WHERE baseline.issue_id = mapping.issue_id)
        AND NOT EXISTS (SELECT 1 FROM client_portal_issue_source_estimates source WHERE source.issue_id = mapping.issue_id)`, [cutoverAt, cutoverAt, workspaceId]),
    statement(database, `UPDATE client_portal_legacy_mappings
      SET migration_status = 'cutover_complete', verified_at = COALESCE(verified_at, ?),
          notes = json_set(CASE WHEN json_valid(notes) THEN notes ELSE '{}' END, '$.cutover_at', ?, '$.workspace_id', ?)
      WHERE legacy_publication_id IN (SELECT id FROM project_publications WHERE workspace_id = ?)
        AND migration_status = 'verified'`, [cutoverAt, cutoverAt, workspaceId, workspaceId]),
    statement(database, `INSERT INTO client_portal_legacy_workspace_cutovers(workspace_id, frozen_at, frozen_by)
      VALUES (?, ?, 'legacy_cutover')
      ON CONFLICT(workspace_id) DO UPDATE SET frozen_at = excluded.frozen_at, frozen_by = excluded.frozen_by`, [workspaceId, cutoverAt]),
    statement(database, `INSERT INTO client_portal_audit_events
      (id, workspace_id, portal_id, issue_id, actor_type, actor_id, event_type, visibility, metadata_json, occurred_at, created_at)
      SELECT 'audit_' || lower(hex(randomblob(16))), ?, mapping.portal_id, mapping.issue_id, 'system', 'legacy_cutover', 'legacy_migration_cutover_completed', 'owner',
             json_object('legacyPublicationId', mapping.legacy_publication_id, 'cutoverAt', ?), ?, ?
      FROM client_portal_legacy_mappings mapping
      JOIN project_publications publication ON publication.id = mapping.legacy_publication_id
      WHERE publication.workspace_id = ? AND mapping.migration_status = 'cutover_complete'
        AND NOT EXISTS (
          SELECT 1 FROM client_portal_audit_events audit
          WHERE audit.portal_id = mapping.portal_id AND audit.issue_id = mapping.issue_id
            AND audit.event_type = 'legacy_migration_cutover_completed'
        )`, [workspaceId, cutoverAt, cutoverAt, cutoverAt, workspaceId]),
  ];
}

export async function cutoverLegacyWorkspaceToClientPortals({
  apply = false,
  database,
  workspaceId,
}: {
  apply?: boolean;
  database: D1DatabaseLike;
  workspaceId: string;
}): Promise<LegacyWorkspaceCutoverReport> {
  const inventory = await readLegacyWorkspaceInventory({ database, workspaceId });
  if (inventory.inconsistentMappings > 0) {
    throw new LegacyWorkspaceCutoverError("Legacy cutover stopped because mapping ownership is inconsistent.");
  }
  const publications = await listLegacyPublications(database, workspaceId);
  if (!apply) {
    return { cutoverAt: null, dryRun: true, freezeEnabled: false, inventory, migrated: 0, skipped: publications.length, status: "planned", unresolved: [] };
  }
  if (!database.batch) throw new LegacyWorkspaceCutoverError("Legacy workspace cutover requires D1 batch support.");

  let migrated = 0;
  let skipped = 0;
  const unresolved: Array<{ legacyPublicationId: string; reason: string }> = [];
  for (const publication of publications) {
    try {
      const report = await migrateLegacyPublicationToClientPortal({ apply: true, database, legacyPublicationId: publication.id });
      if (report.status === "already_migrated") skipped += 1;
      else migrated += 1;
      for (const item of report.unresolved) unresolved.push({ legacyPublicationId: publication.id, reason: `${item.kind}:${item.reason}` });
    } catch (error) {
      throw new LegacyWorkspaceCutoverError(`Legacy publication ${publication.id} could not be migrated: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  }

  const mappings = await readMappings(database, workspaceId);
  const invalid = mappings.filter((mapping) => mapping.migration_status !== "verified" && mapping.migration_status !== "cutover_complete");
  if (mappings.length !== publications.length || invalid.length > 0) {
    throw new LegacyWorkspaceCutoverError("Legacy cutover stopped because not every publication has a verified modern mapping.");
  }

  const cutoverAt = new Date().toISOString();
  const results = await database.batch(cutoverStatements(database, workspaceId, cutoverAt));
  if (results.some((result) => result.success === false)) {
    throw new LegacyWorkspaceCutoverError("Legacy cutover finalization failed; the write freeze was not confirmed.");
  }
  const finalized = await readMappings(database, workspaceId);
  if (finalized.some((mapping) => mapping.migration_status !== "cutover_complete")) {
    throw new LegacyWorkspaceCutoverError("Legacy cutover mappings were not finalized.");
  }
  const freeze = await database.prepare<{ frozen_at: string }>("SELECT frozen_at FROM client_portal_legacy_workspace_cutovers WHERE workspace_id = ? LIMIT 1")
    .bind(workspaceId)
    .first<{ frozen_at: string }>();
  if (!freeze?.frozen_at) throw new LegacyWorkspaceCutoverError("Legacy workspace write freeze was not enabled.");

  return { cutoverAt, dryRun: false, freezeEnabled: true, inventory, migrated, skipped, status: "cutover_complete", unresolved };
}
