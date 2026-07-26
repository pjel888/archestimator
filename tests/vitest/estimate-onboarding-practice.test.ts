import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  D1DatabaseLike,
  D1PreparedStatementLike,
  D1Result,
  D1Value,
} from "@/lib/cloudflare/d1";

const flowMocks = vi.hoisted(() => ({
  completeOnboardingFlowFromDomainProof: vi.fn(),
  getOnboardingFlowRunBinding: vi.fn(),
  getOnboardingFlowState: vi.fn(),
  hasCurrentTutorialPracticeCompletion: vi.fn(),
  recordOnboardingDomainEvent: vi.fn(),
}));

vi.mock("@/lib/onboarding/flow-repository", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/lib/onboarding/flow-repository")
  >();
  return {
    ...actual,
    completeOnboardingFlowFromDomainProof:
      flowMocks.completeOnboardingFlowFromDomainProof,
    getOnboardingFlowRunBinding: flowMocks.getOnboardingFlowRunBinding,
    getOnboardingFlowState: flowMocks.getOnboardingFlowState,
    hasCurrentTutorialPracticeCompletion:
      flowMocks.hasCurrentTutorialPracticeCompletion,
    recordOnboardingDomainEvent: flowMocks.recordOnboardingDomainEvent,
  };
});

import {
  getCurrentGuidedPracticeBindingForEstimate,
  readGuidedPracticePredicates,
  recordEstimatePracticeMutation,
  recordOnboardingChecklistActionFact,
} from "@/lib/onboarding/estimate-practice";
import { isQualifyingChecklistActionFact } from "@/lib/onboarding/flow-repository";

const USER_ID = "user-1";
const WORKSPACE_ID = "workspace-1";
const PROJECT_ID = "project-1";
const ESTIMATE_ID = "estimate-1";
const ROW_ID = "row-1";

type PracticeProject = {
  tutorial_version: number;
  tutorial_generation: number;
};

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

type PreparedCall = {
  sql: string;
  values: D1Value[];
};

class PracticeStatement<T = Record<string, unknown>>
  implements D1PreparedStatementLike<T>
{
  private values: D1Value[] = [];

  constructor(
    private readonly database: PracticeDatabase,
    readonly sql: string,
  ) {}

  bind(...values: D1Value[]) {
    this.values = values;
    this.database.prepared.push({ sql: this.sql, values });
    return this;
  }

  async first<R = T>(): Promise<R | null> {
    if (this.sql.includes("AS binding_current")) {
      return {
        binding_current: this.database.bindingCurrent,
        transfer_complete: this.database.transferComplete,
      } as R;
    }
    if (
      this.sql.includes("json_extract(project.metadata, '$.tutorial_kind') IS NULL")
    ) {
      return (
        this.database.independentProjectOrigin === "non_starter"
          ? this.database.independentProject
          : null
      ) as R | null;
    }
    if (this.sql.includes("AS tutorial_version")) {
      return this.database.tutorialProject as R | null;
    }
    if (this.sql.includes("FROM estimate_row_items")) {
      return this.database.row as R | null;
    }
    return null;
  }

  async all<R = T>(): Promise<D1Result<R>> {
    return { success: true, results: [] };
  }

  async run(): Promise<D1Result<T>> {
    this.database.runs.push({ sql: this.sql, values: this.values });
    return {
      success: this.database.eventWriteSucceeds,
      meta: { changes: this.database.eventChanges },
    };
  }
}

class PracticeDatabase implements D1DatabaseLike {
  bindingCurrent = 1;
  eventChanges = 1;
  eventWriteSucceeds = true;
  independentProject: { id: string } | null = null;
  independentProjectOrigin: "non_starter" | "starter_seed" | "tutorial_seed" =
    "non_starter";
  prepared: PreparedCall[] = [];
  row: PracticeRow | null = {
    adjustment_percentage: 0,
    contingency_percentage: 0,
    guided_practice_role: "price_and_save",
    misc_cost: 0,
    quantity: 2,
    quantity_base: null,
    quantity_contingency_amount: null,
    source_library_item_id: null,
    unit_cost: 100,
  };
  runs: PreparedCall[] = [];
  tutorialProject: PracticeProject | null = {
    tutorial_generation: 3,
    tutorial_version: 2,
  };
  transferComplete = 0;

  prepare<T = Record<string, unknown>>(sql: string) {
    return new PracticeStatement<T>(this, sql);
  }
}

