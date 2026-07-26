import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  D1DatabaseLike,
  D1PreparedStatementLike,
  D1Result,
  D1Value,
} from "@/lib/cloudflare/d1";
import type { OnboardingMutationCommand } from "@/lib/onboarding/flow-repository";
import { STARTER_PACK_VERSION } from "@/lib/onboarding/starter-pack";

const authMocks = vi.hoisted(() => ({
  requireCurrentUserContext: vi.fn(),
}));
const d1Mocks = vi.hoisted(() => ({
  getCloudflareD1Database: vi.fn(),
}));
const eligibilityMocks = vi.hoisted(() => ({
  getEligibleOnboardingFlows: vi.fn(),
}));
const flowRepositoryMocks = vi.hoisted(() => ({
  getOnboardingFlowRunBinding: vi.fn(),
  hasCurrentTutorialPracticeCompletion: vi.fn(),
  importExistingOnboardingState: vi.fn(),
  listOnboardingFlowStates: vi.fn(),
  listStarterAssetClaims: vi.fn(),
  listStarterPackStates: vi.fn(),
  mutateOnboardingFlow: vi.fn(),
  resetAllGuidance: vi.fn(),
}));
const activationMocks = vi.hoisted(() => ({
  getActivationProgress: vi.fn(),
}));
const libraryMocks = vi.hoisted(() => ({
  readLibraryLearningPredicates: vi.fn(),
}));
const practiceMocks = vi.hoisted(() => ({
  readGuidedPracticePredicates: vi.fn(),
}));

vi.mock("react", () => ({
  cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}));
vi.mock("@/lib/auth/session", () => authMocks);
vi.mock("@/lib/cloudflare/d1", () => d1Mocks);
vi.mock("@/lib/onboarding/flow-eligibility", () => eligibilityMocks);
vi.mock("@/lib/onboarding/flow-repository", () => flowRepositoryMocks);
vi.mock("@/lib/onboarding/activation-repository", () => activationMocks);
vi.mock("@/lib/onboarding/library-learning", () => libraryMocks);
vi.mock("@/lib/onboarding/estimate-practice", () => practiceMocks);

import {
  loadCurrentOnboardingEligibilitySnapshot,
  mutateCurrentOnboardingFlow,
} from "@/lib/onboarding/flow-actions";

type AccessibleWorkspace = {
  workspace_id: string;
  workspace_created_by: string | null;
  workspace_role: "owner" | "admin" | "member" | "viewer" | null;
  access_source: "workspace" | "project" | "estimate";
  effective_role: "owner" | "admin" | "editor" | "member" | "viewer";
  project_id: string | null;
  estimate_id: string | null;
};

class ActionStatement<T = Record<string, unknown>>
  implements D1PreparedStatementLike<T>
{
  private values: D1Value[] = [];

  constructor(
    private readonly database: ActionDatabase,
    private readonly sql: string,
  ) {}

  bind(...values: D1Value[]) {
    this.values = values;
    return this;
  }

  async first<R = T>(): Promise<R | null> {
    this.database.firstCalls.push({ sql: this.sql, values: this.values });
    if (this.sql.includes("WITH accessible AS")) {
      return this.database.accessibleWorkspace as R | null;
    }
    if (this.sql.includes("AS project_started")) {
      return {
        estimate_started: 0,
        first_area_created: 0,
        first_row_priced: 0,
        first_valid_total_reached: 0,
        project_started: 0,
      } as R;
    }
    if (this.sql.includes("manageable_client_link_project")) {
      return { manageable_client_link_project: 0 } as R;
    }
    if (this.sql.includes("has_existing_data")) {
      return { has_existing_data: this.database.hasExistingData } as R;
    }
    if (
      this.sql.includes("AS present")
      && this.values.some((value) =>
        typeof value === "string"
        && this.database.activeStarterResourceIds.has(value)
      )
    ) {
      return { present: 1 } as R;
    }
    return null;
  }

  async all<R = T>(): Promise<D1Result<R>> {
    return { success: true, results: [] };
  }

  async run(): Promise<D1Result<T>> {
    return { success: true, meta: { changes: 0 } };
  }
}

class ActionDatabase implements D1DatabaseLike {
  accessibleWorkspace: AccessibleWorkspace | null = {
    access_source: "workspace",
    effective_role: "owner",
    estimate_id: null,
    project_id: null,
    workspace_created_by: "user-1",
    workspace_id: "workspace-1",
    workspace_role: "owner",
  };
  hasExistingData = 0;
  activeStarterResourceIds = new Set<string>();
  firstCalls: Array<{ sql: string; values: D1Value[] }> = [];

