# 27 — Observability Deep Dive

**Created:** 2026-07-09 (Asia/Manila)
**Purpose:** Expand the thin observability surface in `09` to cover the
operator telemetry that an admin dashboard should expose — cron health,
queue DLQ, client errors, web vitals, free-tier consumption, backup
status, on-call config indicator, maintenance mode, data residency.
Closes GAP-7 from `20`. Implements the `adopt-MVP` items from `21`.

This is planning-only. No code, infra, or provider state changes.

---

## 27.1 Why this doc exists

The original `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md` is 89 lines and
covers performance budgets + failure modes + logging. It does **not** cover
the **operator telemetry surface** that the admin dashboard itself should
expose. As the operator dashboard, the admin is the natural home for
visibility into:

- Cron job health (3 crons run daily)
- Queue + DLQ depth (`UPLOAD_JOBS_QUEUE`)
- Client-side error trends (`client-error-report.ts` exists)
- Field Web Vitals (RUM via `useReportWebVitals`)
- Free-tier consumption (Cloudflare limits)
- Backup verification status (`cf:d1-restore-rehearsal`)
- On-call alert config indicator (`OPERATIONAL_INCIDENT_ALERTS_*`)
- Maintenance mode (master switch)
- Data residency (display only)
- Mass-deletion audit events
- DSAR queue (`privacy_requests`)

These are facets 1, 4, 5, 6, 7, 8, 9, 10, 12, 14, 17, 23, 32 from `21` —
all marked `adopt-MVP`. This doc specifies how each is implemented,
sourced, and surfaced.

---

## 27.2 Observability surface inventory

| Surface | Req ID | Source (existing or new) | Refresh | Tile placement | Cost |
|---|---|---|---|---|---|
| Uptime strip (24h) | FR-OBS-01 | Derived from `operational_incidents` + alert scenario S-01 last fire | 60s poll | Overview | Free (D1 read) |
| Incident-alert config indicator | FR-OBS-02 | `OPERATIONAL_INCIDENT_ALERTS_ENABLED` env (read-only display) | On load | Observability | Free |
| Cron health strip | FR-OBS-03 | New: derived from `cronfire` events or Workers Logs query | 5 min | Observability | Free (assumes capture path) |
| Queue + DLQ viewer | FR-OBS-04 | `wrangler queues` API + DLQ count | 30s | Observability | Free |
| Client-error trend | FR-OBS-05 | New: aggregate from existing client-error-report.ts sink | 5 min | Observability | Free |
| Web Vitals field tile | FR-OBS-06 | New: aggregate from useReportWebVitals (already wired) | 1 hour | Observability | Free |
| Free-tier consumption gauge | FR-OBS-07 | Cloudflare GraphQL Analytics API (same as FR-OVERVIEW-03) | 1 hour | Observability | Free (OPEN-3 token) |
| Security-alerts link-out | FR-OBS-08 | External: GitHub Dependabot / CodeQL | n/a | Observability | Free |
| Query-perf link-out | FR-OBS-09 | External: existing `bun run perf:*` scripts | n/a | Observability | Free |
| Backup status indicator | FR-OBS-10 | New: record of last successful `cf:d1-restore-rehearsal` | On run | Observability | Free |
| Data-residency info tile | FR-OBS-11 | Static: from `wrangler.jsonc` deployment region | On load | Observability | Free |
| Mass-op audit viewer | FR-AUDIT-03 | `mass_deletion_events` (migration `0023`) | On load | Audit tab | Free |
| Audit CSV export | FR-AUDIT-04 | Generated in-memory from audit rows | On demand | Audit page | Free |
| DSAR queue viewer | FR-OPS-01 | `privacy_requests` (migration `0033`) | 30s | Audit tab | Free |
| Maintenance mode flag | FR-OPS-02 | New `admin_maintenance_mode` flag (DATA-FLAGS-01 extends) | On toggle | Observability | Free |
| Onboarding funnel tile | FR-OVERVIEW-06 | `user_onboarding_profiles` (migration `0005`) | 1 hour | Overview | Free |
| Closed-beta funnel tile | FR-OVERVIEW-07 | `closed_beta_allowed_emails` + audit events | 1 hour | Overview | Free |
| Session-health tile | FR-USERS-03 | `session` + `account` (Better Auth tables) | 60s | Users | Free |
| Users CSV export | FR-USERS-04 | Generated in-memory from user rows | On demand | Users page | Free |

All surfaces are free-tier, no new providers, no paid add-ons. Total: 19
new adopt-MVP reqs (matches `21` §21.3).

---

## 27.3 Cron health (FR-OBS-03)

