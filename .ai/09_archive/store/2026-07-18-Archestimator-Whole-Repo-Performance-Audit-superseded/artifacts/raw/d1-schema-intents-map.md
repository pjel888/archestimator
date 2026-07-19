# D1 / SQLite Data Layer Map

Source: dispatched agent recon against `HEAD = a41a07d0143abf72289a97cd8bd023cfa9986361`. Full text captured.

## Schema Summary (migrations 0080-0092 + origins)

| Table | Purpose | Key indexes (0080+) | JSON / growth |
|---|---|---|---|
| `estimate_row_items` | Line items | `idx_estimate_row_items_estimate_sort`, `idx_estimate_row_items_node`, partial `idx_estimate_row_items_source_library_item` | `source_snapshot_json`, `metadata_json` |
| `estimate_nodes` | Tree groups | `idx_estimate_nodes_estimate_sort` | `metadata_json` |
| `estimate_tabs` | Tabs | partial `WHERE archived_at IS NULL` | — |
| `estimate_sheet_events` | Activity history | `idx_estimate_sheet_events_estimate_target_row_created`, `_estimate_node_created` | `row_context`, `old_snapshot`, `new_snapshot`, `changed_fields`, `payload` — **unbounded growth** |
| `estimate_mutation_receipts` (0081) | Idempotency receipts | `UNIQUE(workspace_id, command_kind, intent_id)` | `result_json` (≤64 KB) |
| `project_publications` | Published share-link snapshot | partial `WHERE status='published'`; project_status; token_hash | `snapshot_json` (**large, unbounded**), `selected_estimate_ids`, `activity_target_labels_json` |
| `projects` | publication_source_revision fence | column CHECK | `metadata` |
| `cost_library_items` | Workspace library items | `(workspace_id, lifecycle_state, updated_at DESC)`; `(workspace_id, library_folder_id, name)`; partial `idx_cost_library_items_active_browse_cursor(workspace_id, created_at DESC, id ASC) WHERE lifecycle_state <> 'archived'` (0083) | multiple JSON |
| `library_folders` | Folder tree | (+ `is_default_category` from 0085) | — |
| `upload_assets` / `upload_asset_cleanup_objects` (0084) | Upload lifecycle + purge queue | cleanup-queue + result indexes | various |
| `admin_action_items` / `admin_customer_notes` / `admin_release_records` / `admin_saved_replies` (0088-0091) | Founder admin tooling | one status/created index each | bounded TEXT |
| **`estimate_template_versions`** (0092) | Immutable point-in-time Template snapshot | `idx_estimate_template_versions_workspace_template(workspace_id, template_id, version_number DESC)`; trigger `trg_estimate_template_versions_immutable` blocks UPDATE | `snapshot_json` (**append-only, unbounded**), `change_summary_json` |
| **`estimate_template_instances`** (0092) | Live linked occurrence in estimate+tab | partial `idx_estimate_template_instances_template_state WHERE template_id IS NOT NULL`; `_estimate_tab`; 5 integrity triggers | `detached_root_ids_json` |
| **`estimate_template_instance_nodes`** (0092) | template_node ↔ estimate_node map | PK + UNIQUE + `idx_template_instance_nodes_estimate_node` | — |
| **`estimate_template_instance_rows`** (0092) | template_row ↔ estimate_row map | PK + UNIQUE + `idx_template_instance_rows_estimate_row` | — |
| **`estimate_template_propagation_jobs`** (0092) | Per-instance job queue | partial `idx_template_propagation_jobs_ready WHERE state='pending'`; `_expired WHERE state='processing'`; `_retryable_dead WHERE state='dead' AND retryable=1` | — |
| **`estimate_template_mutation_intents`** (0092) | One-pending-per-(ws,template) command intent | partial `uq_template_mutation_intents_one_pending WHERE state='pending'`; `_pending_lease`; `_resolved WHERE state <> 'pending'` | `normalized_payload_json` (≤256 KB), `result_json` |

## Access Layer & Batch Policy

