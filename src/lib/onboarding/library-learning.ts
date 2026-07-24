import "server-only";

import { createHash } from "node:crypto";

import type { D1DatabaseLike } from "@/lib/cloudflare/d1";

import {
  completeOnboardingFlowFromDomainProof,
  getOnboardingFlowRunBinding,
  getOnboardingFlowState,
  recordOnboardingDomainEvent,
} from "./flow-repository";
import { getOnboardingFlowDefinition } from "./flow-catalog";

export type LibraryLearningMutation =
  | {
      kind: "component_inserted";
      mutationId: string;
      userId: string;
      workspaceId: string;
      estimateId: string;
      rowId: string;
      sourceComponentId: string;
    }
  | {
      kind: "component_duplicated";
      mutationId: string;
      userId: string;
      workspaceId: string;
      componentId: string;
      sourceComponentId: string;
    }
  | {
      kind: "component_updated";
      mutationId: string;
      userId: string;
      workspaceId: string;
      componentId: string;
      previousVersionNumber: number;
      resultingVersionNumber: number;
      resultingUpdatedAt: string;
    }
  | {
      kind: "template_duplicated";
      mutationId: string;
      userId: string;
      workspaceId: string;
      templateId: string;
      sourceTemplateId: string;
    }
  | {
      kind: "template_inserted";
      mutationId: string;
      userId: string;
      workspaceId: string;
      templateId: string;
      estimateId: string;
      insertedRootNodeId: string;
      instanceId?: string;
    };

export type LibraryLearningPredicates = {
  libraryContentAvailable: boolean;
  libraryReuseComplete: boolean;
  libraryReuseIncomplete: boolean;
  templateCapstoneComplete: boolean;
};

type ExistsRow = {
  matches: number;
};

function libraryMutationKey(input: LibraryLearningMutation) {
  const digest = createHash("sha256")
    .update(JSON.stringify([
      "library-learning",
      1,
      input.kind,
      input.userId,
      input.workspaceId,
      input.mutationId,
    ]))
    .digest("hex");
  return `library-learning:v1:${digest}`;
}

async function hasAuthoritativeComponentInsert(
  database: D1DatabaseLike,
  input: Extract<LibraryLearningMutation, { kind: "component_inserted" }>,
) {
  const row = await database.prepare<ExistsRow>(`
    SELECT EXISTS (
      SELECT 1
      FROM estimate_row_items row_item
      JOIN estimates estimate ON estimate.id = row_item.estimate_id
      JOIN projects project ON project.id = estimate.project_id
      JOIN cost_library_items component
        ON component.id = row_item.source_library_item_id
       AND component.workspace_id = project.workspace_id
      WHERE row_item.id = ?
        AND row_item.estimate_id = ?
        AND row_item.source_library_item_id = ?
        AND project.workspace_id = ?
        AND project.status <> 'archived'
        AND component.lifecycle_state <> 'archived'
    ) AS matches
  `).bind(
    input.rowId,
    input.estimateId,
    input.sourceComponentId,
    input.workspaceId,
  ).first<ExistsRow>();
  return row?.matches === 1;
}

async function hasAuthoritativeComponentDuplicate(
  database: D1DatabaseLike,
  input: Extract<LibraryLearningMutation, { kind: "component_duplicated" }>,
) {
  const row = await database.prepare<ExistsRow>(`
    SELECT EXISTS (
      SELECT 1
      FROM cost_library_items duplicate
      JOIN cost_library_items source
        ON source.id = ?
       AND source.workspace_id = duplicate.workspace_id
      WHERE duplicate.id = ?
        AND duplicate.workspace_id = ?
        AND duplicate.created_by = ?
        AND duplicate.lifecycle_state <> 'archived'
        AND source.lifecycle_state <> 'archived'
        AND json_extract(duplicate.metadata_json, '$.duplicatedFrom') = source.id
    ) AS matches
  `).bind(
    input.sourceComponentId,
    input.componentId,
    input.workspaceId,
    input.userId,
  ).first<ExistsRow>();
  return row?.matches === 1;
}

