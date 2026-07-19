# Template & Variant Lineage — Commercial-Truth Notes

> Companion to `d1-lifecycle-matrix.csv`. Records the cross-cutting lineage
> behavior for templates, linked instances, library components, and variants.

## Template instance lifecycle (linked mode)

A linked template instance is an `estimate_template_instances` row plus its
`estimate_template_instance_nodes` and `estimate_template_instance_rows`
mapping tables. The instance references a `template_id` and an
`applied_version_number` / `target_version_number`.

- **Insert (link):** atomic 11-statement batch (`linkTemplateNodes`,
  `templates.ts:885-1454`). Statement count contract enforced. Initial
  `link_state='linked'`, `applied_version_number = current_version_number`.
- **Update propagation:** async. A committed template mutation bumps
  `current_version_number`, flips all instances to `link_state='updating'`,
  enqueues propagation jobs. `reconcileTemplatePropagationJobs` (cron) claims
  each job with a lease and applies the new version per instance in an atomic
  batch.
- **Failure:** `recordJobFailure` bumps `attempt_count`, sets state `'pending'`
  (retry) or `'dead'` (max 10 attempts) with `failure_class` and `retryable`.
  Dead+retryable jobs can be reactivated by `retryTemplatePropagationJobs`.
- **Detach:** `detachEstimateTemplateInstance` atomic — DELETE job/mappings,
  UPDATE instance `link_state='detached'`, `template_id=NULL`,
  `detached_root_ids_json` set. Then best-effort immediate retry drain.
- **Delete instance:** recursive CTE subtree DELETE on rows + nodes + DELETE
  instance.
- **Permanent delete template:** requires archived first + name confirmation +
  lease-based intent. Atomic batch flips all instances to detached before
  deleting the template row (works around `ON DELETE RESTRICT`).

## Copy vs link semantics

- **Copy** materializes fresh `estimate_nodes` and `estimate_row_items` with
  new UUIDs. No ongoing relationship. The source library component (if still
  `'available'`) is re-resolved at copy time → `link_state='linked-clean'`. If
  the component is missing or not available, falls back to
  `saved_snapshot_unlinked` → `link_state='unlinked'`.
- **Linked** does the same materialization PLUS creates the instance + mapping
  tables. Ongoing propagation when the template version bumps.

## Snapshot immutability

- `estimate_template_versions` rows are immutable via BEFORE UPDATE trigger
  (`RAISE(ABORT, 'template_version_immutable')`).
- `cost_library_item_versions` rows similarly immutable.
- Linked-instance propagation reads the version snapshot to materialize new
  nodes/rows. Old instance data is replaced (DELETE + INSERT) inside the same
  atomic batch — the instance always reflects exactly one version.

## Variant deletion / repointing

- **Library scope:** when a price option with `isDefault=true` is upserted,
  all sibling options are forced `is_default=0`
  (`component-mutation-d1.ts:1024-1035`).
- **Sync plan:** if the selected option is missing/removed, requires an
  explicit `removedPriceOptionReplacements[id]`; throws if a deleted variant
  is replaced with itself (`component-mutation-d1.ts:1576-1588`).
- **Project scope:** exactly-one-active-default enforced in
  `d1-intents/rows.ts:1404-1410`.
- **Linked template rows:** when a template references a variant that no
  longer exists on the source library item, the linked-insert falls back to
  `saved_snapshot_unlinked` (preserving the last-known cost) rather than
  silently dropping or zeroing the row. **Variant-reference repair on
  already-linked instances is owned by Quality Master UNIT-001** — do not
  duplicate.

## Library component edit → linked estimate row sync

When `updateCostLibraryComponentInD1` runs:
1. UPDATE `cost_library_items` (bumps `current_version_number`).
2. Soft-delete orphaned `upload_assets`.
3. Archive removed variant attachments.
4. INSERT new `cost_library_item_versions` snapshot.
5. `buildLinkedEstimateRowsSyncStatement` propagates the new component state to
   every linked estimate row **in the same atomic batch**.

So component edits **synchronously** mutate linked estimate rows (subject to
the row revision guard). This is in contrast to template edits, which propagate
**asynchronously**.

## Cross-workspace isolation

- All commercial tables are workspace-scoped via composite UNIQUEs and
  `WHERE workspace_id = ?` predicates.
- Cross-workspace linked insertion is prevented: `linkTemplateNodes` joins
  `estimate_templates WHERE id = ? AND workspace_id = ?` — a template from
  another workspace simply does not resolve.
- Linked source components must be in the same workspace: `cost_library_items
  WHERE workspace_id = ?` — falls back to `saved_snapshot_unlinked` otherwise.

## Deletion cascade impact

- `estimate_templates` FK from `estimate_template_instances.template_id` is
  `ON DELETE RESTRICT` — cannot delete a template while instances reference
  it. Permanent delete works around this by first flipping all instances to
  detached in the same batch.
- `estimate_row_items.estimate_id` is `ON DELETE CASCADE` from `estimates`.
  Bulk sheet deletion deletes children explicitly before parents (defense in
  depth).
- Component permanent delete does NOT rely on FK cascade — it issues explicit
  DELETEs on `estimate_row_items`, `estimate_template_row_items`,
  `cost_library_items`. Rows touched by permanent delete are marked
  `nonRestorable: true` on the `library_component_rows_permanently_deleted`
  event — `restoreDeletedEstimateRowsWithHistory` will refuse them.

## Lineage-related findings

- No commercial-truth lineage defect was reproduced in this audit beyond what
  Quality Master UNIT-001 already owns. Template/variant lineage is the most
  robustly atomic surface in the codebase.
