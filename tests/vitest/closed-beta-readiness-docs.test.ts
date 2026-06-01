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
    expect(currentState).toContain("Latest pushed implementation baseline is `c5ca065`");
    expect(currentState).toContain("latest local validation refresh is `a65b34b`");
    expect(currentState).toContain("latest local app build refresh is `e6cf52b`");
    expect(currentState).toContain("full `bun run test:dom` passed 131 files / 1021 tests / 2 skipped");
    expect(currentState).toContain("Validation refresh at `a65b34b`: `bun run validate` passed");
    expect(currentState).toContain("DOM tests (131 files / 1022 passed / 2 skipped)");
    expect(currentState).toContain("Build refresh at `e6cf52b`: `bun run build` passed");
    expect(currentState).toContain("generated 29 static pages");
    expect(decisions).toContain("Commit `c5ca065` is the green local implementation baseline");
    expect(decisions).toContain("full DOM tests (131 files / 1021 tests / 2 skipped)");
    expect(decisions).toContain("Current validation refresh at `a65b34b` passed `bun run validate`");
    expect(decisions).toContain("DOM tests (131 files / 1022 passed / 2 skipped)");
    expect(decisions).toContain("Current app build refresh at `e6cf52b` passed `bun run build`");
    expect(finalImplementationReport).toContain("**Latest implementation baseline before this report:** `8084908`");
    expect(finalImplementationReport).toContain("`bun run test:dom` - pass, 131 files / 1021 tests / 2 skipped");
    expect(finalImplementationReport).toContain("Post-report evidence-sync commits:");
    expect(finalImplementationReport).toContain("`3e8d7a0` - Indexed this final report");
    expect(finalImplementationReport).toContain("`8e0e615` - Aligned final command evidence baselines");
    expect(finalImplementationReport).toContain("`cb87e51` - Synced the launch command-center README");
    expect(finalImplementationReport).toContain("`a65b34b` - Recorded local signed-out auth E2E smoke evidence.");
    expect(finalImplementationReport).toContain("`e6cf52b` - Recorded the current local validation refresh in the launch evidence pack.");
    expect(finalImplementationReport).toContain("`7ba69e6` - Recorded the current local build refresh in the launch evidence pack.");
    expect(finalImplementationReport).toContain("`3b01cd2` - Added the active-goal completion audit.");
    expect(finalImplementationReport).toContain("`9d71239` - Added the manual proof packet template.");
    expect(finalImplementationReport).toContain("Current local validation refresh at `a65b34b` also passed `bun run validate`");
    expect(finalImplementationReport).toContain("Current app build refresh at `e6cf52b`:");
    expect(finalImplementationReport).toContain("The remaining manual/provider proof packet is now centralized in `46-manual-proof-matrix.md`");
    expect(finalImplementationReport).toContain("The active-goal completion audit is centralized in `47-goal-completion-audit.md`");
    expect(finalImplementationReport).toContain("They do not change the implementation baseline or the **NO-GO** recommendation.");
    expect(evidenceIndex).toContain("| Full local implementation baseline | `c5ca065` after demo seed row repair |");
    expect(evidenceIndex).toContain("Manual proof matrix artifact: `46-manual-proof-matrix.md`.");
    expect(evidenceIndex).toContain("Goal completion audit artifact: `47-goal-completion-audit.md`.");
    expect(evidenceIndex).toContain("Manual proof packet template: `48-manual-proof-packet-template.md`.");
    expect(evidenceIndex).toContain("| Final report baseline | `8084908` after canonical state/decision/roadmap truth sync |");
    expect(evidenceIndex).toContain("| Final report indexed in launch docs | `3e8d7a0` |");
    expect(evidenceIndex).toContain("| Current local validation refresh | `a65b34b`, `bun run validate` pass |");
    expect(evidenceIndex).toContain("| Current local app build refresh | `e6cf52b`, `bun run build` pass |");
    expect(evidenceIndex).toContain("current validation refresh pass: 131 files / 1022 passed / 2 skipped");
    expect(evidenceIndex).toContain("### CURRENT-HEAD Local Validation Refresh Evidence");
    expect(evidenceIndex).toContain("### CURRENT-HEAD Local Build Refresh Evidence");
    expect(evidenceIndex).toContain("### Manual Proof Matrix Evidence");
    expect(evidenceIndex).toContain("### Goal Completion Audit Evidence");
    expect(evidenceIndex).toContain("### Supabase Read-Only Provider Evidence");
    expect(evidenceIndex).toContain("### Vercel Read-Only Provider Evidence");
    expect(evidenceIndex).toContain("### Spreadsheet Artifact Local Evidence");
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
    expect(evidenceIndex).toContain("monitored inbox/form delivery, uptime/error alerts, or incident ownership");
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
    expect(evidenceIndex).toContain("Vercel env proof: `vercel env ls --non-interactive` returned `No Environment Variables found`");
    expect(evidenceIndex).toContain("`RESEND_FROM`, `RESEND_REPLY_TO`, and `RESEND_WEBHOOK_SECRET` are missing or empty");
    expect(evidenceIndex).toContain("visible in-app share/invite email workflows cannot be treated as launch-ready");
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
    expect(evidenceIndex).toContain("Current app build anchor: `e6cf52b` on `main`, before this docs-only evidence-sync commit.");
    expect(evidenceIndex).toContain("PLAYWRIGHT_PORT=3037 bun run test:e2e -- e2e/auth.spec.ts --project=chromium");
    expect(evidenceIndex).toContain("Result: pass, 2 Playwright tests in 9.9s.");
    expect(evidenceIndex).toContain("Hosted Google auth, allowed/denied/revoked allowlist smoke, first-run workspace entry, and session expiry/logout proof remain external/manual gates.");
    expect(evidenceIndex).not.toContain("| HEAD | `1ed86b4f2a3881bf1b946eb81c688071e6736574` |");
    expect(evidenceIndex).not.toContain("Pass: 122 files / 989 tests passed / 2 skipped after AI-001");
    expect(finalLaunchGate).toContain("Full local implementation baseline: `c5ca065` after demo seed row repair.");
    expect(finalLaunchGate).toContain("Current local validation refresh: `a65b34b`, `bun run validate` pass.");
    expect(finalLaunchGate).toContain("Current local app build refresh: `e6cf52b`, `bun run build` pass.");
    expect(finalLaunchGate).toContain("Local signed-out redirect/login UI E2E pass; hosted allowed/denied/revoked proof missing.");
    expect(finalLaunchGate).toContain("Use `46-manual-proof-matrix.md` as the required evidence checklist");
    expect(finalLaunchGate).toContain("Use `47-goal-completion-audit.md` before any claim");
    expect(finalLaunchGate).not.toContain("HEAD audited: `531f20a`");
    expect(executiveBrief).toContain("Final report indexed in launch docs: `3e8d7a0`.");
    expect(executiveBrief).toContain("Current local validation refresh: `a65b34b`, `bun run validate` passed");
    expect(executiveBrief).toContain("Current local app build refresh: `e6cf52b`, `bun run build` passed");
    expect(executiveBrief).toContain("Local signed-out auth E2E passed");
    expect(executiveBrief).toContain("Use `46-manual-proof-matrix.md` as the operator checklist");
    expect(executiveBrief).toContain("Use `47-goal-completion-audit.md` to check whether the active launch goal can be completed");
    expect(executiveBrief).not.toContain("HEAD: `531f20a`");
    expect(readinessScorecard).toContain("local signed-out redirect/login UI E2E passes; Vercel env list is empty");
    expect(readinessScorecard).toContain("records post-report validation/build/completion-audit/proof-template evidence through `9d71239`");
    expect(readinessScorecard).toContain("records Supabase, Vercel, spreadsheet artifact, local component/template demo, and local template insertion evidence");
    expect(readinessScorecard).toContain("Manual proof matrix: `46-manual-proof-matrix.md`");
    expect(readinessScorecard).toContain("Goal completion audit: `47-goal-completion-audit.md`");
    expect(launchReadinessReadme).toContain("Final local implementation report: `final-codex-implementation-report.md`.");
    expect(launchReadinessReadme).toContain("46-manual-proof-matrix.md");
    expect(launchReadinessReadme).toContain("47-goal-completion-audit.md");
    expect(launchReadinessReadme).toContain("48-manual-proof-packet-template.md");
    expect(launchReadinessReadme).toContain("Current local validation refresh: `a65b34b` (`bun run validate` pass; DOM 131 files / 1022 passed / 2 skipped).");
    expect(launchReadinessReadme).toContain("Current local app build refresh: `e6cf52b` (`bun run build` pass; Next.js 16.2.6 / Turbopack; 29 static pages).");
    expect(launchReadinessReadme).toContain("| Product core | 84 | Local pass; manual smoke gap |");
    expect(launchReadinessReadme).toContain("| Component library | 90 | Local screenshot pass; hosted/manual proof gap |");
    expect(launchReadinessReadme).toContain("| Templates | 91 | Local insertion pass; hosted/manual proof gap |");
    expect(launchReadinessReadme).toContain("| Investor demo readiness | 82 | Workbook artifact, library/template screenshots, and local insertion proof exist; rehearsal proof gap |");
    expect(launchReadinessReadme).toContain("| Excel export | 90 | Local artifact pass; cross-app proof gap |");
    expect(launchReadinessReadme).toContain("| Auth/onboarding | 78 | Env and hosted smoke gap |");
    expect(launchReadinessReadme).toContain("| Security/RLS | 70 | Advisor warns; linked proof gap |");
    expect(launchReadinessReadme).not.toContain("| Project-specific unlink | 35 | P0 blocker |");
    expect(launchReadinessReadme).not.toContain("Product code changes are out of scope for this pass");
    expect(releaseChecklist).toContain("Evidence anchors | `a65b34b` for `bun run validate`; `e6cf52b` for `bun run build`.");
    expect(releaseChecklist).toContain("`bun run test:dom` | Pass: 131 files / 1022 passed / 2 skipped through `bun run validate`");
    expect(releaseChecklist).toContain("`bun run build` | Pass at `e6cf52b`: Next.js 16.2.6 / Turbopack, 29 static pages");
    expect(releaseChecklist).not.toContain("`bun run test:dom` | Fail");
    expect(finalLaunchGate).toContain("`bun run test:dom`: historical baseline pass, 131 files / 1021 tests with 2 skips; current validation refresh pass, 131 files / 1022 passed / 2 skipped.");
    expect(launchRunbook).toContain("Evidence anchors: `a65b34b` for `bun run validate`; `e6cf52b` for `bun run build`.");
    expect(launchRunbook).toContain("`bun run test:dom`: pass, 131 files / 1022 passed / 2 skipped through `bun run validate`.");
    expect(launchRunbook).toContain("`bun run build`: pass at `e6cf52b`, Next.js 16.2.6 / Turbopack, 29 static pages.");
    expect(launchRunbook).not.toContain("`bun run test:dom`: fail");
    expect(executiveBrief).toMatch(/DOM tests, and build passed locally/i);
    expect(testStrategy).toMatch(/Current local Vitest DOM baseline is green/i);
    expect(zeroDefectMatrix).toMatch(/Current local command baseline: \*\*green/i);
  });

  it("keeps manual/provider proof gates operator-ready and unclaimed", () => {
    expect(manualProofMatrix).toMatch(/Status: Required before external closed beta/);
    expect(manualProofMatrix).toContain("Closed beta stays **NO-GO**");
    expect(manualProofMatrix).toContain("Use `48-manual-proof-packet-template.md`");
    expect(manualProofMatrix).toContain("Supabase backup/PITR");
    expect(manualProofMatrix).toContain("supabase-linked-schema-parity-2026-06-02.md");
    expect(manualProofMatrix).toContain("`20260601182522_closed_beta_allowed_emails` and `20260601184343_unlink_estimate_row_items` are missing from linked migration history");
    expect(manualProofMatrix).toContain("`closed_beta_allowed_emails`, `check_closed_beta_access`, and `unlink_estimate_row_item_from_library_with_history` are absent");
    expect(manualProofMatrix).toContain("Hosted auth allowlist");
    expect(manualProofMatrix).toContain("Vercel deploy/env/health");
    expect(manualProofMatrix).toContain("resend-email-readiness-blocked-2026-06-02.md");
    expect(manualProofMatrix).toContain("Vercel env list empty");
    expect(manualProofMatrix).toContain("visible share/invite email paths still present");
    expect(manualProofMatrix).toContain("first-run-workshop-local-surface-2026-06-02.md");
    expect(manualProofMatrix).toContain("empty Workshop homebase action links");
    expect(manualProofMatrix).toContain("Hosted whitelisted account proof still missing");
    expect(manualProofMatrix).toContain("Spreadsheet compatibility");
    expect(manualProofMatrix).toContain("Project-specific unlink manual smoke");
    expect(manualProofMatrix).toContain("project-specific-unlink-linked-smoke-blocked-2026-06-02.md");
    expect(manualProofMatrix).toContain("linked Supabase returned `PGRST202`");
    expect(manualProofMatrix).toContain("library-demo-smoke-local-2026-06-02.md");
    expect(manualProofMatrix).toContain("template-insert-local-smoke-2026-06-02.md");
    expect(manualProofMatrix).toContain("records local template insertion into a throwaway estimate with zero residue");
    expect(manualProofMatrix).toContain("support-feedback-local-surface-2026-06-02.md");
    expect(manualProofMatrix).toContain("workshop `Send beta feedback`, terms, and privacy point to `support@archestimator.com`");
    expect(manualProofMatrix).toContain("monitored inbox/form proof, alert ownership, and incident escalation remain missing");
    expect(manualProofMatrix).toContain("Legal/owner review");
    expect(manualProofMatrix).toContain("Current manual E2E smoke");
    expect(manualProofMatrix).toContain("current-local-e2e-smoke-2026-06-02.md");
    expect(manualProofMatrix).toContain("signed-out auth plus local dev-auth library/template/template-insert smoke");
    expect(manualProofMatrix).toContain("Hosted login, allowlist, unlink/export, logout/session expiry, and target-environment journey remain missing");
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

  it("keeps the active goal completion audit evidence-gated", () => {
    expect(goalCompletionAudit).toMatch(/Status: Goal active; completion not proven/);
    expect(goalCompletionAudit).toContain("Closed beta allowlist access implemented and tested");
    expect(goalCompletionAudit).toContain("Ask Flip hidden and AI routes disabled by default");
    expect(goalCompletionAudit).toContain("Excel export upgraded and tested");
    expect(goalCompletionAudit).toContain("All changes staged, committed, and pushed in meaningful commits");
    expect(goalCompletionAudit).toContain("Current launch-pack evidence commits are pushed");
    expect(goalCompletionAudit).toContain("backup list showed PITR disabled and no listed backups");
    expect(goalCompletionAudit).toContain("Supabase linked schema parity evidence");
    expect(goalCompletionAudit).toContain("linked migration history missing `20260601182522` and `20260601184343`");
    expect(goalCompletionAudit).toContain("`closed_beta_allowed_emails`, `check_closed_beta_access`, and `unlink_estimate_row_item_from_library_with_history` are absent");
    expect(goalCompletionAudit).toContain("latest preview reached READY and protected `/api/health` returned ok through `vercel curl`");
    expect(goalCompletionAudit).toContain("Resend email readiness evidence");
    expect(goalCompletionAudit).toContain("Vercel env list is empty, local `RESEND_FROM` / `RESEND_REPLY_TO` / `RESEND_WEBHOOK_SECRET` are missing or empty");
    expect(goalCompletionAudit).toContain("visible shared-link/collaboration email paths still call `sendEmail()`");
    expect(goalCompletionAudit).toContain("First-run Workshop local surface evidence");
    expect(goalCompletionAudit).toContain("empty Workshop homebase with Projects, Components, Templates, and empty favorite states");
    expect(goalCompletionAudit).toContain("Hosted first-run auth smoke remains missing");
    expect(goalCompletionAudit).toContain("Current local E2E smoke evidence");
    expect(goalCompletionAudit).toContain("local Playwright passed signed-out auth plus dev-auth component library, template preview, and template insertion with linked Supabase cleanup");
    expect(goalCompletionAudit).toContain("Hosted/manual target-environment E2E remains missing");
    expect(goalCompletionAudit).toContain("generated workbook artifact is loadable, ZIP-valid, formula-backed, and has no blank line totals");
    expect(goalCompletionAudit).toContain("component/template demo smoke and template insertion are partial/local pass");
    expect(goalCompletionAudit).toContain("Template insertion local smoke evidence");
    expect(goalCompletionAudit).toContain("Support/feedback local surface evidence");
    expect(goalCompletionAudit).toContain("beta support, feedback, and deletion requests to `support@archestimator.com`");
    expect(goalCompletionAudit).toContain("it does not prove the inbox/form is monitored or alerts reach an owner");
    expect(goalCompletionAudit).toContain("Project-specific unlink linked smoke attempt");
    expect(goalCompletionAudit).toContain("linked Supabase returned `PGRST202`");
    expect(goalCompletionAudit).toContain("Supabase backup/PITR and restore-drill proof");
    expect(goalCompletionAudit).toContain("Hosted auth allowlist smoke");
    expect(goalCompletionAudit).toContain("Excel plus one secondary spreadsheet app open/recalc/print proof");
    expect(goalCompletionAudit).toContain("Current decision: **DO NOT MARK GOAL COMPLETE**.");
    expect(goalCompletionAudit).toContain("48-manual-proof-packet-template.md");
    expect(goalCompletionAudit).not.toMatch(/Current decision: \*\*COMPLETE\*\*/);
  });

  it("keeps launch readiness conservative despite local implementation passes", () => {
    expect(currentState).toMatch(/Closed beta remains \*\*NO-GO\*\*/);
    expect(currentState).toContain("Read-only Supabase CLI evidence");
    expect(currentState).toContain("PITR is disabled");
    expect(currentState).toContain("Linked Supabase schema parity evidence");
    expect(currentState).toContain("Management API SQL readback succeeded");
    expect(currentState).toContain("`20260601182522_closed_beta_allowed_emails` and `20260601184343_unlink_estimate_row_items`");
    expect(currentState).toContain("`component-images` is public");
    expect(currentState).toContain("Read-only Vercel CLI evidence");
    expect(currentState).toContain("Vercel env list is empty");
    expect(currentState).toContain("Resend email readiness evidence");
    expect(currentState).toContain("local `RESEND_FROM`, `RESEND_REPLY_TO`, and `RESEND_WEBHOOK_SECRET` are missing or empty");
    expect(currentState).toContain("visible shared-link/collaboration email paths remain in source");
    expect(currentState).toContain("First-run Workshop local evidence");
    expect(currentState).toContain("empty Workshop homebase with Projects, Components, Templates, and empty favorite states");
    expect(currentState).toContain("hosted fresh-account auth proof remains missing");
    expect(currentState).toContain("Current local E2E smoke evidence");
    expect(currentState).toContain("signed-out auth plus local dev-auth component library, template preview, and template insertion with linked cleanup");
    expect(currentState).toContain("but not hosted/manual target behavior");
    expect(currentState).toContain("Spreadsheet artifact evidence");
    expect(currentState).toContain("missing local spreadsheet apps");
    expect(currentState).toContain("Component/template local demo evidence");
    expect(currentState).toContain("Template insertion local evidence");
    expect(currentState).toContain("local insertion into a throwaway estimate with zero residue");
    expect(currentState).toContain("Support/feedback local evidence");
    expect(currentState).toContain("`/contact`, workshop feedback, terms, and privacy point to `support@archestimator.com`");
    expect(currentState).toContain("monitored inbox/form and alert ownership proof remain missing");
    expect(currentState).toContain("Project-specific unlink linked smoke evidence");
    expect(currentState).toContain("linked Supabase returned `PGRST202`");
    expect(currentState).toContain("do not prove hosted auth, linked RLS/security, Resend delivery/webhooks, project-specific unlink, monitored support/alerts, or current hosted E2E/manual smoke");
    expect(currentState).toMatch(/Do not archive the MVP launch goal or claim launch readiness from local tests alone/i);
    expect(decisions).toMatch(/This is not a launch approval/);
    expect(knownIssues).toContain("Local validation/build evidence is now current");
    expect(knownIssues).toContain("`a65b34b` passed `bun run validate`");
    expect(knownIssues).toContain("`e6cf52b` passed `bun run build`");
    expect(knownIssues).toContain("Linked Supabase schema parity evidence on 2026-06-02 is negative/blocked");
    expect(knownIssues).toContain("`20260601182522_closed_beta_allowed_emails` and `20260601184343_unlink_estimate_row_items` missing from linked migration history");
    expect(knownIssues).toContain("`component-images` public");
    expect(knownIssues).toContain("Resend email readiness evidence on 2026-06-02 is negative/blocked");
    expect(knownIssues).toContain("local `RESEND_FROM`, `RESEND_REPLY_TO`, and `RESEND_WEBHOOK_SECRET` are missing or empty");
    expect(knownIssues).toContain("visible shared-link/collaboration email paths remain in source");
    expect(knownIssues).toContain("First-run Workshop local evidence on 2026-06-02 proves fallback workspace coverage");
    expect(knownIssues).toContain("hosted fresh-account Google auth and allowlist proof remain missing");
    expect(knownIssues).toContain("Current local E2E smoke evidence on 2026-06-02 proves signed-out auth plus local dev-auth component library");
    expect(knownIssues).toContain("hosted/manual target-environment proof remains missing");
    expect(knownIssues).toContain("Local component/template demo evidence on 2026-06-02 proves screenshots/JSON");
    expect(knownIssues).toContain("local template insertion evidence proves throwaway-estimate insertion with zero residue");
    expect(knownIssues).toContain("Support/feedback local evidence on 2026-06-02 proves `/contact`, workshop feedback, terms, and privacy point to `support@archestimator.com`");
    expect(knownIssues).toContain("monitored inbox/form and alert ownership proof remain missing");
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
    expect(readinessScorecard).toMatch(/Closed beta access control \| Yes \| 82 \| Local pass; linked proof pending/);
    expect(readinessScorecard).toMatch(/Auth\/onboarding \| Yes \| 78 \| Needs env and hosted smoke/);
    expect(readinessScorecard).toMatch(/Component library \| Yes \| 90 \| Local screenshot pass; hosted proof pending/);
    expect(readinessScorecard).toMatch(/Templates \| Yes \| 91 \| Local insertion pass; hosted proof pending/);
    expect(readinessScorecard).toMatch(/Vercel\/Supabase deployment \| Yes \| 76 \| Partial preview proof/);
    expect(readinessScorecard).toMatch(/Excel export \| Yes \| 90 \| Local artifact pass; app proof pending/);
    expect(readinessScorecard).toMatch(/Data backup\/rollback \| Yes \| 60 \| Provider evidence negative/);
    expect(readinessScorecard).toMatch(/Security\/RLS \| Yes \| 70 \| Live advisor warns/);
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
