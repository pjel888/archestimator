# 07 — Data, Database, API, And Network Plan

## D1 Schema (Current — unchanged contracts)

The publication/shared-link schema lives in `migrations/0014_publication_shared_links.sql`.
All seven tables are active and their contracts are preserved.

### Current tables

| Table | Purpose | Key constraints |
|---|---|---|
| `project_publications` | One active publication per project | UNIQUE partial index on `project_id WHERE status='published'` |
| `project_publication_events` | Server-side access/telemetry | `event_type` CHECK enum |
| `shared_link_recipients` | Invited clients | UNIQUE on `(publication_id, lower(email))` |
| `shared_link_comments` | Client/owner comments | `body` CHECK ≤1000, `is_internal` flag |
| `shared_link_responses` | Accept/decline decisions | UNIQUE per `(recipient_id, publication_id)` |
| `shared_link_events` | Recipient-scoped events | Separate from publication-level events |
| `publication_digest_log` | Owner-digest delivery audit | — |

### Migration changes (in scope)

#### DATA-001: Foreign key constraints

New migration `0050_publication_foreign_keys.sql`:

SQLite/D1 does **not** support `ALTER TABLE ADD CONSTRAINT` or `ALTER TABLE DROP
CONSTRAINT`. Adding foreign keys to an existing table requires the **SQLite
table-rebuild pattern**: create a new table with `REFERENCES`, copy data via
`INSERT INTO ... SELECT`, drop the old table, and rename. This is the codebase's
established convention (see `migrations/0040_operational_incidents.sql:42-103`
which rebuilds `data_retention_events` exactly this way).

For the publication tables, the rebuild is applied to `project_publications`
(adding two FK columns: workspace + project). The six child tables
(`shared_link_recipients`, `shared_link_comments`, `shared_link_responses`,
`shared_link_events`, `project_publication_events`, `publication_digest_log`) each
get a rebuild adding one `REFERENCES project_publications(id) ON DELETE CASCADE`.

Example rebuild for `shared_link_recipients` (the same shape repeats for each
child table — full SQL is in `migrations/0050`):

```sql
-- Step 1: Create the new table with the FK
CREATE TABLE shared_link_recipients__0050 (
  -- ... all original columns from 0014 verbatim ...
  publication_id TEXT NOT NULL
    REFERENCES project_publications(id) ON DELETE CASCADE,
  -- ... rest of original columns, constraints, CHECKs ...
);

-- Step 2: Copy all existing rows
INSERT INTO shared_link_recipients__0050 (/* all columns */)
  SELECT /* all columns */ FROM shared_link_recipients;

-- Step 3: Drop the old table
DROP TABLE shared_link_recipients;

-- Step 4: Rename the new table to the original name
ALTER TABLE shared_link_recipients__0050 RENAME TO shared_link_recipients;

-- Step 5: Recreate all original indexes (indexes are NOT carried over by rename)
CREATE INDEX IF NOT EXISTS idx_shared_link_recipients_publication_email
  ON shared_link_recipients(publication_id, lower(email));
-- ... recreate all 5 original indexes from 0014 ...
CREATE UNIQUE INDEX IF NOT EXISTS idx_shared_link_recipients_publication_email_uq
  ON shared_link_recipients(publication_id, lower(email));
-- etc.
```

For `project_publications`, the rebuild adds TWO FK columns:
```sql
CREATE TABLE project_publications__0050 (
  -- ... all original columns from 0014 verbatim ...
  workspace_id TEXT NOT NULL
    REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL
    REFERENCES projects(id) ON DELETE CASCADE,
  -- ... rest including the UNIQUE partial index on (project_id) WHERE status='published' ...
);
-- copy, drop, rename, recreate indexes
```

**Total: 7 table rebuilds.** Each rebuild is: CREATE (with FKs) → INSERT SELECT →
DROP → RENAME → CREATE INDEX (for each original index). This is a larger migration
than the original plan's 7 one-liners, but it is the **only valid SQLite approach**.

**Pre-migration step:** Query for orphaned rows before any rebuild. If any exist,
delete them (they are from deleted projects/workspaces and serve no purpose):
```sql
-- Check for orphans before starting
SELECT COUNT(*) FROM project_publications p
  LEFT JOIN projects proj ON p.project_id = proj.id
  WHERE proj.id IS NULL;
-- If > 0, delete: DELETE FROM project_publications WHERE project_id NOT IN
--   (SELECT id FROM projects);
```
The standing Cloudflare D1 authorization covers this.

**Risk:** Table rebuilds temporarily double the storage for each table (old +
new during the copy). On D1 free tier, this is fine for the expected row counts
(publications are bounded at ~100/workspace). The rebuild is atomic per table
(the copy+drop+rename in one migration transaction). Foreign key enforcement is
enabled by default in D1.

**Rollback:** To remove FK constraints, apply a reverse table-rebuild (create
without FKs, copy, drop, rename). Alternatively, since the rebuild is data-
preserving, the migration is safe to leave in place and `PRAGMA foreign_keys=OFF`
disables enforcement at runtime if needed. The safest rollback is a forward-fix:
if the FKs cause issues, rebuild again without them.

### Roster query optimization (DATA-002)

Current: `readRecipientCountsByPublicationId` ships up to 1000 recipient rows and
counts in JS. Same for latest-comment/latest-response.

Proposed: Replace with SQL aggregation.

```sql
-- Before (current): ships rows, counts in JS
SELECT publication_id, recipient_id FROM shared_link_recipients
WHERE publication_id IN (...) LIMIT 1000;

-- After (optimized): returns counts directly
SELECT publication_id, COUNT(*) as recipient_count
FROM shared_link_recipients
WHERE publication_id IN (...)
GROUP BY publication_id;
```

