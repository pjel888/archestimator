import { existsSync, readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const activePlanPointerPath = existsSync(".ai/03_plans/2026-06-03-agentic-development-framework-rollout/README.md")
  ? ".ai/03_plans/2026-06-03-agentic-development-framework-rollout/README.md"
  : ".ai/09_archive/2026-06-03-agentic-development-framework-rollout/README.md";
const historicalActivePlanPointerPath = ".ai/03_plans/2026-06-03-agentic-development-framework-rollout/README.md";
const archivePath = ".ai/09_archive/store/2026-06-03-agentic-development-framework-rollout";
const activePlanPointer = readFileSync(activePlanPointerPath, "utf8");
const plansReadme = readFileSync(".ai/03_plans/README.md", "utf8");
const routingBug = readFileSync(".ai/15_Bugs/2026-06-04-agentic-framework-active-plan-path-archived.md", "utf8");
const completionReport = readFileSync(`${archivePath}/IMPLEMENTATION_COMPLETION_REPORT.md`, "utf8");
const phase1Report = readFileSync(`${archivePath}/44_PHASE_1A_IMPLEMENTATION_REPORT.md`, "utf8");
const currentState = readFileSync(".ai/10_state/current-state.md", "utf8");
const autopilotBoard = readFileSync(".ai/04_tasks/current-autopilot-board.md", "utf8");
const activeWorkstreams = readFileSync(".ai/01_roadmap/25-active-workstreams.md", "utf8");

describe("agentic framework routing docs", () => {
  it("keeps the stale active plan path as an archive pointer, not a missing implementation target", () => {
    expect(existsSync(activePlanPointerPath)).toBe(true);
    expect(activePlanPointer).toContain("Archived completion pointer");
    expect(activePlanPointer).toContain(archivePath);
    expect(activePlanPointer).toContain("PHASE_1A_COMPLETE_PHASE_1B_MIRRORED_ARCHIVED");
    expect(activePlanPointer).toContain("539e32a");
    expect(activePlanPointer).toContain("https://app.notion.com/p/3748e5dd822b8156a7f5f61da243579c");
    expect(activePlanPointer).toContain("BLOCKED_PLAN_FOLDER_NOT_FOUND");
  });

  it("keeps the plan index aligned with the archive completion truth", () => {
    expect(plansReadme).toContain("completion pointer");
    expect(plansReadme).toContain(archivePath);
    expect(plansReadme).toContain("PHASE_1A_COMPLETE_PHASE_1B_MIRRORED_ARCHIVED");
    expect(plansReadme).not.toContain("Plan created; framework not implemented or enforced.");
  });

  it("ties the pointer to the completion report, current state, and resolved bug", () => {
    expect(completionReport).toContain("Final status:** `PHASE_1A_COMPLETE_PHASE_1B_MIRRORED_ARCHIVED`");
    expect(completionReport).toContain("Phase 1A commit:** `539e32a`");
    expect(phase1Report).toContain("Phase 1B Notion mirror created and fetched");
    expect(currentState).toContain("Agentic Framework Phase 1A/1B Complete And Archived");
    expect(currentState).toContain("Agentic Framework Active-Path Pointer Resolved");
    expect(autopilotBoard).toContain("only as an archive pointer");
    expect(autopilotBoard).toContain(archivePath);
    expect(activeWorkstreams).toContain("archive-pointer README");
    expect(routingBug).toContain("**Status:** Resolved by archive pointer");
    expect(routingBug).toContain(historicalActivePlanPointerPath);
  });
});
