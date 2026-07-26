import "server-only";

import { createHash, randomUUID } from "node:crypto";

import { computeEstimateRowCostParts } from "@/lib/estimates/estimate-row-total";
import type { D1DatabaseLike } from "@/lib/cloudflare/d1";

import {
  completeOnboardingFlowFromDomainProof,
  getOnboardingFlowState,
  getOnboardingFlowRunBinding,
  hasCurrentTutorialPracticeCompletion,
  isQualifyingChecklistActionFact,
  recordOnboardingDomainEvent,
  type OnboardingChecklistActionFact,
} from "./flow-repository";
import {
  GUIDED_SAMPLE_KIND,
  GUIDED_SAMPLE_PRACTICE_ROW_MATERIAL,
  GUIDED_SAMPLE_VERSION,
} from "./guided-sample";
import { getOnboardingFlowDefinition } from "./flow-catalog";

type PracticeRow = {
  guided_practice_role: string | null;
  quantity: number;
  quantity_base: number | null;
  quantity_contingency_amount: number | null;
  unit_cost: number;
  misc_cost: number;
  contingency_percentage: number;
  adjustment_percentage: number;
  source_library_item_id: string | null;
};

type PracticeProject = {
  tutorial_version: number;
  tutorial_generation: number;
};

type GuidedPracticePredicateRow = {
  binding_current: number;
  transfer_complete: number;
};

function onboardingMutationKey(namespace: string, mutationId: string) {
  const digest = createHash("sha256")
    .update(`${namespace}\0${mutationId}`)
    .digest("hex");
  return `${namespace}:${digest}`;
}

export async function getCurrentGuidedPracticeBindingForEstimate(
  database: D1DatabaseLike,
  input: {
    userId: string;
    workspaceId: string;
    projectId: string;
    estimateId: string;
  },
) {
  const [project, state] = await Promise.all([
    database.prepare<PracticeProject>(`
      SELECT
        CAST(json_extract(project.metadata, '$.tutorial_version') AS INTEGER)
          AS tutorial_version,
        CAST(json_extract(project.metadata, '$.tutorial_generation') AS INTEGER)
          AS tutorial_generation
      FROM projects project
      JOIN estimates estimate ON estimate.project_id = project.id
      WHERE project.id = ? AND project.workspace_id = ? AND project.created_by = ?
        AND project.status <> 'archived' AND estimate.id = ?
        AND json_extract(project.metadata, '$.tutorial_kind') = ?
        AND CAST(json_extract(project.metadata, '$.tutorial_version') AS INTEGER) = ?
      LIMIT 1
    `).bind(
      input.projectId,
      input.workspaceId,
      input.userId,
      input.estimateId,
      GUIDED_SAMPLE_KIND,
      GUIDED_SAMPLE_VERSION,
    ).first<PracticeProject>(),
    getOnboardingFlowState(database, {
      userId: input.userId,
      workspaceId: input.workspaceId,
      flowKey: "guided_estimate_practice",
    }),
  ]);
  if (
    !project
    || !state?.tutorialBinding
    || state.tutorialBinding.version !== project.tutorial_version
    || state.tutorialBinding.generation !== project.tutorial_generation
  ) {
    return null;
  }
  return {
    tutorialVersion: project.tutorial_version,
    tutorialGeneration: project.tutorial_generation,
  };
}