  prepare<T = Record<string, unknown>>(sql: string) {
    return new ActionStatement<T>(this, sql);
  }
}

function startCommand(
  overrides: Partial<OnboardingMutationCommand> = {},
): OnboardingMutationCommand {
  return {
    command: "start",
    expectedRevision: null,
    flowKey: "core_orientation",
    launchMode: "start",
    mutationId: "mutation-1",
    viewportClass: "desktop",
    ...overrides,
  };
}

function eligibleFlow(
  flowKey = "core_orientation",
  stepKeys = ["welcome", "projects_entry"],
) {
  return {
    definition: {
      autoStart: "first_eligible_session",
      key: flowKey,
    },
    steps: stepKeys.map((key) => ({ key })),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  authMocks.requireCurrentUserContext.mockResolvedValue({
    displayName: "User",
    email: "user@example.com",
    profile: { default_workspace_id: "workspace-1" },
    role: "member",
    userId: "user-1",
  });
  activationMocks.getActivationProgress.mockResolvedValue(null);
  libraryMocks.readLibraryLearningPredicates.mockResolvedValue({
    libraryContentAvailable: false,
    libraryReuseIncomplete: true,
  });
  practiceMocks.readGuidedPracticePredicates.mockResolvedValue({
    nonStarterTransferIncomplete: true,
    tutorialBindingCurrent: true,
    tutorialCoreIncomplete: true,
  });
  flowRepositoryMocks.getOnboardingFlowRunBinding.mockResolvedValue(null);
  flowRepositoryMocks.hasCurrentTutorialPracticeCompletion.mockResolvedValue(false);
  flowRepositoryMocks.importExistingOnboardingState.mockResolvedValue(undefined);
  flowRepositoryMocks.listOnboardingFlowStates.mockResolvedValue([]);
  flowRepositoryMocks.listStarterAssetClaims.mockResolvedValue([]);
  flowRepositoryMocks.listStarterPackStates.mockResolvedValue([]);
  flowRepositoryMocks.mutateOnboardingFlow.mockResolvedValue({
    runId: "run-1",
    state: { flowKey: "core_orientation", revision: 0 },
    status: "applied",
  });
  eligibilityMocks.getEligibleOnboardingFlows.mockReturnValue([
    eligibleFlow(),
  ]);
});

