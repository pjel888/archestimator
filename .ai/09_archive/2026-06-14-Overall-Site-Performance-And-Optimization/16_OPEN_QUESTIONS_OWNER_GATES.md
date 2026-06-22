# 16 — Open Questions & Owner Gates

**Date:** 2026-06-14  ·  **Status:** AUDIT / PLANNING / READINESS ONLY

These are decisions **only Philip (owner) can make**. Each blocks a specific downstream action;
none blocks *entry* into closed beta, but several block *public-launch readiness claims*. A perf
agent may **recommend** across any of these but may **not** unilaterally cross them.

---

## G1 — RUM / Speed-Insights wiring approval ⛔ master unblock

`@vercel/speed-insights` is absent from `package.json` and `node_modules`; no `SpeedInsights`
mount in `src`; only `@vercel/analytics` (Web Analytics, with share-link redaction) ships. **It
was removed once as a security remediation** (markers/tokens in HTML).
**Question:** Re-add a redaction-equipped Speed Insights beacon (re-checking the original finding
AND reusing the `@vercel/analytics` redaction so `/share`, `/invite`, `/workshop` tokens are never
beaconed), or adopt an alternative field sink?
**Blocks:** every field-readiness claim; the readiness checker's core-vitals gate. (AS01/GOV02/TG03)

## G2 — Authed storage-state for benchmarking

There is no safe authed Playwright `storageState` available; dev-auth bypass is disabled.
**Question:** Provide a safely-captured, git-ignored `.auth/user.json` (or approve a throwaway
beta auth user) so authed `perf:measure-routes`, e2e perf, and Lighthouse can run against
`next build` + `next start` on the heavy routes.
**Blocks:** all authed/heavy-route synthetic measurement → P0 cannot complete for authed surfaces. (TG10/TG07/INV08)

## G3 — Readiness scorecard adoption

The only published budgets are loose smoke tripwires.
**Question:** Adopt the 2026-06-05 doc 17 acceptance criteria (+ this pack's
`11_SPEED_MATRIX_TARGETS_AND_BUDGETS.md` CLOSED-BETA tier) as the *authoritative* readiness
scorecard, keeping the existing JSON as renamed smoke budgets?
**Blocks:** any defensible "ready" claim. (TG01/GOV08)

## G4 — Charts RPC apply-to-hosted

`get_project_chart_buckets` (WITH RECURSIVE, SECURITY INVOKER) is fixed locally, **NOT on
hosted**, and verified-unwired in `src` (comment-only at `project-charts-repository.ts:117`).
**Question:** Owner-supervised apply to `ebxxqidacheyapmmzavr` with a deploy probe before wiring;
any clean-apply deploy must verify the corrected version is present.
**Blocks:** wiring the charts aggregation RPC; safe charts deploys. (GOV05/DB02/RLS09)

## G5 — Hosted DB index + RLS-wrap applies

The dedicated FK/composite-index plan is audit-only; `is_platform_admin()` and ~152–182 policy
sites use bare `auth.uid()`.
**Question:** Authorize, in a maintenance window only, plan-authored index migrations + remaining
`auth.uid()` wraps — gated by P0 read-only introspection, before/after `EXPLAIN`,
`prove-rls-initplan` access-decision parity, and `CREATE INDEX CONCURRENTLY`. `token_hash` index
drops + `pg_cron` retention stay human-DBA + window only.
**Blocks:** all DB latency-at-scale improvement + proof. (RLS04/RLS06/DB03/GOV03/GOV10)

## G6 — Irreversible / infra gates (hard do-not-cross)

PITR is disabled, Redis is absent, and the estimate-tree unification P5/P6/P7 (irreversible
single-node migration) is not executed — by decision.
**Question:** These remain owner-window-only. A perf finding may recommend but may **not** enable
PITR/Redis or apply the irreversible migration. Confirm they stay closed for closed beta.
**Blocks:** nothing for beta; explicitly fences off expensive/irreversible moves. (GOV06)

## G7 — CI enable decision

`.github/workflows/ci.yml` exists but perf-smoke is decision-gated off (and the job's last green
is not in recent history).
**Question:** Re-enable a lean `validate` + stabilized perf-smoke against a production build
(after fixing the job's env/Supabase/Playwright setup), keeping CD off?
**Blocks:** automated regression protection. (TG05/GOV06)

## G8 — Do-not-touch surfaces under active/archived plans

The route-transition plan owns proxy/auth/loading-error/prefetch/code-splitting; the four
2026-06-14 surface plans (estimates-list, library, charts, teamspace) are DONE;
`EstimateSheetContent` virtualization / `useDeferredValue` / `useOptimistic` are **REJECTED**
(profiler-backed).
**Question:** Confirm none may be re-implemented from stale docs, and any new perf work touching
them updates the owning plan's matrix rather than duplicating it.
**Blocks:** prevents negative-value churn. (GOV01/GOV04/GOV12)

---

## Decision log (to be filled by owner)

| Gate | Decision | Date | Notes |
|------|----------|------|-------|
| G1 RUM wiring | _pending_ | | |
| G2 authed storage-state | _pending_ | | |
| G3 readiness scorecard | _pending_ | | |
| G4 charts RPC apply | _pending_ | | |
| G5 DB index/RLS applies | _pending_ | | |
| G6 irreversible/infra | _pending_ | | |
| G7 CI enable | _pending_ | | |
| G8 do-not-touch | _pending_ | | |
