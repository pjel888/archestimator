# 04 — Requirements Specification

Stable IDs. Each requirement: statement, rationale, source/strength, priority,
dependencies, acceptance criteria, validation, affected areas, risks, status.
Priorities: `P0` (must for MVP), `P1` (should for MVP), `P2` (phase 2 / defer-ready).

Legend: `source_strength` ∈ {`brief`, `repo evidence`, `official docs`,
`provider proof`, `assumption`, `derived`, `owner-delegated decision`}.

---

## FR — Functional requirements

### FR-AUTH-01 — Single-admin Google OAuth access
**Statement:** The admin area is reachable only by a signed-in user whose email
is in the `PLATFORM_ADMIN_EMAILS` allowlist (default `philipjonlewis@gmail.com`)
AND whose platform role is `ceo` or `admin`.
**Rationale:** Sole operator; no other human should reach admin surfaces.
**Source:** brief. **Priority:** P0. **source_strength:** `brief` + `repo evidence`.
**Dependencies:** none. **Acceptance:**
- Non-allowlisted authenticated user hitting `/admin` → redirected to `/access-required`.
- Anonymous user hitting `/admin` → redirected to `/login?next=/admin`.
- Allowlisted+admin user → renders admin shell.
**Validation:** role-matrix denial + allow tests (`tests/vitest/admin-access.test.ts`).
**Affected:** `src/lib/auth/roles.ts`, `src/lib/auth/request-proxy.ts`, `src/app/admin/layout.tsx`.
**Risks:** misconfigured env silently locks out the owner → mitigated by dev-bypass fallback (`ARCHESTIMATOR_DEV_AUTH_EMAIL`). **Status:** pending.

### FR-AUTH-02 — Per-endpoint authz
**Statement:** Every `/api/admin/*` route and admin Server Action calls
`requireCurrentUserContext()` then checks `isPlatformAdminRole(context.role) ||
isPlatformAdminEmail(context.email)` before any read/write.
**Rationale:** Server Actions are directly reachable POST endpoints (AGENTS rule).
**Source:** derived. **Priority:** P0. **source_strength:** `derived` + `repo evidence`.
**Dependencies:** FR-AUTH-01. **Acceptance:** direct POST to an admin action with a
non-admin session returns 403/redirect, not data. **Validation:** denial tests.
**Affected:** all `src/lib/admin/*-actions.ts`, `src/app/api/admin/*/route.ts`.
**Risks:** missing a gate on one endpoint → checklist + test. **Status:** pending.

### FR-AUTH-03 — Optional Cloudflare Access edge gate
**Statement:** When `ADMIN_CLOUDFLARE_ACCESS_ENABLED=true`, `/admin` is also gated
by Cloudflare Access (Zero Trust) OTP allowlist; the app validates the
`Cf-Access-Jwt-Assertion` header when present.
**Rationale:** Defense-in-depth; drops unauthenticated traffic at the edge
(research Q2/Q7). **Source:** official docs (Cloudflare Access). **Priority:** P1.
**source_strength:** `official docs`. **Dependencies:** OPEN-4 (owner). **Acceptance:**
with the flag on and Access configured, a request without a valid Access JWT is
rejected at the edge before the Worker renders. **Validation:** hosted proof
(BLOCKED-EXTERNAL). **Affected:** `wrangler.jsonc` (no binding needed; Access is
DNS/edge), `src/lib/auth/request-proxy.ts` (optional header check).
**Risks:** misconfiguration locks out owner → gate behind env flag, document
runbook. **Status:** BLOCKED-EXTERNAL (OPEN-4).

