# 09 — Performance, Reliability, and Observability

> **PASS-2 AUDIT BANNER (2026-06-25), updated by PASS-3 owner decisions.** This document has 4 HIGH corrections recorded in `18_AUDIT_FINDINGS_AND_CORRECTIONS_2026-06-25.md`. Headlines: ARCH-DEFECT-01 (PERF-05 "no N+1" claim is implausible — worst-case 50 projects × 5 publications × 10 recipients = 50 + 250 + 2,500 queries if naive; §09 MUST specify exact batched query plan with budget ≤ 8 round trips + stress test with seeded workspace), ARCH-DEFECT-02 (roster sort location unspecified — `latestActivityAt` computation happens in TypeScript with app-layer loop, not SQL; PERF-01 p95 < 1.2s must account for client-side sort + render cost), ARCH-DEFECT-03 (rotate-token race resolved by D-ARCH-05 DB-level per-publication serialization/lock), ARCH-DEFECT-15 (D-ARCH-06 rejects same-publication concurrent optimistic mutations with disabled controls + wait toast). Read doc 18_ for full evidence.
>
> **PERFORMANCE BENCHMARKING ADDENDUM (2026-06-26).** `21_PERFORMANCE_BENCHMARKING_AND_NAVIGATION_TIMING_ADDENDUM_2026-06-26.md` complements this document. It closes the six gaps doc 09 leaves implicit: (1) intra-page navigation-transition budgets (NAV-01..NAV-22), (2) concrete benchmarking script extensions to the existing `e2e/route-transition-performance-budgets.json` + `route-transition-performance.spec.ts`, (3) the stress-test gate resolving ARCH-DEFECT-01, (4) sort+render sub-budgets resolving ARCH-DEFECT-02, (5) per-chunk bundle-size CI gate, (6) RSC streaming budget. Doc 21 adds requirements PERF-06..PERF-14 and work packages WP-1.9/WP-1.10/WP-1.11/WP-2.6. For navigation-transition scope, doc 21 is authoritative; doc 09 remains authoritative for steady-state reliability, caching, failure modes, logging, and alerting.

---

## Performance budgets

| Surface | Budget (p95) | Measurement | Source |
|---|---|---|---|
| Roster first paint (TTFB + render) | < 1.2s | Lighthouse + Vercel Analytics | PERF-01 |
| Roster payload (HTML + JS gzipped) | < 80KB | `bun run build` report | PERF-02 |
| Drawer open perceived latency | < 200ms | Playwright trace | PERF-03 |
| Activity feed first page render | < 400ms | Playwright | DATA-02 |
| Server-action round-trip (rotate) | < 600ms | Server timing header | n/a |
| Recipient add (with Resend digest queue) | < 1.2s | Server timing + Resend API | n/a |
| RSC payload size per publication row | < 1.5KB | Build + manual | n/a |

## Rendering behavior

- Roster is **RSC** (server-component). No client loader. Initial HTML includes row data.
- Drawer is **client-only, lazy-loaded** via `next/dynamic`. Loads on first row click.
- Activity feed is **RSC-paginated**. Each page is a server fetch.
- TanStack Query for client-side cache (30s staleTime, matches repo convention).

## Network round trips (Phase 1)

| Surface | Round trips |
|---|---|
| Initial roster render | 1 (HTML) |
| Drawer open | 1 (lazy JS chunk) + 1 (recipient query) + 1 (timeline query) — parallel |
| Filter tab change | 0 (client-side against cached data) |
| Search input | 0 (debounced 200ms, client-side) |
| "Load more" activity | 1 (next page) |

## Query count

- **No N+1.** Roster uses a single workspace-projects-summary RPC + one batched publication-summary fetch (Phase 1: application-layer loop; Phase 2: dedicated RPC).
- Drawer uses 3 parallel queries (recipients, activity, audit), each indexed (see `07_DATA_DATABASE_API_NETWORK_PLAN.md` §Indexes).

## Query complexity

| Query | Complexity | Indexes used |
|---|---|---|
| Roster project loop | O(workspace_projects) | `workspace_projects_summary` RPC |
| Per-project publication summary | O(publications per project) | `project_publications_project_id_idx` |
| Drawer recipients | O(recipients) | `shared_link_recipients_publication_id_idx` |
| Drawer activity | O(events) | `shared_link_events_publication_id_created_at_idx` |
| Activity feed union | O(5 tables × page_size) | per-table indexes |

## Index requirements

All Phase 1 queries use **existing** indexes. No new index required. (See `07_DATA_DATABASE_API_NETWORK_PLAN.md` for Phase 2 candidate index if RPC is added.)

## Memory usage

- Roster client cache: ~50 publications × ~1.5KB = ~75KB max. Acceptable.
- Drawer: ~100 recipients × ~200B + ~50 events × ~400B = ~40KB max. Acceptable.
- No client-side full-text index; search runs against cached data.

## CPU usage

- RSC render is single-pass; no hot loops.
- Client filter / search is O(N) where N < 100 — sub-millisecond.
- No WebGL, no D3 on Publisher (D3 only on receiver side).

## Caching

| Surface | Cache | Invalidation |
|---|---|---|
| Roster RSC HTML | No-store (sensitive route) | n/a |
| TanStack Query publications | 30s staleTime (repo convention) | revalidatePath on mutation |
| Drawer recipients | 30s staleTime | revalidatePath on add/remove |
| Activity feed | 30s staleTime | revalidatePath on new event |
| Profile colors | Static | Build-time |

## Cache invalidation

- `revalidatePath('/workshop/publisher')` after publish / rotate / revoke / recipient change / sheet change.
- `revalidatePath('/workshop/publisher/[publicationId]')` after drawer-level mutations.
- No tag-based invalidation needed in Phase 1.