function currentBinding(overrides: {
  generation?: number;
  revision?: number;
  runId?: string;
  tutorialGeneration?: number;
  tutorialVersion?: number;
} = {}) {
  return {
    runId: overrides.runId ?? "active-run",
    state: {
      completedAt: null,
      createdAt: "2026-07-24T00:00:00.000Z",
      currentStepKey: "practice_price_and_save",
      dismissedAt: null,
      flowKey: "guided_estimate_practice",
      flowVersion: 1,
      generation: overrides.generation ?? 3,
      lastPausedAt: null,
      lastResetAt: null,
      lastResumedAt: null,
      resetCount: 0,
      revision: overrides.revision ?? 7,
      startedAt: "2026-07-24T00:00:00.000Z",
      status: "in_progress",
      tutorialBinding: {
        generation: overrides.tutorialGeneration ?? 3,
        version: overrides.tutorialVersion ?? 2,
      },
      updatedAt: "2026-07-24T00:00:00.000Z",
      userId: USER_ID,
      workspaceId: WORKSPACE_ID,
    },
  };
}

function quantityMutation() {
  return {
    estimateId: ESTIMATE_ID,
    kind: "quantity_changed" as const,
    mutationId: "mutation-1",
    previousQuantity: 1,
    previousTotal: 100,
    previousUnitCost: 100,
    projectId: PROJECT_ID,
    rowId: ROW_ID,
    userId: USER_ID,
    workspaceId: WORKSPACE_ID,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  flowMocks.getOnboardingFlowRunBinding.mockResolvedValue(currentBinding());
  flowMocks.getOnboardingFlowState.mockResolvedValue(currentBinding().state);
  flowMocks.completeOnboardingFlowFromDomainProof.mockResolvedValue({
    status: "applied",
    state: { ...currentBinding().state, status: "completed", revision: 8 },
  });
  flowMocks.hasCurrentTutorialPracticeCompletion.mockResolvedValue(true);
  flowMocks.recordOnboardingDomainEvent.mockResolvedValue({ status: "recorded" });
});

