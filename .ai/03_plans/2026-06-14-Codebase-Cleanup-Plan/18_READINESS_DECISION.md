# 18 — Readiness Decision

## Decision

**READY FOR P0+P1 CLEANUP IMPLEMENTATION** — safe code-only deletes plus low-risk dependency/asset/doc cleanup are identified with strong proof. Database cleanup is **READY FOR MIGRATION CLEANUP PLANNING ONLY** (behind a separate dry-run + owner gate). Aggressive pre-launch cleanup is **not** selected because (a) the largest scope cut (AI) is an owner product decision, and (b) the active estimate-tree unification corridor must not be disturbed.

Concretely: implement P0 (no-regret code/asset deletes) + P2 (deps) + P6 (docs) now; take P1 (MVP cuts) after the owner answers `19`; hold P4/P5 (DB) for post-beta.

## Top 10 safe deletes (DELETE_NOW)

1. Dead landing-section graveyard — 9 sections + 7 exclusive helpers (F03).
2. `src/lib/repositories/cost-library-repository.ts` (F04).
3. `src/lib/domain/estimate-totals.ts` (F05).
4. `ProjectWorkspaceHeaderRow.tsx` + `ProjectWorkspaceProjectCode.tsx` (F01).
5. `src/components/sidebar/ArchestimatorMark.tsx` (F02).
6. `createProject` + `deleteProject` exports in `projects/actions.ts` (F06).
7. `componentLibraryDatasetVersion` + `EstimateDragIntent`/`EstimateDragType` exports (F08/F09).
8. Stale `revalidatePath("/workshop/components")` ×2 (F10).
9. ~9.9 MB unreferenced `public/` assets (Cards/, frosted PNG, logo PNG, screenshot, scaffold SVGs, .DS_Store) (F12).
10. Dead CSS blocks `.halftone-panel`/`.halftone-field`/`.arch-sketch-line` (F13).

## Top 10 likely deletes needing proof (DELETE_AFTER_LOCAL_PROOF)

1. `/workshop/onboarding` shim + loading (fix `onboardingErrorUrl`) (F11).
2. `/api/share/[token]/events` route + 3 tests (verify no planned client send) (F14).
3. Remove `three` + `@types/three` (F20).
4. Replace `d3`→`d3-shape`, remove `@types/d3` (F21).
5. Remove `class-variance-authority` (final `rg "cva"` first) (F22).
6. Test-only exports: chart oracles, `summarize…Telemetry…`, `fetchEstimateActivityRetentionMetrics` (rewrite tests) (F16).
7. `ab-testing/results-calculator.ts` (F18).
8. Script hygiene: `enforce-app-font-size.mjs` alias, `benchmark-estimate-cursor-broadcast.ts`, `explain-estimate-list-summaries.mjs` (F24).
9. `check-vercel-speed-insights-readiness.ts` rewrite (tests removed pkg) + rename green p3 test (F39).
10. Add missing `server-only`/`d3-shape` (additive correctness) (F23).

## Top 10 migration cleanup candidates

Only **two** real destructive DB candidates exist; the rest are KEEP-dormant/corridor:
1. Drop `profile_role_hardening_audit` table (post-beta, dump+rollback) (F29).
2. Drop `resolve_app_role_for_email` RPC (verify live `\df`/deps first) (F30).
3. (Keep) `get_project_chart_buckets` — deployed-dormant (F31).
4. (Keep) version-control RPC stack — dormant corridor (F32).
5. (Keep) AI audit tables — even if AI UI cut.
6. (Keep) multiply-defined functions — migration history, not candidates.
7. (Staged, owner-gated) unification P5 SQL — separate runbook, not this pack.
8. Remove orphaned `types.ts` entries only after their object is dropped (F29/F30).
9. (Plan) P4 ephemeral dry-run protocol for F29/F30.
10. (Plan) P5 hosted apply with dump/readback for F29/F30.

## Top 10 things to KEEP despite looking stale

1. `estimate-schema-compat.ts` + `normalizeEstimateRecord`/`isMissingColumnError` (active corridor).
2. `LEGACY_MAIN_TAB_ID` / `__legacy_default_tab__` / `allowLegacyFallback` (tab corridor).
3. `domain/estimate-tree.ts` + `estimate-mutations.ts` (live).
4. All `lib/{publication,share,collaboration,auth,proposal-export}/**` (security).
5. AI audit tables + AI security-contract tests (compliance).
6. Story-only UI primitives until owner decides (F15) + storybook governance.
7. `MotionReveal`/`LaunchFeatureHeading`/`AnimatedProposalRecordSection`/`NeatWireframeBackground` (live landing).
8. Dormant-but-planned DB RPCs (version control, chart buckets).
9. `setEstimateFavorite` (schema+table+test exist; product decision).
10. `legacy …` comments referencing plan 2026-06-12 §01-17 (corridor markers).

## Top 10 obsolete tests/stories/scripts

