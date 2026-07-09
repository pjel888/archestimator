# 11 — Implementation Plan

Authoritative execution guide. Phases are dependency-aware; each phase has a
durable-goal contract. Exact target paths/symbols are repo-relative. Complexity:
S/M/L/XL. Parallelization: `PARALLEL-SAFE` / `SEQUENTIAL-DEP` / `SHARED-FILE`.

> **Read before editing:** re-read every target file immediately before edits
> (shared worktree). Confirm `git status --short --branch`. Match existing code
> style (Phosphor icons, inline copy, `QueryResult<T>`, `force-dynamic` routes).

> **2026-07-09 upgrade:** per-task acceptance scenarios + verification commands
> now live in [`28_EXECUTION_OVERLAY.md`](28_EXECUTION_OVERLAY.md). Realtime
> flow sequence diagrams live in
> [`24_DATA_FLOW_AND_SEQUENCE_DIAGRAMS.md`](24_DATA_FLOW_AND_SEQUENCE_DIAGRAMS.md).
> Component TS prop interfaces live in
> [`23_COMPONENT_API_CONTRACTS.md`](23_COMPONENT_API_CONTRACTS.md). This doc
> remains the **authoritative** plan; `28` is a checkpoint overlay, not a
> replacement.

## Phase 0 — Foundation: allowlist + env + master flag

**Objective:** single source of truth for admin access; kill switch.
**Reqs:** FR-AUTH-01, OPS-FLAG-01. **Prereqs:** none.
**Durable goal:** `G-ADMIN-0` — owner email gate works end-to-end and toggles off.

### Task 0.1 — `isPlatformAdminEmail()` helper + env
- **ID:** T-0.1. **Reqs:** FR-AUTH-01. **Complexity:** S. **Class:** SHARED-FILE.
- **Target:** `src/lib/auth/roles.ts` (edit).
- **Symbols:** add `PLATFORM_ADMIN_EMAILS_ENV = "PLATFORM_ADMIN_EMAILS"`;
  `export function isPlatformAdminEmail(email: string | null | undefined): boolean`
  reading env via `readRuntimeEnvString`-style access (`process.env` + runtime
  fallback), default `"philipjonlewis@gmail.com"`, comma-separated, lowercased
  compare. Compose with `isPlatformAdminRole`: `export function
  isPlatformAdmin(context): boolean { return isPlatformAdminRole(context.role) ||
  isPlatformAdminEmail(context.email); }`.
- **New files:** none.
- **Env vars (add to `.env.example` + `.dev.vars.example`):**
  `PLATFORM_ADMIN_EMAILS`, `ADMIN_DASHBOARD_ENABLED`.
- **Validation:** `bun run type-check`; unit test
  `tests/vitest/admin-roles.test.ts` (allow/deny/multi-email/case).
- **Exit:** helper exists, tested, default email matches.

### Task 0.2 — Master feature flag seed (DATA-FLAGS-01 minimal)
- **ID:** T-0.2. **Reqs:** OPS-FLAG-01. **Complexity:** S. **Class:** SEQUENTIAL-DEP (after 0.1).
- **Target:** `migrations/0042_feature_flags.sql` (new) — seed includes
  `admin_dashboard_enabled` (default 0). See blueprint 7.2.2.
- **Reader:** `src/lib/admin/feature-flags.ts` `isAdminDashboardEnabled()`.
- **Validation:** `bun run cf:d1-local:exec` + repo test.

### Task 0.3 — Proxy `/admin` gate
- **ID:** T-0.3. **Reqs:** FR-AUTH-01. **Complexity:** S. **Class:** SHARED-FILE.
- **Target:** `src/lib/auth/request-proxy.ts` (edit lines ~16–18, 198–220).
- **Change:** add `"/admin"` to `PROTECTED_PREFIXES`; after session resolves,
  if path startsWith `/admin` and not `isPlatformAdmin(identity)` and flag off
  or not allowed → `redirect("/access-required")`.
- **Validation:** denial tests (TEST-AUTH-01).

