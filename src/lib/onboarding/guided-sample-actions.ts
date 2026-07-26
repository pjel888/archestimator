import "server-only";

import { randomUUID } from "node:crypto";

import {
  getCloudflareD1Database,
  type D1DatabaseLike,
  type D1PreparedStatementLike,
  type D1Value,
} from "@/lib/cloudflare/d1";

import { prepareTutorialSeedActivationOutboxIntent } from "./activation-outbox";
import { issueTutorialSeedActivationCapability } from "./activation-origin";
import { resolveCurrentOnboardingActor } from "./flow-actions";
import { getOnboardingFlowState } from "./flow-repository";
import {
  GUIDED_ESTIMATE_BLUEPRINT,
  GUIDED_SAMPLE_KIND,
  GUIDED_SAMPLE_PROJECT_NAME,
  GUIDED_SAMPLE_VERSION,
} from "./guided-sample";
import { installStarterPackForEligibleWorkspace } from "./starter-pack-actions";
import {
  createStarterRowMetadata,
  STARTER_PACK_VERSION,
} from "./starter-pack";

type PracticeContext = {
  database: D1DatabaseLike;
  workspaceId: string;
  userId: string;
  groupId: string | null;
};

type PracticeIdentityRow = {
  project_id: string;
  estimate_id: string;
  area_id: string;
  tutorial_generation: number;
};

type PracticeProjectRow = {
  project_id: string;
};

type PracticeEditableRow = {
  id: string;
  node_id: string;
  material: string;
  description: string;
};

const tutorialActivationCapability = issueTutorialSeedActivationCapability();
const GUIDED_FLOW_VERSION = 1;
const GUIDED_FIRST_STEP = "practice_workspace";

function nowIso() {
  return new Date().toISOString();
}

async function first<T>(
  database: D1DatabaseLike,
  sql: string,
  values: D1Value[] = [],
) {
  return database.prepare<T>(sql).bind(...values).first<T>();
}

async function run(database: D1DatabaseLike, sql: string, values: D1Value[] = []) {
  const result = await database.prepare(sql).bind(...values).run();
  if (result.success === false) throw new Error("Guided practice could not be persisted.");
  return result;
}

async function runCheckedBatch(
  database: D1DatabaseLike,
  statements: D1PreparedStatementLike[],
) {
  if (!database.batch) throw new Error("Guided practice requires D1 batch support.");
  const results = await database.batch(statements);
  if (results.length !== statements.length || results.some((result) => result.success === false)) {
    throw new Error("The guided-practice batch did not commit.");
  }
}

async function requirePracticeContext(database: D1DatabaseLike): Promise<PracticeContext> {
  const actor = await resolveCurrentOnboardingActor(database);
  if (
    actor.accessSource !== "workspace"
    || actor.workspaceRole === "viewer"
    || !actor.workspaceRole
  ) {
    throw new Error("Guided practice requires permission to create and edit workspace Projects.");
  }
  await installStarterPackForEligibleWorkspace(database, {
    workspaceId: actor.workspaceId,
    userId: actor.userId,
  });
  const groupClaim = await first<{ resource_id: string }>(
    database,
    `
      SELECT resource_id
      FROM beta_starter_asset_claims
      WHERE workspace_id = ? AND pack_version = ?
        AND scope_kind = 'user' AND scope_owner_id = ?
        AND asset_key = 'group.starter_examples'
        AND asset_kind = 'project_group' AND lifecycle_state = 'active'
      LIMIT 1
    `,
    [actor.workspaceId, STARTER_PACK_VERSION, actor.userId],
  );
  return {
    database,
    workspaceId: actor.workspaceId,
    userId: actor.userId,
    groupId: groupClaim?.resource_id ?? null,
  };
}

async function archiveLegacyV1Practice(context: PracticeContext) {
  const timestamp = nowIso();
  await run(
    context.database,
    `
      UPDATE projects
      SET status = 'archived', updated_at = ?
      WHERE workspace_id = ? AND created_by = ? AND status <> 'archived'
        AND (
          CAST(json_extract(metadata, '$.activation_sample_version') AS INTEGER) = 1
          OR (
            json_extract(metadata, '$.activation_sample') = 1
            AND json_extract(metadata, '$.tutorial_kind') IS NULL
          )
        )
    `,
    [timestamp, context.workspaceId, context.userId],
  );
}

