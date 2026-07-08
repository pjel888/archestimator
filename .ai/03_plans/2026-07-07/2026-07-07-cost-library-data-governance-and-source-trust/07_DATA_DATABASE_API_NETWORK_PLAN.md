# 07 — Data, Database, API, and Network Plan

> **Migration-tree convention (revised 2026-07-07):** Archestimator has **two separate migration trees**. The active runtime is **Cloudflare D1** at `migrations/` with `00xx_` numbering (currently `0001`..`0037`; `0037_remove_preloaded_component_categories.sql` was taken on 2026-07-07). Legacy **Supabase/Postgres** lives at `supabase/migrations/` with 14-digit timestamp names and is reference/exit-archaeology only. This plan's new migration targets the **D1 tree**, next free number **`0038`**. The Supabase governance migration `20260622143000_library_trust_governance.sql` is the **parity reference** (it already defines all 9 review columns + 6 RPCs + CHECKs on the Postgres side); this plan ports that contract to D1.

## Database change blueprint — migration `0038_cost_library_cost_review_governance.sql`

(Ordered after the current D1 tip `0037_remove_preloaded_component_categories.sql`. The target table `cost_library_item_variant_cost_entries` is created in D1 migration **`0028_component_library_action_support.sql:65`** — not `0026`. `0026` creates `cost_library_items` / `cost_library_item_price_options`.)

### Tables / columns / constraints / indexes affected

**Additive columns on `cost_library_item_variant_cost_entries`** (created in D1 `0028`; the 9 governance columns below are absent on D1 today — the schema gap G2 is **D1-only**: the Supabase/Postgres table already has them via `20260622143000:53-64`):
- `review_status TEXT NOT NULL DEFAULT 'proposed' CHECK (review_status IN ('proposed','needs_review','accepted','rejected','superseded'))`
- `review_status TEXT NOT NULL DEFAULT 'proposed' CHECK (review_status IN ('proposed','needs_review','accepted','rejected','superseded'))`
- `reviewed_by TEXT` (references users; nullable; CHECK: `accepted`/`rejected` ⇒ `reviewed_by IS NOT NULL`)
- `reviewed_at TEXT`
- `review_note TEXT` (length-bounded at app layer)
- `assigned_to TEXT`
- `review_due_at TEXT`
- `locked_by TEXT`
- `locked_at TEXT`
- `lock_reason TEXT`
- `superseded_by TEXT` REFERENCES `cost_library_item_variant_cost_entries(id)` ON DELETE SET NULL
- `review_revision INTEGER NOT NULL DEFAULT 1 CHECK (review_revision > 0)`
- `origin TEXT NOT NULL DEFAULT 'user-entered' CHECK (origin IN ('owner-accepted','imported','user-entered','supplier-quote','promoted-from-estimate'))`
- `region TEXT` (nullable; app-normalized; gated by `OPEN-2`)
- `version_label TEXT` (nullable; app-normalized; gated by `OPEN-2`)
- `currency TEXT NOT NULL DEFAULT 'PHP'` (mirror of `cost_library_item_price_options.currency`; recorded per entry so variant entries can differ; no FX conversion — out of scope per `OPEN-2`)

**CHECK constraints (ported from Supabase governance model):**
- `ck_cost_entry_review_reviewed_consistency`: `(review_status IN ('accepted','rejected')) = (reviewed_by IS NOT NULL)`
- `ck_cost_entry_lock_consistency`: `(locked_by IS NULL) = (locked_at IS NULL)`
- `ck_cost_entry_supersede_consistency`: `(review_status = 'superseded') = (superseded_by IS NOT NULL)`
- `ck_cost_entry_revision_positive`: `review_revision > 0`

**Unique partial index:** `idx_cost_entries_one_accepted_current_per_option` — `UNIQUE(price_option_id) WHERE review_status='accepted' AND is_current=1 AND deleted_at IS NULL`.

**Indexes (additive):**
- `idx_cost_entries_review_status_workspace` ON `(workspace_id, review_status, updated_at DESC)` — drives "Needs review" overview/facet.
- `idx_cost_entries_assignee_due` ON `(workspace_id, assigned_to, review_due_at)` WHERE `assigned_to IS NOT NULL` — overdue assignments.
- `idx_cost_entries_origin` ON `(workspace_id, origin)` — origin filter.

**Denormalized mirror columns on `cost_library_items` and `cost_library_item_price_options`:** the active/current entry's `review_status` is mirrored for fast list rendering (existing pattern mirrors `confidence`, `pricing_source`, `pricing_date`, `lifecycle_state`). Updated atomically on accept/supersede via the same mutation that writes the variant entry.