- **Estimate read repository**: `src/lib/estimates/estimate-tree-read-repository.ts:1-1002`. Cold-load: `readLegacyEstimateTreeD1 :690`, `readEstimateTabTreePayloadD1 :734`, `readEstimateNodeSubtreeD1 :823` (BFS), `readEstimateTreesForTabsD1 :951`.
- **Estimate intent modules**: `src/lib/estimates/d1-intents/{rows,nodes,tabs,templates,history-events,component-impact,access,estimate-records,bulk-sheets}.ts` + `database.ts`, `intent-context.ts`, `_component-identity.ts`.
- **Workspace repository**: `src/lib/repositories/workspace-repository.ts:1-3713`. Estimate orchestration + dashboard homebase + sidebar.
- **Component-library repository**: `src/lib/repositories/component-library-repository.ts`.
- **Publication store**: `src/lib/publication/d1-store.ts:215`; admin RPC `admin-d1-client.ts:854`.
- **Linked-Template propagation**: `template-propagation-d1.ts`, `template-linked-mutation-d1.ts`, `template-versioning-d1.ts`, `template-link-impact-d1.ts`, `template-intent-recovery-d1.ts`.

Note: `src/lib/repositories/estimate-repository.ts:88-101` is a **non-persistent in-memory mock** — not the real D1 path.

### Batch helpers (`d1-intents/database.ts`)

- `runD1Batch(database, statements) :74` — uses `database.batch`; throws if any `result.success === false` (hard-throw).
- `runPreparedD1Batch :99` — concatenates statements + prepared; same hard-throw.
- **Hard limit**: `D1_MUTATION_HARD_STATEMENT_LIMIT = 1_000` enforced by `assertD1MutationStatementLimit` (`mutation-receipts.ts:5,52`). Every mutation path calls it.
- Linked-Template propagation bypasses `runD1Batch` and calls `database.batch(...)` directly to inspect `meta.changes` on the lease ack (`template-propagation-d1.ts:654-656`).

### Intent pattern (`intent-context.ts:120 prepareEstimateMutationIntent`)

Front door for every estimate mutation:
1. `assertEstimateEditIntent :97` — `canEditEstimateStrictInD1` (1 stmt) + estimate/project/workspace read (1 stmt).
2. `readEstimateIntentContext :63` — 1 stmt.
3. `createMutationRequestFingerprint` SHA-256 (`mutation-receipts.ts:48`).
4. `readCommittedMutationReceipt :61` — 1 stmt against `estimate_mutation_receipts`. Cached `result_json` returned if committed; `MutationIntentConflictError` thrown if receipt exists with different actor/fingerprint.

Every mutation batch includes `buildEstimateMutationReceiptStatement(...) :163` so receipt + mutation land atomically. On batch failure, paths re-read the receipt (`readConcurrentEstimateMutationReceipt :152`) — if concurrent commit landed, returns that result instead of erroring (cooperative idempotency).

### Per-row read patterns (N+1 risks)

- **Batched `WHERE IN` is the norm.** `readEstimateRows` chunks node-ids at `ESTIMATE_TREE_ROW_NODE_BATCH_SIZE` and parallel `all()` per chunk (`estimate-tree-read-repository.ts:289-309`).
- **Restore-replay is the confirmed N+1** (`rows.ts:3187-3191`) capped at 100.
- **Activity outbox reconcile is N+1** (`activity-outbox.ts:112-154`) — 2 stmts per row, up to 500 rows.

## Linked-Template Propagation Path

### Write side (Template editor commits new version)

`template-linked-mutation-d1.ts:13 buildLinkedTemplateMutationStatements` returns **6 set-based statements** for one Template mutation regardless of fanout:
1. `linked_template_mutation_guard` — correlated `group_concat` over active instances + intent lease check.
2. `INSERT INTO estimate_template_versions SELECT ... json_object(...)` — rebuilds full snapshot from `estimate_template_nodes`/`estimate_template_row_items`.
3. `UPDATE estimate_templates SET current_version_number`.
4. `UPDATE estimate_template_instances SET target_version_number, link_state='updating'` (all linked/updating/failed instances).
5. `INSERT INTO estimate_template_propagation_jobs SELECT FROM estimate_template_instances ON CONFLICT(instance_id) DO UPDATE` — **set-based fanout, not per-instance loop**.
6. `UPDATE estimate_template_mutation_intents SET state='committed'`.