async function resolvePracticeProjectName(context: PracticeContext) {
  const collision = await first<{ present: number }>(
    context.database,
    `
      SELECT 1 AS present
      FROM projects
      WHERE workspace_id = ? AND name = ? AND status <> 'archived'
      LIMIT 1
    `,
    [context.workspaceId, GUIDED_SAMPLE_PROJECT_NAME],
  );
  return collision ? `${GUIDED_SAMPLE_PROJECT_NAME} · Practice` : GUIDED_SAMPLE_PROJECT_NAME;
}

async function readActivePractice(
  context: PracticeContext,
): Promise<PracticeIdentityRow | null> {
  return first<PracticeIdentityRow>(
    context.database,
    `
      SELECT
        project.id AS project_id,
        estimate.id AS estimate_id,
        area.id AS area_id,
        CAST(json_extract(project.metadata, '$.tutorial_generation') AS INTEGER)
          AS tutorial_generation
      FROM projects project
      JOIN estimates estimate ON estimate.project_id = project.id
      JOIN estimate_nodes area
        ON area.estimate_id = estimate.id AND area.kind = 'area'
      WHERE project.workspace_id = ? AND project.created_by = ?
        AND project.status <> 'archived'
        AND json_extract(project.metadata, '$.tutorial_kind') = ?
        AND CAST(json_extract(project.metadata, '$.tutorial_version') AS INTEGER) = ?
      ORDER BY area.sort_order ASC, area.id ASC
      LIMIT 1
    `,
    [context.workspaceId, context.userId, GUIDED_SAMPLE_KIND, GUIDED_SAMPLE_VERSION],
  );
}

async function readActivePracticeProject(
  context: PracticeContext,
  input: { tutorialVersion: number; tutorialGeneration: number },
): Promise<PracticeProjectRow | null> {
  return first<PracticeProjectRow>(
    context.database,
    `
      SELECT id AS project_id
      FROM projects
      WHERE workspace_id = ? AND created_by = ? AND status <> 'archived'
        AND json_extract(metadata, '$.tutorial_kind') = ?
        AND CAST(json_extract(metadata, '$.tutorial_version') AS INTEGER) = ?
        AND CAST(json_extract(metadata, '$.tutorial_generation') AS INTEGER) = ?
      ORDER BY updated_at DESC, id ASC
      LIMIT 1
    `,
    [
      context.workspaceId,
      context.userId,
      GUIDED_SAMPLE_KIND,
      input.tutorialVersion,
      input.tutorialGeneration,
    ],
  );
}

