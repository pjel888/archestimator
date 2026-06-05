# Performance, Reliability & Observability Readiness

**Last updated: 2026-06-02**

## Summary of Critical Findings

| # | Finding | Severity | Launch Blocker |
|---|---------|----------|----------------|
| 1 | No performance benchmarks exist for any route, sheet, tree, or export path | High | **Yes** |
| 2 | No APM or error tracking is configured (no Sentry, LogRocket, Datadog) | Critical | **Yes** |
| 3 | Logging is console.log only, lost on every Vercel recycle | High | **Yes** |
| 4 | Rate limiting is in-memory only, reset on every deploy or server restart | High | **Yes** |
| 5 | No React error boundaries exist on workshop routes | Medium | **Yes** |
| 6 | Custom error pages (404/500) do not exist, Next.js defaults are in place | Medium | No |
| 7 | Heavy packages (three, d3, exceljs, react-complex-tree) are not code-split | Medium | No |
| 8 | No bundle size analysis has ever been run | Medium | No |
| 9 | Circuit-breaker pattern exists only in shared link layer, not systemic | Medium | No |
| 10 | SLO/SLA posture is not defined for MVP or beta | Medium | No |
| 11 | Supabase PITR is not configured; recovery procedure has no documented runbook | High | **Yes** |
| 12 | No uptime monitoring, alerting, or incident detection pipeline exists | High | **Yes** |

---

## 1. Performance Budgets

These are planning targets. They are not claims of current capability. Every row marked `UNKNOWN` or `NO BENCHMARKS` must be measured before a launch claim can be made.

| Metric | Target | Current Status | Evidence Required | Launch Blocker? |
|--------|--------|----------------|-------------------|-----------------|
| Initial public page load (LCP) | < 2.5s | UNKNOWN | Lighthouse audit on cold load, production build, 3G throttled | **Yes** |
| Initial public page load (FCP) | < 1.8s | UNKNOWN | Lighthouse audit on cold load, production build, 3G throttled | **Yes** |
| Workshop route transition (cold) | < 100ms | UNKNOWN | Chrome DevTools Performance trace: navigate between /workshop, /workshop/projects, /workshop/library | **Yes** |
| Workshop route transition (warm) | < 50ms | UNKNOWN | Same trace, second navigation within session | **Yes** |
| Estimate row edit perceived latency | < 200ms | UNKNOWN | User Timing API mark: keypress/click to optimistic UI update + server acknowledgment | **Yes** |
| Share receiver first meaningful content | < 2s | UNKNOWN | Lighthouse audit on /share/[token] cold load | **Yes** |
| XLSX export (500-row estimate) | < 10s | UNKNOWN | Stopwatch test: click Export to download complete, production build, median of 5 runs | **Yes** |
| AI response timeout | 30s with retry | IMPLEMENTED (timeout set, no retry) | Test: AI request exceeds 30s, verify graceful timeout + retry fires, verify UI shows "thinking" state not blank | **Yes** |
| Tree rendering (500 nodes) | < 500ms | NO BENCHMARKS | Chrome Performance trace: render 500-node estimate tree, expand all, measure paint | **Yes** |
| Component library list (1,000 items) | < 1s to render | NO BENCHMARKS | Chrome Performance trace: load library with 1,000 components, measure paint + scroll | **Yes** |
| Chart rendering | < 1s | NO BENCHMARKS | Chrome Performance trace: render donut + bubble chart with >100 data points | **Yes** |
| Image/attachment load | < 2s | NO BENCHMARKS | Network trace: load share page or sheet with 20 attached images, measure all above-fold images complete | No |

### Timeout and retry targets

| Operation | Timeout | Retry Strategy | Current Status |
|-----------|---------|----------------|----------------|
| AI /api/ai/ask | 30s | Not implemented | Timeout set in route, no retry logic or circuit-breaker |
| AI /api/ai/package-builder | 30s | Not implemented | Timeout set in route, no retry logic or circuit-breaker |
| Supabase query (all routes) | 30s default | Not implemented | Supabase client default, no app-level retry wrapper |
| XLSX export generation | Undefined | Not implemented | No timeout guard, no background job queue |
| Share link token resolution | 10s effective | Basic retry in shared link layer | Retry exists in shared link context only, no backoff or jitter |
| Image/attachment upload | Undefined | Not implemented | Relies on browser default fetch timeout |

