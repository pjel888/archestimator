"use server";

import { cache } from "react";

import { isPlatformAdmin } from "@/lib/auth/roles";
import { requireCurrentUserContext } from "@/lib/auth/session";
import { getCloudflareD1Database, type D1DatabaseLike } from "@/lib/cloudflare/d1";

import { getActivationProgress } from "./activation-repository";
import {
  hasCurrentTutorialPracticeCompletion,
  getOnboardingFlowRunBinding,
  importExistingOnboardingState,
  listOnboardingFlowStates,
  listStarterAssetClaims,
  listStarterPackStates,
  mutateOnboardingFlow,
  resetAllGuidance,
  type OnboardingMutationCommand,
  type OnboardingMutationResult,
  type ResetAllGuidanceResult,
} from "./flow-repository";
import type {
  OnboardingAudienceKind,
  OnboardingCapability,
  OnboardingEligibilitySnapshot,
  OnboardingRouteIntent,
  StarterReadinessSnapshot,
} from "./flow-types";
import { ONBOARDING_TARGET_KEYS } from "./target-catalog";
import { readLibraryLearningPredicates } from "./library-learning";
import { readGuidedPracticePredicates } from "./estimate-practice";
import { getEligibleOnboardingFlows } from "./flow-eligibility";
import { ONBOARDING_FLOW_CATALOG } from "./flow-catalog";

type AccessibleWorkspaceRow = {
  workspace_id: string;
  workspace_created_by: string | null;
  workspace_role: "owner" | "admin" | "member" | "viewer" | null;
  access_source: "workspace" | "project" | "estimate";
  effective_role: "owner" | "admin" | "editor" | "member" | "viewer";
  project_id: string | null;
  estimate_id: string | null;
};

type ActivationFactsRow = {
  project_started: number;
  estimate_started: number;
  first_area_created: number;
  first_row_priced: number;
  first_valid_total_reached: number;
};

type OnboardingDiscoveryFactsRow = {
  manageable_client_link_project: number;
};

type OnboardingResourceContextRow = {
  project_id: string;
  estimate_id: string | null;
  node_id: string | null;
};

export type CurrentOnboardingActor = {
  userId: string;
  workspaceId: string;
  workspaceCreatedBy: string | null;
  workspaceRole: AccessibleWorkspaceRow["workspace_role"];
  accessSource: AccessibleWorkspaceRow["access_source"];
  effectiveRole: AccessibleWorkspaceRow["effective_role"];
  projectId: string | null;
  estimateId: string | null;
  nodeId: string | null;
  isPlatformAdmin: boolean;
};

async function resolveOnboardingResourceContext(
  database: D1DatabaseLike,
  input: {
    workspaceId: string;
    accessSource: AccessibleWorkspaceRow["access_source"];
    projectId: string | null;
    estimateId: string | null;
  },
) {
  const scopeClause = input.accessSource === "estimate"
    ? "estimate.id = ?"
    : input.accessSource === "project"
      ? "project.id = ?"
      : "project.workspace_id = ?";
  const scopeValue = input.accessSource === "estimate"
    ? input.estimateId
    : input.accessSource === "project"
      ? input.projectId
      : input.workspaceId;
  if (!scopeValue) return null;

  return database.prepare<OnboardingResourceContextRow>(`
    SELECT
      project.id AS project_id,
      estimate.id AS estimate_id,
      (
        SELECT node.id
        FROM estimate_nodes node
        LEFT JOIN estimate_tabs tab ON tab.id = node.estimate_tab_id
        WHERE node.estimate_id = estimate.id
          AND (node.estimate_tab_id IS NULL OR tab.archived_at IS NULL)
        ORDER BY
          CASE WHEN tab.is_default = 1 THEN 0 ELSE 1 END,
          node.sort_order ASC,
          node.id ASC
        LIMIT 1
      ) AS node_id
    FROM projects project
    LEFT JOIN estimates estimate ON estimate.project_id = project.id
    WHERE ${scopeClause}
      AND project.status <> 'archived'
    ORDER BY
      CASE WHEN estimate.id IS NULL THEN 1 ELSE 0 END,
      estimate.updated_at DESC,
      project.updated_at DESC,
      estimate.id DESC,
      project.id DESC
    LIMIT 1
  `).bind(scopeValue).first<OnboardingResourceContextRow>();
}

