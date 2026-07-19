# 04 — Baseline Methodology and Results

## Methodology

This audit is **read-only** per AGENTS.md. Live runtime/browser/hosted measurements require user authorization gates (browser gate, build gate, test authorization gate, hosted-credentials gate). Where evidence is BLOCKED, the methodology names the exact command and the decision it would unlock — see `10-BLOCKED-EVIDENCE-AND-AUTHORIZATION-NEEDED.md`.

Evidence states used: **MEASURED**, **STATIC-CONFIRMED**, **HYPOTHESIS**, **BLOCKED**, **REJECTED**, **STALE** (defined in `05-FINDINGS-REGISTER.md`).

## Build and dependency baseline

### MEASURED (local, current HEAD)

| Metric | Value | Notes |
|---|---|---|
| `bun run type-check` (tsc --noEmit, 4 GB heap) wall time | **11.7s** | warm with `tsconfig.tsbuildinfo` (1.5 MB); cold would be longer |
| `bun run type-check` exit | 0 | clean |
| `bun run lint` (eslint) wall time | **63.2s** | full repo scan |
| `bun run lint` exit | **1 (non-zero)** | 12 errors, 139 warnings — see `09-DOCUMENTATION-AND-TOOLING-DRIFT.md` |
| Tracked files (`git ls-files \| wc -l`) | 12,621 | |
| Migrations (`migrations/*.sql`) | 84 | 0056–0092 active span |
| Scripts (`scripts/*.{ts,mjs}`) | 126 | 66 are Cloudflare proof generators |
| App Router files (`page/route/layout/loading/error/not-found`) | 168 | 69 pages, 59 routes |
| `"use client"` files | 322 | |
| `"server-only"` files | 114 | |
| `"use server"` files | 54 | |
| Stale `.open-next/` artifacts | Jul 12 | 6 days stale vs HEAD |

### BLOCKED (user-gated)

| Metric | Blocker | Unlock command |
|---|---|---|
| Clean install time (`bun install --frozen-lockfile`) | not run; not material to audit | `bun install --frozen-lockfile` |
| Production build time + peak memory | build gate (AGENTS.md) | `/usr/bin/time -v bun run build` |
| OpenNext Cloudflare build time + output sizes | build gate | `/usr/bin/time -v bun run cf:build` |
| Worker bundle size and module count | build gate | inspect `.open-next/worker.js` after `cf:build` |
| Bundle treemap (route-by-route) | build gate + analyzer | `ANALYZE=true bunx next build --webpack` then open treemap |
| Largest client chunks / dependency attribution | build gate | inspect `.next/static/chunks/**` after build |
| `@next/bundle-analyzer` requires Webpack | confirmed by existing budget doc; verify for Next 16.2 | same as above |

## Browser and route baseline

**Entirely BLOCKED for this audit** — requires browser authorization gate.

Required scenarios (per prompt §6) and the gate that blocks each:

| Surface | Scenario | Blocked by |
|---|---|---|
| Public marketing | `/`, pricing, features, cold/warm/internal nav | browser gate |
| Authentication | login, signup, OAuth callback, signed-out redirect | browser gate |
| Workshop shell | homebase, sidebar, notification mount, route overlay, bfcache | browser gate + auth |
| Estimates | list, create/open, many estimates | browser gate + auth |
| Estimate editor | cold/warm open, tree, edit, rapid typing, selection, multi-row, insert/move/restore/delete, scroll, realtime | browser gate + auth |
| Component library | overview, Components, Templates, filter, bulk-scale | browser gate + auth |
| Linked Templates | create version, insert, propagate, large fanout, retry, detach | browser gate + auth + cron |
| Charts/data | initial, lazy import, large data, route away/back | browser gate + auth |
| Shared proposal / client portal | first view, password gate, comments, decisions, invalid token | browser gate |
| Export | single/all tabs, 100/500/3000 rows, concurrent | browser gate + auth |
| Admin / observability | dashboard, large events, aggregates | browser gate + admin auth |
| Realtime | 1/10/50/100 connections, cursor, presence churn, slow client, reconnect | browser gate + multi-session |
| Queues/Cron | normal/retry/DLQ/lease/backlog/co-scheduling | hosted credentials |
| Uploads/images | small/limit, direct, scan, transform, concurrent | browser gate + auth |

