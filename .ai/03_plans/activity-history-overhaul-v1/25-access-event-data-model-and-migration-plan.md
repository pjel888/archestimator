# 25 — Access Event Data Model and Migration Plan

**Date:** 2026-06-02
**Status:** Fourth-pass reconciled

---

## Purpose

Decide whether shared page access telemetry needs database schema changes. Evaluate options, recommend V1.1 path, define migration strategy if needed.

---

## 1. Current Schema — Relevant Tables

### `project_publication_events`

```sql
CREATE TYPE public.project_publication_event_type AS ENUM (
  'open', 'password_success', 'password_failure',
  'download_attempt_blocked', 'password_attempt'
);

CREATE TABLE public.project_publication_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id uuid NOT NULL REFERENCES public.project_publications(id) ON DELETE CASCADE,
  event_type project_publication_event_type NOT NULL,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_hash text,
  user_agent_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

**Current columns available:** `event_type` (enum, 5 values), `metadata_json` (jsonb), `ip_hash`, `user_agent_hash`, `created_at`.

### `shared_link_events`

```sql
CREATE TABLE public.shared_link_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id uuid NOT NULL REFERENCES public.project_publications(id) ON DELETE CASCADE,
  recipient_id uuid REFERENCES public.shared_link_recipients(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN (
    'open', 'comment_add', 'accept_decision', 'decline_decision', 'password_attempt'
  )),
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_hash text,
  user_agent_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

**Current columns available:** Same as `project_publication_events` plus `recipient_id`.

---

## 2. What's Missing — Structured Access Metadata

Neither table has columns for:
- `access_stage` (page_visit, password_gate, password_attempt, proposal_view)
- `access_result` (success, failure, locked, not_required)
- `is_password_protected` (boolean — was the publication password-protected at time of event)
- `recipient_known` (boolean — was a recipient identified)
- `browser_name`, `browser_version`, `os_name`, `os_version`, `device_type`
- `country`, `region`, `city` (approximate location from provider headers)
- `timezone`
- `occurred_at_ms` (not needed — `created_at` already microsecond precision)

---

## 3. Options

### Option A — Use Existing `metadata_json` (No Migration)

Store all new fields inside `metadata_json` with a defined schema:

```json
{
  "access_stage": "proposal_view",
  "access_result": "success",
  "password_protected": true,
  "recipient_known": true,
  "device": {
    "browser": "Chrome",
    "browser_version": "125",
    "os": "macOS",
    "os_version": "14.5",
    "device_type": "desktop",
    "is_bot": false
  },
  "location": {
    "country": "PH",
    "region": "NCR",
    "city": "Makati",
    "timezone": "Asia/Manila",
    "approximate": true
  }
}
```

**Pros:**
- **No migration** — zero schema changes
- Fastest implementation
- Flexible — can add/remove fields without migrations
- Existing queries continue to work

**Cons:**
- **Unstructured querying** — `WHERE metadata_json->>'access_stage' = 'proposal_view'` works but cannot use regular indexes (needs GIN index on `metadata_json`)
- Risk of inconsistent metadata shape over time
- No database-level validation of metadata structure

### Option B — Add Structured Columns (Minimal Migration)

Add columns to `project_publication_events`:

```sql
ALTER TABLE public.project_publication_events
  ADD COLUMN access_stage text,
  ADD COLUMN access_result text,
  ADD COLUMN password_protected boolean,
  ADD COLUMN recipient_known boolean,
  ADD COLUMN browser_name text,
  ADD COLUMN browser_version text,
  ADD COLUMN os_name text,
  ADD COLUMN device_type text,
  ADD COLUMN country text,
  ADD COLUMN region text,
  ADD COLUMN city text;
```

And optionally to `shared_link_events` (same columns minus access_stage/result since those are always proposal_view/not_required).

**Pros:**
- **Structured querying** — `WHERE access_stage = 'proposal_view'` uses regular B-tree index
- Database-level clarity — schema documents what data exists
- Faster for analytics queries
- Type safety in generated Supabase types

