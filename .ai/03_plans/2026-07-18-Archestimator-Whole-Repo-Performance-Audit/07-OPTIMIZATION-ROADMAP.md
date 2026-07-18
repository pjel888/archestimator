# 07 — Optimization Roadmap

Waves are ordered by dependency and risk. Each item cites owner type, effort, risk, dependencies, acceptance criteria, rollback, and estimated impact. Existing plan-pack items are referenced by their plan number (e.g. "Plan 021") so this roadmap does not duplicate them.

---

## Wave 0 — Measurement and correctness prerequisites

**Goal**: Establish the baselines without which every later claim is unverifiable. Mostly unblocks hosted-credentialed measurement.

| # | Item | Owner | Effort | Risk | Dependencies | Acceptance | Rollback | Impact |
|---|---|---|---|---|---|---|---|---|
| W0-1 | **Restore CI workflow** (PERF-CI-001 / QW-1) | eng | XS | Low | — | `.github/workflows/ci.yml` exists; PRs trigger it; `gh run list` shows runs | git mv back to `-disabled/` | Restores automated regression protection |
| W0-2 | **`bun run verify` baseline** (existing Plan 001) | eng | S | Low | W0-1 (lint must pass — 12 errors to resolve or override) | `bun run verify` exists and exits 0 | remove script | enables every later refactor's reversal gate |
| W0-3 | **Lint error triage** (12 errors) | eng | S | Low | — | `bun run lint` exit 0 | — | unblocks W0-2 |
| W0-4 | **Bundle baseline** (`ANALYZE=true bun run build`) | eng | S | Low | build gate (user auth) | route-by-route gzip bytes recorded under `artifacts/bundles/` | delete artifacts | enables bundle-budget gates (Wave 4) |
| W0-5 | **D1 runtime proof extended to authenticated surfaces** | eng | M | Low | hosted credentials | `cf:d1-runtime-proof` covers workshop dashboard, estimate open, library page with representative fixtures; query-count budgets realistic | revert script | converts HYPOTHESIS to MEASURED for PERF-AUTH-001, PERF-D1-001 |
| W0-6 | **D1 EXPLAIN campaign** (5-6 candidate queries) | eng | S | Low | hosted credentials | `EXPLAIN QUERY PLAN` artifacts under `artifacts/query-plans/` for the candidate list in `04-BASELINE-METHODOLOGY-AND-RESULTS.md` | delete artifacts | validates index coverage; catches full scans |
| W0-7 | **React Profiler baseline** (5 high-value interactions) | eng | S | Low | browser gate | probe counts + commit durations recorded under `artifacts/profiles/` for typing/scroll/restore/select-all/publish | delete artifacts | converts HYPOTHESIS to MEASURED for PERF-FE-001 |

---

## Wave 1 — Immediate high-confidence quick wins

**Goal**: Low-risk, high-frequency-cost fixes that do not need hosted proof to be obviously correct.

