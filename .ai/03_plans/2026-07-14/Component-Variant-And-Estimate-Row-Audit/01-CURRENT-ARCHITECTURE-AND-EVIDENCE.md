# Current Architecture And Evidence

## Evidence Model

This document distinguishes three evidence classes:

| Class | Meaning | Use |
| --- | --- | --- |
| `HEAD` | source present at `ad2187d23881b490009c45dd283d9ced82c12b10` | stable baseline and GitNexus graph |
| `WORKTREE` | uncommitted shared-tree source observed on `2026-07-14` | current implementation truth, not completion proof |
| `PLAN` | required future behavior | implementation target, never described as already working |

Scoped baseline snapshot:

- `scoped_status_sha256`: `c95125543ec15637854f08e34a9a1a28aa2c1cd1693bc765d4e0d556fb32b147`
- `scoped_diff_sha256`: `dbe7c7a82c145e75cc6d17c741b0c01b47ba7eca9ec637301347ad2bd97d087c`
- Concurrent edits exist in `EstimateSheetContent.tsx`, component-library files, estimate-row cells/handlers, mutations, component actions, estimate actions, and the D1 adapter.

## Private Estimate Path

### Route and state boundary

The private route loads project/estimate authorization and initial tab/tree data, then the client owns active-tab, tree, row draft, component dock, and optimistic mutation state.

Primary path:

`route loader -> EstimateSheetContent -> useEstimateRowHandlers/useEstimateRowMutations -> estimate actions -> D1 action client -> history/outbox -> TanStack/query/tree reconciliation`

Relevant evidence:

- active and secondary tab loading: `src/components/workshop/EstimateSheetContent.tsx:1096`, `src/lib/estimates/actions.ts:2129`
- repository load limits: `src/lib/repositories/workspace-repository.ts:4038`
- query initial-data/staleness policy: `src/hooks/use-estimate-query.ts:95`, `src/hooks/use-estimate-query.ts:150`
- first-prop tree reconciliation suppression: `src/components/workshop/estimate-tree/use-estimate-tree-reorder.ts:62`

### Area branches and tabs

The canonical authoring hierarchy is `estimate -> tab -> group/area nodes -> rows`. Branch totals are derived from row membership; branch identity is the estimate-node UUID. The public Client Portal later reuses issued tree-node IDs as opaque area targets.

Current gap: secondary tabs can be truncated by repository limits, but only initial-tab load-limit state reaches the UI. A later tab can therefore display incomplete row counts and totals without disabling moves or clearly warning the user.

### Estimate content and mutations

Rows persist calculation fields, source/component projection fields, JSON snapshots/metadata, sort order, and `row_revision`. History-aware actions already support optimistic concurrency for several single-row mutations.

Current high-risk gaps:

- component move persists source and target separately: `src/lib/estimates/d1-action-client.ts:3065`;
- immediate normal component insert and edit use independent mutations: `src/components/workshop/estimate-sheet/use-estimate-row-handlers.ts:723`, `src/hooks/use-estimate-row-mutations.ts:1389`;
- bulk-delete expected revisions are absent/ignored: `src/components/workshop/estimate-sheet/use-estimate-row-handlers.ts:1322`, `src/lib/estimates/actions.ts:3837`, `src/lib/estimates/d1-action-client.ts:2428`;
- invalid/reverted drafts can leave save state dirty: `src/components/workshop/estimate-sheet/rows/row-table.tsx:501`, `src/components/workshop/estimate-sheet/use-estimate-row-handlers.ts:448`;
- visible totals and history delta use different rounding paths: `src/lib/estimates/estimate-row-total.ts:205`, `src/lib/estimates/estimate-row-total.ts:322`, `src/lib/estimates/d1-action-client.ts:2295`.

### Rendering and feedback

Working behavior to preserve:

- row edit feedback is scoped rather than blanketing the grid;
- tree patch helpers avoid wholesale replacement for normal row changes;
- drag state clears on `drop`, `dragend`, and Escape in `src/components/workshop/estimate-workshop-drag.ts:47`;
- Component Library loading uses a stable skeleton and retry path.

Current performance gap: branch memoization rejects the global `rowMutationStatuses` identity before using its row-scoped comparison, so one mutation can rerender all branches: `src/components/workshop/estimate-sheet/rows/branch.tsx:137`.

## Component Domains

### Add/Edit modal and CRUD authority

The advanced component editor is not currently singular:

- Estimate Sheet row editing and the component dock use `src/components/workshop/component-library-manager/AddComponentModal.tsx` in edit mode;
- Components page creation also uses that full modal; and
- Components page inspector editing mounts `src/components/workshop/library/EditComponentDrawer.tsx`, a reduced flat editor that cannot round-trip the full variant/image/attachment graph.

