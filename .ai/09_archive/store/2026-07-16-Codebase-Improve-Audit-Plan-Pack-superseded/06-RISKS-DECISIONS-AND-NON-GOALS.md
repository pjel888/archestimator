# 06 — Risks, Decisions, and Non-Goals

## Decisions (DEC-AUTO-*)

- **DEC-AUTO-001 — Comprehensive scope over lean default.** The plan-pack skill and `Creating-Plan-Prompt.md` default to the smallest executable pack. The owner directed comprehensive coverage of ALL findings with blast-radius/simulations/perf studies. Owner instruction wins; schema + validation preserved; content kept substantive. `affected_ids`: the pack (all requirements).
- **DEC-AUTO-002 — PLAN_ONLY posture.** No code, tests, builds, browser, or deployments ran. Every unit is PLANNED; the pack is NOT_READY until an executor picks a dependency-closed slice and the lead marks it READY. `affected_ids`: all units.
- **DEC-AUTO-003 — Placement.** Pack lives at `.ai/03_plans/2026-07-16/Codebase-Improve-Audit-Plan-Pack/` (repo convention), not the `/improve` skill's default root `plans/`. Owner-directed. `affected_ids`: the pack.

## Risks (RISK-*)

| ID | Risk | Units | Status | Mitigation |
|----|------|-------|--------|------------|
| RISK-001 | A migration edit is subtly wrong and blocks or corrupts the hosted D1 apply | UNIT-001 | OPEN | Fail-closed assertion triggers already guard data; unit requires shadow-D1 apply + seeded-orphan/NULL tests before hosted apply. Hosted apply is an external-action boundary (§Boundaries). |
| RISK-002 | Estimate god-module split regresses the money/write path | UNIT-014 | OPEN | Characterization tests MUST precede any extraction; move only already-pure helpers first; `impact` the moved symbols. |
| RISK-003 | Staging characterization test is flaky or stalls against hosted D1 | UNIT-015 | OPEN | Tag out of default gate; run pre-beta only; assert bounded enumeration + restart-survival, not perf. |
| RISK-004 | Reference-tracking table drifts from the consuming tables → orphaned or premature purges | UNIT-016 | OPEN | Trigger-maintained; cleanup job's final `NOT (referencePredicate)` re-check is the storage backstop; parity test vs `json_tree` on a fixture. |

## External-action boundaries (AUTH — recorded, not currently active)

The manifest carries `authorization_boundaries: []` because no external action is *currently* in progress. The following become **active boundaries** when an executor reaches them (status would flip to ACTIVE, `release_status` to BOUNDARY):

- **AUTH-B1 — Hosted D1 migration apply (UNIT-001).** Applying edited migrations to hosted `ARCH_DB` is `EXTERNAL_ACTIONS`, beyond the `IMPLEMENT_LOCAL` ceiling. Requires the owner's deploy window. Safe prerequisites completed locally first (edited files + shadow-D1 proof).
- **AUTH-B2 — Hosted/staging characterization run (UNIT-015).** Running the lockout characterization against staging D1 is an external surface. Requires owner authorization; tagged out of default test gate.

No other unit requires an external action; all others are local edits under the standing `wrangler.jsonc`-bound authorization.

## Non-goals

- Re-implementing the publication bearer-link model, D1 RLS (none exists), or the dev-auth-bypass gate — accepted tradeoffs (`05`).
- Re-litigating the 30-odd already-documented publisher/proposals findings (`.ai/04_tasks/2026-07-16-publisher-audit-deferred-*.md`).
- The CSP nonce pipeline — by-design P11 deferral; no unit unless the owner asks.
- Broad test/build/browser execution — user-gated; units use `TEST_PROPOSAL` (names a risk + exact command, does not execute).
- Mutating legacy `supabase/migrations/` or the unrelated Cloudflare `archestimator` project — out of authorization (`AGENTS.md`).

## Assumptions

- Hosted `ARCH_DB` may contain historical NULL `actor_user_id` rows and/or unrelated FK orphans (unverifiable without data access) — UNIT-001 treats both defensively regardless.
- The cleanup job's final reference re-check (`cleanup-job.ts:469-498`) remains the storage-side backstop through UNIT-007/016.
- The repo's user-test gate remains in force; executors must not run test suites/builds as gates without explicit per-task authorization.