export async function resolveCurrentOnboardingActor(
  database: D1DatabaseLike,
): Promise<CurrentOnboardingActor> {
  const currentUser = await requireCurrentUserContext();
  const row = await database.prepare<AccessibleWorkspaceRow>(`
    WITH accessible AS (
      SELECT
        workspace.id AS workspace_id,
        workspace.created_by AS workspace_created_by,
        membership.role AS workspace_role,
        'workspace' AS access_source,
        CASE membership.role
          WHEN 'owner' THEN 'owner'
          WHEN 'admin' THEN 'admin'
          WHEN 'member' THEN 'member'
          ELSE 'viewer'
        END AS effective_role,
        NULL AS project_id,
        NULL AS estimate_id,
        3 AS source_priority
      FROM workspace_members membership
      JOIN workspaces workspace ON workspace.id = membership.workspace_id
      WHERE membership.user_id = ?
        AND workspace.closed_at IS NULL

      UNION ALL

      SELECT
        workspace.id,
        workspace.created_by,
        workspace_membership.role,
        'project',
        project_membership.role,
        project.id,
        NULL,
        2
      FROM project_members project_membership
      JOIN projects project ON project.id = project_membership.project_id
      JOIN workspaces workspace ON workspace.id = project.workspace_id
      LEFT JOIN workspace_members workspace_membership
        ON workspace_membership.workspace_id = workspace.id
       AND workspace_membership.user_id = project_membership.user_id
      WHERE project_membership.user_id = ?
        AND workspace.closed_at IS NULL

      UNION ALL

      SELECT
        workspace.id,
        workspace.created_by,
        workspace_membership.role,
        'estimate',
        estimate_membership.role,
        project.id,
        estimate.id,
        1
      FROM estimate_sheet_members estimate_membership
      JOIN estimates estimate ON estimate.id = estimate_membership.estimate_id
      JOIN projects project ON project.id = estimate.project_id
      JOIN workspaces workspace ON workspace.id = project.workspace_id
      LEFT JOIN workspace_members workspace_membership
        ON workspace_membership.workspace_id = workspace.id
       AND workspace_membership.user_id = estimate_membership.user_id
      WHERE estimate_membership.user_id = ?
        AND workspace.closed_at IS NULL
    )
    SELECT accessible.*
    FROM accessible
    LEFT JOIN profiles profile ON profile.id = ?
    ORDER BY
      CASE WHEN accessible.workspace_id = profile.default_workspace_id THEN 0 ELSE 1 END,
      accessible.source_priority DESC,
      accessible.workspace_id ASC
    LIMIT 1
  `).bind(
    currentUser.userId,
    currentUser.userId,
    currentUser.userId,
    currentUser.userId,
  ).first<AccessibleWorkspaceRow>();
  if (!row) throw new Error("No accessible onboarding workspace is available.");
  const resourceContext = await resolveOnboardingResourceContext(database, {
    workspaceId: row.workspace_id,
    accessSource: row.access_source,
    projectId: row.project_id,
    estimateId: row.estimate_id,
  });
  return {
    userId: currentUser.userId,
    workspaceId: row.workspace_id,
    workspaceCreatedBy: row.workspace_created_by,
    workspaceRole: row.workspace_role,
    accessSource: row.access_source,
    effectiveRole: row.effective_role,
    projectId: resourceContext?.project_id ?? row.project_id,
    estimateId: resourceContext?.estimate_id ?? row.estimate_id,
    nodeId: resourceContext?.node_id ?? null,
    isPlatformAdmin: isPlatformAdmin(currentUser),
  };
}