**Phase 0 exit:** non-admin cannot reach `/admin`; owner can; flag off hides it.

## Phase 1 — Migrations, repositories, audit, metrics cache

**Objective:** data layer. **Reqs:** DATA-SUPPORT-01, DATA-FLAGS-01,
DATA-AUDIT-01, DATA-METRICS-01, FR-OVERVIEW-02, FR-USERS-01, FR-AUDIT-01.
**Parallelizable:** migrations are independent; repositories depend on migrations.

### Task 1.1 — Support migration `0041` (blueprint 7.2.1)
### Task 1.2 — Audit migration `0043` (blueprint 7.2.3)
### Task 1.3 — Metric cache migration `0044` (blueprint 7.2.4)
- All: **Class:** PARALLEL-SAFE (distinct files). **Complexity:** S each.
- **Validation:** `bun run cf:d1-local:exec` per file; `wrangler d1 execute` read-back post-deploy.

### Task 1.4 — `src/lib/admin/users-repository.ts`
- **ID:** T-1.4. **Reqs:** FR-USERS-01, FR-OVERVIEW-02. **Complexity:** M. **Class:** SEQUENTIAL-DEP.
- **Exports:** `listAdminUsers({search,page,limit}): Promise<QueryResult<AdminUserRow>>`;
  `countSignups(windowDays): Promise<number>`; `listRecentSignups(limit): Promise<AdminUserRow[]>`.
- **Queries:** `SELECT p.id, p.email, p.display_name, p.role, p.created_at,
  MAX(s."expiresAt") AS last_session_at FROM profiles p LEFT JOIN session s ON
  s."userId" = p.id WHERE @search IS NULL OR p.email LIKE @search || '%' GROUP BY
  p.id ORDER BY p.created_at DESC LIMIT @limit OFFSET @offset` — adapt to D1
  quoting; note Better Auth tables are quoted-camelCase.
- **Validation:** repo test `tests/vitest/admin-users-repository.test.ts`.

### Task 1.5 — `src/lib/admin/audit.ts`
- **ID:** T-1.5. **Reqs:** FR-AUDIT-01. **Complexity:** S. **Class:** SEQUENTIAL-DEP (after 1.2).
- **Export:** `writeAdminAuditEvent({actor, action, targetType, targetId, summary, requestId})`.
- **Validation:** action test asserting exactly one row per call.

### Task 1.6 — `src/lib/admin/metric-cache.ts`
- **ID:** T-1.6. **Reqs:** ARCH-CACHE-01. **Complexity:** S. **Class:** SEQUENTIAL-DEP (after 1.3).
- **Exports:** `getMetricCache<T>(key): Promise<T|null>`;
  `setMetricCache(key, payload, ttlSeconds)`; `refreshIfStale(key, ttlSeconds, refresher)`.
- **Validation:** unit test cache hit/miss/stale.

### Task 1.7 — `src/lib/admin/incidents-repository.ts`
- **ID:** T-1.7. **Reqs:** FR-OVERVIEW-05. **Complexity:** S. **Class:** PARALLEL-SAFE.
- **Export:** `listOpenIncidents()` over `operational_incidents`.

### Task 1.8 — `src/lib/admin/health-probes.ts`
- **ID:** T-1.8. **Reqs:** FR-OVERVIEW-04. **Complexity:** M. **Class:** PARALLEL-SAFE.
- **Export:** `runAdminHealthProbes(env)` returning per-binding status. Reuse
  `getCloudflareD1Database()`, R2 head probe, queue metadata, email noop.

## Phase 2 — Realtime Durable Objects (presence + support)

**Objective:** live count + inbox push. **Reqs:** FR-OVERVIEW-01, FR-SUPPORT-02,
DATA-PRES-01, API-RT-01/02. **Prereqs:** Phase 0.