function preparePracticeGraph(
  context: PracticeContext,
  input: {
    tutorialGeneration: number;
    projectId: string;
    projectName: string;
    timestamp: string;
    requirePreviousChange: boolean;
  },
) {
  const estimateId = randomUUID();
  const tabId = randomUUID();
  const nodeIds = new Map(
    GUIDED_ESTIMATE_BLUEPRINT.nodes.map((node) => [node.key, randomUUID()]),
  );
  const condition = input.requirePreviousChange ? " WHERE changes() = 1" : "";
  const statements: D1PreparedStatementLike[] = [
    context.database.prepare(`
      INSERT INTO projects (
        id, workspace_id, name, project_code, created_by, client_name, location,
        currency_code, metadata, status, created_at, updated_at
      )
      SELECT ?, ?, ?, 'PRACTICE', ?, NULL, NULL, 'PHP', ?, 'ongoing', ?, ?
      ${condition}
    `).bind(
      input.projectId,
      context.workspaceId,
      input.projectName,
      context.userId,
      JSON.stringify({
        tutorial_kind: GUIDED_SAMPLE_KIND,
        tutorial_version: GUIDED_SAMPLE_VERSION,
        tutorial_generation: input.tutorialGeneration,
      }),
      input.timestamp,
      input.timestamp,
    ),
    context.database.prepare(`
      INSERT INTO estimates (
        id, project_id, name, created_by, created_at, updated_at,
        sheet_code, notes, currency_code, metadata
      )
      SELECT ?, ?, ?, ?, ?, ?, ?, NULL, 'PHP', '{}'
      WHERE changes() = 1
    `).bind(
      estimateId,
      input.projectId,
      GUIDED_ESTIMATE_BLUEPRINT.name,
      context.userId,
      input.timestamp,
      input.timestamp,
      GUIDED_ESTIMATE_BLUEPRINT.sheetCode,
    ),
    context.database.prepare(`
      INSERT INTO estimate_tabs (
        id, estimate_id, name, sort_order, is_default, archived_at,
        created_at, updated_at, metadata, created_by
      )
      SELECT ?, ?, ?, 0, 1, NULL, ?, ?, '{}', ?
      WHERE changes() = 1
    `).bind(
      tabId,
      estimateId,
      GUIDED_ESTIMATE_BLUEPRINT.tabName,
      input.timestamp,
      input.timestamp,
      context.userId,
    ),
  ];

  GUIDED_ESTIMATE_BLUEPRINT.nodes.forEach((node, nodeIndex) => {
    const nodeId = nodeIds.get(node.key);
    if (!nodeId) throw new Error("Guided-practice node identity is unavailable.");
    statements.push(context.database.prepare(`
      INSERT INTO estimate_nodes (
        id, estimate_id, estimate_tab_id, name, kind, parent_id, sort_order,
        created_at, updated_at, metadata_json
      )
      SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, '{}'
      WHERE changes() = 1
    `).bind(
      nodeId,
      estimateId,
      tabId,
      node.name,
      node.kind,
      node.parentKey ? nodeIds.get(node.parentKey) ?? null : null,
      nodeIndex,
      input.timestamp,
      input.timestamp,
    ));
    node.rows.forEach((row, rowIndex) => {
      const rowId = randomUUID();
      const rowMetadata = createStarterRowMetadata(row, {
        createdAt: input.timestamp,
        estimateId,
        nodeId,
        origin: "guided_practice",
        projectId: input.projectId,
        rowId,
      });
      statements.push(context.database.prepare(`
        INSERT INTO estimate_row_items (
          id, estimate_id, node_id, description, designation, discipline,
          material, quantity, quantity_base, quantity_contingency_amount,
          unit, unit_cost, misc_cost, contingency_percentage,
          adjustment_percentage, source_snapshot_json, sort_order,
          created_at, updated_at, row_revision, source_library_item_id,
          link_state, metadata_json, supplier, pricing_provenance_origin
        )
        SELECT
          ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?, 0, 0, '{}', ?,
          ?, ?, 1, NULL, 'unlinked', ?, '', 'recorded'
        WHERE changes() = 1
      `).bind(
        rowId,
        estimateId,
        nodeId,
        row.description,
        row.designation,
        row.discipline,
        row.material,
        row.quantity,
        row.unit,
        row.unitCost,
        row.miscCost ?? 0,
        rowIndex,
        input.timestamp,
        input.timestamp,
        JSON.stringify(rowMetadata),
      ));
    });
  });

  if (context.groupId) {
    statements.push(
      context.database.prepare(`
        INSERT INTO project_group_memberships (
          id, group_id, workspace_id, user_id, project_id, position,
          created_at, updated_at
        )
        SELECT ?, ?, ?, ?, ?, COALESCE((
          SELECT MAX(position) + 1
          FROM project_group_memberships
          WHERE workspace_id = ? AND user_id = ? AND group_id = ?
        ), 0), ?, ?
        WHERE changes() = 1
      `).bind(
        randomUUID(),
        context.groupId,
        context.workspaceId,
        context.userId,
        input.projectId,
        context.workspaceId,
        context.userId,
        context.groupId,
        input.timestamp,
        input.timestamp,
      ),
    );
  }

  const firstAreaId = GUIDED_ESTIMATE_BLUEPRINT.nodes
    .filter((node) => node.kind === "area")
    .map((node) => nodeIds.get(node.key))
    .find((id) => id !== undefined);
  if (!firstAreaId) throw new Error("Guided practice requires an Area.");
  return { statements, estimateId, firstAreaId };
}