function deriveCapabilities(
  actor: CurrentOnboardingActor,
  facts?: OnboardingDiscoveryFactsRow | null,
): OnboardingCapability[] {
  const capabilities = new Set<OnboardingCapability>(["view_workshop"]);
  if (actor.accessSource === "workspace") {
    capabilities.add("view_projects");
    if (actor.workspaceRole !== "viewer") {
      capabilities.add("create_projects");
      capabilities.add("group_projects");
      capabilities.add("edit_estimate");
    }
  } else {
    capabilities.add("view_assigned_project");
  }
  if (actor.projectId) {
    capabilities.add("view_assigned_project");
    capabilities.add("view_estimate");
  }
  if (actor.estimateId) capabilities.add("view_estimate");
  if (actor.effectiveRole !== "viewer") capabilities.add("edit_estimate");
  if (
    actor.isPlatformAdmin
    || actor.workspaceRole === "owner"
    || actor.workspaceRole === "admin"
  ) {
    capabilities.add("manage_components");
    capabilities.add("manage_templates");
    if (facts?.manageable_client_link_project === 1) {
      capabilities.add("manage_client_links");
    }
  } else if (
    actor.accessSource === "project"
    && (actor.effectiveRole === "owner" || actor.effectiveRole === "admin")
  ) {
    capabilities.add("manage_client_links");
  }
  if (facts?.manageable_client_link_project === 1) {
    capabilities.add("manage_client_links");
  }
  return [...capabilities];
}

function deriveAudience(
  actor: CurrentOnboardingActor,
  capabilities: readonly OnboardingCapability[],
): OnboardingAudienceKind[] {
  const canManageClientLinks = capabilities.includes("manage_client_links");
  if (actor.accessSource === "estimate") {
    const audience: OnboardingAudienceKind[] = actor.effectiveRole === "viewer"
      ? ["estimate_collaborator", "estimate_reader"]
      : ["estimate_collaborator"];
    if (canManageClientLinks) audience.push("publication_manager");
    return audience;
  }
  if (actor.accessSource === "project") {
    return canManageClientLinks
      ? ["project_collaborator", "publication_manager"]
      : ["project_collaborator"];
  }
  const audience = new Set<OnboardingAudienceKind>([
    actor.workspaceCreatedBy === actor.userId
      ? "workspace_creator"
      : "workspace_editor",
  ]);
  if (actor.effectiveRole === "viewer" && actor.estimateId) {
    audience.add("estimate_reader");
  }
  if (canManageClientLinks) {
    audience.add("publication_manager");
  }
  return [...audience];
}

function deriveRoutes(
  actor: CurrentOnboardingActor,
  capabilities: readonly OnboardingCapability[],
): OnboardingRouteIntent[] {
  const capabilitySet = new Set(capabilities);
  const routes: OnboardingRouteIntent[] = [
    "workshop_home",
    "getting_started",
    "settings_guidance",
    "support",
  ];
  if (actor.accessSource === "workspace") routes.push("projects");
  if (actor.projectId) routes.push("assigned_project");
  if (actor.estimateId) routes.push("assigned_estimate", "estimate_sheet");
  if (capabilitySet.has("manage_components")) routes.push("library_components");
  if (capabilitySet.has("manage_templates")) routes.push("library_templates");
  if (capabilitySet.has("manage_client_links")) routes.push("client_links");
  return routes;
}