---

## 2. Current Performance State

Every cell marked `NO BENCHMARKS` or `UNKNOWN` is a known evidence gap. These are not assessments of quality, they are statements about what has and has not been measured.

| Area | Status | What Exists | What's Missing | Notes |
|------|--------|-------------|----------------|-------|
| Route transition performance | PARTIAL — groundwork done | `BfcacheHandler` (pageshow event restore), `PerformanceMonitor` (dev console logging), `usePrefetchOnHover` (TanStack Query prefetch), `Skeleton` primitive (design-token-aligned), `loading.tsx` files for `/workshop`, `/workshop/library`, `/workshop/onboarding`, `/workshop/projects`, `/workshop/settings`, `/workshop/templates` | Phases 1–4 of the Route Transition Performance Master Plan are not implemented: no code splitting (`next/dynamic`), no systematic prefetch wiring across all link surfaces, no error boundaries on route segments, no dynamic rendering strategies | Groundwork delivered 2026-05-29. The 34-document master plan exists at `.ai/03_plans/route-transition-performance-optimization/`. `PerformanceMonitor` is dev-only and does not ship metrics to any production system |
| Workshop navigation responsiveness | UNKNOWN | `WorkshopPageShell` wraps authenticated routes, `useNavigationRouter` manages route-loading overlay state, `Skeleton` primitives replace full-screen overlays during data fetching | No benchmarks. No Lighthouse or DevTools traces exist for `/workshop` → `/workshop/projects` → `/workshop/projects/[projectId]/estimates/[nodeId]` drill-down. No measured cold vs warm transition times | `performance.now()` marks exist inside `PerformanceMonitor` but are only logged to console in dev |
| Estimate sheet editing latency | UNKNOWN | TanStack Query with 30s staleTime + optimistic mutations, Zustand for selection/expansion state, `useEstimateRowMutations` with internal dirty/saving/saved/failed state (no per-row save pills rendered), Supabase Realtime for cursor broadcast | No benchmarks. No User Timing API marks. No measured time from keypress to optimistic DOM update, or from mutation dispatch to server acknowledgment. No scroll performance measurement on sheet with >100 rows | Optimistic strategy is architecturally sound for perceived latency, but unverified |
| Tree rendering performance | NO BENCHMARKS | React Complex Tree 2.6.1 renders the estimate hierarchy (Group/Area nodes), `WorkshopTree` component reused for share page tree view | No benchmarks. No rendering time measured for 500-node tree. Expand-all not tested. No virtualization audit (React Complex Tree supports virtualization, status unverified). No memory profiling | Tree rendering is a critical path for both editing and share receiver. Unverified at any row count above current demo data |
| Large estimate behavior | UNKNOWN | Estimate sheets load through TanStack Query with pagination-adjacent patterns (per-node row queries). Server actions handle row CRUD through RPCs | No load tests. Behavior at 500, 1,000, or 5,000 rows is completely unknown. No pagination strategy defined. No scroll virtualization confirmed. No memory profiling at scale | Current demo data is DEMO_PROJECT_PLACEHOLDER with ~3 top-level groups and ~20 area nodes. Production estimates could be 10x–100x larger |
| Component library large-list | NO BENCHMARKS | Component library loads through `src/lib/repositories/component-library-repository.ts`, renders in center sheet with tree-driven filtering (folders, suppliers, brands), search via command palette | No benchmarks at 1,000+ components. No virtualization audit (the center sheet is a table, not a virtual list). No measured search response time. No scroll performance measurement | The library tree (React Complex Tree) and center sheet (likely unvirtualized table rows) are separate concerns; both need measurement |
| Chart rendering | NO BENCHMARKS | D3 7 for donut and bubble charts. `CostDonutChart` shared between workshop project charts route and share receiver. Chart data aggregated server-side via `getProjectChartsData()` | No benchmarks. No rendering time measured for charts with >100 data points. No SVG performance audit (D3 creates DOM elements per slice/bubble). No resize/reflow measurement | D3 is not virtualized by nature. Large datasets may produce hundreds of SVG elements. Needs measurement before claiming chart responsiveness |
| XLSX export | NO BENCHMARKS | ExcelJS workbook builder at `src/lib/proposal-export/`. Exports full estimate tree with sections, rows, totals. Server action generates workbook and returns buffer | No timeout tests. No measured generation time for 100, 500, or 1,000 row estimates. No progress indicator. No background job queue. Export blocks the request until complete | Heavy dependency (ExcelJS). Generation happens synchronously in the server action handler. A 1,000-row estimate could exceed Vercel function timeout (10s on Hobby, 60s on Pro). Not code-split from bundle |
| Share receiver load | NO BENCHMARKS | Responsive design exists (SharePageTabs, tabbed navigation, tree view, grid preview, donut chart, floating nav). Data loaded via `/api/share/[token]` routes | No benchmarks. No Lighthouse audit. No measured LCP, FCP, or TTI on cold load. No measured impact of password gate on load time. No CDN/caching strategy verified for share page assets | Share receiver is the primary external-facing page. Cold load performance directly affects client trust |
| Image/attachment performance | NO BENCHMARKS | Image and attachment uploads exist via `/api/component-library/images/` and `/api/component-library/attachments/`. Storage in Supabase buckets with signed URLs | No benchmarks. No upload duration measurement. No load time measurement for pages with attached images. No image compression strategy. No CDN configuration. No lazy loading audit | Signed URL expiry, caching headers, and image optimization pipeline are all unverified |
| AI route timeout | IMPLEMENTED — no circuit-breaker | AI routes (`/api/ai/ask`, `/api/ai/package-builder`) set provider timeout via DeepSeek adapter. Timeout produces a user-facing error in the Ask Flip panel | No circuit-breaker pattern. If the AI provider is consistently slow or down, every request will wait the full timeout before failing. No degraded mode (e.g., "Flip is unavailable right now"). No retry with backoff | Timeout alone is not resilience. A flapping provider will create a poor user experience with repeated 30s waits |
| Bundle size | NO ANALYSIS | No bundle analysis has been run. Heavy dependencies are known: `three` (via @firecms/neat, 3D landing background), `d3` (charts), `exceljs` (XLSX export), `react-complex-tree` (tree UI), `@supabase/supabase-js` (DB client) | No `@next/bundle-analyzer` report. No `next/dynamic` code splitting for heavy modules. No chunk audit. No tree-shaking verification. All heavy packages likely shipped in initial client bundle | `three` and `exceljs` should be behind `next/dynamic` with `ssr: false` since they are not needed on initial page load. `d3` may benefit from tree-shaking or lazy loading for chart routes only |
| Font CLS | PARTIAL | Google Fonts (Inter) loaded async via `next/font/google` in root layout. CSS `font-display: swap` in use | `@next/font` does not include local fallback font caching. The `swap` strategy means text is invisible until the font loads (FOIT), then swaps (potential CLS). No measured CLS from font loading. No self-hosted font strategy | The design system mandates SF Pro for the app, but SF Pro is a system font on Apple devices and may not be available elsewhere. The font stack fallback and its CLS impact are unverified |