The full CRUD/transfer audit is `05-ADD-EDIT-COMPONENT-MODAL-PRD-AND-AUDIT.md`. Its implementation decision is to retain the existing compact modal UI, make it the only advanced editor, and route inline edits through the same canonical component/variant mutation.

Current save/read behavior also diverges:

- `AddComponentModal.submit()` calls the full graph action for Library edits but constructs optimistic create/edit objects locally;
- `getSelectedEditingPriceOptionId()` prefers the initiating row selection and draft initialization then marks that option as component default;
- Library reconciliation chooses one active/default option and writes it to every linked row;
- Project propagation groups by component identity but includes option selection and option-derived snapshot fields in the shared patch; and
- attachment inputs are normalized/validated but never written by the option write plan.

The exact Cloudflare tables, JSON receipts, R2/upload state machine, and schema repair are recorded in `06-CLOUDFLARE-COMPONENT-DATA-AND-STORAGE-SCHEMA.md`.

### Library components

Canonical master:

- `cost_library_items.id` — workspace-shared component identity;
- `cost_library_item_price_options.id` — variant/price-option identity;
- `cost_library_item_variant_cost_entries` — variant cost history/current entry;
- `cost_library_item_variant_attachments` — attachment metadata;
- `cost_library_item_versions` and price/state history — audit/version evidence.

The component browse loader limits the estimate sidebar to 50 items and avoids unbounded history/attachment graphs until detail hydration. It excludes only `archived`, so `draft`, `in_production`, and `discontinued` records can still appear as insert candidates unless the UI applies a stricter policy: `src/lib/repositories/component-library-repository.ts:392`.

Dirty-worktree inline edits now use component/row revision fingerprints and an explicit fan-out modal for multiple instances. This is useful concurrency work but does not solve selected-variant propagation.

Selected-variant corruption path:

1. a row persists its selected `priceOptionId`: `src/components/workshop/estimate-sheet/rows/row-table.tsx:586`;
2. inline edit invokes component update without the initiating option ID: `src/components/workshop/EstimateSheetContent.tsx:2094`;
3. the server builds one default/active option snapshot: `src/lib/component-library/actions.ts:1876`, `src/lib/component-library/actions.ts:1915`;
4. `buildLinkedEstimateRowsSyncStatement` writes that one option to all linked rows and resets link state: `src/lib/component-library/actions.ts:474`.

GitNexus assessed `buildLinkedEstimateRowsSyncStatement` HIGH risk: 11 affected symbols and three direct callers across Component Library, Workshop, and Component Library Manager.

Override corruption path:

- linked targets include every state except `detached` and `unlinked`;
- synchronization therefore includes `linked-overridden` rows;
- the update ends by setting every row to `linked-clean`.

### Variants, images, and attachments

Variant payload normalization validates and carries attachment descriptors at `src/lib/component-library/actions.ts:986` and `src/lib/component-library/actions.ts:1136`. `buildComponentPriceOptionWritePlan` persists price options and cost entries but contains no attachment insert/update/delete statements at `src/lib/component-library/actions.ts:1455`.

The existing attachment table uses:

- `price_option_id`, `item_id`, `workspace_id`;
- fixed bucket `component-attachments`;
- unique `(storage_bucket, storage_path)`;
- review state, applicable cost entry, supersession, and approval fields.

The previous plan's blanket `ON CONFLICT(storage_bucket, storage_path) DO UPDATE` ownership reassignment was unsafe. Duplicate currently reuses attachment paths; reassigning on conflict would move metadata ownership away from the original component. A duplicate must either omit attachments or copy the blob to a new path before creating new metadata.

Shared-library inline image changes currently start on the estimate-row image route: `src/components/workshop/estimate-sheet/rows/cells.tsx:149`, `src/app/api/estimate-row-images/route.ts:161`. The component update persists only the URL and can prefer an older variant thumbnail; consumers outside the originating project can be denied by the project image route. Shared images therefore need component/workspace ownership.

### Project components

Project components are projections over estimate rows, grouped by source metadata; there is no project-component master table. This boundary is sound and should remain lean.

Working-tree behavior to preserve:

- foreign-project insert re-homes the component to a fresh identity;
- project variant snapshots persist in row source data;
- multi-instance project edits use a preview fingerprint and explicit fan-out;
- make-project-specific performs one row update, clears the library link, and creates a fresh project component identity.

Implementation must still verify that project fan-out preserves each row's selected variant and uses one atomic guarded write set.

### Templates