async function repairPracticeRowMetadata(
  context: PracticeContext,
  practice: PracticeIdentityRow,
) {
  const result = await context.database.prepare<PracticeEditableRow>(`
    SELECT row.id, row.node_id, row.material, row.description
    FROM estimate_row_items row
    WHERE row.estimate_id = ?
  `).bind(practice.estimate_id).all<PracticeEditableRow>();
  const definitions = GUIDED_ESTIMATE_BLUEPRINT.nodes.flatMap(
    (node) => node.rows.filter((row) => row.source !== "worked"),
  );
  const timestamp = nowIso();
  const statements = definitions.flatMap((definition) => {
    const row = (result.results ?? []).find(
      (candidate) =>
        candidate.material === definition.material
        && candidate.description === definition.description,
    );
    if (!row) return [];
    return [
      context.database.prepare(`
        UPDATE estimate_row_items
        SET metadata_json = ?, updated_at = ?
        WHERE id = ? AND estimate_id = ?
          AND (
            COALESCE(
              json_extract(metadata_json, '$.expressComponent.kind'),
              ''
            ) <> 'express'
            ${definition.source === "practice"
              ? `OR COALESCE(
                  json_extract(metadata_json, '$.guidedPracticeRole'),
                  ''
                ) <> 'price_and_save'`
              : ""}
          )
      `).bind(
        JSON.stringify(createStarterRowMetadata(definition, {
          createdAt: timestamp,
          estimateId: practice.estimate_id,
          nodeId: row.node_id,
          origin: "guided_practice",
          projectId: practice.project_id,
          rowId: row.id,
        })),
        timestamp,
        row.id,
        practice.estimate_id,
      ),
    ];
  });
  if (statements.length > 0) {
    await runCheckedBatch(context.database, statements);
  }
}

function preparePracticeActivationStatements(
  context: PracticeContext,
  input: {
    projectId: string;
    estimateId: string;
    timestamp: string;
  },
) {
  return [
    prepareTutorialSeedActivationOutboxIntent(context.database, tutorialActivationCapability, {
      domainMutationId: input.projectId,
      userId: context.userId,
      workspaceId: context.workspaceId,
      projectId: input.projectId,
      milestone: "project_created",
      source: "project",
      occurredAt: input.timestamp,
      dedupeKey: `${context.workspaceId}:${input.projectId}:project_created`,
    }, input.timestamp),
    prepareTutorialSeedActivationOutboxIntent(context.database, tutorialActivationCapability, {
      domainMutationId: input.estimateId,
      userId: context.userId,
      workspaceId: context.workspaceId,
      projectId: input.projectId,
      estimateId: input.estimateId,
      milestone: "first_area_created",
      source: "estimate",
      occurredAt: input.timestamp,
      dedupeKey: `${context.workspaceId}:${input.estimateId}:first_area_created`,
    }, input.timestamp),
    prepareTutorialSeedActivationOutboxIntent(context.database, tutorialActivationCapability, {
      domainMutationId: input.estimateId,
      userId: context.userId,
      workspaceId: context.workspaceId,
      projectId: input.projectId,
      estimateId: input.estimateId,
      milestone: "first_row_priced",
      source: "estimate",
      occurredAt: input.timestamp,
      dedupeKey: `${context.workspaceId}:${input.estimateId}:first_row_priced`,
    }, input.timestamp),
    prepareTutorialSeedActivationOutboxIntent(context.database, tutorialActivationCapability, {
      domainMutationId: input.estimateId,
      userId: context.userId,
      workspaceId: context.workspaceId,
      projectId: input.projectId,
      estimateId: input.estimateId,
      milestone: "first_valid_total",
      source: "estimate",
      occurredAt: input.timestamp,
      dedupeKey: `${context.workspaceId}:${input.estimateId}:first_valid_total`,
    }, input.timestamp),
  ];
}