---

## 3. Resilience & Reliability

| Pattern | Status | Notes |
|---------|--------|-------|
| Rate limits | PARTIAL — in-memory only | Rate limiting exists for shared link password attempts (in-memory progressive lockout) and for shared link activity digests. No Redis, no Upstash, no persistent backing store. All rate-limit state is lost on deploy, server restart, or Vercel function recycle. No per-IP or per-user rate limits on auth routes (login, magic link, OAuth callback). No rate limits on AI routes. No rate limits on API routes generally |
| Retry policy | PARTIAL — not systemic | Basic retry logic exists in the shared link layer for token resolution and event recording. Supabase queries use the client default (no app-level retry wrapper). AI routes have no retry. Export has no retry. No exponential backoff. No jitter. No max-retry ceiling. No retry budget or circuit interaction |
| Circuit-breaker | PARTIAL — shared link only | Basic circuit-breaker pattern exists in the shared link layer (P12 of the Shared Link Overhaul). It opens after N failures on token resolution and provides degraded responses. No circuit-breaker on AI provider calls. No circuit-breaker on Supabase connections. No circuit-breaker on export generation. No half-open state with gradual recovery. No circuit state visibility to users or operators |
| Offline/degraded behavior | MINIMAL | In-memory mutation queue exists for estimate edits (optimistic updates through TanStack Query). If the server is unreachable, mutations are rolled back after timeout. The mutation queue is lost on page reload — no IndexedDB persistence. No service worker. No offline-capable PWA. No degraded-mode UI (e.g., "You are offline, changes will sync when reconnected"). No defined degraded experience for AI unavailability or Supabase outage |
| Error boundaries | NONE — critical gap | No React error boundaries exist on workshop routes. No error boundary wrapping the estimate tree, estimate sheet, component library, charts, or AI panel. A JavaScript error in any of these surfaces will crash the entire route to Next.js's default error state (white screen or unstyled fallback). Error boundaries are planned in the Route Transition Performance Master Plan (Phase 3) but not implemented |
| Custom error pages | NONE | No `src/app/not-found.tsx`. No `src/app/error.tsx`. No `src/app/global-error.tsx`. 404 and 500 errors render Next.js default pages. The workshop is a protected route, so unauthenticated users hitting a 404 will see the default Next.js page, not a branded error. Server errors (5xx) have no custom recovery UI |
| Supabase connection resilience | UNVERIFIED | Supabase client uses default connection settings. PgBouncer (connection pooler) is presumably enabled on Supabase Pro but not verified. No connection retry wrapper. No connection pool exhaustion testing under concurrent load (e.g., 10+ simultaneous estimate editors) |
| Vercel cold starts | UNVERIFIED | No measurement of serverless function cold start time for API routes or server actions. No measurement of warm start time. Vercel Hobby plan has a 10s function timeout; Pro plan has 60s. XLSX export with large estimates may approach or exceed Hobby limits |
| AI provider failure | NO STRATEGY | If DeepSeek (or the configured AI provider) is down, slow, or returns errors, there is no fallback. No secondary provider. No cached responses. No "Flip is unavailable" degraded mode. Every AI request will wait the full timeout and show an error. Package-builder Apply is deterministic and does not require the provider, but the Draft/refine path does |

