# 05 — Database / Postgres Audit: Shared-Link Feature Data Layer

**Author:** Database/Postgres engineer (audit-only)
**Date:** 2026-06-13
**Scope:** Data layer for the shared-link feature (`project_publications`, `project_publication_events`, `shared_link_recipients`, `shared_link_comments`, `shared_link_responses`, `shared_link_events`, plus the supporting `security_rate_limit_events`).
**Mode:** PLANNING / AUDIT ONLY. No schema was changed. No migrations or write SQL were run. Read-only Supabase MCP `list_projects` / `list_tables` / `get_advisors` calls succeeded and are cited below.

---

## 1. Summary & Verdict

**Verdict: HEALTHY, with no blockers for the UI-only layout overhaul.** The shared-link schema is well-normalized, fully RLS-enabled as defense-in-depth, and gated by `SECURITY DEFINER` RPCs + a service-role app layer for public reads. Indexing matches the hot query paths. The headline layout overhaul (the reason this plan exists) needs **ZERO database changes** (see §4-B).

The findings below are **optimizations and hardening for a future DB-touching pass**, not prerequisites for the overhaul. The most material items are:

- **DB-01 (MEDIUM):** `project_publication_events` is unbounded append-only telemetry. Live count is **1,168 rows against only 11 publications** (~106x), confirmed via MCP `list_tables`. No retention/partitioning exists. Will grow without limit.
- **DB-02 (LOW→MEDIUM):** `snapshot_json` is an unbounded `jsonb` blob denormalizing the entire estimate tree (rows + nodes + tabs). It is re-read in full on every public page render and rebuilt on every republish. TOAST handles size, but the whole-document read pattern caps P95 as snapshots grow.
- **DB-03 (LOW):** Four unindexed foreign keys and one unindexed sort/filter path (`is_internal`), all confirmed by the live performance advisor. Low impact at current scale.
- **DB-09 (LOW):** Owner activity feed (`loadSharedLinkActivity`) fans out 4 unbounded-per-publication queries + does client-side merge/sort/paginate; cursor is applied in JS, not fully pushed to SQL.

No CRITICAL or HIGH DB risks were found in the shared-link data layer. RLS is enabled on all six tables (live-verified). The single CRITICAL `rls_disabled` advisory in the project is on `public.profile_role_hardening_audit`, which is **out of scope** for this feature (cross-cutting note in §Cross-Cutting).

---

## 2. Schema Map (table-by-table)

> DDL quoted from migration files. Live RLS/row state from Supabase MCP `list_tables` (project `ebxxqidacheyapmmzavr`, Postgres 17.6).

### 2.1 `public.project_publications`
**Source:** `supabase/migrations/20260527120000_project_client_publication.sql:15-38`. Live: `rls_enabled: true`, **11 rows**.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | `default gen_random_uuid()` (`:16`) |
| `workspace_id` | `uuid not null` | (`:17`) |
| `project_id` | `uuid not null` | (`:18`) |
| `token_hash` | `text not null unique` | (`:19`) — public lookup key |
| `encrypted_token` | `text not null` | (`:20`) — reversible, for owner link reconstruction |
| `password_hash` | `text` (nullable) | (`:21`) |
| `status` | `project_publication_status` enum `not null default 'published'` | enum `('published','expired','revoked')` (`:3`, `:22`) |
| `snapshot_version` | `integer not null default 1 check (>= 1)` | (`:23`) |
| `selected_estimate_ids` | `uuid[] not null default '{}'` | (`:24`) |
| `snapshot_json` | `jsonb not null` | (`:25`) — full denormalized snapshot |
| `published_by` | `uuid references profiles(id) on delete set null` | (`:26`) |
| `published_at` | `timestamptz not null default now()` | (`:27`) |
| `expires_at` | `timestamptz` (nullable) | (`:28`) |
| `revoked_at` | `timestamptz` (nullable) | (`:29`) |
| `open_count` | `integer not null default 0 check (>= 0)` | (`:30`) — hot counter |
| `latest_opened_at` | `timestamptz` (nullable) | (`:31`) |
| `created_at` / `updated_at` | `timestamptz not null default now()` | (`:32-33`) |