### FR-OVERVIEW-01 — Realtime users-online count
**Statement:** The overview shows "users online now", updated at most every 5 s,
sourced from a `GlobalPresence` Durable Object tracking live WebSocket
connections (Hibernation API `getWebSockets()`).
**Rationale:** Direct ask ("amount of users using the platform at any given time").
**Source:** brief. **Priority:** P0. **source_strength:** `brief` + `official docs` (DO).
**Dependencies:** DATA-PRES-01. **Acceptance:** count reflects currently-connected
authenticated users within 5 s of join/leave; degrades to last-known value if DO
unreachable. **Validation:** DO unit test (connect/disconnect count) + integration.
**Affected:** new `src/lib/cloudflare/global-presence.ts` (DO class),
`src/hooks/use-global-presence.ts`, `worker.ts` DO routing.
**Risks:** DO single-instance hot spot → fine at solo-dev scale; document cardinality.
**Status:** pending.

### FR-OVERVIEW-02 — Recent signups
**Statement:** Overview shows the last N (default 10) signups and a 7/30-day
signup count, sourced from `user`/`profiles`.
**Rationale:** Operator visibility into growth. **Source:** derived. **Priority:** P0.
**source_strength:** `derived`. **Acceptance:** list shows email, display name, created
timestamp; count matches `COUNT(*)` over the window. **Validation:** repository unit test.
**Affected:** `src/lib/admin/users-repository.ts`, `/api/admin/metrics/signups`.
**Status:** pending.

### FR-OVERVIEW-03 — Request/error trend (CF Analytics)
**Statement:** Overview shows a 24 h request and error-rate trend pulled from the
Cloudflare GraphQL Analytics API (`httpRequestsAdaptiveGroups`), cached daily.
**Rationale:** "a lot of data from cloudflare". **Source:** brief. **Priority:** P1.
**source_strength:** `brief` + `official docs` (GraphQL API). **Dependencies:**
OPEN-3 (CF Analytics token). **Acceptance:** tile renders cached counts; on token
missing/quota hit → degrades to "View in Cloudflare" link. **Validation:** provider
read-back (BLOCKED-EXTERNAL) + cache fallback test. **Affected:**
`src/lib/admin/cloudflare-analytics-client.ts`, `/api/admin/metrics/cloudflare`.
**Risks:** free-tier dataset limits → essential datasets documented as free (research Q4).
**Status:** BLOCKED-EXTERNAL (OPEN-3).

### FR-OVERVIEW-04 — D1/R2/Queue/Email health summary
**Statement:** Overview shows a health strip: D1 read latency probe, R2 reachability,
Queue depth (`UPLOAD_JOBS_QUEUE`), Email binding reachability, last cron outcome.
**Rationale:** Operator one-glance health. **Source:** derived. **Priority:** P1.
**source_strength:** `derived`. **Acceptance:** each cell shows ok/degraded/down with
a timestamp; failures do not block the rest of the page. **Validation:** unit test
per probe + degraded-mode test. **Affected:** `src/lib/admin/health-probes.ts`.
**Status:** pending.

### FR-OVERVIEW-05 — Incident strip
**Statement:** Overview shows open `operational_incidents` (sev1/2/3) newest first.
**Rationale:** Surface fires. **Source:** repo evidence (`migrations/0040`).
**Priority:** P1. **source_strength:** `repo evidence`. **Acceptance:** strip lists
open incidents with severity + opened-at; empty state shows "No open incidents".
**Validation:** repository test. **Affected:** `src/lib/admin/incidents-repository.ts`.
**Status:** pending.

### FR-USERS-01 — User table
**Statement:** `/admin/users` renders a paginated, searchable table of users
(email, display name, role, created, last-session) via `DataTable<T>`.
**Rationale:** "view the current number of users etc". **Source:** brief.
**Priority:** P0. **source_strength:** `brief`. **Acceptance:** search by email
prefix; pagination ≤ 50 rows/page; last-session derived from `session` table;
email/PII rendered server-side only. **Validation:** DOM test + repository test.
**Affected:** `src/app/admin/users/page.tsx`, `src/lib/admin/users-repository.ts`.
**Status:** pending.

### FR-USERS-02 — User detail drawer
**Statement:** Selecting a user opens a drawer with profile, recent sessions,
workspace memberships, and a "view in closed-beta allowlist" link.
**Rationale:** Operator investigation. **Source:** derived. **Priority:** P2.
**source_strength:** `derived`. **Acceptance:** drawer loads within 800 ms; no
mutation (read-only MVP). **Validation:** DOM test. **Status:** pending.

