# Pre-Release Feature Path Cleanup And Simplification

## Decision

Archestimator is alpha-stage, pre-release software. There is no released component API or user population that requires parallel compatibility paths.

The implemented approach is direct replacement:

- one full Add/Edit modal;
- one complete component-plus-variant payload for each save;
- one owner-specific atomic graph action for Library and Project ownership;
- one selected-variant identity rule;
- deletion of superseded editor/caller paths; and
- bounded current-data migrations rather than dual writes.

“Prevent regression” only means do not break a current product invariant while fixing another defect. It does not authorize product `V1`/`V2` routes, schemas, modals, adapters, flags, or rollout ceremony.

## Product Version Language

Generated variant labels are now:

- `Default`;
- `Option 2`;
- `Option 3`; and
- neutral compact ordinals where space is constrained.

Stable UUIDs remain the identity. Labels and list position are presentation.

The modal localStorage key no longer includes a product-style `:v1` suffix.

## Internal Revisions That Remain

The following are necessary operational/data controls and are not product versions:

- D1 migration numbers;
- `cost_library_items.current_version_number`;
- immutable component version snapshots;
- estimate `row_revision`;
- issue content/version/hash receipts;
- message/decision idempotency revisions;
- Queue message schema discriminator where required for safe decoding;
- Cloudflare Durable Object migration tags.

Removing these would weaken atomicity, concurrency, or deploy ordering. They are intentionally retained.

## One Authority Per Concern

| Concern | Current authority | Superseded path removed/forbidden |
| --- | --- | --- |
| advanced Add/Edit UI | `AddComponentModal.tsx` | reduced `EditComponentDrawer.tsx` |
| modal graph contract | complete component + ordered `priceOptions[]` | surface-specific partial variant payloads |
| Library graph mutation | `updateCostLibraryComponentWithPriceOptions` | component-only update followed by option loops |
| Project graph mutation | `updateEstimateRowItem` -> D1 history action | initiating-row-only optimistic patch |
| Library detail | on-demand complete D1 detail | compact catalogue row treated as full graph |
| Project identity | project-scoped `sourceComponentId` | estimate row ID as component identity |
| variant identity | stable price-option ID | label/index/default inference |
| Library attachments | Library owner tuple + upload asset | bare path ownership |
| Project attachments | Project/component/option tuple + upload asset | row-ID ownership or Library reuse |
| issued component identity | opaque issue-local anchor | live/raw Library or Project ID |
| discussion target | issued target resolver | client-supplied label/live source lookup |

## Cleanup Completed In The Worktree

### Editor consolidation

- full modal used by Components and Estimate Sheet;
- reduced drawer deleted;
- Library inline editing upgraded to hydrate and submit the complete graph rather than maintaining a parallel partial write.

### Variant path cleanup

- first add now appends a real option;
- default and selected option are separate;
- generated `V1`/`V2` labels replaced;
- option updates use stable IDs;
- used deletion requires explicit replacement;
- authoritative reread/reconciliation replaces optimistic partial completion.

### Ownership cleanup

- stable Project component identity is passed to image/attachment operations;
- detached Project rows cannot take the Library update path;
- unified attachment table models exclusive Library/Project owners;
- make-project-specific omits Library attachment descriptors;
- duplicate does not reuse attachment paths.

### Issued path cleanup

- client-safe component/variant receipts are projected once into immutable issue content;
- private local broker paths are redacted;
- component and row discussions are distinct issued targets;
- owner replies use the existing notification outbox/Queue path.

## Direct Current-Data Repair

Migration `0076` is the only attachment relation replacement:

1. audit current Library attachment owner/asset tuples;
2. fail if any tuple is ambiguous or invalid;
3. copy valid rows into the unified table;
4. verify count and foreign keys;
5. drop the old Library-only table;
6. rename the new table and add owner indexes.

There is no old/new dual write and no indefinite compatibility adapter.

## Forbidden Additions

- `ComponentModalV2`, `variantSchemaV2`, `/api/v2`, or equivalent naming;
- a second advanced Project or Library editor;
- label-based matching for persisted options;
- simultaneous old/new attachment tables or payloads;
- a feature flag whose only purpose is to keep a superseded pre-release path alive;
- raw Library/Project IDs in Client Portal content;
- a new Project-component master table without a new proven need;
- compatibility work for hypothetical released clients;
- release/rollout/rollback ceremony for ordinary local fix-forward edits.

## Proof And Release Boundary

Focused automated tests were run during implementation, so this pack must not say “no tests were run.” At the same time:

- browser automation was not run;
- screenshots/visual QA were not run;
- hosted D1 migration state was not checked;
- hosted R2/Queue/Email behavior was not checked; and
- release status remains `NOT_EVALUATED`.

Those are evidence boundaries, not reasons to recreate duplicate paths.

## Completion Audit

The single-path cleanup is locally satisfied when all of the following are true:

1. Components and Estimate Sheet load the same full modal.
2. A new Project variant persists and appears after save/reopen.
3. Library and Project saves each commit one complete graph action.
4. Option identity is stable across add/reorder/default/edit/delete.
5. Variant-derived fan-out follows selected option ID.
6. Row-local fields do not fan out.
7. Attachment ownership is exclusive and upload-asset backed.
8. Issued component/variant identities are opaque and immutable.
9. No active product `V1`/`V2` path or compatibility-only adapter remains.

## Stop Condition

Cleanup stops when current source has one coherent path and the remaining gaps are only explicit release/provider/browser evaluation. Do not add more planning or compatibility layers to compensate for unrun release proof.