async function readStarterReadiness(
  database: D1DatabaseLike,
  actor: CurrentOnboardingActor,
): Promise<StarterReadinessSnapshot | null> {
  if (actor.accessSource !== "workspace") return null;
  const [states, claims] = await Promise.all([
    listStarterPackStates(database, { workspaceId: actor.workspaceId }),
    listStarterAssetClaims(database, { workspaceId: actor.workspaceId }),
  ]);
  const workspace = states.find((state) =>
    state.packVersion === 1
    && state.scopeKind === "workspace"
    && state.scopeOwnerId === actor.workspaceId
  );
  const user = states.find((state) =>
    state.packVersion === 1
    && state.scopeKind === "user"
    && state.scopeOwnerId === actor.userId
  );
  const inactiveAssetKeys = claims
    .filter((claim) => claim.lifecycleState !== "active")
    .map((claim) => claim.assetKey);
  const existingWorkspaceData = !workspace
    ? await database.prepare<{
        has_existing_data: number;
      }>(`
        SELECT (
          EXISTS (
            SELECT 1 FROM projects WHERE workspace_id = ?
          )
          OR EXISTS (
            SELECT 1 FROM cost_library_items WHERE workspace_id = ?
          )
          OR EXISTS (
            SELECT 1 FROM estimate_templates WHERE workspace_id = ?
          )
          OR EXISTS (
            SELECT 1 FROM project_groups
            WHERE workspace_id = ?
          )
          OR EXISTS (
            SELECT 1 FROM library_folders
            WHERE workspace_id = ? AND is_default_category = 0
          )
        ) AS has_existing_data
      `).bind(
        actor.workspaceId,
        actor.workspaceId,
        actor.workspaceId,
        actor.workspaceId,
        actor.workspaceId,
      ).first<{ has_existing_data: number }>()
    : null;
  const state = !workspace
    ? existingWorkspaceData?.has_existing_data
      ? "explicit_add"
      : "not_started"
    : inactiveAssetKeys.length > 0
      ? "inactive_key_restore"
      : workspace.status !== "complete"
        ? workspace.status
        : !user || user.status !== "complete"
          ? "partial"
          : workspace.sharedMembershipRevision === user.sharedMembershipRevision
            ? "complete"
            : "partial";
  return {
    state,
    packVersion: 1,
    workspaceRevision: workspace?.sharedMembershipRevision ?? null,
    userRevision: user?.sharedMembershipRevision ?? null,
    inactiveAssetKeys: [...new Set(inactiveAssetKeys)].sort(),
  };
}

