# CURRENT CANONICAL PLAN — Codebase Cleanup (2026-06-14)

> **Single source of truth for this cleanup pack.** Where any numbered doc conflicts with this file, this file wins. **Do not implement from stale docs.** **This is an audit — do not mutate production/provider/database from this task.**

## Executive summary

Archestimator (pre-launch closed beta) is healthy: `type-check`/`build`/unit tests pass, no circular deps. Normal pre-launch debt exists — dead landing scaffolding, a few orphaned `src/lib` modules, 3 removable npm deps, ~9.9 MB unreferenced assets, 2 dormant DB objects, and doc drift. Almost all of it is **safe, low-risk, code-only deletion**. Readiness: **READY FOR P0+P1 CLEANUP IMPLEMENTATION**; DB cleanup = **MIGRATION CLEANUP PLANNING ONLY** behind owner gate. Findings: `04_DELETION_CANDIDATE_MATRIX.md` (F01–F40). Evidence: `evidence/`.

## Cleanup posture

Pre-launch, owner-only → bias toward deletion/consolidation over speculative backward-compat. **Exceptions (caution):** security/share/auth/collaboration/publication, audit/legal tables, and the **active estimate-tree single-node unification corridor** (P5 SQL staged, not applied). Those are KEEP / Needs-migration-context.

## What is SAFE to delete now (DELETE_NOW — P0/P2/P6)

Dead landing-section graveyard (9 sections + 7 helpers, F03); `cost-library-repository.ts` (F04); `domain/estimate-totals.ts` (F05); `ProjectWorkspaceHeaderRow`+`ProjectWorkspaceProjectCode` (F01); `ArchestimatorMark` (F02); `createProject`/`deleteProject` exports (F06); `componentLibraryDatasetVersion`, `EstimateDragIntent/Type` (F08/F09); stale `revalidatePath` ×2 (F10); ~9.9 MB public assets (F12); dead CSS (F13); `ProductPreviewVariants` (F27); doc fixes (F33–F36, F38). Dependencies: remove `three`/`@types/three`, `d3`→`d3-shape`/remove `@types/d3`, remove `class-variance-authority`, add `server-only`/`d3-shape` (F20–F23).

## What is LIKELY DEAD but needs proof (DELETE_AFTER_LOCAL_PROOF)

`/workshop/onboarding` shim (fix helper) (F11); `/api/share/[token]/events` (verify no client send) (F14); test-only oracle exports (F16); `ab-testing/results-calculator.ts` (F18); script hygiene (F24); speed-insights script rewrite + p3 test rename (F39).

## What should be CUT FROM MVP (owner decision — P1)

AI surface keep-deferred vs cut (F25); follow-mode helpers+flag (F07); project page cursors (F26); aec-classification (F17); story-only UI primitives (F15); ab-testing results-calculator (F18). See `19` owner gates OG-1..OG-7.

## What requires MIGRATION (P4 dry-run → P5 hosted, owner-gated, destructive)

Drop `profile_role_hardening_audit` (F29); drop `resolve_app_role_for_email` (F30). Only two. Each needs dump + ephemeral dry-run + live `\df`/`pg_depend` verification + rollback SQL + owner gate (`15`).

## What requires OWNER GATE

F07, F15, F17, F25, F26, F28 (product/governance) and F29, F30, staged P5 (DB destructive). Full list + questions in `19`.

## What MUST be KEPT despite looking stale

`estimate-schema-compat.ts`, `LEGACY_MAIN_TAB_ID`/`__legacy_default_tab__`/`allowLegacyFallback`, `domain/estimate-tree.ts`+`estimate-mutations.ts`, all `lib/{publication,share,collaboration,auth,proposal-export}/**`, AI audit tables + security-contract tests, dormant-but-planned DB RPCs (version control, `get_project_chart_buckets`), live landing helpers (`MotionReveal`, etc.), story-only primitives until OG-6, `setEstimateFavorite`, all `// legacy … plan 2026-06-12 §01-17` corridor comments.

## Deletion candidate matrix summary

40 findings: ~17 DELETE_NOW · ~10 DELETE_AFTER_LOCAL_PROOF · ~8 OWNER_GATE · 2 DELETE_AFTER_MIGRATION_DRY_RUN (also owner-gated) · ~4 KEEP_FOR_NOW. Full table: `04_DELETION_CANDIDATE_MATRIX.md`.

## Cleanup speed/complexity summary

Highest cognitive-load wins (low risk): dead landing scaffolding + doc accuracy + orphan lib modules. Highest measurable footprint: ~9.9 MB assets + ~600 KB/33-sub-pkg dependency trim. Highest leverage (owner): AI cut. Lowest urgency/highest care: DB destructive drops. Matrix: `13`.

## Recommended implementation phases

P0 safe code/assets/CSS → P6 docs → P2 deps (safe pre-launch sweep) → P1 owner-gated MVP cuts → P3 server/domain consolidation → P4 DB dry-run → P5 hosted DB. Detail: `17`. Exact next prompt: `18` §"Exact next implementation prompt".

## Validation gates

Per phase, smallest sufficient tier (`14`). Baseline this audit: type-check/build/unit PASS; lint FAIL (65/409, pre-existing); lint:design-system FAIL (`ProposalExportPreviewDialog`); test:dom FAIL (2/2200 — `estimate-sheet-version-control-ui`, `proposal-export-preview`). **Rule: cleanup must not grow the failing-test set or lint error count; compare sets, not just exit codes.**

## Rollback posture

Code/deps/docs: single-branch `git revert`. DB (F29/F30): logical dump + rollback SQL + (closed-beta) daily physical backups; PITR remains off by owner cost decision.

## ⚠️ Warnings

- **Do not implement from stale docs.** README counts and `features/page.tsx` are themselves cleanup targets (F33/F34) — trust the code + this pack.
- **Do not mutate production/provider/database from this audit task.** No migrations, no drops, no Vercel/Supabase/GitHub/DNS changes here. Destructive DB work is P4/P5 with explicit owner gate, even though AGENTS.md grants standing pre-launch DB authorization.
- **Do not disturb the estimate-tree unification corridor or security/share/auth surfaces** under the banner of "cleanup".
