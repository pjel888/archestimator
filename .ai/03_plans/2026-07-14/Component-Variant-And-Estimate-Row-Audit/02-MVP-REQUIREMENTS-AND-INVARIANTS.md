# MVP Requirements And Invariants

> **Historical baseline notice (2026-07-15):** This document is a dated baseline/deep dive, not current readiness authority. Current status lives in `README.md`, `09-ESTIMATE-SHEET-FEATURE-ACTION-MATRIX.md`, `10-DATA-INTEGRITY-BUG-AND-READINESS-AUDIT.md`, `IMPLEMENTATION_PLAN.md`, and `TRACEABILITY.md`. Any `PASS`, implemented, or complete wording below is historical unless re-proved there.

## Product Outcome

An estimator can build and edit an estimate from Library, Project, and Templates sources without silent identity or cost corruption, then issue a client-safe immutable review where an authorized recipient can understand totals, discuss the exact issued estimate/area/row/component, and submit a policy-valid formal response.

## Requirements

### Estimate hierarchy and content

#### `REQ-001` — Area branches and tabs remain truthful

- group/area identity, order, expansion, and row membership are preserved across tab changes and moves;
- branch counts and totals use only the complete loaded row set;
- a truncated/partial tab is visibly marked and mutation controls that depend on completeness are disabled;
- public issued branches preserve the same hierarchy and totals.

#### `REQ-002` — Row mutations are atomic and revision-guarded

- insert, edit, move, reorder, delete, bulk delete, restore, replace, and make-project-specific use expected revisions where applicable;
- a multi-row or source/target operation either commits fully with one history correlation or leaves all rows unchanged;
- an edit made immediately after insert is serialized behind that insert or merged into the same write;
- conflict recovery refetches/reconciles authoritative rows rather than reporting false success.

#### `REQ-003` — Calculations, history, save state, and cache converge

- visible totals, history deltas, issued totals, and financial breakdowns use the same minor-unit calculation basis;
- invalid or reverted drafts return the row/global save state to clean;
- fresh server data cannot be indefinitely shadowed by stale initial query data;
- column/layout preference errors remain retryable and visible without corrupting estimate data.

### Component interoperability

#### `UX-001` — One full Add/Edit Component authority

- every advanced Library or Project component create/edit entry point uses the full Add/Edit modal;
- the Components page reduced drawer is removed rather than maintained as a second editor;
- inline editing remains compact but calls the same component/variant domain mutation;
- current modal layout and dense Estimate Sheet controls may remain visually unchanged; and
- generated option labels use `Default`, `Option 2`, and neutral compact ordinals rather than product V1/V2 language.

#### `REQ-004` — Library component edits preserve shared identity and overrides

- component-shared fields update the workspace master and eligible linked instances;
- row-local fields never fan out;
- `linked-clean` rows may update automatically after a revision/fingerprint guard;
- `linked-overridden` rows keep local values and override state until an explicit rebase/refresh;
- detached/unlinked rows never receive library fan-out;
- deletion/archive never deletes historical estimate rows, issued snapshots, comments, or decisions.

#### `REQ-005` — Variant, image, cost, and attachment identity round-trip

- inline/modal edits target the initiating `priceOptionId`, not an implicit default;
- fan-out preserves each target row's selected variant;
- component-level fields and variant-level fields have separate write masks;
- exactly one valid current cost entry and one default variant are enforced by the authoritative write path;
- shared images and attachments use component/workspace ownership, not project-row URLs;
- duplicate never reassigns an original attachment path; it either omits attachments or copies blobs to fresh paths;
- upload finalization and metadata ownership changes are atomic/recoverable.

#### `REQ-006` — Project components stay project-scoped

- project component identity is stable across instances inside one project and cannot fan out to another project;
- foreign-project insertion generates a fresh project identity;
- project edits preserve per-row selected variants and use an explicit impact preview for multi-instance writes;
- make-project-specific is one atomic mutation and leaves the Library master untouched.

#### `REQ-007` — Templates are bounded blueprints with explicit source trust

- template summaries are bounded/paginated; tree/row graphs hydrate only for the selected/expanded template;
- template insert validates workspace, component lifecycle, and referenced variant;
- when the source remains usable, insert resolves current source data and records current component/variant identity;
- when the source is unavailable, the user explicitly chooses saved snapshot as unlinked/project-specific or cancels;
- template delete or source archive never mutates already inserted rows or issued snapshots.

#### `REQ-008` — Component dock lifecycle and concurrency are predictable

- Library, Project, and Templates remain distinct source families with consistent inline/editor behavior;
- new insert candidates are limited to `available`; other lifecycle states are historical/manage-only unless an explicit warning flow is defined;
- editor, folder move, duplicate hydration, and template prefetch cannot resolve out of order into stale visible state;
- component loading/error/empty states stay compact, keyboard accessible, and do not squeeze the estimate grid;
- dropping a project component focuses Qty.

