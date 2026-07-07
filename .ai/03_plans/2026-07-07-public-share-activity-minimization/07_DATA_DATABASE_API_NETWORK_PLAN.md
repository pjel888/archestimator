# Data, Database, API, and Network Plan

## Data ownership

| Data class | Owner (write) | Owner (public read) | Owner (owner read) | Retention |
|---|---|---|---|---|
| `project_publications` | manager (create/republish/revoke/rotate) | liveness context only (route.ts:109) | full row (admin client) | DATA-01 (TBD) |
| `shared_link_comments` | recipient (POST /comment) + manager (internal) | `listPublicActivityComments` (is_internal=0, **no author_email after SEC-01**) | full (loadSharedLinkActivity) | DATA-01 (TBD) |
| `shared_link_responses` | recipient (POST /decision, single-use) | recipient-scoped only | full | DATA-01 (TBD) |
| `shared_link_events` | server (recipient open/comment/decision) | recipient-scoped only | full | 90 days (existing) |
| `shared_link_recipients` | manager (add/remove/resend) | display_name only (**no email after SEC-02**) | full (roster) | DATA-01 (TBD) |
| `project_publication_events` | server (open/password/etc) | not exposed | full | DATA-01 (TBD) |
| `publication_digest_log` | server (digest send) | not exposed | full | DATA-01 (TBD) |
| `security_rate_limit_events` | rate limiter | not exposed | not exposed (operational) | self-clean (60s debounce) |

## Schema changes required

**Phases 1-5: NONE.** No new migration. The minimization work is in SELECT lists (code), the composer (code), retention rules (code), and logging (code).

**Phase 7 (owner-gated OPEN-SEC-04):** adds `session_generation INTEGER NOT NULL DEFAULT 0` to `shared_link_recipients` (or `project_publications`) + indexes the session verify path. Migration `00XX_shared_link_session_generation.sql`. Backfill: `UPDATE … SET session_generation = 0`. Rollback: drop column.

### Database Change Blueprint (Phase 7 only — owner-gated)

- **Migration filename:** `migrations/0037_shared_link_session_generation.sql` (next sequential; latest is `0036_cost_library_component_drafts.sql`).
- **Tables/columns/indexes:** `ALTER TABLE shared_link_recipients ADD COLUMN session_generation INTEGER NOT NULL DEFAULT 0;` + optional `CREATE INDEX idx_shared_link_recipients_session_gen ON shared_link_recipients(publication_id, session_generation);`
- **Repository/security.ts:** session verify (`verifySharedLinkSessionCookieValue`) reads `session_generation` and compares to cookie-bound value; mismatch → reject.
- **actions.ts:** recipient removal bumps `session_generation` for the publication (or the row).
- **Backfill:** `UPDATE shared_link_recipients SET session_generation = 0;` (no-op default).
- **Concurrency/locks:** single-column add; no lock contention.
- **Expected query count:** +1 read on session verify (or fold into existing recipient lookup).
- **Cardinality:** 1 row per recipient; index low-cardinality but useful for "bump all for publication".
- **Generated types:** no Worker Env binding change; no `cf:typegen` needed.
- **Rollback/fix-forward:** `ALTER TABLE … DROP COLUMN session_generation;` (D1/SQLite supports drop column since 3.35).
- **Local proof:** focused vitest on session verify rejecting a stale generation.
- **Provider proof:** D1 readback `PRAGMA table_info(shared_link_recipients)` shows the column.
- **EXPLAIN:** N/A (single-column read).

## Query behavior (after Phase 1 minimization)

- `listPublicActivityComments`: `SELECT id, created_at, body, is_internal, author_name, recipient_id, estimate_id, row_id, target_kind, target_label, target_secondary_label, snapshot_version_at_comment FROM shared_link_comments WHERE publication_id = ? AND is_internal = 0 ORDER BY created_at DESC, id DESC LIMIT ?` — **`author_email` removed.** Index: `idx_shared_link_comments_public_feed` (partial `WHERE is_internal = 0`).
- `listRecipientDisplayNames`: `SELECT id, display_name FROM shared_link_recipients WHERE publication_id = ? AND id IN (...) LIMIT 500` — **`email` removed.**
- No change to `listRecipientActivityResponses`/`listRecipientActivityEvents` (already recipient-scoped, minimal columns).

## Transaction boundaries