### FR-SUPPORT-01 — Conversation list + thread + reply
**Statement:** `/admin/support` shows a conversation list; selecting one shows the
message thread; Philip can compose a reply that sends via the `EMAIL` binding and
appends to the thread.
**Rationale:** "chat inbox there because i will serve as the customer support".
**Source:** brief. **Priority:** P0. **source_strength:** `brief`. **Acceptance:**
reply appears in-thread optimistically; email send failure surfaces an error and
keeps the draft; conversation status is visible (open/pending/resolved).
**Validation:** action test (success + email-failure path) + DOM test.
**Affected:** `src/app/admin/support/page.tsx`, `src/lib/admin/support-actions.ts`,
`src/lib/admin/support-repository.ts`, `migrations/0041_support_conversations.sql`.
**Status:** pending.

### FR-SUPPORT-02 — Realtime inbound messages
**Statement:** New inbound messages appear in the open conversation within 5 s
without a full reload, via the `SupportInbox` Durable Object (WebSocket).
**Rationale:** Live support. **Source:** derived. **Priority:** P1.
**source_strength:** `derived`. **Acceptance:** an inbound message from a user's
chat widget reaches the admin thread within 5 s; reconnection restores state.
**Validation:** DO + hook integration test. **Affected:** new DO class, client hook.
**Status:** pending.

### FR-SUPPORT-03 — Email-to-ticket (Phase 2)
**Statement:** Inbound email to `support@archestimator...` (Cloudflare Email
Routing) is parsed (`postal-mime`) and appended to/mints a conversation; replies
in the dashboard send via the `EMAIL` binding.
**Rationale:** Unify email support into the inbox. **Source:** derived.
**Priority:** P2. **source_strength:** `derived` + `official docs` (Email Worker).
**Dependencies:** OPEN-5. **Acceptance:** inbound email → new/updated conversation
row; reply sends outbound email. **Validation:** Email Worker test + provider proof.
**Affected:** new `src/lib/cloudflare/support-email-worker.ts`, `postal-mime` dep.
**Status:** BLOCKED-EXTERNAL (OPEN-5).

### FR-ANALYTICS-01 — Embed/link analytics providers
**Statement:** `/admin/analytics` surfaces Cloudflare Web Analytics, Microsoft
Clarity, and GA4 via deep links (and iframes where the provider permits), plus
cached server-side metrics when credentials exist.
**Rationale:** "Microsoft clarity, google analytics, things like that". **Source:**
brief. **Priority:** P1. **source_strength:** `brief`. **Acceptance:** each tile
links to the provider dashboard; cached metric tiles show last-refresh time.
**Validation:** DOM test + cache fallback test. **Affected:** `src/app/admin/analytics/page.tsx`.
**Status:** pending (link-out); read-tiles BLOCKED-EXTERNAL (OPEN-1/2/3).

### FR-ANALYTICS-02 — GA4 server-side pull (owner-gated)
**Statement:** When `GA4_DATA_API_CREDENTIALS_JSON` secret is set, the dashboard
pulls a daily report via the GA4 Data API (`runReport`) with a service-account
JWT, cached in D1, refreshed ≤ 1/day.
**Rationale:** Surface GA data in-dashboard. **Source:** official docs (GA4 Data API).
**Priority:** P2. **source_strength:** `official docs`. **Dependencies:** OPEN-1.
**Acceptance:** tile renders cached GA4 metrics; missing creds → link-out only.
**Validation:** provider read-back (BLOCKED-EXTERNAL). **Affected:** `src/lib/admin/ga4-client.ts`.
**Status:** BLOCKED-EXTERNAL (OPEN-1).