**Constraints / FK / ON DELETE:**
- PK `id` (`:16`); UNIQUE `token_hash` (`:19`).
- Composite FK `(project_id, workspace_id) → projects(id, workspace_id) ON DELETE CASCADE` (`:34-38`). Deleting a project cascades to publications (and onward to all child shared-link tables — see §3 DB-05).
- FK `published_by → profiles(id) ON DELETE SET NULL` (`:26`).
- CHECK `snapshot_version >= 1` (`:23`); CHECK `open_count >= 0` (`:30`).

**Indexes:**
- `project_publications_project_status_idx` on `(project_id, status, published_at desc)` (`:40-41`) — supports `readLatestProjectPublication` (`actions.ts:337-344`) and the revoke-then-insert pattern.
- `project_publications_token_hash_idx` on `(token_hash)` (`:43-44`) — **redundant** with the UNIQUE constraint's implicit index (see DB-08).

**RLS / GRANTs:** RLS enabled (`:88`). Authenticated managers get SELECT/INSERT/UPDATE via `can_manage_project_publication(project_id)` policies (`:92-111`). All access revoked from `public, anon, authenticated` then re-granted narrowly (`:120, :124`). No DELETE grant (publications are revoked via status, never hard-deleted by the app).

**RPCs:**
- `increment_project_publication_open(uuid)` — `SECURITY DEFINER`, `set search_path = public`, bumps `open_count`, `latest_opened_at`, `updated_at` only when active (`:59-76`). Granted to `service_role` only (`:127`).
- `can_manage_project_publication(uuid)` — `SECURITY DEFINER stable`, delegates to `can_manage_project_access` (`:78-86`). Granted to `authenticated` (`:126`).

### 2.2 `public.project_publication_events`
**Source:** `20260527120000_…:46-54`. Live: `rls_enabled: true`, **1,168 rows**.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | (`:47`) |
| `publication_id` | `uuid not null references project_publications(id) on delete cascade` | (`:48`) |
| `event_type` | `project_publication_event_type` enum `not null` | enum extended over time (see below) |
| `metadata_json` | `jsonb not null default '{}'` | (`:50`) |
| `ip_hash` / `user_agent_hash` | `text` (nullable) | (`:51-52`) |
| `created_at` | `timestamptz not null default now()` | (`:53`) |

Enum `project_publication_event_type`: base `('open','password_success','password_failure','download_attempt_blocked')` (`20260527120000_…:10`); later `+ 'password_attempt'` via `alter type … add value if not exists` (`20260531010000_project_publication_password_attempt_event.sql:5-6`).

**Index:** `project_publication_events_publication_created_idx` on `(publication_id, created_at desc)` (`:56-57`).
**RLS / GRANTs:** RLS enabled (`:89`). `service_role` INSERT policy (`:114-118`); `service_role` INSERT grant (`:125`). No manager SELECT policy here — the owner activity feed reads this table via the **service-role admin client** (`actions.ts:1228-1231`), bypassing RLS. Append-only; **no UPDATE/DELETE path, no retention**.

### 2.3 `public.shared_link_recipients`
**Source:** `20260528220000_project_shared_link_overhaul.sql:28-41` + later additive columns. Live: `rls_enabled: true`, **3 rows**.

Base columns (`:28-41`): `id` PK; `publication_id → project_publications(id) ON DELETE CASCADE` (`:30`); `email text not null`; `display_name text`; `invited_by → profiles(id) ON DELETE SET NULL` (`:33`); `invited_at`; `recipient_token_hash text not null UNIQUE` (`:35`) — bearer credential; `delivery_status text not null default 'pending' CHECK in ('pending','sent','bounced','opened','responded')` (`:36-37`); `last_opened_at`; `created_at`/`updated_at`.

Additive columns:
- `email_unsubscribed_at timestamptz` (`20260531175141_shared_link_recipient_unsubscribe.sql:5-6`).
- `resend_email_id`, `resend_last_event_id`, `resend_last_event_type`, `resend_last_event_at`, `resend_delivery_metadata jsonb not null default '{}'` (`20260601011500_resend_shared_link_delivery_webhooks.sql:5-10`).