export async function readGuidedPracticePredicates(
  database: D1DatabaseLike,
  input: {
    userId: string;
    workspaceId: string;
  },
) {
  try {
    const state = await getOnboardingFlowState(database, {
      userId: input.userId,
      workspaceId: input.workspaceId,
      flowKey: "guided_estimate_practice",
    });
    if (!state?.tutorialBinding) {
      return {
        tutorialBindingCurrent: false,
        tutorialCoreIncomplete: false,
        nonStarterTransferIncomplete: false,
      };
    }
    const [row, coreComplete] = await Promise.all([
      database.prepare<GuidedPracticePredicateRow>(`
        SELECT
          EXISTS (
            SELECT 1
            FROM projects project
            JOIN estimates estimate ON estimate.project_id = project.id
            JOIN estimate_nodes area
              ON area.estimate_id = estimate.id AND area.kind = 'area'
            WHERE project.workspace_id = ?
              AND project.created_by = ?
              AND project.status <> 'archived'
              AND json_extract(project.metadata, '$.tutorial_kind') = ?
              AND CAST(json_extract(project.metadata, '$.tutorial_version') AS INTEGER) = ?
              AND CAST(json_extract(project.metadata, '$.tutorial_generation') AS INTEGER) = ?
              AND EXISTS (
                SELECT 1
                FROM estimate_row_items practice_row
                WHERE practice_row.estimate_id = estimate.id
                  AND practice_row.material = ?
                  AND json_extract(
                    practice_row.metadata_json,
                    '$.expressComponent.kind'
                  ) = 'express'
                  AND json_extract(
                    practice_row.metadata_json,
                    '$.guidedPracticeRole'
                  ) = 'price_and_save'
              )
          ) AS binding_current,
          EXISTS (
            SELECT 1
            FROM beta_onboarding_flow_events event
            WHERE event.user_id = ?
              AND event.workspace_id = ?
              AND event.flow_key = 'guided_estimate_practice'
              AND event.flow_version = ?
              AND event.generation = ?
              AND event.tutorial_version = ?
              AND event.tutorial_generation = ?
              AND event.source = 'non_starter_domain'
              AND event.event_type = 'independent_transfer_observed'
          ) AS transfer_complete
      `).bind(
        input.workspaceId,
        input.userId,
        GUIDED_SAMPLE_KIND,
        state.tutorialBinding.version,
        state.tutorialBinding.generation,
        GUIDED_SAMPLE_PRACTICE_ROW_MATERIAL,
        input.userId,
        input.workspaceId,
        state.flowVersion,
        state.generation,
        state.tutorialBinding.version,
        state.tutorialBinding.generation,
      ).first<GuidedPracticePredicateRow>(),
      hasCurrentTutorialPracticeCompletion(database, input),
    ]);
    const tutorialBindingCurrent = row?.binding_current === 1;
    return {
      tutorialBindingCurrent,
      tutorialCoreIncomplete: tutorialBindingCurrent && !coreComplete,
      nonStarterTransferIncomplete:
        tutorialBindingCurrent && row?.transfer_complete !== 1,
    };
  } catch {
    return {
      tutorialBindingCurrent: false,
      tutorialCoreIncomplete: false,
      nonStarterTransferIncomplete: false,
    };
  }
}

export type EstimatePracticeMutation =
  | {
      kind: "quantity_changed" | "unit_cost_changed";
      mutationId: string;
      userId: string;
      workspaceId: string;
      projectId: string;
      estimateId: string;
      rowId: string;
      previousQuantity: number;
      previousUnitCost: number;
      previousTotal: number;
    }
  | {
      kind: "row_created" | "component_inserted";
      mutationId: string;
      userId: string;
      workspaceId: string;
      projectId: string;
      estimateId: string;
      rowId: string;
    };

function rowTotal(row: PracticeRow) {
  const result = computeEstimateRowCostParts({
    quantity: row.quantity,
    quantity_base: row.quantity_base,
    quantity_contingency_amount: row.quantity_contingency_amount,
    unit_cost: row.unit_cost,
    misc_cost: row.misc_cost,
    contingency_percentage: row.contingency_percentage,
    adjustment_percentage: row.adjustment_percentage,
    currency_code: "PHP",
  });
  return result.ok ? result.value.total : null;
}

async function readPracticeProject(
  database: D1DatabaseLike,
  input: EstimatePracticeMutation,
) {
  return database.prepare<PracticeProject>(`
    SELECT
      CAST(json_extract(project.metadata, '$.tutorial_version') AS INTEGER)
        AS tutorial_version,
      CAST(json_extract(project.metadata, '$.tutorial_generation') AS INTEGER)
        AS tutorial_generation
    FROM projects project
    JOIN estimates estimate ON estimate.project_id = project.id
    WHERE project.id = ? AND project.workspace_id = ? AND project.created_by = ?
      AND project.status <> 'archived' AND estimate.id = ?
      AND json_extract(project.metadata, '$.tutorial_kind') = ?
      AND CAST(json_extract(project.metadata, '$.tutorial_version') AS INTEGER) = ?
    LIMIT 1
  `).bind(
    input.projectId,
    input.workspaceId,
    input.userId,
    input.estimateId,
    GUIDED_SAMPLE_KIND,
    GUIDED_SAMPLE_VERSION,
  ).first<PracticeProject>();
}