### FR-ANALYTICS-03 — Clarity server-side pull (owner-gated)
**Statement:** When `CLARITY_DATA_API_TOKEN` is set, pull dashboard metrics via the
Clarity Data Export API (≤ 10 calls/day, 1–3 day lookback), cached daily.
**Rationale:** Surface Clarity data. **Source:** official docs (Clarity Export API).
**Priority:** P2. **source_strength:** `official docs`. **Dependencies:** OPEN-2.
**Acceptance:** tile renders cached Clarity metrics; respects 10/day quota; missing
token → link-out. **Validation:** provider read-back. **Affected:** `src/lib/admin/clarity-client.ts`.
**Status:** BLOCKED-EXTERNAL (OPEN-2).

### FR-FLAGS-01 — Feature flags table + reader
**Statement:** A `feature_flags` table (key, enabled, description, updated_at,
updated_by) is the system of record; a cached server reader
(`getFeatureFlag(key)`) returns the value with a short TTL, falling back to env
defaults.
**Rationale:** Zero-redeploy toggles for a solo dev. **Source:** derived.
**Priority:** P1. **source_strength:** `derived`. **Acceptance:** flag change in
admin UI is visible to the app within TTL; reader never throws (defaults false).
**Validation:** repository + cache test. **Affected:** `migrations/0042_feature_flags.sql`,
`src/lib/admin/feature-flags.ts`. **Status:** pending.

### FR-FLAGS-02 — Feature flags admin UI
**Statement:** `/admin/flags` lists flags with toggle switches; toggling writes an
audit row and refreshes the cache.
**Rationale:** Operator control. **Source:** derived. **Priority:** P1.
**source_strength:** `derived`. **Acceptance:** toggle persists; audit row written;
undo via re-toggle. **Validation:** action + DOM test. **Status:** pending.

### FR-AUDIT-01 — Admin-action audit log
**Statement:** Every state-changing admin action writes an `admin_audit_events`
row (actor user id, email, action, target_type, target_id, before/after summary,
request_id, created_at) and is viewable at `/admin/audit`.
**Rationale:** Security baseline (research Q7). **Source:** derived. **Priority:** P1.
**source_strength:** `derived`. **Acceptance:** each mutation produces exactly one
audit row; viewer paginates and filters by action/actor. **Validation:** action test
+ repository test. **Affected:** `migrations/0043_admin_audit_events.sql`,
`src/lib/admin/audit.ts`. **Status:** pending.

### FR-AUDIT-02 — Observability links
**Statement:** `/admin/observability` links to Cloudflare Workers Observability,
documents `wrangler tail`, and shows the most recent `logs/dev.ndjson` summary
(local-dev only badge).
**Rationale:** Operator debugging. **Source:** derived. **Priority:** P2.
**source_strength:** `derived`. **Acceptance:** links open correct CF dashboards;
no claim of production log proof from local logs. **Validation:** DOM test.
**Status:** pending.

---

## UX — User-experience requirements

### UX-NAV-01 — Admin sidebar with 6 sections
Overview, Users, Support, Analytics, Feature Flags, Audit/Observability. Phosphor
icons. Matches existing token palette. **Priority:** P0.
### UX-STATE-01 — Loading/empty/error states per section
Skeletons during load; empty states with CTAs; error states with retry. **Priority:** P0.
### UX-STATE-02 — Support inbox realtime badge
Unread conversation count badge on the Support nav item, updated on realtime
events. **Priority:** P1.
### UX-RESP-01 — Responsive admin
Usable from 360 px to 1440 px+; tables collapse sensibly on narrow screens. **Priority:** P1.

---

## A11Y — Accessibility requirements

### A11Y-KBD-01 — Full keyboard operability
Every admin control reachable + operable by keyboard; visible focus ring using
`--focus` token. **Priority:** P0.
### A11Y-SR-01 — Semantic roles + names
Tables use `DataTable` semantics; nav is `<nav aria-label>`; live count uses
`aria-live="polite"`. **Priority:** P0.
### A11Y-CONTRAST-01 — Status cues non-color-only
Status badges pair color with icon/text (reuse `StatusBadge`). **Priority:** P1.
### A11Y-MOTION-01 — Reduced-motion
No auto-playing motion; respect `prefers-reduced-motion`. **Priority:** P1.

