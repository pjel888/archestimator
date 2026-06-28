# 09 — Performance, Reliability, Observability

## Performance budget (closed-beta scale)

| Metric | Target | Stretch | Measurement |
|---|---|---|---|
| Initial route TTFB (server) | ≤ 300ms p50, ≤ 600ms p95 | ≤ 200ms p50 | `bun run dev` server timing + `withPerfTraceRequest`/`traced` already in repo |
| Initial route LCP | ≤ 1.5s p50 | ≤ 1.0s p50 | Lighthouse on local production build |
| Filter change → new paint | ≤ 500ms p50 | ≤ 300ms p50 | Manual chronometer |
| "Load more" → first new item | ≤ 600ms p50 | ≤ 350ms p50 | Manual chronometer |
| New client bundle (gzipped) | ≤ 10 KB additional | ≤ 7 KB | `bun run build` bundle report |
| Number of DB reads per initial render | ≤ 13 data reads + ≤ 6 count reads | ≤ 13 total if counts are folded into source queries | Repository instrumentation |
| Items rendered initially | ≤ 30 (limit 20 + scroll buffer) | — | Repository limit |

## Performance evaluator contract (PERF)

| Field | Value |
|---|---|
| Evaluator name | `project-activity-perf` |
| Baseline metric | Initial route TTFB at the current single-project closed-beta scale |
| Target | ≤ 300ms p50, ≤ 600ms p95 |
| Measurement command | `bun run build && bun run start` + `bunx playwright test tests/perf/project-activity-auth-timing.spec.ts --project=chromium` using `tests/.auth/project-activity-lewis-residence.json` as the authenticated storage state for the Lewis Residence project |
| Fixture size | Current closed-beta size (~100 estimate events, ~50 shared_link_events, ~10 comments, ~5 responses, ~10 collab audit events on the active project) |
| Number of runs | 1 warmup navigation discarded, then 20 authenticated navigations; sort samples ascending, p50 = median of samples 10/11, p95 = nearest-rank sample 19 |
| Regression threshold | +50% over baseline = fail |
| Related functional tests | `tests/vitest/project-activity-page/repository.test.ts` |
| Evidence artifact | `tests/perf/project-activity-perf.txt` (or `.ai/05_logs/project-activity/perf-auth-timing.txt`) with raw samples, p50, p95, project id, build mode, and auth fixture |

## Parallelization requirements (ULTRAWORK-style)

| Step | Parallelizable? | Notes |
|---|---|---|
| Server Component ownership + permission + activity feed + dropdowns | **Yes** (4 wave entries) | Mirror dashboard pattern in `src/app/workshop/projects/[projectId]/page.tsx` |
| Repository 5-source fan-out | **Yes** | `Promise.all` over estimate/comment/response/event/collab queries |
| Count metadata | **Yes** | Parallel count reads or count output folded into source queries/RPC |
| Bulk actor + recipient label resolution | **Yes** (after fan-out) | `Promise.all` |
| Compose-time filter on action class | Sequential (post-merge) | Cheap CPU work; no network |

## N+1 prevention

- Actor labels: one bulk `profiles.in(actorUserIds)` per render.
- Recipient labels: one bulk `shared_link_recipients.in(recipientIds)` per render.
- Estimate labels: scope dropdown reads all estimates for this project in one query.

## Render and re-render discipline

- The client component memoizes the activity list and item cards only if profiling shows measurable cost. Default: no memoization (ponytail).
- URL changes via `router.replace` trigger RSC re-fetch — that's the intended shape.
- "Load more" appends; it does not trigger a full re-render of existing items.

## Reliability requirements

| Requirement | Mitigation |
|---|---|
| Source-unavailable does not break the page | `partial` flag + banner |
| Supabase network error | Server catches + friendly error UI |
| Invalid cursor | Reset to page 1 silently in repository tests or return safe 400 from loader; no SQL detail |
| Rapid filter changes | RSC navigation naturally coalesces; no extra debounce needed |
| Stale data after another-tab mutation | Each navigation performs fresh fetch (no aggressive cache) |
| Cursor drift during rapid Load-more | Cursor is per-source and re-validated by the repository |

## Observability

- `console.warn("[project-activity] source unavailable: <source>")` for partial paths.
- `withPerfTraceRequest` and `traced` wrappers (already in `src/lib/perf/server-timing.ts`) wrap the Server Component prefetch.
- Server-Timing header exposes the breakdown for the browser dev-tools.
- Loader responses include no PII and no cacheable cross-user headers.

## Rollback trigger

If post-launch we observe:
- Route TTFB p95 > 1.5s sustained over 1 hour, OR
- A P0/P1 correctness bug in activity rendering, OR
- A security regression,

trigger rollback per `13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md`.

## Risks (cross-reference)

- RISK-06: 6-source fan-out may saturate Supabase connection quota at high concurrency. Mitigation: bounded LIMIT per source; connection pool is Supabase-managed.
- RISK-07: client bundle growth if implementation pulls in estimate-sheet activity-history helpers. Mitigation: those helpers are **pattern references only**; never imported.