1. `p3-shared-link-migration-red.test.ts` — rename (now green) (F39).
2. `check-vercel-speed-insights-readiness.ts` + its test — tests removed pkg (F39).
3. `security-findings-library-tooling-contracts.test.ts` — drift-risk rewrite (NOT a current failure).
4. Story-only stories (6) — fate tied to F15.
5. `landing-interactivity.test.tsx` — imports dead landing sections; update with F03.
6. `enforce-app-font-size.mjs` — redundant alias (F24).
7. `benchmark-estimate-cursor-broadcast.ts` — unwired dev tool (F24).
8. `explain-estimate-list-summaries.mjs` — unwired EXPLAIN tool (F24).
9. Chart-oracle test-only exports' tests — migrate to live path (F16).
10. AI tests — DELETE_WITH_FEATURE only if AI cut (F25).

## Top 10 stale docs/plans/comments

1. README counts (migrations/vitest/e2e/hooks/unit) (F33).
2. `features/page.tsx` Excel "Planned" mislabel (F34).
3. README collaboration "Available" overstatement (F35).
4. `ProjectEstimatesClient.tsx:17-21` temporary-backout comment (F36).
5. `publication/actions.ts:724` Docker-blocked comment (F36).
6. `2026-06-06-notification-system` plan — archive (implemented) (F37).
7. `2025-06-11-Landing-Page-Comprehensive-Improvement-Plan` — archive (superseded, wrong year) (F37).
8. `2026-06-03-react-joyride-onboarding` — mark historical (never built) (F37).
9. 5 active plans missing from `.ai/03_plans/README.md` (F37).
10. Brand specs naming revision-intelligence/proposal-comparisons as if built (F38).

## Biggest risk
Disturbing the **estimate-tree unification corridor** or a **security/share/auth** surface while "cleaning". Mitigation: those are explicitly KEEP/Needs-migration-context; any change there demands Tier 4/5 validation and is out of P0.

## Highest-benefit cleanup
Deleting the **dead landing-section graveyard (F03)** + fixing **doc drift (F33–F38)** — together they remove the most code/confusion and the most agent-misleading inaccuracies, at low risk. The **dependency graph trim (F20/F21)** is the highest measurable-footprint win.

## Exact next implementation prompt Philip should run

> You are implementing **P0 + P2 + P6** of the 2026-06-14 Codebase Cleanup Plan (`.ai/03_plans/2026-06-14-Codebase-Cleanup-Plan/`). Implement ONLY the `DELETE_NOW` and `DELETE_AFTER_LOCAL_PROOF` buckets from `04_DELETION_CANDIDATE_MATRIX.md` and `17_IMPLEMENTATION_PHASE_PLAN.md` (phases P0, P2, P6). Do NOT touch the database (no migrations, no drops — F29/F30 stay behind the P4/P5 owner gate), do NOT make the P1 owner-gated feature cuts (AI, follow-mode, aec-classification, story-only UI), and do NOT modify any code in the estimate-tree unification corridor, security/share/auth, or `lib/{publication,collaboration}`. Work on a new branch.
>
> Concretely: (1) delete dead landing sections + exclusive helpers (F03) and prune `landing/index.ts` + update `landing-interactivity.test.tsx`; (2) delete `cost-library-repository.ts`, `domain/estimate-totals.ts`, `ArchestimatorMark.tsx`, `ProjectWorkspaceHeaderRow/ProjectWorkspaceProjectCode`, `ProductPreviewVariants` (F01–F05, F27); (3) remove dead exports `createProject`/`deleteProject`, `componentLibraryDatasetVersion`, `EstimateDragIntent`/`EstimateDragType` (F06/F08/F09); (4) remove stale `revalidatePath("/workshop/components")` ×2 (F10); (5) delete `/workshop/onboarding` shim after repointing `onboardingErrorUrl()`→`/workshop/settings?error=` (F11); (6) after confirming no planned client event send, delete `/api/share/[token]/events` + its 3 test refs (F14); (7) delete the ~9.9 MB unreferenced `public/` assets + dead CSS blocks (F12/F13); (8) deps: remove `three`+`@types/three`, replace `d3`→`d3-shape`+remove `@types/d3`, remove `class-variance-authority` after a final `rg "cva\b|class-variance-authority" src` returns empty, add `server-only`+`d3-shape` (F20–F23); (9) docs: fix README counts + collaboration claim, fix `features/page.tsx` Excel label, fix the two stale comments, archive the notification-system + 2025-landing + react-joyride plans and list the 5 unlisted active plans, rename the green p3 test, rewrite the speed-insights readiness script (F33–F39); (10) script hygiene (F24).
>
> Gate after each group with `bun run type-check && bun run build && bun test && bun run test:dom` and confirm the failing `test:dom` set does NOT grow beyond the two known pre-existing failures (`estimate-sheet-version-control-ui`, `proposal-export-preview`) and the lint error count does not exceed the baseline (65). Run `npx playwright test e2e/landing-audit.spec.ts` after the landing/asset/CSS deletes, and a charts smoke after the `d3` swap. Report a `git diff --stat`, the gate deltas vs baseline, and anything you chose to KEEP and why. Do not claim DB or provider changes.
