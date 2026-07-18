# Architecture And D1 Contract

## 1. Current Source Evidence

### Template master today

`migrations/0024_estimate_templates.sql` defines `estimate_templates`, `estimate_template_nodes`, and `estimate_template_row_items`. The graph has stable source IDs and component-link snapshots, but the header has only `updated_at`; there is no Template revision table.

`src/lib/component-library/template-editor-actions.ts` provides guarded node and row CRUD. `buildTemplateEditorMutationStatements` updates `estimate_templates.updated_at`, writes telemetry/receipt state, and commits a D1 batch, but it does not create an immutable source revision or downstream propagation work.

`src/lib/component-library/actions.ts` provides header CRUD, creation from an Estimate node/tab, duplicate, category move, rename, and hard delete. Current delete cascades only inside Template tables because copied Estimate content has no FK to the Template.

### Template insertion today

`src/lib/estimates/d1-intents/templates.ts:copyTemplateNodes` is a guarded snapshot copy:

- it loads source nodes/rows and current linked Component sources;
- generates new Estimate node/row IDs;
- inserts materialized `estimate_nodes` and `estimate_row_items`;
- writes history/outbox, publication revision, and an estimate mutation receipt; and
- returns authoritative inserted IDs for a fresh tree read.

No `template_instance_id`, source-node map, or source-row map survives the insertion. History metadata records the source Template ID, but metadata is provenance, not a durable maintained relationship.

### Linked Component precedent

`src/lib/component-library/component-mutation-d1.ts` already establishes the strongest reusable pattern:

- `listLinkedEstimateRowTargets` finds active linked rows;
- source version and linked-impact fingerprint are checked before commit;
- an immutable Component version is written;
- `buildLinkedEstimateRowSyncPlans` preserves row-local overrides;
- a set-based `json_each(?)` statement updates linked rows;
- estimate history/outbox and publication revisions are advanced; and
- the authoritative result includes affected Estimates, row revisions, and patches.

The linked Template architecture reuses this control model but cannot reuse the row-only schema because a Template owns a graph, not one row.

### Read and render path today

`src/lib/estimates/estimate-tree-read-repository.ts` reads materialized nodes/rows. `EstimateTreeNode` has no Template-link projection. `src/components/workshop/estimate-sheet/rows/branch.tsx` recursively renders branches and has a strict memo comparator. `virtual-branch-list.tsx` flattens large sheets, so a single DOM wrapper around an entire multi-node linked instance is not reliable.

### Worker and resource truth

Current `wrangler.jsonc` binds:

- D1 `ARCH_DB`;
- `UPLOAD_JOBS_QUEUE` for upload work; and
- `CLIENT_PORTAL_NOTIFICATIONS_QUEUE` for notification delivery.

The Worker already has `*/5 * * * *` plus three nightly schedules. In `worker.ts`, the five-minute branch enqueues Client Portal notification outbox rows and currently returns. The selected design adds Template job draining to that same scheduled branch; it does not repurpose either Queue.

## 2. Platform Constraints Checked On 2026-07-18

The current official Cloudflare documentation states:

- D1 `batch()` executes prepared statements sequentially as a transaction; a failed statement aborts or rolls back the sequence: [D1 Database API](https://developers.cloudflare.com/d1/worker-api/d1-database/).
- D1 currently documents 1,000 queries per Worker invocation on paid plans and 50 on free, 100 bound parameters per query, a 30-second SQL/batch duration limit, and one-at-a-time processing per individual database: [D1 limits](https://developers.cloudflare.com/d1/platform/limits/).
- Cloudflare Queues provides at-least-once delivery, so consumers must be idempotent: [Queues delivery guarantees](https://developers.cloudflare.com/queues/reference/delivery-guarantees/).
- Queue batches support individual acknowledgement/retry and configurable DLQs, but a new Queue would require a new bound resource: [Queues batching and retries](https://developers.cloudflare.com/queues/configuration/batching-retries/).

These limits can change. `provider-limit-or-binding-change` is a stale trigger for this pack.

## 3. Alternative Analysis

| Route | Read performance | Write semantics | Recovery | Provider change | Decision |
| --- | --- | --- | --- | --- | --- |
| Snapshot copy | Excellent | No propagation | N/A | None | Reject for linked mode; retain as explicit copy. |
| Live read-through | Adds merge/version work to every consumer | Source appears immediate | Complex cache/history fallback | None | Reject. |
| One all-instance D1 transaction | Excellent | Global all-or-none | Retry whole fan-out | None | Reject as the only path; unbounded latency/failure coupling. |
| Dedicated Queue fan-out | Excellent | Per-instance eventual | Strong ack/retry/DLQ | New Queue/binding/DLQ | Defer until measured need. |
| D1 job + immediate drain + existing cron | Excellent | Master atomic; instance atomic; eventual global convergence | Durable lease/retry/dead plus request replay | None | Select. |

## 4. Data Model

The implementation uses the next additive migration: `migrations/0092_linked_estimate_template_instances.sql`.

### 4.1 Template header additions

```sql
ALTER TABLE estimate_templates
  ADD COLUMN current_version_number INTEGER NOT NULL DEFAULT 1
  CHECK (current_version_number >= 1);

ALTER TABLE estimate_templates ADD COLUMN archived_at TEXT;
ALTER TABLE estimate_templates ADD COLUMN archived_by TEXT;
```

Active Template browse/read queries add `archived_at IS NULL`; restore queries remain explicit.

### 4.2 Immutable versions

```sql
CREATE TABLE estimate_template_versions (
  template_id TEXT NOT NULL,
  version_number INTEGER NOT NULL CHECK (version_number >= 1),
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  snapshot_json TEXT NOT NULL CHECK (
    json_valid(snapshot_json) AND json_type(snapshot_json) = 'object'
  ),
  source_fingerprint TEXT NOT NULL,
  change_kind TEXT NOT NULL,
  change_summary_json TEXT NOT NULL DEFAULT '{}' CHECK (
    json_valid(change_summary_json) AND json_type(change_summary_json) = 'object'
  ),
  created_by TEXT,
  created_at TEXT NOT NULL,
  PRIMARY KEY (template_id, version_number),
  FOREIGN KEY (template_id, workspace_id)
    REFERENCES estimate_templates(id, workspace_id) ON DELETE CASCADE
);

CREATE INDEX idx_estimate_template_versions_workspace_template
  ON estimate_template_versions(workspace_id, template_id, version_number DESC);
```

`snapshot_json` is a deterministic flat graph, not recursive JSON. Component-linked rows deliberately omit Component-owned descriptive/pricing fields:

```json
{
  "template": { "id": "...", "name": "...", "description": "...", "category": "..." },
  "nodes": [{ "id": "...", "parentId": null, "kind": "group", "name": "...", "sortOrder": 0 }],
  "rows": [
    { "id": "custom-row", "rowKind": "custom", "templateNodeId": "...", "sortOrder": 0, "material": "...", "initialTakeoffDefaults": {} },
    { "id": "component-row", "rowKind": "component", "templateNodeId": "...", "sortOrder": 1, "sourceLibraryItemId": "...", "selectedVariantId": "...", "initialTakeoffDefaults": {} }
  ]
}
```

For a custom row, the snapshot contains Template-owned content. For a Component-linked row, it contains only Template-owned membership/topology, Component identity, selected variant, and initial takeoff defaults used when the row is first materialized. It never treats `source_snapshot`, Component description, supplier, unit, price, or Component version as replayable truth. Surviving Estimate rows never receive `initialTakeoffDefaults` again.

The migration backfills version `1` for every existing Template from ordered flat rows. It creates no instance records and does not inspect historical Estimate metadata. Later versions are application-generated after source and impact guards.

### 4.3 Linked instances

```sql
CREATE TABLE estimate_template_instances (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  template_id TEXT,
  source_template_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  estimate_id TEXT NOT NULL,
  estimate_tab_id TEXT NOT NULL,
  target_parent_node_id TEXT,
  link_state TEXT NOT NULL CHECK (
    link_state IN ('linked', 'updating', 'failed', 'detached')
  ),
  applied_version_number INTEGER NOT NULL CHECK (applied_version_number >= 1),
  target_version_number INTEGER NOT NULL CHECK (
    target_version_number >= applied_version_number
  ),
  last_error_code TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  detached_at TEXT,
  detached_by TEXT,
  detached_root_ids_json TEXT NOT NULL DEFAULT '[]' CHECK (
    json_valid(detached_root_ids_json) AND json_type(detached_root_ids_json) = 'array'
  ),
  CHECK (
    (link_state = 'detached' AND template_id IS NULL AND detached_at IS NOT NULL)
    OR (link_state <> 'detached' AND template_id IS NOT NULL AND detached_at IS NULL)
  ),
  UNIQUE (id, workspace_id, estimate_id),
  UNIQUE (id, workspace_id, template_id),
  FOREIGN KEY (template_id, workspace_id)
    REFERENCES estimate_templates(id, workspace_id) ON DELETE RESTRICT,
  FOREIGN KEY (project_id, workspace_id)
    REFERENCES projects(id, workspace_id) ON DELETE CASCADE,
  FOREIGN KEY (estimate_id, project_id)
    REFERENCES estimates(id, project_id) ON DELETE CASCADE
);

CREATE TRIGGER guard_template_instance_tab_insert
BEFORE INSERT ON estimate_template_instances
WHEN NOT EXISTS (
  SELECT 1 FROM estimate_tabs t
  WHERE t.id = NEW.estimate_tab_id
    AND t.estimate_id = NEW.estimate_id
    AND t.archived_at IS NULL
)
BEGIN
  SELECT RAISE(ABORT, 'template_instance_tab_scope');
END;

CREATE TRIGGER guard_template_instance_tab_update
BEFORE UPDATE OF estimate_tab_id, estimate_id ON estimate_template_instances
WHEN NOT EXISTS (
  SELECT 1 FROM estimate_tabs t
  WHERE t.id = NEW.estimate_tab_id
    AND t.estimate_id = NEW.estimate_id
    AND t.archived_at IS NULL
)
BEGIN
  SELECT RAISE(ABORT, 'template_instance_tab_scope');
END;

CREATE TRIGGER guard_template_instance_parent_insert
BEFORE INSERT ON estimate_template_instances
WHEN NEW.target_parent_node_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM estimate_nodes n
    WHERE n.id = NEW.target_parent_node_id
      AND n.estimate_id = NEW.estimate_id
      AND n.estimate_tab_id = NEW.estimate_tab_id
  )
BEGIN
  SELECT RAISE(ABORT, 'template_instance_parent_scope');
END;

CREATE TRIGGER guard_template_instance_parent_update
BEFORE UPDATE OF target_parent_node_id, estimate_id, estimate_tab_id
ON estimate_template_instances
WHEN NEW.target_parent_node_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM estimate_nodes n
    WHERE n.id = NEW.target_parent_node_id
      AND n.estimate_id = NEW.estimate_id
      AND n.estimate_tab_id = NEW.estimate_tab_id
  )
BEGIN
  SELECT RAISE(ABORT, 'template_instance_parent_scope');
END;

CREATE INDEX idx_estimate_template_instances_template_state
  ON estimate_template_instances(template_id, link_state, target_version_number, id)
  WHERE template_id IS NOT NULL;

CREATE INDEX idx_estimate_template_instances_estimate_tab
  ON estimate_template_instances(estimate_id, estimate_tab_id, link_state, id);
```

`source_template_id` is immutable audit provenance. Active rows retain the workspace-bound FK-bearing `template_id`. `project_id`, `estimate_id`, `estimate_tab_id`, and an optional parent are constrained to one resource chain in D1 rather than trusted to request-layer checks. Detach sets `template_id = NULL`, which allows later master permanent deletion while preserving a redacted audit tombstone.

Current legacy Estimate nodes may have `estimate_tab_id = NULL`. Migration `0092` does **not** infer or backfill tabs for that content. Linked insertion requires an explicit active target tab; a tabless target or parent is rejected before mutation with `template_link_requires_active_tab` and the UI offers `Insert copy instead`. Copy mode retains current nullable-tab behavior. This keeps linked identity unambiguous without rewriting historical Estimate topology.

### 4.4 Stable mappings

```sql
CREATE TABLE estimate_template_instance_nodes (
  instance_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  estimate_id TEXT NOT NULL,
  template_node_id TEXT NOT NULL,
  estimate_node_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (instance_id, template_node_id),
  UNIQUE (instance_id, estimate_node_id),
  FOREIGN KEY (instance_id, workspace_id, estimate_id)
    REFERENCES estimate_template_instances(id, workspace_id, estimate_id) ON DELETE CASCADE
);

CREATE TRIGGER guard_template_instance_node_target_insert
BEFORE INSERT ON estimate_template_instance_nodes
WHEN NOT EXISTS (
  SELECT 1 FROM estimate_nodes n
  WHERE n.id = NEW.estimate_node_id AND n.estimate_id = NEW.estimate_id
)
BEGIN
  SELECT RAISE(ABORT, 'template_mapping_target_scope');
END;

CREATE TRIGGER guard_template_instance_node_target_update
BEFORE UPDATE OF estimate_node_id, estimate_id ON estimate_template_instance_nodes
WHEN NOT EXISTS (
  SELECT 1 FROM estimate_nodes n
  WHERE n.id = NEW.estimate_node_id AND n.estimate_id = NEW.estimate_id
)
BEGIN
  SELECT RAISE(ABORT, 'template_mapping_target_scope');
END;

CREATE INDEX idx_template_instance_nodes_estimate_node
  ON estimate_template_instance_nodes(estimate_node_id, instance_id);

CREATE TABLE estimate_template_instance_rows (
  instance_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  estimate_id TEXT NOT NULL,
  template_row_item_id TEXT NOT NULL,
  estimate_row_item_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (instance_id, template_row_item_id),
  UNIQUE (instance_id, estimate_row_item_id),
  FOREIGN KEY (instance_id, workspace_id, estimate_id)
    REFERENCES estimate_template_instances(id, workspace_id, estimate_id) ON DELETE CASCADE
);

CREATE TRIGGER guard_template_instance_row_target_insert
BEFORE INSERT ON estimate_template_instance_rows
WHEN NOT EXISTS (
  SELECT 1 FROM estimate_row_items r
  WHERE r.id = NEW.estimate_row_item_id AND r.estimate_id = NEW.estimate_id
)
BEGIN
  SELECT RAISE(ABORT, 'template_mapping_target_scope');
END;

CREATE TRIGGER guard_template_instance_row_target_update
BEFORE UPDATE OF estimate_row_item_id, estimate_id ON estimate_template_instance_rows
WHEN NOT EXISTS (
  SELECT 1 FROM estimate_row_items r
  WHERE r.id = NEW.estimate_row_item_id AND r.estimate_id = NEW.estimate_id
)
BEGIN
  SELECT RAISE(ABORT, 'template_mapping_target_scope');
END;

CREATE INDEX idx_template_instance_rows_estimate_row
  ON estimate_template_instance_rows(estimate_row_item_id, instance_id);
```

Mappings intentionally do not FK to current master node/row rows or materialized target rows. Source or target deletion must leave the stable correspondence available until the reconciler repairs/removes the target atomically. The insert/update triggers validate that each `estimate_node_id` or `estimate_row_item_id` belongs to the mapping's `estimate_id`. Every mapping access carries `workspace_id` and `estimate_id`, and the composite instance FK makes a bare cross-tenant `instance_id` join insufficient to mutate data.

### 4.5 Coalescing propagation jobs

```sql
CREATE TABLE estimate_template_propagation_jobs (
  instance_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL,
  target_version_number INTEGER NOT NULL CHECK (target_version_number >= 1),
  state TEXT NOT NULL CHECK (state IN ('pending', 'processing', 'completed', 'dead')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  available_at TEXT NOT NULL,
  lease_token TEXT,
  lease_expires_at TEXT,
  last_error_code TEXT,
  failure_class TEXT CHECK (
    failure_class IS NULL OR failure_class IN (
      'attempts_exhausted',
      'component_unavailable',
      'access_revoked',
      'scope_integrity',
      'mapping_repair_required'
    )
  ),
  retryable INTEGER CHECK (retryable IS NULL OR retryable IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT,
  CHECK (
    (state = 'processing' AND lease_token IS NOT NULL AND lease_expires_at IS NOT NULL)
    OR (state <> 'processing' AND lease_token IS NULL AND lease_expires_at IS NULL)
  ),
  CHECK (
    (state = 'dead' AND failure_class IS NOT NULL AND retryable IS NOT NULL)
    OR (state <> 'dead' AND failure_class IS NULL AND retryable IS NULL)
  ),
  FOREIGN KEY (instance_id, workspace_id, template_id)
    REFERENCES estimate_template_instances(id, workspace_id, template_id) ON DELETE CASCADE,
  FOREIGN KEY (template_id, workspace_id)
    REFERENCES estimate_templates(id, workspace_id) ON DELETE CASCADE
);

CREATE INDEX idx_template_propagation_jobs_ready
  ON estimate_template_propagation_jobs(available_at, updated_at, instance_id)
  WHERE state = 'pending';

CREATE INDEX idx_template_propagation_jobs_expired
  ON estimate_template_propagation_jobs(lease_expires_at, instance_id)
  WHERE state = 'processing';

CREATE INDEX idx_template_propagation_jobs_retryable_dead
  ON estimate_template_propagation_jobs(updated_at, instance_id)
  WHERE state = 'dead' AND retryable = 1;
```

There is one job row per instance. A new source revision always raises `target_version_number`; a completed row returns to pending, while a dead row follows the class policy below rather than blanket retry. If a row is already processing, the target version is raised without stealing its lease. The finishing processor either completes the job or returns it to pending when a newer target exists.

Only `attempts_exhausted` is user-retryable while dead. Re-plannable transient/source-version/Component-version races remain pending rather than becoming failed; `transient` is a derived UI class from the pending row's redacted last error, not a persisted dead `failure_class`. `component_unavailable`, `access_revoked`, `scope_integrity`, and `mapping_repair_required` dead rows set `retryable = 0`; a later master revision may requeue only a class whose prerequisite was explicitly repaired and revalidated. Bulk retry selects through `idx_template_propagation_jobs_retryable_dead` and rechecks active instance plus authorization.

### 4.6 Durable shared-mutation intents

The same migration adds a server-owned intent record so a disconnected/reloaded client never needs to persist a mutation payload:

```sql
CREATE TABLE estimate_template_mutation_intents (
  intent_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL,
  created_by TEXT NOT NULL,
  request_fingerprint TEXT NOT NULL,
  normalized_payload_json TEXT NOT NULL CHECK (
    json_valid(normalized_payload_json)
    AND json_type(normalized_payload_json) = 'object'
    AND length(normalized_payload_json) <= 262144
  ),
  expected_version_number INTEGER NOT NULL CHECK (expected_version_number >= 1),
  impact_fingerprint TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('pending', 'committed', 'not_applied')),
  execution_lease_token TEXT,
  execution_lease_expires_at TEXT,
  committed_version_number INTEGER CHECK (committed_version_number >= 1),
  result_json TEXT CHECK (result_json IS NULL OR json_valid(result_json)),
  not_applied_code TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  resolved_at TEXT,
  CHECK (
    (state = 'pending' AND committed_version_number IS NULL AND resolved_at IS NULL)
    OR (state = 'committed' AND committed_version_number IS NOT NULL AND result_json IS NOT NULL AND resolved_at IS NOT NULL)
    OR (state = 'not_applied' AND not_applied_code IS NOT NULL AND resolved_at IS NOT NULL)
  )
);

CREATE UNIQUE INDEX uq_template_mutation_intents_one_pending
  ON estimate_template_mutation_intents(workspace_id, template_id)
  WHERE state = 'pending';

CREATE INDEX idx_template_mutation_intents_pending_lease
  ON estimate_template_mutation_intents(execution_lease_expires_at, updated_at, intent_id)
  WHERE state = 'pending';
```

`template_id` is immutable audit identity rather than an FK so a committed permanent-delete receipt survives deletion of the master. On first submit, a small guarded D1 transaction creates the pending row with the normalized server-validated payload, expected version, impact fingerprint, and actor. Replays provide only `intent_id`; the server authorizes the original actor or a current workspace owner/admin, reads the canonical payload, and takes/renews the execution lease. Executing a still-pending mutation additionally revalidates the original actor's current mutation authority. A committed permanent-delete receipt can therefore resolve from workspace/actor identity even when the Template row no longer exists. A different intent for the same Template is rejected while the partial unique index has a pending row.

The master source/version/jobs transaction updates this row to `committed` with its authoritative result in the same batch. A guard/validation/authorization failure updates the pending row to `not_applied` without mutating source data. A transport failure leaves `pending`; editor/sheet load, reconnect, explicit `Check again`, or the existing five-minute maintenance branch resumes the leased intent from its server payload. Terminal intent rows are retained for 30 days with other receipt cleanup; pending rows are never TTL-deleted as an assumption about outcome.

## 5. Transaction Boundaries

### 5.1 Linked insertion transaction

One D1 batch performs:

1. workspace, Template revision, target Estimate/tab/parent, source graph, sibling-order, and Component-source guards;
2. precompute stable Estimate IDs and pass bounded node/row/map arrays as JSON payloads;
3. set-based `json_each(?)` Estimate node and row inserts;
4. instance insert with current applied/target version;
5. set-based `json_each(?)` node-map and row-map inserts;
6. estimate history/activity outbox and project publication revision;
7. committed estimate mutation receipt.

The implementation must not reuse the current one-statement-per-node/row copy builder for linked mode. The source snapshot and generated-ID payloads remain below the 1.5 MB pack limit, while the D1 statement count stays constant with graph size. Any statement failure rolls back the whole insertion. A retry with the retained intent returns the same instance and Estimate IDs.

### 5.2 Confirmed master mutation transaction

One D1 batch performs:

1. Template version and exact impact fingerprint guard;
2. source graph mutation;
3. `current_version_number + 1` header update;
4. immutable new version insert;
5. set-based target-version update for all active instances;
6. coalescing propagation-job upsert for all active instances;
7. Template activity/history event and `estimate_template_mutation_intents` committed result.

The batch does **not** partially update Estimate instances. It establishes the durable source revision and complete work set.

### 5.3 Per-instance reconciliation transaction

The processor loads the immutable Template snapshot, current Component records, and mappings before planning. One guarded D1 batch then performs:

1. lease, workspace/project/estimate/template chain, active-state, applied-version, source-version, and expected Component-version guards;
2. set-based Estimate node/row inserts, updates, and deletes;
3. mapping inserts/updates/deletes;
4. row revision increments and source snapshot updates;
5. estimate history/activity outbox and project publication revision;
6. `applied_version_number` advance and truthful instance state;
7. job completion or return-to-pending if a newer target arrived.

If the batch fails, the visible Estimate remains entirely on its last applied version.

For Component-linked rows, planned descriptive/pricing values come only from the freshly loaded Component records. The expected Component-version guards fail the batch and force a re-plan if any source changes between read and apply. No Component-owned value from any historical Template `snapshot_json` is written to an Estimate row.

### 5.4 Detach transaction

Detach performs:

1. active instance/revision guard;
2. capture mapped root IDs in `detached_root_ids_json`;
3. delete the propagation job before changing the instance's composite parent key;
4. delete node/row mappings;
5. set `link_state = 'detached'`, null `template_id`, and freeze provenance/version fields;
6. write estimate and Template usage history.

No Estimate node or row is changed. Subsequent project-local edits use current ordinary CRUD.

### 5.5 Detach-all permanent-delete transaction

After typed-name and exact-impact confirmation, one guarded set-based D1 batch:

1. rechecks workspace, Template version, typed-name fingerprint, and active instance set;
2. captures each instance's mapped root IDs with a correlated/set-based aggregate;
3. deletes all Template propagation jobs;
4. deletes all Template instance node/row mappings;
5. marks every active instance detached and nulls `template_id` while preserving applied/target audit fields;
6. writes per-Estimate/history activity with the detached instance count;
7. updates the initiating `estimate_template_mutation_intents` row to `committed` with a deletion tombstone result and detached-instance count;
8. deletes the Template header, cascading only its source graph and immutable versions while the non-FK intent/receipt survives.

The active-instance `RESTRICT` FK therefore never cascades into Estimate content. Any failure rolls back the entire detach/delete operation; there is no partial-detached master-delete state. A processor planned before the transaction must fail its active-template/version/lease guard if it tries to commit afterward.

## 6. Reconciliation Algorithm

For one instance and immutable target snapshot:

1. Build `masterNodeId -> estimateNodeId` and `masterRowId -> estimateRowId` maps.
2. Topologically order target nodes by parent depth, then source sort order and stable ID.
3. Reuse mapped Estimate IDs for surviving master IDs.
4. Generate new UUIDs only for newly introduced master IDs.
5. Delete mapped rows absent from the target.
6. Delete mapped nodes absent from the target in child-first order.
7. Insert new nodes parent-first and insert/update node mappings.
8. Update surviving node name/kind/parent/order from the master.
9. Insert new rows with master defaults and current Component resolution.
10. Update surviving rows using the field-ownership matrix; preserve instance-owned values and ignore Component-owned fields in the Template snapshot.
11. Recompute row revisions and rely on existing calculation/read projection for derived totals.
12. Advance applied version and history in the same transaction.

The plan builder emits bounded JSON payloads into set-based `json_each(?)` SQL instead of one D1 statement per target row. It rejects a version snapshot above 1.5 MB before source mutation, leaving headroom under D1’s current 2 MB string/row limit.

## 7. Component Linkage Precedence

Template linkage and Component linkage are orthogonal:

1. the Template owns row existence, placement, selected Component identity/variant, and custom-row content;
2. the Component Library owns current linked Component descriptive/pricing fields and version;
3. the Estimate instance owns takeoff quantities/adjustments;
4. the reconciler resolves current Component data when applying a Template revision and never downgrades a newer `componentVersionNumber` from a stale Template snapshot;
5. Component mutation fan-out expands to linked `estimate_template_row_items` so current Template editor/source snapshots stay current; immutable Template versions remain topology/membership records for Component-linked rows, so this refresh does not rewrite history or create a structural Template version/job; and
6. unavailable Component behavior retains the existing explicit saved-snapshot-unlinked confirmation at insertion and fails closed during propagation unless the row was already intentionally converted under the defined source policy.

## 8. Concurrency And Idempotency

- Every client command carries a retained `intentId` and stable request fingerprint.
- A post-submit transport failure is resolved by replaying the identical intent/payload. Receipt lookup runs before mutation guards, so a prior commit returns authoritatively; no receipt plus a stale/validation/authorization guard proves not-applied; another transport failure remains unknown and never permits a new same-Template intent.
- Impact preview includes Template version plus a deterministic fingerprint of active instance IDs, link states, applied/target versions, and update timestamps.
- Confirm rejects if either source revision or impact fingerprint changed.
- Job claim uses a lease token and expiry; the partial `lease_expires_at` index makes expired processing rows reclaimable without scanning all jobs.
- Duplicate triggers are safe because the job row and instance applied version are authoritative.
- A newer source revision coalesces by raising one job’s target version; versions never decrement.
- Instance reconciliation guards the expected applied version and re-plans after a conflict.
- An `attempts_exhausted` dead job can return to pending through guarded manual/bulk retry. `component_unavailable` or `mapping_repair_required` can requeue only after a new version/repair path proves the prerequisite fixed. `access_revoked` and `scope_integrity` remain terminal even when `target_version_number` rises; they require authorized remediation or detach, never generic retry.
- Re-plannable source/Component races remain `pending`; retry exhaustion becomes explicitly retryable `attempts_exhausted`; unavailable Component, access revocation, scope mismatch, and unrepaired mapping corruption become terminal classes from artifact `02`. Server-side retry selection excludes terminal rows.
- D1’s single-database write model is respected by sequential target processing.

## 9. Failure Simulations

| Failure | Required result |
| --- | --- |
| Request disconnects after master commit | Same-intent replay returns the committed receipt and progress; no second version is created. |
| Request disconnects before commit and source later changes | Same-intent replay finds no receipt, fails the original guard, and returns definite not-applied plus a fresh-preview path. |
| Receipt resolution also loses transport | Client remains `outcome-unknown`, blocks a new same-Template shared intent, and checks the same intent later. |
| Duplicate confirmation submit | Same committed version/receipt returns; no duplicate source revision. |
| Instance detached after preview | Confirm fingerprint fails before master mutation, or detached target is excluded by revalidated active set. |
| New version arrives during apply | Current atomic apply can finish; job remains pending for the higher target. |
| Component updates during Template apply | Component version guard forces re-plan; no stale price overwrite. |
| One instance has missing mapped row | Reconciler detects drift, restores or deletes according to target snapshot, and records a repair code; it never silently remaps by name/order. |
| D1 overloaded/transient error | Lease expires or job returns pending with bounded backoff; last complete instance stays readable. |
| Ten transient failed attempts | Job/instance becomes `attempts_exhausted`; explicit retry can reset it and detach remains available. |
| Component unavailable, access revoked, scope mismatch, or unrepaired mapping drift | Job becomes the matching terminal class; bulk retry excludes it and only authorized class-specific actions appear. |
| Template-level status query fails | Job rows are unchanged; UI labels cached counts stale or shows query error, and query retry remains separate from job retry. |
| Master permanent delete with active instances | Action refuses raw delete and offers detach-all-and-delete; Estimate content remains. |
| Historical copied branch resembles a Template | No inference or mutation occurs. |

## 10. Risk Register Summary

| ID | Risk | Containment |
| --- | --- | --- |
| `RISK-001` | Source/impact race commits against stale targets. | Exact source version + impact fingerprint + receipt guard. |
| `RISK-002` | Partial global propagation is mistaken for failure-free consistency. | Per-instance applied/target state, visible updating/failed UI, durable job. |
| `RISK-003` | Template propagation overwrites project takeoff or newer Component data. | Explicit three-owner field matrix and Component version guard. |
| `RISK-004` | Link state causes broad rerenders/layout shifts. | Compact read projection, stable scalar props, fixed-height/width styling. |
| `RISK-005` | Delete/detach or missing FKs orphan mappings/content. | RESTRICT master FK while active, atomic detach, mapping drift checks. |
| `RISK-006` | Existing five-minute recovery is too slow at future scale. | Immediate drain and metrics; dedicated Queue is a later transport-only option. |
| `RISK-007` | Historical copies are incorrectly linked. | No backfill/inference; explicit new linked insert only. |
| `RISK-008` | Cross-workspace fan-out leaks or mutates data. | Composite workspace/project/estimate/tab/parent/instance FKs, tenant-bearing mappings/jobs, and negative guard evidence. |