describe("onboarding starter readiness", () => {
  it.each([
    [0, "not_started"],
    [1, "explicit_add"],
  ] as const)(
    "reports %s existing workspace data as %s",
    async (hasExistingData, expectedState) => {
      const database = new ActionDatabase();
      database.hasExistingData = hasExistingData;
      d1Mocks.getCloudflareD1Database.mockResolvedValue(database);

      const current = await loadCurrentOnboardingEligibilitySnapshot();

      expect(current.starter?.state).toBe(expectedState);
      expect(current.dataPredicates).toMatchObject({
        non_starter_transfer_incomplete: true,
        tutorial_binding_current: true,
        tutorial_core_incomplete: true,
      });
    },
  );

  it("exposes the starter workspace state revision rather than the membership revision", async () => {
    const database = new ActionDatabase();
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);
    flowRepositoryMocks.listStarterPackStates.mockResolvedValue([
      {
        workspaceId: "workspace-1",
        packVersion: STARTER_PACK_VERSION,
        scopeKind: "workspace",
        scopeOwnerId: "workspace-1",
        status: "complete",
        revision: 4,
        sharedMembershipRevision: 9,
        installedAt: "2026-07-26T00:00:00.000Z",
        lastRestoredAt: null,
        createdAt: "2026-07-26T00:00:00.000Z",
        updatedAt: "2026-07-26T00:00:00.000Z",
      },
      {
        workspaceId: "workspace-1",
        packVersion: STARTER_PACK_VERSION,
        scopeKind: "user",
        scopeOwnerId: "user-1",
        status: "complete",
        revision: 2,
        sharedMembershipRevision: 9,
        installedAt: "2026-07-26T00:00:00.000Z",
        lastRestoredAt: null,
        createdAt: "2026-07-26T00:00:00.000Z",
        updatedAt: "2026-07-26T00:00:00.000Z",
      },
    ]);

    const current = await loadCurrentOnboardingEligibilitySnapshot();

    expect(current.starter).toMatchObject({
      state: "complete",
      workspaceRevision: 4,
      userRevision: 9,
    });
  });

  it("ignores inactive historical generations when the latest claim is active", async () => {
    const database = new ActionDatabase();
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);
    flowRepositoryMocks.listStarterPackStates.mockResolvedValue([
      {
        workspaceId: "workspace-1",
        packVersion: STARTER_PACK_VERSION,
        scopeKind: "workspace",
        scopeOwnerId: "workspace-1",
        status: "complete",
        revision: 5,
        sharedMembershipRevision: 3,
        installedAt: "2026-07-26T00:00:00.000Z",
        lastRestoredAt: "2026-07-26T00:10:00.000Z",
        createdAt: "2026-07-26T00:00:00.000Z",
        updatedAt: "2026-07-26T00:10:00.000Z",
      },
      {
        workspaceId: "workspace-1",
        packVersion: STARTER_PACK_VERSION,
        scopeKind: "user",
        scopeOwnerId: "user-1",
        status: "complete",
        revision: 1,
        sharedMembershipRevision: 3,
        installedAt: "2026-07-26T00:00:00.000Z",
        lastRestoredAt: null,
        createdAt: "2026-07-26T00:00:00.000Z",
        updatedAt: "2026-07-26T00:00:00.000Z",
      },
    ]);
    flowRepositoryMocks.listStarterAssetClaims.mockResolvedValue([
      {
        workspaceId: "workspace-1",
        packVersion: STARTER_PACK_VERSION,
        scopeKind: "workspace",
        scopeOwnerId: "workspace-1",
        assetKey: "component.interior_paint_finish",
        assetKind: "component",
        starterGeneration: 1,
        resourceId: "component-old",
        lifecycleState: "missing",
        createdAt: "2026-07-26T00:00:00.000Z",
        updatedAt: "2026-07-26T00:05:00.000Z",
      },
      {
        workspaceId: "workspace-1",
        packVersion: STARTER_PACK_VERSION,
        scopeKind: "workspace",
        scopeOwnerId: "workspace-1",
        assetKey: "component.interior_paint_finish",
        assetKind: "component",
        starterGeneration: 2,
        resourceId: "component-current",
        lifecycleState: "active",
        createdAt: "2026-07-26T00:10:00.000Z",
        updatedAt: "2026-07-26T00:10:00.000Z",
      },
    ]);
    database.activeStarterResourceIds.add("component-current");

    const current = await loadCurrentOnboardingEligibilitySnapshot();

    expect(current.starter).toMatchObject({
      state: "complete",
      inactiveAssetKeys: [],
    });
  });

  it("reports recovery when an active claim no longer has a live resource", async () => {
    const database = new ActionDatabase();
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);
    flowRepositoryMocks.listStarterPackStates.mockResolvedValue([
      {
        workspaceId: "workspace-1",
        packVersion: STARTER_PACK_VERSION,
        scopeKind: "workspace",
        scopeOwnerId: "workspace-1",
        status: "complete",
        revision: 6,
        sharedMembershipRevision: 2,
        installedAt: "2026-07-26T00:00:00.000Z",
        lastRestoredAt: null,
        createdAt: "2026-07-26T00:00:00.000Z",
        updatedAt: "2026-07-26T00:00:00.000Z",
      },
      {
        workspaceId: "workspace-1",
        packVersion: STARTER_PACK_VERSION,
        scopeKind: "user",
        scopeOwnerId: "user-1",
        status: "complete",
        revision: 1,
        sharedMembershipRevision: 2,
        installedAt: "2026-07-26T00:00:00.000Z",
        lastRestoredAt: null,
        createdAt: "2026-07-26T00:00:00.000Z",
        updatedAt: "2026-07-26T00:00:00.000Z",
      },
    ]);
    flowRepositoryMocks.listStarterAssetClaims.mockResolvedValue([
      {
        workspaceId: "workspace-1",
        packVersion: STARTER_PACK_VERSION,
        scopeKind: "workspace",
        scopeOwnerId: "workspace-1",
        assetKey: "project.reference",
        assetKind: "project",
        starterGeneration: 1,
        resourceId: "deleted-reference-project",
        lifecycleState: "active",
        createdAt: "2026-07-26T00:00:00.000Z",
        updatedAt: "2026-07-26T00:00:00.000Z",
      },
    ]);

    const current = await loadCurrentOnboardingEligibilitySnapshot();

    expect(current.starter).toMatchObject({
      state: "inactive_key_restore",
      inactiveAssetKeys: ["project.reference"],
    });
  });

  it("does not require a user-scoped starter state from workspace viewers", async () => {
    const database = new ActionDatabase();
    database.accessibleWorkspace = {
      access_source: "workspace",
      effective_role: "viewer",
      estimate_id: null,
      project_id: null,
      workspace_created_by: "user-2",
      workspace_id: "workspace-1",
      workspace_role: "viewer",
    };
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);
    flowRepositoryMocks.listStarterPackStates.mockResolvedValue([
      {
        workspaceId: "workspace-1",
        packVersion: STARTER_PACK_VERSION,
        scopeKind: "workspace",
        scopeOwnerId: "workspace-1",
        status: "complete",
        revision: 2,
        sharedMembershipRevision: 4,
        installedAt: "2026-07-26T00:00:00.000Z",
        lastRestoredAt: null,
        createdAt: "2026-07-26T00:00:00.000Z",
        updatedAt: "2026-07-26T00:00:00.000Z",
      },
    ]);

    const current = await loadCurrentOnboardingEligibilitySnapshot();

    expect(current.starter).toMatchObject({ state: "complete" });
  });
});