### Task 2.1 — `GlobalPresence` DO + router
- **ID:** T-2.1. **Reqs:** FR-OVERVIEW-01, DATA-PRES-01. **Complexity:** L. **Class:** SHARED-FILE (worker.ts).
- **New files:** `src/lib/cloudflare/global-presence.ts` (class `GlobalPresence`,
  SQLite-backed, Hibernation API: `webSocketMessage` handles `authorize` via
  Ed25519 token (reuse `realtime-room-token.ts` with a global topic);
  `getWebSockets(tag).length` → broadcast `{type:'presence', count}` debounced 1 s;
  optional alarm → Analytics Engine data point every 60 s).
- **Router:** `src/lib/cloudflare/global-presence-router.ts` (mirrors
  `collaboration-room-router.ts`) → `env.GLOBAL_PRESENCE.idFromName("global")`.
- **Worker wiring:** `worker.ts` route `/__cloudflare/global-presence` → router;
  `wrangler.jsonc` add `GLOBAL_PRESENCE` to `durable_objects.bindings` and
  `GlobalPresence` to `new_sqlite_classes` with migration tag `v1-presence`.
- **Token issuer:** extend `src/lib/collaboration/realtime-identity-server.ts`
  (or sibling) to issue a global-presence topic token for admins.
- **Validation:** DO unit test connect/disconnect/reconnect count;
  `bun run cf:typegen`; `wrangler dev` smoke.

### Task 2.2 — `SupportInbox` DO + router
- **ID:** T-2.2. **Reqs:** FR-SUPPORT-02, API-RT-02. **Complexity:** L. **Class:** SHARED-FILE.
- **New files:** `src/lib/cloudflare/support-inbox.ts` (class `SupportInbox`,
  per-conversation room `idFromName(conversationId)`); `src/lib/cloudflare/support-inbox-router.ts`.
- **Behavior:** `authorize` (admin or conversation owner); broadcast new
  messages; presence of typing indicator optional P2.
- **Worker wiring:** route `/__cloudflare/support-inbox/:conversationId`;
  `wrangler.jsonc` binding `SUPPORT_INBOX`.
- **Validation:** DO + integration test.

## Phase 3 — Admin shell + Overview + Users

**Objective:** visible dashboard. **Reqs:** UX-NAV-01, UX-STATE-01, ARCH-ROUTE-01,
FR-USERS-01, FR-OVERVIEW-02/04/05, PERF-OVERVIEW-01/BUNDLE-01. **Prereqs:** Phase 1.

### Task 3.1 — `recharts` dependency + chart wrappers
- **ID:** T-3.1. **Reqs:** PERF-BUNDLE-01. **Complexity:** S. **Class:** SHARED-FILE (package.json).
- **Change:** `bun add recharts`; `src/components/admin/AdminCharts.tsx` thin
  wrappers (Line/Bar/Area/Spark) themed to tokens; **dynamic-imported only**.
- **Validation:** `bun run build`; chunk size check ≤ 250 KB gzip admin chunk.

### Task 3.2 — Admin layout + shell + sidebar
- **ID:** T-3.2. **Reqs:** UX-NAV-01, ARCH-ROUTE-01, A11Y-KBD-01, A11Y-SR-01. **Complexity:** M. **Class:** SHARED-FILE.
- **New files:** `src/app/admin/layout.tsx` (Server Component:
  `getCurrentUserContext()` → `requireAdminContext()` → render shell or redirect);
  `src/components/admin/AdminShell.tsx`, `AdminSidebar.tsx`, `AdminHeader.tsx`;
  `src/stores/admin-ui-store.ts` (Zustand, collapsible sidebar).
- **Pages:** `src/app/admin/page.tsx` (Overview), `src/app/admin/users/page.tsx`.
- **Validation:** DOM test (renders sections, nav semantics); denial test.

### Task 3.3 — Overview data + tiles
- **ID:** T-3.3. **Reqs:** FR-OVERVIEW-02/04/05, PERF-OVERVIEW-01. **Complexity:** M. **Class:** SEQUENTIAL-DEP (after 3.2).
- **Hooks:** `src/hooks/use-global-presence.ts` (WS);
  `src/hooks/use-admin-metrics.ts` (TanStack Query `refetchInterval`, deferred
  via `requestIdleCallback` per notifications-hook pattern).
