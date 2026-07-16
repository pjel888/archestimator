# Interoperability And Publication Contract

> **Historical baseline notice (2026-07-15):** This document is a dated baseline/deep dive, not current readiness authority. Current status lives in `README.md`, `09-ESTIMATE-SHEET-FEATURE-ACTION-MATRIX.md`, `10-DATA-INTEGRITY-BUG-AND-READINESS-AUDIT.md`, `IMPLEMENTATION_PLAN.md`, and `TRACEABILITY.md`. Any `PASS`, implemented, or complete wording below is historical unless re-proved there.

## Decisions

### `DEC-AUTO-001` — One integration authority

This pack owns the producer/consumer contract from estimate row/component identity through issued review. Related packs may own isolated UI or library features, but cannot independently declare this end-to-end path complete.

### `DEC-AUTO-002` — Selected variant is never implicit during edit

Every component edit originating from a row carries the row's selected `priceOptionId`. An absent/invalid option is a conflict requiring refresh, not permission to update the default silently.

### `DEC-AUTO-003` — Overrides are preserved

Automatic source sync updates `linked-clean` only. `linked-overridden` remains locally authoritative until explicit refresh/rebase. Detached/unlinked rows are outside source fan-out.

### `DEC-AUTO-004` — No project-component master table

Project components remain project-scoped row projections with a stable `sourceComponentId`. The plan repairs identity/mutation behavior without adding another persistence layer.

### `DEC-AUTO-005` — Templates resolve trust at insert

A template is a saved blueprint. A linked source is resolved to current usable component/variant data at insert. If resolution fails, the user chooses saved snapshot as unlinked/project-specific or cancels. There is no silent stale linked insert.

### `DEC-AUTO-006` — Public review anchors to immutable issue identities

Area, row, and component comments target opaque IDs derived inside the issued payload. They never target or read a live Library component after issue.

### `DEC-AUTO-007` — Formal decisions are issue-level

Approve/decline/request-changes applies to the exact issued estimate package and content hash. Component/area feedback is discussion, not partial formal acceptance in this MVP.

### `DEC-AUTO-008` — User-controlled tests remain off

Implementation uses the cheapest decisive non-test evidence until an explicit test task exists. Static plan validators are allowed because they validate planning contracts, not product behavior.

### `DEC-AUTO-009` — One Add/Edit Component authority

The full Add/Edit modal is the only advanced editor for Library and Project components. The reduced drawer and surface-specific duplicate/write contracts are deleted. Inline row editing remains a compact caller of the same canonical mutation.

### `DEC-AUTO-010` — Beta cleanup is direct replacement

The component path does not gain V1/V2 product contracts, compatibility adapters, dual writes, or feature flags. Current data may receive one fix-forward repair; superseded code is then removed.

## Canonical Private Identities

| Entity | Canonical private identity | Scope | Persistence |
| --- | --- | --- | --- |
| Library component | `cost_library_items.id` | workspace | master row |
| Library variant | `cost_library_item_price_options.id` | component/workspace | variant row |
| Variant cost entry | cost-entry UUID | variant/workspace | history/current row |
| Variant attachment | attachment UUID + unique bucket/path | variant/component/workspace | metadata + upload asset/R2 |
| Project component | `sourceComponentId` UUID | project | estimate-row source snapshot/metadata |
| Template | `estimate_templates.id` | workspace | blueprint master |
| Estimate row | `estimate_row_items.id` + `row_revision` | estimate | authoritative calculation/projection row |
| Area branch | `estimate_nodes.id` | estimate/tab | tree node |
| Issue | `client_portal_issues.id` + content hash | portal | immutable issue |

## Component Field Propagation

### Component-level patch

Applies to name, description, category/category node, brand, lifecycle, and component-owned image when that image is not variant-specific.

For Library updates:

1. require expected component version/updated timestamp;
2. require expected affected-row fingerprint;
3. validate workspace ownership and manager capability;
4. update the master/version history;
5. update eligible `linked-clean` rows;
6. preserve each row's selected price option and derive its variant fields from that option;
7. leave `linked-overridden`, detached, and unlinked row values untouched;
8. return row revisions and affected estimates for one client reconciliation.

For Project updates:

1. resolve the initiating project component identity;
2. require project edit permission and expected instance fingerprint;
3. update only same-project eligible instances;
4. preserve each instance's selected option snapshot;
5. return one guarded fan-out result.

### Variant-level patch

Applies to variant label, SKU, unit, cost entries, pricing date/source, variant image, dimensions/package metadata, active/default state, and attachments.

Rules:

- the initiating row supplies `priceOptionId`;
- component default option ID is supplied separately and changes only from an explicit default action;
- the server validates the option belongs to the component/workspace;
- changing one variant does not change another variant's values or row selection;
- a default change affects future default selection and denormalized master values, but does not reselect existing rows;
- a row using the changed variant receives its new variant values if `linked-clean`;
- a row using another variant receives component-level fields only;
- a linked-overridden row receives no automatic value overwrite;
- cost-entry/current/default invariants are enforced inside the atomic write boundary.
- deleting an unused option is direct; deleting an in-use option requires an explicit replacement and reassigns only rows selecting that option.

