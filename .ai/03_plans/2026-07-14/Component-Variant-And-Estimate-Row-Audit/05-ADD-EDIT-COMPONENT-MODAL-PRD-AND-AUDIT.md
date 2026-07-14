# Add/Edit Component Modal PRD And Implementation Audit

## Product Decision

Variants are a core component capability, not optional metadata. A component save is successful only when the complete ordered variant graph persists and can be read back with stable identities.

The current product has one advanced component editor:

`src/components/workshop/component-library-manager/AddComponentModal.tsx`

It serves:

- Library component creation;
- Library component editing from Components and Estimate Sheet;
- Project component editing from Estimate Sheet; and
- component and variant images/attachments in the ownership scope selected by the caller.

Inline row edits remain compact. They do not become a second advanced editor; Library inline edits hydrate the complete graph and call the same Library graph mutation.

## Exact Reported Reproduction

1. Click **Edit component** on a Project-level component.
2. Click **Add variant**.
3. Save changes.
4. Reopen **Edit Component**.
5. The new variant is absent.

## Root Cause

The original first-add branch in `addVariant` did this:

1. saw that variant mode was disabled and a default option existed;
2. enabled variant mode;
3. opened the variant editor; and
4. returned before creating or appending a new `VariantDraft`.

The UI visually entered variant mode, but the draft still contained only the original option. The save payload therefore had no added option to persist.

Project editing also had related identity hazards:

- the initiating estimate row ID could be used as attachment ownership instead of the stable Project component ID;
- a detached Project row with a historical `sourceLibraryItemId` could be mistaken for a live Library component; and
- optimistic modal closure could hide incomplete authoritative reconciliation.

## Implemented Fix

### Add and reopen

- `addVariant` always creates and appends a fresh stable-ID option.
- Generated labels are `Default`, `Option 2`, `Option 3`, not product-version labels.
- `buildEditedItem` and `buildComponentPayload` include the complete ordered option graph.
- Project save persists that graph inside `sourceSnapshot.priceOptions` through the guarded D1 row action.
- The Estimate Sheet refetches/reconciles the authoritative row tree before closing.
- Reopening hydrates all active options from the persisted row graph.

The exact scenario is represented by `tests/vitest/estimate-sheet-library-insert.test.tsx` under “keeps a newly added project component variant after save and reopen.”

### Stable identity

- persisted option IDs survive edit and reorder;
- new options receive fresh UUIDs;
- selected option comes from `priceOptionId`;
- default option comes from `isDefault`;
- sort position comes from `variantSortOrder`;
- none of those facts is inferred by label matching.

### Authoritative completion

- Library create/update rereads complete detail from D1 and returns it.
- Project update waits for the row action and authoritative estimate-tree reconciliation.
- The UI does not declare success from a component-only object that omits the saved option graph.

## Modal Field Contract

### Component-level fields

- name;
- category and category node;
- supplier and supplier ID;
- brand and brand ID;
- folder for Library ownership;
- lifecycle state/effective date/change reason; and
- component/shared image choice.

### Variant-level fields

- stable option ID;
- label;
- description;
- SKU;
- sort order;
- unit and unit cost;
- current cost entry plus pricing source/date/source URL/notes;
- package metadata;
- variant image descriptor and upload asset identity;
- attachments and scan/review receipt;
- active/default state.

### Row-local fields intentionally excluded

- quantity and quantity expression;
- contingency and adjustment;
- miscellaneous row cost where row-owned;
- designation and discipline;
- row location/order;
- estimate row ID.

The modal may display impact counts, but it must not absorb row-local values into the component graph.

## Save Contract By Component Type

### Library component

Caller supplies:

- Library detail hydrated from `loadCostLibraryComponentEditorDetail`;
- current `updatedAt` and `componentVersionNumber`;
- linked-row/option impact fingerprint; and
- per-option usage counts.

Save calls one `updateCostLibraryComponentWithPriceOptions` action. The action validates and commits the full component/option/cost/attachment/version/linked-row graph atomically, then returns authoritative detail.

Fan-out behavior:

- component fields update eligible linked instances;
- each row keeps its selected option ID;
- variant fields are derived from that selected option;
- a row selecting option A never receives option B's description/unit/cost/SKU/image;
- `linked-overridden` rows retain visible local values while receiving updated catalogue/version receipts;
- detached/unlinked rows receive nothing.

### Project component

Caller supplies:

- initiating row detail;
- stable Project `sourceComponentId`;
- impact fingerprint and option usage counts;
- project ID for Project-owned media.

Save calls the existing estimate row mutation once with the complete component graph. The server scopes the update to matching Project component identity inside the same project.

Fan-out behavior:

- component-level fields reach same-component instances in that project;
- the full option catalogue is shared so every instance can select any active option;
- variant-derived visible values update according to each instance's selected option;
- row-local quantity/calculation values stay unchanged;
- instances in another project are never updated;
- a single-instance edit needs no extra confirmation; multi-instance impact is known before save.

## Variant Operations

### Add

- always append one new UUID option;
- copy only safe defaults such as unit;
- do not reselect existing rows;
- keep the prior default unless the user explicitly changes it.