describe("mutateCurrentOnboardingFlow authorization", () => {
  it("fails closed when D1, authentication, or an accessible workspace is unavailable", async () => {
    d1Mocks.getCloudflareD1Database.mockResolvedValueOnce(null);
    await expect(
      mutateCurrentOnboardingFlow(startCommand()),
    ).rejects.toThrow("Onboarding state is unavailable.");

    const unauthenticatedDatabase = new ActionDatabase();
    d1Mocks.getCloudflareD1Database.mockResolvedValue(unauthenticatedDatabase);
    authMocks.requireCurrentUserContext.mockRejectedValue(
      new Error("NEXT_REDIRECT:/login"),
    );
    await expect(
      mutateCurrentOnboardingFlow(startCommand()),
    ).rejects.toThrow("NEXT_REDIRECT:/login");

    const workspaceMissingDatabase = new ActionDatabase();
    workspaceMissingDatabase.accessibleWorkspace = null;
    d1Mocks.getCloudflareD1Database.mockResolvedValue(workspaceMissingDatabase);
    authMocks.requireCurrentUserContext.mockResolvedValue({
      role: "member",
      userId: "user-1",
    });
    await expect(
      mutateCurrentOnboardingFlow(startCommand()),
    ).rejects.toThrow("No accessible onboarding workspace is available.");
    expect(flowRepositoryMocks.mutateOnboardingFlow).not.toHaveBeenCalled();
  });

  it("rejects ineligible flows and unauthorized launch-mode transitions", async () => {
    const database = new ActionDatabase();
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);
    eligibilityMocks.getEligibleOnboardingFlows.mockReturnValue([]);

    await expect(
      mutateCurrentOnboardingFlow(startCommand()),
    ).resolves.toEqual({
      code: "ONBOARDING_ILLEGAL_TRANSITION",
      state: null,
      status: "conflict",
    });
    expect(flowRepositoryMocks.mutateOnboardingFlow).not.toHaveBeenCalled();

    eligibilityMocks.getEligibleOnboardingFlows.mockReturnValue([
      eligibleFlow(),
    ]);
    await expect(
      mutateCurrentOnboardingFlow(
        startCommand({ launchMode: "resume", mutationId: "wrong-launch-mode" }),
      ),
    ).resolves.toEqual({
      code: "ONBOARDING_ILLEGAL_TRANSITION",
      state: null,
      status: "conflict",
    });
    expect(flowRepositoryMocks.mutateOnboardingFlow).not.toHaveBeenCalled();
  });

  it("delegates an allowed mutation with server-derived actor and eligible steps", async () => {
    const database = new ActionDatabase();
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);
    const command = startCommand();

    await expect(
      mutateCurrentOnboardingFlow(command),
    ).resolves.toEqual({
      runId: "run-1",
      state: { flowKey: "core_orientation", revision: 0 },
      status: "applied",
    });

    expect(flowRepositoryMocks.mutateOnboardingFlow).toHaveBeenCalledTimes(1);
    expect(flowRepositoryMocks.mutateOnboardingFlow).toHaveBeenCalledWith(
      database,
      {
        eligibleStepKeys: ["welcome", "projects_entry"],
        guidedPracticeComplete: undefined,
        resourceId: null,
        tutorialBinding: null,
        userId: "user-1",
        workspaceId: "workspace-1",
      },
      command,
    );
    const accessibleQueries = database.firstCalls.filter((call) =>
      call.sql.includes("WITH accessible AS")
    );
    expect(accessibleQueries).toHaveLength(2);
    for (const query of accessibleQueries) {
      expect(query.values).toEqual([
        "user-1",
        "user-1",
        "user-1",
        "user-1",
      ]);
    }
  });

  it.each([
    {
      access: {
        access_source: "workspace",
        effective_role: "member",
        estimate_id: null,
        project_id: null,
        workspace_created_by: "user-2",
        workspace_id: "workspace-1",
        workspace_role: "member",
      },
      audience: ["workspace_editor"],
      capabilities: [
        "view_workshop",
        "view_projects",
        "create_projects",
        "group_projects",
        "edit_estimate",
      ],
      flowKey: "core_orientation",
      label: "workspace editor",
      resourceContext: {},
      stepKeys: ["welcome", "projects_entry"],
    },
    {
      access: {
        access_source: "workspace",
        effective_role: "viewer",
        estimate_id: null,
        project_id: null,
        workspace_created_by: "user-2",
        workspace_id: "workspace-1",
        workspace_role: "viewer",
      },
      audience: ["workspace_editor"],
      capabilities: ["view_workshop", "view_projects"],
      flowKey: "core_orientation",
      label: "workspace viewer",
      resourceContext: {},
      stepKeys: ["welcome", "projects_entry"],
    },
    {
      access: {
        access_source: "project",
        effective_role: "editor",
        estimate_id: null,
        project_id: "project-1",
        workspace_created_by: "user-2",
        workspace_id: "workspace-1",
        workspace_role: null,
      },
      audience: ["project_collaborator"],
      capabilities: [
        "view_workshop",
        "view_assigned_project",
        "view_estimate",
        "edit_estimate",
      ],
      flowKey: "collaborator_orientation",
      label: "project collaborator",
      resourceContext: { projectId: "project-1" },
      stepKeys: ["collaborator_welcome", "assigned_project"],
    },
    {
      access: {
        access_source: "estimate",
        effective_role: "viewer",
        estimate_id: "estimate-1",
        project_id: "project-1",
        workspace_created_by: "user-2",
        workspace_id: "workspace-1",
        workspace_role: null,
      },
      audience: ["estimate_collaborator", "estimate_reader"],
      capabilities: [
        "view_workshop",
        "view_assigned_project",
        "view_estimate",
      ],
      flowKey: "collaborator_orientation",
      label: "estimate collaborator",
      resourceContext: {
        estimateId: "estimate-1",
        projectId: "project-1",
      },
      stepKeys: ["collaborator_welcome", "assigned_estimate"],
    },
  ] satisfies Array<{
    access: AccessibleWorkspace;
    audience: string[];
    capabilities: string[];
    flowKey: string;
    label: string;
    resourceContext: {
      estimateId?: string;
      projectId?: string;
    };
    stepKeys: string[];
  }>)(
    "derives $label eligibility from server access rows",
    async ({
      access,
      audience,
      capabilities,
      flowKey,
      resourceContext,
      stepKeys,
    }) => {
      const database = new ActionDatabase();
      database.accessibleWorkspace = access;
      d1Mocks.getCloudflareD1Database.mockResolvedValue(database);
      eligibilityMocks.getEligibleOnboardingFlows.mockReturnValue([
        eligibleFlow(flowKey, stepKeys),
      ]);
      const command = startCommand({
        flowKey,
        mutationId: `mutation-${access.access_source}-${access.effective_role}`,
      });

      await expect(
        mutateCurrentOnboardingFlow(command),
      ).resolves.toEqual(expect.objectContaining({ status: "applied" }));

      const snapshot = eligibilityMocks.getEligibleOnboardingFlows.mock
        .calls.at(-1)?.[0];
      expect(snapshot).toEqual(expect.objectContaining({
        accessSource: access.access_source,
        audience,
        capabilities,
        effectiveRole: access.effective_role,
        resourceContext: expect.objectContaining(resourceContext),
        userId: "user-1",
        workspaceId: "workspace-1",
        workspaceRole: access.workspace_role,
      }));
      expect(flowRepositoryMocks.mutateOnboardingFlow).toHaveBeenLastCalledWith(
        database,
        expect.objectContaining({
          eligibleStepKeys: stepKeys,
          userId: "user-1",
          workspaceId: "workspace-1",
        }),
        command,
      );
    },
  );
});