function preparePracticeEvent(
  context: PracticeContext,
  input: {
    eventType: "sample_generated" | "sample_archived" | "sample_fresh_copy_created";
    tutorialGeneration: number;
    stateRevision: number;
    idempotencyKey: string;
    timestamp: string;
  },
) {
  return context.database.prepare(`
    INSERT INTO beta_onboarding_flow_events (
      id, user_id, workspace_id, flow_key, flow_version, generation,
      tutorial_version, tutorial_generation, run_id, launch_mode, step_key,
      event_type, source, idempotency_key, state_revision, occurred_at, ingested_at
    )
    SELECT
      ?, user_id, workspace_id, flow_key, flow_version, generation,
      tutorial_version, tutorial_generation, ?, 'system', current_step_key,
      ?, 'tutorial_seed', ?, revision, ?, ?
    FROM beta_onboarding_flow_states
    WHERE user_id = ? AND workspace_id = ?
      AND flow_key = 'guided_estimate_practice' AND flow_version = ?
      AND tutorial_version = ? AND tutorial_generation = ? AND revision = ?
    ON CONFLICT(user_id, workspace_id, idempotency_key) DO NOTHING
  `).bind(
    randomUUID(),
    randomUUID(),
    input.eventType,
    input.idempotencyKey,
    input.timestamp,
    input.timestamp,
    context.userId,
    context.workspaceId,
    GUIDED_FLOW_VERSION,
    GUIDED_SAMPLE_VERSION,
    input.tutorialGeneration,
    input.stateRevision,
  );
}

async function assertPracticeGraph(
  context: PracticeContext,
  tutorialGeneration: number,
) {
  const row = await readActivePractice(context);
  if (!row || row.tutorial_generation !== tutorialGeneration) {
    throw new Error("The guided-practice graph was not created completely.");
  }
  return row;
}

async function createInitialPractice(context: PracticeContext) {
  const tutorialGeneration = 1;
  const projectId = randomUUID();
  const timestamp = nowIso();
  const projectName = await resolvePracticeProjectName(context);
  const graph = preparePracticeGraph(context, {
    tutorialGeneration,
    projectId,
    projectName,
    timestamp,
    requirePreviousChange: true,
  });
  const statements: D1PreparedStatementLike[] = [
    context.database.prepare(`
      INSERT INTO beta_onboarding_flow_states (
        user_id, workspace_id, flow_key, flow_version, generation,
        tutorial_version, tutorial_generation, status, current_step_key,
        revision, reset_count, started_at, created_at, updated_at
      )
      VALUES (
        ?, ?, 'guided_estimate_practice', ?, 1, ?, ?, 'in_progress', ?,
        0, 0, ?, ?, ?
      )
      ON CONFLICT(user_id, workspace_id, flow_key, flow_version) DO NOTHING
    `).bind(
      context.userId,
      context.workspaceId,
      GUIDED_FLOW_VERSION,
      GUIDED_SAMPLE_VERSION,
      tutorialGeneration,
      GUIDED_FIRST_STEP,
      timestamp,
      timestamp,
      timestamp,
    ),
    ...graph.statements,
    ...preparePracticeActivationStatements(context, {
      projectId,
      estimateId: graph.estimateId,
      timestamp,
    }),
    preparePracticeEvent(context, {
      eventType: "sample_generated",
      tutorialGeneration,
      stateRevision: 0,
      idempotencyKey: `guided-sample:${GUIDED_SAMPLE_VERSION}:${tutorialGeneration}:generated`,
      timestamp,
    }),
    context.database.prepare(`
      INSERT INTO beta_activation_progress (
        user_id, workspace_id, selected_path, created_at, updated_at
      )
      VALUES (?, ?, 'guided_sample', ?, ?)
      ON CONFLICT(user_id, workspace_id) DO UPDATE SET
        selected_path = 'guided_sample',
        version = beta_activation_progress.version + 1,
        updated_at = excluded.updated_at
    `).bind(context.userId, context.workspaceId, timestamp, timestamp),
  ];
  try {
    await runCheckedBatch(context.database, statements);
  } catch (error) {
    const winner = await readActivePractice(context);
    const state = await getOnboardingFlowState(context.database, {
      userId: context.userId,
      workspaceId: context.workspaceId,
      flowKey: "guided_estimate_practice",
    });
    if (
      winner
      && state?.tutorialBinding?.version === GUIDED_SAMPLE_VERSION
      && state.tutorialBinding.generation === winner.tutorial_generation
    ) {
      return winner;
    }
    throw error;
  }
  return assertPracticeGraph(context, tutorialGeneration);
}