---

## ARCH — Architecture requirements

### ARCH-ROUTE-01 — `src/app/admin/` route group
New flat route group (no `(admin)` parentheses; repo convention is flat). Layout
Server Component gates with `getCurrentUserContext()` + admin check. **Priority:** P0.
### ARCH-DO-01 — Two new Durable Objects
`GlobalPresence` (live count) and `SupportInbox` (per-conversation WS room),
both SQLite-backed, registered in `wrangler.jsonc` `new_sqlite_classes` and routed
in `worker.ts`. **Priority:** P0 (presence) / P1 (support DO).
### ARCH-CACHE-01 — Short-TTL server cache for metrics
D1-backed cache table for CF/GA4/Clarity pulls with `expires_at`; readers serve
cache then refresh async on miss (stale-while-revalidate). **Priority:** P1.
### ARCH-POLL-01 — TanStack Query polling
Metrics hooks use `refetchInterval` (new but idiomatic) with `staleTime`; defer
via `requestIdleCallback` pattern from notifications hook. **Priority:** P0.

---

## DATA — Data requirements (see 07 for blueprints)

### DATA-SUPPORT-01 — `support_conversations` + `support_messages`
Migration `0041`. Conversations: id, user_id, subject, status, channel
(`in_app`|`email`), created_at, updated_at, last_message_at. Messages: id,
conversation_id, sender_role (`user`|`admin`|`system`), body_text, body_html,
email_message_id (for threading), created_at. Indexes on user_id, status,
(conversation_id, created_at). **Priority:** P0.
### DATA-FLAGS-01 — `feature_flags` table
Migration `0042`. key PK, enabled BOOL, description, updated_at, updated_by. **Priority:** P1.
### DATA-AUDIT-01 — `admin_audit_events` table
Migration `0043`. id, actor_user_id, actor_email, action, target_type,
target_id, summary_json, request_id, created_at. Index on (actor_user_id, created_at),
(action, created_at). **Priority:** P1.
### DATA-METRICS-01 — `admin_metric_cache` table
key PK, payload_json, fetched_at, expires_at. **Priority:** P1.
### DATA-PRES-01 — `GlobalPresence` DO
SQLite-backed DO; `getWebSockets().length` is the live count; optional
`presence-heartbeat` Analytics Engine mirror. **Priority:** P0.

---

## API — API requirements

### API-ADMIN-01 — `/api/admin/metrics/*` routes
`force-dynamic`, `requireCurrentUserContext()` + admin gate,
`Cache-Control: private, no-store`, JSON DTOs. Routes: `/signups`, `/cloudflare`,
(`/ga4`, `/clarity` when creds). **Priority:** P0/P1.
### API-ADMIN-02 — Admin Server Actions
Colocated `src/lib/admin/*-actions.ts`, `"use server"`, each gated. Mutations
write audit rows. **Priority:** P0.
### API-RT-01 — Presence WebSocket path
`/__cloudflare/global-presence` upgrade → `GlobalPresence` DO (auth via Ed25519
token, existing pattern). **Priority:** P0.
### API-RT-02 — Support WebSocket path
`/__cloudflare/support-inbox/<conversationId>` upgrade → `SupportInbox` DO. **Priority:** P1.

---

## SEC — Security requirements (see 08 for threat model)

### SEC-AUTHZ-01 — Layered admin gate (see FR-AUTH-01/02/03). **Priority:** P0.
### SEC-PII-01 — No raw PII in client bundles
Admin user tables render server-side; client receives only the rendered/paginated
DTO; mark modules `server-only`. **Priority:** P0.
### SEC-SECRET-01 — Secrets as Wrangler secrets only
GA4 creds JSON, Clarity token, CF Analytics token, `REALTIME_IDENTITY_SIGNING_KEY`
(existing) — never in `wrangler.jsonc` plaintext or `NEXT_PUBLIC_*`. **Priority:** P0.
### SEC-RATE-01 — Rate-limit admin endpoints
`ratelimit` binding (GA, free) on admin login attempts + write actions. **Priority:** P1.
### SEC-AUDIT-01 — Audit every mutation (see FR-AUDIT-01). **Priority:** P1.
### SEC-CSP-01 — CSP allows Clarity/GA/CF beacon (already wired on public site)
Confirm admin layout inherits or intentionally restricts third-party scripts. **Priority:** P1.