- **API routes:** `src/app/api/admin/metrics/signups/route.ts`,
  `src/app/api/admin/metrics/cloudflare/route.ts` (cache-first, degrade).
- **Components:** `AdminMetricCard.tsx`, `AdminPresenceCounter.tsx`,
  `AdminHealthStrip.tsx`, `AdminIncidentStrip.tsx`, `AdminAnalyticsTiles.tsx` (link-out for P0).
- **Validation:** repo + cache + DOM tests; perf evaluator (09).

### Task 3.4 — Users page
- **ID:** T-3.4. **Reqs:** FR-USERS-01, SEC-PII-01. **Complexity:** M. **Class:** SEQUENTIAL-DEP.
- **Files:** `src/app/admin/users/page.tsx` (Server Component fetches page);
  `src/components/admin/AdminUsersTable.tsx` (wraps `DataTable`); detail drawer
  `AdminUserDrawer.tsx` (P2 or minimal MVP).
- **API:** `src/app/api/admin/users/route.ts`.
- **Validation:** DOM + repo tests; PII bundle audit.

## Phase 4 — Support inbox (in-app chat)

**Objective:** Philip answers support from the dashboard. **Reqs:** FR-SUPPORT-01/02,
REL-INBOX-01/02. **Prereqs:** Phase 1 + 2.

### Task 4.1 — Support repositories + actions
- **ID:** T-4.1. **Reqs:** FR-SUPPORT-01, REL-INBOX-01/02. **Complexity:** L. **Class:** SHARED-FILE.
- **New files:** `src/lib/admin/support-repository.ts`
  (`listConversations`, `getConversationMessages`, `createConversation`,
  `appendMessage`, `markRead`); `src/lib/admin/support-actions.ts` (`"use server"`:
  `sendSupportReply`, `setConversationStatus`, `startConversation`).
- **Idempotency:** `client_message_id` UNIQUE; upsert on conflict.
- **Email:** `sendSupportReply` calls `EMAIL` binding; on failure set
  `send_status='send_failed'`, keep row, return error (REL-INBOX-02).
- **Audit:** every mutation → `writeAdminAuditEvent`.
- **Validation:** action tests (success, email-fail, idempotent resend, authz denial).

### Task 4.2 — Inbox UI
- **ID:** T-4.2. **Reqs:** FR-SUPPORT-01, UX-STATE-02, A11Y. **Complexity:** L. **Class:** SEQUENTIAL-DEP.
- **Files:** `src/app/admin/support/page.tsx`;
  `src/components/admin/AdminSupportInbox.tsx` (split list+thread);
  `AdminSupportThread.tsx`; `AdminSupportComposer.tsx`;
  `src/hooks/use-support-inbox.ts` (WS to `SupportInbox` DO).
- **Inbound widget (user side, minimal):** `src/components/support/SupportChatWidget.tsx`
  mounted on workshop pages behind flag `admin_support_realtime`; opens a
  conversation + connects to `SupportInbox` DO. (Keep minimal; this is the
  user-facing entrypoint.)
- **Validation:** DOM + WS integration test; browser proof recommended for the
  realtime send/receive flow (J3).

### Task 4.3 — API routes for support
- `src/app/api/admin/support/conversations/route.ts` (list);
  `src/app/api/admin/support/conversations/[id]/messages/route.ts` (thread).

## Phase 5 — Feature flags + Audit + Observability + Analytics tiles

**Objective:** operator controls + traceability. **Reqs:** FR-FLAGS-01/02,
FR-AUDIT-01/02, FR-ANALYTICS-01. **Prereqs:** Phase 1.

### Task 5.1 — Feature flags reader + UI
- **Files:** `src/lib/admin/feature-flags.ts` (full reader with TTL cache);
  `src/lib/admin/flag-actions.ts` (`setFeatureFlag` + audit);
  `src/app/admin/flags/page.tsx`; `src/components/admin/AdminFlagsList.tsx`.