const loadCurrentOnboardingEligibilitySnapshotCached = cache(
  async (): Promise<OnboardingEligibilitySnapshot> => {
    const database = await getCloudflareD1Database();
    if (!database) throw new Error("Onboarding state is unavailable.");
    const actor = await resolveCurrentOnboardingActor(database);
    await importExistingOnboardingState(database, actor);
    const [
    flowStates,
    activation,
    facts,
    discoveryFacts,
    practicePredicates,
    libraryPredicates,
    starter,
    ] = await Promise.all([
    listOnboardingFlowStates(database, actor),
    getActivationProgress(database, actor),
    database.prepare<ActivationFactsRow>(`
      SELECT
        (
          EXISTS (
            SELECT 1 FROM beta_activation_events
            WHERE user_id = ? AND workspace_id = ? AND origin_class = 'user_domain'
              AND milestone = 'project_created'
          )
          OR EXISTS (
            SELECT 1 FROM beta_onboarding_flow_events
            WHERE user_id = ? AND workspace_id = ?
              AND source = 'non_starter_domain'
              AND event_type = 'step_completed'
              AND flow_key IN ('core_orientation', 'first_estimate_value')
          )
        ) AS project_started,
        (
          EXISTS (
            SELECT 1 FROM beta_activation_events
            WHERE user_id = ? AND workspace_id = ? AND origin_class = 'user_domain'
              AND milestone IN ('first_area_created', 'first_row_priced', 'first_valid_total')
          )
          OR EXISTS (
            SELECT 1 FROM beta_onboarding_flow_events
            WHERE user_id = ? AND workspace_id = ?
              AND source = 'non_starter_domain'
              AND event_type = 'step_completed'
              AND flow_key = 'first_estimate_value'
          )
        ) AS estimate_started,
        EXISTS (
          SELECT 1 FROM beta_activation_events
          WHERE user_id = ? AND workspace_id = ? AND origin_class = 'user_domain'
            AND milestone = 'first_area_created'
        ) AS first_area_created,
        EXISTS (
          SELECT 1 FROM beta_activation_events
          WHERE user_id = ? AND workspace_id = ? AND origin_class = 'user_domain'
            AND milestone = 'first_row_priced'
        ) AS first_row_priced,
        EXISTS (
          SELECT 1 FROM beta_activation_events
          WHERE user_id = ? AND workspace_id = ? AND origin_class = 'user_domain'
            AND milestone = 'first_valid_total'
        ) AS first_valid_total_reached
    `).bind(
      actor.userId, actor.workspaceId,
      actor.userId, actor.workspaceId,
      actor.userId, actor.workspaceId,
      actor.userId, actor.workspaceId,
      actor.userId, actor.workspaceId,
      actor.userId, actor.workspaceId,
      actor.userId, actor.workspaceId,
    ).first<ActivationFactsRow>(),
    database.prepare<OnboardingDiscoveryFactsRow>(`
      SELECT
        EXISTS (
          SELECT 1
          FROM projects project
          WHERE project.workspace_id = ?
            AND project.status <> 'archived'
            AND EXISTS (
              SELECT 1
              FROM estimates estimate
              WHERE estimate.project_id = project.id
            )
            AND (
              ? = 1
              OR EXISTS (
                SELECT 1
                FROM workspace_members membership
                WHERE membership.workspace_id = project.workspace_id
                  AND membership.user_id = ?
                  AND membership.role IN ('owner', 'admin')
              )
              OR EXISTS (
                SELECT 1
                FROM project_members membership
                WHERE membership.project_id = project.id
                  AND membership.user_id = ?
                  AND membership.role IN ('owner', 'admin')
              )
            )
        ) AS manageable_client_link_project
    `).bind(
      actor.workspaceId,
      actor.isPlatformAdmin ? 1 : 0,
      actor.userId,
      actor.userId,
    ).first<OnboardingDiscoveryFactsRow>(),
    readGuidedPracticePredicates(database, actor),
    readLibraryLearningPredicates(database, actor),
    readStarterReadiness(database, actor),
    ]);
    const flowStatesWithBindings = await Promise.all(
      flowStates.map(async (state) => {
        const binding = await getOnboardingFlowRunBinding(database, {
          userId: actor.userId,
          workspaceId: actor.workspaceId,
          flowKey: state.flowKey,
          flowVersion: state.flowVersion,
        });
        return {
          ...state,
          runId: binding?.runId ?? null,
        };
      }),
    );
    const capabilities = deriveCapabilities(actor, discoveryFacts);
    const clientLinkFlow = flowStatesWithBindings.find(
      (state) => state.flowKey === "client_link_publishing",
    );
    return {
    userId: actor.userId,
    workspaceId: actor.workspaceId,
    workspaceRole: actor.workspaceRole,
    accessSource: actor.accessSource,
    effectiveRole: actor.effectiveRole,
    entryKind: actor.accessSource === "estimate"
      ? "direct_estimate"
      : actor.accessSource === "project"
        ? "invited_collaborator"
        : actor.workspaceCreatedBy === actor.userId
          ? "workspace_creator"
          : "workspace_member",
    viewportHint: "unknown",
    resourceContext: {
      projectId: actor.projectId ?? undefined,
      estimateId: actor.estimateId ?? undefined,
      nodeId: actor.nodeId ?? undefined,
    },
    activation: {
      selectedPath: activation?.selectedPath ?? null,
      projectStarted: facts?.project_started === 1,
      estimateStarted: facts?.estimate_started === 1,
      firstAreaCreated: facts?.first_area_created === 1,
      firstRowPriced: facts?.first_row_priced === 1,
      firstValidTotalReached: facts?.first_valid_total_reached === 1,
      automaticGuidanceEnabled: !activation?.automaticGuidanceDisabledAt,
      checklistDismissed: Boolean(
        activation?.checklistDismissedAt
        && (
          !activation.checklistReopenedAt
          || activation.checklistDismissedAt > activation.checklistReopenedAt
        )
      ),
    },
    starter,
    audience: deriveAudience(actor, capabilities),
    capabilities,
    dataPredicates: {
      assigned_work_available: Boolean(actor.projectId || actor.estimateId),
      estimate_context_available: Boolean(actor.estimateId),
      first_project_incomplete: facts?.project_started !== 1,
      first_estimate_incomplete: facts?.estimate_started !== 1,
      first_area_incomplete: facts?.first_area_created !== 1,
      first_priced_row_incomplete: facts?.first_row_priced !== 1,
      first_valid_total_incomplete: facts?.first_valid_total_reached !== 1,
      tutorial_binding_current: practicePredicates.tutorialBindingCurrent,
      tutorial_core_incomplete: practicePredicates.tutorialCoreIncomplete,
      non_starter_transfer_incomplete:
        practicePredicates.nonStarterTransferIncomplete,
      library_content_available: libraryPredicates.libraryContentAvailable,
      library_reuse_incomplete: libraryPredicates.libraryReuseIncomplete,
      client_link_project_available:
        discoveryFacts?.manageable_client_link_project === 1,
      client_link_core_incomplete: clientLinkFlow?.status !== "completed",
    },
    availableRoutes: deriveRoutes(actor, capabilities),
    availableTargets: ONBOARDING_TARGET_KEYS,
      flowStates: flowStatesWithBindings,
    };
  },
);