async function hasAuthoritativeComponentUpdate(
  database: D1DatabaseLike,
  input: Extract<LibraryLearningMutation, { kind: "component_updated" }>,
) {
  if (input.resultingVersionNumber <= input.previousVersionNumber) return false;
  const row = await database.prepare<ExistsRow>(`
    SELECT EXISTS (
      SELECT 1
      FROM cost_library_items
      WHERE id = ?
        AND workspace_id = ?
        AND lifecycle_state <> 'archived'
        AND current_version_number = ?
        AND updated_at = ?
    ) AS matches
  `).bind(
    input.componentId,
    input.workspaceId,
    input.resultingVersionNumber,
    input.resultingUpdatedAt,
  ).first<ExistsRow>();
  return row?.matches === 1;
}

async function hasAuthoritativeTemplateDuplicate(
  database: D1DatabaseLike,
  input: Extract<LibraryLearningMutation, { kind: "template_duplicated" }>,
) {
  const row = await database.prepare<ExistsRow>(`
    SELECT EXISTS (
      SELECT 1
      FROM estimate_templates duplicate
      JOIN estimate_templates source
        ON source.id = ?
       AND source.workspace_id = duplicate.workspace_id
      WHERE duplicate.id = ?
        AND duplicate.workspace_id = ?
        AND duplicate.created_by = ?
        AND duplicate.archived_at IS NULL
        AND source.archived_at IS NULL
        AND json_extract(duplicate.metadata, '$.duplicatedFrom') = source.id
        AND EXISTS (
          SELECT 1
          FROM estimate_template_nodes node
          WHERE node.template_id = duplicate.id
        )
    ) AS matches
  `).bind(
    input.sourceTemplateId,
    input.templateId,
    input.workspaceId,
    input.userId,
  ).first<ExistsRow>();
  return row?.matches === 1;
}

async function hasAuthoritativeTemplateInsert(
  database: D1DatabaseLike,
  input: Extract<LibraryLearningMutation, { kind: "template_inserted" }>,
) {
  const row = await database.prepare<ExistsRow>(`
    SELECT (
      EXISTS (
        SELECT 1
        FROM estimate_templates template
        WHERE template.id = ?
          AND template.workspace_id = ?
          AND template.archived_at IS NULL
          AND EXISTS (
            SELECT 1
            FROM estimate_template_nodes template_node
            WHERE template_node.template_id = template.id
          )
      )
      AND EXISTS (
        SELECT 1
        FROM estimate_nodes node
        JOIN estimates estimate ON estimate.id = node.estimate_id
        JOIN projects project ON project.id = estimate.project_id
        WHERE node.id = ?
          AND node.estimate_id = ?
          AND project.workspace_id = ?
          AND project.status <> 'archived'
      )
      AND (
        ? IS NULL
        OR EXISTS (
          SELECT 1
          FROM estimate_template_instances instance
          WHERE instance.id = ?
            AND instance.template_id = ?
            AND instance.estimate_id = ?
            AND instance.workspace_id = ?
            AND instance.created_by = ?
        )
      )
    ) AS matches
  `).bind(
    input.templateId,
    input.workspaceId,
    input.insertedRootNodeId,
    input.estimateId,
    input.workspaceId,
    input.instanceId ?? null,
    input.instanceId ?? null,
    input.templateId,
    input.estimateId,
    input.workspaceId,
    input.userId,
  ).first<ExistsRow>();
  return row?.matches === 1;
}

async function hasAuthoritativeMutation(
  database: D1DatabaseLike,
  input: LibraryLearningMutation,
) {
  if (input.kind === "component_inserted") {
    return hasAuthoritativeComponentInsert(database, input);
  }
  if (input.kind === "component_duplicated") {
    return hasAuthoritativeComponentDuplicate(database, input);
  }
  if (input.kind === "component_updated") {
    return hasAuthoritativeComponentUpdate(database, input);
  }
  if (input.kind === "template_duplicated") {
    return hasAuthoritativeTemplateDuplicate(database, input);
  }
  return hasAuthoritativeTemplateInsert(database, input);
}