- **Validation:** action + repo + DOM tests.

### Task 5.2 — Audit viewer
- **Files:** `src/lib/admin/audit-repository.ts` (`listAuditEvents`);
  `src/app/admin/audit/page.tsx`; `src/components/admin/AdminAuditTable.tsx`.
- **Validation:** repo + DOM tests.

### Task 5.3 — Observability page
- **Files:** `src/app/admin/observability/page.tsx` — links to CF Workers
  Observability, `wrangler tail` how-to, local dev-log badge.
- **Validation:** DOM test; no production-log claims.

### Task 5.4 — Analytics tiles (link-out MVP; read-tiles BLOCKED-EXTERNAL)
- **Files:** `src/app/admin/analytics/page.tsx`; extend `AdminAnalyticsTiles.tsx`.
- **Behavior:** link-out to CF Web Analytics / Clarity / GA4; cached-metric
  tiles wired only when secrets present (FR-ANALYTICS-02/03 gated OPEN-1/2/3).
- **Validation:** DOM + degrade test.

## Phase 6 — Hardening, perf, docs, rollback readiness

**Objective:** production-grade operator surface. **Reqs:** SEC-RATE-01,
PERF-OVERVIEW-01/BUNDLE-01, REL-DEGRADE-01, DOC-RUNBOOK-01, DOC-STATE-01.

### Task 6.1 — Rate-limit bindings
- `wrangler.jsonc` add `ratelimit` bindings `ADMIN_LOGIN_LIMIT`, `ADMIN_WRITE_LIMIT`;
  apply in admin routes/actions.

### Task 6.2 — Perf gate + bundle audit
- Run evaluator (09); record `logs/admin-perf-baseline.md`; verify thresholds.

### Task 6.3 — Consolidate `philipjonlewis@gmail.com` literals
- Replace the 4 literals (03 audit) with `isPlatformAdminEmail` calls;
  behavior-preserving; separately landable.

### Task 6.4 — Runbook + state update
- `src/app/admin/README.md` (or `.ai/.../admin-runbook.md`): env vars, secrets,
  Access setup, DO behavior, rollback, provider-credential steps.
- `.ai/10_state/current-state.md` append.

### Task 6.5 — DSAR extension (support data)
- Extend `privacy_requests` handling to include `support_conversations`/`support_messages`
  for export/erasure (tie to existing DSAR flow). P2 but tracked.

## Phase 7 — Optional owner-gated reads (BLOCKED-EXTERNAL)

Only after OPEN-1/2/3 resolved:
- `src/lib/admin/ga4-client.ts` (service-account JWT, `googleapis`, daily cache).
- `src/lib/admin/clarity-client.ts` (Data Export API, ≤10/day, daily cache).
- `src/lib/admin/cloudflare-analytics-client.ts` (GraphQL, scoped token).

Only after OPEN-5 resolved:
- `src/lib/cloudflare/support-email-worker.ts` (`postal-mime` → conversation).

Only after OPEN-4 resolved:
- Wire CF Access JWT validation in `request-proxy.ts` + runbook.

## Durable-goal ledger (per phase)