Per-template mutation = 6 batched statements + K rows inserted into `estimate_template_propagation_jobs` by statement 5.

### Reconcile side (cron-driven drain)

`worker.ts:205-235` 5-min cron drives `Promise.all` of: notifications + `reconcileExpiredTemplateMutationIntents` + `reconcileTemplatePropagationJobs`.

`reconcileTemplatePropagationJobs` (`template-propagation-d1.ts:720`):
- Per tick: 1 batched SELECT (limit 1-100, default 25).
- Per selected job: 1 lease-claim UPDATE (60 s lease, `TEMPLATE_PROPAGATION_LEASE_MS = 60_000 :15`).
- On success → `applyClaimedJob :297`. On failure → `recordJobFailure :659` (3-stmt batch).

**Per-instance cost (`applyClaimedJob` success)**:
- Pre-batch ≈ 6 reads.
- Batch = **13-15 statements** `:457-651`: lease guard, optional component-source `json_each` guard, optional row-revision `json_each` guard, 2 deletes for stale rows/nodes, 2 `INSERT...SELECT FROM json_each` upserts for nodes/rows, 2 `INSERT...SELECT FROM json_each` upserts for mappings, publicationRevision UPDATE, history + outbox (2), instance `link_state='linked'` UPDATE, job `state='completed'` UPDATE.
- **Total ≈ 19-21 per instance.**

**Per-instance failure**: 3-statement batch only.

### Retry / dead-letter

- `TEMPLATE_PROPAGATION_MAX_ATTEMPTS = 10`. Exponential backoff via `nextAttemptAt`.
- Terminal `dead` requires specific `failure_class` (`attempts_exhausted` is retryable=1; `component_unavailable`/`access_revoked`/`scope_integrity`/`mapping_repair_required` are retryable=0) — enforced by table-level CHECK (`0092:301-310`).
- Manual re-queue via `retryTemplatePropagationJobs :766` — set-based UPDATE; only attempts-exhausted qualifies.
- Stuck-pending intents cleaned by `reconcileExpiredTemplateMutationIntents` (limit 1-500, default 100).

### Snapshot JSON growth

`estimate_template_versions.snapshot_json` is a complete `{template, nodes[], rows[]}` object. Append-only (trigger blocks UPDATE). PK `(template_id, version_number)`; read via the workspace+template+version DESC index (`0092:62`).

## Hot Operations Query Budget

| Operation | File:function | Statements |
|---|---|---|
| Insert estimate row | `rows.ts:1904` | ~13-16 (6 pre-batch + 6-9 batch + 1 post) |
| Update estimate row | `rows.ts:2496` → `patchEstimateRowItem :2252` | ~13-20+ (grows with component fanout) |
| Delete estimate row (single) | `rows.ts:2533` | ~12 |
| Bulk delete rows | `rows.ts:2643` | ~11 — **more efficient per row than N singles** |
| Move/reorder rows | `rows.ts:2760` | ~11 + N (one UPDATE per moved row) |
| Restore deleted rows | `rows.ts:3104` | fresh ~15; **replay ~5 + up to 100 (N+1)** |
| Create estimate node | `nodes.ts:375` | ~10-11 |
| Estimate open / cold load (tab tree) | `estimate-tree-read-repository.ts:734` | **~6** (4 reads + 2 RBAC) |
| Subtree lazy expand | `estimate-tree-read-repository.ts:823` | ~D + 3 for depth D |
| Publication create | `publication/actions.ts:876` → RPC `admin-d1-client.ts:522` | ~8 (no retry) to ~21 (with source-revision retries ×3) |
| Add shared-link recipients (N) | `publication/actions.ts:1453` | 1 + 2N (bounded-concurrency 4, NOT batched) |
| Library list (full) | `component-library-repository.ts:1289` | min 8; scales with `ceil(item_count/1000)` |
| Library list (lite / sidebar) | `getCurrentWorkspaceComponentLibraryLite :2395` | ~6 |
| Project dashboard (workshop render) | `workspace-repository.ts:2165` | **~18-22** (matches `perf:dashboard-query-count` target) |
| Linked Template propagation — single job success | `template-propagation-d1.ts:297` | ~19-21 per instance |
| Linked Template propagation — single job failure | `:659` | ~3 |
| Linked Template propagation — per cron tick | `:720` | 1 + K × (1 + ~20 success OR 3 failure); default K=25 → ~526; worst K=100 → ~2,101 |
| Linked Template Template-mutation fanout | `template-linked-mutation-d1.ts:13` | exactly 6 + K rows inserted by statement 5 |

