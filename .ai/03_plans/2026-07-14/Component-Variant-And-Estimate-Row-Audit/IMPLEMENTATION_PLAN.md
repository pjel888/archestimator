# Implemented Unit Map And Remaining Release Boundary

## Status

- planning state: `IMPLEMENTATION_RECONCILED`;
- current worktree: `IMPLEMENTED_IN_WORKTREE`;
- next component implementation unit: `NONE_IDENTIFIED_FROM_EXACT_REPRO`;
- plan-pack closeout: `IMPLEMENTATION_AND_MANIFEST_RECONCILED`;
- release: `NOT_EVALUATED`;
- browser/visual: `NOT_RUN`;
- hosted Cloudflare: `NOT_EVALUATED`.

This document no longer schedules an unstarted implementation. It records the implemented dependency graph, the authority for each transition, the evidence already present, and the boundaries that must remain explicit before any release claim.

## Implementation Rules Preserved

1. One full `AddComponentModal` owns advanced Library and Project component editing.
2. One complete ordered component/option graph is built per save.
3. Library and Project owners use separate authoritative actions; the UI does not perform a second fan-out write.
4. Component default, initiating row selection, and each target row selection are separate identities.
5. Component fields may fan out; option-derived fields fan out only by matching stable option ID.
6. Quantity, miscellaneous cost, row position, and other instance fields remain row-owned.
7. Authoritative D1 action results reconcile saved UI state; labels are not identity.
8. D1 metadata authorizes attachment ownership; R2 only stores the binary object.
9. Issued review receives opaque safe receipts, never private component IDs or broker paths.
10. Pre-release corrections replace superseded paths directly; they do not create product version forks or compatibility layers.

## Implemented Dependency Graph

```text
UNIT-001 Canonical modal, graph identity, and fan-out
  -> UNIT-004 Library/Project images and attachments
  -> UNIT-005 component lifecycle and request concurrency
  -> UNIT-006 template trust and bounded insertion

UNIT-002 atomic row mutations
  -> UNIT-003 authoritative row/tree reconciliation

UNIT-001 + UNIT-003 + UNIT-004 + UNIT-006
  -> UNIT-007 safe issued projection and financial scope
  -> UNIT-008 recipient access
  -> UNIT-009 issued-target discussions
  -> UNIT-010 formal decisions

UNIT-001..UNIT-010
  -> UNIT-011 implementation and pack reconciliation
```

The runtime graph now follows this dependency order even though the code was implemented across concurrent lanes.

## Unit Status

| Unit | Current status | Implemented outcome | Decisive evidence |
| --- | --- | --- | --- |
| `UNIT-001` | `FOCUSED_PROOF` | One Add/Edit modal, stable option graph, Library and Project owner actions, option-scoped fan-out | exact Project reopen test; modal suite; Library and D1 action tests |
| `UNIT-002` | `FOCUSED_PROOF` | Guarded atomic row graph, single-delete, and row-reorganization actions with revision-aware reconciliation | atomic D1 and reorder/history tests |
| `UNIT-003` | `IMPLEMENTED_SOURCE` | Authoritative row results, tree/query reconciliation, scoped row mutation coordination | route cache, mutation coordinator, and tree/query evidence present |
| `UNIT-004` | `FOCUSED_PROOF` | Relational Library/Project option attachment ownership, R2 lifecycle, and Project retention | migrations `0076`/`0079` and focused migration/lifecycle tests |
| `UNIT-005` | `FOCUSED_PROOF` | One editor path, lifecycle-aware management, and per-item request serialization | deleted reduced drawer; manager/concurrency tests |
| `UNIT-006` | `FOCUSED_PROOF` | Bounded trusted template browse/insert with explicit source localization | template trusted-insert and browse tests |
| `UNIT-007` | `FOCUSED_PROOF` | Opaque issued component/variant receipts, safe image projection, and row-backed financial sections | publication snapshot suite 10/10 plus Client Portal tests |
| `UNIT-008` | `FOCUSED_PROOF` | Recipient access, redemption, revocation, and public-route capability enforcement | access and recipient tests |
| `UNIT-009` | `FOCUSED_PROOF` | Authorized component and row discussion targets plus owner reply notifications | resolver, shell, discussion, and queue tests |
| `UNIT-010` | `FOCUSED_PROOF` | Decision authority, issue binding, receipts, and public handlers | decision service tests |
| `UNIT-011` | `FOCUSED_PROOF` | Before/after, architecture, PRD, schema, cleanup, traceability, manifest, and evidence boundary agree with current source | documents and validated `plan-pack.json` in this pack |

