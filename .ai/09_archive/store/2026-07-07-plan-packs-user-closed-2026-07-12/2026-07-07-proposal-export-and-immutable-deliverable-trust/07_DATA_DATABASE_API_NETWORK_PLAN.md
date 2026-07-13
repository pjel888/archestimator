# 07 — Data, Database, API, and Network Plan

## Database change blueprint

### Migration: `0040_proposal_deliverable_packages.sql` (next free number — executor confirms)

**Ordering dependencies:** after `0039_project_status.sql` (latest). Additive, forward-only.

**SQL sketch (structured pseudocode — contract, not final SQL):**

```sql
CREATE TABLE IF NOT EXISTS proposal_deliverable_packages (
  id TEXT PRIMARY KEY,                       -- uuid/cuid
  workspace_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  estimate_id TEXT,                          -- null for multi-estimate snapshot packages
  package_kind TEXT NOT NULL CHECK (package_kind IN ('xlsx','snapshot','pdf')),  -- pdf future
  state TEXT NOT NULL CHECK (state IN ('issued','superseded','revoked','expired')),
  snapshot_version INTEGER,                  -- for package_kind='snapshot'; >=1
  content_sha256 TEXT NOT NULL,              -- 64-hex lowercase (like upload_assets)
  content_sha256_format TEXT NOT NULL DEFAULT 'sha256_hex',  -- extensibility
  size_bytes INTEGER NOT NULL CHECK (size_bytes >= 0),
  source_as_of TEXT NOT NULL,                -- ISO8601 of source estimate state
  source_estimate_revision TEXT,             -- revision id / hash of source (DISCOVERY for exact field)
  storage_ref TEXT,                          -- null = inline/D1; else R2 key
  storage_kind TEXT CHECK (storage_kind IN ('inline','r2')),
  redaction_status TEXT NOT NULL DEFAULT 'applied',  -- mirrors ai_action_runs precedent
  redaction_policy_json TEXT,                -- the policy applied (audience + field allowlist)
  metadata_json TEXT,                        -- audience, settings hash, caps hit, etc.
  publication_id TEXT,                       -- FK project_publications.id for snapshot packages
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  superseded_by TEXT                         -- self-ref to newer package id
);
-- NOTE: content_sha256 CHECK constraint pattern: copy upload_assets "lower(hex) length 64".
-- Implement via CHECK (length(content_sha256)=64 AND content_sha256 GLOB '[0-9a-f]*')
--   (matches existing precedent in 0010 upload_assets.checksum_sha256).

CREATE INDEX IF NOT EXISTS idx_pdp_workspace_project_created
  ON proposal_deliverable_packages(workspace_id, project_id, created_at);
CREATE INDEX IF NOT EXISTS idx_pdp_publication
  ON proposal_deliverable_packages(publication_id)
  WHERE publication_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pdp_content_sha256
  ON proposal_deliverable_packages(content_sha256);
CREATE INDEX IF NOT EXISTS idx_pdp_state
  ON proposal_deliverable_packages(workspace_id, state, created_at);
```

**Columns on existing tables (separate small migrations or same file):**

```sql
ALTER TABLE shared_link_responses ADD COLUMN content_sha256_at_decision TEXT;  -- 64-hex nullable
-- recipient view content hash: stored on shared_link_events metadata_json (no new column) OR
-- a nullable content_sha256_at_view on shared_link_events; decide at impl (prefer metadata_json
-- to avoid wide ALTER).
```

**Backfill:** none — new table starts empty; new packages populate going forward. Existing
publications have no package row (their `snapshot_json` remains as-is; the first republish after
the feature creates v1 package row). **Decision:** backfill existing `project_publications` into
package rows? **Recommendation: NO backfill** (they pre-date checksums; fabricating hashes is
worse than an honest "no checksum for pre-feature publications" + a `content_sha256 = NULL` is
disallowed by NOT NULL, so pre-feature publications simply have no package row — they remain
queryable via the existing `project_publications` table as today).

**Concurrency/locks:** insert is append-only (no contention on existing rows). Supersession
update touches only `superseded_by` on the prior row — wrap in the same D1 batch as the insert
(`admin-d1-client` batch pattern). Optimistic concurrency on `snapshot_version` already protects
recipient writes.

**Expected query count per route/action:**
- XLSX export: +1 INSERT (package) +1 INSERT (download audit) ≈ +2 queries.
- Publish/republish: +1 INSERT (package) +1 UPDATE (supersede prior) within existing batch ≈ +0
  net round trips (batched).
- Recipient read: staleness = +1 cheap MAX(updated_at) (already exists in
  `readLatestEstimateUpdatedAt`).
- Recipient accept: +1 column write (batched with existing insert).

**Cardinality:** at 10x/100x/1000x — per workspace, packages scale with publish/download
frequency. Index on `(workspace_id, project_id, created_at)` keeps manager history queries
fast. `content_sha256` index supports dedup/lookup but is low-cardinality-selective (fine for
equality lookups, not scans).

**Index selectivity:** `content_sha256` is high-cardinality (good for equality). `state` is
low-cardinality — compound with `workspace_id`.