### Source

There is no `cronfire` or built-in cron-history table today. Two options:

**Option A (recommended MVP): record cron outcomes in D1.**
- Extend each cron's internal route handler (`/api/internal/upload-cleanup`,
  `/api/internal/upload-scan`, retention pass) to INSERT a row into a new
  `cron_run_events` table (migration `0045_cron_run_events.sql`, future).
- Schema:
  ```sql
  CREATE TABLE IF NOT EXISTS cron_run_events (
    id TEXT PRIMARY KEY,
    cron_name TEXT NOT NULL,         -- "upload-cleanup"
    cron_expression TEXT NOT NULL,   -- "0 3 * * *"
    started_at TEXT NOT NULL,
    completed_at TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('ok','failed','timeout')),
    error_summary TEXT,
    rows_affected INTEGER
  );
  CREATE INDEX idx_cron_run_name_started ON cron_run_events(cron_name, started_at DESC);
  ```
- Reader: `getCronHealth()` returns last `status='ok'` per cron name +
  the `started_at` timestamp.

**Option B (defer post-MVP): Workers Logs query.**
- Cloudflare Workers Logs has invocation logs that include cron triggers.
- The admin would call a Cloudflare API to read these. But this requires
  the GraphQL Analytics token (OPEN-3) and is harder to query.

**Decision:** Option A (D1-backed) — free, fast, deterministic. Migration
`0045` becomes a 5th migration (was 4 in original `07`).

### Surface

`AdminCronHealth.tsx` (Server Component) reads `getCronHealth()` and
renders a list:

```
0 3 * * *  upload-cleanup   ● ok  last: today 03:00 UTC
15 3 * * * upload-scan      ● ok  last: today 03:15 UTC
30 3 * * * retention        ● ok  last: today 03:30 UTC
```

Failed crons render red with the error summary on hover.

### Cardinality

3 crons × 1 row per run = ~3 rows/day. Trivial.

### Rollback

`DROP TABLE cron_run_events;` — safe (new table).

---

## 27.4 Queue + DLQ (FR-OBS-04)

### Source

`UPLOAD_JOBS_QUEUE` is the binding. DLQ is the auto-created dead-letter
queue. Wrangler exposes:

- `wrangler queues queue list` — names + approximate depth.
- `wrangler queues queue info <name>` — details.

