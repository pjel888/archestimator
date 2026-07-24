import { describe, expect, it, vi } from "vitest";

import {
  getOnboardingFlowDefinition,
  ONBOARDING_FLOW_CATALOG,
} from "@/lib/onboarding/flow-catalog";
import {
  filterEligibleOnboardingSteps,
  getEligibleOnboardingFlows,
  resolveSemanticResume,
} from "@/lib/onboarding/flow-eligibility";
import {
  issueStarterSeedActivationCapability,
  prepareStarterSeedActivation,
} from "@/lib/onboarding/activation-origin";
import { prepareActivationLedgerStatements } from "@/lib/onboarding/activation-repository";
import {
  ONBOARDING_CAPABILITIES,
  ONBOARDING_ROUTE_INTENTS,
  type OnboardingEligibilitySnapshot,
  type OnboardingFlowStateSnapshot,
} from "@/lib/onboarding/flow-types";
import { ONBOARDING_TARGET_KEYS } from "@/lib/onboarding/target-catalog";

function snapshot(
  overrides: Partial<OnboardingEligibilitySnapshot> = {},
): OnboardingEligibilitySnapshot {
  return {
    userId: "user-1",
    workspaceId: "workspace-1",
    workspaceRole: "owner",
    accessSource: "workspace",
    effectiveRole: "owner",
    entryKind: "workspace_creator",
    viewportHint: "unknown",
    resourceContext: {
      projectId: "project-1",
      estimateId: "estimate-1",
      nodeId: "node-1",
    },
    activation: {
      selectedPath: null,
      projectStarted: false,
      estimateStarted: false,
      firstAreaCreated: false,
      firstRowPriced: false,
      firstValidTotalReached: false,
      automaticGuidanceEnabled: true,
      checklistDismissed: false,
    },
    starter: null,
    audience: ["workspace_creator"],
    capabilities: ONBOARDING_CAPABILITIES,
    dataPredicates: {
      assigned_work_available: true,
      estimate_context_available: true,
      tutorial_binding_current: true,
      tutorial_core_incomplete: true,
      non_starter_transfer_incomplete: true,
      library_content_available: true,
      library_reuse_incomplete: true,
      client_link_project_available: true,
      client_link_core_incomplete: true,
      first_area_incomplete: true,
      first_priced_row_incomplete: true,
      first_valid_total_incomplete: true,
    },
    availableRoutes: ONBOARDING_ROUTE_INTENTS,
    availableTargets: ONBOARDING_TARGET_KEYS,
    flowStates: [],
    ...overrides,
  };
}

function flowState(
  overrides: Partial<OnboardingFlowStateSnapshot> = {},
): OnboardingFlowStateSnapshot {
  return {
    flowKey: "core_orientation",
    flowVersion: 1,
    status: "in_progress",
    currentStepKey: "projects_entry",
    generation: 1,
    revision: 2,
    resetCount: 0,
    tutorialBinding: null,
    runId: "run-1",
    ...overrides,
  };
}