---

## 4. Observability

| Capability | Status | Evidence Required |
|------------|--------|-------------------|
| APM / error tracking | LEFT TO DO | No Sentry, LogRocket, Datadog, or equivalent configured. No error tracking SDK in the app. JavaScript errors, unhandled promise rejections, and server-side 5xx errors are invisible to operators. A production error would only be discovered if a user reports it or if someone checks Vercel logs manually |
| Log aggregation | LEFT TO DO | `console.log` only. Vercel serverless functions lose all console output on recycle (seconds to minutes after last request). No log shipping to a centralized service (Axiom, Logtail, Datadog, Vercel Logs). No structured logging (JSON format with request IDs, timestamps, severity levels). No correlation IDs across client-server boundaries |
| Performance monitoring | DEV-ONLY | `PerformanceMonitor` client component exists at `src/components/PerformanceMonitor.tsx`. It logs `performance.now()` route transition timings to `console.log` in development only. No production metrics. No Real User Monitoring (RUM). No Web Vitals reporting (LCP, FCP, CLS, INP are not collected or shipped). No server-side timing (API route duration, DB query time) is measured |
| Uptime monitoring | PARTIAL / LOCAL ONLY | Local `/api/health` exists and returns a JSON 200 health probe for uptime monitors. No deployed synthetic uptime check, provider monitor, alert threshold, alert delivery channel, or hosted proof exists yet. Downtime would still not be detected automatically until Vercel/external monitor proof is captured |
| Alerting | LEFT TO DO | No alert threshold configuration. No alert delivery channel (email, Slack, PagerDuty). No definition of what constitutes an alert-worthy event. Operators would not be notified of error rate spikes, 5xx increases, auth failure surges, AI provider outages, or database connectivity issues |
| Incident detection | LEFT TO DO | No incident severity classification. No incident response runbook. No on-call rotation. No postmortem template. No incident communication plan. An incident would be handled ad hoc with no predefined process |
| SLO / SLA posture | NOT DEFINED | No service level objectives defined for MVP or beta. No uptime target (99.5%, 99.9%, 99.95%). No error budget. No latency SLOs (p50, p95, p99 for API routes). No SLA commitments for any customer tier. These must be defined before production launch or commitments are made |

---

## 5. Data Recovery