The Workers runtime does not currently expose queue depth to the Worker
itself (the consumer reads from the queue, doesn't query it). So the
admin needs to call the Cloudflare REST API:

```
GET https://api.cloudflare.com/client/v4/accounts/{account_id}/workers/queues
Authorization: Bearer {CF_QUEUE_READ_TOKEN}
```

This requires a scoped token (`OPEN-8` — new). Add to `21` OPEN list.

### Surface

`AdminQueueHealth.tsx` (Server Component):

```
UPLOAD_JOBS_QUEUE:  depth 2  in-flight 0  DLQ 0
  [View DLQ →]
```

Clicking "View DLQ" opens a drawer with the most recent DLQ messages
(read-only). Replay button (post-MVP).

### OPEN-8 (new) — CF Queue Read token

- **Why external:** Cloudflare account action (mint scoped read token).
- **Options:** (a) provision read-only Queues token; (b) skip — depth
  via wrangler CLI only.
- **Recommendation:** (b) for MVP — UI shows "open terminal" CTA with the
  exact `wrangler queues` command if token is not set.

### Cost

Free (Cloudflare Queues has no API call charge).

---

## 27.5 Client error trend (FR-OBS-05)

### Source

`src/lib/observability/client-error-report.ts` exists and posts client
errors somewhere (likely a Route Handler that writes to `logs/dev.ndjson`
locally or Workers Logs hosted).

For admin surfacing, we need a structured sink:

**Option A (recommended MVP): D1-backed client error log.**
- New table `client_error_events` (migration `0046_client_error_events.sql`).
- The client-error-report Route Handler INSERTs each error.
- Schema:
  ```sql
  CREATE TABLE IF NOT EXISTS client_error_events (
    id TEXT PRIMARY KEY,
    message TEXT NOT NULL,          -- error message
    stack TEXT,                     -- stack trace (truncated)
    route TEXT,                     -- URL path where error occurred
    user_agent TEXT,
    user_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
    session_id TEXT,
    request_id TEXT,
    created_at TEXT NOT NULL
  );
  CREATE INDEX idx_client_err_created ON client_error_events(created_at DESC);
  CREATE INDEX idx_client_err_message ON client_error_events(message, created_at DESC);
  ```

**Option B (defer): Workers Logs query.**
- Requires GraphQL Analytics token; less structured.

**Decision:** Option A. Migration `0046`.

### Surface

`AdminClientErrors.tsx` (Server Component):

```
Client errors (last 24h)
Top errors:
 TypeError: cannot read 'x' of undefined    12 hits  /workshop
 NetworkError: failed to fetch                  3 hits  /share
[View all in Workers Observability →]
```

Aggregation query:
```sql
SELECT
  substr(message, 1, 200) AS short_message,
  COUNT(*) AS hit_count,
  route,
  MIN(created_at) AS first_seen,
  MAX(created_at) AS last_seen
FROM client_error_events
WHERE created_at > datetime('now', '-1 day')
GROUP BY short_message, route
ORDER BY hit_count DESC
LIMIT 10;
```

### Cardinality

Pre-launch scale: 0–100 errors/day. At 100x: 10K/day. Manageable.
Retention: prune > 30d via existing retention cron (extend scope).

### Rollback

`DROP TABLE client_error_events;`.

---

## 27.6 Web Vitals field tile (FR-OBS-06)

### Source

`useReportWebVitals` is already wired in `providers.tsx`. It currently
posts to... let's assume the same sink as client errors.

**Option A (recommended MVP): D1-backed web vitals log.**
- New table `web_vital_events` (migration `0047_web_vital_events.sql`).
- The vitals reporter INSERTs each measurement.
- Schema:
  ```sql
  CREATE TABLE IF NOT EXISTS web_vital_events (
    id TEXT PRIMARY KEY,
    metric TEXT NOT NULL CHECK (metric IN ('LCP','INP','CLS','FCP','TTFB')),
    value REAL NOT NULL,
    rating TEXT NOT NULL CHECK (rating IN ('good','needs-improvement','poor')),
    route TEXT NOT NULL,
    user_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
    session_id TEXT,
    created_at TEXT NOT NULL
  );
  CREATE INDEX idx_web_vital_metric_created ON web_vital_events(metric, created_at DESC);
  CREATE INDEX idx_web_vital_route ON web_vital_events(route, created_at DESC);
  ```

**Decision:** Option A. Migration `0047`.

### Surface

`AdminWebVitals.tsx` (Server Component):

```
Web Vitals (last 7d, p75 field)
LCP: 1.8s (good)   INP: 180ms (needs improvement)   CLS: 0.04
```

Aggregation query (p75 per metric): D1 doesn't support percentile SQL
functions; fetch sorted values and pick p75 index app-side at solo-dev
scale.

### Rating thresholds (per Google)

- LCP: good ≤ 2500ms, needs-improvement ≤ 4000ms, poor > 4000ms.
- INP: good ≤ 200ms, needs-improvement ≤ 500ms, poor > 500ms.
- CLS: good ≤ 0.1, needs-improvement ≤ 0.25, poor > 0.25.

### Cardinality

Each page view → up to 5 vital events. At 1000 page views/day = 5000
events/day. Manageable. Retention: prune > 30d.

### Rollback

`DROP TABLE web_vital_events;`.

### Privacy

- No per-user tracking in the UI.
- Aggregated p75 only.
- `user_id` captured for debugging but never displayed per-user.

---

## 27.7 Free-tier consumption gauge (FR-OBS-07)

### Source

Cloudflare GraphQL Analytics API exposes:

- Workers requests (count, by interval).
- Workers CPU time.
- D1 rows read / queries.
- R2 storage (Class A/B operations, storage bytes).
- Queue operations.

Same API as FR-OVERVIEW-03 trend. Requires `CF_ANALYTICS_API_TOKEN`
(OPEN-3). If token not set: tile shows "Configure CF Analytics token to
see consumption" with link to the how-to-enable doc.

### Surface

`AdminFreeTierGauge.tsx` (Server Component):

```
Free-tier consumption (this month)
Workers requests:  34K / 100K      [████░░░░░░] 34%
D1 rows read:      1.2M / 5M       [██░░░░░░░░] 24%
R2 storage:        340MB / 10GB    [░░░░░░░░░░]  3%
Queue operations:  2.1K / 10M      [░░░░░░░░░░] <1%
```

### Free-tier limits (2026-07, subject to change)

- Workers requests: 100K/day (free tier).
- D1 rows read: 5M/day.
- D1 rows written: 100K/day.
- R2 storage: 10GB.
- R2 Class A operations: 1M/month.
- R2 Class B operations: 10M/month.
- Queue operations: 10M/month.
- Email: not a hard cap on free tier (200/day soft cap; verify).

### Cache

Daily cache in `admin_metric_cache` (key: `cf_free_tier_<month>`).

### Rollback

n/a (read-only against provider API).

---

## 27.8 Backup status indicator (FR-OBS-10)

### Source

The script `cf:d1-restore-rehearsal` exists and runs a dry-run restore.
There's no persistent record of when it last ran successfully.

**Option A (recommended MVP): write outcome to D1.**
- Extend the script to INSERT into `ops_run_events` (migration `0048`).
- Schema:
  ```sql
  CREATE TABLE IF NOT EXISTS ops_run_events (
    id TEXT PRIMARY KEY,
    script_name TEXT NOT NULL,      -- "cf:d1-restore-rehearsal"
    started_at TEXT NOT NULL,
    completed_at TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('ok','failed')),
    output_summary TEXT,
    invoked_by TEXT                  -- "cron" | "manual:<email>"
  );
  CREATE INDEX idx_ops_run_name_started ON ops_run_events(script_name, started_at DESC);
  ```
- Reader: `getBackupStatus()` returns latest `status='ok'` row for
  `cf:d1-restore-rehearsal`.

**Decision:** Option A. Migration `0048`.

### Surface

```
Last backup verified:   2 hours ago  [Run rehearsal ↻]
```

The "Run rehearsal ↻" link triggers the script via an admin action (P2 —
for MVP, link to a doc explaining how to run it from CLI).

### Rollback

`DROP TABLE ops_run_events;`.

---

## 27.9 Maintenance mode (FR-OPS-02)

### Source

Add a new flag `admin_maintenance_mode` to `feature_flags` (DATA-FLAGS-01
extends naturally; no new migration needed if 0042 already seeds it —
update 0042 blueprint to include this flag in seed).

### Behavior

`proxy.ts` reads the flag (cached 60s) and:
- For mutation routes (`/workshop/projects/*`, `/api/projects/*`, etc.),
  return 503 with a maintenance page.
- Read-only routes still work.
- Admin (`/admin`) still works.

### Surface

```
Maintenance mode
Status: [ off ]  (toggle to put /workshop writes in read-only)
```

Confirmation dialog on enable.

### Rollback

Toggle off. No data impact.

---

## 27.10 Data residency (FR-OBS-11)

### Source

Static: from `wrangler.jsonc` deployment metadata. The Workers deployment
region is implied by the Workers account. D1 has explicit region (e.g.,
`wnam` for Western North America).

### Surface

```
Data residency: Cloudflare D1 · wnam
```

Static tile, no refresh needed.

---

## 27.11 Uptime strip (FR-OBS-01)

### Source

Internal-only. Derived from:
- `operational_incidents` table (open sev1/sev2 = degraded).
- Alert scenario S-01 last fire (from `ops:check-alert-scenarios` artifact
  if available).

**Decision:** Aggregate from open incidents. If no open sev1/sev2 in last
24h → "all systems nominal". Else → "degraded" / "partial outage" / "major
outage" based on severity.

### Surface

```
Uptime (24h): ● all systems nominal
```

No external prober (FACET-2 deferred).

---

## 27.12 Onboarding funnel (FR-OVERVIEW-06)

### Source

`user_onboarding_profiles` (migration `0005`) has stage tracking.

Stages:
- Signup (created_at).
- First estimate created (need event capture — likely exists via
  `estimate_sheet_events`).
- First proposal shared (via `shared_link_events`).

### Query

```sql
SELECT
  COUNT(DISTINCT CASE WHEN created_at > datetime('now', '-30 days') THEN id END) AS signups_30d,
  COUNT(DISTINCT CASE WHEN first_estimate_at > datetime('now', '-30 days') THEN id END) AS first_estimate_30d,
  COUNT(DISTINCT CASE WHEN first_share_at > datetime('now', '-30 days') THEN id END) AS first_share_30d
FROM user_onboarding_profiles;
```

(Assumes `user_onboarding_profiles` has these columns or they're derivable
from join with events. Implementation verifies.)

### Surface

```
Onboarding funnel (last 30 days)
Signup       42
First estimate  21
First proposal  7
```

---

## 27.13 Closed-beta funnel (FR-OVERVIEW-07)

### Source

`closed_beta_allowed_emails` (migration `0001`) + `closed_beta_allowlist_audit_events`.

Stages:
- Invited (status='invited').
- Accepted (status='active', accepted_at not null).
- First action (joined workspace / created project — via
  `collaboration_audit_events` or `estimate_sheet_events`).

### Surface

```
Closed-beta funnel (last 30 days)
Invited   18
Accepted  12
First action 8
```

---

## 27.14 Session health (FR-USERS-03)

### Source

Better Auth `session` + `account` tables (D1).

```sql
SELECT
  COUNT(*) AS active_sessions,
  -- provider breakdown
  (SELECT COUNT(*) FROM account WHERE provider_id='google') AS google_count,
  (SELECT COUNT(*) FROM account WHERE provider_id='magic_link') AS magic_link_count
FROM session
WHERE expiresAt > datetime('now');
```

(Camel-case column names depend on BA D1 schema; implementation verifies.)

### Surface

```
Session health
Active sessions: 12
Provider breakdown:
 Google OAuth:  10
 Magic link:     2
Avg session: 4.2 hours
```

---

## 27.15 Mass-op audit viewer (FR-AUDIT-03)

### Source

`mass_deletion_events` (migration `0023`).

### Surface

Embedded in `/admin/audit` as a "Mass ops" tab:

```
Mass ops audit
Actor     Target          Affected  When
Philip    project         12        3h ago
Philip    estimate_rows   450       2d ago
```

---

## 27.16 DSAR queue viewer (FR-OPS-01)

### Source

`privacy_requests` (migration `0033`).

### Surface

Embedded in `/admin/audit` as a "DSAR queue" tab:

```
DSAR queue
Open: 1
#4  jane@example.com   export  requested 3d ago   SLA: 4d left
     [Mark complete] [View details]
```

### Mutation

`markDsarComplete` Server Action updates the row + writes audit.

---

## 27.17 CSV exports (FR-USERS-04, FR-AUDIT-04)

### Implementation

- Server Action generates CSV in-memory (ExcelJS or simple string build).
- Returns a Blob via Route Handler with `Content-Type: text/csv` and
  `Content-Disposition: attachment; filename="admin-{entity}-{date}.csv"`.
- For large exports: stream via R2 temp object with signed URL.

### Surface

"Export CSV ⬇" button on Users and Audit pages.

---

## 27.18 Updated migration inventory (after this doc)

The original `07` had 4 migrations (`0041`–`0044`). This doc adds 4 more:

| Migration | Purpose | Source |
|---|---|---|
| `0041` | support_conversations + support_messages | Original |
| `0042` | feature_flags (extend seed for admin_maintenance_mode) | Original, updated |
| `0043` | admin_audit_events | Original |
| `0044` | admin_metric_cache | Original |
| `0045` | cron_run_events | New (this doc) |
| `0046` | client_error_events | New (this doc) |
| `0047` | web_vital_events | New (this doc) |
| `0048` | ops_run_events | New (this doc) |

**Update `07` blueprint and `16` traceability** to reflect 8 migrations,
not 4.

---

## 27.19 Updated env vars (after this doc)

Add to `18` §18.8:

| Var | Scope | Source |
|---|---|---|
| `CF_QUEUE_READ_TOKEN` | server secret (OPEN-8, new) | Cloudflare Queues read |

Others unchanged.

---

## 27.20 Updated OPEN list (after this doc)

Add:

| OPEN | Decision | Recommended | Impact |
|---|---|---|---|
| OPEN-8 | CF Queue Read token | defer (MVP uses wrangler CLI CTA) | DLQ viewer shows CLI command instead of inline |

---

## 27.21 Cost summary

All surfaces free-tier. No paid add-ons.

- D1 rows: ~100 added per day (cron + ops + client errors + vitals).
  Trivial vs 5M/day limit.
- R2: none.
- Workers requests: +1 admin route hit per surface per refresh. Trivial.
- Email: unchanged.
- GraphQL Analytics API: 1 query/hour for free-tier gauge. Trivial vs
  300/5min limit.

---

## 27.22 Privacy summary

- Client error events: capture `user_id` for debugging but never display
  per-user.
- Web vitals: same.
- Sessions: shown only in aggregate.
- DSAR queue: handled via existing privacy_requests flow (already
  user-consented).
- All admin access is audited via `admin_audit_events`.

No new privacy surface introduced.

---

## 27.23 What this doc does NOT do

- Authorize the 4 new migrations. They are planned; application is
  implementation work.
- Override the free-tier cost posture (no paid add-ons).
- Replace Cloudflare Workers Observability for raw log search (linked, not
  rebuilt).
- Address Logpush / Workers Paid (still deferred per `02`).
- Surface AI usage analytics (`21` FACET-36 deferred until AI re-enabled).

---

## 27.24 Confirmation

No application code, tests, migrations, schemas, `wrangler.jsonc`,
`package.json`, provider state, or runtime data were modified. All writes
are confined to `.ai/03_plans/2026-07-08/Admin-Dashboard-Planning/`.
