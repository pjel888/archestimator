# 09 — Performance, Reliability, and Observability

## Performance budgets (justified; evaluator contract per `REQ-*`)

| Surface | Baseline | Target | Measurement | Fixture | Runs | Regression | Rollback trigger |
|---|---|---|---|---|---|---|---|
| Library list p95 (workspace, ≤10k items) | existing `loadCurrentWorkspaceComponentLibrary` p95 (capture) | ≤ baseline + 10% | `cf:verify-hosted-performance` + local vitest harness | seed 10k items | 30 runs | > +15% p95 | flag off review UI; reindex |
| Estimate read with stale propagation | existing estimate load p95 | ≤ baseline + 5% (computed-on-read is a per-row compare) | estimate-sheet perf test (`tests/vitest/perf/`) | estimate with 200 rows, 50% linked | 30 runs | > +10% | fall back to non-computed (hide `source-changed`) — last resort |
| Overview "Needs review" count | n/a (new) | ≤ 200ms p95 at 100k entries | overview query + `idx_cost_entries_review_status_workspace` EXPLAIN | seed 100k entries | 20 runs | > 500ms | denormalize mirror count via Cron |
| Import dry-run (1 MB CSV, ~5k rows) | n/a (new) | ≤ 3s p95 | import action benchmark | fixture CSV | 20 runs | > 6s | row cap tighten |
| `acceptCostEntry` | n/a (new) | ≤ 300ms p95 | action benchmark | 1 entry | 30 runs | > 800ms | investigate D1 transaction |

## Performance-goal contract (evaluator before optimization)

- **Evaluator 1 (library browse):** baseline = current `loadCurrentWorkspaceComponentLibrary` p95 on hosted preview (capture via `cf:verify-hosted-performance`). Target = baseline + ≤10%. Fixture = 10k-item seeded workspace. 30 runs, p95, flake policy = discard top/bottom 2. Regression threshold = +15%. Evidence artifact = `tests/vitest/perf/library-browse-with-review-state.test.ts` (new) + hosted perf report.
- **Evaluator 2 (stale propagation read):** baseline = current estimate load. Target = baseline + ≤5%. Fixture = 200-row estimate, 100 linked. Evidence = `tests/vitest/perf/estimate-read-with-stale-propagation.test.tsx` (extends existing `estimate-right-sidebar-active-tab-renders.test.tsx` pattern).
- **Evaluator 3 (overview count):** EXPLAIN on `idx_cost_entries_review_status_workspace` at 100k rows; prove index seek not scan.

## Hot paths & bottlenecks

- **Stale propagation:** computed-on-read avoids the write-fan-out bottleneck entirely. The read-side cost is one extra comparison per linked row; negligible vs D1 round-trip.
- **Overview aggregation:** indexed by `review_status`; if counts regress, denormalize via Cron/Queue (P4 stretch).
- **Import parse:** streaming CSV; Worker CPU bound → row/size cap.
- **Mirror updates on accept:** one extra UPDATE of the denormalized `cost_library_items`/`price_options` row — already the pattern for `lifecycle_state` changes.

## Render-count / memoization

- `SourceTrustChips` already memoizable; adding one chip does not change re-render shape.
- Inspector review toolbar: standard memo; no effect-loop.
- Import dry-run table: virtualize if >1k rows (reuse existing table virtualization if present; else paginate).

## Cache / invalidation

- `revalidateLibraryRoutes()` after review/import.
- TanStack query keys (`query-keys.ts`) invalidated for library + estimate reads.
- Read-your-own-writes: action returns updated row; client `setQueryData`.
- Cross-workspace: no shared cache keys.

## Cold start / first use

- New actions are lazy-loaded within existing `actions.ts` bundle; no new entry points. Cold-start unchanged.

## Reliability & failure modes