describe("estimate onboarding practice", () => {
  it("derives live guided-practice eligibility from the current graph and evidence", async () => {
    const database = new PracticeDatabase();
    flowMocks.hasCurrentTutorialPracticeCompletion.mockResolvedValueOnce(false);

    await expect(readGuidedPracticePredicates(database, {
      userId: USER_ID,
      workspaceId: WORKSPACE_ID,
    })).resolves.toEqual({
      tutorialBindingCurrent: true,
      tutorialCoreIncomplete: true,
      nonStarterTransferIncomplete: true,
    });

    database.transferComplete = 1;
    flowMocks.hasCurrentTutorialPracticeCompletion.mockResolvedValueOnce(true);
    await expect(readGuidedPracticePredicates(database, {
      userId: USER_ID,
      workspaceId: WORKSPACE_ID,
    })).resolves.toEqual({
      tutorialBindingCurrent: true,
      tutorialCoreIncomplete: false,
      nonStarterTransferIncomplete: false,
    });
  });

  it("records a saved user mutation against the observed run, generation, and revision once", async () => {
    const database = new PracticeDatabase();

    await expect(
      recordEstimatePracticeMutation(database, quantityMutation()),
    ).resolves.toBe("recorded");

    const eventInsert = database.runs.find((call) =>
      call.sql.includes("INSERT INTO beta_onboarding_flow_events")
    );
    expect(eventInsert).toBeDefined();
    expect(eventInsert?.sql).toContain("AND generation = ?");
    expect(eventInsert?.sql).toContain("AND revision = ?");
    expect(eventInsert?.values[1]).toBe("active-run");
    expect(eventInsert?.values[8]).toBe(USER_ID);
    expect(eventInsert?.values[9]).toBe(WORKSPACE_ID);
    expect(eventInsert?.values[10]).toBe(1);
    expect(eventInsert?.values[11]).toBe(3);
    expect(eventInsert?.values[12]).toBe(7);
    expect(eventInsert?.values[13]).toBe(2);
    expect(eventInsert?.values[14]).toBe(3);
    expect(flowMocks.completeOnboardingFlowFromDomainProof).toHaveBeenCalledWith(
      database,
      expect.objectContaining({
        flowKey: "guided_estimate_practice",
        expectedRevision: 7,
        runId: "active-run",
        source: "tutorial_practice",
        proofSatisfied: true,
      }),
    );

    database.eventChanges = 0;
    await expect(
      recordEstimatePracticeMutation(database, quantityMutation()),
    ).resolves.toBe("ignored");
    const eventInserts = database.runs.filter((call) =>
      call.sql.includes("INSERT INTO beta_onboarding_flow_events")
    );
    expect(eventInserts[1]?.values[5]).toBe(eventInserts[0]?.values[5]);
  });

  it("requires authoritative row readback with changed saved math or source", async () => {
    const missingRow = new PracticeDatabase();
    missingRow.row = null;
    await expect(
      recordEstimatePracticeMutation(missingRow, quantityMutation()),
    ).resolves.toBe("ignored");

    const unchangedRow = new PracticeDatabase();
    unchangedRow.row = { ...unchangedRow.row!, quantity: 1 };
    await expect(
      recordEstimatePracticeMutation(unchangedRow, quantityMutation()),
    ).resolves.toBe("ignored");

    const unchangedTotal = new PracticeDatabase();
    unchangedTotal.row = { ...unchangedTotal.row!, quantity: 2, unit_cost: 50 };
    await expect(
      recordEstimatePracticeMutation(unchangedTotal, quantityMutation()),
    ).resolves.toBe("ignored");

    const unrelatedEditableRow = new PracticeDatabase();
    unrelatedEditableRow.row = {
      ...unrelatedEditableRow.row!,
      guided_practice_role: null,
    };
    await expect(
      recordEstimatePracticeMutation(unrelatedEditableRow, quantityMutation()),
    ).resolves.toBe("ignored");

    const unsourcedComponent = new PracticeDatabase();
    await expect(
      recordEstimatePracticeMutation(unsourcedComponent, {
        estimateId: ESTIMATE_ID,
        kind: "component_inserted",
        mutationId: "component-1",
        projectId: PROJECT_ID,
        rowId: ROW_ID,
        userId: USER_ID,
        workspaceId: WORKSPACE_ID,
      }),
    ).resolves.toBe("ignored");

    expect([
      ...missingRow.runs,
      ...unchangedRow.runs,
      ...unchangedTotal.runs,
      ...unrelatedEditableRow.runs,
      ...unsourcedComponent.runs,
    ]).toEqual([]);
  });

  it("rejects stale tutorial bindings and concurrent generation or revision writes", async () => {
    const staleTutorial = new PracticeDatabase();
    flowMocks.getOnboardingFlowRunBinding.mockResolvedValueOnce(
      currentBinding({ tutorialGeneration: 2 }),
    );
    await expect(
      recordEstimatePracticeMutation(staleTutorial, quantityMutation()),
    ).resolves.toBe("ignored");
    expect(staleTutorial.runs).toEqual([]);

    const concurrentState = new PracticeDatabase();
    concurrentState.eventChanges = 0;
    flowMocks.getOnboardingFlowRunBinding.mockResolvedValueOnce(
      currentBinding({ generation: 8, revision: 12, runId: "current-run" }),
    );
    await expect(
      recordEstimatePracticeMutation(concurrentState, quantityMutation()),
    ).resolves.toBe("ignored");
    expect(concurrentState.runs[0]?.values[1]).toBe("current-run");
    expect(concurrentState.runs[0]?.values[11]).toBe(8);
    expect(concurrentState.runs[0]?.values[12]).toBe(12);
  });

  it("credits authoritative transfer practice on an independent non-starter project", async () => {
    const database = new PracticeDatabase();
    database.tutorialProject = null;
    database.independentProject = { id: PROJECT_ID };

    await expect(
      recordEstimatePracticeMutation(database, quantityMutation()),
    ).resolves.toBe("recorded");

    expect(flowMocks.hasCurrentTutorialPracticeCompletion).toHaveBeenCalledWith(
      database,
      expect.objectContaining({
        userId: USER_ID,
        workspaceId: WORKSPACE_ID,
      }),
    );
    const eventInsert = database.runs.find((call) =>
      call.sql.includes("INSERT INTO beta_onboarding_flow_events")
    );
    expect(eventInsert?.values[1]).toBe("active-run");
    expect(eventInsert?.values[3]).toBe("independent_transfer_observed");
    expect(eventInsert?.values[4]).toBe("non_starter_domain");
    expect(eventInsert?.values[10]).toBe(1);
    expect(eventInsert?.values[11]).toBe(3);
    expect(eventInsert?.values[12]).toBe(7);
  });

  it.each([
    ["starter seed", "starter_seed"],
    ["tutorial seed", "tutorial_seed"],
  ] as const)(
    "rejects authoritative transfer practice when the project is a %s",
    async (_label, origin) => {
      const database = new PracticeDatabase();
      database.tutorialProject = null;
      database.independentProject = { id: PROJECT_ID };
      database.independentProjectOrigin = origin;

      await expect(
        recordEstimatePracticeMutation(database, quantityMutation()),
      ).resolves.toBe("ignored");

      const originQuery = database.prepared.find((call) =>
        call.sql.includes(
          "json_extract(project.metadata, '$.tutorial_kind') IS NULL",
        )
      );
      expect(originQuery?.sql).toContain(
        "json_extract(project.metadata, '$.activation_sample') IS NULL",
      );
      expect(originQuery?.sql).toContain(
        "json_extract(project.metadata, '$.starterLabel') IS NULL",
      );
      expect(originQuery?.sql).toContain(
        "FROM beta_starter_asset_claims claim",
      );
      expect(flowMocks.hasCurrentTutorialPracticeCompletion).not
        .toHaveBeenCalled();
      expect(database.runs).toEqual([]);
    },
  );

  it("does not turn seeded presence, passive binding reads, or seed origins into credit", async () => {
    const database = new PracticeDatabase();

    await expect(
      getCurrentGuidedPracticeBindingForEstimate(database, {
        estimateId: ESTIMATE_ID,
        projectId: PROJECT_ID,
        userId: USER_ID,
        workspaceId: WORKSPACE_ID,
      }),
    ).resolves.toEqual({
      tutorialGeneration: 3,
      tutorialVersion: 2,
    });
    expect(database.runs).toEqual([]);
    expect(flowMocks.recordOnboardingDomainEvent).not.toHaveBeenCalled();

    const baseFact = {
      authoritativeReadbackConfirmed: true,
      authoritativeWriteSucceeded: true,
      family: "estimate_row_added" as const,
      staleOrRolledBack: false,
    };
    expect(
      isQualifyingChecklistActionFact({
        ...baseFact,
        originClass: "starter_seed",
      }),
    ).toBe(false);
    expect(
      isQualifyingChecklistActionFact({
        ...baseFact,
        originClass: "tutorial_seed",
      }),
    ).toBe(false);
    expect(
      isQualifyingChecklistActionFact({
        ...baseFact,
        originClass: "user_domain",
      }),
    ).toBe(true);
  });

  it("emits checklist facts only after successful authoritative save and readback", async () => {
    const database = new PracticeDatabase();
    for (const input of [
      {
        authoritativeReadbackConfirmed: true,
        authoritativeWriteSucceeded: false,
      },
      {
        authoritativeReadbackConfirmed: false,
        authoritativeWriteSucceeded: true,
      },
      {
        authoritativeReadbackConfirmed: true,
        authoritativeWriteSucceeded: true,
        staleOrRolledBack: true,
      },
    ]) {
      await expect(
        recordOnboardingChecklistActionFact(database, {
          family: "estimate_row_added",
          mutationId: `checklist-${JSON.stringify(input)}`,
          userId: USER_ID,
          workspaceId: WORKSPACE_ID,
          ...input,
        }),
      ).resolves.toBeNull();
    }
    expect(flowMocks.recordOnboardingDomainEvent).not.toHaveBeenCalled();

    await expect(
      recordOnboardingChecklistActionFact(database, {
        authoritativeReadbackConfirmed: true,
        authoritativeWriteSucceeded: true,
        family: "estimate_row_added",
        mutationId: "checklist-valid",
        userId: USER_ID,
        workspaceId: WORKSPACE_ID,
      }),
    ).resolves.toEqual({
      authoritativeReadbackConfirmed: true,
      authoritativeWriteSucceeded: true,
      family: "estimate_row_added",
      originClass: "user_domain",
      staleOrRolledBack: false,
    });
    expect(flowMocks.recordOnboardingDomainEvent).toHaveBeenCalledWith(
      database,
      expect.objectContaining({
        eventType: "step_completed",
        flowKey: "first_estimate_value",
        source: "non_starter_domain",
      }),
    );
  });
});