Same pattern for latest-comment/latest-response (use `MAX(created_at)` with
`GROUP BY`).

### SQL-level pagination

Current: JS-side `composePublisherRosterResult` slices a page from a 100-item
list. Proposed: add `LIMIT ? OFFSET ?` to `readRosterPublications` when the
filter is applied at SQL level. The status/search/project filter may still need
JS-side processing for complex cases (stale-snapshot derivation), but the page
slice can move to SQL for the common case.

## API Routes (Current — hardening changes only)

### Public POST routes — body-size limits (SEC-001)

Each public POST route handler adds an early `Content-Length` check:

Six public POST routes get body-size limits (SEC-001):

```typescript
const MAX_BODY_BYTES = {
  password: 256,      // {password: "..."}
  comment: 2048,      // {body, estimateId, rowId, viewToken}
  decision: 4096,     // {decision, note, signerName, estimateId, rowId, viewToken}
  session: 256,       // {recipientToken}
  unsubscribe: 1024,  // form-data: recipient + csrf
  events: 1024,       // {eventType, metadata} — only if UNIT-007 keeps this route
};

const contentLength = parseInt(request.headers.get("content-length") ?? "0", 10);
if (contentLength > MAX_BODY_BYTES[type]) {
  return new Response("Payload too large", { status: 413 });
}
```

### Status-code fix (SEC-002)

`comment/route.ts` GET (line 193) and `decision/route.ts` GET (line 150): change
`401` to `423` for password-required. This matches `route.ts:48-54`,
`session/route.ts:92-95`, `activity/route.ts:126-129`.

### Circuit breaker on decision POST (SEC-003)

Extract the circuit-breaker logic from `comment/route.ts:26-74` into a shared
module (`src/lib/publication/circuit-breaker.ts`) and apply it to both comment
and decision POST routes.

### Comment pagination (SEC-004)

Current: `loadSharedLinkPublicComments` caps at 200 (`public-repository.ts:876`).
Proposed: Add cursor-based pagination:

```typescript
// GET /api/share/[token]/comment?cursor=<opaque>&limit=50
// Response: { comments: [...], hasMore: boolean, nextCursor: string | null }
```

The cursor is an AES-GCM-encrypted `{createdAt, id}` reusing the crypto pattern
from `activity-helpers.ts` (`encodeSharedLinkActivityCursor` /
`decodeSharedLinkActivityCursor`). Note: the existing activity cursor shape is
`{createdAt, id}` (NOT `{publicationId, ...}` — the publicationId is already
known from the token). A new `encodeSharedLinkCommentCursor` /
`decodeSharedLinkCommentCursor` is added alongside the existing cursor helpers,
using the same AES-GCM key derivation. The client (`SharePageComments`) fetches
subsequent pages via a "Load more" button or `useInfiniteQuery`.

## Network Considerations

### Preview-as-client flow (REQ-003)

The preview session adds one round-trip (manager clicks preview → server action
sets cookie → opens share page). No additional network overhead on the share page
itself — the preview marker cookie is read alongside the existing session cookie.

### QR code generation

QR codes are generated client-side (no server round-trip). Use a lightweight
library (e.g., `qrcode` npm package — evaluate bundle size) or render an SVG QR
code. The QR encodes the `/share/<token>` URL. **No new server endpoint needed.**

**Dependency evaluation (GATE-CONTRACT-01):** The `qrcode` package is ~30KB
minified, MIT licensed, well-maintained. Alternative: generate QR codes via a
data-URL SVG encoder (no dependency). The DEC-AUTO decision prefers the no-
dependency approach if a lightweight SVG QR encoder is available in the existing
codebase or can be written in <100 lines. Evaluate during implementation.

## Cloudflare Resource Boundaries

All changes stay within the authorized Cloudflare resources:
- **D1 `ARCH_DB`:** Migration `0050` adds FK constraints. Query optimizations
  are within existing tables.
- **R2 `ARCH_UPLOADS_R2`:** No changes (cover images use existing image routes).
- **Email `EMAIL`:** No changes (invitation/digest emails use existing templates).
- **No new bindings, no paid add-ons.**

## Repository Layer Changes

### `roster-repository.ts` (optimized)

- `readRecipientCountsByPublicationId` → `GROUP BY` aggregation
- `readLatestCommentAtByPublicationId` → `MAX(created_at) GROUP BY`
- `readLatestResponseAtByPublicationId` → `MAX(created_at) GROUP BY`
- Add SQL-level `LIMIT/OFFSET` to `readRosterPublications`

### `public-repository.ts` (hardened)

- `loadSharedLinkPublicComments` → add cursor pagination support
- Add body-size validation helper for public routes

### `actions.ts` (new preview action)

- Add `createClientPreviewSession(projectId)` — manager-auth-gated, sets preview
  cookie, returns link path.

### `security.ts` (startup validation)

- Add module-init validation for `PUBLICATION_TOKEN_HASH_SECRET` and
  `PUBLICATION_TOKEN_ENCRYPTION_SECRET` in production (throw at import time, not
  request time).

## Data Integrity Verification

Before migration `0050`:
1. Query for orphaned publication rows (publications with no matching
   project/workspace).
2. If found, delete them (they are stale from deleted projects).
3. Apply FK constraints.
4. Verify constraints pass on existing data.

After migration:
- Test: deleting a project cascades to publications + recipients + comments +
  responses + events.
- Test: deleting a workspace cascades through projects to publications.