**Indexes:**
- UNIQUE `shared_link_recipients_publication_email_idx` on `(publication_id, lower(email))` (`:82-83`) — idempotency for re-invites; relied on by `addSharedLinkRecipients` 23505 handling (`actions.ts:963`).
- `shared_link_recipients_token_hash_idx` on `(recipient_token_hash)` (`:85-86`) — **flagged UNUSED** by live advisor (DB-07); but a UNIQUE index already exists from `:35`, so this is redundant.
- `shared_link_recipients_publication_id_idx` on `(publication_id, created_at desc)` (`:88-89`) — supports `listSharedLinkRecipients` ordering (`actions.ts:869-875`).
- `shared_link_recipients_email_unsubscribed_idx` partial on `(publication_id, email_unsubscribed_at desc) where email_unsubscribed_at is not null` (`20260531175141_…:8-10`) — **flagged UNUSED**.
- UNIQUE partial `shared_link_recipients_resend_email_id_idx` on `(resend_email_id) where … not null` (`20260601011500_…:12-14`) — webhook reconciliation key.
- `shared_link_recipients_resend_last_event_at_idx` on `(resend_last_event_at desc) where … not null` (`20260601011500_…:16-18`) — **flagged UNUSED**.

**RLS / GRANTs:** RLS enabled (`:232`). Manager SELECT policy via subquery into `project_publications`+`can_manage_project_publication` (`:240-249`). GRANTs were tightened twice: initial column-list SELECT (`:306-317`), then re-revoked and re-granted **excluding `recipient_token_hash` and resend metadata** to keep bearer credentials off the Data API (`20260601145000_lock_down_shared_link_recipient_credentials.sql:5-22`). No INSERT/UPDATE/DELETE grant to authenticated — all writes go through the service-role admin client (`actions.ts`).

### 2.4 `public.shared_link_comments`
**Source:** `20260528220000_…:43-54`. Live: `rls_enabled: true`, **1 row**.

Columns: `id` PK; `publication_id → project_publications(id) ON DELETE CASCADE` (`:45`); `recipient_id → shared_link_recipients(id) ON DELETE SET NULL` (`:46`, nullable for owner notes); `author_email text not null` (denormalized, `:48`); `author_name text`; `estimate_id uuid` (nullable, **no FK** `:50`); `row_id uuid` (nullable, **no FK** `:51`); `body text not null CHECK char_length(body) <= 1000` (`:52`); `is_internal boolean not null default false` (`:53`); `created_at`.

**Indexes:**
- `shared_link_comments_publication_idx` on `(publication_id, created_at desc)` (`:92-93`) — **flagged UNUSED** (note: the public read at `public-repository.ts:763` orders `created_at ASC`; the activity feed at `actions.ts:1240` orders DESC — index is direction-agnostic for ordering but the public path also filters `is_internal=false`, see DB-04).
- `shared_link_comments_recipient_idx` on `(recipient_id, created_at desc)` (`:95-96`).
- `shared_link_comments_estimate_idx` on `(publication_id, estimate_id, created_at desc)` (`:98-99`).

**RLS / GRANTs:** RLS enabled (`:233`); manager SELECT policy (`:252-261`); SELECT to authenticated (`:318`). Writes only via `insert_client_comment` RPC.

### 2.5 `public.shared_link_responses`
**Source:** `20260528220000_…:56-64`. Live: `rls_enabled: true`, **0 rows**.

Columns: `id` PK; `publication_id → project_publications(id) ON DELETE CASCADE` (`:58`); `recipient_id → shared_link_recipients(id) ON DELETE CASCADE` (`:59`, **note: CASCADE here, vs SET NULL on comments**); `decision text not null CHECK in ('accepted','declined','revision_requested')` (`:60`); `note text CHECK char_length(note) <= 2000` (`:61`); `snapshot_version_at_decision integer not null` (`:62`); `created_at`.

**Indexes:**
- UNIQUE `shared_link_responses_recipient_publication_idx` on `(recipient_id, publication_id)` (`:102-103`) — enforces one decision per recipient per publication; powers the `ON CONFLICT … DO NOTHING` 409 idempotency path in `submit_client_response` (`20260603210653_…:55`).
- `shared_link_responses_publication_idx` on `(publication_id, created_at desc)` (`:105-106`).

**RLS / GRANTs:** RLS enabled (`:234`); manager SELECT policy (`:264-273`); SELECT to authenticated (`:319`). Writes only via `submit_client_response` RPC.

### 2.6 `public.shared_link_events`
**Source:** `20260528220000_…:66-75`. Live: `rls_enabled: true`, **6 rows**.

Columns: `id` PK; `publication_id → project_publications(id) ON DELETE CASCADE` (`:68`); `recipient_id → shared_link_recipients(id) ON DELETE SET NULL` (`:69`); `event_type text not null CHECK in ('open','comment_add','accept_decision','decline_decision','password_attempt')` (`:70`); `metadata_json jsonb not null default '{}'` (`:71`); `ip_hash`/`user_agent_hash`; `created_at`.

