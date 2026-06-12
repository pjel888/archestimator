# Phase 2 Implementation Run — Repository and Domain Tab Support

**Date:** 2026-06-12
**Branch:** `feat/estimate-tabs-phase2-domain-repository`
**Base commit:** `fdfa9133` (amended Phase 1 database foundation; harness import restored and locally reproven)
**Scope label:** Phase 2 local repository/domain compatibility wrappers; no user-visible tab UI yet.

## Objective

Implement the Phase 2 local-code slice from `.ai/03_plans/2026-06-12-Projects-Auto-Added-To-Templates/10_IMPLEMENTATION_PHASES.md`:

- Add tab-aware domain/UI types and reusable-source type scaffolding.
- Add tab query keys and per-tab tree cache support while preserving legacy `areaTree` keys.
- Add repository functions for tabs, default-tab resolution, tab-scoped trees, and route context.
- Preserve `getProjectEstimateTreeByEstimate` and `getProjectEstimateTreeByNode` signatures as compatibility wrappers.
- Add tab CRUD server-action wrappers over the Phase 1 RPCs.
- Add root-node create `estimateTabId` support and same-tab reorder validation.
- Add per-tab selection/expansion/active-tab client state scaffolding.
- Add `tab_*` activity labels/targets.

## Files changed

- `src/lib/domain/estimate-tree.ts`
- `src/lib/estimates/types.ts`
- `src/lib/reusable-sources/types.ts`
- `src/lib/repositories/workspace-repository.ts`
- `src/lib/repositories/estimate-repository.ts`
- `src/lib/estimates/actions.ts`
- `src/hooks/use-estimate-query.ts`
- `src/hooks/use-estimate-row-mutations.ts`
- `src/hooks/use-estimate-workspace-state.ts`
- `src/lib/activity/activity-composer.ts`
- `src/lib/activity/activity-copy-dictionary.ts`
- `src/lib/activity/types.ts`
- `tests/vitest/estimate-node-reorder-action.test.ts`
- `tests/vitest/estimate-tabs-domain.test.ts`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase2/*`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase2-implementation-run.md`
- `.ai/05_logs/2026-06-12-estimate-tabs-implementation-ledger.md`

## Implementation notes

- `src/lib/supabase/types.ts` remains intentionally stale until owner-authorized linked apply/typegen. New DB reads use narrow local casts only around `estimate_tabs` and `estimate_nodes.estimate_tab_id`.
- `getProjectEstimateTreeByEstimate` is now a default-tab wrapper but falls back to the legacy all-estimate loader if `estimate_tabs` or `estimate_tab_id` is missing, preserving local pre-apply behavior.
- Existing UI still calls legacy hooks/actions; new tab-aware APIs are additive and ready for Phase 3.
- The Phase 1 harness commit was amended to restore a required `readdirSync` import after this phase's proof run caught the regression; Phase 2 is based on the amended `fdfa9133` commit.

## Validation results

| Gate | Exit | Classification | Artifact |
|---|---:|---|---|
| `bun run type-check` | 0 | PASS after lint-warning fix | `.ai/05_logs/2026-06-12-estimate-tabs-phase2/type-check-after-lint-fix.log` |
| Phase 2 unit/action/domain tests | 0 | PASS; 3 files / 37 tests | `.ai/05_logs/2026-06-12-estimate-tabs-phase2/phase2-domain-actions.log` |
| `POSTGRES_BIN_DIR=/opt/homebrew/bin bun run prove:estimate-tabs-rls` | 0 | PASS local ephemeral Postgres proof using available PG15 binary | `.ai/05_logs/2026-06-12-estimate-tabs-phase2/postgres-rls-pg15-local.log` |
| targeted estimate characterization suite | 0 | PASS; 7 files / 126 tests | `.ai/05_logs/2026-06-12-estimate-tabs-phase2/targeted-estimate-characterization.log` |
| targeted perf suite | 0 | PASS; 4 files / 14 tests | `.ai/05_logs/2026-06-12-estimate-tabs-phase2/targeted-perf.log` |
| targeted export regression suite | 0 | PASS; 4 files / 17 tests | `.ai/05_logs/2026-06-12-estimate-tabs-phase2/targeted-export-regression.log` |
| `bun run build` | 0 | PASS after final code fix; `next-env.d.ts` restored after generated churn | `.ai/05_logs/2026-06-12-estimate-tabs-phase2/build-after-lint-fix.log` |
| `bun run lint` | 1 | PRE-EXISTING baseline only: 3 errors / 548 warnings, matching Phase 0 after removing one new `_tab` warning | `.ai/05_logs/2026-06-12-estimate-tabs-phase2/lint-after-lint-fix.log` |

## Phase 2 RTM audit

Local implementation evidence advances these rows:

- R1.3 — tab-aware loaders/actions/keys + compatibility wrappers: implemented locally with wrapper source contract and action tests.
- R1.5 — per-tab selection/expansion records: implemented as client state scaffolding; UI use arrives in Phase 3.
- R1.6 — per-tab tree isolation: repository tab-tree loader filters nodes by `estimate_tab_id`; covered by type-check/source contract and targeted regression suites.
- R10.1 — `tab_*` labels: activity dictionary/composer now recognizes tab event types; row/node event stamping remains DB-side from Phase 1 and broader UI filtering remains later.
- R12.3 — local-vs-linked boundary remains explicit; no provider proof claimed.

Rows that intentionally stay open: editor tab strip/UI, copy rebrand, reusable-sources panel behavior, export all-tabs, collaboration/presence UI, AI/package-builder, hosted/manual proof, and cleanup/archive.

## Proof boundary

- **Local-only proven:** TypeScript, Phase 2 action/domain tests, local PG15 RLS proof, build, targeted estimate/perf/export suites.
- **Provider/manual pending:** linked Supabase apply/typegen, hosted DB proof, browser/manual tab UI proof, hosted export smoke.
- **Not claimed:** production deploy, regenerated remote types, user-visible multi-tab creation.

## Next action

Commit Phase 2 local wrappers, then proceed to Phase 3 editor multi-tab UI while honoring release gate D-15: tab creation/duplication must not be user-visible before tab-aware export ships in the same release train.