Templates store their own tree and row snapshots in `estimate_templates`, `estimate_template_nodes`, and `estimate_template_row_items`. Template rows can also retain `source_library_item_id` and a link state.

Current loader behavior is unbounded for a workspace: it reads every template and then all nodes/rows for every returned template in `src/lib/repositories/component-library-repository.ts:1283`.

Current insertion copies the stored row values and link state without resolving whether a referenced component/variant is still available or current: `src/lib/estimates/d1-action-client.ts:2589`.

Required correction: list template summaries in bounded pages, hydrate a selected/expanded template, and make insertion explicitly choose current linked source data or a saved unlinked snapshot when the source is unavailable.

## Issued Review Path

### Legacy shared publication

Working security behavior:

- snapshot IDs are converted to issue-specific opaque public IDs;
- public rows expose quantities and line totals, not private unit/misc rates;
- comment writes enforce origin, recipient/password access, rate limits, bounded/sanitized input, and stale view-version checks;
- target validation confirms estimate/row membership in the immutable publication snapshot.

Current target model is only `proposal | estimate | row`: `src/components/share/share-review-target.ts:1`, `migrations/0014_publication_shared_links.sql:109`.

### Client Portal issue

Working architecture:

- issues store immutable manifest/section payload hashes;
- D1/R2 payload references are supported by the issue builder;
- public manifest and section reads are lazy and use no-store/no-referrer/anti-framing headers;
- recipient credential version changes revoke recipient sessions;
- area branch and row discuss buttons already exist in the estimate browser.

Current publication query omits component and concurrency fields: `src/lib/client-portal/publish-service.ts:111`. Public row types contain only flattened display/calculation fields: `src/lib/publication/types.ts:67`, `src/lib/client-portal/estimate-browser.ts:6`.

Current issue creation has no row-revision/source fingerprint fence across its independent estimate/row/node/tab reads. The public-ID namespace is random per snapshot and enters section/content hashes, so a semantic no-op can produce a new hash.

### Recipient access blockers

1. `rotateCredential` creates a bootstrap token, stores only its hash, and returns the plaintext once: `src/lib/client-portal/recipient-service.ts:196`.
2. the manager action discards that returned token and claims delivery is queued: `src/components/workshop/publisher/ClientPortalRecipientManager.tsx:40`.
3. outbox rows use plain UUIDs while the queue accepts only `outbox_*`: `src/lib/client-portal/recipient-service.ts:159`, `src/lib/cloudflare/client-portal-notification-queue.ts:34`.
4. email content has no bootstrap URL/token: `src/lib/cloudflare/client-portal-notification-queue.ts:42`.
5. verification writes a cookie but does not atomically change `verification_state`: `src/lib/client-portal/public-session-handler.ts:38`.
6. personalized sessions bind recipient credential version but not portal `access_credential_version`; manifest/section routes apply password checks only to anonymous actors: `src/lib/client-portal/public-repository.ts:146`, `src/lib/client-portal/public-route-handlers.ts:62`.

### Discussion authorization blockers

- create validates target kind/nonempty ID but not issued-section membership;
- client-provided label/secondary label is persisted as authoritative metadata;
- list returns all client threads in the portal after only portal-level capability evaluation;
- message reads evaluate thread policy without reconstructing the issue section;
- concurrent create idempotency is not protected by a uniqueness key independent of random thread ID;
- stale historical threads are listed, but replies require the current issue;
- carry-forward copies obsolete public target IDs and marks them for later revalidation.

Evidence: `src/lib/client-portal/thread-repository.ts:178`, `src/lib/client-portal/thread-repository.ts:257`, `src/lib/client-portal/thread-repository.ts:289`.

### Decision, financial, and scale blockers

- decline can use reviewer authority instead of required-approver authority;
- receipts are inserted but required-approver policy is not aggregated into an atomic issue status transition;
- `data_scope_json` and comparison configuration can be ignored;
- unsupported category/supplier financial grouping can silently fall back to discipline;
- issue publication loads all rows/nodes/tabs, normal issue-builder calls keep payloads in D1 JSON, and client “pagination” slices an already-loaded array;
- branch construction repeatedly filters all rows per node;
- thread and decision writes do not consistently notify the correct owner/client audience.

## Corrections To Prior Claims

- Absence of a local `PRAGMA foreign_keys` statement is not evidence that D1 foreign keys are disabled. This pack makes no such claim.
- `source-changed` is not treated as a complete conflict model. Override preservation and latest-source metadata are specified explicitly.
- Dirty-worktree fingerprint helpers are not described as `HEAD` behavior.
- Shared Link presentation completion does not prove recipient delivery, target authorization, issued component identity, formal decision policy, or scale readiness.