export async function recordLibraryLearningMutation(
  database: D1DatabaseLike,
  input: LibraryLearningMutation,
): Promise<"recorded" | "ignored"> {
  try {
    if (!await hasAuthoritativeMutation(database, input)) return "ignored";
    const definition = getOnboardingFlowDefinition("library_reuse");
    const binding = await getOnboardingFlowRunBinding(database, {
      userId: input.userId,
      workspaceId: input.workspaceId,
      flowKey: "library_reuse",
      flowVersion: definition.version,
    });
    if (!binding || binding.state.status !== "in_progress") return "ignored";
    const templateMutation = input.kind === "template_duplicated"
      || input.kind === "template_inserted";
    const result = await recordOnboardingDomainEvent(database, {
      userId: input.userId,
      workspaceId: input.workspaceId,
      flowKey: "library_reuse",
      eventType: "practice_action_completed",
      source: "non_starter_domain",
      idempotencyKey: libraryMutationKey(input),
      runId: binding.runId,
      stepKey: templateMutation ? "library_templates" : "library_sources",
    });
    if (result.status === "binding_mismatch") return "ignored";
    const predicates = await readLibraryLearningPredicates(database, input);
    if (!predicates.libraryReuseComplete) return "recorded";
    await completeOnboardingFlowFromDomainProof(database, {
      userId: input.userId,
      workspaceId: input.workspaceId,
      flowKey: "library_reuse",
      expectedRevision: binding.state.revision,
      runId: binding.runId,
      mutationId: `${libraryMutationKey(input)}:complete`,
      source: "non_starter_domain",
      stepKey: templateMutation ? "library_templates" : "library_sources",
      proofSatisfied: predicates.libraryReuseComplete,
      routeKey: input.kind === "component_inserted"
        ? "estimate_sheet"
        : templateMutation
          ? "library_templates"
          : "library_components",
    });
    return "recorded";
  } catch {
    return "ignored";
  }
}

export async function readLibraryLearningPredicates(
  database: D1DatabaseLike,
  input: {
    userId: string;
    workspaceId: string;
  },
): Promise<LibraryLearningPredicates> {
  try {
    const state = await getOnboardingFlowState(database, {
      userId: input.userId,
      workspaceId: input.workspaceId,
      flowKey: "library_reuse",
    });
    const [content, evidence] = await Promise.all([
      database.prepare<ExistsRow>(`
        SELECT (
          EXISTS (
            SELECT 1
            FROM cost_library_items
            WHERE workspace_id = ?
              AND lifecycle_state <> 'archived'
          )
          OR EXISTS (
            SELECT 1
            FROM estimate_templates template
            WHERE template.workspace_id = ?
              AND template.archived_at IS NULL
              AND EXISTS (
                SELECT 1
                FROM estimate_template_nodes node
                WHERE node.template_id = template.id
              )
          )
        ) AS matches
      `).bind(input.workspaceId, input.workspaceId).first<ExistsRow>(),
      state
        ? database.prepare<{ component_complete: number; template_complete: number }>(`
            SELECT
              EXISTS (
                SELECT 1
                FROM beta_onboarding_flow_events
                WHERE user_id = ?
                  AND workspace_id = ?
                  AND flow_key = 'library_reuse'
                  AND flow_version = ?
                  AND generation = ?
                  AND event_type = 'practice_action_completed'
                  AND source = 'non_starter_domain'
                  AND step_key = 'library_sources'
              ) AS component_complete,
              EXISTS (
                SELECT 1
                FROM beta_onboarding_flow_events
                WHERE user_id = ?
                  AND workspace_id = ?
                  AND flow_key = 'library_reuse'
                  AND flow_version = ?
                  AND generation = ?
                  AND event_type = 'practice_action_completed'
                  AND source = 'non_starter_domain'
                  AND step_key = 'library_templates'
              ) AS template_complete
          `).bind(
            input.userId,
            input.workspaceId,
            state.flowVersion,
            state.generation,
            input.userId,
            input.workspaceId,
            state.flowVersion,
            state.generation,
          ).first<{ component_complete: number; template_complete: number }>()
        : Promise.resolve(null),
    ]);
    const libraryContentAvailable = content?.matches === 1;
    const libraryReuseComplete = evidence?.component_complete === 1;
    return {
      libraryContentAvailable,
      libraryReuseComplete,
      libraryReuseIncomplete: libraryContentAvailable && !libraryReuseComplete,
      templateCapstoneComplete: evidence?.template_complete === 1,
    };
  } catch {
    return {
      libraryContentAvailable: false,
      libraryReuseComplete: false,
      libraryReuseIncomplete: false,
      templateCapstoneComplete: false,
    };
  }
}