The existing repo has scripts for some of these (`scripts/measure-route-transitions.ts`, `scripts/verify-cloudflare-hosted-performance.ts`, `scripts/verify-cloudflare-d1-runtime-performance-proof.ts`, `e2e/route-transition-performance.spec.ts`). All require either browser automation, hosted credentials, or both — all user-gated.

For each BLOCKED baseline, the lead provides the **exact command** in `10-BLOCKED-EVIDENCE-AND-AUTHORIZATION-NEEDED.md`.

## React interaction baseline

**Entirely BLOCKED** — browser gate. Specific high-value interactions to measure once authorized (priority order):

1. **Rapid typing in a cell** → count `reportEstimateRowItemRender` probe fires; measure React Profiler commit duration; verify ancestor-branch re-render cascade from `editable-row-store.ts:172-200` node-total walk.
2. **Scroll while virtualized** → measure FPS; verify `style` prop identity churn at `row-table.tsx:1309-1315`; count row renders with probe.
3. **Restore after delete (cold and idempotent replay)** → measure end-to-end latency; verify the N-`readRowById` cost at `rows.ts:3187-3191` (server-side via `cf:d1-runtime-proof` extended).
4. **Multi-row select-all + bulk delete** → measure comparator walk cost at `branch.tsx:184-200` and `row-table.tsx:150-154`.
5. **Publication with 50 recipients** → measure request latency; verify email loop at `publication/actions.ts:1552,1586`.

## D1 baseline

### STATIC-CONFIRMED query shapes (read from source)

Per-operation D1 statement counts (conservative — one `.prepare(...).first|.all|.run` or one element of `database.batch([...])` counts as one execution). Full detail in `artifacts/raw/d1-schema-intents-map.md`.

| Operation | File:function | Est. statements | Notes |
|---|---|---|---|
| Authenticated workshop request (session+beta+profile) | `auth/better-auth-cloudflare.ts:317-319`, `auth/session.ts:65-77` | 3 | `disableCookieCache: true` forces session lookup |
| Insert estimate row | `rows.ts:1904 insertEstimateRowItemWithHistory` | ~13-16 | 6 pre-batch + 6-9 batch + 1 post |
| Update (patch) estimate row | `rows.ts:2496` → `patchEstimateRowItem :2252` | ~13-20+ | grows with component fanout |
| Delete estimate row (single) | `rows.ts:2533` | ~12 | |
| Bulk delete rows | `rows.ts:2643` | ~11 | **more efficient per row than N singles** |
| Move/reorder rows | `rows.ts:2760` | ~11 + N | one UPDATE per moved row |
| Restore deleted rows (fresh) | `rows.ts:3104` | ~15 | correct batched pattern |
| Restore deleted rows (replay) | `rows.ts:3187-3191` | ~5 + up to 100 | **N+1 — PERF-D1-001** |
| Create estimate node | `nodes.ts:375` | ~10-11 | |
| Estimate cold open (tab tree) | `estimate-tree-read-repository.ts:734` | **~6** | 4 reads + 2 RBAC |
| Subtree lazy expand | `estimate-tree-read-repository.ts:823` | ~D + 3 | per depth level |
| Publication create | `publication/actions.ts:876` → `admin-d1-client.ts:522` | ~8 (no retry) to ~21 (with retries) | source-revision retries ×3 |
| Add shared-link recipients (N) | `publication/actions.ts:1453` | 1 + 2N | bounded-concurrency 4, NOT batched — **PERF-PUB-001** |
| Library list (full) | `component-library-repository.ts:1289` | min 8; scales `ceil(item_count/1000)` | **PERF-D1-003** — no covering index |
| Library list (lite / sidebar) | `getCurrentWorkspaceComponentLibraryLite :2395` | ~6 | |
| Project dashboard (workshop render) | `workspace-repository.ts:2165` | **~18-22** | matches `perf:dashboard-query-count` target |
| Linked Template propagation — single job (success) | `template-propagation-d1.ts:297` | ~19-21 per instance | |
| Linked Template propagation — single job (failure) | `:659` | ~3 | |
| Linked Template propagation — per cron tick | `:720` | 1 + K × (1 + ~20 success or 3 failure); default K=25 → ~526; worst K=100 → ~2,101 | batched per-job |
| Linked Template Template-mutation fanout | `template-linked-mutation-d1.ts:13` | exactly 6 + K rows by statement 5 | set-based, not per-instance |
| `reconcileActivityOutbox` daily pass | `activity-outbox.ts:105-157` | up to 1,500 (500 × 3) | **N+1 — PERF-D1-002** |
| 5-min drain cron | `worker.ts:205-237` | ≥4 even on no-op | **PERF-CRON-001** |
| Web-vitals write | `observability-repository.ts:198-237` | 1 INSERT per POST | **PERF-OBS-001** |