| # | Item | Owner | Effort | Risk | Dependencies | Acceptance | Rollback | Impact |
|---|---|---|---|---|---|---|---|---|
| W1-1 | **Web-vitals `pagehide` leak fix** (QW-6) | eng | XS | Low | — | listener removed in cleanup; grep confirms named function | revert | leak closed |
| W1-2 | **Virtualized row `style` prop** (PERF-FE-001 / QW-3 / existing Plan 022) | eng | S | Low | — | React Profiler shows reduced row renders on parent re-render (W0-7) | revert | fewer row renders on scroll/focus |
| W1-3 | **Restore-replay batch** (PERF-D1-001 / QW-2 / existing Plan 023) | eng | S | Low | — | `EXPLAIN QUERY PLAN` shows index seek; statement count drops 100× | revert | up to 100× D1 read reduction on restore retry |
| W1-4 | **Cron no-op INSERT gate** (PERF-CRON-001 / QW-7) | eng | S | Low | — | `cron_run_events` row count over 24 h with no work drops >80% | revert gate | ~80% write reduction |
| W1-5 | **GlobalPresence broadcastTimer cleanup** (PERF-CRON-002 / QW-4) | eng | S | Low | — | Wrangler tail shows hibernation events between presence bursts | revert | DO duration cost reduction |
| W1-6 | **DO backpressure** (PERF-RT-001 / QW-5) | eng | S | Low | W0 (hosted load test to tune threshold) | slow-consumer test shows clean close code 1013 / silent cursor drop | revert threshold | reliability under slow clients |
| W1-7 | **Web-vitals batching + sampling** (PERF-OBS-001 / HL-1, full) | eng | M | Low | — | Network tab shows 1 POST per page view; `web_vital_events` row count drops ~80-90% over fixed session window | revert | major D1/Worker write reduction |
| W1-8 | **XLSX buffer copy elimination** (PERF-EXP-001 phase 1) | eng | S | Low | — | Peak RSS during 3,000-row export drops ~50% (W0 measurement) | revert | memory ceiling relief |
| W1-9 | **`reconcileActivityOutbox` batch** (PERF-D1-002 / HL-6) | eng | M | Low | — | D1 statement count per daily pass drops from ~1500 to <10 | revert | daily cron wall-time reduction |

---

## Wave 2 — Critical user-flow performance

**Goal**: Highest-value UX flows (auth, navigation, publication).

| # | Item | Owner | Effort | Risk | Dependencies | Acceptance | Rollback | Impact |
|---|---|---|---|---|---|---|---|---|
| W2-1 | **Session cookie cache re-enabled** (PERF-AUTH-001 / HL-2) | eng | M | Medium | commit archaeology to confirm original disable reason; W0-5 to measure | authenticated request D1 reads drop to 0-1 cache hit; revocation test passes | `disableCookieCache: true` restored | 50-70% D1 read reduction on workshop requests |
| W2-2 | **Async recipient emails** (existing Plan 021 / PERF-PUB-001 / HL-4) | eng | M | Medium | — | publication request returns <500 ms regardless of recipient count; queue depth observable | revert to inline await | UX + reliability; partial-commit risk eliminated |
| W2-3 | **Split AppProviders** (PERF-FE-002 / HL-3) | eng | M | Medium | W0-4 bundle baseline; characterization test for provider relocation | `/`, `/share/[token]`, `/auth/*` bundle bytes drop (magnitude per W0-4) | restore single AppProviders | smaller public bundle |
| W2-4 | **Remove `RealtimeAuthBridge`** (K-06) | eng | XS | Low | W2-3 (or standalone) | grep shows no callers; bundle bytes drop slightly | git revert | dead transitional code removed |

---

## Wave 3 — D1, realtime, queue, and scale architecture

**Goal**: Address the new linked-Template surface and prepare for beta scale.

| # | Item | Owner | Effort | Risk | Dependencies | Acceptance | Rollback | Impact |
|---|---|---|---|---|---|---|---|---|
| W3-1 | **Representative D1 fixtures** (Small/Medium/Large tiers from §7) | eng | M | Low | — | fixtures cover 5/20/50 projects × scaling estimates/rows/nodes/library/instances/collaborators | delete fixtures | enables hosted scale proof |
| W3-2 | **Linked Template fanout hosted proof** (K-10) | eng | M | Low | W3-1; hosted credentials | propagation convergence time + D1 write count + memory at 50/500 linked instances measured | delete artifacts | validates migration 0092 design at scale |
| W3-3 | **Collaboration room hosted ceiling proof** (K-12) | eng | M | Medium | hosted credentials; multi-session test rig | 100-connection room with 30 fps cursor traffic measured; slow-client behavior under W1-6 backpressure validated | — | validates capacity contract |
| W3-4 | **Upload-job queue: wire cron through queue** (or document the bypass) | eng | S | Low | — | either cron enqueues real messages OR code comment documents why cron bypasses (current state) | revert | clarity; corrects K-11 sub-finding |
| W3-5 | **Client Portal notification DLQ reconciliation** | eng | S | Low | — | in-code `state='dead'` and Wrangler DLQ no longer both trip at attempt 10; documented single dead-letter channel | revert | clearer retry semantics |
| W3-6 | **`max_concurrency` explicit on both queue consumers** | eng | XS | Low | — | wrangler.jsonc sets `max_concurrency` to a deliberate value | revert to unset | predictable queue throughput |