**Review-event audit:** per `DEC-3`, extend `cost_library_item_state_history` with nullable `review_event_type`, `from_status`, `to_status`, `review_revision`, `correlation_id` columns (additive, nullable) rather than a new table. Append-only (no UPDATE/DELETE path).

### SQL sketch (structured pseudocode — not the final migration)

```sql
-- 0038_cost_library_cost_review_governance.sql
-- Ordered after 0037_remove_preloaded_component_categories.sql (current D1 tip).
-- Target table cost_library_item_variant_cost_entries is created in 0028_component_library_action_support.sql.
PRAGMA defer_foreign_keys;  -- D1/SQLite safe-additive

ALTER TABLE cost_library_item_variant_cost_entries ADD COLUMN review_status TEXT NOT NULL DEFAULT 'proposed'
  CHECK (review_status IN ('proposed','needs_review','accepted','rejected','superseded'));
ALTER TABLE cost_library_item_variant_cost_entries ADD COLUMN reviewed_by TEXT;
ALTER TABLE cost_library_item_variant_cost_entries ADD COLUMN reviewed_at TEXT;
ALTER TABLE cost_library_item_variant_cost_entries ADD COLUMN review_note TEXT;
ALTER TABLE cost_library_item_variant_cost_entries ADD COLUMN assigned_to TEXT;
ALTER TABLE cost_library_item_variant_cost_entries ADD COLUMN review_due_at TEXT;
ALTER TABLE cost_library_item_variant_cost_entries ADD COLUMN locked_by TEXT;
ALTER TABLE cost_library_item_variant_cost_entries ADD COLUMN locked_at TEXT;
ALTER TABLE cost_library_item_variant_cost_entries ADD COLUMN lock_reason TEXT;
ALTER TABLE cost_library_item_variant_cost_entries ADD COLUMN superseded_by TEXT REFERENCES cost_library_item_variant_cost_entries(id) ON DELETE SET NULL;
ALTER TABLE cost_library_item_variant_cost_entries ADD COLUMN review_revision INTEGER NOT NULL DEFAULT 1 CHECK (review_revision > 0);
ALTER TABLE cost_library_item_variant_cost_entries ADD COLUMN origin TEXT NOT NULL DEFAULT 'user-entered'
  CHECK (origin IN ('owner-accepted','imported','user-entered','supplier-quote','promoted-from-estimate'));
ALTER TABLE cost_library_item_variant_cost_entries ADD COLUMN region TEXT;
ALTER TABLE cost_library_item_variant_cost_entries ADD COLUMN version_label TEXT;
ALTER TABLE cost_library_item_variant_cost_entries ADD COLUMN currency TEXT NOT NULL DEFAULT 'PHP';

-- Backfill (owner-gated default, OPEN-1): mark existing current entries as 'accepted'.
-- Two backfill modes selected by owner; default mode A.
-- Mode A (recommended): existing is_current rows -> 'accepted' with reviewed_by = system.
UPDATE cost_library_item_variant_cost_entries
   SET review_status = 'accepted', reviewed_by = 'system-backfill', reviewed_at = <now_iso>, review_revision = review_revision
 WHERE is_current = 1 AND deleted_at IS NULL AND review_status = 'proposed';
-- Mode B (stricter): leave as 'proposed' (no inherited trust).

-- Note: SQLite CHECK on ALTER ADD COLUMN with NOT NULL + default is supported; existing rows take default.
-- Additional table-level CHECKs added via separate statements if D1 rejects inline multi-col CHECK on ALTER.

CREATE UNIQUE INDEX IF NOT EXISTS idx_cost_entries_one_accepted_current_per_option
  ON cost_library_item_variant_cost_entries(price_option_id)
  WHERE review_status = 'accepted' AND is_current = 1 AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_cost_entries_review_status_workspace
  ON cost_library_item_variant_cost_entries(workspace_id, review_status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_cost_entries_assignee_due
  ON cost_library_item_variant_cost_entries(workspace_id, assigned_to, review_due_at)
  WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cost_entries_origin
  ON cost_library_item_variant_cost_entries(workspace_id, origin);

-- Extend state history for review events (DEC-3).
ALTER TABLE cost_library_item_state_history ADD COLUMN review_event_type TEXT;
ALTER TABLE cost_library_item_state_history ADD COLUMN from_status TEXT;
ALTER TABLE cost_library_item_state_history ADD COLUMN to_status TEXT;
ALTER TABLE cost_library_item_state_history ADD COLUMN review_revision INTEGER;
ALTER TABLE cost_library_item_state_history ADD COLUMN correlation_id TEXT;
CREATE INDEX IF NOT EXISTS idx_state_history_review_event
  ON cost_library_item_state_history(workspace_id, review_event_type, created_at DESC)
  WHERE review_event_type IS NOT NULL;
```