### BLOCKED (hosted credentials + representative data)

- `EXPLAIN QUERY PLAN` against hosted D1 for the 5-10 candidate queries — see PERF-D1 candidate list below.
- Real query latency p50/p95/p99 — needs hosted probe with representative cardinality.
- Real D1 subrequest count per route — needs Worker tail with `cf:d1-runtime-proof` extended to authenticated surfaces.

### D1 EXPLAIN candidates (read-shape inventory, not yet proof)

Candidates for hosted `EXPLAIN QUERY PLAN` once authorized (full detail in `artifacts/raw/d1-schema-intents-map.md`):

1. **Library full-load paginated scan** — `component-library-repository.ts:561-575`. `ORDER BY category, name` with no covering index. **PERF-D1-003.**
2. **Component-source guard with 15+ `json_extract` correlations** — `template-propagation-d1.ts:472-502`. Nested `json_each` over 3 tables. **PERF-D1-004.**
3. **`MAX(sort_order)` correlated per node** — `rows.ts:1950-1954`, `nodes.ts:413-423`. Index lacks `sort_order`.
4. **`json_each` IN-lists against instance mapping tables** — `rows.ts:1803-1816`. Issued on every bulk delete.
5. **Template-link projection 4-CTE with window functions** — `estimate-tree-read-repository.ts:336-385`. SQLite materializes.
6. **Activity history search with 8 `json_extract ... LIKE` OR'd** — `history-events.ts:270-288`. JSON scan over unbounded table.
7. **Dashboard IN-with-EXISTS access probes** — `workspace-repository.ts:2467-2493, 1312-1345`. 3 correlated EXISTS per candidate.
8. **`group_concat` over all active instances in mutation guard** — `template-linked-mutation-d1.ts:25-46`. O(instances/template) per mutation.
9. **Restore-replay batched re-read** — `rows.ts:3283`. Should hit `idx_estimate_row_items_*`.
10. **`reconcileActivityOutbox` SELECT + UPDATE** — `activity-outbox.ts:127,136,146`. (Will be eliminated by PERF-D1-002 fix.)
11. **`MAX(updated_at) ... IN (placeholders)` optimistic-concurrency guards** — `templates.ts:704-714`, `actions.ts:2178-2180,2389`.
12. **`reconcileTemplatePropagationJobs` lease-token claim UPDATE** — `template-propagation-d1.ts:744-751`.

### HYPOTHESIS — D1 proof scope (K-09)

The existing `cf:d1-runtime-proof` (`scripts/verify-cloudflare-d1-runtime-performance-proof.ts`, `scripts/generate-cloudflare-d1-performance-proof.ts`) uses synthetic proof tables (`workspaces`, `projects`, `estimates`, `estimate_rows`, `library_components`) with seeding formulas like `100000 + (i * 12500)`. It tests 5 surfaces (workspace_homebase_summary, project_estimate_list_summaries, library_overview_summary, can_edit_project, estimate_row_mutation) with broad 500-600 ms budgets. **This proves provider plumbing, not real Archestimator query plans, indexes, payload sizes, or cardinality.** Designing representative app-query benchmarks (using actual table shapes from migrations 0056-0092 with realistic row counts from the scale matrix) is a Wave 0 prerequisite.