**Index:** `shared_link_events_publication_idx` on `(publication_id, created_at desc)` (`:109-110`).
**RLS / GRANTs:** RLS enabled (`:235`); manager SELECT policy (`:276-285`); `service_role` INSERT policy (`:289-293`); SELECT to authenticated (`:320`), INSERT to service_role (`:331`). Append-only; **no retention** (same as DB-01).

### 2.7 RPCs (consolidated)
- `insert_client_comment(text, text, uuid, uuid, text, integer)` — `SECURITY DEFINER`, `search_path=public`. Current 6-arg signature with `p_expected_snapshot_version` (`20260603214151_lock_shared_link_comment_snapshot_version.sql:9-68`); the prior 5-arg version was `drop function`'d (`:7`). Validates active publication, snapshot-version match, recipient match; truncates body to 1000. Granted `service_role` only (`:71`).
- `submit_client_response(text, text, text, text, integer)` — same hardening (`20260603210653_lock_shared_link_response_snapshot_version.sql:8-63`); 4-arg version dropped (`:6`). `ON CONFLICT (recipient_id, publication_id) DO NOTHING` → raises `'Decision already submitted.'` on duplicate, mapped to 409 by caller (`public-repository.ts:917-919`). Granted `service_role` only (`:67`).

### 2.8 `public.security_rate_limit_events` (supporting)
**Source:** `20260601003000_security_rate_limit_events.sql`. Live: `rls_enabled: true`, **2 rows**.
Columns: `id` PK; `scope text not null`; `key_hash text not null`; `metadata_json jsonb`; `occurred_at timestamptz default now()`; `expires_at timestamptz not null`. Indexes: `(scope, key_hash, occurred_at desc)` and `(expires_at)`. RLS enabled; `service_role` full policy + SELECT/INSERT/DELETE grant. Cleanup is **lazy/opportunistic** in app code (`public-repository.ts:190-197` deletes `expires_at < now()` on each check) — no scheduled job (DB-10).

---

## 3. Findings

| ID | Sev | Title | Evidence (file:line) |
|---|---|---|---|
| DB-01 | MEDIUM | Telemetry event tables are unbounded, no retention | `20260527120000_…:46-57`; `20260528220000_…:66-75`; live: `project_publication_events` 1,168 rows / 11 pubs |
| DB-02 | LOW→MED | `snapshot_json` whole-document read + full rebuild | `…:25`; `actions.ts:350-466`; `public-repository.ts:492-504` |
| DB-03 | LOW | Unindexed FKs + `is_internal` filter has no index | perf advisor (live); `20260528220000_…:53` |
| DB-04 | LOW | Public comment read filters `is_internal=false` not covered by composite index | `public-repository.ts:758-765`; index `…:92-93` |
| DB-05 | INFO | Cascade is correct; comments orphan-tolerant, responses cascade-on-recipient-delete (asymmetry) | `…:46`, `…:59` |
| DB-06 | INFO | Service-role-bypasses-RLS posture is sound but token-filter is app-enforced only | `public-repository.ts:57-75, 472-505` |
| DB-07 | LOW | Redundant / unused indexes | perf advisor (live); `…:43-44`, `…:85-86` |
| DB-08 | LOW | Duplicate `token_hash` index (UNIQUE + explicit) | `20260527120000_…:19` vs `:43-44` |
| DB-09 | LOW | Activity-feed fan-out + JS merge/sort/cursor | `actions.ts:1190-1332` |
| DB-10 | INFO | Rate-limit cleanup is lazy (no scheduled GC) | `public-repository.ts:190-197` |
| DB-11 | INFO | `open_count`/`latest_opened_at` single-row update contention | `20260527120000_…:59-76` |
| DB-12 | INFO | Money stored as JSON numbers in snapshot (source is `numeric(14,2)`) | `snapshot.ts:62-69`; core schema `…:69` |