describe("onboarding flow catalog", () => {
  it("keeps flow keys, versions, step keys, and compatibility mappings coherent", () => {
    const flowKeys = ONBOARDING_FLOW_CATALOG.map((definition) => definition.key);

    expect(new Set(flowKeys).size).toBe(flowKeys.length);
    for (const definition of ONBOARDING_FLOW_CATALOG) {
      expect(definition.version).toBeGreaterThan(0);
      expect(Number.isInteger(definition.version)).toBe(true);
      expect(getOnboardingFlowDefinition(definition.key)).toBe(definition);

      const stepKeys = definition.steps.map((step) => step.key);
      expect(new Set(stepKeys).size).toBe(stepKeys.length);
      for (const step of definition.steps) {
        expect(step.missingTarget === "skip").toBe(step.optional);
      }
      for (const [previousKey, currentKey] of Object.entries(definition.compatibility)) {
        expect(stepKeys).not.toContain(previousKey);
        expect(stepKeys).toContain(currentKey);
      }
    }
  });

  it("requires a matching audience and every audience capability", () => {
    const workshopOnly = snapshot({
      capabilities: ["view_workshop", "view_projects"],
    });
    expect(
      getEligibleOnboardingFlows(workshopOnly, "desktop").map(
        ({ definition }) => definition.key,
      ),
    ).toEqual(["core_orientation"]);

    const wrongAudience = snapshot({
      audience: ["estimate_reader"],
      capabilities: ["view_workshop", "view_projects", "create_projects", "view_estimate", "edit_estimate"],
    });
    expect(
      getEligibleOnboardingFlows(wrongAudience, "desktop").some(
        ({ definition }) => definition.key === "first_estimate_value",
      ),
    ).toBe(false);
  });

  it("filters by route and viewport while retaining required missing-target recovery", () => {
    const definition = getOnboardingFlowDefinition("core_orientation");
    const currentSnapshot = snapshot();

    expect(
      filterEligibleOnboardingSteps(definition, currentSnapshot, "desktop").map(
        (step) => step.key,
      ),
    ).toEqual(["welcome", "workspace_map", "projects_entry", "guidance_and_help"]);
    expect(
      filterEligibleOnboardingSteps(definition, currentSnapshot, "mobile").map(
        (step) => step.key,
      ),
    ).toEqual(["welcome", "mobile_navigation", "projects_entry", "guidance_and_help"]);

    const withoutTargets = snapshot({ availableTargets: [] });
    expect(
      filterEligibleOnboardingSteps(definition, withoutTargets, "desktop").map(
        (step) => step.key,
      ),
    ).toEqual(["welcome", "projects_entry", "guidance_and_help"]);

    const withoutProjectsRoute = snapshot({
      availableRoutes: ONBOARDING_ROUTE_INTENTS.filter((route) => route !== "projects"),
    });
    expect(
      filterEligibleOnboardingSteps(definition, withoutProjectsRoute, "desktop").map(
        (step) => step.key,
      ),
    ).not.toContain("projects_entry");
  });

  it("binds persisted state only to the current definition version", () => {
    const stale = snapshot({
      flowStates: [flowState({ flowVersion: 2 })],
    });
    const current = snapshot({
      flowStates: [flowState()],
    });

    expect(
      getEligibleOnboardingFlows(stale, "desktop").find(
        ({ definition }) => definition.key === "core_orientation",
      )?.state,
    ).toBeNull();
    expect(
      getEligibleOnboardingFlows(current, "desktop").find(
        ({ definition }) => definition.key === "core_orientation",
      )?.state,
    ).toEqual(flowState());
  });

  it("resumes direct, compatible, and definition-changed steps semantically", () => {
    const publishing = getOnboardingFlowDefinition("client_link_publishing");
    const eligiblePublishing = filterEligibleOnboardingSteps(
      publishing,
      snapshot({
        audience: ["publication_manager"],
        capabilities: ["manage_client_links"],
      }),
      "desktop",
    );

    expect(
      resolveSemanticResume(publishing, eligiblePublishing, "client_links_publish"),
    ).toMatchObject({
      kind: "step",
      step: { key: "client_links_publish" },
      definitionChanged: false,
    });
    expect(
      resolveSemanticResume(publishing, eligiblePublishing, "client_links_optional"),
    ).toMatchObject({
      kind: "step",
      step: { key: "client_links_recipients" },
      definitionChanged: true,
    });

    const orientation = getOnboardingFlowDefinition("core_orientation");
    const mobileSteps = filterEligibleOnboardingSteps(
      orientation,
      snapshot(),
      "mobile",
    );
    expect(
      resolveSemanticResume(orientation, mobileSteps, "workspace_map"),
    ).toMatchObject({
      kind: "step",
      step: { key: "mobile_navigation" },
      definitionChanged: true,
    });
    expect(resolveSemanticResume(orientation, [], "projects_entry")).toEqual({
      kind: "completed",
      definitionChanged: true,
    });
  });

  it("does not turn starter seeds or passive route eligibility into activation credit", () => {
    const prepared: string[] = [];
    const database = {
      prepare(sql: string) {
        prepared.push(sql);
        const statement = {
          bind: vi.fn(() => statement),
        };
        return statement;
      },
    };
    const seeded = prepareStarterSeedActivation(
      issueStarterSeedActivationCapability(),
      {
        userId: "user-1",
        workspaceId: "workspace-1",
        projectId: "seeded-project",
        milestone: "project_created",
        source: "project",
        occurredAt: "2026-07-24T00:00:00.000Z",
        dedupeKey: "starter:project-created",
      },
    );

    const ledger = prepareActivationLedgerStatements(database as never, seeded);
    expect(ledger.insertEvent).toBeDefined();
    expect(ledger.updateProgress).toBeNull();

    const currentSnapshot = snapshot();
    const activationBefore = structuredClone(currentSnapshot.activation);
    const eligible = getEligibleOnboardingFlows(currentSnapshot, "desktop");
    expect(eligible.some(({ steps }) => steps.some((step) => step.interaction === "passive"))).toBe(true);
    expect(eligible.every(({ state }) => state === null)).toBe(true);
    expect(currentSnapshot.activation).toEqual(activationBefore);
    expect(prepared.join("\n")).not.toContain("INSERT INTO beta_activation_progress");
  });
});
