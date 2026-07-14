# Add/Edit Component Modal PRD And CRUD Audit

## Authority And Target Result

This document is the implementation authority for the existing **Add Component** modal, its edit mode, Library components, Project components, variants, and the transfer of component data into Estimate Sheet row instances.

The visual design is not the problem to solve. The target is to keep the current compact UI while making its create, read, update, duplicate, archive/delete, variant, and estimate-row wiring truthful and durable.

Implementation is complete only when:

1. one full Add/Edit Component modal is the only advanced component editor;
2. Library components persist their complete component/variant graph in D1 and component-owned R2 storage;
3. Project components retain stable project-scoped identity and complete variant snapshots;
4. every Estimate Sheet row retains its own selected variant and row-local values;
5. editing one variant updates only instances currently using that variant, except for component-level fields that intentionally apply to every instance;
6. create/edit/duplicate/reload returns the authoritative saved graph rather than a UI guess; and
7. obsolete parallel editor and compatibility paths are deleted rather than maintained.

## Audited Domain Model

### Library component

A workspace-owned master record backed by:

- `cost_library_items` for component-level identity and fields;
- `cost_library_item_price_options` for stable variant identities;
- `cost_library_item_variant_cost_entries` for current and historical cost facts;
- `cost_library_item_variant_attachments` for variant attachment bindings;
- `cost_library_item_versions` and history tables for concurrency and audit receipts; and
- component-owned objects in `ARCH_UPLOADS_R2`.

A Library component can be inserted into many estimates. Each inserted row remains an instance with a stable `source_library_item_id` and its own selected `priceOptionId`.

### Project component

A project-scoped logical component derived from one or more Estimate Sheet rows that share a stable project component identity in `source_snapshot_json`/`metadata_json`.

There is no separate Project Component master table in the current architecture. The estimate rows are the durable records; `project-component-projection.ts` groups rows by component identity for the Project tab. This remains the first-user architecture. A new master table is not required to fix variant persistence.

### Estimate Sheet row instance

The row is not the component master. It stores:

- its source identity and link state;
- its selected variant ID and label;
- a bounded component/variant snapshot for rendering and recovery;
- row-local quantity, contingency, adjustment, miscellaneous cost, ordering, and row revision; and
- project/estimate/node membership.

An instance may be:

- `linked-clean` to a Library component;
- `linked-overridden` where row-owned changes must survive source edits;
- `detached`/project-specific;
- an express Project component; or
- an unlinked custom row.

### Variant

A variant is not a product release version. It is a stable option identity such as a size, finish, supplier offer, package, or SKU. Its database identity is an opaque UUID. A row selects a variant by UUID, never by array position or label.

The component default variant is only the default for **future** insertions. It is not the selected variant of every existing row.

## Current Entry-Point Audit

| Surface | Current editor | Current authority | Audit result |
| --- | --- | --- | --- |
| Estimate Sheet row action | `AddComponentModal` with `editingItem` | Library update or Project row update | correct editor surface; persistence/fan-out is not variant-safe |
| Component dock/sidebar | `AddComponentModal` for create and edit | Library D1 actions | correct intended authority; optimistic reconciliation is incomplete |
| Components page quick add | `AddComponentModal` | Library D1 create | correct intended authority |
| Components page inspector edit | `EditComponentDrawer` | reduced flat component update | divergent editor; cannot truthfully edit the full variant/media graph |
| Inline Estimate Sheet edit | row handler or Library action | shared fan-out | useful fast path; currently component-wide and not selected-variant scoped |

### Required authority decision

`EditComponentDrawer` must be removed. The full Add/Edit Component modal becomes the single advanced editor on every Library and Estimate Sheet surface. Inline row editing remains a compact fast path, but it must call the same canonical component/variant mutation contract.

## Add/Edit Modal Field Inventory

### Component-level fields

| Field | UI source | Authoritative destination | Notes |
| --- | --- | --- | --- |
| name | Component tab | `cost_library_items.name` or Project row shared snapshot | required |
| category/category node | Component tab | item column + row snapshot | category node is stable identity; label is display data |
| Library folder | launch context/editor | `cost_library_items.library_folder_id` | Library only; preserve on edit |
| supplier/supplier ID | Component tab | item columns and selected variant supplier reference | validate workspace ownership |
| brand/brand ID | Component tab | item columns/snapshot | validate workspace ownership |
| lifecycle state | Activity tab | item column/history | default `available`; no broad permissive fallback |
| effective date | Activity tab | version/cost history | required for auditable change |
| change reason | Activity tab | component version/history | concise, user-visible history fact |
| shared image mode | Component tab | explicit UI transformation | must never hide per-variant ownership changes |