async function createNextGuidedPracticeCopy(
  context: PracticeContext,
  input: {
    expectedRevision: number;
    expectedTutorialVersion: number;
    expectedTutorialGeneration: number;
  },
) {
  const state = await getOnboardingFlowState(context.database, {
    userId: context.userId,
    workspaceId: context.workspaceId,
    flowKey: "guided_estimate_practice",
  });
  const bindingChanged = state?.tutorialBinding?.version !== input.expectedTutorialVersion
    || state?.tutorialBinding?.generation !== input.expectedTutorialGeneration;
  if (
    !state
    || state.revision !== input.expectedRevision
    || bindingChanged
  ) {
    const winner = await readActivePractice(context);
    if (
      winner
      && bindingChanged
      && state?.tutorialBinding?.version === GUIDED_SAMPLE_VERSION
      && state.tutorialBinding.generation === winner.tutorial_generation
    ) {
      return winner;
    }
    throw new Error("Guided-practice recovery state changed. Reload and try again.");
  }
  const currentProject = await readActivePracticeProject(context, {
    tutorialVersion: input.expectedTutorialVersion,
    tutorialGeneration: input.expectedTutorialGeneration,
  });
  const tutorialGeneration = input.expectedTutorialVersion === GUIDED_SAMPLE_VERSION
    ? input.expectedTutorialGeneration + 1
    : 1;
  const projectId = randomUUID();
  const timestamp = nowIso();
  const projectName = await resolvePracticeProjectName(context);
  const graph = preparePracticeGraph(context, {
    tutorialGeneration,
    projectId,
    projectName,
    timestamp,
    requirePreviousChange: true,
  });
  const statements: D1PreparedStatementLike[] = [
    context.database.prepare(`
      UPDATE beta_onboarding_flow_states
      SET tutorial_version = ?,
          tutorial_generation = ?,
          status = 'in_progress',
          current_step_key = ?,
          generation = generation + 1,
          revision = revision + 1,
          completed_at = NULL,
          dismissed_at = NULL,
          updated_at = ?
      WHERE user_id = ? AND workspace_id = ?
        AND flow_key = 'guided_estimate_practice' AND flow_version = ?
        AND revision = ? AND tutorial_version = ? AND tutorial_generation = ?
        AND (
          SELECT COUNT(*)
          FROM projects project
          WHERE project.workspace_id = ?
            AND project.created_by = ?
            AND project.status <> 'archived'
            AND json_extract(project.metadata, '$.tutorial_kind') = ?
            AND CAST(json_extract(project.metadata, '$.tutorial_version') AS INTEGER) = ?
            AND CAST(json_extract(project.metadata, '$.tutorial_generation') AS INTEGER) = ?
        ) <= 1
    `).bind(
      GUIDED_SAMPLE_VERSION,
      tutorialGeneration,
      GUIDED_FIRST_STEP,
      timestamp,
      context.userId,
      context.workspaceId,
      GUIDED_FLOW_VERSION,
      input.expectedRevision,
      input.expectedTutorialVersion,
      input.expectedTutorialGeneration,
      context.workspaceId,
      context.userId,
      GUIDED_SAMPLE_KIND,
      input.expectedTutorialVersion,
      input.expectedTutorialGeneration,
    ),
    ...(currentProject ? [context.database.prepare(`
      UPDATE projects
      SET status = 'archived', updated_at = ?
      WHERE id = ? AND workspace_id = ? AND created_by = ?
        AND status <> 'archived'
        AND json_extract(metadata, '$.tutorial_kind') = ?
        AND CAST(json_extract(metadata, '$.tutorial_version') AS INTEGER) = ?
        AND CAST(json_extract(metadata, '$.tutorial_generation') AS INTEGER) = ?
        AND changes() = 1
    `).bind(
      timestamp,
      currentProject.project_id,
      context.workspaceId,
      context.userId,
      GUIDED_SAMPLE_KIND,
      input.expectedTutorialVersion,
      input.expectedTutorialGeneration,
    )] : []),
    ...graph.statements,
    ...preparePracticeActivationStatements(context, {
      projectId,
      estimateId: graph.estimateId,
      timestamp,
    }),
    ...(currentProject ? [preparePracticeEvent(context, {
      eventType: "sample_archived",
      tutorialGeneration,
      stateRevision: input.expectedRevision + 1,
      idempotencyKey: `guided-sample:${GUIDED_SAMPLE_VERSION}:${tutorialGeneration}:archived`,
      timestamp,
    })] : []),
    preparePracticeEvent(context, {
      eventType: "sample_fresh_copy_created",
      tutorialGeneration,
      stateRevision: input.expectedRevision + 1,
      idempotencyKey: `guided-sample:${GUIDED_SAMPLE_VERSION}:${tutorialGeneration}:fresh`,
      timestamp,
    }),
    context.database.prepare(`
      SELECT CASE WHEN EXISTS (
        SELECT 1
        FROM projects
        WHERE id = ? AND workspace_id = ? AND status <> 'archived'
          AND CAST(json_extract(metadata, '$.tutorial_generation') AS INTEGER) = ?
      ) THEN 1 ELSE json('') END AS guided_practice_fresh_copy_guard
    `).bind(projectId, context.workspaceId, tutorialGeneration),
  ];
  try {
    await runCheckedBatch(context.database, statements);
  } catch (error) {
    const winner = await readActivePractice(context);
    if (
      winner
      && (
        input.expectedTutorialVersion !== GUIDED_SAMPLE_VERSION
        || winner.tutorial_generation !== input.expectedTutorialGeneration
      )
    ) {
      return winner;
    }
    throw error;
  }
  return assertPracticeGraph(context, tutorialGeneration);
}

