# Archestimator Cleanup — IMPLEMENTATION Prompt (P0 + P2 + P6)

> Companion to the audit pack `.ai/03_plans/2026-06-14-Codebase-Cleanup-Plan/`.
> The audit (`cleanup-prompt.md`) was the **intelligence pass**. THIS prompt is the
> **implementation pass** it calls for: execute only the `DELETE_NOW` and
> `DELETE_AFTER_LOCAL_PROOF` buckets, leaving destructive database cleanup behind a
> separate migration gate. Run it as a coding task on a new branch.

---

## Role and posture

You are implementing the safe, low-risk cleanup phases of the 2026-06-14 Codebase Cleanup Plan for Archestimator (pre-launch closed beta, owner-only). This IS a coding/deletion task (unlike the audit). Read these first:

1. `.ai/03_plans/2026-06-14-Codebase-Cleanup-Plan/CURRENT_CANONICAL_PLAN.md`
2. `.ai/03_plans/2026-06-14-Codebase-Cleanup-Plan/04_DELETION_CANDIDATE_MATRIX.md`
3. `.ai/03_plans/2026-06-14-Codebase-Cleanup-Plan/17_IMPLEMENTATION_PHASE_PLAN.md`
4. `.ai/03_plans/2026-06-14-Codebase-Cleanup-Plan/14_TESTING_AND_VALIDATION_PROTOCOL.md`
5. `.ai/03_plans/2026-06-14-Codebase-Cleanup-Plan/16_RISK_REGISTER_AND_BLAST_RADIUS.md`

Scope = **P0 (safe code/asset/CSS deletes)** + **P2 (dependency cleanup)** + **P6 (docs/scripts)**.

## Hard constraints (do NOT cross)

- **No database changes.** No migrations, no drops. `profile_role_hardening_audit` (F29) and `resolve_app_role_for_email` (F30) stay behind the P4/P5 owner gate.
- **No P1 owner-gated feature cuts.** Do not touch the AI surface (`src/lib/ai/**`, `app/api/ai/**`, AI flags/tests — F25), follow-mode helpers/flag (F07), project page cursors (F26), `aec-classification` (F17), or story-only UI primitives (F15). Those await owner decisions in `19_OPEN_QUESTIONS_OWNER_GATES.md`.
- **Do not disturb the estimate-tree single-node unification corridor** (compat code in `estimate-schema-compat.ts`, `LEGACY_MAIN_TAB_ID`, `__legacy_default_tab__`, `domain/estimate-tree.ts`, `estimate-mutations.ts`, and all `// legacy … plan 2026-06-12 §01-17` comments).
- **Do not touch security/share/auth surfaces** (`lib/{publication,collaboration,share,auth,proposal-export}/**`) except the single explicit F14 route removal below, which must be verified first.
- No provider mutation (Supabase/Vercel/GitHub/DNS), no secret exposure, no SlateCamp.
- Work on a **new branch**; keep the change set revertible.

## Baseline gates (record before you start; do not regress)

```
type-check  PASS
build       PASS
test (unit) PASS (9)
lint        FAIL — 65 errors / 409 warnings (pre-existing; mostly test files)
lint:design-system FAIL — ProposalExportPreviewDialog
test:dom    FAIL — 2/2200: estimate-sheet-version-control-ui, proposal-export-preview
```
**Rule:** your cleanup must not grow the failing-test SET beyond those two, and must not increase the lint error count above 65. Compare sets, not just exit codes. The 2 failures + lint debt are pre-existing fix-forward items (CLEAN-F40) — leave them, don't let them mask a regression you introduce.

---

## P0 — Evidence-backed safe deletes

