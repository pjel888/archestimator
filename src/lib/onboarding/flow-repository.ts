import "server-only";

import { createHash, randomUUID } from "node:crypto";

import type {
  D1DatabaseLike,
  D1PreparedStatementLike,
} from "@/lib/cloudflare/d1";

import { getOnboardingFlowDefinition } from "./flow-catalog";
import {
  ACTIVATION_PATHS,
  ONBOARDING_EVENT_SOURCES,
  ONBOARDING_EVENT_TYPES,
  ONBOARDING_FLOW_KEYS,
  ONBOARDING_LAUNCH_MODES,
  ONBOARDING_REASON_CODES,
  ONBOARDING_ROUTE_INTENTS,
  ONBOARDING_STEP_KEYS,
  ONBOARDING_VIEWPORTS,
  STARTER_ASSET_KINDS,
  STARTER_CLAIM_STATUSES,
  STARTER_INSTALL_STATUSES,
  STARTER_SCOPE_KINDS,
  isClosedValue,
  type ActivationOriginClass,
  type ActivationPath,
  type OnboardingEventSource,
  type OnboardingEventType,
  type OnboardingFlowKey,
  type OnboardingFlowStateSnapshot,
  type OnboardingFlowStatus,
  type OnboardingLaunchMode,
  type OnboardingReasonCode,
  type OnboardingRouteIntent,
  type OnboardingStepKey,
  type OnboardingViewport,
  type StarterAssetKind,
  type StarterClaimStatus,
  type StarterInstallStatus,
  type StarterScopeKind,
  type TutorialBinding,
} from "./flow-types";