**D1/SQLite note:** D1 supports `ALTER TABLE … ADD COLUMN` with constants/defaults. Multi-column table-level CHECK constraints cannot always be added via ALTER in older SQLite; if rejected, the implementation creates a new table with CHECKs and migrates rows (standard SQLite table-rebuild). The implementation task (`TASK-006`) must verify against current D1 SQL support and use the table-rebuild path if needed. This is a known D1 nuance, not a blocker.

### Backfill strategy

- Default Mode A: existing `is_current` rows → `accepted` with `reviewed_by='system-backfill'`. Preserves current behavior (today all entries are implicitly usable). Owner chooses (`OPEN-1`).
- Mode B: leave as `proposed` (no inherited trust). Stricter; requires re-review of everything.
- Backfill is idempotent (WHERE `review_status='proposed'`).

### Data-volume assumptions & cardinality

| Volume | Rows in `cost_library_item_variant_cost_entries` | Notes |
|---|---|---|
| Current (1 workspace, pre-launch) | <1k | trivial |
| 10x | ~10k | index coverage essential for `review_status` facet |
| 100x | ~100k | `idx_cost_entries_review_status_workspace` must hold |
| 1000x | ~1M | D1 row/DB limits become relevant; overview query must paginate |

`LIBRARY_COMPONENT_CAP=10_000` per workspace bounds per-workspace volume; cross-workspace aggregate is the scaling axis.

### Concurrency & lock strategy

- Optimistic concurrency via `review_revision` (no pessimistic locks).
- Accept/supersede use a single D1 transaction (begin/update-with-where-`review_revision=expected`/insert-event/commit). If the UPDATE affects 0 rows → conflict (`'40001'`-equivalent app error).
- D1 transaction limitations: implementation uses app-level transaction with revalidation; `cf:d1-rpc-transaction-proof.ts` pattern is the proof template.

### Expected query count per action

| Action | D1 queries |
|---|---|
| `acceptCostEntry` | 1 SELECT (authz) + 1 SELECT (entry+workspace) + 1 UPDATE + 1 INSERT(event) + 1 UPDATE(mirror) = ~5 |
| `loadCurrentWorkspaceComponentLibrary` | unchanged + 0 extra (review_status in projection) |
| Estimate read with stale propagation | +1 JOIN/subquery vs library entry current version (or computed in app from already-joined row) |

### Index selectivity assumptions

- `idx_cost_entries_review_status_workspace`: high selectivity on `('needs_review')` vs all; drives overview "Needs review" count in O(log n + k).
- `idx_cost_entries_assignee_due`: selective (sparse, WHERE assigned_to IS NOT NULL).

### Pagination/filter/order

- Existing library list pagination unchanged. New facet filter uses the same limit/offset path with the new indexes. Worst-case scan risk: facet on `origin='imported'` without workspace filter — mitigated by always-on `workspace_id` predicate.

### D1 query/authz cost

- Review actions are admin-only and infrequent; cost negligible.
- Stale-propagation read: +1 comparison per estimate row on read (cheap).
- Overview "Needs review" count: indexed; denormalized mirror avoids join.

### Generated-type impact

- D1 binding shape unchanged (no new bindings) → `cf:typegen` not strictly required. App-level types (`EstimateRowItem`, `ComponentPriceOptionInput`, `ComponentVariantCostEntryInput`, repository datasets) extended. Task lists exact imports.

### Rollback / fix-forward

- **Rollback:** `0038` is additive (columns + indexes). Rolling back the migration means leaving columns in place (SQLite cannot easily DROP COLUMN with CHECK). Fix-forward is the strategy: if a CHECK is wrong, ship `0039` that rebuilds the table or relaxes the constraint.
- **Data rollback:** if Mode A backfill is wrong, ship a follow-up to reset affected rows to `proposed` (tracked by `reviewed_by='system-backfill'`).
- Application rollback: feature-flag review actions off (OPS gate in `13`); the additive columns are inert without the new actions.

### Local + provider proof

- Local: `wrangler d1 migrations apply archestimator-proof-db --local` (or `cf:` script); assert columns exist (`PRAGMA table_info(...)`).
- Remote: `wrangler d1 migrations apply archestimator-proof-db --remote` only after preview gate passes (`13`).
- Proof scripts: `cf:d1-rpc-transaction-proof.ts` (template for the accept/supersede transaction); `cf:provider-proof.ts` (readback).

## API & network plan

### Server Actions (new) — `src/lib/component-library/actions.ts`