| Goal | Objective | Scope | Reqs | Evidence | Stop | Blocker | Review | QA |
|---|---|---|---|---|---|---|---|---|
| G-ADMIN-0 | Email gate + kill switch | Phase 0 | FR-AUTH-01, OPS-FLAG-01 | roles test, denial test | gate proven | owner locked out → dev bypass | roles.ts review | TEST-AUTH-01 |
| G-ADMIN-1 | Data layer | Phase 1 | DATA-*, FR-USERS-01, FR-OVERVIEW-02/04/05, FR-AUDIT-01 | repo tests, d1 read-back | repos green | migration conflict | repo review | repo tests |
| G-ADMIN-2 | Realtime DOs | Phase 2 | FR-OVERVIEW-01, FR-SUPPORT-02 | DO tests, ws smoke | count+push proven | DO migration tag | cloudflare review | TEST-DO-01 |
| G-ADMIN-3 | Shell+Overview+Users | Phase 3 | UX-*, ARCH-ROUTE-01, PERF-* | DOM+perf+bundle | budgets met | recharts too heavy | ui review | perf gate |
| G-ADMIN-4 | Support inbox | Phase 4 | FR-SUPPORT-*, REL-INBOX-* | action+ws tests | reply+idempotency proven | email binding fails | inbox review | TEST-INBOX-01 |
| G-ADMIN-5 | Flags+Audit+Obs+Analytics | Phase 5 | FR-FLAGS-*, FR-AUDIT-*, FR-ANALYTICS-01 | action+DOM tests | toggles+audit proven | n/a | review | tests |
| G-ADMIN-6 | Hardening | Phase 6 | SEC-RATE-01, PERF-*, DOC-* | perf+bundle+runbook | gates green | n/a | review | tests |
| G-ADMIN-7 | Owner-gated reads | Phase 7 | FR-ANALYTICS-02/03, FR-SUPPORT-03, FR-AUTH-03 | provider read-back | tiles render | OPEN-1..5 | owner | provider proof |

## Discovery/blocked tasks

- All Phase 7 tasks are `BLOCKED-EXTERNAL` (OPEN-1..5) — options/recommendations
  in `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md`.
- No `BLOCKED-ARCHITECTURE` or `BLOCKED-EVIDENCE` tasks remain; all P0 paths
  have exact target paths/symbols.

## Phase 5+ observability expansion (added 2026-07-09)

Per [`27_OBSERVABILITY_DEEP_DIVE.md`](27_OBSERVABILITY_DEEP_DIVE.md), Phase 5
gains these additional tasks (all PARALLEL-SAFE after Phase 1):

- **T-5.5** `cron_run_events` migration (`0045`) + reader + AdminCronHealth component (FR-OBS-03).
- **T-5.6** `client_error_events` migration (`0046`) + reader + AdminClientErrors (FR-OBS-05).
- **T-5.7** `web_vital_events` migration (`0047`) + reader + AdminWebVitals (FR-OBS-06).
- **T-5.8** `ops_run_events` migration (`0048`) + reader + AdminBackupStatus (FR-OBS-10).
- **T-5.9** Queue/DLQ viewer (FR-OBS-04; OPEN-8 deferred — CLI CTA fallback).
- **T-5.10** Free-tier consumption gauge (FR-OBS-07; gated by OPEN-3).
- **T-5.11** Uptime strip (FR-OBS-01).
- **T-5.12** Data residency static tile (FR-OBS-11).
- **T-5.13** Mass-op audit viewer tab (FR-AUDIT-03).
- **T-5.14** CSV export actions (FR-USERS-04, FR-AUDIT-04).
- **T-5.15** DSAR queue viewer tab (FR-OPS-01).
- **T-5.16** Onboarding funnel tile (FR-OVERVIEW-06).
- **T-5.17** Closed-beta funnel tile (FR-OVERVIEW-07).
- **T-5.18** Session-health tile (FR-USERS-03).

## Phase 6+ maintenance mode (added 2026-07-09)

- **T-6.6** Add `admin_maintenance_mode` flag to feature_flags seed (`0042`).
- **T-6.7** `proxy.ts` honors the flag (503 for `/workshop/*` mutations).
- **T-6.8** `AdminMaintenanceModeToggle.tsx` with confirmation dialog.

## Migration inventory updated (added 2026-07-09)

Per `27`, the plan now uses 8 migrations instead of 4:

- `0041` support conversations/messages (original)
- `0042` feature_flags (original; seed extended for `admin_maintenance_mode`)
- `0043` admin_audit_events (original)
- `0044` admin_metric_cache (original)
- `0045` cron_run_events (new)
- `0046` client_error_events (new)
- `0047` web_vital_events (new)
- `0048` ops_run_events (new)

Migration `0048` is the highest number; future plans start at `0049`.
