"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { requireCurrentUserContext } from "@/lib/auth/session";
import { isWorkspaceEditorInD1 } from "@/lib/authz/d1-access";
import { getCloudflareD1Database, type D1DatabaseLike, type D1Value } from "@/lib/cloudflare/d1";
import { createMutationRequestFingerprint } from "@/lib/estimates/mutation-receipts";
import { isUuid } from "@/lib/ids";
import { ensureDefaultWorkspace } from "@/lib/repositories/workspace-repository";
import { readEstimateTemplateMutationImpact } from "./template-link-impact-d1";
import { runTemplateAtomicBatch, type TemplateMutationStatement } from "./template-mutations";

type TemplateLifecycleRow = {
  id: string;
  name: string;
  current_version_number: number | string;
  updated_at: string;
  archived_at: string | null;
};

async function requireDatabase() {
  const database = await getCloudflareD1Database();
  if (!database?.batch) throw new Error("Something went wrong. Try again in a moment.");
  return database;
}

async function first<T>(database: D1DatabaseLike, sql: string, values: D1Value[]) {
  return database.prepare<T>(sql).bind(...values).first<T>();
}

async function requireLifecycleAuthorization() {
  const [{ workspace }, currentUser, database] = await Promise.all([
    ensureDefaultWorkspace(),
    requireCurrentUserContext(),
    requireDatabase(),
  ]);
  if (!await isWorkspaceEditorInD1(database, workspace.id, currentUser)) {
    throw new Error("Only workspace editors/admins can manage Estimate Templates.");
  }
  return { database, workspace, currentUser };
}

async function readLifecycleTemplate(database: D1DatabaseLike, workspaceId: string, templateId: string) {
  if (!isUuid(templateId)) throw new Error("Template not found in the current workspace.");
  const template = await first<TemplateLifecycleRow>(
    database,
    `SELECT id, name, current_version_number, updated_at, archived_at
     FROM estimate_templates WHERE id = ? AND workspace_id = ? LIMIT 1`,
    [templateId, workspaceId],
  );
  if (!template) throw new Error("Template not found in the current workspace.");
  return template;
}

async function requireLifecycleContext(templateId: string) {
  const { database, workspace, currentUser } = await requireLifecycleAuthorization();
  const template = await readLifecycleTemplate(database, workspace.id, templateId);
  return { database, workspace, currentUser, template };
}

export async function previewPermanentDeleteEstimateTemplate(input: { templateId: string }) {
  const { database, workspace, template } = await requireLifecycleContext(input.templateId);
  if (!template.archived_at) throw new Error("Archive this Template before permanently deleting it.");
  return readEstimateTemplateMutationImpact(database, workspace.id, template.id, { allowArchived: true });
}

