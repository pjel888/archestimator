# 08 — Performance Budgets and Regression Gates

Reconciles and refreshes `.ai/01_roadmap/27-performance-budget-and-regression-gates.md`. That doc still contains useful numeric targets but is **drift-laden** (Postgres/Vercel/Supabase-era language — see PERF-DOC-002). This document restates the budgets as **hypotheses to ratify** during Wave 0 measurement, then defines concrete CI gates.

## Existing targets — ratified, revised, or rejected

| Existing budget (from `27-...md`) | Status | Action |
|---|---|---|
| Public LCP ≤ 2.5 s (Beta) / ≤ 2.0 s (Enterprise) | **RETAIN as hypothesis** | ratify via Wave 0 browser measurement |
| INP ≤ 200 ms | **RETAIN** | ratify via Wave 0 React Profiler |
| CLS ≤ 0.1 | **RETAIN** | ratify via Wave 0 browser |
| Workshop transitions near 200 ms warm, with p95 | **RETAIN** | needs hosted probe; current `staleTimes.dynamic=60/static=180` is documented as measurement-gated |
| Row-edit response around 100-200 ms | **RETAIN** | ratify via Wave 0 React Profiler; PERF-FE-001 should help |
| 500-node tree render under 1 s | **RETAIN** | ratify via Wave 3 scale fixtures |
| 1,000-item library load under 1.5 s | **RETAIN** | ratify via Wave 3 scale fixtures |
| XLSX 100 rows under 3 s and 500 rows under 10 s | **RETAIN** | ratify via Wave 1 (PERF-EXP-001); 3,000-row ceiling also measured |
| Main bundle < 200 KB gzipped (Beta) / < 150 KB (Enterprise) | **RETAIN** | ratify via Wave 0 bundle baseline; existing budget doc claims partial bundle-analyzer evidence — revalidate against current HEAD |
| Total initial JS < 500 KB gzipped | **RETAIN** | same |
| "Vercel Functions have 60s max (Hobby)" | **REJECT — STALE** | runtime is Cloudflare Workers; route duration ceiling enforced via `ARCH_UPLOAD_HOSTED_ROUTE_DURATION_MS=30000` for uploads and 60 s ceiling documented for XLSX export |
| `@supabase/ssr ~50KB acceptable in main bundle` | **REJECT — STALE** | provider exit removed Supabase; verify no remaining Supabase dep ships |
| `security_rate_limit_events Postgres table` | **REJECT — STALE** | D1 table; see `src/lib/security/durable-rate-limit-d1.ts` |
| `pg_trgm, tsvector, GIN` search indexes | **REJECT — STALE** | D1 uses SQLite FTS5 / `LIKE` patterns; not applicable |

## New budgets — derived from this audit's STATIC-CONFIRMED findings

| Budget | Target | Type | Source finding |
|---|---|---|---|
| D1 reads per authenticated workshop request | ≤ 1 on cache hit; ≤ 3 on cache miss | per-request | PERF-AUTH-001 |
| D1 writes per page view (web-vitals) | ≤ 1 batched POST | per-page-view | PERF-OBS-001 |
| D1 statements per restore-replay | ≤ 5 (batched) | per-operation | PERF-D1-001 |
| D1 statements per `reconcileActivityOutbox` pass | ≤ 10 (batched) | per-cron | PERF-D1-002 |
| `cron_run_events` writes per day (no-work baseline) | ≤ 24 (hourly rollup) | per-day | PERF-CRON-001 |
| Worker URL parses per fall-through request | ≤ 3 (consolidated) | per-request | K-11 sub-finding |
| DO `bufferedAmount` per socket | ≤ 64 KB before backpressure | per-socket | PERF-RT-001 |
| GlobalPresence hibernation events/day | > 0 during low-traffic windows | per-day | PERF-CRON-002 |
| Peak RSS during 3,000-row XLSX export | ≤ 1× workbook size | per-export | PERF-EXP-001 |
| Visible virtual rows re-rendered per scroll event | only rows whose `start` actually changed | per-interaction | PERF-FE-001 |
| Public-route initial JS (post-Wave 2 split) | drop vs current baseline | per-route | PERF-FE-002 |

## CI gates — placement recommendations

### Per-PR (deterministic, fast)

| Gate | Command | Stop-changes-on | Trigger |
|---|---|---|---|
| Type-check | `bun run type-check` | any TS error | every PR (after W0-1) |
| Lint | `bun run lint` | any error | every PR |
| Bundle-size | size-limit or bundlewatch on key routes | >5% main-bundle regression vs baseline | every PR (after W4-1) |
| D1 statement count (static) | new repo audit script | any operation exceeding budget (above) | every PR touching `src/lib/**/*repository*.ts` or `*.sql.ts` |
| Static contract validators | `bun run validate:planning-prompts`, `bun run validate:agents` | contract breach | every PR touching contracts |
| D1 batch hard-throw | grep check that new D1 mutation sites include `if (!database.batch) throw` | missing hard-throw | every PR adding a D1 mutation |
| No new `supabaseRoundTrips` or `psql` references | grep | regression | every PR |

### Nightly (slower, statistical)

| Gate | Command | Stop-changes-on | Trigger |
|---|---|---|---|
| D1 runtime proof (synthetic) | `bun run cf:d1-runtime-proof` | budget breach on synthetic surfaces | nightly (after W0-5) |
| Local jsdom peak-load profile | `bun run perf:profile-peak-load` | regression vs baseline | nightly |
| Library baseline | `bun run perf:library-baseline` | regression vs baseline | nightly |
| Vitest dom suite | `bun run test:dom` | any failure | nightly |

### Release / manual evidence (gated)

| Gate | Command | Required-for | Trigger |
|---|---|---|---|
| Hosted route probes | `bun run cf:verify-hosted-performance` | beta/public launch | pre-release |
| Hosted D1 runtime proof (extended) | `cf:d1-runtime-proof` against representative fixtures | beta/public launch | pre-release (W3-1) |
| Bundle treemap | `ANALYZE=true bun run build` | beta/public launch | pre-release |
| Playwright smoke | `bun run test:e2e` | beta/public launch | pre-release |
| Lighthouse | browser-gated manual run | beta/public launch | pre-release |
| React Profiler probe counts | manual browser session | beta/public launch | pre-release (W0-7) |
| 100-connection collab load test | multi-session test rig | beta/public launch | pre-release (W3-3) |

## Notes on the existing `27-...md` doc

- It mixes **Beta / Enterprise MVP / Public Launch** tiers. The Cloudflare migration is complete; the "Vercel Hobby" language is stale. Recommend a single tiered doc structure: **Alpha (now) → Beta → Public Launch**, with each tier's budgets explicit.
- It references a `.github/workflows/ci.yml` `test:e2e:perf` wiring — that wiring does not currently exist (CI archived — PERF-CI-001).
- "Tighten budgets + authenticated perf coverage at public launch" remains the correct deferral; this audit adds the concrete commands and prerequisites to make that actionable.

## What this audit explicitly does NOT promise

- No "bfcache success" claim — needs `pageshow.persisted` browser proof (BLOCKED).
- No "bundle win" claim — needs route-level byte evidence (BLOCKED).
- No "re-render win" claim — needs React Profiler evidence (BLOCKED).
- No hosted-latency claim — needs credentials (BLOCKED).

The Wave 0 plan converts each of these BLOCKED states into measured evidence before any Wave 1-3 change claims improvement.
