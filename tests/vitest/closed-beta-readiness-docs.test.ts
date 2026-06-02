import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const launchReadinessReadme = readFileSync(
  ".ai/03_plans/mvp-launch-readiness-2026-06-01/00-README.md",
  "utf8",
);
const releaseChecklist = readFileSync(
  ".ai/03_plans/mvp-launch-readiness-2026-06-01/09-release-readiness-checklist.md",
  "utf8",
);
const manualProofMatrix = readFileSync(
  ".ai/03_plans/mvp-launch-readiness-2026-06-01/46-manual-proof-matrix.md",
  "utf8",
);
const goalCompletionAudit = readFileSync(
  ".ai/03_plans/mvp-launch-readiness-2026-06-01/47-goal-completion-audit.md",
  "utf8",
);
const manualProofPacketTemplate = readFileSync(
  ".ai/03_plans/mvp-launch-readiness-2026-06-01/48-manual-proof-packet-template.md",
  "utf8",
);
const consolidatedManualProofPacket = readFileSync(
  ".ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/README.md",
  "utf8",
);
const currentState = readFileSync(".ai/10_state/current-state.md", "utf8");
const decisions = readFileSync(".ai/10_state/decisions.md", "utf8");
const knownIssues = readFileSync(".ai/10_state/known-issues.md", "utf8");
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
const performancePlan = readFileSync(
  ".ai/03_plans/mvp-launch-readiness-2026-06-01/23-performance-caching-redis-scalability-plan.md",
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
const mvpFeatureCompletionPlan = readFileSync(
  ".ai/03_plans/mvp-launch-readiness-2026-06-01/04-mvp-feature-completion-plan.md",
  "utf8",
);
const executiveBrief = readFileSync(
  ".ai/03_plans/mvp-launch-readiness-2026-06-01/36-final-executive-launch-brief.md",
  "utf8",
);
const architectureDecisionRecords = readFileSync(
  ".ai/03_plans/mvp-launch-readiness-2026-06-01/34-architecture-decision-records.md",
  "utf8",
);
const readinessScorecard = readFileSync(
  ".ai/03_plans/mvp-launch-readiness-2026-06-01/43-closed-beta-readiness-scorecard.md",
  "utf8",
);
const closedBetaCouncilReview = readFileSync(
  ".ai/03_plans/mvp-launch-readiness-2026-06-01/45-fourth-pass-closed-beta-council-review.md",
  "utf8",
);
const observabilityPlan = readFileSync(
  ".ai/03_plans/mvp-launch-readiness-2026-06-01/27-observability-monitoring-support-plan.md",
  "utf8",
);
const betaProgramPlan = readFileSync(
  ".ai/03_plans/mvp-launch-readiness-2026-06-01/29-beta-program-readiness-plan.md",
  "utf8",
);
const closedBetaOperationsRunbook = readFileSync(
  ".ai/03_plans/mvp-launch-readiness-2026-06-01/40-closed-beta-operations-runbook.md",
  "utf8",
);
const manualProofPacketDir = ".ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof";

function extractManualProofArtifactFilenames(packet: string) {
  return Array.from(packet.matchAll(/`([^`]+)`/g), (match) => match[1])
    .filter((value) => /^[\w.-]+\.(md|json|png|xlsx)$/.test(value))
    .filter((value) => !["14-evidence-index.md", "47-goal-completion-audit.md", "48-manual-proof-packet-template.md"].includes(value));
}

describe("closed beta readiness docs", () => {
  it("keeps the current local QA baseline aligned with passing DOM evidence", () => {
    expect(currentState).toContain("**Date:** 2026-06-02");
    expect(currentState).toContain("Latest pushed implementation baseline is `c5ca065`");
    expect(currentState).toContain("latest local validation and app build refresh is `1a6dcc5`");
    expect(currentState).toContain("full `bun run test:dom` passed 131 files / 1021 tests / 2 skipped");
    expect(currentState).toContain("Current validation refresh at `1a6dcc5`: `bun run validate` passed");
    expect(currentState).toContain("`bun run validate` passed typecheck");
    expect(currentState).toContain("DOM tests (151 files / 1119 passed / 2 skipped)");
    expect(currentState).toContain("Current build refresh at `1a6dcc5`: `bun run build` passed");
    expect(currentState).toContain("generated 32 static pages");
    expect(decisions).toContain("Commit `c5ca065` is the green local implementation baseline");
    expect(decisions).toContain("full DOM tests (131 files / 1021 tests / 2 skipped)");
    expect(decisions).toContain("Current validation refresh at `1a6dcc5` passed `bun run validate`");
    expect(decisions).toContain("DOM tests (151 files / 1119 passed / 2 skipped)");
    expect(decisions).toContain("Current app build refresh at `1a6dcc5` passed `bun run build`");
    expect(finalImplementationReport).toContain("**Latest implementation baseline before this report:** `8084908`");
    expect(finalImplementationReport).toContain("`bun run test:dom` - pass, 131 files / 1021 tests / 2 skipped");
    expect(finalImplementationReport).toContain("Post-report evidence-sync commits:");
    expect(finalImplementationReport).toContain("`3e8d7a0` - Indexed this final report");
    expect(finalImplementationReport).toContain("`8e0e615` - Aligned final command evidence baselines");
    expect(finalImplementationReport).toContain("`cb87e51` - Synced the launch command-center README");
    expect(finalImplementationReport).toContain("`a65b34b` - Recorded local signed-out auth E2E smoke evidence.");
    expect(finalImplementationReport).toContain("`e6cf52b` - Recorded the prior local validation refresh in the launch evidence pack.");
    expect(finalImplementationReport).toContain("`7ba69e6` - Recorded the current local build refresh in the launch evidence pack.");
    expect(finalImplementationReport).toContain("`3b01cd2` - Added the active-goal completion audit.");
    expect(finalImplementationReport).toContain("`9d71239` - Added the manual proof packet template.");
    expect(finalImplementationReport).toContain("`fd5d4b3` - Failed unconfigured production-like email delivery closed with `EMAIL_NOT_CONFIGURED`.");
    expect(finalImplementationReport).toContain("`61160ee` - Disabled shared-link recipient entry/send/resend controls while server email readiness is false.");
    expect(finalImplementationReport).toContain("`9066726` - Made beta feedback persistable before launch.");
    expect(finalImplementationReport).toContain("`21e2f43` - Made beta feedback reviewable before launch.");
    expect(finalImplementationReport).toContain("`2667583` - Made beta allowlist management available before launch.");
    expect(finalImplementationReport).toContain("`70e80c9` - Made closed-beta settings tools discoverable.");
    expect(finalImplementationReport).toContain("`165e4a3` - Recorded current-head Vercel preview proof before launch.");
    expect(finalImplementationReport).toContain("`08a58dd` - Refreshed linked Supabase launch blockers with read-only proof.");
    expect(finalImplementationReport).toContain("`567f3c5` - Synced the launch gate to the current linked Supabase refresh.");
    expect(finalImplementationReport).toContain("`6c22c3f` - Stopped treating docs-only commits as runtime-preview invalidation.");
    expect(finalImplementationReport).toContain("`bc1c715` - Clarified the spreadsheet app proof blocker.");
    expect(finalImplementationReport).toContain("`988d3c2` - Refreshed local validation evidence at current head.");
    expect(finalImplementationReport).toContain("`97c7d60` - Benchmarked proposal workbook export scale.");
    expect(finalImplementationReport).toContain("`5aa345d` - Proved the proposal export route builds workbooks locally.");
    expect(finalImplementationReport).toContain("`1ea3b6a` - Proved the proposal benchmark fixture stays coherent.");
    expect(finalImplementationReport).toContain("`b60f911` - Guarded manual proof packet references.");
    expect(finalImplementationReport).toContain("Current local validation refresh at `1a6dcc5` passed `bun run validate`");
    expect(finalImplementationReport).toContain("Latest local export evidence adds the synthetic 500 / 1,000 / 2,500-row workbook benchmark");
    expect(finalImplementationReport).toContain("Current app build refresh at `1a6dcc5`:");
    expect(finalImplementationReport).toContain("Current local export proof through `1ea3b6a`:");
    expect(finalImplementationReport).toContain("benchmark-fixture regression coverage");
    expect(finalImplementationReport).toContain("Latest app-runtime Vercel preview refresh at `638f681`:");
    expect(finalImplementationReport).toContain("Current linked Supabase readiness refresh at `08a58dd`:");
    expect(finalImplementationReport).toContain("dpl_8cpgQgEtrAgo6P5gX1fn3LwBJzdS");
    expect(finalLaunchGate).toContain("Latest app-runtime Vercel preview refresh: `638f681`");
    expect(finalLaunchGate).toContain("Current linked Supabase readiness refresh: `08a58dd`");
    expect(finalLaunchGate).toContain("public preview health returns HTTP 401");
    expect(executiveBrief).toContain("Latest app-runtime Vercel preview refresh: `638f681`");
    expect(executiveBrief).toContain("Current linked Supabase readiness refresh: `08a58dd`");
    expect(readinessScorecard).toContain("Latest app-runtime preview for `638f681` reached Ready");
    expect(readinessScorecard).toContain("linked Supabase readiness refresh at `08a58dd` found five launch migrations");
    expect(readinessScorecard).toContain("dpl_8cpgQgEtrAgo6P5gX1fn3LwBJzdS");
    expect(finalImplementationReport).toContain("The remaining manual/provider proof packet is now centralized in `46-manual-proof-matrix.md`");
    expect(finalImplementationReport).toContain("The active-goal completion audit is centralized in `47-goal-completion-audit.md`");
    expect(finalImplementationReport).toContain("They do not change the implementation baseline or the **NO-GO** recommendation.");
    expect(evidenceIndex).toContain("| Full local implementation baseline | `c5ca065` after demo seed row repair |");
    expect(evidenceIndex).toContain("Manual proof matrix artifact: `46-manual-proof-matrix.md`.");
    expect(evidenceIndex).toContain("Consolidated manual proof packet: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/README.md`.");
    expect(evidenceIndex).toContain("Goal completion audit artifact: `47-goal-completion-audit.md`.");
    expect(evidenceIndex).toContain("Manual proof packet template: `48-manual-proof-packet-template.md`.");
    expect(evidenceIndex).toContain("| Final report baseline | `8084908` after canonical state/decision/roadmap truth sync |");
    expect(evidenceIndex).toContain("| Final report indexed in launch docs | `3e8d7a0` |");
    expect(evidenceIndex).toContain("| Current local validation refresh | `1a6dcc5`, `bun run validate` pass |");
    expect(evidenceIndex).toContain("| Current local app build refresh | `1a6dcc5`, `bun run build` pass |");
    expect(evidenceIndex).toContain("`bun run test:dom` | Historical baseline pass: 131 files / 1021 tests / 2 skipped; current validation refresh pass: 151 files / 1119 passed / 2 skipped |");
    expect(evidenceIndex).toContain("### CURRENT-HEAD Local Validation Refresh Evidence");
    expect(evidenceIndex).toContain("### CURRENT-HEAD Local Build Refresh Evidence");
    expect(evidenceIndex).toContain("### Manual Proof Matrix Evidence");
    expect(evidenceIndex).toContain("### Consolidated Manual Proof Packet");
    expect(evidenceIndex).toContain("The packet consolidates current proof rows as `partial-local`, `partial-blocked`, or `blocked`");
    expect(evidenceIndex).toContain("### Provider State Refresh at b33f56d");
    expect(evidenceIndex).toContain("provider-state-refresh-b33f56d-2026-06-02.md");
    expect(evidenceIndex).toContain("deployment `dpl_6psx8VnKmAgcU17jHk9xVSpavTi4`");
    expect(evidenceIndex).toContain("`supabase migration list --linked` now succeeds and still shows launch migrations");
    expect(evidenceIndex).toContain("### Provider State Refresh at d78686f");
    expect(evidenceIndex).toContain("provider-state-refresh-d78686f-2026-06-02.md");
    expect(evidenceIndex).toContain("deployment `dpl_BxmQY4ufymmGUxAEJyK9fyRcGvmh`");
    expect(evidenceIndex).toContain("archestimator-ll6yo0r97-philipjonlewis-projects.vercel.app");
    expect(evidenceIndex).toContain("plain public preview and branch-alias health still return HTTP `401`");
    expect(evidenceIndex).toContain("### Goal Completion Audit Evidence");
    expect(evidenceIndex).toContain("### Beta Allowlist Admin Local Evidence");
    expect(evidenceIndex).toContain("beta-allowlist-admin-local-2026-06-02.md");
    expect(evidenceIndex).toContain("20260602005649_beta_allowlist_admin_queue.sql");
    expect(evidenceIndex).toContain("`/workshop/settings/beta-users` renders add/filter/status/notes controls for platform admins");
    expect(evidenceIndex).toContain("the app does not grant delete access");
    expect(evidenceIndex).toContain("### Supabase Read-Only Provider Evidence");
    expect(evidenceIndex).toContain("### Vercel Read-Only Provider Evidence");
    expect(evidenceIndex).toContain("### Vercel Protection Read-Only Refresh");
    expect(evidenceIndex).toContain("vercel-protection-read-only-2026-06-02.md");
    expect(evidenceIndex).toContain("one env-var-backed `automation-bypass` entry remains");
    expect(evidenceIndex).toContain("### Provider State Refresh Evidence");
    expect(evidenceIndex).toContain("provider-state-refresh-2026-06-02.md");
    expect(evidenceIndex).toContain("archestimator-j29iumqi0-philipjonlewis-projects.vercel.app");
    expect(evidenceIndex).toContain("dpl_3UUiMA7Tc6ubJSgckDKBdjGMmnSp");
    expect(evidenceIndex).toContain("this earlier refresh showed `20260601182522_closed_beta_allowed_emails` and `20260601184343_unlink_estimate_row_items` as local-only");
    expect(evidenceIndex).toContain("### Supabase Linked Readiness Refresh Evidence");
    expect(evidenceIndex).toContain("supabase-linked-readiness-refresh-2026-06-02.md");
    expect(evidenceIndex).toContain("false` for migrations `20260601182522`, `20260601184343`, `20260602005649`, `20260602083000`, and `20260602084500`");
    expect(evidenceIndex).toContain("36 `anon_security_definer_function_executable`, 62 `authenticated_security_definer_function_executable`, 3 `function_search_path_mutable`");
    expect(evidenceIndex).toContain("linked Supabase remains **NO-GO**");
    expect(evidenceIndex).toContain("### Vercel Current-Head Read-Only Evidence");
    expect(evidenceIndex).toContain("vercel-current-head-read-only-638f681-2026-06-02.md");
    expect(evidenceIndex).toContain("runtime-proof-anchor-policy-2026-06-02.md");
    expect(evidenceIndex).toContain("later docs/evidence-only commits do not invalidate this app-runtime proof");
    expect(evidenceIndex).toContain("archestimator-4s6wzqt08-philipjonlewis-projects.vercel.app");
    expect(evidenceIndex).toContain("dpl_8cpgQgEtrAgo6P5gX1fn3LwBJzdS");
    expect(evidenceIndex).toContain("plain `curl -I` to the preview and `git-main` health routes still returns HTTP `401`");
    expect(evidenceIndex).toContain("still maps `archestimator.com`, `www.archestimator.com`, and `archestimator.vercel.app` to older production deployment `dpl_FwfHexBsB1xSHDqHqFwHSYpCYTVH`");
    expect(evidenceIndex).toContain("### Vercel Custom Domain Readiness Evidence");
    expect(evidenceIndex).toContain("vercel-custom-domain-readiness-blocked-2026-06-02.md");
    expect(evidenceIndex).toContain("dpl_FwfHexBsB1xSHDqHqFwHSYpCYTVH");
    expect(evidenceIndex).toContain("Archestimator — Coming Soon");
    expect(evidenceIndex).toContain("Production/custom-domain health remains **NO-GO**");
    expect(evidenceIndex).toContain("### Vercel Production Alias/Rollback Readiness Helper");
    expect(evidenceIndex).toContain("scripts/check-vercel-production-readiness.ts");
    expect(evidenceIndex).toContain("vercel-production-readiness-fc8f53e-2026-06-02.json");
    expect(evidenceIndex).toContain("`vercelProductionReady: false`");
    expect(evidenceIndex).toContain("### Provider State Refresh at 87f603e");
    expect(evidenceIndex).toContain("provider-state-refresh-87f603e-2026-06-02.md");
    expect(evidenceIndex).toContain("archestimator-bssvp0rrd-philipjonlewis-projects.vercel.app");
    expect(evidenceIndex).toContain("dpl_GdDjZoaGocCpAVVEa3oaSm9nCody");
    expect(evidenceIndex).toContain("linked SQL parser exits `1` with `linkedSupabaseLaunchReady=false`");
    expect(currentState).toContain("**Provider State Refresh Evidence (2026-06-02):**");
    expect(currentState).toContain("plain health remains deployment-protected with HTTP 401");
    expect(currentState).toContain("**Provider State Refresh at b33f56d (2026-06-02):**");
    expect(currentState).toContain("deployment `dpl_6psx8VnKmAgcU17jHk9xVSpavTi4` for commit `b33f56d` is Ready");
    expect(currentState).toContain("`supabase migration list --linked` now succeeds instead of hitting the prior temp-role circuit breaker");
    expect(currentState).toContain("**Provider State Refresh at d78686f (2026-06-02):**");
    expect(currentState).toContain("deployment `dpl_BxmQY4ufymmGUxAEJyK9fyRcGvmh` for commit `d78686f` is Ready");
    expect(currentState).toContain("public preview and branch-alias health return HTTP 401");
    expect(currentState).toContain("**Provider State Refresh at 87f603e (2026-06-02):**");
    expect(currentState).toContain("deployment `dpl_GdDjZoaGocCpAVVEa3oaSm9nCody`");
    expect(currentState).toContain("protected preview plus branch-alias `/api/health` return app health JSON through `vercel curl`");
    expect(currentState).toContain("**Supabase Linked Readiness Refresh (2026-06-02):**");
    expect(currentState).toContain("`closed_beta_allowed_emails`, `beta_feedback_submissions`, `check_closed_beta_access`, and `unlink_estimate_row_item_from_library_with_history` absent");
    expect(currentState).toContain("Linked Supabase remains **NO-GO**");
    expect(currentState).toContain("**Vercel Current-Head Evidence (2026-06-02):**");
    expect(currentState).toContain("latest app-runtime commit `638f681` has Ready preview deployment");
    expect(currentState).toContain("**Runtime Proof Anchor Policy (2026-06-02):**");
    expect(currentState).toContain("Later evidence-only commits `c93ae7a` and `13f5acb` do not invalidate the `638f681` Vercel app-runtime proof");
    expect(currentState).toContain("**Vercel Protection Evidence (2026-06-02):**");
    expect(currentState).toContain("**Vercel Public Health Readiness Helper (2026-06-02):**");
    expect(currentState).toContain("`vercelHealthReady` is `false`");
    expect(currentState).toContain("**Vercel Production Alias/Rollback Readiness Helper (2026-06-02):**");
    expect(currentState).toContain("`vercelProductionReady` is `false`");
    expect(currentState).toContain("**Hosted Auth Route Proof Helper (2026-06-02):**");
    expect(currentState).toContain("`bun run launch:verify-hosted-auth` now provides a sanitized operator helper");
    expect(currentState).toContain("one env-var-backed `automation-bypass` entry remains");
    expect(currentState).toContain("Vercel env vars remain absent");
    expect(currentState).toContain("public preview and branch-alias health remain deployment-protected with HTTP 401");
    expect(currentState).toContain("**Vercel Custom Domain Evidence (2026-06-02):**");
    expect(currentState).toContain("Production/custom-domain app health remains missing");
    expect(knownIssues).toContain("Provider state refresh evidence on 2026-06-02 confirms Vercel and linked Supabase remain blocked");
    expect(knownIssues).toContain("Provider state refresh at `d78686f` on 2026-06-02 confirms the latest pushed `main` preview is Ready");
    expect(knownIssues).toContain("Provider state refresh at `87f603e` on 2026-06-02 confirms the latest pushed `main` preview is Ready");
    expect(knownIssues).toContain("Vercel public health readiness evidence on 2026-06-02 remains blocked");
    expect(knownIssues).toContain("`vercel-health-readiness-2776a32-2026-06-02.json` reports branch-alias public `/api/health` is HTTP `401`");
    expect(knownIssues).toContain("Vercel production alias/rollback readiness evidence on 2026-06-02 remains blocked");
    expect(knownIssues).toContain("vercel-production-readiness-fc8f53e-2026-06-02.json");
    expect(knownIssues).toContain("`bun run launch:verify-hosted-auth` is available as a sanitized hosted `/workshop` route helper");
    expect(knownIssues).toContain("Supabase linked readiness refresh on 2026-06-02 confirms linked launch migrations and objects remain absent");
    expect(knownIssues).toContain("Vercel current-head read-only evidence on 2026-06-02 confirms latest app-runtime commit `638f681` has Ready preview deployment");
    expect(knownIssues).toContain("Vercel protection read-only evidence on 2026-06-02 confirms SSO protection remains");
    expect(knownIssues).toContain("Vercel custom-domain evidence on 2026-06-02 confirms");
    expect(evidenceIndex).toContain("### Spreadsheet Artifact Local Evidence");
    expect(evidenceIndex).toContain("spreadsheet-quicklook-preview-2026-06-02.md");
    expect(evidenceIndex).toContain("spreadsheet-app-availability-refresh-2026-06-02.md");
    expect(evidenceIndex).toContain("proposal-workbook-large-fixture-benchmark-2026-06-02.md");
    expect(evidenceIndex).toContain("proposal-export-route-workbook-local-2026-06-02.md");
    expect(evidenceIndex).toContain("synthetic 500 / 1,000 / 2,500 row proposal models generated buffers in 148.12ms / 165.56ms / 362.06ms");
    expect(evidenceIndex).toContain("actual route returns loadable XLSX bytes");
    expect(performancePlan).toContain("The 2,500-row workbook generated in 362.06ms");
    expect(performancePlan).toContain("verifies the actual XLSX route can return loadable workbook bytes");
    expect(performancePlan).toContain("hosted route proof is still required");
    expect(evidenceIndex).toContain("`Google Sheets.app` is installed, but it is a Google Drive shortcut app");
    expect(evidenceIndex).toContain("qlmanage -t -s 1200");
    expect(evidenceIndex).toContain("1200 x 892 PNG thumbnail");
    expect(currentState).toContain("**Spreadsheet Quick Look Preview Evidence (2026-06-02):**");
    expect(currentState).toContain("**Spreadsheet App Availability Refresh (2026-06-02):**");
    expect(currentState).toContain("Google Sheets.app` is present as a Google Drive shortcut app");
    expect(currentState).toContain("local macOS preview rendering only");
    expect(knownIssues).toContain("Spreadsheet Quick Look preview evidence on 2026-06-02");
    expect(knownIssues).toContain("Google Sheets.app` exists only as a Google Drive shortcut app");
    expect(knownIssues).toContain("Spreadsheet compatibility remains blocked");
    expect(evidenceIndex).toContain("### Component/Template Demo Local Smoke Evidence");
    expect(evidenceIndex).toContain("library-demo-smoke-local-2026-06-02.md");
    expect(evidenceIndex).toContain("component-library-demo-smoke-2026-06-02.png");
    expect(evidenceIndex).toContain("template-library-demo-smoke-2026-06-02.png");
    expect(evidenceIndex).toContain("Result: pass, 2 Playwright tests in 17.6s.");
    expect(evidenceIndex).toContain("it does not prove hosted auth, production Vercel, RLS allow/deny, or project-specific unlink");
    expect(evidenceIndex).toContain("### Template Insert Local Smoke Evidence");
    expect(evidenceIndex).toContain("template-insert-local-smoke-2026-06-02.md");
    expect(evidenceIndex).toContain("Result: pass, 1 Playwright test in 46.1s.");
    expect(evidenceIndex).toContain("verified linked Supabase counts changed from 51 nodes / 0 rows to 56 nodes / 8 rows");
    expect(evidenceIndex).toContain("Cleanup proof: post-run residue check found no `E2E Template Insert%` estimates.");
    expect(evidenceIndex).toContain("It does not prove hosted auth, production Vercel, RLS allow/deny, provider dashboards, or project-specific unlink.");
    expect(evidenceIndex).toContain("### Support/Feedback Local Surface Evidence");
    expect(evidenceIndex).toContain("support-feedback-local-surface-2026-06-02.md");
    expect(evidenceIndex).toContain("WorkshopPageShell` renders `Send beta feedback`");
    expect(evidenceIndex).toContain("### Beta Feedback In-App Local Evidence");
    expect(evidenceIndex).toContain("beta-feedback-in-app-local-2026-06-02.md");
    expect(evidenceIndex).toContain("20260602083000_beta_feedback_submissions.sql");
    expect(evidenceIndex).toContain("`/workshop/feedback` renders a protected feedback form");
    expect(evidenceIndex).toContain("Linked Supabase migration apply, hosted browser smoke, monitored review workflow");
    expect(evidenceIndex).toContain("monitored inbox/table review, uptime/error alerts, or incident ownership");
    expect(evidenceIndex).toContain("### Beta Feedback Review Queue Local Evidence");
    expect(evidenceIndex).toContain("beta-feedback-review-queue-local-2026-06-02.md");
    expect(evidenceIndex).toContain("20260602084500_beta_feedback_review_queue.sql");
    expect(evidenceIndex).toContain("`/workshop/settings/feedback` renders the review/filter/status-update queue for platform admins");
    expect(evidenceIndex).toContain("non-admin users receive an unauthorized state instead of feedback rows");
    expect(evidenceIndex).toContain("hosted admin access, daily review cadence, monitored inbox/table ownership");
    expect(evidenceIndex).toContain("### Legal/Owner Readiness Helper");
    expect(evidenceIndex).toContain("scripts/check-legal-owner-readiness.ts");
    expect(evidenceIndex).toContain("`bun run launch:check-legal-owner`");
    expect(evidenceIndex).toContain("legal-owner-readiness-ede0f32-2026-06-02.json");
    expect(evidenceIndex).toContain("`legalOwnerReady: false`");
    expect(evidenceIndex).toContain("all five proof flags false");
    expect(evidenceIndex).toContain("product owner / legal reviewer / approval date / approval reference missing");
    expect(evidenceIndex).toContain("### Settings Hub Local Evidence");
    expect(evidenceIndex).toContain("settings-hub-local-2026-06-02.md");
    expect(evidenceIndex).toContain("`/workshop/settings` is now a protected hub instead of an immediate profile redirect");
    expect(evidenceIndex).toContain("Profile, Workspace, Beta users, and Beta feedback cards are discoverable from one Settings entry");
    expect(evidenceIndex).toContain("platform-operation cards render only for `ceo` or `admin` roles");
    expect(evidenceIndex).toContain("### Support Email DNS Readiness Evidence");
    expect(evidenceIndex).toContain("support-email-dns-readiness-2026-06-02.md");
    expect(evidenceIndex).toContain("five `eforward*.registrar-servers.com` MX records");
    expect(evidenceIndex).toContain("returned no answer");
    expect(evidenceIndex).toContain("### Support Monitoring Readiness Helper");
    expect(evidenceIndex).toContain("scripts/check-support-monitoring-readiness.ts");
    expect(evidenceIndex).toContain("`bun run launch:check-support-monitoring`");
    expect(evidenceIndex).toContain("support-monitoring-readiness-c9c1141-2026-06-02.json");
    expect(evidenceIndex).toContain("`supportMonitoringReady: false`");
    expect(evidenceIndex).toContain("all five proof flags false");
    expect(evidenceIndex).toContain("all owner labels missing");
    expect(evidenceIndex).toContain("9 missing checks");
    expect(evidenceIndex).toContain("### Project-Specific Unlink Linked Smoke Attempt");
    expect(evidenceIndex).toContain("project-specific-unlink-linked-smoke-blocked-2026-06-02.md");
    expect(evidenceIndex).toContain("linked Supabase returned `PGRST202`");
    expect(evidenceIndex).toContain("unlink_estimate_row_item_from_library_with_history");
    expect(evidenceIndex).toContain("Cleanup proof: post-run residue check found no `E2E Project Specific%` estimates.");
    expect(evidenceIndex).toContain("no listed backups, `pitr_enabled=false`");
    expect(evidenceIndex).toContain("linked temp-role pooler circuit breaker");
    expect(evidenceIndex).toContain("### Supabase Linked Schema Parity Evidence");
    expect(evidenceIndex).toContain("supabase-linked-schema-parity-2026-06-02.md");
    expect(evidenceIndex).toContain("linked history is missing `20260601182522_closed_beta_allowed_emails` and `20260601184343_unlink_estimate_row_items`");
    expect(evidenceIndex).toContain("`closed_beta_allowed_emails`, `check_closed_beta_access(text)`, and `unlink_estimate_row_item_from_library_with_history(...)` are absent on linked Supabase");
    expect(evidenceIndex).toContain("`component-images` bucket is public");
    expect(evidenceIndex).toContain("### Resend Email Readiness Evidence");
    expect(evidenceIndex).toContain("resend-email-readiness-blocked-2026-06-02.md");
    expect(evidenceIndex).toContain("resend-readiness-b0e04f4-2026-06-02.json");
    expect(evidenceIndex).toContain("`bun run launch:check-resend-readiness`");
    expect(evidenceIndex).toContain("Vercel env proof: `vercel env ls --non-interactive` returned `No Environment Variables found`");
    expect(evidenceIndex).toContain("`RESEND_FROM`, `RESEND_REPLY_TO`, and `RESEND_WEBHOOK_SECRET` are missing or empty");
    expect(evidenceIndex).toContain("zero Vercel Resend env names discovered");
    expect(evidenceIndex).toContain("recipient email controls disabled");
    expect(evidenceIndex).toContain("in-app email workflows cannot be treated as launch-ready or re-enabled");
    expect(evidenceIndex).toContain("### First-Run Workshop Local Surface Evidence");
    expect(evidenceIndex).toContain("first-run-workshop-local-surface-2026-06-02.md");
    expect(evidenceIndex).toContain("covers default workspace reuse/creation");
    expect(evidenceIndex).toContain("empty `WorkshopHomebaseClient`");
    expect(evidenceIndex).toContain("not hosted first-run proof");
    expect(evidenceIndex).toContain("### Current Local E2E Smoke Evidence");
    expect(evidenceIndex).toContain("current-local-e2e-smoke-2026-06-02.md");
    expect(evidenceIndex).toContain("Local dev-auth result: pass, 3 tests in 38.9s.");
    expect(evidenceIndex).toContain("signed-out protected-route redirect/login UI");
    expect(evidenceIndex).toContain("template insertion into a throwaway linked Supabase estimate");
    expect(evidenceIndex).toContain("### Demo Rehearsal Fallback Pack");
    expect(evidenceIndex).toContain("demo-rehearsal-fallback-pack-2026-06-02.md");
    expect(evidenceIndex).toContain("component-library-demo-smoke-2026-06-02.png");
    expect(evidenceIndex).toContain("not a live hosted rehearsal");
    expect(currentState).toContain("**Demo Rehearsal Fallback Pack (2026-06-02):**");
    expect(currentState).toContain("local investor/incubator fallback packet");
    expect(currentState).toContain("live rehearsal, and owner sign-off remain missing");
    expect(knownIssues).toContain("Demo rehearsal fallback evidence on 2026-06-02");
    expect(knownIssues).toContain("it is not a live rehearsal pass");
    expect(evidenceIndex).toContain("current-head-local-validation-build-1a6dcc5-2026-06-02.md");
    expect(evidenceIndex).toContain("Current app build anchor: `1a6dcc5` on `main`, before this docs-only evidence-sync commit.");
    expect(evidenceIndex).toContain("PLAYWRIGHT_PORT=3037 bun run test:e2e -- e2e/auth.spec.ts --project=chromium");
    expect(evidenceIndex).toContain("Result: pass, 2 Playwright tests in 9.9s.");
    expect(evidenceIndex).toContain("Hosted Google auth, allowed/denied/revoked allowlist smoke, first-run workspace entry, and session expiry/logout proof remain external/manual gates.");
    expect(evidenceIndex).toContain("### Full Local E2E Refresh at bb9006d");
    expect(evidenceIndex).toContain("full-local-e2e-refresh-bb9006d-2026-06-02.md");
    expect(evidenceIndex).toContain("PLAYWRIGHT_PORT=3020 bun run test:e2e -- --project=chromium");
    expect(evidenceIndex).toContain("9 Playwright tests passed and 24 env-gated/live-provider specs skipped");
    expect(evidenceIndex).toContain("retires the stale full-suite local blocker");
    expect(evidenceIndex).toContain("### Hosted Auth Route Proof Helper");
    expect(evidenceIndex).toContain("### Supabase Backup/PITR Readiness Helper");
    expect(evidenceIndex).toContain("scripts/check-supabase-backup-readiness.ts");
    expect(evidenceIndex).toContain("supabase-backup-readiness-26bc6e3-2026-06-02.json");
    expect(evidenceIndex).toContain("`supabaseBackupReady: false`");
    expect(evidenceIndex).toContain("### Supabase Migration List Readiness Helper");
    expect(evidenceIndex).toContain("scripts/check-supabase-migration-readiness.ts");
    expect(evidenceIndex).toContain("supabase-migration-readiness-65b21eb-2026-06-02.json");
    expect(evidenceIndex).toContain("`linkedMigrationsReady: false`");
    expect(evidenceIndex).toContain("### Supabase Linked Readiness Parser Helper");
    expect(evidenceIndex).toContain("scripts/check-supabase-linked-readiness.ts");
    expect(evidenceIndex).toContain("supabase-linked-readiness-4687432-2026-06-02.json");
    expect(evidenceIndex).toContain("`linkedSupabaseLaunchReady: false`");
    expect(evidenceIndex).toContain("scripts/verify-hosted-auth-routes.ts");
    expect(evidenceIndex).toContain("does not prove Google OAuth, hosted cookies, callback URLs, linked allowlist data, or first-run workspace behavior");
    expect(evidenceIndex).not.toContain("| HEAD | `1ed86b4f2a3881bf1b946eb81c688071e6736574` |");
    expect(evidenceIndex).not.toContain("Pass: 122 files / 989 tests passed / 2 skipped after AI-001");
    expect(finalLaunchGate).toContain("Full local implementation baseline: `c5ca065` after demo seed row repair.");
    expect(finalLaunchGate).toContain("Current local validation refresh: `1a6dcc5`, `bun run validate` pass.");
    expect(finalLaunchGate).toContain("Current local app build refresh: `1a6dcc5`, `bun run build` pass.");
    expect(finalLaunchGate).toContain("Resend guardrail refresh: `fd5d4b3`");
    expect(finalLaunchGate).toContain("`61160ee` disables shared-link recipient entry/send/resend controls");
    expect(finalLaunchGate).toContain("Local signed-out redirect/login UI E2E pass; hosted allowed/denied/revoked proof missing.");
    expect(finalLaunchGate).toContain("Use `46-manual-proof-matrix.md` as the required evidence checklist");
    expect(finalLaunchGate).toContain("Use `47-goal-completion-audit.md` before any claim");
    expect(finalLaunchGate).not.toContain("HEAD audited: `531f20a`");
    expect(executiveBrief).toContain("Final report indexed in launch docs: `3e8d7a0`.");
    expect(executiveBrief).toContain("Current local validation refresh: `1a6dcc5`, `bun run validate` passed");
    expect(executiveBrief).toContain("Current local app build refresh: `1a6dcc5`, `bun run build` passed");
    expect(executiveBrief).toContain("Latest app-runtime Vercel preview refresh: `638f681`");
    expect(executiveBrief).toContain("Resend guardrail refresh: `fd5d4b3`");
    expect(executiveBrief).toContain("`61160ee` disables shared-link recipient entry/send/resend controls");
    expect(executiveBrief).toContain("Local signed-out auth E2E passed");
    expect(executiveBrief).toContain("Use `46-manual-proof-matrix.md` as the operator checklist");
    expect(executiveBrief).toContain("Use `47-goal-completion-audit.md` to check whether the active launch goal can be completed");
    expect(executiveBrief).not.toContain("HEAD: `531f20a`");
    expect(readinessScorecard).toContain("local signed-out redirect/login UI E2E passes; Vercel env list is empty");
    expect(readinessScorecard).toContain("records current local validation/build evidence through `1a6dcc5`");
    expect(readinessScorecard).toContain("latest read-only provider refresh evidence through `d78686f`");
    expect(readinessScorecard).toContain("records app-runtime provider/manual proof evidence through `638f681`, evidence-only provider-risk docs through `13f5acb`, and latest read-only provider refresh evidence through `d78686f`");
    expect(readinessScorecard).toContain("records linked Supabase readiness refresh evidence through `08a58dd`");
    expect(readinessScorecard).toContain("records Supabase, Vercel, spreadsheet artifact/app-availability, local component/template demo, local template insertion evidence, beta operations runbook readiness, and Resend fail-closed/disabled-controls guardrails");
    expect(readinessScorecard).toContain("| Beta operations | Yes | 82 | Procedures documented; live ops proof pending |");
    expect(readinessScorecard).toContain("Manual proof matrix: `46-manual-proof-matrix.md`");
    expect(readinessScorecard).toContain("Goal completion audit: `47-goal-completion-audit.md`");
    expect(launchReadinessReadme).toContain("Final local implementation report: `final-codex-implementation-report.md`.");
    expect(launchReadinessReadme).toContain("46-manual-proof-matrix.md");
    expect(launchReadinessReadme).toContain("47-goal-completion-audit.md");
    expect(launchReadinessReadme).toContain("48-manual-proof-packet-template.md");
    expect(launchReadinessReadme).toContain("Current local validation refresh: `1a6dcc5` (`bun run validate` pass; DOM 151 files / 1119 passed / 2 skipped).");
    expect(launchReadinessReadme).toContain("Current local app build refresh: `1a6dcc5` (`bun run build` pass; Next.js 16.2.6 / Turbopack; 32 static pages).");
    expect(launchReadinessReadme).toContain("| Product core | 84 | Local pass; manual smoke gap |");
    expect(launchReadinessReadme).toContain("| Component library | 90 | Local screenshot pass; hosted/manual proof gap |");
    expect(launchReadinessReadme).toContain("| Templates | 91 | Local insertion pass; hosted/manual proof gap |");
    expect(launchReadinessReadme).toContain("| Investor demo readiness | 82 | Workbook artifact, library/template screenshots, and local insertion proof exist; rehearsal proof gap |");
    expect(launchReadinessReadme).toContain("| Excel export | 90 | Local artifact pass; cross-app proof gap |");
    expect(launchReadinessReadme).toContain("| Auth/onboarding | 78 | Env and hosted smoke gap |");
    expect(launchReadinessReadme).toContain("| Security/RLS | 70 | Advisor warns; linked proof gap |");
    expect(launchReadinessReadme).not.toContain("| Project-specific unlink | 35 | P0 blocker |");
    expect(launchReadinessReadme).not.toContain("Product code changes are out of scope for this pass");
    expect(releaseChecklist).toContain("Evidence anchors | `1a6dcc5` for both `bun run validate` and `bun run build`.");
    expect(releaseChecklist).toContain("`bun run test:dom` | Pass: 151 files / 1119 passed / 2 skipped through `bun run validate`");
    expect(releaseChecklist).toContain("`bun run build` | Pass at `1a6dcc5`: Next.js 16.2.6 / Turbopack, 32 static pages");
    expect(releaseChecklist).not.toContain("`bun run test:dom` | Fail");
    expect(finalLaunchGate).toContain("`bun run test:dom`: historical baseline pass, 131 files / 1021 tests with 2 skips; current validation refresh pass, 151 files / 1119 passed / 2 skipped.");
    expect(launchRunbook).toContain("Evidence anchors: `1a6dcc5` for both `bun run validate` and `bun run build`.");
    expect(launchRunbook).toContain("`bun run test:dom`: pass, 151 files / 1119 passed / 2 skipped through `bun run validate`.");
    expect(launchRunbook).toContain("`bun run build`: pass at `1a6dcc5`, Next.js 16.2.6 / Turbopack, 32 static pages.");
    expect(launchRunbook).not.toContain("`bun run test:dom`: fail");
    expect(executiveBrief).toMatch(/DOM tests, and build passed locally/i);
    expect(testStrategy).toMatch(/Current local Vitest DOM baseline is green/i);
    expect(zeroDefectMatrix).toMatch(/Current local command baseline: \*\*green/i);
  });

  it("keeps manual/provider proof gates operator-ready and unclaimed", () => {
    expect(manualProofMatrix).toMatch(/Status: Required before external closed beta/);
    expect(manualProofMatrix).toContain("Closed beta stays **NO-GO**");
    expect(manualProofMatrix).toContain("Use `48-manual-proof-packet-template.md`");
    expect(manualProofMatrix).toContain("Current consolidated packet: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/README.md`");
    expect(manualProofMatrix).toContain("provider-state-refresh-87f603e-2026-06-02.md");
    expect(manualProofMatrix).toContain("Supabase backup/PITR");
    expect(manualProofMatrix).toContain("supabase-backup-readiness-26bc6e3-2026-06-02.json");
    expect(manualProofMatrix).toContain("restore drill not provided");
    expect(manualProofMatrix).toContain("supabase-migration-readiness-65b21eb-2026-06-02.json");
    expect(manualProofMatrix).toContain("parsed 71 rows");
    expect(manualProofMatrix).toContain("supabase-linked-schema-parity-2026-06-02.md");
    expect(manualProofMatrix).toContain("supabase-linked-readiness-refresh-2026-06-02.md");
    expect(manualProofMatrix).toContain("supabase-linked-readiness-4687432-2026-06-02.json");
    expect(manualProofMatrix).toContain("migrations `20260601182522`, `20260601184343`, `20260602005649`, `20260602083000`, and `20260602084500` present locally but absent remotely");
    expect(manualProofMatrix).toContain("36 anon executable `SECURITY DEFINER` functions, 62 authenticated executable `SECURITY DEFINER` functions");
    expect(manualProofMatrix).toContain("The repeatable migration-list helper parsed 71 rows");
    expect(manualProofMatrix).toContain("the repeatable linked SQL parser parsed 13 checks");
    expect(manualProofMatrix).toContain("`linkedSupabaseLaunchReady: false`");
    expect(manualProofMatrix).toContain("`closed_beta_allowed_emails` / `beta_feedback_submissions` missing");
    expect(manualProofMatrix).toContain("`check_closed_beta_access` / `unlink_estimate_row_item_from_library_with_history` missing");
    expect(manualProofMatrix).toContain("RLS/storage allow/deny proof still missing");
    expect(manualProofMatrix).toContain("Hosted auth allowlist");
    expect(manualProofMatrix).toContain("Vercel deploy/env/health");
    expect(manualProofMatrix).toContain("vercel-read-only-cli-2026-06-02.md");
    expect(manualProofMatrix).toContain("archestimator-bssvp0rrd-philipjonlewis-projects.vercel.app");
    expect(manualProofMatrix).toContain("dpl_GdDjZoaGocCpAVVEa3oaSm9nCody");
    expect(manualProofMatrix).toContain("vercel-protection-read-only-2026-06-02.md");
    expect(manualProofMatrix).toContain("vercel-health-readiness-2776a32-2026-06-02.json");
    expect(manualProofMatrix).toContain("zero ready URLs");
    expect(manualProofMatrix).toContain("vercel-production-readiness-fc8f53e-2026-06-02.json");
    expect(manualProofMatrix).toContain("19 ready rollback candidates");
    expect(manualProofMatrix).toContain("`vercelProductionReady: false`");
    expect(manualProofMatrix).toContain("one env-var-backed automation bypass still needs owner review");
    expect(manualProofMatrix).toContain("latest `main` preview `archestimator-bssvp0rrd-philipjonlewis-projects.vercel.app`");
    expect(manualProofMatrix).toContain("public preview health returns HTTP `401`");
    expect(manualProofMatrix).toContain("vercel-custom-domain-readiness-blocked-2026-06-02.md");
    expect(manualProofMatrix).toContain("older Ready coming-soon production deployment where `/api/health` returns `404`");
    expect(manualProofMatrix).toContain("resend-email-readiness-blocked-2026-06-02.md");
    expect(manualProofMatrix).toContain("resend-readiness-b0e04f4-2026-06-02.json");
    expect(manualProofMatrix).toContain("Vercel env list empty");
    expect(manualProofMatrix).toContain("disables shared-link recipient entry/send/resend while server email readiness is false");
    expect(manualProofMatrix).toContain("first-run-workshop-local-surface-2026-06-02.md");
    expect(manualProofMatrix).toContain("empty Workshop homebase action links");
    expect(manualProofMatrix).toContain("Hosted whitelisted account proof still missing");
    expect(manualProofMatrix).toContain("Spreadsheet compatibility");
    expect(manualProofMatrix).toContain("spreadsheet-quicklook-preview-2026-06-02.md");
    expect(manualProofMatrix).toContain("spreadsheet-app-availability-refresh-2026-06-02.md");
    expect(manualProofMatrix).toContain("Google Sheets.app` exists only as a Google Drive shortcut");
    expect(manualProofMatrix).toContain("formula recalculation, and print proof still missing");
    expect(manualProofMatrix).toContain("Project-specific unlink manual smoke");
    expect(manualProofMatrix).toContain("project-specific-unlink-linked-smoke-blocked-2026-06-02.md");
    expect(manualProofMatrix).toContain("linked Supabase returned `PGRST202`");
    expect(manualProofMatrix).toContain("library-demo-smoke-local-2026-06-02.md");
    expect(manualProofMatrix).toContain("template-insert-local-smoke-2026-06-02.md");
    expect(manualProofMatrix).toContain("records local template insertion into a throwaway estimate with zero residue");
    expect(manualProofMatrix).toContain("support-feedback-local-surface-2026-06-02.md");
    expect(manualProofMatrix).toContain("support-email-dns-readiness-2026-06-02.md");
    expect(manualProofMatrix).toContain("support-monitoring-readiness-c9c1141-2026-06-02.json");
    expect(manualProofMatrix).toContain("beta-feedback-review-queue-local-2026-06-02.md");
    expect(manualProofMatrix).toContain("platform-admin `/workshop/settings/feedback` review/status queue coverage");
    expect(manualProofMatrix).toContain("MX/SPF DNS evidence and no DMARC answer");
    expect(manualProofMatrix).toContain("workshop `Send beta feedback`, terms, and privacy point to `support@archestimator.com`");
    expect(manualProofMatrix).toContain("Support inbox/table proof and alert/uptime owner note");
    expect(manualProofMatrix).toContain("monitored inbox/table ownership proof, alert ownership, and incident escalation remain missing");
    expect(manualProofMatrix).toContain("`supportMonitoringReady: false`");
    expect(manualProofMatrix).toContain("all proof flags false, all owner labels missing, and 9 missing checks");
    expect(manualProofMatrix).toContain("Support inbox/table review, `/workshop/settings/feedback` monitoring cadence, or alert ownership cannot be verified");
    expect(manualProofPacketTemplate).toContain("Include monitored inbox/table review and alert/uptime owner proof");
    expect(evidenceIndex).toContain("### Beta Operations Runbook Readiness Evidence");
    expect(evidenceIndex).toContain("beta-ops-runbook-readiness-2026-06-02.md");
    expect(evidenceIndex).toContain("covers add beta user, revoke beta user, manual invite, access verification, feedback collection/review, bug triage, pause beta, rollback");
    expect(evidenceIndex).toContain("Linked migrations, hosted admin/auth smoke, monitored inbox/table ownership, alert ownership, rollback rehearsal, legal sign-off, and live beta operation proof remain **NO-GO**");
    expect(finalLaunchGate).toContain("Beta program ready");
    expect(finalLaunchGate).toContain("Partial/docs: `40-closed-beta-operations-runbook.md` and `29-beta-program-readiness-plan.md` document add/revoke/manual invite/access verification/feedback triage/pause/rollback/24-72h monitoring procedures");
    expect(goalCompletionAudit).toContain("Beta operations runbook readiness");
    expect(goalCompletionAudit).toContain("add/revoke/manual invite/access verification/feedback triage/pause/rollback/24-72h monitoring procedures are documented");
    expect(currentState).toContain("**Beta Operations Runbook Evidence (2026-06-02):**");
    expect(knownIssues).toContain("Beta operations runbook evidence on 2026-06-02 proves add/revoke/manual invite/access verification/feedback triage/pause/rollback/24-72h monitoring procedures are documented");
    expect(observabilityPlan).toContain("Feedback/support inbox, protected `/workshop/feedback`, and platform-admin `/workshop/settings/feedback` review monitored daily");
    expect(observabilityPlan).toContain("local code can persist authenticated feedback to `beta_feedback_submissions`");
    expect(observabilityPlan).toContain("platform admins have a local `/workshop/settings/feedback` status queue");
    expect(observabilityPlan).toContain("monitored inbox/table review proof");
    expect(closedBetaOperationsRunbook).toContain("Protected `/workshop/feedback` submissions in `beta_feedback_submissions`");
    expect(closedBetaOperationsRunbook).toContain("operator procedures are documented and locally reviewed");
    expect(closedBetaOperationsRunbook).toContain("platform-admin app management available at `/workshop/settings/beta-users`");
    expect(closedBetaOperationsRunbook).toContain("Add the row through `/workshop/settings/beta-users` or insert into `closed_beta_allowed_emails`");
    expect(closedBetaOperationsRunbook).toContain("Set `status = 'revoked'` for the normalized email through `/workshop/settings/beta-users`");
    expect(betaProgramPlan).toContain("Status: partial operator-documentation pass");
    expect(betaProgramPlan).toContain("Detailed operating procedures live in `40-closed-beta-operations-runbook.md`");
    expect(closedBetaOperationsRunbook).toContain("platform-admin status triage at `/workshop/settings/feedback`");
    expect(closedBetaOperationsRunbook).toContain("`/workshop/feedback` submission smoke, `/workshop/settings/feedback` platform-admin review/status check");
    expect(closedBetaOperationsRunbook).toContain("Review all `/workshop/settings/feedback` rows");
    expect(betaProgramPlan).toContain("Feedback is collected through protected `/workshop/feedback` plus the support email path, then triaged through platform-admin `/workshop/settings/feedback`");
    expect(betaProgramPlan).toContain("platform admins triage status through `/workshop/settings/feedback` after review migration apply");
    expect(executiveBrief).toContain("Visible `/workshop/feedback` plus support email path");
    expect(executiveBrief).toContain("monitored support inbox/table proof");
    expect(executiveBrief).toContain("| Observability/support | 82 |");
    expect(executiveBrief).toContain("feedback-table review");
    expect(mvpFeatureCompletionPlan).toContain("Beta users can submit feedback through protected `/workshop/feedback`; support email remains the fallback/contact path");
    expect(technicalRiskRegister).toContain("Local protected `/workshop/feedback` and support email paths exist");
    expect(technicalRiskRegister).toContain("monitored inbox/table review, and alert ownership proof remain required");
    expect(releaseChecklist).toContain("Protected `/workshop/feedback`, local contact/workshop links, and structured support email draft are implemented");
    expect(releaseChecklist).toContain("support inbox/table review");
    expect(finalLaunchGate).toContain("Protected `/workshop/feedback` exists and can persist to `beta_feedback_submissions` after migration apply");
    expect(finalLaunchGate).toContain("| Observability/support | 82 |");
    expect(finalLaunchGate).toContain("Local health route, support runbook, and protected feedback-table path exist");
    expect(finalLaunchGate).toContain("Local contact/support links, protected `/workshop/feedback`, and structured email draft handoff are not enough");
    expect(architectureDecisionRecords).toContain("P0 feedback is protected `/workshop/feedback` plus support email fallback");
    expect(architectureDecisionRecords).toContain("with platform-admin review at `/workshop/settings/feedback`");
    expect(architectureDecisionRecords).toContain("insert-only `beta_feedback_submissions` table path plus a status-only platform-admin review queue");
    expect(closedBetaCouncilReview).toContain("The local implementation now uses protected `/workshop/feedback` plus support email fallback");
    expect(finalImplementationReport).toContain("Monitored support inbox/table review proof");
    expect(finalImplementationReport).toContain("Linked migration, hosted smoke, and monitored review proof for the protected feedback table remain open");
    expect(betaProgramPlan).not.toContain("visible external form/support path");
    expect(observabilityPlan).not.toContain("monitored inbox/form delivery proof");
    expect(architectureDecisionRecords).not.toContain("custom in-app feedback database is P1");
    expect(finalImplementationReport).not.toContain("Custom in-app feedback database is deferred");
    expect(finalLaunchGate).not.toContain("monitored inbox/form proof pending");
    expect(manualProofMatrix).toContain("Legal/owner review");
    expect(manualProofMatrix).toContain("legal-owner-readiness-ede0f32-2026-06-02.json");
    expect(manualProofMatrix).toContain("`legalOwnerReady: false`");
    expect(manualProofMatrix).toContain("product owner / legal reviewer / approval date / approval reference missing");
    expect(manualProofMatrix).toContain("Current manual E2E smoke");
    expect(manualProofMatrix).toContain("current-local-e2e-smoke-2026-06-02.md");
    expect(manualProofMatrix).toContain("signed-out auth plus local dev-auth library/template/template-insert smoke");
    expect(manualProofMatrix).toContain("full-local-e2e-refresh-bb9006d-2026-06-02.md");
    expect(manualProofMatrix).toContain("passing 9 ungated checks with 24 env-gated/live-provider specs skipped");
    expect(manualProofMatrix).toContain("Hosted login, allowlist, unlink/export, logout/session expiry, and target-environment journey remain missing");
    expect(manualProofMatrix).toContain("demo-rehearsal-fallback-pack-2026-06-02.md");
    expect(manualProofMatrix).toContain("fallback script");
    expect(manualProofMatrix).toContain("owner demo sign-off remain missing");
    expect(manualProofMatrix).toContain(".ai/09_archive/store/<date>-mvp-closed-beta-manual-proof/");
    expect(manualProofMatrix).not.toMatch(/\| .* \| .* \| .* \| Pass \|/);
  });

  it("keeps the manual proof packet template complete but unfilled", () => {
    expect(manualProofPacketTemplate).toMatch(/# Manual Proof Packet Template/);
    expect(manualProofPacketTemplate).toContain("Commit tested");
    expect(manualProofPacketTemplate).toContain("External closed beta recommendation | NO-GO until all P0 rows below pass");
    expect(manualProofPacketTemplate).toContain("Supabase backup/PITR | pending");
    expect(manualProofPacketTemplate).toContain("Hosted auth allowlist | pending");
    expect(manualProofPacketTemplate).toContain("Vercel deploy/env/health | pending");
    expect(manualProofPacketTemplate).toContain("Spreadsheet compatibility | pending");
    expect(manualProofPacketTemplate).toContain("Current manual E2E smoke | pending");
    expect(manualProofPacketTemplate).toContain("Cleanup And Residue");
    expect(manualProofPacketTemplate).not.toMatch(/\| .* \| pass \|/i);
  });

  it("keeps the consolidated manual proof packet no-go until external gates pass", () => {
    expect(consolidatedManualProofPacket).toContain("MVP Closed Beta Manual Proof Packet - 2026-06-02");
    expect(consolidatedManualProofPacket).toContain("External closed beta recommendation | NO-GO");
    expect(consolidatedManualProofPacket).toContain("latest read-only Vercel/Supabase provider anchor `87f603e`");
    expect(consolidatedManualProofPacket).toContain("provider-state-refresh-b33f56d-2026-06-02.md");
    expect(consolidatedManualProofPacket).toContain("provider-state-refresh-d78686f-2026-06-02.md");
    expect(consolidatedManualProofPacket).toContain("provider-state-refresh-87f603e-2026-06-02.md");
    expect(consolidatedManualProofPacket).toContain("Supabase backup/PITR | blocked");
    expect(consolidatedManualProofPacket).toContain("supabase-backup-readiness-26bc6e3-2026-06-02.json");
    expect(consolidatedManualProofPacket).toContain("zero listed backups");
    expect(consolidatedManualProofPacket).toContain("supabase-migration-readiness-65b21eb-2026-06-02.json");
    expect(consolidatedManualProofPacket).toContain("`linkedMigrationsReady: false`");
    expect(consolidatedManualProofPacket).toContain("supabase-linked-readiness-4687432-2026-06-02.json");
    expect(consolidatedManualProofPacket).toContain("`linkedSupabaseLaunchReady: false`");
    expect(consolidatedManualProofPacket).toContain("vercel-production-readiness-fc8f53e-2026-06-02.json");
    expect(consolidatedManualProofPacket).toContain("`vercelProductionReady: false`");
    expect(consolidatedManualProofPacket).toContain("legal-owner-readiness-ede0f32-2026-06-02.json");
    expect(consolidatedManualProofPacket).toContain("`legalOwnerReady: false`");
    expect(consolidatedManualProofPacket).toContain("Spreadsheet compatibility | partial-local");
    expect(consolidatedManualProofPacket).toContain("current-head-local-validation-build-1a6dcc5-2026-06-02.md");
    expect(consolidatedManualProofPacket).toContain("Current manual E2E smoke | partial-local");
    expect(consolidatedManualProofPacket).toContain("full-local-e2e-refresh-bb9006d-2026-06-02.md");
    expect(consolidatedManualProofPacket).toContain("full local E2E command now passes 9 ungated checks with 24 env-gated/live-provider specs skipped");
    expect(consolidatedManualProofPacket).toContain("support-monitoring-readiness-c9c1141-2026-06-02.json");
    expect(consolidatedManualProofPacket).toContain("`supportMonitoringReady: false`");
    expect(consolidatedManualProofPacket).toContain("Do not change the launch decision until `47-goal-completion-audit.md` is rerun");
    expect(consolidatedManualProofPacket).not.toMatch(/\| .* \| pass \|/i);
  });

  it("keeps consolidated manual proof packet artifact references resolvable", () => {
    const artifactFilenames = extractManualProofArtifactFilenames(consolidatedManualProofPacket);

    expect(artifactFilenames).toContain("supabase-read-only-cli-2026-06-02.md");
    expect(artifactFilenames).toContain("supabase-backup-readiness-26bc6e3-2026-06-02.json");
    expect(artifactFilenames).toContain("supabase-migration-readiness-65b21eb-2026-06-02.json");
    expect(artifactFilenames).toContain("supabase-linked-readiness-4687432-2026-06-02.json");
    expect(artifactFilenames).toContain("vercel-production-readiness-fc8f53e-2026-06-02.json");
    expect(artifactFilenames).toContain("provider-state-refresh-b33f56d-2026-06-02.md");
    expect(artifactFilenames).toContain("provider-state-refresh-d78686f-2026-06-02.md");
    expect(artifactFilenames).toContain("provider-state-refresh-87f603e-2026-06-02.md");
    expect(artifactFilenames).toContain("current-head-local-validation-build-1a6dcc5-2026-06-02.md");
    expect(artifactFilenames).toContain("full-local-e2e-refresh-bb9006d-2026-06-02.md");
    expect(artifactFilenames).toContain("legal-owner-readiness-ede0f32-2026-06-02.json");
    expect(artifactFilenames).toContain("support-monitoring-readiness-c9c1141-2026-06-02.json");
    expect(artifactFilenames).toContain("lewis-residence-demo-proposal-2026-06-02.xlsx");
    expect(artifactFilenames.length).toBeGreaterThanOrEqual(30);

    const missingArtifacts = artifactFilenames.filter((filename) => !existsSync(join(manualProofPacketDir, filename)));
    expect(missingArtifacts).toEqual([]);
  });

  it("keeps the active goal completion audit evidence-gated", () => {
    expect(goalCompletionAudit).toMatch(/Status: Goal active; completion not proven/);
    expect(goalCompletionAudit).toContain("Consolidated manual proof packet");
    expect(goalCompletionAudit).toContain("current packet organizes existing artifacts into `partial-local`, `partial-blocked`, and `blocked` rows");
    expect(goalCompletionAudit).toContain("Provider refresh at `b33f56d`");
    expect(goalCompletionAudit).toContain("`supabase migration list --linked` now succeeds while still showing the five launch migrations absent remotely");
    expect(goalCompletionAudit).toContain("Provider refresh at `d78686f`");
    expect(goalCompletionAudit).toContain("public preview and branch-alias health are 401");
    expect(goalCompletionAudit).toContain("Provider refresh at `87f603e`");
    expect(goalCompletionAudit).toContain("current `HEAD` Vercel preview is Ready");
    expect(goalCompletionAudit).toContain("Closed beta allowlist access implemented and tested");
    expect(goalCompletionAudit).toContain("platform-admin `/workshop/settings/beta-users` management");
    expect(goalCompletionAudit).toContain("Ask Flip hidden and AI routes disabled by default");
    expect(goalCompletionAudit).toContain("Excel export upgraded and tested");
    expect(goalCompletionAudit).toContain("All changes staged, committed, and pushed in meaningful commits");
    expect(goalCompletionAudit).toContain("Current launch-pack evidence commits are pushed");
    expect(goalCompletionAudit).toContain("current local status includes unrelated skill/config churn");
    expect(goalCompletionAudit).toContain("backup list showed PITR disabled and no listed backups");
    expect(goalCompletionAudit).toContain("Supabase backup/PITR readiness helper");
    expect(goalCompletionAudit).toContain("`bun run launch:check-supabase-backup` now gives a repeatable sanitized backup/PITR check");
    expect(goalCompletionAudit).toContain("`supabaseBackupReady: false`");
    expect(goalCompletionAudit).toContain("Supabase migration-list readiness helper");
    expect(goalCompletionAudit).toContain("`bun run launch:check-supabase-migrations` now gives a repeatable sanitized migration-list check");
    expect(goalCompletionAudit).toContain("`linkedMigrationsReady: false`");
    expect(goalCompletionAudit).toContain("Supabase linked SQL readiness parser helper");
    expect(goalCompletionAudit).toContain("`bun run launch:check-supabase-linked-readiness` now gives a repeatable sanitized parser");
    expect(goalCompletionAudit).toContain("`linkedSupabaseLaunchReady: false`");
    expect(goalCompletionAudit).toContain("Supabase linked schema parity evidence");
    expect(goalCompletionAudit).toContain("linked migration history missing `20260601182522` and `20260601184343`");
    expect(goalCompletionAudit).toContain("`closed_beta_allowed_emails`, `beta_feedback_submissions`, `check_closed_beta_access`, and `unlink_estimate_row_item_from_library_with_history` are absent");
    expect(goalCompletionAudit).toContain("latest preview reached READY and protected `/api/health` returned ok through `vercel curl`");
    expect(goalCompletionAudit).toContain("Provider state refresh evidence");
    expect(goalCompletionAudit).toContain("latest Vercel preview is Ready and protected health works through `vercel curl`");
    expect(goalCompletionAudit).toContain("Vercel custom-domain readiness evidence");
    expect(goalCompletionAudit).toContain("Vercel public health readiness helper");
    expect(goalCompletionAudit).toContain("`bun run launch:check-vercel-health` now gives a repeatable sanitized public/custom-domain health check");
    expect(goalCompletionAudit).toContain("`vercelHealthReady: false`");
    expect(goalCompletionAudit).toContain("Vercel production alias/rollback readiness helper");
    expect(goalCompletionAudit).toContain("`bun run launch:check-vercel-production` now gives a repeatable sanitized custom-domain/rollback check");
    expect(goalCompletionAudit).toContain("`vercelProductionReady: false`");
    expect(goalCompletionAudit).toContain("older coming-soon surface and `/api/health` returns 404");
    expect(goalCompletionAudit).toContain("production/custom domains still point to an older coming-soon deployment");
    expect(goalCompletionAudit).toContain("Current linked readiness refresh and later `b33f56d` / `d78686f` migration-list refreshes show missing linked migrations `20260601182522`, `20260601184343`, `20260602005649`, `20260602083000`, and `20260602084500`");
    expect(goalCompletionAudit).toContain("local platform-admin beta-users queue and feedback review path depend on unapplied migrations");
    expect(goalCompletionAudit).toContain("Current provider refresh at `87f603e` proves the latest pushed `main` preview is Ready");
    expect(goalCompletionAudit).toContain("Resend email readiness evidence");
    expect(goalCompletionAudit).toContain("the repeatable helper reports only `RESEND_API_KEY` present locally");
    expect(goalCompletionAudit).toContain("`resendReady: false`");
    expect(goalCompletionAudit).toContain("shared-link recipient entry/send/resend controls are disabled while server email readiness is false");
    expect(goalCompletionAudit).toContain("unconfigured production-like sends now fail closed instead of recording fake success");
    expect(goalCompletionAudit).toContain("First-run Workshop local surface evidence");
    expect(goalCompletionAudit).toContain("empty Workshop homebase with Projects, Components, Templates, and empty favorite states");
    expect(goalCompletionAudit).toContain("Hosted first-run auth smoke remains missing");
    expect(goalCompletionAudit).toContain("Current local E2E smoke evidence");
    expect(goalCompletionAudit).toContain("local Playwright passed signed-out auth plus dev-auth component library, template preview, and template insertion with linked Supabase cleanup");
    expect(goalCompletionAudit).toContain("Full local E2E refresh at `bb9006d`");
    expect(goalCompletionAudit).toContain("passed 9 ungated Playwright checks with 24 env-gated/live-provider specs skipped");
    expect(goalCompletionAudit).toContain("Hosted/manual target-environment E2E remains missing");
    expect(goalCompletionAudit).toContain("Demo rehearsal fallback pack");
    expect(goalCompletionAudit).toContain("local fallback script links seed anchors");
    expect(goalCompletionAudit).toContain("owner sign-off remain missing");
    expect(goalCompletionAudit).toContain("Legal/owner readiness helper");
    expect(goalCompletionAudit).toContain("legal-owner-readiness-ede0f32-2026-06-02.json");
    expect(goalCompletionAudit).toContain("`legalOwnerReady: false`");
    expect(goalCompletionAudit).toContain("all terms/privacy/beta-copy/data-retention/support-comms proof flags false");
    expect(goalCompletionAudit).toContain("product owner / legal reviewer / approval date / approval reference missing");
    expect(goalCompletionAudit).toContain("generated workbook artifact is loadable, ZIP-valid, formula-backed, has no blank line totals");
    expect(goalCompletionAudit).toContain("renders a local Quick Look thumbnail");
    expect(goalCompletionAudit).toContain("synthetic 500 / 1,000 / 2,500 row workbook buffers generate locally under the 15s threshold");
    expect(goalCompletionAudit).toContain("component/template demo smoke and template insertion are partial/local pass");
    expect(goalCompletionAudit).toContain("Template insertion local smoke evidence");
    expect(goalCompletionAudit).toContain("Support/feedback local surface evidence");
    expect(goalCompletionAudit).toContain("beta-feedback-review-queue-local-2026-06-02.md");
    expect(goalCompletionAudit).toContain("beta support, feedback, and deletion requests to `support@archestimator.com`");
    expect(goalCompletionAudit).toContain("platform-admin `/workshop/settings/feedback` can review/filter/update feedback status locally");
    expect(goalCompletionAudit).toContain("Settings hub local evidence");
    expect(goalCompletionAudit).toContain("Profile, Workspace, Beta users, and Beta feedback cards from `/workshop/settings`");
    expect(goalCompletionAudit).toContain("admin tool discovery is local source/browser proof only");
    expect(goalCompletionAudit).toContain("Support email DNS readiness evidence");
    expect(goalCompletionAudit).toContain("has registrar email-forwarding MX records and SPF TXT");
    expect(goalCompletionAudit).toContain("monitored inbox/table review and alert owner proof remain missing");
    expect(goalCompletionAudit).toContain("DNS proof shows MX/SPF mail-routing records");
    expect(goalCompletionAudit).toContain("Support monitoring readiness helper");
    expect(goalCompletionAudit).toContain("support-monitoring-readiness-c9c1141-2026-06-02.json");
    expect(goalCompletionAudit).toContain("`supportMonitoringReady: false`");
    expect(goalCompletionAudit).toContain("all support/feedback/uptime/error/escalation proof flags false");
    expect(goalCompletionAudit).toContain("owner labels missing, 9 missing checks");
    expect(goalCompletionAudit).toContain("Project-specific unlink linked smoke attempt");
    expect(goalCompletionAudit).toContain("linked Supabase returned `PGRST202`");
    expect(goalCompletionAudit).toContain("Supabase backup/PITR and restore-drill proof");
    expect(goalCompletionAudit).toContain("Hosted auth allowlist smoke");
    expect(goalCompletionAudit).toContain("`scripts/verify-hosted-auth-routes.ts` / `bun run launch:verify-hosted-auth` now provides a sanitized operator helper");
    expect(goalCompletionAudit).toContain("no passing hosted-session artifact exists");
    expect(goalCompletionAudit).toContain("Excel plus one secondary spreadsheet app open/recalc/print proof");
    expect(goalCompletionAudit).toContain("synthetic large-fixture benchmarked");
    expect(goalCompletionAudit).toContain("local route-handler workbook proof");
    expect(goalCompletionAudit).toContain("Vercel export-route timing/memory proof remains missing");
    expect(goalCompletionAudit).toContain("Current decision: **DO NOT MARK GOAL COMPLETE**.");
    expect(goalCompletionAudit).toContain("48-manual-proof-packet-template.md");
    expect(goalCompletionAudit).not.toMatch(/Current decision: \*\*COMPLETE\*\*/);
  });

  it("keeps launch readiness conservative despite local implementation passes", () => {
    expect(currentState).toMatch(/Closed beta remains \*\*NO-GO\*\*/);
    expect(currentState).toContain("Read-only Supabase CLI evidence");
    expect(currentState).toContain("PITR is disabled");
    expect(currentState).toContain("**Supabase Backup/PITR Readiness Helper (2026-06-02):**");
    expect(currentState).toContain("`supabaseBackupReady: false`");
    expect(knownIssues).toContain("Supabase backup readiness evidence on 2026-06-02 remains blocked");
    expect(currentState).toContain("**Supabase Migration List Readiness Helper (2026-06-02):**");
    expect(currentState).toContain("`linkedMigrationsReady: false`");
    expect(knownIssues).toContain("Supabase migration-list readiness evidence on 2026-06-02 remains blocked");
    expect(currentState).toContain("**Supabase Linked SQL Readiness Parser Helper (2026-06-02):**");
    expect(currentState).toContain("`linkedSupabaseLaunchReady: false`");
    expect(knownIssues).toContain("Supabase linked SQL readiness parser evidence on 2026-06-02 remains blocked");
    expect(knownIssues).toContain("supabase-linked-readiness-4687432-2026-06-02.json");
    expect(currentState).toContain("Linked Supabase schema parity evidence");
    expect(currentState).toContain("Management API SQL readback succeeded");
    expect(currentState).toContain("`20260601182522_closed_beta_allowed_emails` and `20260601184343_unlink_estimate_row_items`");
    expect(currentState).toContain("`component-images` is public");
    expect(currentState).toContain("Read-only Vercel CLI evidence");
    expect(currentState).toContain("Vercel env list is empty");
    expect(currentState).toContain("Resend email readiness evidence");
    expect(currentState).toContain("resend-readiness-b0e04f4-2026-06-02.json");
    expect(currentState).toContain("all four Resend names missing from Vercel");
    expect(currentState).toContain("shared-link recipient entry/send/resend controls disable while server email readiness is false");
    expect(currentState).toContain("unconfigured production-like sends now fail closed instead of fake-succeeding");
    expect(currentState).toContain("First-run Workshop local evidence");
    expect(currentState).toContain("Closed Beta Allowlist Admin Local Slice");
    expect(currentState).toContain("`/workshop/settings/beta-users`");
    expect(currentState).toContain("`20260602005649_beta_allowlist_admin_queue.sql`");
    expect(currentState).toContain("hosted platform-admin smoke");
    expect(currentState).toContain("empty Workshop homebase with Projects, Components, Templates, and empty favorite states");
    expect(currentState).toContain("hosted fresh-account auth proof remains missing");
    expect(currentState).toContain("Current local E2E smoke evidence");
    expect(currentState).toContain("signed-out auth plus local dev-auth component library, template preview, and template insertion with linked cleanup");
    expect(currentState).toContain("full local E2E refresh");
    expect(currentState).toContain("passes 9 ungated checks with 24 env-gated specs skipped");
    expect(currentState).toContain("neither artifact proves hosted/manual target behavior");
    expect(currentState).toContain("Spreadsheet artifact evidence");
    expect(currentState).toContain("missing local spreadsheet apps");
    expect(currentState).toContain("**Proposal Workbook Large-Fixture Benchmark (2026-06-02):**");
    expect(currentState).toContain("The 2,500-row fixture generated in 362.06ms");
    expect(currentState).toContain("**Proposal Workbook Benchmark Regression Coverage (2026-06-02):**");
    expect(currentState).toContain("row-count parsing, deterministic BOQ row/source metadata");
    expect(currentState).toContain("**Proposal Export Route Workbook Local Proof (2026-06-02):**");
    expect(currentState).toContain("The returned response has XLSX headers");
    expect(currentState).toContain("Component/template local demo evidence");
    expect(currentState).toContain("Template insertion local evidence");
    expect(currentState).toContain("local insertion into a throwaway estimate with zero residue");
    expect(currentState).toContain("Legal/Owner Readiness Helper (2026-06-02)");
    expect(currentState).toContain("legal-owner-readiness-ede0f32-2026-06-02.json");
    expect(currentState).toContain("`legalOwnerReady: false`");
    expect(currentState).toContain("product owner / legal reviewer / approval date / approval reference missing");
    expect(currentState).toContain("Support/feedback local evidence");
    expect(currentState).toContain("`/contact`, protected `/workshop/feedback`, platform-admin `/workshop/settings/feedback`, terms, and privacy point to `support@archestimator.com`");
    expect(currentState).toContain("the public contact form prepares a structured support email draft instead of fake-submitting");
    expect(currentState).toContain("Beta Feedback In-App Local Slice");
    expect(currentState).toContain("`beta_feedback_submissions`");
    expect(currentState).toContain("`20260602084500_beta_feedback_review_queue.sql`");
    expect(currentState).toContain("local review UI at `/workshop/settings/feedback`");
    expect(currentState).toContain("The workshop footer `Send beta feedback` opens `/workshop/feedback`");
    expect(currentState).toContain("Settings Hub Local Slice");
    expect(currentState).toContain("`/workshop/settings` now lands on a protected Settings hub instead of redirecting immediately to profile");
    expect(currentState).toContain("Profile, Workspace, Beta users, and Beta feedback cards");
    expect(currentState).toContain("platform-operation cards are visible only to `ceo` or `admin` roles");
    expect(currentState).toContain("Support Email DNS Evidence");
    expect(currentState).toContain("five registrar email-forwarding MX records");
    expect(currentState).toContain("no `_dmarc.archestimator.com` TXT answer");
    expect(currentState).toContain("Support Monitoring Readiness Helper (2026-06-02)");
    expect(currentState).toContain("support-monitoring-readiness-c9c1141-2026-06-02.json");
    expect(currentState).toContain("`supportMonitoringReady: false`");
    expect(currentState).toContain("all proof flags false, all owner labels missing, and 9 missing checks");
    expect(currentState).toContain("monitored review workflow, and alert ownership remain open");
    expect(currentState).toContain("Project-specific unlink linked smoke evidence");
    expect(currentState).toContain("linked Supabase returned `PGRST202`");
    expect(currentState).toContain("do not prove hosted auth, linked RLS/security, Resend delivery/webhooks, project-specific unlink, monitored support/alerts, or current hosted E2E/manual smoke");
    expect(currentState).toMatch(/Do not archive the MVP launch goal or claim launch readiness from local tests alone/i);
    expect(decisions).toMatch(/This is not a launch approval/);
    expect(knownIssues).toContain("Local validation/build evidence is now current");
    expect(knownIssues).toContain("`1a6dcc5` passed `bun run validate` and `bun run build`");
    expect(knownIssues).toContain("Proposal workbook large-fixture evidence on 2026-06-02");
    expect(knownIssues).toContain("Proposal export route local proof on 2026-06-02");
    expect(knownIssues).toContain("Linked Supabase schema parity evidence on 2026-06-02 is negative/blocked");
    expect(knownIssues).toContain("`20260601182522_closed_beta_allowed_emails` and `20260601184343_unlink_estimate_row_items` missing from linked migration history");
    expect(knownIssues).toContain("Closed beta allowlist admin evidence on 2026-06-02 adds local `/workshop/settings/beta-users` platform-admin management");
    expect(knownIssues).toContain("linked allowlist/admin migration apply and hosted platform-admin allow/deny/revoke proof remain missing");
    expect(knownIssues).toContain("`component-images` public");
    expect(knownIssues).toContain("Resend email readiness evidence on 2026-06-02 is negative/blocked");
    expect(knownIssues).toContain("`resend-readiness-b0e04f4-2026-06-02.json` reports only `RESEND_API_KEY` present locally");
    expect(knownIssues).toContain("`resendReady: false`");
    expect(knownIssues).toContain("shared-link recipient entry/send/resend controls disable while server email readiness is false");
    expect(knownIssues).toContain("unconfigured production-like sends now fail closed instead of fake-succeeding");
    expect(knownIssues).toContain("First-run Workshop local evidence on 2026-06-02 proves fallback workspace coverage");
    expect(knownIssues).toContain("hosted fresh-account Google auth and allowlist proof remain missing");
    expect(knownIssues).toContain("Current local E2E smoke evidence on 2026-06-02 proves signed-out auth plus local dev-auth component library");
    expect(knownIssues).toContain("Full local E2E refresh on 2026-06-02 at `bb9006d` proves");
    expect(knownIssues).toContain("9 ungated Playwright checks with 24 env-gated/live-provider specs skipped");
    expect(knownIssues).toContain("hosted/manual target-environment proof remains missing");
    expect(knownIssues).toContain("Local component/template demo evidence on 2026-06-02 proves screenshots/JSON");
    expect(knownIssues).toContain("local template insertion evidence proves throwaway-estimate insertion with zero residue");
    expect(knownIssues).toContain("Legal/owner readiness helper evidence on 2026-06-02 is negative/blocked");
    expect(knownIssues).toContain("`legalOwnerReady: false`");
    expect(knownIssues).toContain("product owner / legal reviewer / approval date / approval reference missing");
    expect(knownIssues).toContain("Support/feedback local evidence now proves `/contact`, protected `/workshop/feedback`, platform-admin `/workshop/settings/feedback`, terms, and privacy point to `support@archestimator.com`");
    expect(knownIssues).toContain("the public contact form prepares a structured support email draft instead of fake-submitting");
    expect(knownIssues).toContain("local code can persist authenticated feedback to `beta_feedback_submissions` after its migration is applied and locally triage status after the review migration is applied");
    expect(knownIssues).toContain("Settings hub local evidence on 2026-06-02 makes `/workshop/settings` a discoverable protected hub for profile, workspace, beta-user, and beta-feedback tools");
    expect(knownIssues).toContain("hosted admin smoke and linked migrations remain missing");
    expect(knownIssues).toContain("Linked feedback/review migration apply, hosted feedback/admin smoke, monitored inbox/table ownership, and alert ownership proof remain missing");
    expect(knownIssues).toContain("Support email DNS evidence on 2026-06-02 proves `archestimator.com` has registrar email-forwarding MX records");
    expect(knownIssues).toContain("This still does not prove `support@archestimator.com` is monitored");
    expect(knownIssues).toContain("Support monitoring readiness helper evidence on 2026-06-02 is negative/blocked");
    expect(knownIssues).toContain("`supportMonitoringReady: false`");
    expect(knownIssues).toContain("all proof flags false, all owner labels missing, and 9 missing checks");
    expect(knownIssues).toContain("Linked feedback/review migration apply, hosted feedback/admin smoke, monitored inbox/table ownership, and alert ownership proof remain missing");
    expect(knownIssues).toContain("Project-specific unlink linked smoke evidence is negative/blocked");
    expect(knownIssues).toContain("missing `unlink_estimate_row_item_from_library_with_history`");
    expect(knownIssues).toContain("hosted auth, Resend delivery/webhooks, unlink detach/edit/library-unchanged/export, monitored support/alerts, and current hosted E2E proof remain missing");
    expect(knownIssues).not.toContain("full validation/build, and storage/security evidence");
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
    expect(readinessScorecard).toMatch(/Closed beta access control \| Yes \| 84 \| Local pass plus admin queue; linked proof pending/);
    expect(readinessScorecard).toMatch(/Auth\/onboarding \| Yes \| 78 \| Needs env and hosted smoke/);
    expect(readinessScorecard).toMatch(/Component library \| Yes \| 90 \| Local screenshot pass; hosted proof pending/);
    expect(readinessScorecard).toMatch(/Templates \| Yes \| 91 \| Local insertion pass; hosted proof pending/);
    expect(readinessScorecard).toMatch(/Vercel\/Supabase deployment \| Yes \| 76 \| Partial preview proof/);
    expect(readinessScorecard).toMatch(/Excel export \| Yes \| 92 \| Local artifact, route, and benchmark pass; app\/hosted proof pending/);
    expect(readinessScorecard).toMatch(/Resend\/email readiness \| Conditional \| 70 \| Disabled until provider proof/);
    expect(readinessScorecard).toMatch(/Data backup\/rollback \| Yes \| 60 \| Provider evidence negative/);
    expect(readinessScorecard).toMatch(/Security\/RLS \| Yes \| 70 \| Live advisor warns/);
    expect(readinessScorecard).not.toMatch(/No allowlist table or enforcement exists yet/);
    expect(readinessScorecard).not.toMatch(/Beta-specific terms\/privacy\/AUP not yet implemented/);
    expect(evidenceIndex).toContain("fallback narrative");
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
    expect(finalLaunchGate).toMatch(/Resend delivery\/webhook verified before visible email workflows are re-enabled.+recipient email controls now disable while server readiness is false/s);
    expect(finalLaunchGate).toMatch(/Excel export is professional bid\/BOQ workbook.+local route-handler workbook proof.+cross-app open and hosted route proof pending/s);
    expect(finalLaunchGate).not.toMatch(/test:dom` fails/);
    expect(finalLaunchGate).not.toMatch(/Current workbook is insufficient/);
    expect(executiveBrief).toMatch(/local code now hides\/fail-closes AI by default/i);
    expect(executiveBrief).toMatch(/disables recipient email controls while server readiness is false/i);
    expect(executiveBrief).not.toMatch(/AI visible\/callable, `test:dom` red/i);
    expect(technicalRiskRegister).toMatch(/DOM tests regress/);
    expect(technicalRiskRegister).not.toMatch(/DOM tests red/);
  });
});
