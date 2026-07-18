# 09 — Documentation and Tooling Drift

Register of stale claims found during this audit. Severity classification: **harmless** (factually wrong but no agent/run impact), **misleading** (agents or operators may waste time or hallucinate), **operationally dangerous** (could mask a real bug or cause incorrect evidence).

| ID | Item | Location | Drift type | Severity | Recommended minimum correction (do not edit during this audit) |
|---|---|---|---|---|---|
| DRIFT-01 | `.github/workflows/ci.yml` does not exist | `README.md:380-385` claims active CI workflow at this path; actual workflows in `.github/workflows-disabled/` | provider/process drift | **OPERATIONALLY DANGEROUS** — agents follow the README, run CI scripts expecting gates, may claim hosted CI protection that does not exist | Either restore workflow (PERF-CI-001) OR rewrite README to "CI archived; local validation via `bun run validate` only" |
| DRIFT-02 | `scripts/collect-live-db-performance-evidence.ts` documents `supabase db query --linked` and `psql` modes | `:1-30` header | provider-era | **MISLEADING** — `bun run perf:collect-live-evidence` runs commands that fail on D1; agents may hallucinate Postgres evidence | Replace with `wrangler d1 execute` modes (PERF-DOC-001) |
| DRIFT-03 | `supabaseRoundTrips` field name in perf trace | `scripts/measure-workshop-dashboard-query-count.ts` (and emitters/consumers of the trace event) | provider-era | **MISLEADING** — field name implies Supabase is still the DB | Rename to `d1RoundTrips` or `databaseRoundTrips` |
| DRIFT-04 | "Vercel Functions have 60s max (Hobby)" | `.ai/01_roadmap/27-performance-budget-and-regression-gates.md:25` | provider-era | **MISLEADING** — runtime is Cloudflare Workers; timeout semantics differ | Replace with Workers CPU/wall-clock limits |
| DRIFT-05 | `@supabase/ssr ~50KB acceptable in main bundle` | `27-...md:183` | provider-era | **MISLEADING** — Supabase should not ship post-exit | Verify with bundle baseline (W0-4); remove the row |
| DRIFT-06 | `security_rate_limit_events Postgres table` | `27-...md:226` | provider-era | **MISLEADING** — D1 table at `src/lib/security/durable-rate-limit-d1.ts` | Replace "Postgres" with "D1" |
| DRIFT-07 | `pg_trgm, tsvector, GIN` search indexes | `27-...md:239` | provider-era | **MISLEADING** — D1 is SQLite; uses FTS5 / LIKE | Rewrite to SQLite/D1 equivalents |
| DRIFT-08 | "Originally-cited `.ai/03_plans/route-transition-performance-optimization/CURRENT_CANONICAL_PLAN.md` no longer exists" | `27-...md:6` (the doc itself flags the drift) | path drift | **HARMLESS** — already noted in-place; preserved as audit trail | Optionally collapse to one-line note |
| DRIFT-09 | `GitNexus: 22,921 symbols, 55,116 relationships` | `README.md:398` | stat drift | **HARMLESS** — AGENTS.md says 29,417 symbols / 71,122 relationships / 300 flows (more recent) | Update stat or remove |
| DRIFT-10 | Existing budget doc references the route-transition plan's "Phase 0 baseline required" | `27-...md:11-12` | process drift | **HARMLESS** — guidance remains correct | Optional cleanup |
| DRIFT-11 | `.ai/03_plans/2026-07-18-Codebase-Improve-Audit-Plan-Pack` README claims "Audit/planning only — nothing was implemented" | `README.md` of that pack | status drift | **HARMLESS** — accurate at authoring; still accurate at HEAD per reconciliation in `01-EXISTING-AUDIT-RECONCILIATION.md` | No change |
| DRIFT-12 | 12 eslint errors fail `bun run lint` (exit 1) | see `artifacts/raw/lint-errors.txt` (not written — captured in chat) | code drift | **MISLEADING** — `bun run validate` cannot pass until lint passes; `27-...md` regression gate #5 ("type-check must pass") is moot | Resolve the 12 errors (or document accepted warnings); add a unit test to keep lint at exit 0 |
| DRIFT-13 | `.open-next/` artifacts are 6 days stale (Jul 12) | `.open-next/worker.js` mtime | build drift | **MISLEADING** — bundle-size claims derived from these artifacts would not reflect current HEAD | Regenerate via `bun run cf:build` (W0) |
| DRIFT-14 | `GitNexus: 300 execution flows` claim | `AGENTS.md` (gitnexus block) | stat drift | **HARMLESS** — matches current index | No change |
| DRIFT-15 | `RealtimeAuthBridge` "Kept as a provider-level mount while realtime moves to Cloudflare Durable Objects" | `src/components/realtime-auth-bridge.tsx:3-7` | transitional-state drift | **HARMLEESS** — comment is honest, but the migration is done (DOs are in production) and the file returns null | Remove the file (W2-4) |
| DRIFT-16 | `package.json` lists `exceljs: ^4.4.0` as a dependency | `package.json:151` | dep drift | **HARMLESS** — dep is installed but unused; XLSX export uses custom OOXML writer | Verify with bundle baseline; remove if truly unused (W4) |
| DRIFT-17 | `package.json` lists `@supabase/ssr` referenced by budget doc | not in package.json (removed) but still in budget doc | cross-doc drift | covered by DRIFT-05 | covered by DRIFT-05 |
| DRIFT-18 | `migrations/0056-0092` (squashed slots) — README and current-state may cite old counts | various | stat drift | **HARMLESS** — count drift in `27-...md` | Optional |
| DRIFT-19 | `tsconfig.tsbuildinfo` (1.5 MB) tracked | `tsconfig.tsbuildinfo` at repo root | generated artifact committed | **HARMLESS** — small, helps warm type-check | Verify .gitignore intent |
| DRIFT-20 | `save-design-full.png` (4.5 MB), `v10-*.png` (1+ MB each), `intercom-hero.png` committed at repo root | repo root | design artifacts at root | **HARMLESS** — not runtime | Optional: move to `docs/design/` |
| DRIFT-21 | `vercel.json` (268 B) committed at repo root | `vercel.json` | provider-era | **HARMLESS** — small; legacy | Optional: delete post-launch |
| DRIFT-22 | Stray empty file `=` at repo root | `=` (0 bytes) | junk | **HARMLESS** | Optional: `git rm =` |
| DRIFT-23 | `enable-leaked-password-protection.sh` shell script at repo root | `enable-leaked-password-protection.sh` | operational tooling | **HARMLESS** | No change |

## Severity summary

- **Operationally dangerous**: 1 (DRIFT-01 — CI claims).
- **Misleading**: 6 (DRIFT-02, 03, 04, 05, 06, 07, 12, 13).
- **Harmless**: 14 (the rest).

## Recommended cleanup ordering

1. **DRIFT-01** (CI) — fix in Wave 0 (PERF-CI-001).
2. **DRIFT-12** (lint) — fix in Wave 0 (W0-3).
3. **DRIFT-02, 03** (provider-era perf scripts) — fix in Wave 4 (PERF-DOC-001).
4. **DRIFT-04, 05, 06, 07** (budget doc) — fix in Wave 4 (PERF-DOC-002).
5. **DRIFT-13** (stale `.open-next/`) — regenerated in Wave 0 (W0-4).
6. **DRIFT-15** (RealtimeAuthBridge) — fix in Wave 2 (W2-4).
7. Remaining harmless items — opportunistic.

This audit did not edit any of these. Each is flagged for the implementation waves.