**Cons:**
- **Migration required** — ALTER TABLE on production tables
- 12 new columns — table width increases
- Columns must be nullable (backward compatibility with existing rows)
- New columns unused for V1.0 events (all null for old rows)
- Harder to change shape (schema migration vs jsonb update)

### Option C — New `shared_link_access_events` Table

```sql
CREATE TABLE public.shared_link_access_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id uuid NOT NULL REFERENCES public.project_publications(id) ON DELETE CASCADE,
  recipient_id uuid REFERENCES public.shared_link_recipients(id) ON DELETE SET NULL,
  access_stage text NOT NULL,  -- page_visit, password_gate, password_attempt, proposal_view
  access_result text,          -- success, failure, locked, not_required
  password_protected boolean NOT NULL DEFAULT false,
  recipient_known boolean NOT NULL DEFAULT false,
  browser_name text,
  browser_version text,
  os_name text,
  os_version text,
  device_type text,
  is_bot boolean DEFAULT false,
  country text,
  region text,
  city text,
  ip_hash text,
  user_agent_hash text,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

**Pros:**
- Clean separation — purpose-built for access telemetry
- Easier retention policy (can expire old access logs independently)
- All columns purpose-built (not nullable where meaningful)
- No pollution of existing `project_publication_events` table

**Cons:**
- **More migration work** — new table, indexes, RLS policies, type generation
- More query plumbing — new table to query for activity feeds
- Split brain — access events in new table, security events in old table

---

## 4. Comparison Matrix

| Criteria | Option A (metadata_json) | Option B (new columns) | Option C (new table) |
|----------|-------------------------|----------------------|---------------------|
| Migration effort | None | Medium (ALTER TABLE) | High (CREATE TABLE + indexes + RLS) |
| Implementation speed | Fastest | Medium | Slowest |
| Queryability | GIN index (slower) | B-tree index (fast) | B-tree index (fast) |
| Schema flexibility | High (JSONB) | Low (columns) | Medium |
| Backward compatibility | Full | Columns nullable; old rows have null | New table; old events in old tables |
| Type safety | Low (JSONB) | High (typed columns) | High (typed columns) |
| Retention independence | No | No | Yes |
| Risk | Low | Medium (migration on production) | Medium (new table complexity) |

---

## 5. Recommendation

### V1.1: Option A — `metadata_json` only

**Rationale:**
1. **V1.1 goal is speed and safety.** No migration means lower risk and faster implementation.
2. Access telemetry is for owner visibility, not heavy analytics (yet). GIN index on `metadata_json` is sufficient for "show me access events for this publication" queries.
3. The metadata shape can be documented and validated at the application level (TypeScript interface).
4. If access telemetry proves valuable and query patterns emerge, migrate to Option B or C in V2.
5. Existing `project_publication_events` and `shared_link_events` tables already have `metadata_json` — zero new infrastructure needed.

### V1.1 Implementation: metadata_json Approach (No Migration)

**What requires NO migration:**
- Storing `access_stage`, `access_result`, `password_protected`, `recipient_known`, device info, location data → all in existing `metadata_json` JSONB column.
- Using existing `event_type` values: `open` (for page_visit, password_gate_viewed, proposal_viewed, recipient_session_started) and `password_attempt` (for password attempts).

**What IS a migration (deferred to V2):**
- Adding values to `project_publication_event_type` PostgreSQL enum (`ALTER TYPE ... ADD VALUE`)
- Adding values to `shared_link_events.event_type` CHECK constraint (`ALTER TABLE ... DROP/ADD CONSTRAINT`)
- Both are additive and safe but require migration files. Deferred to V2 when event taxonomy is stable. See D-010.

**V1.1 event taxonomy (no migration):**

| Event concept | event_type used | metadata_json.access_stage | Migration? |
|--------------|----------------|---------------------------|------------|
| Page visited | `open` | `page_visit` | No |
| Password gate viewed | `open` | `password_gate_viewed` | No |
| Password attempted | `password_attempt` | — | No (already exists) |
| Password unlocked | `open` | `password_unlocked` | No |
| Proposal viewed (named) | `open` | `proposal_viewed` | No |
| Proposal viewed (anon) | `open` | `proposal_viewed` | No |
| Recipient session started | `open` | `recipient_session_started` | No |
| Bot/crawler access | `open` | (any stage) | No |

- **Metadata schema:** Define and enforce via TypeScript interface (not DB constraint).
- **Query:** `SELECT * FROM project_publication_events WHERE publication_id = $1 AND metadata_json->>'access_stage' IN ('page_visit', 'proposal_viewed', 'password_gate_viewed') ORDER BY created_at DESC`.
- **GIN index:** Add if needed: `CREATE INDEX idx_publication_events_metadata ON project_publication_events USING GIN (metadata_json)`.

### V2 Migration Path (if needed)

If V1.1 proves the value of access telemetry and structured querying is needed:
1. Add structured columns (Option B) for frequently-queried fields.
2. Backfill existing V1.1 `metadata_json` data into new columns.
3. Deprecate `metadata_json` access fields (keep for migration safety).

### V3 Migration Path (if analytics demand)

If access analytics become a core product feature:
1. Create `shared_link_access_events` table (Option C) for clean separation.
2. Migrate existing access data.
3. Establish retention policy (e.g., 90-day access log retention).

---

## 6. TypeScript Metadata Interface (Application-Level Contract)

```ts
// src/lib/publication/types.ts (or src/lib/activity/types.ts)