## EXPLAIN Candidates (top 10)

1. **Unbounded full library scan without covering index** — `component-library-repository.ts:561-575`. Paginated 1000/page loop with `ORDER BY category ASC, name ASC LIMIT ? OFFSET ?`. Indexes: `(workspace_id, lifecycle_state, updated_at DESC)`, `(workspace_id, library_folder_id, name)`, partial `(workspace_id, created_at DESC, id ASC) WHERE lifecycle_state <> 'archived'` from 0083. **None cover `ORDER BY category, name`** → each 1000-row page = full workspace scan + sort. Legacy full-library load path (when `itemLimit` and `itemIds` undefined).

2. **`MAX(sort_order)` correlated per node** — `rows.ts:1950-1954` (insert), `nodes.ts:413-423`. Index `idx_estimate_row_items_node(node_id, id)` doesn't include `sort_order` → MAX via index scan + row lookup. Per-row on bulk inserts.

3. **Component-source guard with 15+ `json_extract` correlations** — `template-propagation-d1.ts:472-502`. Nested `json_each` driving into three joined tables with 15 `json_extract` predicates. Same shape at `:503-519`.

4. **`json_each` IN-lists against instance mapping tables** — `rows.ts:1803-1816` (issued on every bulk delete). `json_each` virtual table may be chosen as outer loop.

5. **Template-link projection CTE with `ROW_NUMBER() OVER (PARTITION BY ...)`** — `estimate-tree-read-repository.ts:336-385`. 4-CTE query with window functions. SQLite materializes; no supporting index.

6. **Activity history search with 8 `json_extract ... LIKE` predicates OR'd** — `history-events.ts:270-288`. JSON scan over every estimate event when search term present. `estimate_sheet_events` is unbounded-growth.

7. **Dashboard IN-with-EXISTS access probes** — `workspace-repository.ts:2467-2493`, `:1312-1345`. 3 correlated EXISTS subqueries per candidate id.

8. **`group_concat` over all active instances in mutation guard** — `template-linked-mutation-d1.ts:25-46`. O(instances-per-template) on every mutation; index-supported but still linear.

9. **Insert-and-publish snapshot join** — `admin-d1-client.ts:583-615`. Single-row probe gating entire publish.

10. **`loadComponentSources` per propagation job** — `template-propagation-d1.ts:142-198`. Multi-table IN-list join per job; scales with components per template.

## Static-Confirmed Observations

1. Estimate mutation intents idempotent via `estimate_mutation_receipts` with SHA-256 fingerprint.
2. Every estimate mutation batch ends with `buildProjectPublicationRevisionForEstimate` incrementing `projects.publication_source_revision`.
3. D1 batch helpers hard-throw on any failed statement.
4. Estimate mutations capped at 1000 statements via `assertD1MutationStatementLimit`.
5. Restore-replay N+1 against `estimate_row_items` capped at 100 rows.
6. Activity outbox reconcile N+1 (2 stmts/row, up to 500 rows).
7. 5-min cron drains template propagation alongside notifications + intent recovery.
8. Propagation uses lease-token optimistic concurrency (60 s lease, 10-attempt cap).
9. Linked-Template mutation fanout is set-based, not per-instance.
10. Linked-Template mutation intents constrained to one pending per `(workspace, template)` via partial UNIQUE.
11. Dashboard render issues ~18-22 D1 statements (matches `perf:dashboard-query-count`).
12. `addSharedLinkRecipients` issues 2 D1 statements per recipient (insert + status-update), bounded concurrency not batching.
13. Component-library "full" load paginates 1000 rows/page with `ORDER BY (category, name)` and no supporting index.
14. Linked-Template propagation bypasses `runD1Batch` and calls `database.batch` directly to inspect `meta.changes` on lease ack.
15. `estimate_template_versions.snapshot_json` is append-only; grows one full Template graph per version.
