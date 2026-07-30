import { randomUUID } from "node:crypto";

import type { D1DatabaseLike, D1Result, D1Value } from "@/lib/cloudflare/d1";
import {
  assertD1MutationStatementLimit,
  buildCommittedMutationReceiptStatement,
  createMutationRequestFingerprint,
  readCommittedMutationReceipt,
} from "@/lib/estimates/mutation-receipts";
import {
  CatalogueGovernanceError,
  type CatalogueEntity,
  type CatalogueEntityKind,
  type CatalogueEntityLifecycleState,
  type CatalogueGovernanceCommand,
  type CatalogueGovernanceMutationResult,
  type CatalogueReferenceRewriteCounts,
  parseCatalogueMutationReceipt,
  readCatalogueEntityId,
  readCatalogueIntentId,
  readCatalogueName,
  readCatalogueRevision,
} from "./catalogue-governance";

type CatalogueEntityRow = {
  id: string;
  workspace_id: string;
  name: string;
  normalized_name: string;
  lifecycle_state: string;
  revision: number | string;
  archived_at: string | null;
  archived_by: string | null;
  merged_into_id: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

type CatalogueGovernanceStatement = {
  sql: string;
  values: D1Value[];
};

type CatalogueEstimateRowImpact = {
  row_id: string;
  project_id: string;
  estimate_id: string;
  row_revision: number | string;
};

type CatalogueTemplateImpact = {
  template_id: string;
  current_version_number: number | string;
  updated_at: string;
};

type CatalogueRewriteImpact = {
  estimateRows: CatalogueEstimateRowImpact[];
  templates: CatalogueTemplateImpact[];
  affectedEstimates: Array<{ projectId: string; estimateId: string }>;
};

export type CatalogueMutationContext = {
  workspaceId: string;
  actorUserId: string;
  isPlatformAdmin: boolean;
};

type NormalizedCommand =
  | { kind: "create"; entityKind: CatalogueEntityKind; intentId: string; name: string; normalizedName: string }
  | { kind: "rename"; entityKind: CatalogueEntityKind; intentId: string; entityId: string; expectedRevision: number; name: string; normalizedName: string }
  | { kind: "archive" | "restore"; entityKind: CatalogueEntityKind; intentId: string; entityId: string; expectedRevision: number }
  | { kind: "merge"; entityKind: CatalogueEntityKind; intentId: string; survivorId: string; duplicateId: string; expectedSurvivorRevision: number; expectedDuplicateRevision: number };

const ENTITY_SELECT = `
  id, workspace_id, name, normalized_name, lifecycle_state, revision,
  archived_at, archived_by, merged_into_id, created_by, updated_by,
  created_at, updated_at
`;

function entityTable(kind: CatalogueEntityKind) {
  return kind === "brand" ? "component_brands" : "component_suppliers";
}

function mapLifecycleState(value: string): CatalogueEntityLifecycleState {
  if (value === "active" || value === "archived" || value === "merged") return value;
  throw new Error("The catalogue entity lifecycle is invalid.");
}

function mapEntity(kind: CatalogueEntityKind, row: CatalogueEntityRow): CatalogueEntity {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    kind,
    name: row.name,
    normalizedName: row.normalized_name,
    lifecycleState: mapLifecycleState(row.lifecycle_state),
    revision: Number(row.revision),
    archivedAt: row.archived_at,
    archivedBy: row.archived_by,
    mergedIntoId: row.merged_into_id,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeCommand(command: CatalogueGovernanceCommand): NormalizedCommand {
  const intentId = readCatalogueIntentId(command.intentId);
  if (command.kind === "create") {
    const name = readCatalogueName(command.name);
    return { ...command, intentId, ...name };
  }
  if (command.kind === "rename") {
    const name = readCatalogueName(command.name);
    return {
      ...command,
      intentId,
      entityId: readCatalogueEntityId(command.entityId),
      expectedRevision: readCatalogueRevision(command.expectedRevision),
      ...name,
    };
  }
  if (command.kind === "archive" || command.kind === "restore") {
    return {
      ...command,
      intentId,
      entityId: readCatalogueEntityId(command.entityId),
      expectedRevision: readCatalogueRevision(command.expectedRevision),
    };
  }
  const survivorId = readCatalogueEntityId(command.survivorId);
  const duplicateId = readCatalogueEntityId(command.duplicateId);
  if (survivorId === duplicateId) {
    throw new CatalogueGovernanceError("catalogue_governance_conflict", "A catalogue entity cannot be merged into itself.");
  }
  return {
    ...command,
    intentId,
    survivorId,
    duplicateId,
    expectedSurvivorRevision: readCatalogueRevision(command.expectedSurvivorRevision),
    expectedDuplicateRevision: readCatalogueRevision(command.expectedDuplicateRevision),
  };
}

async function first<T>(database: D1DatabaseLike, sql: string, values: D1Value[] = []) {
  return database.prepare<T>(sql).bind(...values).first<T>();
}

async function count(database: D1DatabaseLike, sql: string, values: D1Value[] = []) {
  const row = await first<{ count: number | string }>(database, sql, values);
  return Number(row?.count ?? 0);
}

async function all<T>(database: D1DatabaseLike, sql: string, values: D1Value[] = []) {
  const result = await database.prepare<T>(sql).bind(...values).all<T>();
  if (result.success === false) throw new Error("Something went wrong. Try again in a moment.");
  return result.results ?? [];
}

async function runAtomicBatch(database: D1DatabaseLike, statements: CatalogueGovernanceStatement[]): Promise<D1Result[]> {
  if (!database.batch) throw new Error("Something went wrong. Try again in a moment.");
  assertD1MutationStatementLimit(statements.length);
  const results = await database.batch(
    statements.map((statement) => database.prepare(statement.sql).bind(...statement.values)),
  );
  if (results.some((result) => result.success === false)) throw new Error("Something went wrong. Try again in a moment.");
  return results;
}

async function requireMutationRole(database: D1DatabaseLike, context: CatalogueMutationContext, adminRequired: boolean) {
  if (context.isPlatformAdmin) return;
  const membership = await first<{ role: string }>(
    database,
    `SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ? LIMIT 1`,
    [context.workspaceId, context.actorUserId],
  );
  if (adminRequired) {
    if (membership?.role === "owner" || membership?.role === "admin") return;
    throw new CatalogueGovernanceError("catalogue_governance_admin_required", "Only workspace owners/admins can merge catalogue identities.");
  }
  if (membership?.role === "owner" || membership?.role === "admin" || membership?.role === "member") return;
  throw new CatalogueGovernanceError("catalogue_governance_denied", "Only workspace editors/admins can manage catalogue identities.");
}

async function readEntity(
  database: D1DatabaseLike,
  workspaceId: string,
  kind: CatalogueEntityKind,
  entityId: string,
) {
  const row = await first<CatalogueEntityRow>(
    database,
    `SELECT ${ENTITY_SELECT} FROM ${entityTable(kind)} WHERE id = ? AND workspace_id = ? LIMIT 1`,
    [entityId, workspaceId],
  );
  return row ? mapEntity(kind, row) : null;
}

async function readEntityByNormalizedName(
  database: D1DatabaseLike,
  workspaceId: string,
  kind: CatalogueEntityKind,
  normalizedName: string,
) {
  const row = await first<CatalogueEntityRow>(
    database,
    `SELECT ${ENTITY_SELECT} FROM ${entityTable(kind)} WHERE workspace_id = ? AND normalized_name = ? LIMIT 1`,
    [workspaceId, normalizedName],
  );
  return row ? mapEntity(kind, row) : null;
}

function requireEntity(entity: CatalogueEntity | null) {
  if (!entity) throw new CatalogueGovernanceError("catalogue_governance_not_found", "Catalogue entity was not found in this workspace.");
  return entity;
}

function assertRevision(entity: CatalogueEntity, expectedRevision: number) {
  if (entity.revision !== expectedRevision) {
    throw new CatalogueGovernanceError("catalogue_governance_stale_revision", "Catalogue entity changed. Refresh and try again.", entity);
  }
}

function mutationIdentity(context: CatalogueMutationContext, command: NormalizedCommand) {
  return {
    workspaceId: context.workspaceId,
    commandKind: `catalogue.${command.entityKind}.${command.kind}`,
    intentId: command.intentId,
    actorUserId: context.actorUserId,
    requestFingerprint: createMutationRequestFingerprint(command),
  };
}

async function readReplay(database: D1DatabaseLike, identity: ReturnType<typeof mutationIdentity>) {
  const result = await readCommittedMutationReceipt(database, identity, parseCatalogueMutationReceipt);
  return result ? { ...result, replayed: true } : null;
}

function buildReceiptStatement(
  identity: ReturnType<typeof mutationIdentity>,
  result: Omit<CatalogueGovernanceMutationResult, "replayed">,
  timestamp: string,
) {
  return buildCommittedMutationReceiptStatement({
    ...identity,
    resourceType: "catalogue_entity",
    resourceId: result.entity.id,
    result,
    timestamp,
  });
}

function buildAuditStatement(input: {
  context: CatalogueMutationContext;
  command: NormalizedCommand;
  result: Omit<CatalogueGovernanceMutationResult, "replayed">;
  previousEntity?: CatalogueEntity | null;
  timestamp: string;
}) {
  const eventAction = input.command.kind === "create"
    ? "created"
    : input.command.kind === "rename"
      ? "renamed"
      : input.command.kind === "archive"
        ? "archived"
        : input.command.kind === "restore"
          ? "restored"
          : "merged";
  const payload = {
    entityKind: input.command.entityKind,
    entityId: input.result.entity.id,
    intentId: input.command.intentId,
    previousLifecycleState: input.previousEntity?.lifecycleState ?? null,
    previousRevision: input.previousEntity?.revision ?? null,
    lifecycleState: input.result.entity.lifecycleState,
    revision: input.result.entity.revision,
    reusedExisting: input.result.reusedExisting === true,
    mergedEntityId: input.result.mergedEntity?.id ?? null,
    rewrittenCounts: input.result.rewrittenCounts ?? null,
    affectedEstimateCount: input.result.affectedEstimates?.length ?? 0,
  };
  return {
    sql: `
      INSERT INTO component_library_telemetry_events (
        id, actor_user_id, workspace_id, project_id, estimate_id,
        event_name, schema_version, surface, kind, resource_kind,
        action, reason, payload_json, created_at
      )
      VALUES (?, ?, ?, NULL, NULL, ?, 'v1', 'component_library_catalogue',
        'catalogue_governance', ?, ?, NULL, ?, ?)
    `,
    values: [
      randomUUID(),
      input.context.actorUserId,
      input.context.workspaceId,
      `catalogue_entity.${eventAction}`,
      input.command.entityKind,
      eventAction,
      JSON.stringify(payload),
      input.timestamp,
    ],
  } satisfies CatalogueGovernanceStatement;
}

function buildEntityGuardStatement(input: {
  workspaceId: string;
  kind: CatalogueEntityKind;
  entityId: string;
  revision: number;
  lifecycleState: CatalogueEntityLifecycleState;
  guardName: string;
}) {
  return {
    sql: `
      SELECT CASE WHEN EXISTS (
        SELECT 1 FROM ${entityTable(input.kind)}
        WHERE id = ? AND workspace_id = ? AND revision = ? AND lifecycle_state = ?
      ) THEN 1 ELSE json('') END AS ${input.guardName}
    `,
    values: [input.entityId, input.workspaceId, input.revision, input.lifecycleState],
  } satisfies CatalogueGovernanceStatement;
}

function buildLabelRewriteStatements(input: {
  kind: CatalogueEntityKind;
  workspaceId: string;
  entityId: string;
  name: string;
  timestamp: string;
}) {
  if (input.kind === "brand") {
    return [{
      sql: `UPDATE cost_library_items SET brand = ?, updated_at = ? WHERE workspace_id = ? AND brand_id = ?`,
      values: [input.name, input.timestamp, input.workspaceId, input.entityId],
    }, {
      sql: `UPDATE cost_library_item_price_options SET brand = ?, updated_at = ? WHERE workspace_id = ? AND brand_id = ?`,
      values: [input.name, input.timestamp, input.workspaceId, input.entityId],
    }, {
      sql: `
        UPDATE estimate_row_items
        SET source_snapshot_json = json_set(source_snapshot_json, '$.brand', ?),
            row_revision = row_revision + 1, updated_at = ?
        WHERE id IN (
          SELECT row_item.id FROM estimate_row_items AS row_item
          JOIN estimates AS estimate ON estimate.id = row_item.estimate_id
          JOIN projects AS project ON project.id = estimate.project_id
          WHERE project.workspace_id = ?
            AND (row_item.brand_id = ? OR json_extract(row_item.source_snapshot_json, '$.brandId') = ?)
        )
      `,
      values: [input.name, input.timestamp, input.workspaceId, input.entityId, input.entityId],
    }, {
      sql: `
        UPDATE estimate_template_row_items
        SET source_snapshot = json_set(source_snapshot, '$.brand', ?), updated_at = ?
        WHERE source_snapshot IS NOT NULL AND id IN (
          SELECT row_item.id FROM estimate_template_row_items AS row_item
          JOIN estimate_templates AS template ON template.id = row_item.template_id
          WHERE template.workspace_id = ? AND json_extract(row_item.source_snapshot, '$.brandId') = ?
        )
      `,
      values: [input.name, input.timestamp, input.workspaceId, input.entityId],
    }, {
      sql: `
        UPDATE cost_library_component_drafts
        SET draft_json = json_set(draft_json, '$.brand', ?), updated_at = ?
        WHERE workspace_id = ? AND status = 'active' AND json_extract(draft_json, '$.brandId') = ?
      `,
      values: [input.name, input.timestamp, input.workspaceId, input.entityId],
    }] satisfies CatalogueGovernanceStatement[];
  }
  return [{
    sql: `UPDATE cost_library_items SET supplier = ?, updated_at = ? WHERE workspace_id = ? AND supplier_id = ?`,
    values: [input.name, input.timestamp, input.workspaceId, input.entityId],
  }, {
    sql: `
      UPDATE estimate_row_items
      SET supplier = ?, source_snapshot_json = json_set(source_snapshot_json, '$.supplier', ?),
          row_revision = row_revision + 1, updated_at = ?
      WHERE id IN (
        SELECT row_item.id FROM estimate_row_items AS row_item
        JOIN estimates AS estimate ON estimate.id = row_item.estimate_id
        JOIN projects AS project ON project.id = estimate.project_id
        WHERE project.workspace_id = ?
          AND (row_item.supplier_id = ? OR json_extract(row_item.source_snapshot_json, '$.supplierId') = ?)
      )
    `,
    values: [input.name, input.name, input.timestamp, input.workspaceId, input.entityId, input.entityId],
  }, {
    sql: `
      UPDATE estimate_template_row_items
      SET supplier = ?, source_snapshot = json_set(source_snapshot, '$.supplier', ?), updated_at = ?
      WHERE id IN (
        SELECT row_item.id FROM estimate_template_row_items AS row_item
        JOIN estimate_templates AS template ON template.id = row_item.template_id
        WHERE template.workspace_id = ?
          AND (row_item.supplier_id = ? OR json_extract(row_item.source_snapshot, '$.supplierId') = ?)
      )
    `,
    values: [input.name, input.name, input.timestamp, input.workspaceId, input.entityId, input.entityId],
  }, {
    sql: `
      UPDATE cost_library_component_drafts
      SET draft_json = json_set(draft_json, '$.supplier', ?), updated_at = ?
      WHERE workspace_id = ? AND status = 'active' AND json_extract(draft_json, '$.supplierId') = ?
    `,
    values: [input.name, input.timestamp, input.workspaceId, input.entityId],
  }] satisfies CatalogueGovernanceStatement[];
}

async function readRewriteImpact(
  database: D1DatabaseLike,
  workspaceId: string,
  kind: CatalogueEntityKind,
  entityId: string,
): Promise<CatalogueRewriteImpact> {
  const isBrand = kind === "brand";
  const estimateReference = `row_item.${isBrand ? "brand_id" : "supplier_id"} = ?
    OR json_extract(row_item.source_snapshot_json, '$.${isBrand ? "brandId" : "supplierId"}') = ?`;
  const templateReference = isBrand
    ? "json_extract(row_item.source_snapshot, '$.brandId') = ?"
    : "row_item.supplier_id = ? OR json_extract(row_item.source_snapshot, '$.supplierId') = ?";
  const estimateValues: D1Value[] = [workspaceId, entityId, entityId];
  const templateValues: D1Value[] = isBrand ? [workspaceId, entityId] : [workspaceId, entityId, entityId];
  const [estimateRows, templates] = await Promise.all([
    all<CatalogueEstimateRowImpact>(database, `
      SELECT row_item.id AS row_id, project.id AS project_id, estimate.id AS estimate_id,
             row_item.row_revision
      FROM estimate_row_items AS row_item
      JOIN estimates AS estimate ON estimate.id = row_item.estimate_id
      JOIN projects AS project ON project.id = estimate.project_id
      WHERE project.workspace_id = ? AND (${estimateReference})
      ORDER BY project.id, estimate.id, row_item.id
    `, estimateValues),
    all<CatalogueTemplateImpact>(database, `
      SELECT DISTINCT template.id AS template_id, template.current_version_number, template.updated_at
      FROM estimate_template_row_items AS row_item
      JOIN estimate_templates AS template ON template.id = row_item.template_id
      WHERE template.workspace_id = ? AND (${templateReference})
      ORDER BY template.id
    `, templateValues),
  ]);
  const affected = new Map<string, { projectId: string; estimateId: string }>();
  for (const row of estimateRows) {
    affected.set(`${row.project_id}:${row.estimate_id}`, { projectId: row.project_id, estimateId: row.estimate_id });
  }
  if (templates.length > 0) {
    const linkedEstimates = await all<{ project_id: string; estimate_id: string }>(database, `
      SELECT DISTINCT instance.project_id, instance.estimate_id
      FROM estimate_template_instances AS instance
      WHERE instance.workspace_id = ?
        AND instance.template_id IN (SELECT json_extract(value, '$.templateId') FROM json_each(?))
        AND instance.link_state IN ('linked', 'updating', 'failed')
      ORDER BY instance.project_id, instance.estimate_id
    `, [workspaceId, JSON.stringify(templates.map((template) => ({ templateId: template.template_id })))]);
    for (const estimate of linkedEstimates) {
      affected.set(`${estimate.project_id}:${estimate.estimate_id}`, {
        projectId: estimate.project_id,
        estimateId: estimate.estimate_id,
      });
    }
  }
  return { estimateRows, templates, affectedEstimates: [...affected.values()] };
}

function buildEstimateRewriteLedgerStatements(input: {
  context: CatalogueMutationContext;
  command: Extract<NormalizedCommand, { kind: "rename" | "merge" }>;
  identity: ReturnType<typeof mutationIdentity>;
  estimateRows: CatalogueEstimateRowImpact[];
  timestamp: string;
}) {
  if (input.estimateRows.length === 0) return [];
  const isBrand = input.command.entityKind === "brand";
  const entityId = input.command.kind === "merge" ? input.command.duplicateId : input.command.entityId;
  const rowsJson = JSON.stringify(input.estimateRows.map((row) => ({
    rowId: row.row_id,
    projectId: row.project_id,
    estimateId: row.estimate_id,
    previousRowRevision: Number(row.row_revision),
    rowRevision: Number(row.row_revision) + 1,
    estimateIntentId: `catalogue:${createMutationRequestFingerprint({ intentId: input.command.intentId, estimateId: row.estimate_id })}`,
  })));
  const referencePredicate = `row_item.${isBrand ? "brand_id" : "supplier_id"} = ?
    OR json_extract(row_item.source_snapshot_json, '$.${isBrand ? "brandId" : "supplierId"}') = ?`;
  return [{
    sql: `SELECT CASE WHEN (
      SELECT COUNT(*) FROM estimate_row_items AS row_item
      JOIN estimates AS estimate ON estimate.id = row_item.estimate_id
      JOIN projects AS project ON project.id = estimate.project_id
      WHERE project.workspace_id = ? AND (${referencePredicate})
    ) = json_array_length(?) AND NOT EXISTS (
      SELECT 1 FROM json_each(?) AS expected
      WHERE NOT EXISTS (
        SELECT 1 FROM estimate_row_items AS row_item
        JOIN estimates AS estimate ON estimate.id = row_item.estimate_id
        JOIN projects AS project ON project.id = estimate.project_id
        WHERE row_item.id = json_extract(expected.value, '$.rowId')
          AND row_item.row_revision = json_extract(expected.value, '$.previousRowRevision')
          AND project.workspace_id = ? AND (${referencePredicate})
      )
    ) THEN 1 ELSE json('') END AS catalogue_estimate_rewrite_guard`,
    values: [input.context.workspaceId, entityId, entityId, rowsJson, rowsJson,
      input.context.workspaceId, entityId, entityId],
  }, {
    sql: `WITH expected(row_json) AS (SELECT value FROM json_each(?)), grouped AS (
      SELECT json_extract(row_json, '$.estimateId') AS estimate_id,
             json_extract(row_json, '$.projectId') AS project_id,
             json_extract(row_json, '$.estimateIntentId') AS estimate_intent_id,
             COUNT(*) AS row_count, json_group_array(json(row_json)) AS rows_json
      FROM expected GROUP BY estimate_id, project_id, estimate_intent_id
    ) INSERT INTO estimate_sheet_events (
      id, estimate_id, workspace_id, project_id, estimate_node_id, estimate_tab_id,
      target_row_id, event_type, event_source, correlation_id, actor_user_id,
      changed_fields, row_context, old_snapshot, new_snapshot, payload, metadata,
      total_delta, created_at
    ) SELECT lower(hex(randomblob(16))), estimate_id, ?, project_id, NULL, NULL, NULL,
      'catalogue_reference_rows_rewritten', 'server_action', estimate_intent_id, ?,
      ?, json_object('entityKind', ?, 'rowCount', row_count), NULL, NULL,
      json_object('catalogueIntentId', ?, 'rowCount', row_count, 'rows', json(rows_json)),
      json_object('source', 'catalogue-governance', 'catalogueRequestFingerprint', ?), NULL, ?
    FROM grouped`,
    values: [rowsJson, input.context.workspaceId, input.context.actorUserId,
      JSON.stringify(isBrand ? ["brand", "source_snapshot"] : ["supplier", "source_snapshot"]),
      input.command.entityKind, input.command.intentId, input.identity.requestFingerprint, input.timestamp],
  }, {
    sql: `INSERT INTO activity_event_outbox (
      id, workspace_id, event_id, status, attempt_count, available_at, created_at, updated_at
    ) SELECT lower(hex(randomblob(16))), ?, event.id, 'pending', 0, ?, ?, ?
      FROM estimate_sheet_events AS event
      WHERE event.workspace_id = ? AND event.event_type = 'catalogue_reference_rows_rewritten'
        AND json_extract(event.metadata, '$.catalogueRequestFingerprint') = ?
      ON CONFLICT(event_id) DO NOTHING`,
    values: [input.context.workspaceId, input.timestamp, input.timestamp, input.timestamp,
      input.context.workspaceId, input.identity.requestFingerprint],
  }, {
    sql: `UPDATE projects SET publication_source_revision = publication_source_revision + 1
      WHERE workspace_id = ?
        AND id IN (SELECT DISTINCT json_extract(value, '$.projectId') FROM json_each(?))`,
    values: [input.context.workspaceId, rowsJson],
  }, {
    sql: `WITH expected(row_json) AS (SELECT value FROM json_each(?)), grouped AS (
      SELECT json_extract(row_json, '$.estimateId') AS estimate_id,
             json_extract(row_json, '$.projectId') AS project_id,
             json_extract(row_json, '$.estimateIntentId') AS estimate_intent_id,
             COUNT(*) AS row_count, json_group_array(json(row_json)) AS rows_json
      FROM expected GROUP BY estimate_id, project_id, estimate_intent_id
    ) INSERT INTO estimate_mutation_receipts (
      id, workspace_id, command_kind, intent_id, actor_user_id, resource_type,
      resource_id, request_fingerprint, status, result_json, created_at, updated_at
    ) SELECT lower(hex(randomblob(16))), ?, ?, estimate_intent_id, ?,
      'estimate', estimate_id, ?, 'committed',
      json_object('projectId', project_id, 'estimateId', estimate_id,
        'catalogueIntentId', ?, 'rowCount', row_count, 'rows', json(rows_json)), ?, ?
    FROM grouped`,
    values: [rowsJson, input.context.workspaceId, `${input.identity.commandKind}.estimate`,
      input.context.actorUserId, input.identity.requestFingerprint, input.command.intentId,
      input.timestamp, input.timestamp],
  }] satisfies CatalogueGovernanceStatement[];
}

function buildTemplateVersionPropagationStatements(input: {
  context: CatalogueMutationContext;
  command: Extract<NormalizedCommand, { kind: "rename" | "merge" }>;
  identity: ReturnType<typeof mutationIdentity>;
  templates: CatalogueTemplateImpact[];
  timestamp: string;
}) {
  if (input.templates.length === 0) return [];
  const templatesJson = JSON.stringify(input.templates.map((template) => ({
    templateId: template.template_id,
    currentVersionNumber: Number(template.current_version_number),
    updatedAt: template.updated_at,
  })));
  return [{
    sql: `SELECT CASE WHEN NOT EXISTS (
      SELECT 1 FROM json_each(?) AS expected
      WHERE NOT EXISTS (
        SELECT 1 FROM estimate_templates AS template
        JOIN estimate_template_versions AS version
          ON version.template_id = template.id AND version.workspace_id = template.workspace_id
         AND version.version_number = template.current_version_number
        WHERE template.id = json_extract(expected.value, '$.templateId')
          AND template.workspace_id = ?
          AND template.current_version_number = json_extract(expected.value, '$.currentVersionNumber')
          AND template.updated_at = json_extract(expected.value, '$.updatedAt')
      )
    ) THEN 1 ELSE json('') END AS catalogue_template_version_guard`,
    values: [templatesJson, input.context.workspaceId],
  }, {
    sql: `INSERT INTO estimate_template_versions (
      template_id, version_number, workspace_id, snapshot_json, source_fingerprint,
      change_kind, change_summary_json, created_by, created_at
    ) SELECT template.id, template.current_version_number + 1, template.workspace_id,
      json_set(version.snapshot_json,
        '$.template', json_object('id', template.id, 'name', template.name,
          'description', template.description, 'category', template.category),
        '$.rows', json(COALESCE((
          SELECT json_group_array(json(ordered_rows.row_json)) FROM (
            SELECT CASE WHEN row.source_library_item_id IS NOT NULL
              AND row.link_state NOT IN ('unlinked', 'detached')
            THEN json_object('id', row.id, 'rowKind', 'component',
              'templateNodeId', row.template_node_id, 'sortOrder', row.sort_order,
              'sourceLibraryItemId', row.source_library_item_id,
              'selectedVariantId', json_extract(row.source_snapshot, '$.priceOptionId'),
              'initialTakeoffDefaults', json_object('quantity', row.quantity,
                'contingencyPercentage', row.contingency_percentage,
                'adjustmentPercentage', row.adjustment_percentage))
            ELSE json_patch(json_object('id', row.id, 'rowKind', 'custom',
              'templateNodeId', row.template_node_id, 'sortOrder', row.sort_order,
              'material', row.material, 'description', row.description,
              'supplier', row.supplier, 'supplierId', row.supplier_id,
              'unit', row.unit, 'unitCost', row.unit_cost, 'miscCost', row.misc_cost,
              'categoryNodeId', row.category_node_id, 'discipline', row.discipline,
              'designation', row.designation), json_object(
                'sourceSnapshot', CASE WHEN row.source_snapshot IS NOT NULL
                  AND json_valid(row.source_snapshot) THEN json(row.source_snapshot) ELSE json('{}') END,
                'metadata', json(row.metadata),
                'initialTakeoffDefaults', json_object('quantity', row.quantity,
                  'contingencyPercentage', row.contingency_percentage,
                  'adjustmentPercentage', row.adjustment_percentage))) END AS row_json
            FROM estimate_template_row_items AS row
            WHERE row.template_id = template.id ORDER BY row.sort_order ASC, row.id ASC
          ) AS ordered_rows
        ), '[]'))),
      ?, ?, json_object('summary', 'Catalogue reference rewrite',
        'catalogueIntentId', ?, 'entityKind', ?), ?, ?
    FROM estimate_templates AS template
    JOIN estimate_template_versions AS version
      ON version.template_id = template.id AND version.workspace_id = template.workspace_id
     AND version.version_number = template.current_version_number
    WHERE template.workspace_id = ?
      AND template.id IN (SELECT json_extract(value, '$.templateId') FROM json_each(?))`,
    values: [input.identity.requestFingerprint, `catalogue_${input.command.entityKind}_${input.command.kind}`,
      input.command.intentId, input.command.entityKind, input.context.actorUserId, input.timestamp,
      input.context.workspaceId, templatesJson],
  }, {
    sql: `UPDATE estimate_templates
      SET current_version_number = current_version_number + 1, updated_at = ?
      WHERE workspace_id = ?
        AND id IN (SELECT json_extract(value, '$.templateId') FROM json_each(?))`,
    values: [input.timestamp, input.context.workspaceId, templatesJson],
  }, {
    sql: `UPDATE estimate_template_instances
      SET target_version_number = (
        SELECT template.current_version_number FROM estimate_templates AS template
        WHERE template.id = estimate_template_instances.template_id
          AND template.workspace_id = estimate_template_instances.workspace_id
      ), link_state = 'updating', last_error_code = NULL, updated_at = ?
      WHERE workspace_id = ?
        AND template_id IN (SELECT json_extract(value, '$.templateId') FROM json_each(?))
        AND link_state IN ('linked', 'updating', 'failed')`,
    values: [input.timestamp, input.context.workspaceId, templatesJson],
  }, {
    sql: `INSERT INTO estimate_template_propagation_jobs (
      instance_id, workspace_id, template_id, target_version_number, state,
      attempt_count, available_at, created_at, updated_at
    ) SELECT instance.id, instance.workspace_id, instance.template_id,
      instance.target_version_number, 'pending', 0, ?, ?, ?
    FROM estimate_template_instances AS instance
    WHERE instance.workspace_id = ?
      AND instance.template_id IN (SELECT json_extract(value, '$.templateId') FROM json_each(?))
      AND instance.link_state IN ('linked', 'updating', 'failed')
    ON CONFLICT(instance_id) DO UPDATE SET
      target_version_number = MAX(target_version_number, excluded.target_version_number),
      state = 'pending', attempt_count = 0, available_at = excluded.available_at,
      lease_token = NULL, lease_expires_at = NULL, last_error_code = NULL,
      failure_class = NULL, retryable = NULL, completed_at = NULL,
      updated_at = excluded.updated_at`,
    values: [input.timestamp, input.timestamp, input.timestamp, input.context.workspaceId, templatesJson],
  }] satisfies CatalogueGovernanceStatement[];
}

async function executeCreate(
  database: D1DatabaseLike,
  context: CatalogueMutationContext,
  command: Extract<NormalizedCommand, { kind: "create" }>,
) {
  const identity = mutationIdentity(context, command);
  const replay = await readReplay(database, identity);
  if (replay) return replay;
  const existing = await readEntityByNormalizedName(database, context.workspaceId, command.entityKind, command.normalizedName);
  if (existing?.lifecycleState === "archived") {
    throw new CatalogueGovernanceError(
      "catalogue_governance_archived_duplicate",
      "An archived catalogue entity already uses this name. Restore it instead.",
      existing,
    );
  }
  if (existing?.lifecycleState === "merged") {
    throw new CatalogueGovernanceError("catalogue_governance_conflict", "Catalogue identity is being reconciled. Refresh and try again.");
  }
  const timestamp = new Date().toISOString();
  const entity: CatalogueEntity = existing ?? {
    id: randomUUID(),
    workspaceId: context.workspaceId,
    kind: command.entityKind,
    name: command.name,
    normalizedName: command.normalizedName,
    lifecycleState: "active",
    revision: 1,
    archivedAt: null,
    archivedBy: null,
    mergedIntoId: null,
    createdBy: context.actorUserId,
    updatedBy: context.actorUserId,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const result = { entity, reusedExisting: Boolean(existing) };
  const statements: CatalogueGovernanceStatement[] = [];
  if (existing) {
    statements.push(buildEntityGuardStatement({
      workspaceId: context.workspaceId,
      kind: command.entityKind,
      entityId: existing.id,
      revision: existing.revision,
      lifecycleState: "active",
      guardName: "catalogue_create_existing_guard",
    }));
  } else {
    statements.push({
      sql: `
        INSERT INTO ${entityTable(command.entityKind)} (
          id, workspace_id, name, normalized_name, sort_order, metadata_json,
          lifecycle_state, revision, archived_at, archived_by, merged_into_id,
          created_by, updated_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 0, '{}', 'active', 1, NULL, NULL, NULL, ?, ?, ?, ?)
      `,
      values: [entity.id, context.workspaceId, command.name, command.normalizedName, context.actorUserId, context.actorUserId, timestamp, timestamp],
    });
  }
  statements.push(
    buildAuditStatement({ context, command, result, previousEntity: existing, timestamp }),
    buildReceiptStatement(identity, result, timestamp),
  );
  try {
    await runAtomicBatch(database, statements);
  } catch (error) {
    const racedReplay = await readReplay(database, identity);
    if (racedReplay) return racedReplay;
    const collision = await readEntityByNormalizedName(database, context.workspaceId, command.entityKind, command.normalizedName);
    if (collision?.lifecycleState === "archived") {
      throw new CatalogueGovernanceError("catalogue_governance_archived_duplicate", "An archived catalogue entity already uses this name. Restore it instead.", collision);
    }
    if (collision) throw new CatalogueGovernanceError("catalogue_governance_conflict", "A catalogue entity already uses this name.", collision);
    throw error;
  }
  return { ...result, replayed: false };
}

async function executeLifecycleMutation(
  database: D1DatabaseLike,
  context: CatalogueMutationContext,
  command: Extract<NormalizedCommand, { kind: "rename" | "archive" | "restore" }>,
) {
  const identity = mutationIdentity(context, command);
  const replay = await readReplay(database, identity);
  if (replay) return replay;
  const current = requireEntity(await readEntity(database, context.workspaceId, command.entityKind, command.entityId));
  assertRevision(current, command.expectedRevision);
  if (current.lifecycleState === "merged") {
    throw new CatalogueGovernanceError("catalogue_governance_conflict", "Merged catalogue identities cannot be edited.", current);
  }
  if (command.kind === "archive" && current.lifecycleState !== "active") {
    throw new CatalogueGovernanceError("catalogue_governance_conflict", "Only an active catalogue entity can be archived.", current);
  }
  if (command.kind === "restore" && current.lifecycleState !== "archived") {
    throw new CatalogueGovernanceError("catalogue_governance_conflict", "Only an archived catalogue entity can be restored.", current);
  }
  if (command.kind === "archive") {
    const mergedDependents = await count(
      database,
      `SELECT COUNT(*) AS count FROM ${entityTable(command.entityKind)} WHERE workspace_id = ? AND merged_into_id = ? AND lifecycle_state = 'merged'`,
      [context.workspaceId, current.id],
    );
    if (mergedDependents > 0) {
      throw new CatalogueGovernanceError("catalogue_governance_conflict", "A merge survivor cannot be archived while merged identities depend on it.", current);
    }
  }
  if (command.kind === "rename") {
    const collision = await readEntityByNormalizedName(database, context.workspaceId, command.entityKind, command.normalizedName);
    if (collision && collision.id !== current.id) {
      throw new CatalogueGovernanceError(
        collision.lifecycleState === "archived" ? "catalogue_governance_archived_duplicate" : "catalogue_governance_conflict",
        collision.lifecycleState === "archived"
          ? "An archived catalogue entity already uses this name. Restore it instead."
          : "A catalogue entity already uses this name.",
        collision,
      );
    }
  }
  const timestamp = new Date().toISOString();
  const rewriteImpact = command.kind === "rename"
    ? await readRewriteImpact(database, context.workspaceId, command.entityKind, current.id)
    : { estimateRows: [], templates: [], affectedEstimates: [] } satisfies CatalogueRewriteImpact;
  const entity: CatalogueEntity = {
    ...current,
    ...(command.kind === "rename" ? { name: command.name, normalizedName: command.normalizedName } : {}),
    lifecycleState: command.kind === "archive" ? "archived" : command.kind === "restore" ? "active" : current.lifecycleState,
    revision: current.revision + 1,
    archivedAt: command.kind === "archive" ? timestamp : command.kind === "restore" ? null : current.archivedAt,
    archivedBy: command.kind === "archive" ? context.actorUserId : command.kind === "restore" ? null : current.archivedBy,
    updatedBy: context.actorUserId,
    updatedAt: timestamp,
  };
  const result = {
    entity,
    ...(command.kind === "rename" ? { affectedEstimates: rewriteImpact.affectedEstimates } : {}),
  };
  const statements: CatalogueGovernanceStatement[] = [buildEntityGuardStatement({
    workspaceId: context.workspaceId,
    kind: command.entityKind,
    entityId: current.id,
    revision: current.revision,
    lifecycleState: current.lifecycleState,
    guardName: `catalogue_${command.kind}_revision_guard`,
  })];
  if (command.kind === "rename") {
    const estimateRewriteStatements = buildEstimateRewriteLedgerStatements({
      context,
      command,
      identity,
      estimateRows: rewriteImpact.estimateRows,
      timestamp,
    });
    const templateRewriteStatements = buildTemplateVersionPropagationStatements({
      context,
      command,
      identity,
      templates: rewriteImpact.templates,
      timestamp,
    });
    statements.push({
      sql: `
        SELECT CASE WHEN NOT EXISTS (
          SELECT 1 FROM ${entityTable(command.entityKind)}
          WHERE workspace_id = ? AND normalized_name = ? AND id <> ?
        ) THEN 1 ELSE json('') END AS catalogue_rename_collision_guard
      `,
      values: [context.workspaceId, command.normalizedName, current.id],
    }, ...estimateRewriteStatements.slice(0, 1), ...templateRewriteStatements.slice(0, 1), {
      sql: `
        UPDATE ${entityTable(command.entityKind)}
        SET name = ?, normalized_name = ?, revision = revision + 1,
            updated_by = ?, updated_at = ?
        WHERE id = ? AND workspace_id = ? AND revision = ? AND lifecycle_state <> 'merged'
      `,
      values: [command.name, command.normalizedName, context.actorUserId, timestamp, current.id, context.workspaceId, current.revision],
    }, ...buildLabelRewriteStatements({
      kind: command.entityKind,
      workspaceId: context.workspaceId,
      entityId: current.id,
      name: command.name,
      timestamp,
    }), ...estimateRewriteStatements.slice(1), ...templateRewriteStatements.slice(1));
  } else if (command.kind === "archive") {
    statements.push({
      sql: `
        UPDATE ${entityTable(command.entityKind)}
        SET lifecycle_state = 'archived', archived_at = ?, archived_by = ?,
            revision = revision + 1, updated_by = ?, updated_at = ?
        WHERE id = ? AND workspace_id = ? AND revision = ? AND lifecycle_state = 'active'
      `,
      values: [timestamp, context.actorUserId, context.actorUserId, timestamp, current.id, context.workspaceId, current.revision],
    });
  } else {
    statements.push({
      sql: `
        UPDATE ${entityTable(command.entityKind)}
        SET lifecycle_state = 'active', archived_at = NULL, archived_by = NULL,
            revision = revision + 1, updated_by = ?, updated_at = ?
        WHERE id = ? AND workspace_id = ? AND revision = ? AND lifecycle_state = 'archived'
      `,
      values: [context.actorUserId, timestamp, current.id, context.workspaceId, current.revision],
    });
  }
  statements.push(
    buildAuditStatement({ context, command, result, previousEntity: current, timestamp }),
    buildReceiptStatement(identity, result, timestamp),
  );
  try {
    await runAtomicBatch(database, statements);
  } catch (error) {
    const racedReplay = await readReplay(database, identity);
    if (racedReplay) return racedReplay;
    const latest = await readEntity(database, context.workspaceId, command.entityKind, current.id);
    if (latest && latest.revision !== current.revision) assertRevision(latest, current.revision);
    throw error;
  }
  return { ...result, replayed: false };
}

async function readMergeRewriteCounts(
  database: D1DatabaseLike,
  workspaceId: string,
  kind: CatalogueEntityKind,
  duplicateId: string,
): Promise<CatalogueReferenceRewriteCounts> {
  const isBrand = kind === "brand";
  const [costLibraryItems, priceOptions, estimateRows, templateRows, drafts] = await Promise.all([
    count(database, `SELECT COUNT(*) AS count FROM cost_library_items WHERE workspace_id = ? AND ${isBrand ? "brand_id" : "supplier_id"} = ?`, [workspaceId, duplicateId]),
    count(database, `SELECT COUNT(*) AS count FROM cost_library_item_price_options WHERE workspace_id = ? AND ${isBrand ? "brand_id" : "supplier_id"} = ?`, [workspaceId, duplicateId]),
    count(database, `
      SELECT COUNT(*) AS count FROM estimate_row_items AS row_item
      JOIN estimates AS estimate ON estimate.id = row_item.estimate_id
      JOIN projects AS project ON project.id = estimate.project_id
      WHERE project.workspace_id = ? AND (
        row_item.${isBrand ? "brand_id" : "supplier_id"} = ?
        OR json_extract(row_item.source_snapshot_json, '$.${isBrand ? "brandId" : "supplierId"}') = ?
      )
    `, [workspaceId, duplicateId, duplicateId]),
    count(database, `
      SELECT COUNT(*) AS count FROM estimate_template_row_items AS row_item
      JOIN estimate_templates AS template ON template.id = row_item.template_id
      WHERE template.workspace_id = ? AND ${isBrand
        ? "json_extract(row_item.source_snapshot, '$.brandId') = ?"
        : "(row_item.supplier_id = ? OR json_extract(row_item.source_snapshot, '$.supplierId') = ?)"}
    `, isBrand ? [workspaceId, duplicateId] : [workspaceId, duplicateId, duplicateId]),
    count(database, `
      SELECT COUNT(*) AS count FROM cost_library_component_drafts
      WHERE workspace_id = ? AND status = 'active'
        AND json_extract(draft_json, '$.${isBrand ? "brandId" : "supplierId"}') = ?
    `, [workspaceId, duplicateId]),
  ]);
  return { costLibraryItems, priceOptions, estimateRows, templateRows, drafts };
}

function buildMergeCountGuard(input: {
  workspaceId: string;
  kind: CatalogueEntityKind;
  duplicateId: string;
  counts: CatalogueReferenceRewriteCounts;
}) {
  const isBrand = input.kind === "brand";
  return {
    sql: `
      SELECT CASE WHEN
        (SELECT COUNT(*) FROM cost_library_items WHERE workspace_id = ? AND ${isBrand ? "brand_id" : "supplier_id"} = ?) = ?
        AND (SELECT COUNT(*) FROM cost_library_item_price_options WHERE workspace_id = ? AND ${isBrand ? "brand_id" : "supplier_id"} = ?) = ?
        AND (
          SELECT COUNT(*) FROM estimate_row_items AS row_item
          JOIN estimates AS estimate ON estimate.id = row_item.estimate_id
          JOIN projects AS project ON project.id = estimate.project_id
          WHERE project.workspace_id = ? AND (
            row_item.${isBrand ? "brand_id" : "supplier_id"} = ?
            OR json_extract(row_item.source_snapshot_json, '$.${isBrand ? "brandId" : "supplierId"}') = ?
          )
        ) = ?
        AND (
          SELECT COUNT(*) FROM estimate_template_row_items AS row_item
          JOIN estimate_templates AS template ON template.id = row_item.template_id
          WHERE template.workspace_id = ? AND ${isBrand
            ? "json_extract(row_item.source_snapshot, '$.brandId') = ?"
            : "(row_item.supplier_id = ? OR json_extract(row_item.source_snapshot, '$.supplierId') = ?)"}
        ) = ?
        AND (
          SELECT COUNT(*) FROM cost_library_component_drafts
          WHERE workspace_id = ? AND status = 'active'
            AND json_extract(draft_json, '$.${isBrand ? "brandId" : "supplierId"}') = ?
        ) = ?
      THEN 1 ELSE json('') END AS catalogue_merge_reference_guard
    `,
    values: isBrand
      ? [
          input.workspaceId, input.duplicateId, input.counts.costLibraryItems,
          input.workspaceId, input.duplicateId, input.counts.priceOptions,
          input.workspaceId, input.duplicateId, input.duplicateId, input.counts.estimateRows,
          input.workspaceId, input.duplicateId, input.counts.templateRows,
          input.workspaceId, input.duplicateId, input.counts.drafts,
        ]
      : [
          input.workspaceId, input.duplicateId, input.counts.costLibraryItems,
          input.workspaceId, input.duplicateId, input.counts.priceOptions,
          input.workspaceId, input.duplicateId, input.duplicateId, input.counts.estimateRows,
          input.workspaceId, input.duplicateId, input.duplicateId, input.counts.templateRows,
          input.workspaceId, input.duplicateId, input.counts.drafts,
        ],
  } satisfies CatalogueGovernanceStatement;
}

function buildMergeReferenceStatements(input: {
  workspaceId: string;
  kind: CatalogueEntityKind;
  survivor: CatalogueEntity;
  duplicate: CatalogueEntity;
  timestamp: string;
}) {
  if (input.kind === "brand") {
    return [{
      sql: `UPDATE cost_library_items SET brand_id = ?, brand = ?, updated_at = ? WHERE workspace_id = ? AND brand_id = ?`,
      values: [input.survivor.id, input.survivor.name, input.timestamp, input.workspaceId, input.duplicate.id],
    }, {
      sql: `UPDATE cost_library_item_price_options SET brand_id = ?, brand = ?, updated_at = ? WHERE workspace_id = ? AND brand_id = ?`,
      values: [input.survivor.id, input.survivor.name, input.timestamp, input.workspaceId, input.duplicate.id],
    }, {
      sql: `
        UPDATE estimate_row_items
        SET brand_id = ?,
            source_snapshot_json = json_set(source_snapshot_json, '$.brandId', ?, '$.brand', ?),
            row_revision = row_revision + 1, updated_at = ?
        WHERE id IN (
          SELECT row_item.id FROM estimate_row_items AS row_item
          JOIN estimates AS estimate ON estimate.id = row_item.estimate_id
          JOIN projects AS project ON project.id = estimate.project_id
          WHERE project.workspace_id = ? AND (
            row_item.brand_id = ? OR json_extract(row_item.source_snapshot_json, '$.brandId') = ?
          )
        )
      `,
      values: [input.survivor.id, input.survivor.id, input.survivor.name, input.timestamp, input.workspaceId, input.duplicate.id, input.duplicate.id],
    }, {
      sql: `
        UPDATE estimate_template_row_items
        SET source_snapshot = json_set(source_snapshot, '$.brandId', ?, '$.brand', ?), updated_at = ?
        WHERE source_snapshot IS NOT NULL AND id IN (
          SELECT row_item.id FROM estimate_template_row_items AS row_item
          JOIN estimate_templates AS template ON template.id = row_item.template_id
          WHERE template.workspace_id = ? AND json_extract(row_item.source_snapshot, '$.brandId') = ?
        )
      `,
      values: [input.survivor.id, input.survivor.name, input.timestamp, input.workspaceId, input.duplicate.id],
    }, {
      sql: `
        UPDATE cost_library_component_drafts
        SET draft_json = json_set(draft_json, '$.brandId', ?, '$.brand', ?), updated_at = ?
        WHERE workspace_id = ? AND status = 'active' AND json_extract(draft_json, '$.brandId') = ?
      `,
      values: [input.survivor.id, input.survivor.name, input.timestamp, input.workspaceId, input.duplicate.id],
    }] satisfies CatalogueGovernanceStatement[];
  }
  return [{
    sql: `UPDATE cost_library_items SET supplier_id = ?, supplier = ?, updated_at = ? WHERE workspace_id = ? AND supplier_id = ?`,
    values: [input.survivor.id, input.survivor.name, input.timestamp, input.workspaceId, input.duplicate.id],
  }, {
    sql: `UPDATE cost_library_item_price_options SET supplier_id = ?, updated_at = ? WHERE workspace_id = ? AND supplier_id = ?`,
    values: [input.survivor.id, input.timestamp, input.workspaceId, input.duplicate.id],
  }, {
    sql: `
      UPDATE estimate_row_items
      SET supplier_id = ?, supplier = ?,
          source_snapshot_json = json_set(source_snapshot_json, '$.supplierId', ?, '$.supplier', ?),
          row_revision = row_revision + 1, updated_at = ?
      WHERE id IN (
        SELECT row_item.id FROM estimate_row_items AS row_item
        JOIN estimates AS estimate ON estimate.id = row_item.estimate_id
        JOIN projects AS project ON project.id = estimate.project_id
        WHERE project.workspace_id = ? AND (
          row_item.supplier_id = ? OR json_extract(row_item.source_snapshot_json, '$.supplierId') = ?
        )
      )
    `,
    values: [input.survivor.id, input.survivor.name, input.survivor.id, input.survivor.name, input.timestamp, input.workspaceId, input.duplicate.id, input.duplicate.id],
  }, {
    sql: `
      UPDATE estimate_template_row_items
      SET supplier_id = ?, supplier = ?,
          source_snapshot = json_set(source_snapshot, '$.supplierId', ?, '$.supplier', ?), updated_at = ?
      WHERE id IN (
        SELECT row_item.id FROM estimate_template_row_items AS row_item
        JOIN estimate_templates AS template ON template.id = row_item.template_id
        WHERE template.workspace_id = ? AND (
          row_item.supplier_id = ? OR json_extract(row_item.source_snapshot, '$.supplierId') = ?
        )
      )
    `,
    values: [input.survivor.id, input.survivor.name, input.survivor.id, input.survivor.name, input.timestamp, input.workspaceId, input.duplicate.id, input.duplicate.id],
  }, {
    sql: `
      UPDATE cost_library_component_drafts
      SET draft_json = json_set(draft_json, '$.supplierId', ?, '$.supplier', ?), updated_at = ?
      WHERE workspace_id = ? AND status = 'active' AND json_extract(draft_json, '$.supplierId') = ?
    `,
    values: [input.survivor.id, input.survivor.name, input.timestamp, input.workspaceId, input.duplicate.id],
  }] satisfies CatalogueGovernanceStatement[];
}

async function executeMerge(
  database: D1DatabaseLike,
  context: CatalogueMutationContext,
  command: Extract<NormalizedCommand, { kind: "merge" }>,
) {
  const identity = mutationIdentity(context, command);
  const replay = await readReplay(database, identity);
  if (replay) return replay;
  const [survivor, duplicate] = await Promise.all([
    readEntity(database, context.workspaceId, command.entityKind, command.survivorId),
    readEntity(database, context.workspaceId, command.entityKind, command.duplicateId),
  ]);
  const currentSurvivor = requireEntity(survivor);
  const currentDuplicate = requireEntity(duplicate);
  assertRevision(currentSurvivor, command.expectedSurvivorRevision);
  assertRevision(currentDuplicate, command.expectedDuplicateRevision);
  if (currentSurvivor.lifecycleState !== "active") {
    throw new CatalogueGovernanceError("catalogue_governance_conflict", "The merge survivor must be active.", currentSurvivor);
  }
  if (currentDuplicate.lifecycleState === "merged") {
    throw new CatalogueGovernanceError("catalogue_governance_conflict", "The duplicate catalogue identity is already merged.", currentDuplicate);
  }
  const [counts, rewriteImpact] = await Promise.all([
    readMergeRewriteCounts(database, context.workspaceId, command.entityKind, currentDuplicate.id),
    readRewriteImpact(database, context.workspaceId, command.entityKind, currentDuplicate.id),
  ]);
  const timestamp = new Date().toISOString();
  const nextSurvivor = { ...currentSurvivor, revision: currentSurvivor.revision + 1, updatedBy: context.actorUserId, updatedAt: timestamp };
  const nextDuplicate: CatalogueEntity = {
    ...currentDuplicate,
    normalizedName: `merged:${currentDuplicate.id}`,
    lifecycleState: "merged",
    revision: currentDuplicate.revision + 1,
    archivedAt: null,
    archivedBy: null,
    mergedIntoId: currentSurvivor.id,
    updatedBy: context.actorUserId,
    updatedAt: timestamp,
  };
  const result = {
    entity: nextSurvivor,
    mergedEntity: nextDuplicate,
    rewrittenCounts: counts,
    affectedEstimates: rewriteImpact.affectedEstimates,
  };
  const estimateRewriteStatements = buildEstimateRewriteLedgerStatements({
    context,
    command,
    identity,
    estimateRows: rewriteImpact.estimateRows,
    timestamp,
  });
  const templateRewriteStatements = buildTemplateVersionPropagationStatements({
    context,
    command,
    identity,
    templates: rewriteImpact.templates,
    timestamp,
  });
  const statements: CatalogueGovernanceStatement[] = [
    buildEntityGuardStatement({
      workspaceId: context.workspaceId,
      kind: command.entityKind,
      entityId: currentSurvivor.id,
      revision: currentSurvivor.revision,
      lifecycleState: "active",
      guardName: "catalogue_merge_survivor_guard",
    }),
    buildEntityGuardStatement({
      workspaceId: context.workspaceId,
      kind: command.entityKind,
      entityId: currentDuplicate.id,
      revision: currentDuplicate.revision,
      lifecycleState: currentDuplicate.lifecycleState,
      guardName: "catalogue_merge_duplicate_guard",
    }),
    buildMergeCountGuard({
      workspaceId: context.workspaceId,
      kind: command.entityKind,
      duplicateId: currentDuplicate.id,
      counts,
    }),
    ...estimateRewriteStatements.slice(0, 1),
    ...templateRewriteStatements.slice(0, 1),
    ...buildMergeReferenceStatements({
      workspaceId: context.workspaceId,
      kind: command.entityKind,
      survivor: currentSurvivor,
      duplicate: currentDuplicate,
      timestamp,
    }),
    ...estimateRewriteStatements.slice(1),
    ...templateRewriteStatements.slice(1),
    {
      sql: `
        UPDATE ${entityTable(command.entityKind)}
        SET revision = revision + 1, updated_by = ?, updated_at = ?
        WHERE id = ? AND workspace_id = ? AND revision = ? AND lifecycle_state = 'active'
      `,
      values: [context.actorUserId, timestamp, currentSurvivor.id, context.workspaceId, currentSurvivor.revision],
    },
    {
      sql: `
        UPDATE ${entityTable(command.entityKind)}
        SET normalized_name = 'merged:' || id, lifecycle_state = 'merged',
            revision = revision + 1, archived_at = NULL, archived_by = NULL,
            merged_into_id = ?, updated_by = ?, updated_at = ?
        WHERE id = ? AND workspace_id = ? AND revision = ? AND lifecycle_state <> 'merged'
      `,
      values: [currentSurvivor.id, context.actorUserId, timestamp, currentDuplicate.id, context.workspaceId, currentDuplicate.revision],
    },
    buildAuditStatement({ context, command, result, previousEntity: currentDuplicate, timestamp }),
    buildReceiptStatement(identity, result, timestamp),
  ];
  try {
    await runAtomicBatch(database, statements);
  } catch (error) {
    const racedReplay = await readReplay(database, identity);
    if (racedReplay) return racedReplay;
    const [latestSurvivor, latestDuplicate] = await Promise.all([
      readEntity(database, context.workspaceId, command.entityKind, currentSurvivor.id),
      readEntity(database, context.workspaceId, command.entityKind, currentDuplicate.id),
    ]);
    if (latestSurvivor && latestSurvivor.revision !== currentSurvivor.revision) assertRevision(latestSurvivor, currentSurvivor.revision);
    if (latestDuplicate && latestDuplicate.revision !== currentDuplicate.revision) assertRevision(latestDuplicate, currentDuplicate.revision);
    throw error;
  }
  return { ...result, replayed: false };
}

export async function executeCatalogueGovernanceMutationInD1(
  database: D1DatabaseLike,
  context: CatalogueMutationContext,
  rawCommand: CatalogueGovernanceCommand,
): Promise<CatalogueGovernanceMutationResult> {
  const command = normalizeCommand(rawCommand);
  await requireMutationRole(database, context, command.kind === "merge");
  if (command.kind === "create") return executeCreate(database, context, command);
  if (command.kind === "merge") return executeMerge(database, context, command);
  return executeLifecycleMutation(database, context, command);
}