| Failure | Behavior | Recovery |
|---|---|---|
| D1 transaction conflict on accept | 409 to client; no state change | client refresh + retry |
| D1 unavailable during import commit | 500; no rows written | retry import |
| Migration apply fails mid-way | additive migration; partial columns may exist | fix-forward `0038`; D1 migrations are atomic per-statement |
| Audit insert fails after state update | wrap in same transaction; if transaction fails, state not updated | consistent |
| Worker timeout during large import | 400 "too large" before timeout (size cap) | split file |
| TanStar cache stale after accept | revalidation + reload banner | user reload |

## Graceful degradation

- If review-state read fails, fall back to existing chip behavior (no review chip) — never block library read on governance.
- If `source-changed` computation fails on estimate read, fall back to stored `linkState` (no false positive).

## Observability

- **Structured logging:** review/import actions log `{action, actorUserId, workspaceId, entryId, outcome, latencyMs, correlationId}` via existing logger. No PII; sanitize note length.
- **Metrics:** extend `library-telemetry.ts` with `review_action_completed{type,outcome}`, `import_completed{mode,rows}` counters. Redaction rules apply.
- **Audit:** review-event table is the audit source of truth; governance-admin UI + D1 query for forensics.
- **Dashboards/alerts:** optional Cloudflare Workers Analytics query for review-conflict rate > threshold; alert owner. Not required at free-tier for launch.
- **Tracing:** correlation_id propagated action→audit→telemetry.

## Recovery

- **Bad accept:** supersede or reject; audit records both.
- **Bad import:** bulk archive (`executeBulkArchiveLibraryComponents` existing) the imported batch by `origin='imported'` + `created_at` window; or per-row reject.
- **Migration rollback:** fix-forward (additive columns inert without actions).

## Scalability

- Per-workspace capped at `LIBRARY_COMPONENT_CAP=10_000`; variant entries multiply but bounded by price-option count. Cross-workspace scales horizontally on D1. Overview queries indexed.

## D1 / Cloudflare per-resource budget (free-tier, closed-beta posture)

Per `AGENTS.md`: stay on free-tier/bundled Cloudflare limits; no paid add-ons (D1 paid plan, R2 paid tier, Workers Smart Placement paid, etc.) without owner approval. This plan's incremental footprint:

| Resource | Free-tier limit (verify at implementation via Cloudflare skill + current pricing) | Expected incremental use from this plan | Headroom | Action if exceeded |
|---|---|---|---|---|
| D1 rows read / day (free) | 5M rows read/day | +1 JOIN per estimate load; review actions ~5 queries each; overview indexed. Estimate: <1% of daily read budget at closed-beta volume | ample | index tuning (`09` evaluator 3) |
| D1 rows written / day (free) | 100k rows written/day | review events + imports; bounded by admin cadence + import row cap | ample | row cap on import |
| D1 storage (free) | 5 GB | review columns add ~100 bytes/entry; audit rows small. <1 MB at closed-beta | ample | retention policy (`13`) |
| Workers requests / day (free) | 100k | review/import actions infrequent | ample | n/a |
| Workers CPU (free, per invocation) | 10 ms (bundled) / 30s (unbound) | import parse bounded by 5 MB + row cap; `TASK-028` proves sub-budget | ample | size/row cap |
| R2 Class A/B ops + storage | free-tier | unchanged (attachments path unchanged) | unchanged | n/a |
| KV ops | n/a (not used as source of truth) | n/a | n/a | n/a |
| Queues / Cron | free-tier | only if P4 async materialization chosen (stretch) | n/a unless stretch | owner approval if added |
| Email | free-tier | unchanged | unchanged | n/a |

**Cost model:** no metered cost at closed-beta volume. The plan adds no paid add-ons. Provider-pricing proof deferred to implementation (`cf:pricing` snapshot in `13`) — at planning time, free-tier posture is sufficient and bounded.

## Performance evidence required before release

- Local vitest perf tests (evaluators 1–2).
- Hosted preview perf report (`cf:verify-hosted-performance`) for evaluator 1.
- EXPLAIN for evaluator 3 on local D1 with seeded data.
- Browser proof not required for performance (claims are query/render-time, provable by unit/DOM/profiler) — except inspector focus/render which is covered by a11y DOM tests.
