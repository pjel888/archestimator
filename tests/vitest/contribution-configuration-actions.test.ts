import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireCurrentUserContext: vi.fn(),
  requireEstimateD1Database: vi.fn(),
  assertEstimateActionRateLimit: vi.fn(),
  ensureEstimateContributionScope: vi.fn(),
  createOrReplaceEstimateAlternativeGroup: vi.fn(),
  markEstimateContributionRowOptional: vi.fn(),
  unmarkEstimateContributionRowOptional: vi.fn(),
  removeEstimateAlternativeGroup: vi.fn(),
  applyEstimateContributionConfigurationBulk: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ requireCurrentUserContext: mocks.requireCurrentUserContext }));
vi.mock("@/lib/estimates/d1-intents/database", () => ({ requireEstimateD1Database: mocks.requireEstimateD1Database }));
vi.mock("@/lib/estimates/action-rate-limit", () => ({ assertEstimateActionRateLimit: mocks.assertEstimateActionRateLimit }));
vi.mock("@/lib/estimates/contribution-configuration-repository", () => ({
  ensureEstimateContributionScope: mocks.ensureEstimateContributionScope,
  createOrReplaceEstimateAlternativeGroup: mocks.createOrReplaceEstimateAlternativeGroup,
  markEstimateContributionRowOptional: mocks.markEstimateContributionRowOptional,
  unmarkEstimateContributionRowOptional: mocks.unmarkEstimateContributionRowOptional,
  removeEstimateAlternativeGroup: mocks.removeEstimateAlternativeGroup,
  applyEstimateContributionConfigurationBulk: mocks.applyEstimateContributionConfigurationBulk,
}));

import {
  applyEstimateContributionConfigurationBulkAction,
  createOrReplaceEstimateAlternativeGroupAction,
  ensureEstimateContributionScopeAction,
  markEstimateContributionRowOptionalAction,
  removeEstimateAlternativeGroupAction,
  unmarkEstimateContributionRowOptionalAction,
} from "@/lib/estimates/contribution-configuration-actions";

const database = { prepare: vi.fn() };
const actor = { userId: "user-1", role: "member" };
const base = {
  projectId: "project-1",
  estimateId: "estimate-1",
  estimateTabId: "tab-1",
  contributionScopeId: "scope-1",
  intentId: "intent-1",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireEstimateD1Database.mockResolvedValue(database);
  mocks.requireCurrentUserContext.mockResolvedValue(actor);
});

describe("contribution configuration actions", () => {
  it("delegates every command through the authenticated rate-limited estimate boundary", async () => {
    const cases = [
      [ensureEstimateContributionScopeAction, mocks.ensureEstimateContributionScope, base],
      [createOrReplaceEstimateAlternativeGroupAction, mocks.createOrReplaceEstimateAlternativeGroup, {
        ...base, groupId: "group-1", rowItemIds: ["row-1", "row-2"], selectedRowItemId: "row-1",
        expectedGroupRevision: null, expectedContributionRevision: 1,
      }],
      [markEstimateContributionRowOptionalAction, mocks.markEstimateContributionRowOptional, {
        ...base, rowItemId: "row-1", isIncluded: true, expectedOptionalRevision: null,
        expectedContributionRevision: 1,
      }],
      [unmarkEstimateContributionRowOptionalAction, mocks.unmarkEstimateContributionRowOptional, {
        ...base, rowItemId: "row-1", expectedOptionalRevision: 1, expectedContributionRevision: 2,
      }],
      [removeEstimateAlternativeGroupAction, mocks.removeEstimateAlternativeGroup, {
        ...base, groupId: "group-1", expectedGroupRevision: 1, expectedContributionRevision: 2,
      }],
      [applyEstimateContributionConfigurationBulkAction, mocks.applyEstimateContributionConfigurationBulk, {
        ...base,
        expectedContributionRevision: 2,
        operation: {
          kind: "mark_optional",
          rows: [{ rowItemId: "row-1", isIncluded: true, expectedOptionalRevision: null }],
        },
      }],
    ] as const;

    for (const [action, repository, input] of cases) {
      const result = { ok: repository.getMockName() };
      repository.mockResolvedValueOnce(result);
      await expect(action(input as never)).resolves.toBe(result);
      expect(repository).toHaveBeenLastCalledWith({ ...input, database, actor });
    }
    expect(mocks.assertEstimateActionRateLimit).toHaveBeenCalledTimes(cases.length);
    expect(mocks.assertEstimateActionRateLimit).toHaveBeenLastCalledWith({
      resourceId: "estimate-1",
      surface: "estimate-mutation",
      userId: "user-1",
    });
  });

  it("does not call a repository when authentication fails", async () => {
    const error = new Error("Authentication required.");
    mocks.requireCurrentUserContext.mockRejectedValue(error);

    await expect(ensureEstimateContributionScopeAction(base)).rejects.toBe(error);
    expect(mocks.assertEstimateActionRateLimit).not.toHaveBeenCalled();
    expect(mocks.ensureEstimateContributionScope).not.toHaveBeenCalled();
  });
});