## `UNIT-001` — Canonical Component Graph

### Current authority

- UI graph builder: `src/components/workshop/component-library-manager/AddComponentModal.tsx`;
- Library action: `updateCostLibraryComponentWithPriceOptions` in `src/lib/component-library/actions.ts`;
- Project action: `updateEstimateRowItem` in `src/lib/estimates/actions.ts`;
- Project editor identity: `getProjectComponentEditorIdentity` in `src/components/workshop/EstimateSheetContent.tsx`;
- Library row planner: `buildLinkedEstimateRowSyncPlans` in `src/lib/component-library/actions.ts`;
- Project graph persistence/fan-out: guarded D1 action path in `src/lib/estimates/d1-action-client.ts`.

### Implemented result

- Add Variant appends a stable-ID option even when enabling variants for the first time.
- Saving a Project component includes the complete ordered `sourceSnapshot.priceOptions` graph.
- Reopening the stable Project component identity shows the persisted option.
- Selecting Option 2 on the initiating row does not make Option 2 the component default.
- Editing an option updates option-derived fields only for Library/Project instances selecting that option.
- Adding, defaulting, or reordering options does not reselect other instances.
- Component-level fields may fan out without changing target-row selection.
- In-use option deletion requires explicit replacement; unused option deletion remains direct.
- Detached Project rows stay on the Project path even if a historical Library source ID remains in their snapshot.
- `src/components/workshop/library/EditComponentDrawer.tsx` is removed; no reduced parallel mutation authority remains.

### Evidence

- `tests/vitest/estimate-sheet-library-insert.test.tsx` includes the exact add/save/reopen reproduction;
- `tests/vitest/library-add-component-modal-a11y.test.tsx` covers full modal payloads, Project attachments, and detached Project routing;
- `tests/vitest/estimate-actions-d1-reorder-history.test.ts` covers Project option-scoped fan-out, in-use removal, replacements, usage counts, and attachment graph;
- `tests/vitest/component-library-actions-revalidation.test.ts` covers Library authoritative updates and linked-row behavior.

## `UNIT-002` And `UNIT-003` — Estimate Row Authority

### Implemented result

- graph-changing Project edits pass expected row/component impact facts into the D1 action;
- D1 owns the all-or-nothing row/component graph write and history receipt;
- ordinary row patch and replacement require D1 batch support and guard the source revision before the final write/history/outbox;
- Project component fan-out also guards the complete source/sibling impact fingerprint computed from the authoritative rows;
- each affected row derives fields from its own selected option;
- row-local quantity and miscellaneous cost remain local;
- authoritative returned row revisions reconcile the client rather than label-matching an optimistic partial graph;
- variant selection is a row update, not row deletion/replacement;
- single-row delete qualifies the final `DELETE` by expected revision inside the attachment-retention/history batch;
- row reorganization guards every expected revision and repeats it in each final `UPDATE` predicate inside one history batch;
- scoped mutation coordination prevents unrelated row state from becoming the save authority.

### Evidence

- `tests/vitest/estimate-row-atomic-d1-contracts.test.ts`;
- `tests/vitest/estimate-actions-d1-reorder-history.test.ts`;
- `tests/vitest/estimate-row-mutation-coordinator.test.tsx`;
- `tests/vitest/estimate-route-cache-finalization.test.tsx`.

## `UNIT-004` — Images And Attachments

### Current authority

- binding/read route: `src/app/api/component-library/attachments/route.ts`;
- direct upload route: `src/app/api/component-library/attachments/direct-upload/route.ts`;
- metadata/action paths: Library action and Project D1 action;
- D1 ownership schema: `migrations/0076_component_attachment_ownership.sql`;
- Project retention schema: `migrations/0079_project_component_attachment_retention.sql`;
- binary storage: R2 binding `ARCH_UPLOADS_R2` from `wrangler.jsonc`.

### Implemented result

- every attachment has one immutable `upload_asset_id` and exactly one Library or Project owner tuple;
- the owner tuple includes the stable option identity;
- another workspace/project cannot bind the asset through a mismatched tuple;
- duplicate does not transfer or steal the original attachment ownership;
- Project graph writes persist attachment metadata and preserve restore retention semantics;
- removal/supersession has an explicit D1 lifecycle before object cleanup;
- public projection does not promote raw private broker paths.

### Evidence