## Batch processing

- None. All operations are user-driven, single-action.

## Concurrency

- Multiple managers in the same workspace: last-write-wins on shared state; RLS prevents cross-workspace interference.
- Token rotate: DB-level per-publication serialization/lock prevents two successful simultaneous rotates from producing a dead copied link.
- Optimistic mutations: one mutation per publication per client may be in flight. Same-publication follow-up actions are disabled and rejected with a wait toast rather than queued; failures roll back within 500ms.

## Scalability

| Dimension | Phase 1 capacity | Phase 2+ scaling path |
|---|---|---|
| Publications per workspace | up to 100 (roster render < 1.2s) | RPC rollup if exceeds |
| Recipients per publication | up to 100 (drawer render < 200ms) | Pagination |
| Events per publication | up to 10,000 (timeline paginated) | Cursor pagination |
| Concurrent managers per workspace | up to 10 with per-publication mutation rejection and DB rotate serialization | richer collaborative mutation state only if telemetry demands it |
| Workspaces per Supabase project | unlimited (RLS-scoped) | n/a |

## Performance budgets for hot paths

| Hot path | Target | Current measurement |
|---|---|---|
| `/workshop/publisher` first load | p95 < 1.2s | TBD (Phase 1 measure) |
| Drawer open | p95 < 200ms | TBD |
| Rotate token | p95 < 600ms | TBD |
| Add recipient | p95 < 1.2s | TBD |

## Performance regression risks

| Risk | Mitigation |
|---|---|
| Roster grows past 100 publications | Phase 2 RPC + pagination |
| Activity feed union grows slow at 5+ tables | Phase 2 `workspace_activity_feed` RPC |
| Snapshot staleness check O(N) per publication | Pre-computed in `latestActivityAt` already |
| Recipient avatar stack render cost | Cap at 5 visible + "+N more" |
| Drawer lazy-load chunk size | Verify < 30KB gzipped via build report |

## Measurement strategy

| Tool | Surface | Cadence |
|---|---|---|
| Lighthouse CI | `/workshop/publisher` first load | Every PR via `.github/workflows/ci.yml` |
| Vercel Analytics | Real-user p95 | Continuous |
| Playwright trace | Drawer open, rotate flow | E2E suite |
| Supabase query stats (pg_stat_statements) | Roster / drawer queries | Weekly review |
| Server Timing header | Server-action round-trip | Continuous |

## Failure modes

| Failure | Detection | Recovery |
|---|---|---|
| Supabase transient error | Retry once, then error boundary | Auto-retry + manual Retry |
| Vercel function timeout (10s default, 60s max) | Action throws | Roster degrades; toast surfaces |
| Resend unavailable | Graceful fallback (existing) | Digest queued |
| Client network drop | TanStack Query retry | Auto-retry on reconnect |
| Drawer chunk load fail | Error boundary | Retry button |
| Audit insert fail (rare) | Action throws (transaction rollback) | Mutation rolled back; user retries |

## Retry behavior

- Read queries: 1 silent retry on transient Supabase error.
- Mutations: NO auto-retry (user-driven Retry button to avoid double-charges / double-publishes).
- Drawer chunk load: 1 retry, then error boundary.

## Circuit breaking

- None at app layer in Phase 1. Supabase has built-in connection pool limits.

## Graceful degradation

- If `workspace_projects_summary` RPC is slow: roster renders with project list only; publications load progressively.
- If any of 5 audit tables is unavailable: activity feed renders available events with `Partial` badge.
- If drawer query fails: drawer shows retry; roster remains usable.

## Recovery

- Failed mutations are recoverable via Retry button.
- Failed publishes leave no partial state (atomic per existing `atomic_publish_and_digest_slot` RPC).
- Failed recipient adds are atomic — no orphan rows.

## Availability expectations

- Closed-beta pre-launch: no formal SLO. Best-effort during Philip's business hours (Asia/Manila).
- Post-launch SLO: TBD (separate from this plan).

## Logging

| Level | Surface | Stored where |
|---|---|---|
| ERROR | Server action throws | Vercel logs (structured JSON) |
| WARN | Rate limit hit, retry, fallback | Vercel logs |
| INFO | Manager action audit | `account_security_events` + `collaboration_audit_events` (DB) |
| DEBUG | Verbose (dev only) | Console (dev only) |

**Never logged:** raw tokens, raw passwords, raw recipient emails in plaintext Vercel logs (audit DB stores them encrypted via Supabase at-rest).

## Metrics

| Metric | Source | Alert threshold (post-launch) |
|---|---|---|
| Roster p95 latency | Vercel Analytics | > 1.5s |
| Drawer p95 latency | Playwright + Vercel | > 400ms |
| Rotate failure rate | Server logs | > 1% |
| Audit write failure rate | DB | > 0.1% (CRITICAL) |
| RLS denial rate | DB | spike > 5/min (potential attack) |

## Tracing

- Next.js 16 instrumentation hook (`instrumentation.ts`) for OpenTelemetry if added post-launch.
- Per-action `Server-Timing` header for Phase 1 manual triage.

## Dashboards

- None in Phase 1.
- Phase 2+: Grafana or Vercel Analytics dashboard for Publisher-specific metrics.

## Alerts

- None in Phase 1.
- Post-launch: PagerDuty / Slack webhook on CRITICAL thresholds (above).

## Runbooks

- See `13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md` for runbook entries.

## Support implications

- Phase 1 support: Philip (founder) directly. No tier-1 / tier-2 split yet.
- Audit trail enables post-incident forensics.