---

## PERF — Performance requirements (see 09 for evaluator)

### PERF-OVERVIEW-01 — Overview TTFB ≤ 600 ms p95 at ≤ 1000 users. **Priority:** P0.
### PERF-PRES-01 — Presence count fresh ≤ 5 s. **Priority:** P0.
### PERF-TILE-01 — Each analytics tile loads ≤ 2 s or degrades to link. **Priority:** P1.
### PERF-BUNDLE-01 — Admin route client JS ≤ 250 KB gzipped (recharts is the main cost; code-split). **Priority:** P1.

---

## REL — Reliability requirements

### REL-DEGRADE-01 — Graceful degradation
Every external-provider tile degrades to a link on failure/missing creds. **Priority:** P0.
### REL-INBOX-01 — At-least-once message delivery
Inbound support messages are idempotent by `(conversation_id, client_message_id)`;
reconnect replays nothing duplicated. **Priority:** P0.
### REL-INBOX-02 — Reply failure surfaces error
Email-send failure keeps the draft and shows a retryable error. **Priority:** P0.

---

## OPS — Operational requirements

### OPS-FLAG-01 — All new behavior behind `ADMIN_DASHBOARD_ENABLED` until ready. **Priority:** P0.
### OPS-MIG-01 — Migrations `0041`–`0043` ordered, idempotent, reversible. **Priority:** P0.
### OPS-DO-01 — DO migrations tagged; rollback = disable route + DO binding. **Priority:** P1.
### OPS-MON-01 — Admin errors logged via `emitLogRecord` (existing). **Priority:** P1.

---

## TEST — Testing requirements (see 12 for matrix)

### TEST-AUTH-01 — Role-matrix + denial tests for `/admin` and each `/api/admin/*`. **Priority:** P0.
### TEST-DO-01 — `GlobalPresence` connect/disconnect/reconnect tests. **Priority:** P0.
### TEST-INBOX-01 — Conversation send/reply + email-failure path + idempotency tests. **Priority:** P0.
### TEST-METRIC-01 — Metrics repository + cache fallback tests. **Priority:** P1.

---

## DOC — Documentation requirements

### DOC-RUNBOOK-01 — `src/app/admin/README.md` (or `.ai` ops note) covering
env vars, secrets, Access setup, DO behavior, rollback. **Priority:** P1.
### DOC-STATE-01 — Update `.ai/10_state/current-state.md` on completion. **Priority:** P1.

---

## Shadow Path Matrix (representative flows)

| Flow | Happy | Nil/missing | Empty | Invalid | Auth denied | Upstream err | Race | Retry/idempotency | UX result | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| Admin route load | shell renders | n/a | empty states | n/a | redirect `/access-required` | error state | n/a | n/a | shell or redirect | TEST-AUTH-01 |
| Signups metric | list+count | 0 count | empty list | n/a | 403 | cached/empty | stale cache | TTL refresh | list or degraded | TEST-METRIC-01 |
| CF Analytics pull | trend tile | link-out | empty trend | bad token | 403 | link-out | n/a | daily refresh | tile or link | TEST-METRIC-01 |
| Presence count | live int | 0 | n/a | n/a | no WS | last-known | concurrent joins | reconnect-safe | int or stale | TEST-DO-01 |
| Send support reply | appended+email | body empty→validation | n/a | body>limit | 403 | EMAIL fail→draft kept | double-send | client_msg_id dedupe | success or retry | TEST-INBOX-01 |
| Toggle feature flag | on/off+audit | flag missing | n/a | bad key | 403 | n/a | concurrent toggle | last-write-wins + audit | toggle+audit | TEST-AUTH-01 |