| Action | Input | Authz | Output | Conflict |
|---|---|---|---|---|
| `assignCostEntryForReview` | `{entryId, assigneeUserId, dueAt?}` | governance-admin | `{ok}` | revision check optional |
| `acceptCostEntry` | `{entryId, expectedReviewRevision, note?}` | governance-admin | `{entry}` | 409 on mismatch |
| `rejectCostEntry` | `{entryId, expectedReviewRevision, note}` | governance-admin | `{entry}` | 409 |
| `lockCostEntry` | `{entryId, lockReason, expectedReviewRevision}` | governance-admin | `{entry}` | 409 |
| `unlockCostEntry` | `{entryId, expectedReviewRevision}` | governance-admin | `{entry}` | 409 |
| `supersedeCostEntry` | `{oldEntryId, newEntryInput, expectedReviewRevision}` | governance-admin | `{oldEntry,newEntry}` | 409 |
| `importLibrary` | `{file, format, mode:'dry-run'\|'commit'}` | workspace editor | dry-run: `{rows, errors}`; commit: `{insertedCount}` | quota check |
| `exportLibrary` | `{format, includeIds?}` | workspace member | `{url or blob}` | n/a |

### Request/response DTOs

- Typed inputs/outputs at the action boundary (no `any`).
- `expectedReviewRevision` always present on mutations of an existing entry.
- Error variant: `{code: 'review_revision_conflict' | 'authorization_denied' | 'quota_exceeded' | 'validation_failed', message, fieldErrors?}`.

### Validation

- All string inputs through existing `normalizeQuickAddText`/control-char strip + length caps.
- `pricingSource` https check reused.
- Import: streaming CSV parse, per-row schema validation reusing `validateQuickAddComponentInput` shape, formula-prefix neutralization. **Streaming-lib choice:** use a Worker-CPU-friendly streaming CSV parser (e.g. `papaparse` in streaming mode, or a repo-vetted equivalent) — confirm the chosen lib's bundle size and Worker compatibility in `TASK-024` before adoption; reject any lib that buffers the whole file. **Worker CPU/memory ceiling:** the 5 MB file cap + `LIBRARY_COMPONENT_CAP`-aware row cap keep parse within Workers free-tier CPU limits; `TASK-028` proves with a 5 MB / max-row fixture that parse + validate completes under the Workers CPU budget (sub-second to low-single-digit seconds) and rejects oversized input with `413`/`400` before CPU exhaustion.

### Idempotency / duplicate-submit

- Review actions are idempotent only if `expectedReviewRevision` unchanged; otherwise conflict (correct behavior — prevents lost updates).
- Import commit: optional `source_hash` dedupe column (P2) to prevent exact-duplicate re-imports. Default: no dedupe (each import is explicit).

### Rate limits / abuse

- Import is workspace-scoped and editor-gated; row cap protects. No new Cloudflare rate-limit rule required (existing WAF posture). If abuse emerges, add route-level limit (OPS).

### Timeouts / retries / cancellation

- Import parse bounded by file size cap (e.g., 5 MB CSV) + row cap. Long parse → return 400 with "too large".
- Review actions are single-round trips; client retry only on network error with unchanged revision (idempotent).

### Partial failures

- Accept/supersede: atomic transaction; no partial.
- Import commit: atomic per workspace batch; on failure, no rows inserted (all-or-nothing) — dry-run first reduces surprise.

### Third-party failures

- None (no external API). R2 used only for attachments (existing path).

### Backward compatibility

- Additive columns with defaults → old reads unaffected. Old clients that don't know `reviewStatus` still work (default `accepted` after Mode A backfill preserves "everything is usable").

### Access-path matrix (multi-source)

| Source | Chosen path | Runtime role | Authorization | Latest posture | Proof | Fallback |
|---|---|---|---|---|---|---|
| D1 `cost_library_item_variant_cost_entries` | repository + actions | Worker | `isCostLibraryGovernanceAdminInD1` (new) | additive migration 0038 | local + remote D1 readback | none needed (single source) |
| R2 `ARCH_UPLOADS_R2` (attachments) | existing `attachments/route.ts` | Worker | `isWorkspaceEditorInD1` | unchanged | existing | n/a |
| Supabase (reference) | read-only migration file | none | n/a | exit archaeology | n/a | n/a |

No source in the plan lacks a runtime path.

## Network behavior

- All via Server Actions (RPC over fetch) — same as existing. No new Route Handlers required (attachments route unchanged). Import/export via actions returning blobs/URLs.
- Bundle impact: minimal — new client code is inspector toolbar + import dialog; tree-shaken behind existing library routes.
- RSC payload: review-state fields add a few bytes per item; negligible.