#### `REQ-015` — Component and variant CRUD round-trip exactly

- Library create, detail read, update, duplicate, archive/delete, add/reorder/default/delete variant, and reload preserve stable IDs and every supported field;
- Project create, projection read, update, instance copy, delete, promotion, and cross-project localization preserve stable project/variant identity;
- duplicate uses one full-detail path, fresh component/option IDs, and no shared attachment path; and
- variant deletion is direct when unused and otherwise requires an explicit replacement for only rows using that variant.

#### `REQ-016` — Variant-scoped propagation is deterministic

- component-level fields update eligible instances of the same component;
- variant-level fields update only the target option ID and only instance-derived fields for rows selecting that option;
- adding/reordering/defaulting a variant refreshes the option catalogue without reselecting existing rows;
- Library fan-out respects link/override state; and
- Project fan-out remains inside one project and preserves every instance's selected option.

#### `REQ-017` — Component transfer into Estimate Sheet rows is complete

- insert, replace, move, detach/make-project-specific, promote, and delete carry the correct component, selected option, option catalogue, version/revision, media, and link receipt;
- row identity/location and row-owned quantity/calculation values follow the operation's explicit policy;
- Library default resolution happens at insertion only; and
- a Project component copied to another project receives a fresh component identity without losing its option graph.

#### `REQ-018` — Saved state reconciles from authoritative data

- create, update, and duplicate return or immediately reread the complete D1 detail graph;
- new option IDs use client correlation or authoritative results, never label matching;
- affected Estimate rows reconcile from server row revisions/data; and
- the UI cannot declare saved from an optimistic partial graph.

### Issued client review

#### `REQ-009` — Issue creation is consistent, immutable, and identity-safe

- issue build captures a row/source revision fingerprint and rejects/retries torn reads;
- semantic content hashing is deterministic and independent of random public-ID generation;
- no-op republish has explicit dedupe behavior;
- issued rows carry an opaque `componentPublicId`, client-safe component label, selected variant label, component version, link/source state, row revision, node/tab membership, and line total;
- raw library IDs, source snapshots, supplier internals, unit/misc costs, and private asset paths are never exposed.

#### `REQ-010` — Client financial views honor scope and reconcile

- each financial section uses its declared estimate/data scope;
- unsupported grouping/comparison options fail publication rather than silently substituting another dimension;
- estimate/tab/area/category/supplier/discipline buckets reconcile exactly to the issued total;
- large financial payloads use bounded issue storage/read contracts.

#### `REQ-011` — Discussions are issued-target scoped

- target kinds include issue/proposal, estimate, estimate tab where used, area group, row, and component;
- every target public ID is validated against the recipient-visible issued section/issue;
- labels are derived server-side from the immutable payload;
- component threads use issue-local opaque component anchors, never live Library IDs;
- thread list/message/read/reply/resolve/reopen reapply issue and section policy;
- create idempotency is race-safe; stale/deleted/live-source changes do not invalidate the issued anchor;
- carry-forward requires explicit target re-resolution or becomes a clearly unanchored historical thread.

#### `REQ-012` — Recipient access is deliverable and revocable

- invite/resend outbox receives a deliverable encrypted/ephemeral bootstrap link and a valid queue ID;
- first valid redemption atomically verifies the recipient and mints a session;
- password unlock retains the recipient bootstrap flow;
- personalized sessions bind portal ID, recipient credential version, and portal access-credential version;
- recipient revocation, token rotation, password enable/rotation, portal access-off, issue withdrawal, and expiry invalidate access as specified;
- no raw token is logged or stored in plaintext D1.

#### `REQ-013` — Formal decisions enforce issued authority and state

- formal approve/decline applies to the issued estimate package/issue; area/component feedback remains discussion, not formal acceptance;
- request-changes authority is distinct from approve/decline authority;
- required approvers and decision policy snapshot are evaluated atomically;
- duplicate/replayed submissions are idempotent against issue content hash and intent hash;
- issue status, decision summary, receipt, signer snapshot, and owner notification converge in one transaction boundary;
- superseded/withdrawn/stale issues cannot receive a current formal decision.

#### `REQ-014` — Activity, notifications, supersession, and mobile close the loop

- thread, mention, decision, issue, and recipient events write correct audience outbox entries;
- queue/cron cadence supports timely first-user review rather than daily-only delivery;
- client-safe activity uses existing audit facts instead of an empty issued payload;
- supersession defines which threads remain historical, require revalidation, or can be deliberately carried forward;
- mobile retains capability-aware Discuss and Decision actions;
- completion reconciles this pack with related active pack status so no contradictory `COMPLETE` claim remains.

### Cross-cutting requirements

#### `SEC-001` — Tenant, recipient, target, and asset boundaries fail closed

