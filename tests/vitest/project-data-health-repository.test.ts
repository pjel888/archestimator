import { describe, expect, it } from "vitest";

import { ESTIMATE_HEALTH_GOLDEN_FIXTURE } from "./fixtures/estimate-health-golden-fixture";

describe("project-data health repository contract (UNIT-001 red baseline)", () => {
  it("characterizes that the current route DTO has no health payload", async () => {
    const repository = await import("@/lib/repositories/project-data-repository");
    expect(repository.getProjectDataRouteSummary).toBeTypeOf("function");
  });

  it.fails("RED-EST-001: exposes compact health summary and issue references at the repository boundary", async () => {
    const health = await import(/* @vite-ignore */ ["@", "/lib/estimate-health"].join(""));
    const dto = health.buildProjectDataHealthDto(ESTIMATE_HEALTH_GOLDEN_FIXTURE);
    expect(dto.summary).toMatchObject({ policyRevision: 7, grade: "needs_attention" });
    expect(dto.issues.every((issue: { rowIds: string[] }) => issue.rowIds.every(Boolean))).toBe(true);
  });
});