async function readPracticeRow(
  database: D1DatabaseLike,
  input: EstimatePracticeMutation,
) {
  return database.prepare<PracticeRow>(`
    SELECT
      json_extract(metadata_json, '$.guidedPracticeRole')
        AS guided_practice_role,
      quantity, quantity_base, quantity_contingency_amount, unit_cost,
      misc_cost, contingency_percentage, adjustment_percentage,
      source_library_item_id
    FROM estimate_row_items
    WHERE id = ? AND estimate_id = ?
    LIMIT 1
  `).bind(input.rowId, input.estimateId).first<PracticeRow>();
}

function hasAuthoritativePracticeEquivalent(
  input: EstimatePracticeMutation,
  row: PracticeRow,
) {
  if (input.kind === "quantity_changed" || input.kind === "unit_cost_changed") {
    const currentTotal = rowTotal(row);
    const changedInput = input.kind === "quantity_changed"
      ? row.quantity !== input.previousQuantity
      : row.unit_cost !== input.previousUnitCost;
    return changedInput && currentTotal !== null && currentTotal !== input.previousTotal;
  }
  return input.kind !== "component_inserted" || Boolean(row.source_library_item_id);
}

async function recordIndependentTransferIfEligible(
  database: D1DatabaseLike,
  input: EstimatePracticeMutation,
  row: PracticeRow,
  binding: NonNullable<Awaited<ReturnType<typeof getOnboardingFlowRunBinding>>>,
) {
  if (!hasAuthoritativePracticeEquivalent(input, row)) return "ignored" as const;
  const project = await database.prepare<{ id: string }>(`
    SELECT project.id
    FROM projects project
    JOIN estimates estimate ON estimate.project_id = project.id
    WHERE project.id = ? AND project.workspace_id = ?
      AND project.status <> 'archived' AND estimate.id = ?
      AND json_extract(project.metadata, '$.tutorial_kind') IS NULL
      AND json_extract(project.metadata, '$.tutorial_version') IS NULL
      AND json_extract(project.metadata, '$.tutorial_generation') IS NULL
      AND json_extract(project.metadata, '$.activation_sample') IS NULL
      AND json_extract(project.metadata, '$.activation_sample_version') IS NULL
      AND json_extract(project.metadata, '$.starterLabel') IS NULL
      AND json_extract(project.metadata, '$.starter_label') IS NULL
      AND NOT EXISTS (
        SELECT 1
        FROM beta_starter_asset_claims claim
        WHERE claim.workspace_id = project.workspace_id
          AND claim.asset_kind = 'project'
          AND claim.resource_id = project.id
      )
    LIMIT 1
  `).bind(
    input.projectId,
    input.workspaceId,
    input.estimateId,
  ).first<{ id: string }>();
  if (!project || !await hasCurrentTutorialPracticeCompletion(database, input)) {
    return "ignored" as const;
  }
  const result = await recordCurrentPracticeEvent(database, {
    binding,
    eventType: "independent_transfer_observed",
    idempotencyKey: `${onboardingMutationKey("independent-transfer", input.mutationId)}:${input.kind}`,
    source: "non_starter_domain",
    stepKey: null,
  });
  return result;
}

async function recordCurrentPracticeEvent(
  database: D1DatabaseLike,
  input: {
    binding: NonNullable<Awaited<ReturnType<typeof getOnboardingFlowRunBinding>>>;
    eventType: "independent_transfer_observed" | "practice_action_completed";
    idempotencyKey: string;
    source: "non_starter_domain" | "tutorial_practice";
    stepKey: "practice_price_and_save" | "practice_add_and_source" | null;
  },
): Promise<"recorded" | "ignored"> {
  const occurredAt = new Date().toISOString();
  const result = await database.prepare(`
    INSERT INTO beta_onboarding_flow_events (
      id, user_id, workspace_id, flow_key, flow_version, generation,
      tutorial_version, tutorial_generation, run_id, launch_mode, step_key,
      event_type, source, idempotency_key, state_revision, occurred_at, ingested_at
    )
    SELECT
      ?, user_id, workspace_id, flow_key, flow_version, generation,
      tutorial_version, tutorial_generation, ?, 'system', ?, ?, ?, ?,
      revision, ?, ?
    FROM beta_onboarding_flow_states
    WHERE user_id = ?
      AND workspace_id = ?
      AND flow_key = 'guided_estimate_practice'
      AND flow_version = ?
      AND generation = ?
      AND revision = ?
      AND tutorial_version = ?
      AND tutorial_generation = ?
    ON CONFLICT(user_id, workspace_id, idempotency_key) DO NOTHING
  `).bind(
    randomUUID(),
    input.binding.runId,
    input.stepKey,
    input.eventType,
    input.source,
    input.idempotencyKey,
    occurredAt,
    occurredAt,
    input.binding.state.userId,
    input.binding.state.workspaceId,
    input.binding.state.flowVersion,
    input.binding.state.generation,
    input.binding.state.revision,
    input.binding.state.tutorialBinding?.version ?? null,
    input.binding.state.tutorialBinding?.generation ?? null,
  ).run();
  if (result.success === false) return "ignored";
  return (result.meta?.changes ?? 0) === 1 ? "recorded" : "ignored";
}

