import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const launchReadinessReadme = readFileSync(
  ".ai/03_plans/mvp-launch-readiness-2026-06-01/00-README.md",
  "utf8",
);
const releaseChecklist = readFileSync(
  ".ai/03_plans/mvp-launch-readiness-2026-06-01/09-release-readiness-checklist.md",
  "utf8",
);
const currentState = readFileSync(".ai/10_state/current-state.md", "utf8");
const decisions = readFileSync(".ai/10_state/decisions.md", "utf8");
const observabilityRoadmap = readFileSync(
  ".ai/01_roadmap/06-performance-reliability-observability.md",
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
const evidenceIndex = readFileSync(
  ".ai/03_plans/mvp-launch-readiness-2026-06-01/14-evidence-index.md",
  "utf8",
);
const finalImplementationReport = readFileSync(
  ".ai/03_plans/mvp-launch-readiness-2026-06-01/final-codex-implementation-report.md",
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
    expect(currentState).toContain("**Date:** 2026-06-02");
    expect(currentState).toContain("Latest pushed baseline is `c5ca065`");
    expect(currentState).toContain("full `bun run test:dom` passed 131 files / 1021 tests / 2 skipped");
    expect(decisions).toContain("Commit `c5ca065` is the current green local baseline");
    expect(decisions).toContain("full DOM tests (131 files / 1021 tests / 2 skipped)");
    expect(finalImplementationReport).toContain("**Latest implementation baseline before this report:** `8084908`");
    expect(finalImplementationReport).toContain("`bun run test:dom` - pass, 131 files / 1021 tests / 2 skipped");
    expect(finalImplementationReport).toContain("Post-report evidence-sync commits:");
    expect(finalImplementationReport).toContain("`3e8d7a0` - Indexed this final report");
    expect(finalImplementationReport).toContain("`8e0e615` - Aligned final command evidence baselines");
    expect(finalImplementationReport).toContain("`cb87e51` - Synced the launch command-center README");
    expect(finalImplementationReport).toContain("They do not change the implementation baseline or the **NO-GO** recommendation.");
    expect(evidenceIndex).toContain("| Full local implementation baseline | `c5ca065` after demo seed row repair |");
    expect(evidenceIndex).toContain("| Final report baseline | `8084908` after canonical state/decision/roadmap truth sync |");
    expect(evidenceIndex).toContain("| Final report indexed in launch docs | `3e8d7a0` |");
    expect(evidenceIndex).toContain("| `bun run test:dom` | Pass: 131 files / 1021 tests / 2 skipped |");
    expect(evidenceIndex).toContain("PLAYWRIGHT_PORT=3037 bun run test:e2e -- e2e/auth.spec.ts --project=chromium");
    expect(evidenceIndex).toContain("Result: pass, 2 Playwright tests in 9.9s.");
    expect(evidenceIndex).toContain("Hosted Google auth, allowed/denied/revoked allowlist smoke, first-run workspace entry, and session expiry/logout proof remain external/manual gates.");
    expect(evidenceIndex).not.toContain("| HEAD | `1ed86b4f2a3881bf1b946eb81c688071e6736574` |");
    expect(evidenceIndex).not.toContain("Pass: 122 files / 989 tests passed / 2 skipped after AI-001");
    expect(finalLaunchGate).toContain("Full local implementation baseline: `c5ca065` after demo seed row repair.");
    expect(finalLaunchGate).toContain("Local signed-out redirect/login UI E2E pass; hosted allowed/denied/revoked proof missing.");
    expect(finalLaunchGate).not.toContain("HEAD audited: `531f20a`");
    expect(executiveBrief).toContain("Final report indexed in launch docs: `3e8d7a0`.");
    expect(executiveBrief).toContain("Local signed-out auth E2E passed");
    expect(executiveBrief).not.toContain("HEAD: `531f20a`");
    expect(readinessScorecard).toContain("local signed-out redirect/login UI E2E passes; hosted callback, allowed/denied/revoked, and first-run smoke are missing");
    expect(launchReadinessReadme).toContain("Final local implementation report: `final-codex-implementation-report.md`.");
    expect(launchReadinessReadme).toContain("| Product core | 84 | Local pass; manual smoke gap |");
    expect(launchReadinessReadme).toContain("| Excel export | 88 | Local workbook pass; cross-app proof gap |");
    expect(launchReadinessReadme).not.toContain("| Project-specific unlink | 35 | P0 blocker |");
    expect(launchReadinessReadme).not.toContain("Product code changes are out of scope for this pass");
    expect(releaseChecklist).toContain("`bun run test:dom` | Pass: 131 files / 1021 tests / 2 skipped");
    expect(releaseChecklist).not.toContain("`bun run test:dom` | Fail");
    expect(finalLaunchGate).toContain("`bun run test:dom`: pass, 131 files / 1021 tests with 2 skips");
    expect(launchRunbook).toContain("`bun run test:dom`: pass, 131 files / 1021 tests with 2 skips");
    expect(launchRunbook).not.toContain("`bun run test:dom`: fail");
    expect(executiveBrief).toMatch(/DOM tests, and build passed locally/i);
    expect(testStrategy).toMatch(/Current local Vitest DOM baseline is green/i);
    expect(zeroDefectMatrix).toMatch(/Current local command baseline: \*\*green/i);
  });

  it("keeps launch readiness conservative despite local implementation passes", () => {
    expect(currentState).toMatch(/Closed beta remains \*\*NO-GO\*\*/);
    expect(currentState).toMatch(/Do not archive the MVP launch goal or claim launch readiness from local tests alone/i);
    expect(decisions).toMatch(/This is not a launch approval/);
    expect(finalImplementationReport).toMatch(/\*\*NO-GO for external beta testers today\.\*\*/);
    expect(finalImplementationReport).toMatch(/Linked Supabase backup\/PITR proof/);
    expect(finalImplementationReport).toMatch(/Hosted auth smoke/);
    expect(evidenceIndex).toMatch(/Current report recommendation: \*\*NO-GO for external closed beta launch\*\*/);
    expect(finalLaunchGate).toMatch(/final-codex-implementation-report\.md/);
    expect(executiveBrief).toMatch(/final-codex-implementation-report\.md/);
    expect(readinessScorecard).toMatch(/final-codex-implementation-report\.md/);
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

  it("keeps observability roadmap aligned with the local health endpoint", () => {
    expect(currentState).toContain("`/api/health` uptime probe");
    expect(observabilityRoadmap).toMatch(/Uptime monitoring \| PARTIAL \/ LOCAL ONLY/);
    expect(observabilityRoadmap).toContain("Local `/api/health` exists");
    expect(observabilityRoadmap).toContain("Configure uptime monitoring");
    expect(observabilityRoadmap).not.toContain("No health endpoint (`/api/health` does not exist)");
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