- `tests/vitest/component-attachment-ownership-migration.test.ts`;
- `tests/vitest/component-library-attachment-lifecycle.test.ts`;
- `tests/vitest/project-component-attachment-retention.test.ts`;
- attachment cases in modal, D1, and promotion tests.

## `UNIT-005` — CRUD, Lifecycle, And Concurrency

### Implemented result

| Operation | Current behavior |
| --- | --- |
| Create | Builds a complete owner-specific graph with stable option IDs |
| Read/reopen | Hydrates authoritative Library detail or stable Project component group |
| Update | Uses one owner action; UI does not independently fan out |
| Duplicate | Allocates fresh component/option identities and omits attachment ownership transfer |
| Archive | Controls Library insertability while preserving existing estimate references |
| Delete Library source | Detaches dependent estimate/template references and preserves their saved values |
| Delete Project row | Deletes the instance; component-wide changes require explicit component action |
| Promote | Creates fresh Library ownership while preserving ordered graph and current selection |
| Detach / Make Project Specific | Clears Library link and creates/uses Project-local component identity |

Per-item mutation serialization and request identity live in the component manager path; stale hydration or move completion is not allowed to become the current editor state.

## `UNIT-006` — Template And Transfer Integrity

### Implemented result

- template browse loads bounded summaries and selected detail rather than trusting an unbounded stale graph;
- insert validates the referenced source and selected option;
- a valid Library source inserts linked with its selected option receipt;
- an unavailable source must localize from the saved snapshot or fail explicitly;
- row, component, and option identities are fresh where ownership changes;
- Make Project Specific copies the complete option graph, clears Library linkage, and omits Library attachment ownership;
- promotion preserves ordered options and selected option under new Library ownership.

### Evidence

- `src/lib/component-library/template-browse-actions.ts`;
- `src/components/workshop/estimate-sheet/use-estimate-template-insertion.ts`;
- `src/lib/estimates/source-snapshot-price-options.ts`;
- `src/lib/estimates/express-promotion-actions.ts`;
- trusted insert, template picker, source snapshot, and promotion tests.

## `UNIT-007` Through `UNIT-010` — Issued Review

### Implemented result

- publication snapshots carry opaque component and option anchors, row revision, and link state;
- public image projection rejects unsafe private broker paths;
- issued target resolution validates that a component or row belongs to the issued recipient-visible projection;
- Component and Row discussion actions are distinct in the estimate browser;
- server-side target labels and capabilities, not client-supplied ownership, authorize thread operations;
- owner replies notify active subscribers/mentions through the notification queue path;
- access, decision, activity, and financial-section services consume the same issued projection and capability rules.

### Evidence

- `tests/vitest/project-publication-snapshot.test.ts`: 10/10 passing after expectation reconciliation;
- `tests/vitest/client-portal-issued-target-resolver.test.ts`;
- `tests/vitest/client-portal-shell.test.tsx`;
- `tests/vitest/client-portal-publisher-discussion-service.test.ts`;
- focused Client Portal implementation slice: 20 passing tests.

## One Save Topology

```text
Add/Edit modal
  -> build complete ordered component + option + cost + image + attachment graph
  -> choose owner exactly once
       Library -> updateCostLibraryComponentWithPriceOptions
       Project -> updateEstimateRowItem -> guarded D1 graph action
  -> action validates owner, revisions, affected set, and option replacement
  -> action persists graph and owner-scoped fan-out atomically
  -> action returns/rereads authoritative state
  -> modal and Estimate Sheet reconcile that state
```

Any implementation that adds a second modal, a client-side fan-out pass, a label-based option identity, or a product-version fork violates this plan.

## Remaining Release Work

No additional component implementation unit is identified from the user's exact variant persistence reproduction. Remaining work is proof and lifecycle reconciliation, not a second implementation path:

1. browser/visual evaluation is `NOT_RUN`;
2. hosted D1/R2/Queue/Email evaluation is `NOT_EVALUATED`;
3. deployment and live-data mutation were not performed;
4. full release qualification remains `NOT_EVALUATED`;
5. `plan-pack.json` records local implementation completion while release remains unevaluated.

These boundaries must not be converted into compatibility code, rollout ceremony, or duplicate product versions.

## Stop Condition

Implementation reconciliation is complete when the exact repro, Library/Project distinction, Estimate row transfers, CRUD/lifecycle, option-scoped propagation, D1/R2 ownership, issued review, and one-authority cleanup all map to current source and actual evidence without overstating release proof.

That condition is satisfied by the pack and its manifest. Browser, hosted-provider, deployment, and full-release evaluation remain separate unevaluated boundaries rather than implementation blockers.