export async function startGuidedPractice() {
  "use server";
  const database = await getCloudflareD1Database();
  if (!database) throw new Error("Guided practice requires the workspace database.");
  const context = await requirePracticeContext(database);
  await archiveLegacyV1Practice(context);
  const [existing, state] = await Promise.all([
    readActivePractice(context),
    getOnboardingFlowState(database, {
      userId: context.userId,
      workspaceId: context.workspaceId,
      flowKey: "guided_estimate_practice",
    }),
  ]);
  if (
    existing
    && state?.tutorialBinding?.version === GUIDED_SAMPLE_VERSION
    && state.tutorialBinding.generation === existing.tutorial_generation
  ) {
    await repairPracticeRowMetadata(context, existing);
    return {
      projectId: existing.project_id,
      estimateId: existing.estimate_id,
      areaId: existing.area_id,
      tutorialVersion: GUIDED_SAMPLE_VERSION,
      tutorialGeneration: existing.tutorial_generation,
      resumed: true,
    };
  }
  if (state?.tutorialBinding) {
    const recovered = await createNextGuidedPracticeCopy(context, {
      expectedRevision: state.revision,
      expectedTutorialVersion: state.tutorialBinding.version,
      expectedTutorialGeneration: state.tutorialBinding.generation,
    });
    return {
      projectId: recovered.project_id,
      estimateId: recovered.estimate_id,
      areaId: recovered.area_id,
      tutorialVersion: GUIDED_SAMPLE_VERSION,
      tutorialGeneration: recovered.tutorial_generation,
      resumed: false,
    };
  }
  if (state) throw new Error("The saved guided-practice state is invalid. Reset guidance and try again.");
  const created = await createInitialPractice(context);
  return {
    projectId: created.project_id,
    estimateId: created.estimate_id,
    areaId: created.area_id,
    tutorialVersion: GUIDED_SAMPLE_VERSION,
    tutorialGeneration: created.tutorial_generation,
    resumed: false,
  };
}

export async function createFreshGuidedPracticeCopy(input: {
  expectedRevision: number;
  expectedTutorialGeneration: number;
}) {
  "use server";
  if (
    !Number.isSafeInteger(input.expectedRevision)
    || input.expectedRevision < 0
    || !Number.isSafeInteger(input.expectedTutorialGeneration)
    || input.expectedTutorialGeneration < 1
  ) {
    throw new Error("Guided-practice recovery input is invalid.");
  }
  const database = await getCloudflareD1Database();
  if (!database) throw new Error("Guided practice requires the workspace database.");
  const context = await requirePracticeContext(database);
  const state = await getOnboardingFlowState(database, {
    userId: context.userId,
    workspaceId: context.workspaceId,
    flowKey: "guided_estimate_practice",
  });
  return createNextGuidedPracticeCopy(context, {
    expectedRevision: input.expectedRevision,
    expectedTutorialVersion: state?.tutorialBinding?.version ?? GUIDED_SAMPLE_VERSION,
    expectedTutorialGeneration: input.expectedTutorialGeneration,
  });
}