## Cost baseline

### STATIC-CONFIRMED Cloudflare cost surfaces (configuration-derived)

| Surface | Setting | Implication |
|---|---|---|
| Worker requests | Every authenticated request + every web-vitals POST + every cron invocation + every WS upgrade | Driven by `disableCookieCache` (PERF-AUTH-001), web-vitals amplification (PERF-OBS-001) |
| Worker CPU | Pre-routing chain ~6 URL parses + OpenNext + middleware | per request |
| D1 reads | 3 per authenticated request + telemetry writes + cron ledger + propagation | amplify via PERF-OBS-001, PERF-CRON-001 |
| D1 writes | web-vitals + cron_run_events + mutation outbox | amplify via PERF-OBS-001, PERF-CRON-001 |
| Durable Object duration | GlobalPresence never hibernates (PERF-CRON-002); CollaborationRoom and SupportInbox hibernate correctly | singleton billing concern |
| DO WebSocket messages | Collab room up to 2,970 outbound/s/room theoretical | uncapped backpressure (PERF-RT-001) |
| Queue operations | `CLIENT_PORTAL_NOTIFICATIONS_QUEUE` ~100 messages per 5-min cron (when work exists); `UPLOAD_JOBS_QUEUE` largely idle | modest |
| R2 storage + operations | Upload + scan + cleanup; `removeObjects` is N single-key deletes chunked to 100 | modest |
| Images transformations | Cloudflare Images binding | unmeasured |
| Email sends | Recipient invitations (inline today, PERF-PUB-001) | modest at alpha scale |
| Observability logs | `head_sampling_rate=1`, `persist=true`, `invocation_logs=true` | full log volume |
| Build minutes | CI disabled (PERF-CI-001) — currently $0 | will incur once restored |

### BLOCKED — account data

- Actual Cloudflare billing data — credentials gate.
- Real traffic volumes — production observability gate.

## Scale matrix targets (from prompt §7)

| Tier | Projects | Estimates | Active rows | Tree nodes | Library items | Linked instances | Collaborators |
|---|---:|---:|---:|---:|---:|---:|---:|
| Small | 5 | 20 | 100 | 50 | 100 | 5 | 1–2 |
| Medium | 20 | 200 | 500 | 250 | 1,000 | 50 | 5–10 |
| Large | 50 | 1,500 | 3,000 | 1,200 | 10,000 | 500 | 25–50 |
| Stress | documented max | documented max | beyond limit | beyond limit | 50,000 if tooling supports | fanout/backlog ceiling | 100 |

These tiers are the targets for the implementation waves. **No tier was measured in this audit.**

## Tooling inventory

Active perf-related package.json scripts:
- `perf:measure-routes` — `scripts/measure-route-transitions.ts`
- `perf:check-routes` — `scripts/check-route-transition-readiness.ts`
- `perf:dashboard-query-count` — `scripts/measure-workshop-dashboard-query-count.ts` (stale: reads `supabaseRoundTrips`)
- `perf:seed-fixture` — `scripts/seed-performance-test-data.ts`
- `perf:library-baseline` — `scripts/measure-library-performance-baseline.ts`
- `perf:profile-peak-load` — `vitest run tests/vitest/route-transition-peak-load-profile.test.tsx`
- `perf:collect-live-evidence` — **STALE** (Supabase/psql; PERF-DOC-001)
- `cf:d1-runtime-proof` — `scripts/verify-cloudflare-d1-runtime-performance-proof.ts` (synthetic; K-09)
- `cf:verify-hosted-performance` — `scripts/verify-cloudflare-hosted-performance.ts` (hosted-gated)

Reuse strategy: extend `cf:d1-runtime-proof` to authenticated workshop surfaces with representative fixtures (Wave 0). Replace `perf:collect-live-evidence` with D1 equivalent (Wave 4 — PERF-DOC-001).