### Row-local patch

Quantity, quantity base/contingency amount, contingency/adjustment, misc cost when row-specific, discipline, designation, sort order, node/tab membership, and custom notes are row-local. Editing them marks a linked row overridden only when the field actually shadows a source-owned value; purely row-local fields do not require destructive source detachment.

## Atomic Mutation Contracts

### Shared component write

Guard input:

- component revision/version;
- affected row IDs and row revisions;
- initiating selected variant ID when variant data changes;
- mutation/correlation ID.

Write result:

- component version and updated timestamp;
- option IDs/default state;
- affected row revisions grouped by project/estimate;
- no partial persistence on guard failure or D1 statement/batch failure.

`buildLinkedEstimateRowsSyncStatement` cannot remain a single uniform value update for variant-bearing rows. The replacement may use a correlated option lookup/CASE plan or a bounded guarded statement set, but it must preserve per-row option identity and remain atomic.

### Row move

One server operation owns source removal/reorder, target insertion/reorder, revisions, history, and outbox. If any source/target revision is stale, nothing commits. Client rollback is followed by authoritative refetch when the failure might be ambiguous.

### Insert then immediate edit

The client stores row-keyed pending insert operations. An edit for the same row is merged into the insert payload or queued behind the resolved insert revision. It may not call update against a row that is only optimistic.

### Bulk delete

Client sends `{rowId, expectedRowRevision}` for every row. The server validates the exact set and revisions before delete/history. Deleted-row restoration receipts retain the source event and row snapshots.

## Image And Attachment Contract

### Shared image ownership

- Library/component image upload reserves/finalizes a workspace component asset.
- Project component image upload is project scoped.
- Custom row image remains estimate-row scoped.
- promoting or editing a Library component never stores a project-private fetch URL as the master image descriptor.
- public issue builder copies/derives a client-safe immutable image reference only when its policy permits.

### Variant attachments

Create/update algorithm:

1. validate finalized upload asset, workspace, bucket, path, content type, size, and actor;
2. validate option belongs to component/workspace;
3. insert/update attachment metadata by attachment ID with immutable ownership checks;
4. mark removed metadata/asset state without deleting a blob referenced elsewhere;
5. preserve review/supersession fields unless the action explicitly owns that transition;
6. commit component/option/version/attachment changes atomically or compensate an already-uploaded unclaimed blob through existing cleanup.

Duplicate algorithm:

- default first-user behavior: duplicate component/variants/cost snapshots but omit attachments and show a concise notice;
- optional future behavior: copy each R2 object to a fresh path, then create fresh attachment IDs;
- never use unique path conflict to reassign the original attachment row.

## Lifecycle And Deletion Contract

| State | Manage | New insert | Existing linked row | Public issued snapshot |
| --- | --- | --- | --- | --- |
| `draft` | yes | no | preserve | immutable if already issued |
| `in_production` | yes | no by default | preserve/warn | immutable if already issued |
| `available` | yes | yes | normal sync rules | snapshot-safe |
| `discontinued` | yes | no new insert | preserve with warning | immutable if already issued |
| `archived` | hidden/manage restore only | no | preserve row snapshot, no sync | immutable if already issued |

Archive/delete of a Library master never cascades application behavior into estimate rows, template snapshots already saved, issue payloads, comments, or decisions. The implementation must verify real migration/schema behavior instead of inferring foreign-key runtime mode from missing pragmas.

## Template Contract

### Browse

- summary query: template ID, name, category, updated time, node/row counts, bounded page/cursor;
- selected detail: one template tree/row graph;
- synchronous in-flight refs prevent hover/expand duplicate fetches;
- partial/list state is explicit.

### Insert

For each template row:

1. validate target estimate/tab/node and project edit permission;
2. allocate fresh node/row IDs;
3. if source component/variant exists and is `available`, resolve current component and selected variant values, insert `linked-clean`, and store current version/option receipt;
4. otherwise require one explicit action for the affected template insert: use saved snapshot as unlinked/project component, or cancel;
5. calculate with canonical row inputs;
6. persist all inserted nodes/rows and one history event atomically within D1 limits;
7. if the template exceeds the atomic bound, reject with a useful limit instead of partially inserting.

## Issued Snapshot Contract

### Consistency fence

Before issue write:

1. read selected estimates/tabs/nodes/rows including row revision and source/component receipt fields;
2. build a deterministic source fingerprint over sorted estimate IDs, updated/revision values, tab/node IDs, row IDs/revisions, and relevant component/variant version receipts;
3. reread the lightweight fingerprint immediately before commit;
4. if changed, retry a bounded number of times or return a source-changed error;
5. store the accepted source fingerprint with issue audit metadata.