**D1 cost/authz:** all writes go through app-authorized repositories (manager RBAC or token-gated
public). No service-role. No RLS (D1 has no RLS; authz is app-layer, as today).

**Generated type impact:** run `bun run cf:typegen` only if Worker Env bindings change. **No new
binding is strictly required** (D1/R2/Queue bindings exist). If R2 large-artifact storage uses a
**new** R2 binding namespace (instead of reusing `ARCH_UPLOADS_R2` with a key prefix), then
`wrangler.jsonc` + `cloudflare-env.d.ts` change → `cf:typegen` required. **Recommendation: reuse
`ARCH_UPLOADS_R2` with a `proposal-deliverables/` key prefix** to avoid a new binding
(DEC-STORE-1).

**Rollback/fix-forward:** additive table is safe to leave in place if feature is rolled back
(no consumer = inert). Column additions are nullable/safe. If the async-job path is flagged off
(OPS-2), inline path continues. To fully revert: drop the table (forward-only convention is
relaxed for a brand-new empty table; but prefer fix-forward).

**Local proof:** `bun run cf:typegen` (if binding change), `bun run type-check`, focused tests
(schema test like `project-publication-schema.test.ts`, checksum test, immutability test).

**Linked-provider proof boundary:** D1 readback via `wrangler d1 execute` (local/preview) for the
new table; R2 object round-trip via `wrangler r2 object` for large artifacts. Hosted proof is a
rollout gate (TEST-2).

### Access-path matrix

| Source | Chosen API/repository/binding | Runtime role | Authorization check | Latest schema/policy posture | Proof source | Fallback |
|---|---|---|---|---|---|---|
| Package table (write) | new `proposal-deliverable-packages` repo over D1 `ARCH_DB` | authenticated manager (XLSX) or manager action (publish) | `getCurrentUserContext` + workspace/project membership (XLSX); `assertProjectPublicationManager` (publish) | new table, app-authz | unit + D1 readback | inline error, no row |
| Package table (read manager) | repo read over D1 | authenticated manager | workspace/project membership | app-authz | unit | empty list |
| Package content (large R2) | R2 `ARCH_UPLOADS_R2` key `proposal-deliverables/<id>` | server-mediated (signed or proxied) | server checks package ownership before issuing access | R2 bucket policy (private) | R2 round-trip | regenerate (bytes are reproducible from saved data) |
| Snapshot (recipient read) | existing `public-repository` + new staleness | public token | token hash + active gate + password + recipient-session | unchanged | existing tests + staleness test | 404/423 |
| Recipient accept | existing `submitSharedLinkDecision` + content hash | recipient session | session cookie + CSRF + version lock | unchanged + hash | content-binding test | 409 on version change |

If any chosen path cannot read/write after migrations, treat as P0 and add scoped implementation
or remove that source (per directive). All paths above are implementable with the blueprint.

## API/network contracts

### XLSX export response (extended)

- `200 OK`: `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`,
  `Content-Disposition: attachment; filename="..."`, `Cache-Control: private, no-store`,
  `X-Content-Type-Options: nosniff`, **`X-Archestimator-Package-Id: <uuid>`**,
  **`X-Archestimator-Package-Hash: <prefix8>`** (short, non-secret).
- `202 Accepted` (above async threshold): `{ jobId, statusEndpoint }`; client polls.
- `413` (hard cap): unchanged JSON `{ error, limits }`.
- `400/401/429`: unchanged.

### Async job status endpoint (new, P1)

- `GET /api/.../export/proposal.xlsx/job/[jobId]` → `{ state: queued|running|completed|failed,
  packageId?, hashPrefix?, error? }`.
- Auth: job ownership check (creator only).
- Rate-limited (SEC-4).

### Snapshot payload (extended)

- `GET /api/share/[token]` response gains a `staleness` object (when applicable):
  `{ daysBehind, sourceAsOf, deliverableDate }` — non-blocking.
- Accept response gains `contentSha256` in the receipt.

### Idempotency / retries / timeouts

- Async job: `correlation_id` idempotency key (precedent: `estimate_sheet_events`); duplicate
  enqueue returns the existing job id.
- Rate limits: existing `checkProposalExportRateLimit` (12/min, 120/hr) extended to job endpoint.
- Timeouts: inline `maxDuration=60`; queue jobs have Workers Queue limits (confirm at impl).
- Cancellation: job can be abandoned (DLQ handles); user can retry.

### Backward compatibility

- Existing `/share/[token]` consumers without `staleness` handling ignore the new field (additive
  JSON). No breaking change.
- Existing XLSX downloaders see new headers (ignored if unknown).
- Pre-feature publications remain readable (no package row; no checksum) — surfaced honestly as
  "issued before integrity tracking."

## Data integrity

- Checksum computed **before** `state=issued` (REL-2).
- Package row insert + (for snapshot) publication insert + supersession update in one D1 batch.
- R2 object write + package row: write R2 first, then package row with `storage_ref`; if package
  insert fails, orphan object is cleanup-eligible (lifecycle rule or reconcile job — DISCOVERY).
- No checksum = not issued (DB constraint + app check).