1. **Dead landing graveyard (F03).** Delete the 9 unused sections — `PartnerSection`, `SolutionSection`, `TestimonialSection`, `ProductShowcaseSection`, `EstimatorEngineSection`, `FeaturesSection`, `PricingSection`, `FAQSection`, `ProcessBandSection` — and their exclusive helpers — `ProductPreview`, `ProductPreviewVariants`, `AnnouncementBanner`, `SectionIntro`, `CtaLink`, `PlaceholderMedia`, `company-proof-data.ts`. Prune `src/components/landing/index.ts`. Update `tests/vitest/landing-interactivity.test.tsx` (remove/retarget imports of the deleted sections). **KEEP** `MotionReveal`, `LaunchFeatureHeading`, `AnimatedProposalRecordSection`, `NeatWireframeBackground`, `constants.ts` (live on `/`). Confirm `src/lib/ab-testing/**` stays imported by `HeroSection`/`FinalCTASection`/`LandingHeader`/`ABExperimentProvider`.
2. **Orphan modules/components (F01, F02, F04, F05).** Delete `src/components/workshop/ProjectWorkspaceHeaderRow.tsx`, `ProjectWorkspaceProjectCode.tsx`, `src/components/sidebar/ArchestimatorMark.tsx`, `src/lib/repositories/cost-library-repository.ts`, `src/lib/domain/estimate-totals.ts`. (Guard tests asserting `ProjectWorkspaceHeaderRow` absence stay green.)
3. **Dead exports (F06, F08, F09).** Remove `createProject` and `deleteProject` from `src/lib/projects/actions.ts`; remove `componentLibraryDatasetVersion` from `component-library-repository.ts`; internalize (drop `export`) `EstimateDragIntent`/`EstimateDragType` in `src/stores/estimate-ui-store.ts`.
4. **Stale revalidatePath (F10).** Remove `revalidatePath("/workshop/components")` at `src/lib/component-library/actions.ts:164` and `src/lib/ai/package-builder/apply.ts:931` (keep the adjacent `/workshop/library` calls). *(This is a 1-line edit inside an AI file — it removes a dead call only; it does not change AI behavior or the gate.)*
5. **Onboarding shim (F11).** Repoint private `onboardingErrorUrl()` in `src/lib/auth/account-actions.ts` to `/workshop/settings?error=...`, then delete `src/app/workshop/onboarding/page.tsx` + `loading.tsx`. Manually verify the profile-setup error path now surfaces at `/workshop/settings`.
6. **Share events route (F14) — verify first.** Confirm there is no planned client-side `fetch("/api/share/[token]/events")` (search the repo; events are recorded server-side via `after()` in `share/[token]/page.tsx`). If confirmed dead, delete `src/app/api/share/[token]/events/route.ts` and its references in the 3 tests (`project-publication-route`, `project-publication-security`, `share-no-store-invariants`). If any doubt, KEEP and note it.
7. **Assets (F12).** Delete `public/Cards/*`, `public/landing/archestimator-frosted-construction.png`, `public/archestimator_logo.png`, `public/Screenshot 2026-05-18 at 9.00.39 PM.png`, `public/{file,globe,next,vercel,window}.svg`, `public/.DS_Store` (and ensure `.DS_Store` is gitignored). KEEP `favicon_io/`, `archestimator_logo.svg`/`_white.svg`, `sidebar-BG.png`, `component-thumbnails/*`, `landing/hero-slides/*`.
8. **Dead CSS (F13).** Remove `.halftone-panel` (+`::before/::after`), `.halftone-field`, `.arch-sketch-line` from `src/app/globals.css`.

**P0 gate:** `bun run type-check && bun run build && bun test && bun run test:dom`; then `npx playwright test e2e/landing-audit.spec.ts`. Failing-test set must remain the 2 known.

---

## P2 — Dependency cleanup

9. **Remove `three` + `@types/three` (F20)** — zero imports.
10. **Replace `d3`→`d3-shape`, remove `@types/d3` (F21)** — code already imports `d3-shape`; this drops ~33 unused d3 sub-packages with no code change.
11. **Remove `class-variance-authority` (F22)** — ONLY after a final `rg "cva\b|class-variance-authority" src` returns empty.
12. **Add missing deps (F23):** `server-only` (used by `lib/workshop/beta-feedback-review.ts`) and `d3-shape`.

**P2 gate:** `bun install` → `bun run type-check && bun run build` → charts smoke (open `/workshop/projects/[id]/charts` or run chart tests) → `bun run test:dom`. Record a bundle delta if easy (`ANALYZE=true bun run build`).

---

## P6 — Docs & scripts

13. **README accuracy (F33/F35):** fix counts (migrations 67→91, vitest 115→current, e2e 7→18, hooks 8→11, unit 2→3, landing sections), and qualify the collaboration line ("Available; email invite delivery requires env configuration").
14. **`src/app/features/page.tsx` (F34):** Excel export is shipped — change "Planned Excel (.xlsx) export" to reflect availability (PDF stays planned).
15. **Stale comments (F36):** `ProjectEstimatesClient.tsx:17-21` (temporary-backout-aid past its window) and `publication/actions.ts:724` (Docker-blocked framing).
16. **Plan hygiene (F37):** archive `2026-06-06-notification-system` (implemented), `2025-06-11-Landing-Page-Comprehensive-Improvement-Plan` (superseded), `2026-06-03-react-joyride-onboarding` (never built) to `.ai/09_archive/store/`; add the 5 unlisted active plans to `.ai/03_plans/README.md`. Update doc-structure tests (`agentic-framework-routing-docs`, `closed-beta-readiness-docs`, `dbidx-repo-audit`) accordingly.
17. **Brand specs (F38):** annotate `.ai/06_specs/brand/*` that "Revision Intelligence" and "Proposal Comparisons" are planned (distinct from the live project-charts comparison).
18. **Scripts (F39/F24):** rename `tests/unit/p3-shared-link-migration-red.test.ts` to reflect its now-green guard role; rewrite/retire `scripts/check-vercel-speed-insights-readiness.ts` (it tests a removed package); confirm-then-remove the redundant `scripts/enforce-app-font-size.mjs` alias and unwired dev tools `benchmark-estimate-cursor-broadcast.ts` / `explain-estimate-list-summaries.mjs`.

**P6 gate:** `bun run type-check && bun run test:dom` (doc-structure tests).

---

## Reporting (when done)

Report: `git diff --stat`; gate deltas vs the recorded baseline (confirm no new `test:dom` failures, lint ≤ 65); the measured LOC/asset/bundle reduction; every item you chose to KEEP and why (especially F14 if you kept the route); and any item that turned out NOT to be dead. Do NOT claim any database or provider change. Leave P1 (owner gates in `19`) and P4/P5 (DB) untouched.