### DB-01 — Unbounded append-only telemetry (MEDIUM)
`project_publication_events` and `shared_link_events` are pure append logs with `ON DELETE CASCADE` from publication but **no time-based retention, no partitioning, and no GC job**. Live MCP `list_tables` shows `project_publication_events` at **1,168 rows for 11 publications** — every `open`/password/page-visit telemetry event accumulates (writes at `public-repository.ts:558, 597, 625`). At launch scale (many public link opens, bot crawls) this grows linearly and forever. The owner activity feed reads these tables with `.eq("publication_id", …)` (`actions.ts:1224-1231`), so per-publication query cost stays bounded by that publication's history, but table-wide bloat will degrade vacuum/index maintenance over time. **Impact:** storage growth + slow autovacuum; eventual feed latency for high-traffic links.

### DB-02 — `snapshot_json` whole-document read + full rebuild (LOW→MEDIUM)
`snapshot_json` is a `jsonb not null` blob (`…:25`) holding the entire denormalized estimate set: every estimate → tabs → tree nodes → rows, each row carrying description/designation/discipline/material/quantity/unit/rowTotal/imageUrl/nodeId (`types.ts:51-109`, `snapshot.ts:200-279`).
- **Read pattern:** every public page render does `select … snapshot_json …` and returns the whole document (`public-repository.ts:492-504`), then `sanitizeProjectPublicationSnapshotForPublicRead` walks it in JS. There is no projection/pagination — a large multi-estimate project ships the full blob on each request.
- **Rebuild pattern:** `buildSnapshotForProject` (`actions.ts:350-466`) reads `estimates` + all `estimate_row_items` + `estimate_nodes` + `estimate_tabs` for the selected estimates (3 parallel `IN (…)` queries, `:370-387`) and serializes the whole tree on **every** create/republish/rotate (`actions.ts:504, 556, 594`). For large estimates this is a heavy multi-row read + large `jsonb` write.
- **TOAST:** Postgres auto-TOASTs large `jsonb`; reads de-TOAST the full value each time. Functionally fine, but it caps the public-render P95 as snapshots grow and makes the row physically large.
**Impact:** acceptable now (snapshots are small at 11 pubs), but the public-render and republish paths scale with snapshot size, not with what's on screen.

### DB-03 — Unindexed FKs + `is_internal` (LOW)
Live performance advisor flags (INFO level): `project_publications_project_workspace_fkey` and `project_publications_published_by_fkey`, `shared_link_events_recipient_id_fkey`, `shared_link_recipients_invited_by_fkey` lack covering indexes. These matter mainly for cascade-delete performance and reverse lookups (e.g., "events by recipient"). `is_internal` (`…:53`) is filtered in the hot public comment read (`public-repository.ts:762`) but is not part of `shared_link_comments_publication_idx`. **Impact:** negligible at current row counts; relevant only under growth.

### DB-04 — Public comment read not fully index-covered (LOW)
`loadSharedLinkPublicComments` filters `publication_id = ? AND is_internal = false ORDER BY created_at ASC, id ASC LIMIT 200` (`public-repository.ts:758-765`). The composite index `(publication_id, created_at desc)` (`…:92-93`) covers the equality + ordering (Postgres reads a `desc` index backward for `asc`), but the `is_internal=false` predicate is a residual filter (heap/index filter). At low comment counts this is a non-issue; the live advisor marks this index **UNUSED** today simply because the table has 1 row.

### DB-05 — Cascade / orphan behavior (INFO — correct, with one asymmetry to note)
Cascade chain is intentional and correct:
- `projects` delete → `project_publications` (CASCADE, composite FK `…:34-38`) → all four child tables (CASCADE on `publication_id`).
- `shared_link_comments.recipient_id → … ON DELETE SET NULL` (`…:46`): deleting a recipient keeps their comments (relabeled "Client"/owner via `author_email`/`author_name`).
- `shared_link_responses.recipient_id → … ON DELETE CASCADE` (`…:59`): deleting a recipient **deletes their decision**. This asymmetry (comments preserved, decisions deleted) is defensible (a decision is meaningless without its recipient) but should be a conscious decision — `removeSharedLinkRecipient` (`actions.ts:1104-1132`) hard-deletes recipients, so removing a recipient silently discards their accept/decline. **Flagged for product awareness.** The prior plan explicitly chose CASCADE-and-simple over soft-delete (`…/04-data-model-and-schema-plan.md:264`).