### Variant-level fields

| Field | Authoritative destination | Required behavior |
| --- | --- | --- |
| stable ID | `cost_library_item_price_options.id` or Project snapshot option ID | preserved across edit/reorder/rename |
| label | price option row/snapshot | default display name is `Default` then `Option 2`, not product `V1`/`V2` release language |
| description | option metadata/snapshot | persists independently per variant |
| SKU | option metadata/snapshot | nullable, stable across reload |
| unit and unit cost | option row + current cost entry | one current cost entry; nonnegative |
| package quantity/unit | option metadata | positive quantity when present |
| default | `is_default`/Project snapshot | exactly one; only affects future insertion |
| active state/order | option row/metadata | omitted options are inactive only after deletion rules pass |
| image descriptor | option metadata + R2 object | component/workspace-owned, not project-row-owned |
| attachments | attachment binding table + upload asset + R2 | clean/approved rules, no orphan binding |

### Row-local fields excluded from component fan-out

Quantity, quantity base, quantity contingency amount, contingency percentage, adjustment percentage, miscellaneous row cost, designation, discipline, row order, node membership, comments, and row-specific overrides are not component master fields.

## Current CRUD Audit

### Library component CRUD

| Operation | Current path | Current result | Required correction |
| --- | --- | --- | --- |
| Create | modal -> `createCostLibraryComponent` | item, variants, cost entries, and version are batched | bind attachments; authoritative reread; preserve client correlation for new option IDs |
| Read/list | repository lite/full loaders | browse can omit detail graph by design | clearly distinguish summary vs detail-hydrated state |
| Read/edit detail | `loadCostLibraryComponentRowDetail` | loads options and optional attachment/history graph | every advanced edit must wait for full detail |
| Update flat | `updateCostLibraryComponent` | updates active/default option and all linked rows | keep only as canonical selected-option fast path or remove; no parallel semantics |
| Update graph | `updateCostLibraryComponentWithPriceOptions` | writes every option atomically, then syncs one active option to all rows | replace uniform fan-out with option-aware fan-out and override masks |
| Duplicate | two UI implementations call create | sidebar can copy full variants; inspector copies one flat option; attachment paths may be reused | one canonical duplicate action; full variant copy; fresh IDs; omit or physically copy attachments |
| Archive | preview + guarded bulk action | removes source from active browse | preserve row values and explicit lifecycle behavior |
| Delete | preview + guarded bulk action | source deleted and linked rows detached | validate variant/media cleanup, stable detached snapshots, and actual expected revisions |
| Insert/replace | estimate actions build row payload/snapshot | selected option and bounded option list copied | resolve current component/default once; retain inserted row selection afterward |

### Project component CRUD

| Operation | Current path | Current result | Required correction |
| --- | --- | --- | --- |
| Create express | create/edit an estimate row | row gains express/project identity | ensure one stable component ID and one required `Default` variant |
| Make project-specific | detach Library row with fresh identity | only initiating row becomes project-scoped | preserve selected variant graph and row-local values |
| Read | project projection over estimate rows | groups rows by component identity | choose deterministic representative; do not treat first row selection as component default |
| Update | modal/inline row patch -> project fan-out | shared patch reaches every instance in project | component fields fan out; variant fields target matching selected variant only |
| Add variant | modal writes `priceOptions` snapshot through row update | can fan out initiating selection/default to every instance | distribute variant catalogue; preserve each row selection/value |
| Select variant | row control patches one Project row | one row changes selection/value | correct; must not become a component default edit |
| Duplicate instance | reuse/drop Project component | shares component identity within project | new row gets chosen selection and independent row-local values |
| Copy to another project | localization helper | generates new component identity | preserve full option graph; never cross-project fan-out |
| Delete | delete Estimate Sheet row | removes one instance; last deletion removes projected component | make single-instance semantics explicit; do not delete sibling instances silently |
| Promote to Library | promotion action | creates Library item/option and links row | preserve variant IDs through an explicit mapping and reconcile the promoted row |

### Estimate Sheet row CRUD and transfer

