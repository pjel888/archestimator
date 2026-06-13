# Phase 1 Implementation Run — Estimate Tabs Database Foundation

**Date:** 2026-06-12
**Branch:** `feat/estimate-tabs-phase1-db-foundation`
**Base commit:** `46c08e90` (Phase 0 baseline/citation spot-check commit)
**Scope label:** Phase 1 local-only database foundation; linked Supabase apply/typegen/manual provider proof remain owner-gated.

## Objective

Implement the Phase 1 database foundation from `.ai/03_plans/2026-06-12-Projects-Auto-Added-To-Templates/10_IMPLEMENTATION_PHASES.md`:

- Add first-class `estimate_tabs` with default-tab invariant, tab-scoped node ownership, RLS, indexes, and grants.
- Backfill every existing estimate to a default `Main` tab and attach every node to a tab before the NOT NULL flip.
- Evolve live tree validators/reorder/template-insert/node-create RPCs for same-tab constraints.
- Add tab lifecycle `*_with_history` RPCs and `estimate_sheet_events.estimate_tab_id` stamping support.
- Keep app behavior single-tab compatible by creating the default tab in `createEstimateWithDefaultTree` without making tabs user-visible yet.
- Add static schema tests plus an ephemeral Postgres proof harness.

## Files changed

- `supabase/migrations/20260612094734_estimate_tabs_foundation.sql`
- `scripts/prove-estimate-tabs-postgres.mjs`
- `tests/vitest/estimate-tabs-schema.test.ts`
- `src/lib/estimates/actions.ts`
- `package.json`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase1/*`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase1-implementation-run.md`
- `.ai/05_logs/2026-06-12-estimate-tabs-implementation-ledger.md`

## Implementation notes

- Migration created with the repo Supabase CLI path (`supabase migration new estimate_tabs_foundation`); local CLI observed as `2.98.2`. The CLI also advertised a newer available version, but the plan's linked typegen/runbook is pinned to `2.98.2`.
- The migration keeps legacy `estimate_sheet_*` object names where they are compatibility contracts, while adding tab columns/RPCs around them.
- The dormant snapshot/version RPC stack is explicitly guarded in the migration and remains asleep until a later v3 snapshot implementation carries `tabs[]` and per-node tab ids.
- `src/lib/supabase/types.ts` was **not** regenerated because linked Supabase apply/typegen is owner-gated. `createEstimateWithDefaultTree` uses a narrow temporary client/type shim with comments documenting that boundary until the owner authorizes `db push` plus type regeneration.
- The build generated `next-env.d.ts` route-type churn; it was restored before commit staging.

## Validation results

| Gate | Exit | Classification | Artifact |
|---|---:|---|---|
| `node --check scripts/prove-estimate-tabs-postgres.mjs` | 0 | PASS after import cleanup | `.ai/05_logs/2026-06-12-estimate-tabs-phase1/node-check-prove-script-after-import-cleanup.log` |
| `bunx vitest run tests/vitest/estimate-tabs-schema.test.ts --maxWorkers=1` | 0 | PASS; 7 schema-contract tests | `.ai/05_logs/2026-06-12-estimate-tabs-phase1/schema-vitest.log` |
| `bun run type-check` | 0 | PASS | `.ai/05_logs/2026-06-12-estimate-tabs-phase1/type-check.log` |
| `bun run prove:estimate-tabs-rls` | 1 | LOCAL PREREQUISITE GAP; default PG16 binary missing at `/opt/homebrew/opt/postgresql@16/bin/initdb` | `.ai/05_logs/2026-06-12-estimate-tabs-phase1/postgres-rls-pg16-default.log` |
| `POSTGRES_BIN_DIR=/opt/homebrew/bin bun run prove:estimate-tabs-rls` | 0 | PASS local ephemeral Postgres proof using available PG15 binary; P1-P5 and allow/deny checks green | `.ai/05_logs/2026-06-12-estimate-tabs-phase1/postgres-rls-pg15-local.log` |
| targeted estimate characterization suite | 0 | PASS; 7 files / 126 tests | `.ai/05_logs/2026-06-12-estimate-tabs-phase1/targeted-estimate-characterization.log` |
| targeted perf suite | 0 | PASS; 4 files / 14 tests | `.ai/05_logs/2026-06-12-estimate-tabs-phase1/targeted-perf.log` |
| targeted export regression suite | 0 | PASS; 4 files / 17 tests | `.ai/05_logs/2026-06-12-estimate-tabs-phase1/targeted-export-regression.log` |
| `bun run build` | 0 | PASS; `next-env.d.ts` restored after generated churn | `.ai/05_logs/2026-06-12-estimate-tabs-phase1/build.log` |
| `bun run lint` | 1 | PRE-EXISTING baseline only: 3 errors / 548 warnings, matching Phase 0 count after import cleanup | `.ai/05_logs/2026-06-12-estimate-tabs-phase1/lint-after-import-cleanup.log` |

## Phase 1 RTM audit

Local implementation evidence satisfies the local-code portions of these Phase 1 RTM rows:

- R1.1 — `estimate_tabs` entity + default-tab invariant: static schema test and Postgres proof harness.
- R1.2 — nodes belong to tabs: backfill, NOT NULL, composite FK, same-tab parent validation, and tab-scoped sort constraints.
- R7.3 — `estimate_tabs` RLS mirrors node access: RLS policies/grants plus harness owner/viewer allow/deny checks.
- R10.5 — dormant version stack guarded: migration guard comment and schema-contract test.
- R12.1 — backfill P1-P5 proof block and local harness proof.
- R12.2 — constraint swap safety is locally proven by applying the full migration stack plus reorder/template/validator contracts.
- R12.3 — local-vs-linked boundary is implemented in code comments and run logs; linked apply and regenerated `src/lib/supabase/types.ts` remain owner-gated.

Rows that span later phases stay open: R10.1 tab event labels/UI activity composer work, Phase 2 repository/domain wrappers, and all UI/export/template rows.

## Proof boundary

- **Local-only proven:** migration text, local ephemeral Postgres apply/proof with PG15, schema contract tests, type-check, build, targeted estimate/perf/export regression suites.
- **Provider/manual pending:** linked Supabase apply to project `ebxxqidacheyapmmzavr`, Supabase type regeneration, hosted DB proof, browser/manual estimate editor smoke, hosted export smoke.
- **Not claimed:** production deploy, provider migration state, regenerated remote types, user-visible tabs.

## Next action

Commit Phase 1 local foundation, then proceed to Phase 2 repository/domain tab support behind compatibility wrappers.