### Reorder

- change sort order only;
- preserve IDs and explicit default;
- do not reinterpret the first option as default.

### Set default

- enforce exactly one default;
- affect future insertion/default resolution;
- do not change selected option on existing rows.

### Edit

- target a stable option ID;
- update only that option's fields;
- refresh derived fields only for rows selecting that option;
- keep the full catalogue synchronized for every component instance.

### Delete

- unused option: remove directly;
- used option: require a different retained active option as replacement;
- move only instances selecting the deleted option;
- reject the whole save if a used option lacks a replacement;
- preserve row-local values on moved instances.

### Last option

The component must retain at least one valid option in the authoritative graph. UI variant-mode presentation may collapse, but persistence still has one `Default` option.

## CRUD Audit

| Operation | Library | Project | Implemented behavior |
| --- | --- | --- | --- |
| create | yes | created/copy from row flow | complete option graph and stable identity |
| detail read | on-demand D1 detail | row graph + impact query | modal hydrates all active options |
| update | graph action | row-history graph action | guarded atomic save |
| duplicate/copy | fresh Library graph | same-project instance or fresh cross-project identity | no ID/path stealing |
| move | folder | row/tree location | identity preserved according to operation |
| archive | Library lifecycle | not a Project-master operation | linked estimate history retained |
| delete | source preview + detach | row delete/restore window | estimate values or remaining instances preserved |
| promote | source already Library | Project to Library | full ordered graph and selection preserved |
| detach | N/A | Library instance to Project | new Project identity; Library master unchanged |
| variant add/reorder/default/delete | graph action | row graph action | stable IDs and selected-option rules |

## Estimate Row Transfer Contract

### Insert from Library

The inserted row receives:

- Library component ID/link;
- current component version receipt;
- selected default option ID and label;
- bounded complete option catalogue;
- selected variant-derived description, SKU, unit, cost, pricing, and image;
- row-local quantity/calculation defaults.

Default is resolved only for insertion. Later source default changes do not reselect the row.

### Select a variant in a row

Selection updates the row receipt and the selected option's derived fields. It does not create/replace the row or mutate the component master.

### Replace component

Replacement adopts the replacement component/source identity and its insertion-time selected option while preserving only the row-local values allowed by the replace policy.

### Move component/row

Movement preserves component and selected-option identity; only location/order changes.

### Make project-specific

- clear Library link;
- create fresh Project component identity;
- copy option graph and current selection;
- preserve row-local values;
- omit Library attachment descriptors because ownership does not transfer.

### Promote to Library

- create a new Library component/option graph;
- map source options to new Library option IDs;
- preserve which option was selected;
- relink the row to the new Library component;
- never collapse selection to the default.

### Delete source

Library source deletion detaches linked rows/templates and preserves their current values. It does not delete issued snapshots, comments, or decisions.

## Images And Attachments

### Library ownership

- Library images use component-owned storage.
- Attachments bind to `(workspace, item, option)` and one upload asset.

### Project ownership

- Project images use Project image storage.
- Attachments bind to `(workspace, project, project component, option)`.
- `projectComponentId` is the stable component identity, not the estimate row ID.
- attachment removal includes the same Project owner tuple.

### Duplicate/detach safety

- Library duplicate omits attachments unless future code copies each blob to a fresh path.
- Make-project-specific omits Library attachment descriptors.
- Draft cleanup cannot delete a persisted attachment.

## Concurrency And Failure Behavior

- opening the editor uses request IDs so stale detail/impact responses cannot replace a newer selection;
- Library saves use component revision plus impact fingerprint guards;
- Project saves use row revision plus component impact fingerprint guards;
- all component graph changes are committed or rejected as one D1 action;
- a stale or invalid used-option deletion fails closed;
- the modal stays open on failure and preserves the draft;
- server-authoritative data drives completion.

## Acceptance Matrix

| Scenario | Expected result | Evidence |
| --- | --- | --- |
| exact Project add/save/reopen | `Option 2` appears after reopen | `estimate-sheet-library-insert.test.tsx` |
| edit non-default variant | only instances selecting that ID receive its derived fields | `estimate-actions-d1-reorder-history.test.ts` |
| reorder variants | IDs/default stay stable | `library-add-component-modal-a11y.test.tsx` |
| delete used variant | only selected rows move to explicit replacement | `estimate-actions-d1-reorder-history.test.ts` |
| delete used variant without replacement | no D1 writes | same test file |
| Project attachment upload | uses stable Project component ID | modal and attachment tests |
| detached Project edit | no Library action | modal test |
| promotion | complete graph and selected option survive | `express-promotion-action.test.ts` |
| make project-specific | graph copied; Library attachments omitted | source-snapshot test + row handlers |
| Library update | authoritative detail and instance sync returned | component action tests |

## Current Proof Boundary

Focused modal and estimate-row automated checks, typecheck, and targeted lint evidence were produced during implementation. This document does not claim browser automation, screenshots, visual QA, hosted D1 application, hosted R2 behavior, or release readiness. Those remain `NOT_EVALUATED`.