export async function loadCurrentOnboardingEligibilitySnapshot(): Promise<OnboardingEligibilitySnapshot> {
  return loadCurrentOnboardingEligibilitySnapshotCached();
}

export async function mutateCurrentOnboardingFlow(
  command: OnboardingMutationCommand,
): Promise<OnboardingMutationResult> {
  const database = await getCloudflareD1Database();
  if (!database) throw new Error("Onboarding state is unavailable.");
  const [actor, snapshot] = await Promise.all([
    resolveCurrentOnboardingActor(database),
    loadCurrentOnboardingEligibilitySnapshot(),
  ]);
  const eligibleFlow = getEligibleOnboardingFlows(
    snapshot,
    command.viewportClass ?? "desktop",
  ).find((flow) => flow.definition.key === command.flowKey);
  const launchAuthorized =
    (
      command.command !== "start"
      || command.launchMode === "start"
      || command.launchMode === "task"
      || command.launchMode === "settings"
      || (
        command.launchMode === "auto"
        && eligibleFlow?.definition.autoStart === "first_eligible_session"
      )
    )
    && (
      command.command !== "resume"
      || command.launchMode === "resume"
    )
    && (
      command.command !== "replay"
      || command.launchMode === "replay"
    )
    && (
      command.command !== "restart"
      || command.launchMode === "restart"
    );
  if (
    actor.userId !== snapshot.userId
    || actor.workspaceId !== snapshot.workspaceId
    || !eligibleFlow
    || !launchAuthorized
  ) {
    return {
      status: "conflict",
      code: "ONBOARDING_ILLEGAL_TRANSITION",
      state: null,
    };
  }
  const states = await listOnboardingFlowStates(database, actor);
  const guidedState = states.find((state) =>
    state.flowKey === "guided_estimate_practice"
  );
  return mutateOnboardingFlow(database, {
    userId: actor.userId,
    workspaceId: actor.workspaceId,
    eligibleStepKeys: eligibleFlow.steps.map((step) => step.key),
    tutorialBinding: guidedState?.tutorialBinding ?? null,
    guidedPracticeComplete: command.flowKey === "guided_estimate_practice"
      ? await hasCurrentTutorialPracticeCompletion(database, actor)
      : undefined,
  }, command);
}

export async function resetCurrentGuidance(input: {
  mutationId: string;
  expectedRevisions: Parameters<typeof resetAllGuidance>[2]["expectedRevisions"];
}): Promise<ResetAllGuidanceResult> {
  const database = await getCloudflareD1Database();
  if (!database) throw new Error("Onboarding state is unavailable.");
  const actor = await resolveCurrentOnboardingActor(database);
  return resetAllGuidance(database, actor, {
    ...input,
    flowKeys: ONBOARDING_FLOW_CATALOG.map((flow) => flow.key),
  });
}