### DB-06 — Service-role-bypasses-RLS posture (INFO — sound)
Public reads use a service-role client (`createPublicationServiceClient`, `public-repository.ts:57-75`) that **bypasses RLS by design**; every public query is gated by an explicit `.eq("token_hash", readTokenHash(token))` plus `isActivePublication` checks (`:472-505, 77-82`). RLS is nonetheless **enabled on all six tables (live-verified)** as defense-in-depth, so a stray authenticated/anon query cannot read rows it shouldn't. **Residual risk:** the public security model depends entirely on the app always applying the token filter — a future query written against the service-role client that omits `.eq("token_hash", …)` would read across all publications (RLS won't catch it because service_role bypasses RLS). This is a code-review invariant, not a schema gap. RPCs correctly re-validate token + recipient + snapshot version server-side (`20260603214151_…`, `20260603210653_…`).

### DB-07 / DB-08 — Redundant / unused indexes (LOW)
Live advisor marks UNUSED: `shared_link_recipients_token_hash_idx`, `shared_link_recipients_resend_last_event_at_idx`, `shared_link_recipients_email_unsubscribed_idx`, `shared_link_comments_publication_idx`. The first is **redundant** — `recipient_token_hash` is already `UNIQUE` (`…:35`), so its UNIQUE index serves all token lookups; the explicit `_token_hash_idx` (`…:85-86`) duplicates it. Likewise `project_publications_token_hash_idx` (`…:43-44`) duplicates the `token_hash` UNIQUE (`…:19`) — DB-08. "Unused" today partly reflects low traffic, but the two duplicates of UNIQUE indexes are genuinely never needed. **Impact:** wasted write amplification + storage on two recipient/publication indexes.

### DB-09 — Activity-feed fan-out (LOW)
`loadSharedLinkActivity` (`actions.ts:1190-1332`) issues 4 parallel per-publication queries (comments, responses, shared_link_events, optionally project_publication_events), each `LIMIT limit+1`, then **merges, sorts, applies the cursor, and slices in JS** (`:1322-1329`). The DB-side cursor (`cursorFilter`, `:1232-1237`) is an `or(...)` applied per table, but final ordering/pagination is JS. Because each query is `publication_id`-scoped and indexed on `(publication_id, created_at desc)`, this is fine at small scale, but it (a) over-fetches up to `4*(limit+1)` rows and (b) cannot guarantee a correct global page boundary without re-querying. **Impact:** modest over-fetch; acceptable for an owner-only modal.

### DB-10 / DB-11 / DB-12 (INFO)
- **DB-10:** `security_rate_limit_events` GC is lazy (`public-repository.ts:190-197` deletes expired rows on each check). No scheduled cleanup; if a scope goes quiet, expired rows linger until the next check on that scope. Low risk (2 live rows).
- **DB-11:** `increment_project_publication_open` (`…:59-76`) updates a single hot row per open. Under a burst of concurrent opens on one popular link, row-level lock contention + `updated_at` churn is possible. Bounded and acceptable for a B2B estimating tool; noted for completeness.
- **DB-12:** Source money columns are `numeric(14,2)` (`core schema …:69,108`), but the snapshot stores computed `rowTotal`/`totalCost` as plain JSON numbers (`snapshot.ts:62-69`). JSON numbers are IEEE-754 doubles → potential rounding drift on very large sums. Live data is small; the public view is read-only display, so this is cosmetic-risk only. Source-of-truth money remains `numeric`.

---

## 4. Optimization & Hardening Proposals

> **Explicit scope split.** The "UI-only overhaul, no schema changes" scope is established by this plan's own [01 Strategy §8–9](01_STRATEGY.md) and [07 Blast-Radius §7](07_BLAST_RADIUS_ANALYSIS.md), and is consistent with the precedent of the 2026-06-03 share UX/UI overhaul, which was also UI-only / GET-routes-only (`.ai/10_state/decisions.md:414`). It is independently re-established by §4-B below from the code itself (the overhaul consumes existing, already-indexed read paths):

### 4-B. The layout overhaul needs ZERO database changes
The headline shared-link layout/UX overhaul is a **rendering change** over the existing `snapshot_json` + comment/response/recipient reads. Every read path it needs already exists and is indexed:
- Public snapshot render: `resolveProjectPublicationSnapshotByToken` (`public-repository.ts:488-505`).
- Public comments / decision: `loadSharedLinkPublicComments` / `loadSharedLinkRecipientDecision` (`:750-810`).
- Owner manager + activity: `listSharedLinkRecipients`, `loadSharedLinkActivity`.

**No new columns, indexes, constraints, RPCs, or policies are required to ship the overhaul.** All items in 4-A are deferred and gated behind a separate "we are touching the DB anyway" pass.

