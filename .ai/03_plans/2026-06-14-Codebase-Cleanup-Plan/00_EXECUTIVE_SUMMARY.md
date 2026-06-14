# 00 — Executive Summary

**Date:** 2026-06-14 · **Status:** AUDIT / PLANNING / DELETION-READINESS ONLY · **HEAD:** `2f28daf147ac` (`main`)
**Posture:** Pre-launch closed beta, owner-only, no external users. Bias toward deletion/consolidation over speculative backward-compat — except where security, audit, legal, or the **active estimate-tree unification corridor** require caution.

## Headline

Archestimator is a large but **healthy and well-instrumented** codebase: `type-check` and `build` pass, unit tests pass, and there are no circular dependencies. The repo carries a normal amount of pre-launch debt — dead landing scaffolding, a handful of orphaned modules, three removable npm dependencies, ~10 MB of unreferenced public assets, two dormant DB objects, and documentation that has drifted from the code. None of it is alarming; most is **safe, low-risk, code-only deletion**.

The cleanup readiness decision is **READY FOR P0+P1 CLEANUP IMPLEMENTATION** (safe code-only deletes + dependency/asset/doc cleanup), with database cleanup held behind a separate **migration-dry-run + owner gate** (P4/P5). See `18_READINESS_DECISION.md`.

## What we found (by weight)

- **~30+ files / ~3,000+ LOC of safe code deletion** with strong proof: the dead landing-section graveyard (9 sections + exclusive helpers), two orphaned `src/lib` modules (`cost-library-repository.ts`, `domain/estimate-totals.ts`), dead workshop components whose absence is already enforced by tests, an orphan brand mark, dead route shims, and stale `revalidatePath` calls.
- **3 removable runtime dependencies** (`three` — zero imports; `d3` → replace with the only sub-package used, `d3-shape`; `class-variance-authority` — zero `cva` usage) + 2 dev `@types`, validated by knip + depcheck + manual grep. Plus 2 missing deps to add (`server-only`, `d3-shape`).
- **~9.9 MB of unreferenced public assets** (`public/Cards/`, a 2.3 MB unused hero PNG, a 700 KB logo PNG superseded by SVGs, a stray screenshot, Next.js scaffold SVGs, `.DS_Store`).
- **Two dormant DB objects** (`profile_role_hardening_audit` table, `resolve_app_role_for_email` RPC) — both **destructive, owner-gated, post-beta** with dump+rollback.
- **Documentation drift**: README counts are stale (migrations 67→91, vitest 115→~240, e2e 7→18, hooks 8→11); `features/page.tsx` mislabels the shipped Excel export as "Planned"; README overstates collaboration invite availability; several implemented/superseded `.ai` plans need archiving and 5 active plans aren't listed.
- **Deferred-feature decisions for the owner** (not auto-deletes): the entire AI surface (routes/`lib/ai`/flags/tests — currently fail-closed), follow-mode + project-page-cursors (flagged off; follow-mode helpers have **zero callers**), `aec-classification` (test-only), and `ab-testing/results-calculator.ts` (test-only).

## What we deliberately did NOT touch

No source edited, no files deleted, no `package.json` changed, no migrations applied, no Supabase/Vercel/GitHub/DNS mutated, no secrets exposed, no SlateCamp/other provider projects touched. All DB findings are static (no live DB queried).

## Honest quality notes

- **Pre-existing failures (cleanup context, not blockers):** `lint` (65 errors / 409 warnings, overwhelmingly test-file `no-unused-expressions`/`no-explicit-any`), `lint:design-system` (`ProposalExportPreviewDialog` font-size + `rounded-full`), and **2 of 2,200** `test:dom` tests (`estimate-sheet-version-control-ui`, `proposal-export-preview`). `ProposalExportPreviewDialog` is a real hotspot (owns both a failing test and the design-system lint failures) — it is a **fix-forward** item, not part of any deletion.
- **Static-only DB audit:** no local/hosted DB was queried; all schema findings need a live `\df`/row check before any drop (P4). Two destructive candidates only.
- **Active corridor caution:** the estimate-tree single-node unification (P5 SQL staged, not applied) has transitional compat code and "legacy …" comments that look stale but are **intentional**. They are explicitly classified KEEP / Needs-migration-context, not safe-delete.

## The single most valuable next step

Run a focused **P0 implementation prompt** that deletes only the `DELETE_NOW` + `DELETE_AFTER_LOCAL_PROOF` buckets (dead landing scaffolding, orphan modules, dead components, stale shims, dead CSS, unreferenced assets) and lands the 3-dependency cleanup, gated by `type-check && build && bun test && test:dom`, with DB cleanup left behind the separate migration gate. Exact prompt in `18_READINESS_DECISION.md` §"Exact next implementation prompt".