export async function recordEstimatePracticeMutation(
  database: D1DatabaseLike,
  input: EstimatePracticeMutation,
): Promise<"recorded" | "ignored"> {
  try {
    const [project, row, binding] = await Promise.all([
      readPracticeProject(database, input),
      readPracticeRow(database, input),
      getOnboardingFlowRunBinding(database, {
        userId: input.userId,
        workspaceId: input.workspaceId,
        flowKey: "guided_estimate_practice",
        flowVersion: getOnboardingFlowDefinition("guided_estimate_practice").version,
      }),
    ]);
    if (!row) return "ignored";
    if (!binding) return "ignored";
    if (!project) {
      return recordIndependentTransferIfEligible(database, input, row, binding);
    }
    if (
      !binding.state.tutorialBinding
      || binding.state.tutorialBinding.version !== project.tutorial_version
      || binding.state.tutorialBinding.generation !== project.tutorial_generation
    ) {
      return "ignored";
    }

    let stepKey: "practice_price_and_save" | "practice_add_and_source";
    if (input.kind === "quantity_changed" || input.kind === "unit_cost_changed") {
      if (row.guided_practice_role !== "price_and_save") return "ignored";
      if (!hasAuthoritativePracticeEquivalent(input, row)) return "ignored";
      stepKey = "practice_price_and_save";
    } else {
      if (input.kind === "component_inserted" && !row.source_library_item_id) {
        return "ignored";
      }
      stepKey = "practice_add_and_source";
    }

    const eventStatus = await recordCurrentPracticeEvent(database, {
      binding,
      eventType: "practice_action_completed",
      idempotencyKey: `practice:${project.tutorial_version}:${project.tutorial_generation}:${onboardingMutationKey("mutation", input.mutationId)}:${stepKey}`,
      source: "tutorial_practice",
      stepKey,
    });
    if (await hasCurrentTutorialPracticeCompletion(database, input)) {
      try {
        await completeOnboardingFlowFromDomainProof(database, {
          userId: input.userId,
          workspaceId: input.workspaceId,
          flowKey: "guided_estimate_practice",
          expectedRevision: binding.state.revision,
          runId: binding.runId,
          mutationId: `guided-complete:${project.tutorial_version}:${project.tutorial_generation}`,
          source: "tutorial_practice",
          stepKey,
          routeKey: "estimate_sheet",
          proofSatisfied: true,
        });
      } catch {
        return eventStatus;
      }
    }
    return eventStatus;
  } catch {
    return "ignored";
  }
}

export async function recordOnboardingChecklistActionFact(
  database: D1DatabaseLike,
  input: {
    family: OnboardingChecklistActionFact["family"];
    mutationId: string;
    userId: string;
    workspaceId: string;
    authoritativeWriteSucceeded: boolean;
    authoritativeReadbackConfirmed: boolean;
    staleOrRolledBack?: boolean;
  },
): Promise<OnboardingChecklistActionFact | null> {
  const fact: OnboardingChecklistActionFact = {
    family: input.family,
    originClass: "user_domain",
    authoritativeWriteSucceeded: input.authoritativeWriteSucceeded,
    authoritativeReadbackConfirmed: input.authoritativeReadbackConfirmed,
    staleOrRolledBack: input.staleOrRolledBack ?? false,
  };
  if (!isQualifyingChecklistActionFact(fact)) return null;
  const projectFamily = fact.family.startsWith("project_");
  try {
    await recordOnboardingDomainEvent(database, {
      userId: input.userId,
      workspaceId: input.workspaceId,
      flowKey: projectFamily ? "core_orientation" : "first_estimate_value",
      eventType: "step_completed",
      source: "non_starter_domain",
      idempotencyKey: `${onboardingMutationKey("checklist", input.mutationId)}:${fact.family}`,
      stepKey: projectFamily ? "projects_entry" : "hierarchy",
    });
  } catch {
    return fact;
  }
  return fact;
}
