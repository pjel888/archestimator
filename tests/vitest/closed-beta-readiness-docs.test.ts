import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const releaseChecklist = readFileSync(
  ".ai/03_plans/mvp-launch-readiness-2026-06-01/09-release-readiness-checklist.md",
  "utf8",
);
const technicalRiskRegister = readFileSync(
  ".ai/03_plans/mvp-launch-readiness-2026-06-01/10-technical-risk-register.md",
  "utf8",
);
const finalLaunchGate = readFileSync(
  ".ai/03_plans/mvp-launch-readiness-2026-06-01/12-final-mvp-launch-gate.md",
  "utf8",
);
const testStrategy = readFileSync(
  ".ai/03_plans/mvp-launch-readiness-2026-06-01/19-test-strategy-and-fixtures.md",
  "utf8",
);
const launchRunbook = readFileSync(
  ".ai/03_plans/mvp-launch-readiness-2026-06-01/20-launch-runbook.md",
  "utf8",
);
const backupPlan = readFileSync(
  ".ai/03_plans/mvp-launch-readiness-2026-06-01/30-data-backup-disaster-recovery-plan.md",
  "utf8",
);
const zeroDefectMatrix = readFileSync(
  ".ai/03_plans/mvp-launch-readiness-2026-06-01/33-main-feature-zero-defect-test-matrix.md",
  "utf8",
);
const executiveBrief = readFileSync(
  ".ai/03_plans/mvp-launch-readiness-2026-06-01/36-final-executive-launch-brief.md",
  "utf8",
);
const readinessScorecard = readFileSync(
  ".ai/03_plans/mvp-launch-readiness-2026-06-01/43-closed-beta-readiness-scorecard.md",
  "utf8",
);

describe("closed beta readiness docs", () => {
  it("keeps the current local QA baseline aligned with passing DOM evidence", () => {
    expect(releaseChecklist).toContain("`bun run test:dom` | Pass: 129 files / 1014 tests / 2 skipped");
    expect(releaseChecklist).not.toContain("`bun run test:dom` | Fail");
    expect(finalLaunchGate).toContain("`bun run test:dom`: pass, 129 files / 1014 tests with 2 skips");
    expect(launchRunbook).toContain("`bun run test:dom`: pass, 129 files / 1014 tests with 2 skips");
    expect(launchRunbook).not.toContain("`bun run test:dom`: fail");
    expect(executiveBrief).toMatch(/DOM tests, and build passed locally/i);
    expect(testStrategy).toMatch(/Current local Vitest DOM baseline is green/i);
    expect(zeroDefectMatrix).toMatch(/Current local command baseline: \*\*green/i);
  });

  it("keeps launch readiness conservative despite local implementation passes", () => {
    expect(releaseChecklist).toMatch(/Current release state: \*\*NO-GO\*\*/);
    expect(releaseChecklist).toMatch(/hosted\/provider\/manual P0 gates are not proven/i);
    expect(zeroDefectMatrix).toMatch(/Launch state remains \*\*NO-GO\*\*/);
    expect(testStrategy).toMatch(/Hosted\/manual E2E proof is still required/i);
    expect(finalLaunchGate).toMatch(/Current decision: \*\*NO-GO\*\*/);
    expect(executiveBrief).toMatch(/Current decision: \*\*NO-GO\*\*/);
  });

  it("keeps backup and scorecard docs actionable without claiming provider proof", () => {
    expect(backupPlan).toMatch(/Pre-Migration Backup Evidence Template/);
    expect(backupPlan).toMatch(/Dry-Run Restore Checklist/);
    expect(readinessScorecard).toMatch(/Closed beta access control \| Yes \| 82 \| Local pass; linked proof pending/);
    expect(readinessScorecard).toMatch(/Data backup\/rollback \| Yes \| 76 \| Checklist ready; proof missing/);
    expect(readinessScorecard).not.toMatch(/No allowlist table or enforcement exists yet/);
    expect(readinessScorecard).not.toMatch(/Beta-specific terms\/privacy\/AUP not yet implemented/);
  });

  it("keeps executive launch docs current on local mitigations", () => {
    expect(finalLaunchGate).toMatch(/Ask Flip hidden and AI routes disabled by default.+Local pass; production env proof pending/s);
    expect(finalLaunchGate).toMatch(/Excel export is professional bid\/BOQ workbook.+cross-app open proof pending/s);
    expect(finalLaunchGate).not.toMatch(/test:dom` fails/);
    expect(finalLaunchGate).not.toMatch(/Current workbook is insufficient/);
    expect(executiveBrief).toMatch(/local code now hides\/fail-closes AI by default/i);
    expect(executiveBrief).not.toMatch(/AI visible\/callable, `test:dom` red/i);
    expect(technicalRiskRegister).toMatch(/DOM tests regress/);
    expect(technicalRiskRegister).not.toMatch(/DOM tests red/);
  });
});