| Operation | Required transfer contract |
| --- | --- |
| Insert Library component | copy component fields, selected default option values, all active option summaries, source/version receipt, component ID, option ID, and `linked-clean`; focus Qty |
| Insert Project component | copy project component identity, complete option snapshot, selected option, and row values; re-home identity when target project differs |
| Replace row | retain target row identity/position and row-local quantity policy; replace source/component/variant snapshot atomically |
| Move row/component | retain source/component/variant identity; persist source clear + target write atomically |
| Update row selection | update only this row's selected option and derived variant fields |
| Update shared component | use component-level and option-level write masks; preserve row-owned fields and unaffected selections |
| Detach/make project-specific | clear Library link, mint Project component identity, retain complete option graph and current selection |
| Delete row | delete only the row instance and its row history semantics; never delete the Library source |

## Confirmed Bugs And Gaps

### `F-026` — Row-selected option is rewritten as component default

`getSelectedEditingPriceOptionId()` prefers the row's `priceOptionId`. Initial draft construction then marks that selected option as `isDefault`, and `buildEditedItem()`/the payload persist it as the component default.

**Effect:** opening a component from a row using Option 2 and saving can make Option 2 the Library default even when the user never chose **Set default**.

### `F-027` — Library update resets every linked row to one active option

`reconcileLinkedEstimateRowsForLibraryComponent()` selects the component active/default option and `buildLinkedEstimateRowsSyncStatement()` writes its ID, label, unit, cost, and `linked-clean` state to every linked row.

**Effect:** rows using other variants collapse to the default and `linked-overridden` state/values can be erased.

### `F-028` — Project component fan-out is component-wide, not option-aware

Project row propagation groups by component identity and treats `priceOptionId`, label, option list, unit, cost, image, and other source snapshot fields as shared.

**Effect:** editing or selecting one variant can rewrite sibling instances that use another variant.

### `F-029` — The Components page has a reduced parallel editor

`EditComponentDrawer` edits one flat/default cost and states that every linked instance will update. It cannot preserve the complete variant, image, attachment, equivalency, or selected-option contract.

### `F-030` — Variant attachment payloads are accepted but not persisted

The modal uploads attachments and the action normalizes/validates them, but `buildComponentPriceOptionWritePlan()` does not insert, rebind, supersede, or delete `cost_library_item_variant_attachments` rows.

### `F-031` — Optimistic create/edit can hide persistence failure

Create/update callbacks construct local `EstimateRowItem` objects instead of replacing state with an authoritative detail reread. New option IDs may be matched by label, which is ambiguous when labels repeat.

### `F-032` — Duplicate behavior differs by surface

The sidebar hydrates/copies variant data; the inspector duplicate creates one flat option. Reusing attachment bucket/path would violate unique ownership and may point both components at the same object.

### `F-033` — Project components lack an explicit variant authority rule

Project components intentionally have no master table, but current projection chooses a representative row. Without an explicit rule, one row's selection can be mistaken for the component default and sibling option graphs can drift.

## Canonical Variant Fan-Out Rules

| Mutation | Component/default record | Instances using edited variant | Instances using another variant | Row-local fields |
| --- | --- | --- | --- | --- |
| component name/category/brand/lifecycle | update | update component fields | update component fields | preserve |
| edit variant label/SKU/unit/cost/image | update only target option ID | update target-derived fields if linked-clean | preserve selected option and derived values | preserve |
| add variant | add stable option ID | option catalogue refresh only | option catalogue refresh only | preserve |
| reorder variants | update sort order | catalogue refresh only | catalogue refresh only | preserve |
| set default | change default flag | preserve current selection | preserve current selection | preserve |
| select variant in a row | no component mutation | initiating row only | no change | preserve |
| delete unused variant | deactivate/delete target option and owned media per policy | none | catalogue refresh only | preserve |
| delete used variant | block until replacement is chosen, then guarded reassignment | reassign only rows using deleted option | no selection change | preserve |
| detach row | no Library mutation | initiating row becomes new Project component | no change | preserve |

### Override rule

`linked-overridden` is a field-ownership mask, not a reason to freeze the entire row. Component identity and option catalogue may refresh, but overridden values stay until an explicit rebase or user-selected new variant replaces them.

### Project rule

For Project components, the same option-scoped rules apply only inside one project. The option catalogue is a shared component fact; the selected option and row-local values belong to each row instance.

## Canonical Save And Read-Back Contract

### Save input

One canonical input shape must include:

- component ID/type and expected component revision/fingerprint;
- full component-level patch;
- complete ordered active option graph with stable existing IDs and client correlation IDs for new options;
- explicit `defaultPriceOptionId` independent of initiating row selection;
- explicit `editedPriceOptionIds`/deleted option intents;
- attachment binding intents; and
- initiating row ID/selected option only when row reconciliation is required.

The `fieldContract: "opendesign-add-component"` special case is removed. The Add/Edit modal and inline fast path call one domain contract.

### Atomic Library save

One D1 batch must:

1. validate workspace ownership and expected component/usage fingerprint;
2. update component fields;
3. upsert variants and current cost entries by stable ID;
4. bind/rebind/supersede attachments;
5. reject unsafe deletion of in-use variants;
6. insert the component version/history receipt;
7. reconcile linked rows by each row's selected option and override mask; and
8. return changed row revisions and the authoritative component detail graph.

### Atomic Project save

One guarded D1 batch must:

1. resolve project component identity and every current instance in that project;
2. validate the impact fingerprint;
3. derive one canonical component option graph from the submitted edit;
4. update shared component facts on all instances;
5. update variant-derived fields only on rows selecting the changed option;
6. preserve each row selection, row-local fields, and unaffected option values; and
7. return every changed row/revision for local reconciliation.

### Authoritative read-back

After create/update/duplicate:

- reread the saved detail graph from D1;
- return actual item/option/cost/attachment IDs and ordering;
- replace the local cache entry rather than merging an optimistic partial;
- patch affected Estimate Sheet rows from server results; and
- invalidate only bounded active Library/Project queries.

## PRD Requirements Added By This Audit

### `UX-001` — One Add/Edit Component authority

All advanced create/edit entry points use the same full modal and domain mutation. The reduced drawer and duplicate surface-specific mutation shapes are removed.

### `REQ-015` — Component and variant CRUD round-trips exactly

Create, detail read, update, duplicate, archive/delete, add/reorder/default/delete variant, reload, and estimate insertion preserve stable identities and every supported field.

### `REQ-016` — Variant-scoped propagation is deterministic

Library and Project component edits separate component fields, target-variant fields, row selection, and row-local overrides. Editing Option 1 never rewrites an instance using Option 2.

### `REQ-017` — Estimate row transfer is complete and reversible

Insert, replace, move, detach, promote, and delete preserve the exact source/component/variant receipt and the correct row-owned values.

### `REQ-018` — Authoritative reconciliation replaces optimistic guesses

Every graph mutation returns or rereads authoritative D1 state before the UI declares the component saved.

### `DATA-001` — Component storage ownership is relationally complete

Every Library variant, cost entry, attachment, upload asset, and R2 object has validated workspace/item/option ownership and cleanup semantics. Project option graphs remain bounded row snapshots with stable project-scoped identities.

### `OPS-001` — Beta implementation is direct replacement

No versioned UI contracts, legacy editor adapters, dual write paths, feature flags, or hypothetical released-client compatibility layers are added.

## Acceptance Scenarios

1. Create a Library component with Default, Option 2, and Option 3; reload; every field, ID, order, image, attachment, and default is identical.
2. Insert Default into Row A and Option 2 into Row B; edit Option 2 cost; only Row B receives the new option-derived cost.
3. Change the component name; Rows A and B receive the name while retaining their selected options and row-local values.
4. Open the component from Row B; save without clicking **Set default**; the component default remains unchanged.
5. Set Option 3 as default; existing rows retain Default/Option 2; the next insertion starts with Option 3.
6. Mark Row B `linked-overridden`; edit its source option; overridden fields remain until explicit rebase or variant selection.
7. Add a variant to a Project component used in three estimates in the same project; all instances receive the option catalogue, none changes selection.
8. Edit Option 1 of that Project component; only instances selecting Option 1 receive its derived fields.
9. Copy the Project component into another project; it receives a new component identity and never fans back to the source project.
10. Duplicate a multi-variant Library component; the copy has fresh component/option IDs, identical supported variant data, and no shared attachment path.
11. Attempt to delete a variant in use; the mutation blocks until a replacement is explicitly selected.
12. Delete a Library source; linked rows retain stable detached values and option snapshots while source-owned media follows the defined cleanup policy.

## Evidence Boundary

This is a planning-only audit. Product tests, browser automation, screenshots, and builds are `NOT_REQUIRED` for this run. Implementation agents must prove each acceptance scenario with the cheapest decisive source, D1, static, or explicitly authorized runtime evidence and must not translate “preserve current beta behavior” into backward-compatibility work.
