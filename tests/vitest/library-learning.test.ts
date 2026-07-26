import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  D1DatabaseLike,
  D1PreparedStatementLike,
  D1Result,
  D1Value,
} from "@/lib/cloudflare/d1";
import {
  readLibraryLearningPredicates,
  recordLibraryLearningMutation,
} from "@/lib/onboarding/library-learning";

const repositoryMocks = vi.hoisted(() => ({
  completeFromProof: vi.fn(),
  getBinding: vi.fn(),
  getState: vi.fn(),
  recordEvent: vi.fn(),
}));

vi.mock("@/lib/onboarding/flow-repository", () => ({
  completeOnboardingFlowFromDomainProof: repositoryMocks.completeFromProof,
  getOnboardingFlowRunBinding: repositoryMocks.getBinding,
  getOnboardingFlowState: repositoryMocks.getState,
  recordOnboardingDomainEvent: repositoryMocks.recordEvent,
}));

class LearningStatement<T = Record<string, unknown>>
  implements D1PreparedStatementLike<T>
{
  private values: D1Value[] = [];

  constructor(
    private readonly database: LearningDatabase,
    private readonly sql: string,
  ) {}

  bind(...values: D1Value[]) {
    this.values = values;
    return this;
  }

  async first<R = T>(): Promise<R | null> {
    this.database.calls.push({ sql: this.sql, values: this.values });
    if (this.sql.includes("AS component_complete")) {
      return {
        component_complete: this.database.componentComplete,
        template_complete: this.database.templateComplete,
      } as R;
    }
    if (this.sql.includes("AS matches")) {
      return { matches: this.database.matches } as R;
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

class LearningDatabase implements D1DatabaseLike {
  calls: Array<{ sql: string; values: D1Value[] }> = [];
  componentComplete = 0;
  matches = 1;
  templateComplete = 0;

  prepare<T = Record<string, unknown>>(sql: string) {
    return new LearningStatement<T>(this, sql);
  }
}

const input = {
  kind: "component_inserted",
  mutationId: "mutation-1",
  userId: "user-1",
  workspaceId: "workspace-1",
  estimateId: "estimate-1",
  rowId: "row-1",
  sourceComponentId: "component-1",
} as const;

beforeEach(() => {
  vi.clearAllMocks();
  repositoryMocks.getBinding.mockResolvedValue({
    runId: "run-1",
    state: {
      flowKey: "library_reuse",
      flowVersion: 1,
      generation: 2,
      revision: 3,
      status: "in_progress",
    },
  });
  repositoryMocks.getState.mockResolvedValue({
    flowKey: "library_reuse",
    flowVersion: 1,
    generation: 2,
    revision: 3,
    status: "in_progress",
  });
  repositoryMocks.recordEvent.mockResolvedValue({ status: "applied" });
  repositoryMocks.completeFromProof.mockResolvedValue({ status: "applied" });
});

describe("library onboarding domain proof", () => {
  it("records an authoritative component insert and completes from current-generation proof", async () => {
    const database = new LearningDatabase();
    database.componentComplete = 1;

    await expect(recordLibraryLearningMutation(database, input)).resolves.toBe("recorded");

    expect(repositoryMocks.recordEvent).toHaveBeenCalledWith(
      database,
      expect.objectContaining({
        eventType: "practice_action_completed",
        flowKey: "library_reuse",
        runId: "run-1",
        source: "non_starter_domain",
        stepKey: "library_sources",
      }),
    );
    expect(repositoryMocks.completeFromProof).toHaveBeenCalledWith(
      database,
      expect.objectContaining({
        expectedRevision: 3,
        flowKey: "library_reuse",
        routeKey: "estimate_sheet",
        runId: "run-1",
      }),
    );
  });

  it("ignores invalid updates and mutations without an active run binding", async () => {
    const database = new LearningDatabase();

    await expect(recordLibraryLearningMutation(database, {
      kind: "component_updated",
      mutationId: "mutation-2",
      userId: "user-1",
      workspaceId: "workspace-1",
      componentId: "component-1",
      previousVersionNumber: 3,
      resultingVersionNumber: 3,
      resultingUpdatedAt: "2026-07-24T00:00:00.000Z",
    })).resolves.toBe("ignored");
    expect(repositoryMocks.getBinding).not.toHaveBeenCalled();

    repositoryMocks.getBinding.mockResolvedValueOnce(null);
    await expect(recordLibraryLearningMutation(database, input)).resolves.toBe("ignored");
    expect(repositoryMocks.recordEvent).not.toHaveBeenCalled();
  });

  it("keeps passive content availability separate from current-generation learning proof", async () => {
    const database = new LearningDatabase();
    repositoryMocks.getState.mockResolvedValueOnce(null);

    await expect(readLibraryLearningPredicates(database, {
      userId: "user-1",
      workspaceId: "workspace-1",
    })).resolves.toEqual({
      libraryContentAvailable: true,
      libraryReuseComplete: false,
      libraryReuseIncomplete: true,
      templateCapstoneComplete: false,
    });
  });
});