- every private action asserts workspace/project/estimate/library permission;
- every public action asserts portal, issue, recipient, capability, section, and issued-target membership;
- public IDs are opaque and issue-local;
- shared labels are sanitized/derived rather than trusted from clients;
- component media ownership and download access follow workspace/component scope;
- origin, password/session, rate-limit, body-size, idempotency, and audit controls remain in force;
- no implementation expands provider resources beyond bound D1/R2/Queue/Email resources.

#### `PERF-001` — Work stays bounded and row-scoped

- normal cell edits do not recompute/render every branch;
- library browse, template browse, public issue, discussions, and activity have explicit bounds/cursors/sentinels;
- issue payloads cross to R2 or server paging at measured thresholds;
- tree aggregation is indexed/linear rather than filtering all rows for every node;
- loading is cell/branch/section scoped with no numeric layout shift;
- performance proof uses static instrumentation/query counts first; browser automation remains user-controlled.

#### `DATA-001` — Cloudflare component ownership is relationally complete

- component, option, current cost, attachment, upload asset, R2 object, version, and linked-row ownership are validated in the same workspace/item/option boundary;
- attachment item/option relations are repaired with current foreign-key/transaction enforcement;
- abandoned/replaced/deleted uploads have explicit cleanup ordering; and
- Project component option graphs remain bounded, stable-ID row snapshots rather than a new master-table layer.

#### `OPS-001` — Beta implementation is direct replacement

- no versioned product path, dual editor, dual write, compatibility adapter, or hypothetical-client fallback is added;
- obsolete callers/code are deleted in the same coherent implementation unit that replaces them;
- current data receives a bounded fix-forward repair where required; and
- internal revisions and Cloudflare migration ordering remain because they are concurrency/operations controls, not product releases.

## Domain Invariants

### Identity

1. Library component identity is `cost_library_items.id`.
2. Variant identity is `cost_library_item_price_options.id`.
3. Project component identity is a project-scoped `sourceComponentId` stored in row source metadata; it is not a Library ID and does not require a new master table.
4. Template identity is a blueprint identity. Inserted nodes/rows always receive new estimate identities.
5. Estimate row identity and `row_revision` are the write-concurrency boundary.
6. Issued component identity is a deterministic issue-local opaque anchor derived from the component identity, or from the row ID for an ungrouped custom row.
7. A public component anchor never resolves through a live Library lookup during review.

### Field ownership

| Field family | Library shared | Variant shared | Project component | Row local | Public-safe |
| --- | --- | --- | --- | --- | --- |
| name/description/category/brand | yes | no | yes | snapshot only | label/description only |
| supplier/source URL/internal notes | yes | optional | yes | snapshot only | no by default |
| variant label/SKU/unit/price source | no | yes | yes | selected snapshot | label and unit only |
| unit cost/misc cost/cost entries | no | yes | yes | calculation input | no |
| quantity/contingency/adjustment/designation/discipline | no | no | no | yes | selected display fields |
| image | component/variant owned | yes | project component owned | custom-row owned | client-safe issued URL only |
| attachments | component variant owned | yes | not shared unless copied | no | excluded from MVP public payload |
| lifecycle/version/link state | yes | active/default state | yes | projection state | safe normalized receipt only |

### Link states

- `linked-clean`: eligible for guarded source refresh.
- `linked-overridden`: values and state are preserved; latest source version may be recorded, but no automatic destructive overwrite occurs.
- `detached` / `unlinked`: no source fan-out.
- `source-changed`: transitional legacy value only; implementation must not depend on it as the sole representation of both override and source freshness.

### Publication

- issue payloads are immutable facts, not a live view of the estimate or Library;
- issue/public component anchors survive later row/component rename, archive, detach, or deletion;
- public financial totals use issued row totals only;
- discussion labels and membership come from issued payloads;
- formal decisions apply to the exact issue content hash.

## UX Invariants

- preserve dense in-row editing; do not replace ordinary edits with a new editor surface;
- single-instance project edits save without confirmation;
- fan-out edits show affected instance count and scope before commit;
- use full labels such as `Default` and `Option 2`, with neutral compact ordinals where space is constrained;
- scoped skeletons appear only in affected component/material cells;
- client review is full width, non-editable, document-like, and usable on tablet/mobile;
- information is never conveyed by color alone; focus, error, loading, and disabled states are explicit;
- component/comment/decision actions remain visible in the context where the user evaluates the issued content.

## Non-Goals

- a new project-component database table;
- live mutation of an issued snapshot after publication;
- public exposure of supplier internals, unit costs, source URLs, or attachments;
- compatibility layers for hypothetical released clients;
- V1/V2 product routes, schemas, editors, or feature-flag rollout for the component path;
- hosted deployment, production data mutation, paid providers, or unrelated Cloudflare resources;
- a redesign of the whole workshop or Client Portal;
- automated product tests, builds, browser automation, or screenshots without a new explicit testing request.