- Activity GET: read-only, no transaction.
- Comment/decision POST: SEC-06 cross-publication scoping + snapshot-version check inside the INSERT path (d1-store.ts:581-642, 644-728). No change.
- Rotation: `db.batch` atomic (admin-d1-client.ts:468-528). No change.

## Concurrency / idempotency

- Comments: unlimited (rate-limited 5/min + 20/hr). Non-idempotent (append-only).
- Decisions: single-use (UNIQUE partial index). Idempotent retry returns existing (200) or 409.
- Events: append-only, allow-listed. Idempotent.
- Retention: DELETE is idempotent.

## Migration sequencing

- Phases 1-5: no migration.
- Phase 7: `0037_…sql` after owner approval.

## Backfills

- Phase 7: `UPDATE shared_link_recipients SET session_generation = 0;` (default).

## Existing-data compatibility

- Phase 1: SELECT-list narrowing is backward-compatible (no row loses data; the route already discards `author_email`/`email`).
- Phase 5: retention rules only delete past-TTL rows; existing rows within TTL are untouched.
- Phase 7: new column with default 0; existing sessions continue to validate (generation 0).

## Data retention / deletion / audit / recovery

- Retention rules added (DATA-01): cover comments/responses/recipients/publications/publication_events/digest_log.
- Each retention run writes a `data_retention_events` row (audit).
- Recovery: daily D1 backups + `cf:d1-restore-rehearsal` script (per `AGENTS.md` cost posture). Retention purges are hard DELETE (no soft-delete); recovery is from backup.

## API contracts

### `GET /api/share/[token]/activity` (target)

**Headers in:** Cookie (optional session/access), `Origin`.
**Query:** `limit` (1-100, default 100), `cursor` (opaque).
**Response 200:** `{ activities: PublicActivityViewModel[], hasMore: boolean, nextCursor?: string, recipientSession: boolean }`. `Cache-Control: no-store`.
**Response 404:** `sharedLinkUnavailableErrorBody()` (revoked/expired/not-found).
**Response 423:** `{ passwordRequired: true }`.
**Response 429:** `{ error: "rate_limited" }` + `Retry-After`.
**Response 400:** bad cursor.
**Response 500:** uniform error (SEC-15).

### `PublicActivityViewModel` (target)

```ts
{
  id: string;            // act_<sha256[:16]>
  source: "comment" | "decision" | "event";
  action: string;
  visibility: "public";
  occurredAt: string;    // ISO
  title: string;
  summary: string;
  badges: Badge[];
  target: { kind: "proposal"|"estimate"|"row"; label: string; secondaryLabel?: string };
}
```

**No `meta`** (Phase 1: drop or document as always-undefined + remove dead pick). **No `raw`, `author_email`, recipient `email`, internal UUIDs.**

## Pagination

- `limit` clamped 1-100.
- Cursor: AES-256-GCM `{createdAt, id}` server-secret-keyed. Tampered → 400.
- Ordering: `created_at DESC, id DESC`.
- `hasMore` computed from `LIMIT+1`.

## Rate limits

- Activity GET: 60/min per (tokenHash, request) → 429 + `Retry-After` (preserve, SEC-10).
- Comment POST: 5/min + 20/hr per recipient (preserve).
- Decision POST: 5/min per recipient (preserve).
- Event POST: 60/min per token (preserve).
- Password POST: 5/15min + exponential backoff + lockout (preserve).
- Snapshot GET: 60/min per (tokenHash, ipHash) — **no lockout (P1-1); Phase 6 owner-gated adds Turnstile/WAF.**

## Timeouts / retries / cancellation

- D1 queries: default Workers subrequest limits apply. No app-level retry on read (fail → 500 uniform).
- Retention cron: caught + logged + recorded; next run resumes.

## Partial failures

- One of three parallel queries fails → 500 uniform (REL-01). No partial body.

## Backward compatibility

- DTO narrowing is backward-compatible for clients that already tolerate `meta: undefined` (all current consumers do; `SharedLinkActivityFeed` does not read `meta`).
- Removing the over-fetch is invisible to clients.

## Network behavior

- All share responses `no-store` (no edge cache).
- `Referrer-Policy: no-referrer` on `/share/*` (preserve).
- `X-Frame-Options: DENY` (preserve).
- CSP on `/share/*` enforced but still allows `unsafe-inline`/`unsafe-eval` (P2-5, deferred SEC-05; not in this plan's scope).

## Webhooks / event delivery

- Resend webhooks update `shared_link_recipients` delivery fields. Not in scope.