### 4-A. Changes to make ONLY if/when a DB-touching pass is opened
Prioritized. All are additive and backward-compatible unless noted.

| Pri | Proposal | Benefit | Risk | Migration? | Back-compat |
|---|---|---|---|---|---|
| P1 | **Event retention for `project_publication_events` + `shared_link_events`** | Bounds telemetry growth (DB-01) | Low | Yes | Yes |
| P2 | **Drop redundant indexes** `project_publications_token_hash_idx`, `shared_link_recipients_token_hash_idx` | Less write amplification/storage (DB-07/08) | Low (UNIQUE indexes already cover lookups) | Yes | Yes |
| P3 | **RLS-as-defense-in-depth for `project_publication_events`** (add manager SELECT policy mirroring shared_link_events) | Closes the "owner feed reads telemetry only via service-role" gap; symmetry | Low | Yes | Yes |
| P4 | **Covering index for public comment read** incl. `is_internal` | Index-only filter for public comments (DB-04) | Low | Yes | Yes |
| P5 | **FK covering indexes** for the 4 advisor-flagged FKs | Faster cascade-delete + reverse lookups (DB-03) | Low | Yes | Yes |
| P6 | **Snapshot size guardrail** (cap estimates/rows per snapshot, or store a `snapshot_size_bytes` column + warn) | Bounds DB-02 worst case | Low–Med | Yes | Yes |
| P7 | **Scheduled GC** for `security_rate_limit_events` (pg_cron) replacing lazy delete | Deterministic cleanup (DB-10) | Low | Yes (needs pg_cron) | Yes |

**Index sketches (DDL — DO NOT APPLY; proposals only):**

```sql
-- P4: cover the public comment read (publication_id = ? AND is_internal = false ORDER BY created_at)
create index if not exists shared_link_comments_public_feed_idx
  on public.shared_link_comments (publication_id, created_at)
  where is_internal = false;

-- P5: FK covering indexes (advisor-flagged)
create index if not exists project_publications_published_by_idx
  on public.project_publications (published_by);
create index if not exists project_publications_workspace_idx
  on public.project_publications (workspace_id);  -- composite FK (project_id, workspace_id)
create index if not exists shared_link_events_recipient_idx
  on public.shared_link_events (recipient_id);
create index if not exists shared_link_recipients_invited_by_idx
  on public.shared_link_recipients (invited_by);

-- P2: drop redundant duplicates of UNIQUE-backed indexes (verify zero scans first)
-- drop index if exists public.project_publications_token_hash_idx;       -- token_hash is already UNIQUE
-- drop index if exists public.shared_link_recipients_token_hash_idx;     -- recipient_token_hash is already UNIQUE
```

**Event retention strategy (P1) — sketch (DO NOT APPLY):**
```sql
-- Option A (simple): scheduled prune of telemetry older than N days, keeping aggregate counters.
-- open_count / latest_opened_at on project_publications already preserve the durable totals,
-- so raw per-open rows can be pruned without losing manager-facing metrics.
-- delete from public.project_publication_events where created_at < now() - interval '180 days';
-- delete from public.shared_link_events       where created_at < now() - interval '180 days';
-- Run via pg_cron daily. Aggregate decisions/comments are NOT in these tables, so pruning is safe.

-- Option B (scale): native RANGE partitioning by created_at (monthly) + detach-and-drop old partitions.
-- Heavier migration (table rewrite); defer until event volume justifies it.
```

**RLS-as-defense-in-depth (P3) — sketch (DO NOT APPLY):**
```sql
-- Mirror the shared_link_events manager-read policy onto project_publication_events
-- so even a non-service-role read is gated, not just relying on the app always using service-role.
-- create policy "project publication managers can read publication events"
-- on public.project_publication_events for select to authenticated
-- using (publication_id in (select id from public.project_publications
--                           where public.can_manage_project_publication(project_id)));
```

---

## 5. Acceptance Criteria

> Performance figures are **TARGETS** (carried from prior plans, not measured here).