---

## Wave 4 — Build, CI, observability, and cost controls

**Goal**: Regression gates, cost controls, drift cleanup.

| # | Item | Owner | Effort | Risk | Dependencies | Acceptance | Rollback | Impact |
|---|---|---|---|---|---|---|---|---|
| W4-1 | **Bundle-size regression gate** (size-limit or bundlewatch) | eng | S | Low | W0-1, W0-4 | CI fails on >5% main-bundle regression vs baseline | disable gate | prevents bundle regressions |
| W4-2 | **D1 query-count gate** on critical operations | eng | M | Low | W0-5 | CI fails if workshop dashboard / estimate open exceeds query budget | disable gate | prevents D1 read regressions |
| W4-3 | **Replace Supabase/Postgres perf scripts** (PERF-DOC-001) | eng | M | Low | — | `perf:collect-live-evidence` uses `wrangler d1 execute`; `supabaseRoundTrips` renamed | restore legacy | agents run correct commands |
| W4-4 | **Sweep budget doc for provider-era language** (PERF-DOC-002) | eng | S | Low | — | grep returns zero hits for Vercel/Supabase/Postgres in budget doc | git revert | consistent guidance |
| W4-5 | **Tighten `head_sampling_rate`** | eng | XS | Low | hosted traffic data | rate set to 0.1 at public launch; documented in budget doc | restore 1 | Workers log cost reduction at scale |
| W4-6 | **Pre-commit scoped gate** (existing Plan 017) | eng | S | Low | — | `.husky/pre-commit` runs `lint-staged` with type-check + lint + react-doctor on changed files only | remove hook | faster dev feedback |
| W4-7 | **XLSX ZIP compression** (PERF-EXP-001 phase 2) | eng | M | Medium | Workers-compatible DEFLATE validation | payload size drops; peak RSS unchanged or better | revert to STORE | smaller exports |

---

## Deferred — Not justified yet

| Item | Why deferred |
|---|---|
| God component decomposition (existing Plan 026) | L effort, MED-HIGH risk; pursue only if Wave 1-2 doesn't resolve estimate-editor hot-path concerns. Characterization test prerequisite. |
| `workspace-repository.ts` split (existing Plan 025) | L effort, no measured perf issue; pure maintainability. Defer until Plan 026 lands. |
| Action error consolidation (existing Plan 024) | L effort, no measured perf issue. |
| `@firecms/neat` patch removal (existing Plan 027) | M effort, no measured bundle impact yet. Verify with W0-4 baseline. |
| Realtime row-update broadcast wiring (PERF-FE-003) | L effort, product-not-required-yet. Delete the dead hook now if cleanup is preferred. |
| AEC classification, cost intelligence, library bulk-import, proposal reconciliation (existing Plans 028-033) | Direction spikes; not perf. |
| README CI section rewrite | Auto-resolves once W0-1 lands. |

---

## Dependency graph (simplified)

```
W0-1 (CI) ──┬── W0-2 (verify) ──┬── Wave 2 refactors
            │                   └── Wave 4 refactors
            ├── W0-3 (lint)     (independent quick wins in Wave 1 don't need this)
            ├── W0-4 (bundle) ─── W2-3 (AppProviders split) ─── W4-1 (bundle gate)
            ├── W0-5 (D1 proof) ─ W0-6 (EXPLAIN) ── W3-1 (fixtures) ── W3-2 (linked-template proof)
            │                  └─ W2-1 (session cache measure)
            └── W0-7 (React profiler) ── W1-2 (style prop verify)
```