export async function permanentlyDeleteEstimateTemplate(input: {
  intentId: string;
  templateId: string;
  typedName: string;
  expectedVersionNumber: number;
  impactFingerprint: string;
}) {
  if (!isUuid(input.intentId)) throw new Error("Template delete intent is invalid.");
  if (!isUuid(input.templateId)) throw new Error("Template not found in the current workspace.");
  const { database, workspace, currentUser } = await requireLifecycleAuthorization();
  const existing = await first<{ state: string; request_fingerprint: string; result_json: string | null }>(
    database,
    `SELECT state, request_fingerprint, result_json
     FROM estimate_template_mutation_intents
     WHERE intent_id = ? AND workspace_id = ? AND template_id = ? LIMIT 1`,
    [input.intentId, workspace.id, input.templateId],
  );
  const normalizedRequest = {
    commandKind: "template.permanent_delete",
    templateId: input.templateId,
    typedName: input.typedName,
    expectedVersionNumber: input.expectedVersionNumber,
    impactFingerprint: input.impactFingerprint,
  };
  const requestFingerprint = createMutationRequestFingerprint(normalizedRequest);
  if (existing?.state === "committed" && existing.request_fingerprint === requestFingerprint && existing.result_json) {
    return JSON.parse(existing.result_json) as { templateId: string; detachedInstanceCount: number };
  }
  const template = await readLifecycleTemplate(database, workspace.id, input.templateId);
  if (input.typedName !== template.name) throw new Error("Type the exact Template name to permanently delete it.");
  if (!template.archived_at) throw new Error("Archive this Template before permanently deleting it.");
  const impact = await readEstimateTemplateMutationImpact(database, workspace.id, template.id, { allowArchived: true });
  if (
    impact.currentVersionNumber !== input.expectedVersionNumber
    || impact.fingerprint !== input.impactFingerprint
  ) {
    const error = new Error("Template deletion impact changed. Review the latest linked instances and confirm again.") as Error & { impact?: typeof impact };
    error.impact = impact;
    throw error;
  }
  const activeInstances = await database.prepare<{ id: string }>(
    `SELECT id FROM estimate_template_instances
     WHERE workspace_id = ? AND template_id = ?
       AND link_state IN ('linked', 'updating', 'failed')
     ORDER BY id ASC`,
  ).bind(workspace.id, template.id).all<{ id: string }>();
  if (activeInstances.success === false) throw new Error("Could not verify linked Template instances.");
  const activeInstanceIds = (activeInstances.results ?? []).map((row) => row.id);
  const timestamp = new Date().toISOString();
  const leaseToken = randomUUID();
  const retained = await database.prepare(`
    INSERT INTO estimate_template_mutation_intents (
      intent_id, workspace_id, template_id, created_by, request_fingerprint,
      normalized_payload_json, expected_version_number, impact_fingerprint,
      state, execution_lease_token, execution_lease_expires_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)
    ON CONFLICT(intent_id) DO UPDATE SET
      execution_lease_token = excluded.execution_lease_token,
      execution_lease_expires_at = excluded.execution_lease_expires_at,
      updated_at = excluded.updated_at
    WHERE estimate_template_mutation_intents.workspace_id = excluded.workspace_id
      AND estimate_template_mutation_intents.template_id = excluded.template_id
      AND estimate_template_mutation_intents.created_by = excluded.created_by
      AND estimate_template_mutation_intents.request_fingerprint = excluded.request_fingerprint
      AND estimate_template_mutation_intents.expected_version_number = excluded.expected_version_number
      AND estimate_template_mutation_intents.impact_fingerprint = excluded.impact_fingerprint
      AND estimate_template_mutation_intents.state = 'pending'
      AND estimate_template_mutation_intents.execution_lease_expires_at <= excluded.updated_at
  `).bind(
    input.intentId,
    workspace.id,
    template.id,
    currentUser.userId,
    requestFingerprint,
    JSON.stringify(normalizedRequest),
    impact.currentVersionNumber,
    impact.fingerprint,
    leaseToken,
    new Date(Date.now() + 120_000).toISOString(),
    timestamp,
    timestamp,
  ).run();
  if (retained.success === false) throw new Error("Could not retain the permanent-delete intent.");
  const retainedIntent = await first<{
    request_fingerprint: string;
    state: string;
    execution_lease_token: string | null;
  }>(
    database,
    `SELECT request_fingerprint, state, execution_lease_token FROM estimate_template_mutation_intents
     WHERE intent_id = ? AND workspace_id = ? AND template_id = ? LIMIT 1`,
    [input.intentId, workspace.id, template.id],
  );
  if (
    !retainedIntent
    || retainedIntent.request_fingerprint !== requestFingerprint
    || retainedIntent.state !== "pending"
    || retainedIntent.execution_lease_token !== leaseToken
  ) {
    throw new Error("This permanent-delete intent conflicts with or is already running for an earlier request.");
  }
  const instanceIdsJson = JSON.stringify(activeInstanceIds);
  const detachedInstanceCount = activeInstanceIds.length;
  const result = { templateId: template.id, detachedInstanceCount };
  const eventPrefix = `template-permanent-delete:${input.intentId}:`;
  const statements: TemplateMutationStatement[] = [
    {
      sql: `SELECT CASE WHEN EXISTS (
        SELECT 1 FROM estimate_templates
        WHERE id = ? AND workspace_id = ? AND name = ? AND archived_at IS NOT NULL
          AND current_version_number = ? AND updated_at = ?
      ) AND (
        SELECT COUNT(*) FROM estimate_template_instances
        WHERE workspace_id = ? AND template_id = ?
          AND link_state IN ('linked', 'updating', 'failed')
      ) = ? AND NOT EXISTS (
        SELECT 1 FROM estimate_template_instances
        WHERE workspace_id = ? AND template_id = ?
          AND link_state IN ('linked', 'updating', 'failed')
          AND id NOT IN (SELECT value FROM json_each(?))
      ) AND EXISTS (
        SELECT 1 FROM estimate_template_mutation_intents
        WHERE intent_id = ? AND workspace_id = ? AND template_id = ?
          AND state = 'pending' AND execution_lease_token = ?
          AND execution_lease_expires_at > ?
      ) THEN 1 ELSE json('') END AS template_permanent_delete_guard`,
      values: [
        template.id, workspace.id, template.name, impact.currentVersionNumber, template.updated_at,
        workspace.id, template.id, detachedInstanceCount,
        workspace.id, template.id, instanceIdsJson,
        input.intentId, workspace.id, template.id, leaseToken, timestamp,
      ],
    },
    {
      sql: `UPDATE estimate_template_instances AS instance
            SET detached_root_ids_json = COALESCE((
              SELECT json_group_array(mapping.estimate_node_id)
              FROM estimate_template_instance_nodes AS mapping
              INNER JOIN estimate_nodes AS node
                ON node.id = mapping.estimate_node_id AND node.estimate_id = mapping.estimate_id
              WHERE mapping.instance_id = instance.id
                AND node.parent_id IS instance.target_parent_node_id
              ORDER BY node.sort_order ASC, mapping.template_node_id ASC
            ), '[]')
            WHERE instance.workspace_id = ? AND instance.template_id = ?
              AND instance.link_state IN ('linked', 'updating', 'failed')`,
      values: [workspace.id, template.id],
    },
    {
      sql: `INSERT INTO estimate_sheet_events (
              id, estimate_id, workspace_id, project_id, estimate_node_id, estimate_tab_id,
              target_row_id, event_type, event_source, correlation_id, actor_user_id,
              changed_fields, row_context, old_snapshot, new_snapshot, payload,
              metadata, total_delta, created_at
            )
            SELECT lower(hex(randomblob(16))), instance.estimate_id, instance.workspace_id,
                   instance.project_id, instance.target_parent_node_id, instance.estimate_tab_id,
                   NULL, 'linked_template_master_deleted', 'server_action',
                   ? || instance.id, ?, '[]', '{}', NULL, NULL,
                   json_object('instanceId', instance.id, 'templateId', instance.template_id,
                     'templateName', ?, 'appliedVersionNumber', instance.applied_version_number,
                     'abandonedTargetVersionNumber', instance.target_version_number),
                   '{}', NULL, ?
            FROM estimate_template_instances AS instance
            WHERE instance.workspace_id = ? AND instance.template_id = ?
              AND instance.link_state IN ('linked', 'updating', 'failed')`,
      values: [eventPrefix, currentUser.userId, template.name, timestamp, workspace.id, template.id],
    },
    {
      sql: `INSERT INTO activity_event_outbox (
              id, workspace_id, event_id, status, attempt_count,
              available_at, created_at, updated_at
            )
            SELECT lower(hex(randomblob(16))), workspace_id, id, 'pending', 0, ?, ?, ?
            FROM estimate_sheet_events
            WHERE workspace_id = ? AND correlation_id LIKE ? || '%'`,
      values: [timestamp, timestamp, timestamp, workspace.id, eventPrefix],
    },
    { sql: "DELETE FROM estimate_template_propagation_jobs WHERE workspace_id = ? AND template_id = ?", values: [workspace.id, template.id] },
    {
      sql: `DELETE FROM estimate_template_instance_rows
            WHERE workspace_id = ? AND instance_id IN (
              SELECT value FROM json_each(?)
            )`,
      values: [workspace.id, instanceIdsJson],
    },
    {
      sql: `DELETE FROM estimate_template_instance_nodes
            WHERE workspace_id = ? AND instance_id IN (
              SELECT value FROM json_each(?)
            )`,
      values: [workspace.id, instanceIdsJson],
    },
    {
      sql: `UPDATE estimate_template_instances
            SET template_id = NULL, link_state = 'detached', last_error_code = NULL,
                detached_at = ?, detached_by = ?, updated_at = ?
            WHERE workspace_id = ? AND template_id = ?
              AND link_state IN ('linked', 'updating', 'failed')`,
      values: [timestamp, currentUser.userId, timestamp, workspace.id, template.id],
    },
    {
      sql: `UPDATE estimate_template_mutation_intents
            SET state = 'committed', execution_lease_token = NULL,
                execution_lease_expires_at = NULL, committed_version_number = ?,
                result_json = ?, updated_at = ?, resolved_at = ?
            WHERE intent_id = ? AND workspace_id = ? AND template_id = ?
              AND state = 'pending' AND request_fingerprint = ?
              AND execution_lease_token = ?`,
      values: [impact.currentVersionNumber, JSON.stringify(result), timestamp, timestamp, input.intentId, workspace.id, template.id, requestFingerprint, leaseToken],
    },
    {
      sql: `DELETE FROM estimate_templates
            WHERE id = ? AND workspace_id = ? AND archived_at IS NOT NULL
              AND current_version_number = ? AND updated_at = ?`,
      values: [template.id, workspace.id, impact.currentVersionNumber, template.updated_at],
    },
  ];
  await runTemplateAtomicBatch(database, statements);
  revalidatePath("/workshop/library");
  revalidatePath("/workshop/library/templates");
  return result;
}
