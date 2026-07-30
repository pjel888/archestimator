import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireCurrentUserContext: vi.fn(),
  requireEstimateD1Database: vi.fn(),
  assertEstimateActionRateLimit: vi.fn(),
  selectValueEngineeringAlternative: vi.fn(),
  setValueEngineeringOptionalInclusion: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  requireCurrentUserContext: mocks.requireCurrentUserContext,
}));

vi.mock("@/lib/estimates/d1-intents/database", () => ({
  requireEstimateD1Database: mocks.requireEstimateD1Database,
}));

vi.mock("@/lib/estimates/action-rate-limit", () => ({
  assertEstimateActionRateLimit: mocks.assertEstimateActionRateLimit,
}));

vi.mock("@/lib/estimates/value-engineering-repository", () => ({
  selectValueEngineeringAlternative: mocks.selectValueEngineeringAlternative,
  setValueEngineeringOptionalInclusion: mocks.setValueEngineeringOptionalInclusion,
}));

import {
  selectEstimateAlternativeAction,
  setEstimateOptionalInclusionAction,
} from "@/lib/estimates/value-engineering-actions";

const database = { prepare: vi.fn() };
const currentUser = { userId: "user-1", role: "member" };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireEstimateD1Database.mockResolvedValue(database);
  mocks.requireCurrentUserContext.mockResolvedValue(currentUser);
});

describe("value-engineering server actions", () => {
  it("passes authenticated actor and exact CAS selection input to the repository", async () => {
    const input = {
      projectId: "project-1",
      estimateId: "estimate-1",
      estimateTabId: "tab-1",
      contributionScopeId: "scope-1",
      groupId: "group-1",
      selectedRowItemId: "row-2",
      expectedGroupRevision: 3,
      expectedContributionRevision: 7,
      intentId: "intent-1",
    };
    const result = { kind: "alternative_selection", groupRevision: 4, contributionRevision: 8 };
    mocks.selectValueEngineeringAlternative.mockResolvedValue(result);

    await expect(selectEstimateAlternativeAction(input)).resolves.toBe(result);

    expect(mocks.assertEstimateActionRateLimit).toHaveBeenCalledWith({
      resourceId: "estimate-1",
      surface: "estimate-mutation",
      userId: "user-1",
    });
    expect(mocks.selectValueEngineeringAlternative).toHaveBeenCalledWith({
      ...input,
      database,
      actor: currentUser,
    });
  });

  it("passes optional inclusion through the same authenticated and rate-limited boundary", async () => {
    const input = {
      projectId: "project-1",
      estimateId: "estimate-1",
      estimateTabId: "tab-1",
      contributionScopeId: "scope-1",
      rowItemId: "row-optional",
      isIncluded: false,
      expectedOptionalRevision: 2,
      expectedContributionRevision: 7,
      intentId: "intent-2",
    };
    const result = { kind: "optional_inclusion", optionalRevision: 3, contributionRevision: 8 };
    mocks.setValueEngineeringOptionalInclusion.mockResolvedValue(result);

    await expect(setEstimateOptionalInclusionAction(input)).resolves.toBe(result);
    expect(mocks.setValueEngineeringOptionalInclusion).toHaveBeenCalledWith({
      ...input,
      database,
      actor: currentUser,
    });
    expect(mocks.assertEstimateActionRateLimit).toHaveBeenCalledTimes(1);
  });

  it("does not reach persistence when session resolution fails", async () => {
    const error = new Error("Authentication required.");
    mocks.requireCurrentUserContext.mockRejectedValue(error);

    await expect(selectEstimateAlternativeAction({
      projectId: "project-1",
      estimateId: "estimate-1",
      estimateTabId: "tab-1",
      contributionScopeId: "scope-1",
      groupId: "group-1",
      selectedRowItemId: "row-2",
      expectedGroupRevision: 3,
      expectedContributionRevision: 7,
      intentId: "intent-1",
    })).rejects.toBe(error);
    expect(mocks.assertEstimateActionRateLimit).not.toHaveBeenCalled();
    expect(mocks.selectValueEngineeringAlternative).not.toHaveBeenCalled();
  });
});