export type AccessStage =
  | "page_visit"
  | "password_gate_viewed"
  | "password_attempted"
  | "password_unlocked"
  | "proposal_viewed"
  | "recipient_session_started";

export type AccessResult =
  | "success"
  | "failure"
  | "locked"
  | "not_required"
  | "unknown";

export type AccessEventMetadata = {
  access_stage: AccessStage;
  access_result?: AccessResult;
  password_protected: boolean;
  recipient_known: boolean;
  device?: {
    browser: string;
    browser_version?: string;
    os: string;
    os_version?: string;
    device_type: "desktop" | "mobile" | "tablet" | "bot" | "unknown";
    is_bot: boolean;
  };
  location?: {
    country?: string;
    region?: string;
    city?: string;
    timezone?: string;
    approximate: true; // Always true — never precise GPS
  };
  // Legacy fields preserved
  recipient_id?: string;
};
```

---

## 7. Index Recommendations

| Index | Table | Purpose | Priority |
|-------|-------|---------|----------|
| `(publication_id, created_at DESC)` | `project_publication_events` | Existing — verify exists | V1.0 |
| GIN on `metadata_json` | `project_publication_events` | Query by access_stage, device fields | V1.1 (if query perf needed) |
| GIN on `metadata_json` | `shared_link_events` | Query by embedded metadata | V1.1 (if query perf needed) |

---

## 8. RLS/Security Policy Approach

**No RLS changes needed.** Both `project_publication_events` and `shared_link_events` are written via `createPublicationServiceClient()` (service-role). Reads are:
- `project_publication_events`: Internal analytics — not directly exposed to clients. Service-role reads only.
- `shared_link_events`: Owner-visible activity — read via owner server action (RBAC). Public API route reads using service-role but filters by `publication_id`.

Access metadata in `metadata_json` is application-level — no RLS policy changes needed.

---

## 9. Backfill Stance

**No backfill planned.** Access telemetry starts recording from the deploy date forward. Old `open` events in `project_publication_events` will not have `access_stage` metadata. UI should handle missing metadata gracefully:
- Old events without `access_stage` → render as "Client viewed the proposal." (legacy copy)
- New events with `access_stage` → render with richer copy + device/location in audit facts

---

## 10. Data Retention Stance

**No automated cleanup planned for V1.1.** Current `estimate_sheet_events` has a retention metrics RPC but no automated deletion. Access events in V1.1 follow the same pattern:
- Keep all events (no deletion)
- In V2: evaluate retention policy (e.g., 90-day access log retention, 1-year estimate event retention)
- In V3: automated retention with archive/delete workflows

---

## Cross-References

- See `23-shared-page-access-activity-plan.md` for implementation details
- See `26-privacy-retention-and-client-disclosure-plan.md` for privacy boundaries
- See `19-migration-and-backfill-decision-matrix.md` for broader migration context
- See `06-performance-analysis-plan.md` for GIN index performance analysis