| Concern | Status | Detail |
|---------|--------|--------|
| Backup | UNVERIFIED | Supabase Pro includes automated daily backups. This has not been verified. No backup restore has been tested. No backup retention policy is known. No off-region backup exists |
| Point-in-time recovery (PITR) | NOT CONFIGURED | Supabase PITR is available on Pro/Team plans but has not been enabled. Without PITR, recovery options are limited to the most recent daily backup. A data corruption event between backups would result in permanent loss of changes made since the last backup |
| Recovery procedure | NO RUNBOOK | No documented procedure for restoring from a Supabase backup. No recovery time objective (RTO) defined. No recovery point objective (RPO) defined. No recovery drill has been performed. No verification that a restored database would work with the current application code and migration state |
| Failed migration response | NO PROCEDURE | If a schema migration fails during deployment, there is no documented rollback procedure. Supabase migrations are applied via `supabase db push` or the Supabase CLI. A failed migration could leave the database in an inconsistent state. No migration dry-run or pre-flight check exists in CI |
| Data corruption procedure | NO PROCEDURE | If estimate data becomes corrupted (e.g., broken tree hierarchy, orphaned rows, inconsistent totals), there is no documented recovery procedure. No data integrity check script exists. No automated corruption detection (e.g., periodic checksum verification of critical tables). No point-in-time recovery is available (see PITR above), meaning the only recovery option would be a full daily backup restore, losing all changes since the backup |

---

## Known Dependencies and Their Observability

| Dependency | Failure Mode | Current Visibility | Impact if Down |
|------------|-------------|-------------------|----------------|
| Supabase (database) | Connection failure, query timeout, pool exhaustion | None (user sees error, operator sees nothing) | All authenticated routes fail. All writes fail. AI cannot read workspace context. Share links fail to resolve. |
| Supabase Auth | OAuth callback failure, session validation failure | None | Users cannot log in. Existing sessions may fail on validation. Invite acceptance breaks. |
| Supabase Realtime | WebSocket connection failure | None | Cursor broadcasting and presence stop working. Estimate editing still functions (optimistic mutations via HTTP). |
| DeepSeek (AI provider) | Timeout, rate limit, billing exhaustion, outage | None (user sees "Flip is thinking…" then error after 30s) | Ask Flip and package-builder Draft/refine are unavailable. Package-builder Apply is unaffected (deterministic path). |
| Resend (email) | API failure, sending quota exhausted | None | Invite emails, share recipient emails, and magic link emails silently fail. No retry queue. No bounce handling. |
| Vercel (hosting) | Deployment failure, function timeout, cold start spike | None (Vercel status page is separate) | Entire application is down. No DNS failover. No static fallback page. |
| ExcelJS (export) | Memory exhaustion on large exports, function timeout | None (user sees loading then error) | XLSX export fails. No fallback format. No background job queue to retry. |

---

## Immediate Actions (Priority Order)

1. **Configure APM/error tracking** (Sentry or equivalent) — launch blocker. Without this, every other observability gap is invisible.
2. **Add React error boundaries** to all workshop route segments — prevents full-page crashes from localized JS errors.
3. **Run bundle analysis** (`@next/bundle-analyzer`) and code-split heavy packages (`three`, `exceljs`, `d3`) behind `next/dynamic`.
4. **Create custom error pages** (`not-found.tsx`, `error.tsx`, `global-error.tsx`) — low effort, immediate UX improvement.
5. **Configure uptime monitoring** (Checkly, Uptime Robot, or Vercel Monitoring) against `/api/health` — prerequisite for alerting.
6. **Capture deployed health-check proof** — hosted `/api/health` returns 200 and the monitor sends alerts to the launch owner.
7. **Define SLO posture** for MVP/beta — uptime target, error budget, latency objectives. Document as accepted risk if relaxed for beta.
8. **Upgrade rate limiting** from in-memory to persistent (Upstash Redis or similar) — prevents lockout-state loss on deploy.
9. **Implement AI circuit-breaker** — prevents cascading 30s timeouts when provider is degraded.
10. **Verify Supabase backups and enable PITR** — data recovery prerequisite.
11. **Run performance benchmarks** on all budget targets in Section 1 — converts UNKNOWN cells to measured evidence.
12. **Configure log aggregation** — structured logging with correlation IDs shipped to a centralized service.