export type OnboardingFlowState = OnboardingFlowStateSnapshot & {
  userId: string;
  workspaceId: string;
  startedAt: string | null;
  lastResumedAt: string | null;
  lastPausedAt: string | null;
  completedAt: string | null;
  dismissedAt: string | null;
  lastResetAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type StarterPackState = {
  workspaceId: string;
  packVersion: number;
  scopeKind: StarterScopeKind;
  scopeOwnerId: string;
  status: StarterInstallStatus;
  revision: number;
  sharedMembershipRevision: number;
  installedAt: string | null;
  lastRestoredAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type StarterAssetClaim = {
  workspaceId: string;
  packVersion: number;
  scopeKind: StarterScopeKind;
  scopeOwnerId: string;
  assetKey: string;
  assetKind: StarterAssetKind;
  starterGeneration: number;
  resourceId: string;
  lifecycleState: StarterClaimStatus;
  createdAt: string;
  updatedAt: string;
};

export type OnboardingMutationCommand = {
  command:
    | "start"
    | "resume"
    | "advance"
    | "pause"
    | "dismiss"
    | "complete"
    | "replay"
    | "restart";
  flowKey: OnboardingFlowKey;
  mutationId: string;
  expectedRevision: number | null;
  expectedStepKey?: OnboardingStepKey | null;
  nextStepKey?: OnboardingStepKey | null;
  expectedTutorialBinding?: TutorialBinding | null;
  runId?: string | null;
  launchMode: OnboardingLaunchMode;
  reasonCode?: OnboardingReasonCode | null;
  routeKey?: OnboardingRouteIntent | null;
  viewportClass?: OnboardingViewport | null;
  selectedPath?: ActivationPath | null;
};

export type OnboardingMutationContext = {
  userId: string;
  workspaceId: string;
  resourceId?: string | null;
  eligibleStepKeys?: readonly OnboardingStepKey[];
  tutorialBinding?: TutorialBinding | null;
  guidedPracticeComplete?: boolean;
};

export type OnboardingMutationResult =
  | {
      status: "applied" | "idempotent";
      state: OnboardingFlowState;
      runId: string;
    }
  | {
      status: "conflict";
      code:
        | "ONBOARDING_STATE_CONFLICT"
        | "ONBOARDING_ILLEGAL_TRANSITION"
        | "ONBOARDING_MUTATION_REUSED"
        | "ONBOARDING_TUTORIAL_BINDING_REQUIRED"
        | "ONBOARDING_PRACTICE_INCOMPLETE"
        | "ONBOARDING_DOMAIN_PROOF_REQUIRED";
      state: OnboardingFlowState | null;
    };

export type OnboardingDomainCompletionResult =
  | {
      status: "applied";
      state: OnboardingFlowState;
    }
  | {
      status: "conflict";
      code:
        | "ONBOARDING_ALREADY_COMPLETED"
        | "ONBOARDING_DOMAIN_BINDING_MISMATCH"
        | "ONBOARDING_MUTATION_REUSED"
        | "ONBOARDING_STATE_CONFLICT";
      state: OnboardingFlowState | null;
    };

export type ResetAllGuidanceResult =
  | { status: "applied" | "idempotent"; states: OnboardingFlowState[] }
  | { status: "conflict"; states: OnboardingFlowState[] };

type FlowStateRow = {
  user_id: string;
  workspace_id: string;
  flow_key: string;
  flow_version: number;
  generation: number;
  tutorial_version: number | null;
  tutorial_generation: number | null;
  status: OnboardingFlowStatus;
  current_step_key: string | null;
  revision: number;
  reset_count: number;
  started_at: string | null;
  last_resumed_at: string | null;
  last_paused_at: string | null;
  completed_at: string | null;
  dismissed_at: string | null;
  last_reset_at: string | null;
  created_at: string;
  updated_at: string;
};

type IdempotencyRow = {
  request_fingerprint: string | null;
  run_id: string;
};

type RunBindingRow = {
  run_id: string;
  resource_id: string | null;
};

type StarterPackStateRow = {
  workspace_id: string;
  pack_version: number;
  scope_kind: string;
  scope_owner_id: string;
  status: string;
  revision: number;
  shared_membership_revision: number;
  installed_at: string | null;
  last_restored_at: string | null;
  created_at: string;
  updated_at: string;
};

type StarterAssetClaimRow = {
  workspace_id: string;
  pack_version: number;
  scope_kind: string;
  scope_owner_id: string;
  asset_key: string;
  asset_kind: string;
  starter_generation: number;
  resource_id: string;
  lifecycle_state: string;
  created_at: string;
  updated_at: string;
};

type ImportEvidenceRow = {
  progress_exists: number;
  has_project: number;
  has_area: number;
  has_priced_row: number;
  has_valid_total: number;
};

const MUTATING_EVENT: Record<OnboardingMutationCommand["command"], OnboardingEventType> = {
  advance: "step_completed",
  complete: "flow_completed",
  dismiss: "flow_dismissed",
  pause: "flow_paused",
  replay: "flow_replayed",
  restart: "flow_restarted",
  resume: "flow_resumed",
  start: "flow_started",
};

export class OnboardingFlowRepositoryError extends Error {
  constructor(
    readonly code:
      | "onboarding_database_unavailable"
      | "onboarding_invalid_input"
      | "onboarding_write_failed",
    message: string,
  ) {
    super(message);
    this.name = "OnboardingFlowRepositoryError";
  }
}

function requireText(value: string, label: string) {
  if (!value.trim()) {
    throw new OnboardingFlowRepositoryError(
      "onboarding_invalid_input",
      `Onboarding requires ${label}.`,
    );
  }
}

function mapFlowState(row: FlowStateRow): OnboardingFlowState {
  if (
    !isClosedValue(ONBOARDING_FLOW_KEYS, row.flow_key)
    || (
      row.current_step_key !== null
      && !isClosedValue(ONBOARDING_STEP_KEYS, row.current_step_key)
    )
  ) {
    throw new OnboardingFlowRepositoryError(
      "onboarding_write_failed",
      "Onboarding state contains an unknown flow or step.",
    );
  }
  return {
    userId: row.user_id,
    workspaceId: row.workspace_id,
    flowKey: row.flow_key,
    flowVersion: Number(row.flow_version),
    generation: Number(row.generation),
    tutorialBinding: row.tutorial_version === null || row.tutorial_generation === null
      ? null
      : {
          version: Number(row.tutorial_version),
          generation: Number(row.tutorial_generation),
        },
    status: row.status,
    currentStepKey: row.current_step_key,
    revision: Number(row.revision),
    resetCount: Number(row.reset_count),
    startedAt: row.started_at,
    lastResumedAt: row.last_resumed_at,
    lastPausedAt: row.last_paused_at,
    completedAt: row.completed_at,
    dismissedAt: row.dismissed_at,
    lastResetAt: row.last_reset_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapStarterState(row: StarterPackStateRow): StarterPackState {
  if (
    !isClosedValue(STARTER_SCOPE_KINDS, row.scope_kind)
    || !isClosedValue(STARTER_INSTALL_STATUSES, row.status)
  ) {
    throw new OnboardingFlowRepositoryError(
      "onboarding_write_failed",
      "Starter state contains an unknown value.",
    );
  }
  return {
    workspaceId: row.workspace_id,
    packVersion: Number(row.pack_version),
    scopeKind: row.scope_kind,
    scopeOwnerId: row.scope_owner_id,
    status: row.status,
    revision: Number(row.revision),
    sharedMembershipRevision: Number(row.shared_membership_revision),
    installedAt: row.installed_at,
    lastRestoredAt: row.last_restored_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapStarterClaim(row: StarterAssetClaimRow): StarterAssetClaim {
  if (
    !isClosedValue(STARTER_SCOPE_KINDS, row.scope_kind)
    || !isClosedValue(STARTER_ASSET_KINDS, row.asset_kind)
    || !isClosedValue(STARTER_CLAIM_STATUSES, row.lifecycle_state)
  ) {
    throw new OnboardingFlowRepositoryError(
      "onboarding_write_failed",
      "Starter claim contains an unknown value.",
    );
  }
  return {
    workspaceId: row.workspace_id,
    packVersion: Number(row.pack_version),
    scopeKind: row.scope_kind,
    scopeOwnerId: row.scope_owner_id,
    assetKey: row.asset_key,
    assetKind: row.asset_kind,
    starterGeneration: Number(row.starter_generation),
    resourceId: row.resource_id,
    lifecycleState: row.lifecycle_state,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function fingerprint(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function bindingsEqual(
  left: TutorialBinding | null | undefined,
  right: TutorialBinding | null | undefined,
) {
  if (left == null && right == null) return true;
  if (!left || !right) return false;
  return left.version === right.version && left.generation === right.generation;
}

function validateCommand(command: OnboardingMutationCommand) {
  if (
    !isClosedValue(ONBOARDING_FLOW_KEYS, command.flowKey)
    || !isClosedValue(ONBOARDING_LAUNCH_MODES, command.launchMode)
    || (
      command.expectedStepKey !== undefined
      && command.expectedStepKey !== null
      && !isClosedValue(ONBOARDING_STEP_KEYS, command.expectedStepKey)
    )
    || (
      command.nextStepKey !== undefined
      && command.nextStepKey !== null
      && !isClosedValue(ONBOARDING_STEP_KEYS, command.nextStepKey)
    )
    || (
      command.reasonCode !== undefined
      && command.reasonCode !== null
      && !isClosedValue(ONBOARDING_REASON_CODES, command.reasonCode)
    )
    || (
      command.routeKey !== undefined
      && command.routeKey !== null
      && !isClosedValue(ONBOARDING_ROUTE_INTENTS, command.routeKey)
    )
    || (
      command.viewportClass !== undefined
      && command.viewportClass !== null
      && !isClosedValue(ONBOARDING_VIEWPORTS, command.viewportClass)
    )
    || (
      command.selectedPath !== undefined
      && command.selectedPath !== null
      && !isClosedValue(ACTIVATION_PATHS, command.selectedPath)
    )
  ) {
    throw new OnboardingFlowRepositoryError(
      "onboarding_invalid_input",
      "Onboarding command contains a value outside the closed contract.",
    );
  }
  requireText(command.mutationId, "a mutation id");
  if (command.runId !== undefined && command.runId !== null) {
    requireText(command.runId, "a run id");
  }
}

function validateIdentity(input: { userId: string; workspaceId: string }) {
  requireText(input.userId, "a user id");
  requireText(input.workspaceId, "a workspace id");
}

export async function getOnboardingFlowState(
  database: D1DatabaseLike | null | undefined,
  input: {
    userId: string;
    workspaceId: string;
    flowKey: OnboardingFlowKey;
    flowVersion?: number;
  },
): Promise<OnboardingFlowState | null> {
  if (!database) return null;
  validateIdentity(input);
  const definition = getOnboardingFlowDefinition(input.flowKey);
  const flowVersion = input.flowVersion ?? definition.version;
  const row = await database.prepare<FlowStateRow>(`
    SELECT *
    FROM beta_onboarding_flow_states
    WHERE user_id = ?
      AND workspace_id = ?
      AND flow_key = ?
      AND flow_version = ?
    LIMIT 1
  `).bind(
    input.userId,
    input.workspaceId,
    input.flowKey,
    flowVersion,
  ).first<FlowStateRow>();
  return row ? mapFlowState(row) : null;
}

export async function getOnboardingFlowRunBinding(
  database: D1DatabaseLike | null | undefined,
  input: {
    userId: string;
    workspaceId: string;
    flowKey: OnboardingFlowKey;
    flowVersion: number;
  },
): Promise<{ runId: string; resourceId: string | null; state: OnboardingFlowState } | null> {
  if (!database) return null;
  validateIdentity(input);
  const state = await getOnboardingFlowState(database, input);
  if (!state) return null;
  const row = await database.prepare<RunBindingRow>(`
    SELECT event.run_id, event.resource_id
    FROM beta_onboarding_flow_events event
    WHERE event.user_id = ?
      AND event.workspace_id = ?
      AND event.flow_key = ?
      AND event.flow_version = ?
      AND event.generation = ?
      AND event.state_revision <= ?
      AND event.event_type IN (
        'state_imported',
        'flow_started',
        'flow_resumed',
        'flow_replayed',
        'flow_paused',
        'flow_dismissed',
        'flow_restarted',
        'sample_generated',
        'sample_fresh_copy_created'
      )
    ORDER BY event.occurred_at DESC, event.ingested_at DESC, event.id DESC
    LIMIT 1
  `).bind(
    input.userId,
    input.workspaceId,
    input.flowKey,
    input.flowVersion,
    state.generation,
    state.revision,
  ).first<RunBindingRow>();
  return row?.run_id
    ? { runId: row.run_id, resourceId: row.resource_id, state }
    : null;
}

export async function listOnboardingFlowStates(
  database: D1DatabaseLike | null | undefined,
  input: { userId: string; workspaceId: string },
): Promise<OnboardingFlowState[]> {
  if (!database) return [];
  validateIdentity(input);
  const result = await database.prepare<FlowStateRow>(`
    SELECT *
    FROM beta_onboarding_flow_states
    WHERE user_id = ? AND workspace_id = ?
    ORDER BY flow_key ASC, flow_version ASC
  `).bind(input.userId, input.workspaceId).all<FlowStateRow>();
  return (result.results ?? []).map(mapFlowState);
}

export async function listStarterPackStates(
  database: D1DatabaseLike | null | undefined,
  input: { workspaceId: string; scopeOwnerId?: string },
): Promise<StarterPackState[]> {
  if (!database) return [];
  requireText(input.workspaceId, "a workspace id");
  const statement = input.scopeOwnerId
    ? database.prepare<StarterPackStateRow>(`
        SELECT *
        FROM beta_starter_pack_states
        WHERE workspace_id = ? AND scope_owner_id = ?
        ORDER BY pack_version ASC, scope_kind ASC
      `).bind(input.workspaceId, input.scopeOwnerId)
    : database.prepare<StarterPackStateRow>(`
        SELECT *
        FROM beta_starter_pack_states
        WHERE workspace_id = ?
        ORDER BY pack_version ASC, scope_kind ASC, scope_owner_id ASC
      `).bind(input.workspaceId);
  const result = await statement.all<StarterPackStateRow>();
  return (result.results ?? []).map(mapStarterState);
}

export async function listStarterAssetClaims(
  database: D1DatabaseLike | null | undefined,
  input: {
    workspaceId: string;
    scopeKind?: StarterScopeKind;
    scopeOwnerId?: string;
    lifecycleState?: StarterClaimStatus;
  },
): Promise<StarterAssetClaim[]> {
  if (!database) return [];
  requireText(input.workspaceId, "a workspace id");
  const clauses = ["workspace_id = ?"];
  const values: (string | number | boolean | null | ArrayBuffer)[] = [input.workspaceId];
  if (input.scopeKind) {
    clauses.push("scope_kind = ?");
    values.push(input.scopeKind);
  }
  if (input.scopeOwnerId) {
    clauses.push("scope_owner_id = ?");
    values.push(input.scopeOwnerId);
  }
  if (input.lifecycleState) {
    clauses.push("lifecycle_state = ?");
    values.push(input.lifecycleState);
  }
  const result = await database.prepare<StarterAssetClaimRow>(`
    SELECT *
    FROM beta_starter_asset_claims
    WHERE ${clauses.join(" AND ")}
    ORDER BY pack_version ASC, scope_kind ASC, scope_owner_id ASC,
             asset_key ASC, starter_generation ASC
  `).bind(...values).all<StarterAssetClaimRow>();
  return (result.results ?? []).map(mapStarterClaim);
}

async function readIdempotencyEvent(
  database: D1DatabaseLike,
  input: { userId: string; workspaceId: string; mutationId: string },
) {
  return database.prepare<IdempotencyRow>(`
    SELECT request_fingerprint, run_id
    FROM beta_onboarding_flow_events
    WHERE user_id = ? AND workspace_id = ? AND idempotency_key = ?
    LIMIT 1
  `).bind(
    input.userId,
    input.workspaceId,
    input.mutationId,
  ).first<IdempotencyRow>();
}

function prepareEventInsert(
  database: D1DatabaseLike,
  input: {
    context: OnboardingMutationContext;
    command: OnboardingMutationCommand;
    flowVersion: number;
    eventType: OnboardingEventType;
    runId: string;
    requestFingerprint: string;
    occurredAt: string;
    stateRevision: number;
    requirePreviousChange: boolean;
  },
): D1PreparedStatementLike {
  const previousChangeGuard = input.requirePreviousChange ? "AND changes() = 1" : "";
  return database.prepare(`
    INSERT INTO beta_onboarding_flow_events (
      id, user_id, workspace_id, flow_key, flow_version, generation,
      tutorial_version, tutorial_generation, run_id, launch_mode, step_key,
      event_type, source, reason_code, route_key, viewport_class,
      resource_id, idempotency_key, request_fingerprint, state_revision,
      occurred_at, ingested_at
    )
    SELECT
      ?, state.user_id, state.workspace_id, state.flow_key, state.flow_version,
      state.generation, state.tutorial_version, state.tutorial_generation,
      ?, ?, ?, ?, 'user_command', ?, ?, ?, ?, ?, ?, state.revision, ?, ?
    FROM beta_onboarding_flow_states state
    WHERE state.user_id = ?
      AND state.workspace_id = ?
      AND state.flow_key = ?
      AND state.flow_version = ?
      AND state.revision = ?
      ${previousChangeGuard}
    ON CONFLICT(user_id, workspace_id, idempotency_key) DO NOTHING
  `).bind(
    randomUUID(),
    input.runId,
    input.command.launchMode,
    input.command.nextStepKey ?? input.command.expectedStepKey ?? null,
    input.eventType,
    input.command.reasonCode ?? null,
    input.command.routeKey ?? null,
    input.command.viewportClass ?? null,
    input.context.resourceId ?? null,
    input.command.mutationId,
    input.requestFingerprint,
    input.occurredAt,
    input.occurredAt,
    input.context.userId,
    input.context.workspaceId,
    input.command.flowKey,
    input.flowVersion,
    input.stateRevision,
  );
}

function transitionStatement(
  database: D1DatabaseLike,
  input: {
    context: OnboardingMutationContext;
    command: OnboardingMutationCommand;
    current: OnboardingFlowState;
    flowVersion: number;
    nextStatus: OnboardingFlowStatus;
    nextStepKey: OnboardingStepKey | null;
    occurredAt: string;
    incrementGeneration: boolean;
    incrementResetCount: boolean;
  },
) {
  const expectedStepKey =
    input.command.command === "start"
    || input.command.command === "restart"
      ? null
      : input.command.expectedStepKey ?? null;
  return database.prepare(`
    UPDATE beta_onboarding_flow_states
    SET status = ?,
        current_step_key = ?,
        generation = generation + ?,
        revision = revision + 1,
        reset_count = reset_count + ?,
        started_at = CASE
          WHEN ? = 'start' THEN COALESCE(started_at, ?)
          WHEN ? = 'restart' THEN ?
          ELSE started_at
        END,
        last_resumed_at = CASE WHEN ? = 'resume' THEN ? ELSE last_resumed_at END,
        last_paused_at = CASE WHEN ? = 'pause' THEN ? ELSE last_paused_at END,
        completed_at = CASE
          WHEN ? = 'completed' THEN ?
          WHEN ? IN ('start', 'restart') THEN NULL
          ELSE completed_at
        END,
        dismissed_at = CASE
          WHEN ? = 'dismissed' THEN ?
          WHEN ? IN ('start', 'restart') THEN NULL
          ELSE dismissed_at
        END,
        last_reset_at = CASE WHEN ? = 'restart' THEN ? ELSE last_reset_at END,
        updated_at = ?
    WHERE user_id = ?
      AND workspace_id = ?
      AND flow_key = ?
      AND flow_version = ?
      AND revision = ?
      AND status = ?
      AND (? IS NULL OR current_step_key IS ?)
      AND (? IS NULL OR tutorial_version = ?)
      AND (? IS NULL OR tutorial_generation = ?)
  `).bind(
    input.nextStatus,
    input.nextStepKey,
    input.incrementGeneration ? 1 : 0,
    input.incrementResetCount ? 1 : 0,
    input.command.command,
    input.occurredAt,
    input.command.command,
    input.occurredAt,
    input.command.command,
    input.occurredAt,
    input.command.command,
    input.occurredAt,
    input.nextStatus,
    input.occurredAt,
    input.command.command,
    input.nextStatus,
    input.occurredAt,
    input.command.command,
    input.command.command,
    input.occurredAt,
    input.occurredAt,
    input.context.userId,
    input.context.workspaceId,
    input.command.flowKey,
    input.flowVersion,
    input.current.revision,
    input.current.status,
    expectedStepKey,
    expectedStepKey,
    input.command.expectedTutorialBinding?.version ?? null,
    input.command.expectedTutorialBinding?.version ?? null,
    input.command.expectedTutorialBinding?.generation ?? null,
    input.command.expectedTutorialBinding?.generation ?? null,
  );
}

function prepareSelectedPathUpsert(
  database: D1DatabaseLike,
  input: {
    userId: string;
    workspaceId: string;
    selectedPath: ActivationPath;
    occurredAt: string;
  },
) {
  return database.prepare(`
    INSERT INTO beta_activation_progress (
      user_id, workspace_id, selected_path, created_at, updated_at
    )
    SELECT ?, ?, ?, ?, ?
    WHERE changes() = 1
    ON CONFLICT(user_id, workspace_id) DO UPDATE SET
      selected_path = excluded.selected_path,
      version = beta_activation_progress.version + 1,
      updated_at = excluded.updated_at
  `).bind(
    input.userId,
    input.workspaceId,
    input.selectedPath,
    input.occurredAt,
    input.occurredAt,
  );
}

function legalTransition(
  current: OnboardingFlowState | null,
  command: OnboardingMutationCommand,
  eligibleStepKeys: readonly OnboardingStepKey[],
): {
  nextStatus: OnboardingFlowStatus;
  nextStepKey: OnboardingStepKey | null;
  incrementGeneration: boolean;
  incrementResetCount: boolean;
} | null {
  const firstStep = eligibleStepKeys[0] ?? null;
  const currentStepIndex = current?.currentStepKey
    ? eligibleStepKeys.indexOf(current.currentStepKey)
    : -1;
  const lastStep = eligibleStepKeys.at(-1) ?? null;
  switch (command.command) {
    case "start":
      if (!current || current.status === "not_started") {
        return {
          nextStatus: "in_progress",
          nextStepKey: firstStep,
          incrementGeneration: false,
          incrementResetCount: false,
        };
      }
      if (current.status === "dismissed") {
        return {
          nextStatus: "in_progress",
          nextStepKey: firstStep,
          incrementGeneration: true,
          incrementResetCount: false,
        };
      }
      return null;
    case "resume":
      return current?.status === "in_progress"
        ? {
            nextStatus: "in_progress",
            nextStepKey: current.currentStepKey,
            incrementGeneration: false,
            incrementResetCount: false,
          }
        : null;
    case "advance":
      if (
        current?.status !== "in_progress"
        || currentStepIndex < 0
      ) {
        return null;
      }
      const legalSuccessor =
        eligibleStepKeys[currentStepIndex + 1] ?? current.currentStepKey;
      return command.nextStepKey === legalSuccessor
        ? {
            nextStatus: "in_progress",
            nextStepKey: legalSuccessor,
            incrementGeneration: false,
            incrementResetCount: false,
          }
        : null;
    case "pause":
      return current?.status === "in_progress"
        ? {
            nextStatus: "in_progress",
            nextStepKey: command.expectedStepKey ?? current.currentStepKey,
            incrementGeneration: false,
            incrementResetCount: false,
          }
        : null;
    case "dismiss":
      return current?.status === "in_progress"
        ? {
            nextStatus: "dismissed",
            nextStepKey: current.currentStepKey,
            incrementGeneration: false,
            incrementResetCount: false,
          }
        : null;
    case "complete":
      return current?.status === "in_progress"
        && current.currentStepKey === lastStep
        ? {
            nextStatus: "completed",
            nextStepKey: null,
            incrementGeneration: false,
            incrementResetCount: false,
          }
        : null;
    case "restart":
      return current
        ? {
            nextStatus: "in_progress",
            nextStepKey: firstStep,
            incrementGeneration: true,
            incrementResetCount: true,
          }
        : null;
    case "replay":
      return current?.status === "completed"
        ? {
            nextStatus: "completed",
            nextStepKey: firstStep,
            incrementGeneration: false,
            incrementResetCount: false,
          }
        : null;
  }
}

export async function mutateOnboardingFlow(
  database: D1DatabaseLike | null | undefined,
  context: OnboardingMutationContext,
  command: OnboardingMutationCommand,
): Promise<OnboardingMutationResult> {
  if (!database?.batch) {
    throw new OnboardingFlowRepositoryError(
      "onboarding_database_unavailable",
      "Onboarding mutations require D1 batch support.",
    );
  }
  validateIdentity(context);
  validateCommand(command);
  const definition = getOnboardingFlowDefinition(command.flowKey);
  const definitionStepKeys = new Set(
    definition.steps.map((step) => step.key),
  );
  const eligibleStepKeys = (
    context.eligibleStepKeys
    ?? definition.steps.map((step) => step.key)
  ).filter((stepKey) => definitionStepKeys.has(stepKey));
  if (
    eligibleStepKeys.length === 0
    || (
      command.expectedStepKey !== undefined
      && command.expectedStepKey !== null
      && !eligibleStepKeys.includes(command.expectedStepKey)
    )
    || (
      command.nextStepKey !== undefined
      && command.nextStepKey !== null
      && !eligibleStepKeys.includes(command.nextStepKey)
    )
  ) {
    return {
      status: "conflict",
      code: "ONBOARDING_ILLEGAL_TRANSITION",
      state: null,
    };
  }
  const current = await getOnboardingFlowState(database, {
    ...context,
    flowKey: command.flowKey,
    flowVersion: definition.version,
  });
  const requestFingerprint = fingerprint({
    command: command.command,
    expectedRevision: command.expectedRevision,
    expectedStepKey: command.expectedStepKey ?? null,
    expectedTutorialBinding: command.expectedTutorialBinding ?? null,
    flowKey: command.flowKey,
    launchMode: command.launchMode,
    nextStepKey: command.nextStepKey ?? null,
    reasonCode: command.reasonCode ?? null,
    routeKey: command.routeKey ?? null,
    resourceId: context.resourceId ?? null,
    selectedPath: command.selectedPath ?? null,
    runId: command.runId ?? null,
    viewportClass: command.viewportClass ?? null,
  });
  const existingEvent = await readIdempotencyEvent(database, {
    userId: context.userId,
    workspaceId: context.workspaceId,
    mutationId: command.mutationId,
  });
  if (existingEvent) {
    if (existingEvent.request_fingerprint !== requestFingerprint) {
      return {
        status: "conflict",
        code: "ONBOARDING_MUTATION_REUSED",
        state: current,
      };
    }
    return {
      status: "idempotent",
      state: current as OnboardingFlowState,
      runId: existingEvent.run_id,
    };
  }
  if (command.expectedRevision !== (current?.revision ?? null)) {
    return {
      status: "conflict",
      code: "ONBOARDING_STATE_CONFLICT",
      state: current,
    };
  }
  const continuationCommand =
    command.command === "resume"
    || command.command === "advance"
    || command.command === "pause"
    || command.command === "dismiss"
    || command.command === "complete";
  const binding = continuationCommand
    ? await getOnboardingFlowRunBinding(database, {
        userId: context.userId,
        workspaceId: context.workspaceId,
        flowKey: command.flowKey,
        flowVersion: definition.version,
      })
    : null;
  if (
    continuationCommand
    && (
      !current
      || !binding
      || binding.state.revision !== current.revision
      || command.runId !== binding.runId
      || command.expectedStepKey !== current.currentStepKey
    )
  ) {
    return {
      status: "conflict",
      code: "ONBOARDING_STATE_CONFLICT",
      state: current,
    };
  }
  if (
    command.expectedTutorialBinding !== undefined
    && !bindingsEqual(command.expectedTutorialBinding, current?.tutorialBinding)
  ) {
    return {
      status: "conflict",
      code: "ONBOARDING_STATE_CONFLICT",
      state: current,
    };
  }
  if (
    command.flowKey === "guided_estimate_practice"
    && !current?.tutorialBinding
    && !context.tutorialBinding
  ) {
    return {
      status: "conflict",
      code: "ONBOARDING_TUTORIAL_BINDING_REQUIRED",
      state: current,
    };
  }
  if (
    command.command === "complete"
    && command.flowKey === "guided_estimate_practice"
    && !context.guidedPracticeComplete
  ) {
    return {
      status: "conflict",
      code: "ONBOARDING_PRACTICE_INCOMPLETE",
      state: current,
    };
  }
  if (
    command.command === "complete"
    && (
      command.flowKey === "first_estimate_value"
      || command.flowKey === "guided_estimate_practice"
      || command.flowKey === "client_link_publishing"
      || command.flowKey === "library_reuse"
    )
  ) {
    return {
      status: "conflict",
      code: "ONBOARDING_DOMAIN_PROOF_REQUIRED",
      state: current,
    };
  }
  const transition = legalTransition(current, command, eligibleStepKeys);
  if (!transition) {
    return {
      status: "conflict",
      code: "ONBOARDING_ILLEGAL_TRANSITION",
      state: current,
    };
  }
  const occurredAt = new Date().toISOString();
  const runId = command.command === "start"
    || command.command === "replay"
    || command.command === "restart"
    ? randomUUID()
    : binding?.runId;
  if (!runId) {
    return {
      status: "conflict",
      code: "ONBOARDING_STATE_CONFLICT",
      state: current,
    };
  }
  const statements: D1PreparedStatementLike[] = [];
  let nextRevision: number;

  if (!current) {
    const binding = context.tutorialBinding ?? null;
    nextRevision = 0;
    statements.push(
      database.prepare(`
        INSERT INTO beta_onboarding_flow_states (
          user_id, workspace_id, flow_key, flow_version, generation,
          tutorial_version, tutorial_generation, status, current_step_key,
          revision, reset_count, started_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 1, ?, ?, 'in_progress', ?, 0, 0, ?, ?, ?)
        ON CONFLICT(user_id, workspace_id, flow_key, flow_version) DO NOTHING
      `).bind(
        context.userId,
        context.workspaceId,
        command.flowKey,
        definition.version,
        binding?.version ?? null,
        binding?.generation ?? null,
        transition.nextStepKey,
        occurredAt,
        occurredAt,
        occurredAt,
      ),
    );
  } else if (command.command === "replay") {
    nextRevision = current.revision;
  } else {
    nextRevision = current.revision + 1;
    statements.push(
      transitionStatement(database, {
        context,
        command,
        current,
        flowVersion: definition.version,
        nextStatus: transition.nextStatus,
        nextStepKey: transition.nextStepKey,
        occurredAt,
        incrementGeneration: transition.incrementGeneration,
        incrementResetCount: transition.incrementResetCount,
      }),
    );
  }

  statements.push(
    prepareEventInsert(database, {
      context: {
        ...context,
        resourceId: continuationCommand
          ? binding?.resourceId ?? null
          : context.resourceId ?? null,
      },
      command,
      flowVersion: definition.version,
      eventType: MUTATING_EVENT[command.command],
      runId,
      requestFingerprint,
      occurredAt,
      stateRevision: nextRevision,
      requirePreviousChange: command.command !== "replay",
    }),
  );
  if (command.selectedPath) {
    statements.push(
      prepareSelectedPathUpsert(database, {
        userId: context.userId,
        workspaceId: context.workspaceId,
        selectedPath: command.selectedPath,
        occurredAt,
      }),
    );
  }
  const results = await database.batch(statements);
  if (results.some((result) => result.success === false)) {
    throw new OnboardingFlowRepositoryError(
      "onboarding_write_failed",
      "Onboarding mutation failed.",
    );
  }
  const mutationIndex = command.command === "replay" ? 0 : 0;
  const eventIndex = command.command === "replay" ? 0 : 1;
  if (
    command.command !== "replay"
    && (results[mutationIndex]?.meta?.changes ?? 0) !== 1
  ) {
    return {
      status: "conflict",
      code: "ONBOARDING_STATE_CONFLICT",
      state: await getOnboardingFlowState(database, {
        ...context,
        flowKey: command.flowKey,
        flowVersion: definition.version,
      }),
    };
  }
  if ((results[eventIndex]?.meta?.changes ?? 0) !== 1) {
    const retryEvent = await readIdempotencyEvent(database, {
      userId: context.userId,
      workspaceId: context.workspaceId,
      mutationId: command.mutationId,
    });
    if (retryEvent?.request_fingerprint === requestFingerprint) {
      const state = await getOnboardingFlowState(database, {
        ...context,
        flowKey: command.flowKey,
        flowVersion: definition.version,
      });
      return {
        status: "idempotent",
        state: state as OnboardingFlowState,
        runId: retryEvent.run_id,
      };
    }
    return {
      status: "conflict",
      code: "ONBOARDING_STATE_CONFLICT",
      state: await getOnboardingFlowState(database, {
        ...context,
        flowKey: command.flowKey,
        flowVersion: definition.version,
      }),
    };
  }
  const state = await getOnboardingFlowState(database, {
    ...context,
    flowKey: command.flowKey,
    flowVersion: definition.version,
  });
  if (!state) {
    throw new OnboardingFlowRepositoryError(
      "onboarding_write_failed",
      "Onboarding state was not readable after mutation.",
    );
  }
  return { status: "applied", state, runId };
}

export async function resetAllGuidance(
  database: D1DatabaseLike | null | undefined,
  context: { userId: string; workspaceId: string },
  input: {
    mutationId: string;
    expectedRevisions: Readonly<Partial<Record<OnboardingFlowKey, number>>>;
    flowKeys: readonly OnboardingFlowKey[];
  },
): Promise<ResetAllGuidanceResult> {
  if (!database?.batch) {
    throw new OnboardingFlowRepositoryError(
      "onboarding_database_unavailable",
      "Onboarding reset requires D1 batch support.",
    );
  }
  validateIdentity(context);
  requireText(input.mutationId, "a mutation id");
  const current = (await listOnboardingFlowStates(database, context)).filter((state) => {
    const definition = getOnboardingFlowDefinition(state.flowKey);
    return state.flowVersion === definition.version
      && input.flowKeys.includes(state.flowKey);
  });
  if (current.length === 0) return { status: "applied", states: [] };
  const expected = Object.fromEntries(
    current.map((state) => [state.flowKey, input.expectedRevisions[state.flowKey] ?? null]),
  );
  const requestFingerprint = fingerprint({
    command: "reset_all",
    flowKeys: [...input.flowKeys].sort(),
    expected,
  });
  const existing = await readIdempotencyEvent(database, {
    ...context,
    mutationId: `${input.mutationId}:${current[0]?.flowKey}`,
  });
  if (existing) {
    return existing.request_fingerprint === requestFingerprint
      ? { status: "idempotent", states: await listOnboardingFlowStates(database, context) }
      : { status: "conflict", states: current };
  }
  if (current.some((state) => input.expectedRevisions[state.flowKey] !== state.revision)) {
    return { status: "conflict", states: current };
  }
  const occurredAt = new Date().toISOString();
  const runId = randomUUID();
  const currentGuards = current
    .map(() => "(flow_key = ? AND flow_version = ? AND revision = ?)")
    .join(" OR ");
  const currentGuardValues = current.flatMap((state) => [
    state.flowKey,
    state.flowVersion,
    state.revision,
  ]);
  const nextGuards = current
    .map(() => "(flow_key = ? AND flow_version = ? AND revision = ?)")
    .join(" OR ");
  const nextGuardValues = current.flatMap((state) => [
    state.flowKey,
    state.flowVersion,
    state.revision + 1,
  ]);
  const statements = [
    database.prepare(`
      UPDATE beta_onboarding_flow_states
      SET generation = generation + 1,
          status = 'not_started',
          current_step_key = NULL,
          revision = revision + 1,
          reset_count = reset_count + 1,
          started_at = NULL,
          last_resumed_at = NULL,
          last_paused_at = NULL,
          completed_at = NULL,
          dismissed_at = NULL,
          last_reset_at = ?,
          updated_at = ?
      WHERE user_id = ?
        AND workspace_id = ?
        AND (${currentGuards})
        AND (
          SELECT COUNT(*)
          FROM beta_onboarding_flow_states guarded
          WHERE guarded.user_id = ?
            AND guarded.workspace_id = ?
            AND (${currentGuards})
        ) = ?
    `).bind(
      occurredAt,
      occurredAt,
      context.userId,
      context.workspaceId,
      ...currentGuardValues,
      context.userId,
      context.workspaceId,
      ...currentGuardValues,
      current.length,
    ),
    database.prepare(`
      INSERT INTO beta_onboarding_flow_events (
        id, user_id, workspace_id, flow_key, flow_version, generation,
        tutorial_version, tutorial_generation, run_id, launch_mode,
        event_type, source, idempotency_key, request_fingerprint,
        state_revision, occurred_at, ingested_at
      )
      SELECT
        ? || ':' || flow_key,
        user_id,
        workspace_id,
        flow_key,
        flow_version,
        generation,
        tutorial_version,
        tutorial_generation,
        ?,
        'settings',
        'all_guidance_reset',
        'user_command',
        ? || ':' || flow_key,
        ?,
        revision,
        ?,
        ?
      FROM beta_onboarding_flow_states
      WHERE user_id = ?
        AND workspace_id = ?
        AND (${nextGuards})
        AND changes() = ?
    `).bind(
      randomUUID(),
      runId,
      input.mutationId,
      requestFingerprint,
      occurredAt,
      occurredAt,
      context.userId,
      context.workspaceId,
      ...nextGuardValues,
      current.length,
    ),
  ];
  const results = await database.batch(statements);
  if (results.some((result) => result.success === false)) {
    throw new OnboardingFlowRepositoryError(
      "onboarding_write_failed",
      "Guidance reset failed.",
    );
  }
  const allApplied = (results[0]?.meta?.changes ?? 0) === current.length
    && (results[1]?.meta?.changes ?? 0) === current.length;
  return {
    status: allApplied ? "applied" : "conflict",
    states: await listOnboardingFlowStates(database, context),
  };
}

export async function completeOnboardingFlowFromDomainProof(
  database: D1DatabaseLike | null | undefined,
  input: {
    userId: string;
    workspaceId: string;
    flowKey:
      | "client_link_publishing"
      | "first_estimate_value"
      | "guided_estimate_practice"
      | "library_reuse";
    expectedRevision: number;
    runId: string;
    mutationId: string;
    source: "publication_domain" | "non_starter_domain" | "tutorial_practice";
    stepKey: OnboardingStepKey;
    routeKey: OnboardingRouteIntent;
  },
): Promise<OnboardingDomainCompletionResult> {
  if (!database?.batch) {
    throw new OnboardingFlowRepositoryError(
      "onboarding_database_unavailable",
      "Onboarding domain completion requires D1 batch support.",
    );
  }
  validateIdentity(input);
  requireText(input.runId, "a run id");
  requireText(input.mutationId, "a mutation id");
  const validDomainContract = input.flowKey === "client_link_publishing"
    ? input.source === "publication_domain"
      && input.stepKey === "client_links_verify"
      && input.routeKey === "client_links"
    : input.flowKey === "library_reuse"
      ? input.source === "non_starter_domain"
      : input.flowKey === "first_estimate_value"
        ? input.source === "non_starter_domain"
          && input.stepKey === "total_and_save"
          && input.routeKey === "estimate_sheet"
        : input.source === "tutorial_practice"
          && (
            input.stepKey === "practice_price_and_save"
            || input.stepKey === "practice_add_and_source"
          )
          && input.routeKey === "estimate_sheet";
  if (
    !isClosedValue(ONBOARDING_STEP_KEYS, input.stepKey)
    || !isClosedValue(ONBOARDING_ROUTE_INTENTS, input.routeKey)
    || !validDomainContract
  ) {
    throw new OnboardingFlowRepositoryError(
      "onboarding_invalid_input",
      "Onboarding domain completion contains a value outside the closed contract.",
    );
  }

  const definition = getOnboardingFlowDefinition(input.flowKey);
  const binding = await getOnboardingFlowRunBinding(database, {
    userId: input.userId,
    workspaceId: input.workspaceId,
    flowKey: input.flowKey,
    flowVersion: definition.version,
  });
  const current = binding?.state ?? null;
  const requestFingerprint = fingerprint({
    command: "domain_complete",
    expectedRevision: input.expectedRevision,
    flowKey: input.flowKey,
    flowVersion: definition.version,
    routeKey: input.routeKey,
    runId: input.runId,
    resourceId: binding?.resourceId ?? null,
    source: input.source,
    stepKey: input.stepKey,
  });
  const existingEvent = await readIdempotencyEvent(database, {
    userId: input.userId,
    workspaceId: input.workspaceId,
    mutationId: input.mutationId,
  });
  if (existingEvent) {
    return {
      status: "conflict",
      code: existingEvent.request_fingerprint === requestFingerprint
        ? "ONBOARDING_ALREADY_COMPLETED"
        : "ONBOARDING_MUTATION_REUSED",
      state: current,
    };
  }
  if (current?.status === "completed") {
    return {
      status: "conflict",
      code: "ONBOARDING_ALREADY_COMPLETED",
      state: current,
    };
  }
  if (
    !binding
    || !current
    || current.status !== "in_progress"
    || current.revision !== input.expectedRevision
  ) {
    return {
      status: "conflict",
      code: "ONBOARDING_STATE_CONFLICT",
      state: current,
    };
  }
  if (binding.runId !== input.runId) {
    return {
      status: "conflict",
      code: "ONBOARDING_DOMAIN_BINDING_MISMATCH",
      state: current,
    };
  }
  const proofSatisfied = input.flowKey === "client_link_publishing"
    ? true
    : input.flowKey === "guided_estimate_practice"
      ? await hasCurrentTutorialPracticeCompletion(database, input)
      : input.flowKey === "library_reuse"
        ? (await database.prepare<{ matches: number }>(`
            SELECT EXISTS (
              SELECT 1
              FROM beta_onboarding_flow_events event
              WHERE event.user_id = ?
                AND event.workspace_id = ?
                AND event.flow_key = 'library_reuse'
                AND event.flow_version = ?
                AND event.generation = ?
                AND event.run_id = ?
                AND event.event_type = 'practice_action_completed'
                AND event.source = 'non_starter_domain'
                AND event.step_key = 'library_sources'
            ) AS matches
          `).bind(
            input.userId,
            input.workspaceId,
            definition.version,
            current.generation,
            binding.runId,
          ).first<{ matches: number }>())?.matches === 1
        : binding.resourceId !== null
          && (await database.prepare<{ matches: number }>(`
              SELECT EXISTS (
                SELECT 1
                FROM beta_activation_events activation
                WHERE activation.user_id = ?
                  AND activation.workspace_id = ?
                  AND activation.estimate_id = ?
                  AND activation.origin_class = 'user_domain'
                  AND activation.milestone = 'first_valid_total'
              ) AS matches
            `).bind(
              input.userId,
              input.workspaceId,
              binding.resourceId,
            ).first<{ matches: number }>())?.matches === 1;
  if (!proofSatisfied) {
    return {
      status: "conflict",
      code: "ONBOARDING_DOMAIN_BINDING_MISMATCH",
      state: current,
    };
  }

  const occurredAt = new Date().toISOString();
  const nextRevision = current.revision + 1;
  const results = await database.batch([
    database.prepare(`
      UPDATE beta_onboarding_flow_states
      SET status = 'completed',
          current_step_key = NULL,
          revision = revision + 1,
          completed_at = ?,
          updated_at = ?
      WHERE user_id = ?
        AND workspace_id = ?
        AND flow_key = ?
        AND flow_version = ?
        AND generation = ?
        AND revision = ?
        AND status = 'in_progress'
    `).bind(
      occurredAt,
      occurredAt,
      input.userId,
      input.workspaceId,
      input.flowKey,
      definition.version,
      current.generation,
      current.revision,
    ),
    database.prepare(`
      INSERT INTO beta_onboarding_flow_events (
        id, user_id, workspace_id, flow_key, flow_version, generation,
        tutorial_version, tutorial_generation, run_id, launch_mode, step_key,
        event_type, source, route_key, idempotency_key, request_fingerprint,
        state_revision, occurred_at, ingested_at
      )
      SELECT
        ?, state.user_id, state.workspace_id, state.flow_key, state.flow_version,
        state.generation, state.tutorial_version, state.tutorial_generation,
        ?, 'task', ?, 'flow_completed', ?, ?, ?, ?, state.revision, ?, ?
      FROM beta_onboarding_flow_states state
      WHERE state.user_id = ?
        AND state.workspace_id = ?
        AND state.flow_key = ?
        AND state.flow_version = ?
        AND state.revision = ?
        AND state.status = 'completed'
        AND changes() = 1
      ON CONFLICT(user_id, workspace_id, idempotency_key) DO NOTHING
    `).bind(
      randomUUID(),
      input.runId,
      input.stepKey,
      input.source,
      input.routeKey,
      input.mutationId,
      requestFingerprint,
      occurredAt,
      occurredAt,
      input.userId,
      input.workspaceId,
      input.flowKey,
      definition.version,
      nextRevision,
    ),
  ]);
  if (results.some((result) => result.success === false)) {
    throw new OnboardingFlowRepositoryError(
      "onboarding_write_failed",
      "Onboarding domain completion failed.",
    );
  }
  if (
    (results[0]?.meta?.changes ?? 0) !== 1
    || (results[1]?.meta?.changes ?? 0) !== 1
  ) {
    return {
      status: "conflict",
      code: "ONBOARDING_STATE_CONFLICT",
      state: await getOnboardingFlowState(database, {
        userId: input.userId,
        workspaceId: input.workspaceId,
        flowKey: input.flowKey,
        flowVersion: definition.version,
      }),
    };
  }
  const state = await getOnboardingFlowState(database, {
    userId: input.userId,
    workspaceId: input.workspaceId,
    flowKey: input.flowKey,
    flowVersion: definition.version,
  });
  if (!state) {
    throw new OnboardingFlowRepositoryError(
      "onboarding_write_failed",
      "Completed onboarding state was not readable.",
    );
  }
  return { status: "applied", state };
}

export async function recordOnboardingDomainEvent(
  database: D1DatabaseLike | null | undefined,
  input: {
    userId: string;
    workspaceId: string;
    flowKey: OnboardingFlowKey;
    eventType: OnboardingEventType;
    source: Extract<
      OnboardingEventSource,
      "starter_seed" | "tutorial_seed" | "tutorial_practice"
      | "non_starter_domain" | "publication_domain" | "system"
    >;
    idempotencyKey: string;
    runId?: string;
    stepKey?: OnboardingStepKey | null;
    tutorialBinding?: TutorialBinding | null;
    occurredAt?: string;
  },
): Promise<{ status: "recorded" | "already_recorded" | "binding_mismatch" }> {
  if (!database) {
    throw new OnboardingFlowRepositoryError(
      "onboarding_database_unavailable",
      "Onboarding event recording requires D1.",
    );
  }
  validateIdentity(input);
  requireText(input.idempotencyKey, "an idempotency key");
  if (
    !isClosedValue(ONBOARDING_EVENT_TYPES, input.eventType)
    || !isClosedValue(ONBOARDING_EVENT_SOURCES, input.source)
    || (
      input.stepKey !== undefined
      && input.stepKey !== null
      && !isClosedValue(ONBOARDING_STEP_KEYS, input.stepKey)
    )
  ) {
    throw new OnboardingFlowRepositoryError(
      "onboarding_invalid_input",
      "Onboarding event contains a value outside the closed contract.",
    );
  }
  const definition = getOnboardingFlowDefinition(input.flowKey);
  let state = await getOnboardingFlowState(database, {
    ...input,
    flowVersion: definition.version,
  });
  const durableChecklistFact =
    input.source === "non_starter_domain"
    && input.eventType === "step_completed"
    && (
      input.flowKey === "core_orientation"
      || input.flowKey === "first_estimate_value"
    );
  if (!state && durableChecklistFact) {
    const occurredAt = input.occurredAt ?? new Date().toISOString();
    await database.prepare(`
      INSERT INTO beta_onboarding_flow_states (
        user_id, workspace_id, flow_key, flow_version, generation, status,
        current_step_key, revision, reset_count, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 1, 'not_started', NULL, 0, 0, ?, ?)
      ON CONFLICT(user_id, workspace_id, flow_key, flow_version) DO NOTHING
    `).bind(
      input.userId,
      input.workspaceId,
      input.flowKey,
      definition.version,
      occurredAt,
      occurredAt,
    ).run();
    state = await getOnboardingFlowState(database, {
      ...input,
      flowVersion: definition.version,
    });
  }
  if (!state) return { status: "binding_mismatch" };
  const bindingRequired = input.source === "tutorial_seed"
    || input.source === "tutorial_practice";
  if (
    bindingRequired
    && (
      input.flowKey !== "guided_estimate_practice"
      || !bindingsEqual(input.tutorialBinding, state.tutorialBinding)
    )
  ) {
    return { status: "binding_mismatch" };
  }
  if (
    input.flowKey === "client_link_publishing"
    && (state.tutorialBinding || input.tutorialBinding)
  ) {
    return { status: "binding_mismatch" };
  }
  const occurredAt = input.occurredAt ?? new Date().toISOString();
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
      AND flow_key = ?
      AND flow_version = ?
      AND revision = ?
      AND (? IS NULL OR tutorial_version = ?)
      AND (? IS NULL OR tutorial_generation = ?)
    ON CONFLICT(user_id, workspace_id, idempotency_key) DO NOTHING
  `).bind(
    randomUUID(),
    input.runId ?? randomUUID(),
    input.stepKey ?? null,
    input.eventType,
    input.source,
    input.idempotencyKey,
    occurredAt,
    occurredAt,
    input.userId,
    input.workspaceId,
    input.flowKey,
    definition.version,
    state.revision,
    input.tutorialBinding?.version ?? null,
    input.tutorialBinding?.version ?? null,
    input.tutorialBinding?.generation ?? null,
    input.tutorialBinding?.generation ?? null,
  ).run();
  if (result.success === false) {
    throw new OnboardingFlowRepositoryError(
      "onboarding_write_failed",
      "Onboarding event write failed.",
    );
  }
  return {
    status: (result.meta?.changes ?? 0) === 1 ? "recorded" : "already_recorded",
  };
}

export async function hasCurrentTutorialPracticeCompletion(
  database: D1DatabaseLike | null | undefined,
  input: { userId: string; workspaceId: string },
): Promise<boolean> {
  if (!database) return false;
  const state = await getOnboardingFlowState(database, {
    ...input,
    flowKey: "guided_estimate_practice",
  });
  if (!state?.tutorialBinding) return false;
  const row = await database.prepare<{ complete: number }>(`
    SELECT CASE WHEN
      EXISTS (
        SELECT 1
        FROM beta_onboarding_flow_events event
        WHERE event.user_id = state.user_id
          AND event.workspace_id = state.workspace_id
          AND event.flow_key = state.flow_key
          AND event.flow_version = state.flow_version
          AND event.generation = state.generation
          AND event.tutorial_version = state.tutorial_version
          AND event.tutorial_generation = state.tutorial_generation
          AND event.source = 'tutorial_practice'
          AND event.event_type = 'practice_action_completed'
          AND event.step_key = 'practice_price_and_save'
      )
      AND EXISTS (
        SELECT 1
        FROM beta_onboarding_flow_events event
        WHERE event.user_id = state.user_id
          AND event.workspace_id = state.workspace_id
          AND event.flow_key = state.flow_key
          AND event.flow_version = state.flow_version
          AND event.generation = state.generation
          AND event.tutorial_version = state.tutorial_version
          AND event.tutorial_generation = state.tutorial_generation
          AND event.source = 'tutorial_practice'
          AND event.event_type = 'practice_action_completed'
          AND event.step_key = 'practice_add_and_source'
      )
      THEN 1 ELSE 0 END AS complete
    FROM beta_onboarding_flow_states state
    WHERE state.user_id = ?
      AND state.workspace_id = ?
      AND state.flow_key = 'guided_estimate_practice'
      AND state.flow_version = ?
    LIMIT 1
  `).bind(
    input.userId,
    input.workspaceId,
    state.flowVersion,
  ).first<{ complete: number }>();
  return row?.complete === 1;
}

export type OnboardingChecklistActionFact = {
  family:
    | "project_blank_created"
    | "project_duplicated"
    | "project_template_derived"
    | "estimate_blank_created"
    | "estimate_duplicated"
    | "estimate_template_instantiated"
    | "estimate_area_added"
    | "estimate_row_added"
    | "estimate_component_inserted"
    | "estimate_quantity_changed"
    | "estimate_unit_cost_changed"
    | "estimate_adjustment_changed"
    | "estimate_misc_cost_changed";
  originClass: ActivationOriginClass;
  authoritativeWriteSucceeded: boolean;
  authoritativeReadbackConfirmed: boolean;
  staleOrRolledBack: boolean;
};

export function isQualifyingChecklistActionFact(
  fact: OnboardingChecklistActionFact,
): boolean {
  return fact.originClass === "user_domain"
    && fact.authoritativeWriteSucceeded
    && fact.authoritativeReadbackConfirmed
    && !fact.staleOrRolledBack;
}

export async function importExistingOnboardingState(
  database: D1DatabaseLike | null | undefined,
  input: { userId: string; workspaceId: string },
): Promise<void> {
  if (!database?.batch) return;
  validateIdentity(input);
  const valueFlow = getOnboardingFlowDefinition("first_estimate_value");
  const valueBinding = await getOnboardingFlowRunBinding(database, {
    userId: input.userId,
    workspaceId: input.workspaceId,
    flowKey: valueFlow.key,
    flowVersion: valueFlow.version,
  });
  const intendedEstimateId = valueBinding?.resourceId ?? null;
  const evidence = await database.prepare<ImportEvidenceRow>(`
    WITH target_estimate(estimate_id) AS (SELECT ?)
    SELECT
      EXISTS (
        SELECT 1 FROM beta_activation_progress
        WHERE user_id = ? AND workspace_id = ?
      ) AS progress_exists,
      EXISTS (
        SELECT 1 FROM beta_activation_events
        WHERE user_id = ? AND workspace_id = ?
          AND origin_class = 'user_domain'
          AND milestone = 'project_created'
      ) AS has_project,
      EXISTS (
        SELECT 1 FROM beta_activation_events
        WHERE user_id = ? AND workspace_id = ?
          AND origin_class = 'user_domain'
          AND milestone = 'first_area_created'
          AND (
            (SELECT estimate_id FROM target_estimate) IS NULL
            OR estimate_id = (SELECT estimate_id FROM target_estimate)
          )
      ) AS has_area,
      EXISTS (
        SELECT 1 FROM beta_activation_events
        WHERE user_id = ? AND workspace_id = ?
          AND origin_class = 'user_domain'
          AND milestone = 'first_row_priced'
          AND (
            (SELECT estimate_id FROM target_estimate) IS NULL
            OR estimate_id = (SELECT estimate_id FROM target_estimate)
          )
      ) AS has_priced_row,
      EXISTS (
        SELECT 1 FROM beta_activation_events
        WHERE user_id = ? AND workspace_id = ?
          AND origin_class = 'user_domain'
          AND milestone = 'first_valid_total'
          AND (
            (SELECT estimate_id FROM target_estimate) IS NULL
            OR estimate_id = (SELECT estimate_id FROM target_estimate)
          )
      ) AS has_valid_total
  `).bind(
    intendedEstimateId,
    input.userId, input.workspaceId,
    input.userId, input.workspaceId,
    input.userId, input.workspaceId,
    input.userId, input.workspaceId,
    input.userId, input.workspaceId,
  ).first<ImportEvidenceRow>();
  if (!evidence?.progress_exists) return;
  const now = new Date().toISOString();
  const statements: D1PreparedStatementLike[] = [];
  const orientation = getOnboardingFlowDefinition("core_orientation");
  statements.push(
    database.prepare(`
      INSERT INTO beta_onboarding_flow_states (
        user_id, workspace_id, flow_key, flow_version, generation, status,
        current_step_key, revision, reset_count, started_at, completed_at,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, 1, 'completed', NULL, 0, 0, ?, ?, ?, ?)
      ON CONFLICT(user_id, workspace_id, flow_key, flow_version) DO NOTHING
    `).bind(
      input.userId,
      input.workspaceId,
      orientation.key,
      orientation.version,
      now,
      now,
      now,
      now,
    ),
    database.prepare(`
      INSERT INTO beta_onboarding_flow_events (
        id, user_id, workspace_id, flow_key, flow_version, generation, run_id,
        launch_mode, event_type, source, idempotency_key, state_revision,
        occurred_at, ingested_at
      )
      SELECT ?, user_id, workspace_id, flow_key, flow_version, generation, ?,
             'migration', 'state_imported', 'migration', ?, revision, ?, ?
      FROM beta_onboarding_flow_states
      WHERE user_id = ? AND workspace_id = ? AND flow_key = ? AND flow_version = ?
      ON CONFLICT(user_id, workspace_id, idempotency_key) DO NOTHING
    `).bind(
      randomUUID(),
      randomUUID(),
      `migration:${orientation.key}:${orientation.version}`,
      now,
      now,
      input.userId,
      input.workspaceId,
      orientation.key,
      orientation.version,
    ),
  );
  if (
    evidence.has_project
    || evidence.has_area
    || evidence.has_priced_row
    || evidence.has_valid_total
  ) {
    const completed = evidence.has_valid_total === 1;
    const currentStep = completed
      ? null
      : evidence.has_priced_row
        ? "total_and_save"
        : evidence.has_area
          ? "add_priced_row"
          : "hierarchy";
    statements.push(
      database.prepare(`
        INSERT INTO beta_onboarding_flow_states (
          user_id, workspace_id, flow_key, flow_version, generation, status,
          current_step_key, revision, reset_count, started_at, completed_at,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, 1, ?, ?, 0, 0, ?, ?, ?, ?)
        ON CONFLICT(user_id, workspace_id, flow_key, flow_version) DO UPDATE SET
          status = 'completed',
          current_step_key = NULL,
          revision = beta_onboarding_flow_states.revision + 1,
          completed_at = COALESCE(beta_onboarding_flow_states.completed_at, excluded.completed_at),
          updated_at = excluded.updated_at
        WHERE excluded.status = 'completed'
          AND beta_onboarding_flow_states.status <> 'completed'
      `).bind(
        input.userId,
        input.workspaceId,
        valueFlow.key,
        valueFlow.version,
        completed ? "completed" : "in_progress",
        currentStep,
        now,
        completed ? now : null,
        now,
        now,
      ),
      database.prepare(`
        INSERT INTO beta_onboarding_flow_events (
          id, user_id, workspace_id, flow_key, flow_version, generation, run_id,
          launch_mode, step_key, event_type, source, idempotency_key,
          state_revision, occurred_at, ingested_at
        )
        SELECT ?, user_id, workspace_id, flow_key, flow_version, generation, ?,
               'migration', current_step_key, 'state_imported', 'migration', ?,
               revision, ?, ?
        FROM beta_onboarding_flow_states
        WHERE user_id = ? AND workspace_id = ? AND flow_key = ? AND flow_version = ?
        ON CONFLICT(user_id, workspace_id, idempotency_key) DO NOTHING
      `).bind(
        randomUUID(),
        randomUUID(),
        `migration:${valueFlow.key}:${valueFlow.version}`,
        now,
        now,
        input.userId,
        input.workspaceId,
        valueFlow.key,
        valueFlow.version,
      ),
      ...(completed ? [database.prepare(`
        INSERT INTO beta_onboarding_flow_events (
          id, user_id, workspace_id, flow_key, flow_version, generation, run_id,
          launch_mode, step_key, event_type, source, route_key, idempotency_key,
          state_revision, occurred_at, ingested_at
        )
        SELECT ?, state.user_id, state.workspace_id, state.flow_key,
               state.flow_version, state.generation, ?, 'task', 'total_and_save',
               'flow_completed', 'non_starter_domain', 'estimate_sheet', ?,
               state.revision, ?, ?
        FROM beta_onboarding_flow_states state
        WHERE state.user_id = ? AND state.workspace_id = ?
          AND state.flow_key = ? AND state.flow_version = ?
          AND state.status = 'completed'
          AND EXISTS (
            SELECT 1
            FROM beta_activation_events activation
            WHERE activation.user_id = state.user_id
              AND activation.workspace_id = state.workspace_id
              AND activation.origin_class = 'user_domain'
              AND activation.milestone = 'first_valid_total'
              AND (? IS NULL OR activation.estimate_id = ?)
          )
        ON CONFLICT(user_id, workspace_id, idempotency_key) DO NOTHING
      `).bind(
        randomUUID(),
        randomUUID(),
        `domain:first-valid-total:${valueFlow.version}`,
        now,
        now,
        input.userId,
        input.workspaceId,
        valueFlow.key,
        valueFlow.version,
        intendedEstimateId,
        intendedEstimateId,
      )] : []),
    );
  }
  const results = await database.batch(statements);
  if (results.some((result) => result.success === false)) {
    throw new OnboardingFlowRepositoryError(
      "onboarding_write_failed",
      "Existing onboarding state import failed.",
    );
  }
}
