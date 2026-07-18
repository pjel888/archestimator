import "server-only";

import type { EstimateTemplateMutationImpact } from "./template-link-impact-d1";
import type { TemplateMutationIdentity, TemplateMutationStatement } from "./template-mutations";

type LinkedTemplateMutationHeader = {
  id: string;
  workspace_id: string;
  current_version_number: number;
  updated_at: string;
};

export function buildLinkedTemplateMutationStatements(input: {
  template: LinkedTemplateMutationHeader;
  impact: EstimateTemplateMutationImpact;
  identity: TemplateMutationIdentity;
  actorUserId: string;
  action: string;
  timestamp: string;
  result: object;
}) {
  const nextVersionNumber = input.template.current_version_number + 1;
  return [
    {
      sql: `SELECT CASE WHEN EXISTS (
        SELECT 1 FROM estimate_templates
        WHERE id = ? AND workspace_id = ? AND archived_at IS NULL
          AND current_version_number = ? AND updated_at = ?
      ) AND COALESCE((
        SELECT group_concat(signature, '|')
        FROM (
          SELECT instance.id || ':' || instance.project_id || ':' || instance.estimate_id || ':' ||
                 instance.applied_version_number || ':' || instance.target_version_number || ':' ||
                 instance.link_state || ':' || instance.updated_at AS signature
          FROM estimate_template_instances AS instance
          WHERE instance.workspace_id = ?
            AND instance.template_id = ?
            AND instance.link_state IN ('linked', 'updating', 'failed')
          ORDER BY instance.id ASC
        )
      ), '') = ? AND EXISTS (
        SELECT 1 FROM estimate_template_mutation_intents
        WHERE intent_id = ? AND workspace_id = ? AND template_id = ?
          AND state = 'pending' AND execution_lease_token = ?
          AND execution_lease_expires_at > ?
      ) THEN 1 ELSE json('') END AS linked_template_mutation_guard`,
      values: [
        input.template.id,
        input.template.workspace_id,
        input.template.current_version_number,
        input.template.updated_at,
        input.template.workspace_id,
        input.template.id,
        input.impact.activeInstanceSignature,
        input.identity.intentId,
        input.template.workspace_id,
        input.template.id,
        input.identity.executionLeaseToken,
        input.timestamp,
      ],
    },
    {
      sql: `INSERT INTO estimate_template_versions (
        template_id, version_number, workspace_id, snapshot_json, source_fingerprint,
        change_kind, change_summary_json, created_by, created_at
      )
      SELECT template.id, ?, template.workspace_id,
        json_object(
          'schemaVersion', 1,
          'template', json_object(
            'id', template.id,
            'name', template.name,
            'description', template.description,
            'category', template.category
          ),
          'nodes', json(COALESCE((
            SELECT json_group_array(json(ordered_nodes.node_json))
            FROM (
              SELECT json_object(
                'id', node.id,
                'parentId', node.parent_id,
                'kind', node.kind,
                'name', node.name,
                'sortOrder', node.sort_order,
                'metadata', json(node.metadata)
              ) AS node_json
              FROM estimate_template_nodes AS node
              WHERE node.template_id = template.id
              ORDER BY node.sort_order ASC, node.id ASC
            ) AS ordered_nodes
          ), '[]')),
          'rows', json(COALESCE((
            SELECT json_group_array(json(ordered_rows.row_json))
            FROM (
              SELECT CASE
                WHEN row.source_library_item_id IS NOT NULL
                  AND row.link_state NOT IN ('unlinked', 'detached')
                THEN json_object(
                  'id', row.id,
                  'rowKind', 'component',
                  'templateNodeId', row.template_node_id,
                  'sortOrder', row.sort_order,
                  'sourceLibraryItemId', row.source_library_item_id,
                  'selectedVariantId', json_extract(row.source_snapshot, '$.priceOptionId'),
                  'initialTakeoffDefaults', json_object(
                    'quantity', row.quantity,
                    'contingencyPercentage', row.contingency_percentage,
                    'adjustmentPercentage', row.adjustment_percentage
                  )
                )
                ELSE json_patch(
                  json_object(
                    'id', row.id,
                    'rowKind', 'custom',
                    'templateNodeId', row.template_node_id,
                    'sortOrder', row.sort_order,
                    'material', row.material,
                    'description', row.description,
                    'supplier', row.supplier,
                    'supplierId', row.supplier_id,
                    'unit', row.unit,
                    'unitCost', row.unit_cost,
                    'miscCost', row.misc_cost,
                    'categoryNodeId', row.category_node_id,
                    'discipline', row.discipline,
                    'designation', row.designation
                  ),
                  json_object(
                    'sourceSnapshot', CASE
                      WHEN row.source_snapshot IS NOT NULL AND json_valid(row.source_snapshot)
                      THEN json(row.source_snapshot)
                      ELSE json('{}')
                    END,
                    'metadata', json(row.metadata),
                    'initialTakeoffDefaults', json_object(
                      'quantity', row.quantity,
                      'contingencyPercentage', row.contingency_percentage,
                      'adjustmentPercentage', row.adjustment_percentage
                    )
                  )
                )
              END AS row_json
              FROM estimate_template_row_items AS row
              WHERE row.template_id = template.id
              ORDER BY row.sort_order ASC, row.id ASC
            ) AS ordered_rows
          ), '[]'))
        ),
        ?, ?, json_object(
          'summary', ?,
          'activeInstanceCount', ?,
          'affectedProjectCount', ?,
          'affectedEstimateCount', ?
        ), ?, ?
      FROM estimate_templates AS template
      WHERE template.id = ? AND template.workspace_id = ?
        AND template.current_version_number = ? AND template.archived_at IS NULL`,
      values: [
        nextVersionNumber,
        input.identity.requestFingerprint,
        input.action,
        `Template ${input.action.replaceAll("_", " ")}`,
        input.impact.activeInstanceCount,
        input.impact.affectedProjectCount,
        input.impact.affectedEstimateCount,
        input.actorUserId,
        input.timestamp,
        input.template.id,
        input.template.workspace_id,
        input.template.current_version_number,
      ],
    },
    {
      sql: `UPDATE estimate_templates
        SET current_version_number = ?, updated_at = ?
        WHERE id = ? AND workspace_id = ?
          AND current_version_number = ? AND updated_at = ?`,
      values: [
        nextVersionNumber,
        input.timestamp,
        input.template.id,
        input.template.workspace_id,
        input.template.current_version_number,
        input.template.updated_at,
      ],
    },
    {
      sql: `UPDATE estimate_template_instances
        SET target_version_number = ?, link_state = 'updating',
            last_error_code = NULL, updated_at = ?
        WHERE workspace_id = ? AND template_id = ?
          AND link_state IN ('linked', 'updating', 'failed')`,
      values: [nextVersionNumber, input.timestamp, input.template.workspace_id, input.template.id],
    },
    {
      sql: `INSERT INTO estimate_template_propagation_jobs (
        instance_id, workspace_id, template_id, target_version_number, state,
        attempt_count, available_at, created_at, updated_at
      )
      SELECT instance.id, instance.workspace_id, instance.template_id, ?, 'pending',
             0, ?, ?, ?
      FROM estimate_template_instances AS instance
      WHERE instance.workspace_id = ? AND instance.template_id = ?
        AND instance.link_state IN ('linked', 'updating', 'failed')
      ON CONFLICT(instance_id) DO UPDATE SET
        target_version_number = MAX(target_version_number, excluded.target_version_number),
        state = 'pending',
        attempt_count = 0,
        available_at = excluded.available_at,
        lease_token = NULL,
        lease_expires_at = NULL,
        last_error_code = NULL,
        failure_class = NULL,
        retryable = NULL,
        completed_at = NULL,
        updated_at = excluded.updated_at`,
      values: [
        nextVersionNumber,
        input.timestamp,
        input.timestamp,
        input.timestamp,
        input.template.workspace_id,
        input.template.id,
      ],
    },
    {
      sql: `UPDATE estimate_template_mutation_intents
        SET state = 'committed', committed_version_number = ?, result_json = ?,
            execution_lease_token = NULL, execution_lease_expires_at = NULL,
            updated_at = ?, resolved_at = ?
        WHERE intent_id = ? AND workspace_id = ? AND template_id = ?
          AND state = 'pending' AND execution_lease_token = ?`,
      values: [
        nextVersionNumber,
        JSON.stringify(input.result),
        input.timestamp,
        input.timestamp,
        input.identity.intentId,
        input.template.workspace_id,
        input.template.id,
        input.identity.executionLeaseToken,
      ],
    },
  ] satisfies TemplateMutationStatement[];
}