---

## Collaboration & Sharing Audit Integration Note — 2026-05-30

This document is a reference domain deep-dive. For detailed, current collaboration/share performance and observability truth, consult `.ai/03_plans/share-and-collaboration-implementation/` — specifically `06-performance-and-observability-plan.md`. Key audit findings relevant to this domain:

- **Persistent rate limiter store required** — invite and shared-link rate limiting must use durable storage (Redis/Upstash), not in-memory. Restart-surviving lockout is a beta requirement.
- **Invite/share abuse metrics** — monitor invite acceptance spikes, shared-link password brute-force attempts, and magic-link creation velocity
- **Invite acceptance latency target** — acceptance and redirect cycle should complete within 500ms; measure end-to-end
- **Shared-link open/comment/decision observability** — per-recipient tracking, activity feed completeness, and event audit gaps need measurement baselines
- **Email delivery observability** — both Supabase Auth invite emails and Resend shared-link emails need delivery/failure monitoring
- **Alerting thresholds for invite/share abuse** — define p95 latency and error-rate thresholds for invite acceptance, shared-link access, and password-gate lockout events
- **Audit/event visibility gaps** — collaboration_invitations table has lifecycle events but not all state transitions are recorded as audit events; shared-link events are partial

See goal cards BETA-P0-SEC-005 (persistent rate limiting), CODEX-P0-COLLAB-003 (invite lifecycle E2E), CODEX-P1-SHARE-002 (recipient tracking), and the 06-performance-and-observability-plan in the audit pack for detailed recommendations including 15 recommended indexes, 14 observability metrics, and 7 alerting thresholds.

---

## Database Indexing & Query Performance Readiness

**Current state:** Unknown until CODEX-P0-DBIDX-001 audit is complete. No index/query inventory exists. No EXPLAIN evidence for critical flows.

### Why This Matters

Archestimator's architecture is already query-heavy, tenant-scoped, and estimate-tree-heavy. Without an indexing strategy:
- Estimate editor loads will degrade as estimate row counts grow
- Component library queries will slow as cost item catalogs expand
- Shared-link publication resolution will worsen with more published links
- AI audit logs will become a write+read burden without careful indexing
- RLS policy predicates will add hidden cost to every tenant-scoped query

### Critical App Flows Requiring EXPLAIN Evidence

| Flow | Tables | Key Columns |
|------|--------|-------------|
| Estimate editor load | `estimate_nodes`, `estimate_row_items` | `estimate_id`, `sort_order` |
| Component library browse | `cost_library_items`, `library_folders`, `component_suppliers`, `component_brands` | `workspace_id`, `sort_order`, `name`, `category` |
| Homebase / project list | `projects`, `project_favorites`, `project_members` | `workspace_id`, `user_id`, `updated_at` |
| Shared link resolve | `project_publications` | `token_hash`, `project_id`, `status` |
| Invite token resolve | `collaboration_invitation_tokens`, `collaboration_invitations` | `token_hash`, `project_id`, `lifecycle_state` |
| AI audit reads | `ai_action_runs`, `ai_tool_calls`, `ai_data_access_events` | `workspace_id`, `actor_user_id`, `created_at` |

### Candidate Index Families

See `.ai/03_plans/database-indexing-and-query-performance/03-index-strategy-and-prioritization.md` for the full prioritized list. Key candidates:

1. **Estimate rendering:** `(estimate_id, sort_order)` on `estimate_nodes` and `estimate_row_items`
2. **Component library:** `(workspace_id, category, name)` on `cost_library_items`; `(workspace_id, sort_order, name)` on `library_folders`, `component_suppliers`, `component_brands`
3. **Collaboration pending invites:** Partial index on `collaboration_invitations` for pending/active state

### Requirements Before Index Creation

- `pg_stat_statements` must be used for query evidence
- Supabase Performance Advisor must be reviewed
- EXPLAIN protocol must be followed (see plan doc 05)
- Migration parity must be verified before shared-link table indexing
- No speculative index bloat — every index must be evidence-backed

### Dependencies
- Migration parity check (CODEX-P0-DBIDX-002) — shared-link tables may not exist in live schema
- Staging environment with representative seed data (CODEX-P0-DBIDX-003)