This provides a coherent application-level issue boundary without inventing a long-running D1 transaction.

### Deterministic public identity

Semantic issue hash is calculated from canonical private semantic content before random/encrypted delivery material. Public IDs are deterministically derived from issue semantic identity plus entity kind and private identity.

Public ID kinds add at least `component` alongside project/estimate/tab/node/row. A Library/project component used in multiple issued rows receives one component public ID inside the issue. An unlinked custom row derives a one-row component anchor from its row identity.

### Client-safe row projection

Required public row fields:

```text
row public ID
component public ID
component label
selected variant label (nullable)
component version receipt (nullable, client-safe)
source/link state receipt (normalized, client-safe)
description/designation/discipline/material
quantity/unit
line total + canonical calculation metadata
node/tab public IDs
optional client-safe immutable image reference
```

Explicitly excluded:

```text
raw component/variant/row/node UUIDs
source_snapshot_json and metadata_json
unit_cost, misc_cost, cost-entry values
supplier/source URLs/internal notes
private R2 paths and attachment metadata
actor IDs and internal audit payloads
```

### Financial sections

- section data scope is explicit and validated during publish;
- each grouping implementation uses real source fields or is rejected as unsupported;
- every bucket total is derived from issued row minor units and reconciles to the section/issue total;
- comparison configuration is implemented or rejected, never ignored;
- payload storage selects D1 JSON, R2, or server-paged representation by explicit byte/row thresholds.

## Discussion Contract

### Target registry

Canonical kinds for this MVP:

- `issue`/legacy `proposal`;
- `estimate`;
- `estimate_tab` where a sheet/tab control exists;
- `area_group` using an issued node public ID;
- `row`;
- `component`.

Legacy shared comments and Client Portal threads may keep different storage tables, but both use the same issued-target validation rules. Legacy decision target types are split from comment target types so adding area/component comments does not imply area/component formal decisions.

### Server target resolution

Input is `{issueId, sectionId, kind, publicId}` plus message/subject. The server:

1. authenticates recipient/password/session and checks rate/idempotency/body limits;
2. loads current or explicitly historical issue under portal/publication;
3. authorizes section visibility and thread creation;
4. builds/reads a bounded issued target index for recipient-visible sections;
5. requires exact kind/publicId membership;
6. derives target label and secondary label from issued content;
7. stores the thread/comment and audit/outbox atomically.

### Read and lifecycle

- list filters by issue and section visibility before returning metadata;
- message, mark-read, reply, resolve, and reopen repeat the same policy boundary;
- historical issue threads remain readable only when the recipient can view that historical issue;
- current replies to historical threads are disabled unless policy explicitly allows them;
- carry-forward creates a new current-issue thread only after semantic target re-resolution; otherwise it becomes an unanchored historical reference requiring owner review.

## Recipient Access Contract

### Invite and resend

- use `outbox_<uuid>` IDs accepted by the queue contract;
- payload contains the information needed to render a one-time bootstrap URL without logging plaintext;
- acceptable implementation choices are encrypted-at-rest bootstrap material in outbox with post-delivery removal, or an equivalent short-lived signed handoff generated inside the authorized delivery boundary;
- email links include portal stable token plus recipient bootstrap token and preserve both through password unlock;
- owner UI reports actual queued/delivered/dead state, not assumed delivery.

### Redemption and session

One guarded write:

1. validate portal stable token, recipient credential hash/status/expiry, recipient/portal state, password access if required, and current access credential version;
2. set recipient verification state to verified and record audit/analytics;
3. optionally rotate/revoke one-time bootstrap credential according to the chosen reuse policy;
4. mint a session bound to portal ID, recipient ID, recipient credential version, and portal access credential version;
5. never return/store raw secret after the response boundary.

All manifest, section, thread, activity, and decision routes validate both versions and portal/issue state.

## Formal Decision Contract

- `request_changes` requires review/change capability;
- `approve` and `decline` require formal decision capability and required-approver eligibility when policy says so;
- submission binds issue content hash, recipient, signer snapshot, intent hash, and idempotency key;
- the service inserts/returns the receipt, aggregates required approver state, transitions issue decision status, audits, and queues owner-side notification atomically;
- a replay with the same idempotency/intent returns the same receipt; a different intent conflicts;
- superseded, withdrawn, archived, expired, or non-current issues reject new formal decisions;
- mobile and desktop use the same capability result and confirmation copy.

## Recovery Rules

- any uncertain D1 batch result triggers authoritative read before retry;
- uploaded-but-unclaimed component assets enter existing cleanup, not manual deletion in the request path;
- issue build retries only on source-fingerprint drift and never publishes a partially built set;
- dead notification outbox rows retain redacted error codes and can be retried after the producer defect is fixed;
- execution pauses a unit when a shared dirty file changes underneath it, rereads the file, and rebases the narrow patch without reset/stash/revert.