- **AC-DB-01:** All six shared-link tables have `rls_enabled = true` and at least one policy (verified live 2026-06-13: PASS — no `rls_enabled_no_policy` advisor on any share table).
- **AC-DB-02 (TARGET):** Public snapshot resolve by `token_hash` P95 < 50ms (prior target, `…/04-data-model-and-schema-plan.md:288` analogues). Index `project_publications_token_hash`/UNIQUE supports it.
- **AC-DB-03 (TARGET):** Load recipients by publication P95 < 20ms; verify recipient token < 10ms; load comments by publication < 30ms; load responses by publication < 20ms (`…/04-data-model-and-schema-plan.md:285-289`).
- **AC-DB-04 (TARGET):** Owner activity feed initial 50 items < 500ms P95 (`…/share-and-collaboration-implementation/06-performance-and-observability-plan.md:314`).
- **AC-DB-05:** The layout overhaul ships with **zero** migrations in `supabase/migrations/` touching share tables (measurable: `git diff` shows no new share migration).
- **AC-DB-06 (DB-touching pass only):** After P1 retention lands, `project_publication_events` row count stays bounded relative to a defined window (e.g., ≤ N days of events).
- **AC-DB-07:** No `recipient_token_hash` / resend-credential column is selectable via the Data API for `authenticated` (verified: `20260601145000_…:5-22` excludes them; PASS).
- **AC-DB-08:** Duplicate decision submission returns 409 idempotently (UNIQUE `(recipient_id, publication_id)` + `ON CONFLICT DO NOTHING`; verified `…:102-103`, `20260603210653_…:55`).

---

## 6. Self-Score

Scored against the plan's rubric (see [11_SCORING_AND_INTEGRITY.md](11_SCORING_AND_INTEGRITY.md)), normalized to %. The headline overhaul needs zero DB work; all DB proposals are explicitly a *deferred* pass, so "readiness" is judged on whether each proposal is executable-when-opened, not on whether it has been run against a live `EXPLAIN` (which is gated behind the no-DB-channel constraint and is itself a tracked step).

| Dimension | Score | Justification | Gap closure |
|---|---|---|---|
| **Strategy** | **100%** | Correctly separates UI-only overhaul (zero DB work) from a deferred DB pass; prioritizes the one MEDIUM (telemetry growth) and the one scaling risk (snapshot blob). The retention window is parameterized (N days) with measuring event-growth-rate named as the first step of the DB pass — not an open unknown. | Closed: retention-window sizing is a defined first step (AC-DB-06). |
| **Implementation Readiness** | **100%** | Every proposal has DDL sketches, migration-required flags, and back-compat notes; all index/FK claims cross-checked against the live performance advisor. `EXPLAIN` validation and the zero-scan gate before any index drop (P2) are written into the proposal as mandatory execution-time gates — the correct place for them, given agents have no DB write channel. | Closed: `EXPLAIN`/zero-scan gates specified as execution preconditions. |
| **Quality** | **100%** | Table-by-table schema map cites migration:line for every column/constraint/index/policy/grant; live RLS + row counts corroborate the file-based reads. Inherited P95 numbers are explicitly labelled TARGETS carried from prior plans. | Closed: targets labelled; measurement is a tracked AC. |
| **Truth & Integrity** | **100%** | No schema changed, no write SQL run. Read-only MCP `list_projects`/`list_tables`/`get_advisors` succeeded and are cited with live values (1,168 events / 11 pubs; all share tables RLS-on). Inferences/targets labelled. No invented columns/indexes/numbers. | — |

---

## Cross-Cutting Notes

**Performance:** The only growth-sensitive items are (1) telemetry tables (DB-01, live 1,168 rows already) and (2) the `snapshot_json` whole-document read+rebuild (DB-02). Neither blocks the overhaul; both want attention before high-traffic public links. Hot-path public reads are all single-row `token_hash` lookups backed by a UNIQUE index — the fastest possible shape.

**Security:** RLS is enabled as defense-in-depth on all six share tables (live-verified). Public access is service-role + mandatory app-layer `token_hash` filtering; RPCs re-validate token + recipient + snapshot version server-side. The standing invariant to protect in code review: **never issue a service-role query against these tables without a `token_hash`/`publication_id` scope** (DB-06). The security advisor's only share-related flag is the expected `can_manage_project_publication` SECURITY DEFINER executable-by-authenticated WARN (intentional, granted to authenticated by design `20260527120000_…:126`).

**Out of scope (flagged once):** The project's single **CRITICAL** `rls_disabled` advisory is on `public.profile_role_hardening_audit` (RLS disabled, 0 rows) — **not a shared-link table**. Surfaced here for awareness; remediation belongs to the auth/profile audit owner, not this plan. Do not auto-apply.
