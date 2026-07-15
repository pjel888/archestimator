# Estimate Sheet Data Integrity, Bug, And Readiness Audit

**Audit date:** 2026-07-15
**Scope:** current source and current shared worktree for the Estimate Sheet route
**Product tests/browser QA:** not run in this planning pass
**Hosted Cloudflare queries/mutations:** not run in this planning pass

## Executive Verdict

The Estimate Sheet has a broad implemented source surface, but it is not release-proven and the previous pack status overstated readiness. The plan validator passed a structurally valid manifest whose 23 criteria all pointed to one blanket evidence record, while that same pack described browser and hosted proof as not run. Subsequent user-reported defects and current source changes invalidate the old `COMPLETE` claim.

The highest current risks are:

1. row move and row restore can accept an invalid target because the database has no row-to-node foreign key and the D1 mutation does not revalidate the target inside the same atomic boundary;
2. permanent Library component deletion now follows the user's requested destructive contract, but it deletes dependent rows without corresponding Estimate history/audit events;
3. project image deletion can remove an R2 object without proving that no persisted row still references it, while component image deletion has a separate save-versus-delete race;
4. upload session, asset, and event metadata are written separately and can drift after partial failure;
5. row duplicate, row replace, component promotion, tab duplicate, Template create/insert/editor lifecycle, Project-source targeting, and folder topology have atomicity, concurrency, ordering, provenance, or idempotency gaps;
6. legacy shared-link and Client Portal publication do not share one authoring/privacy projection contract; and
7. active-variant rename, Enter-to-save, and the NOT NULL incident are source-fixed but runtime-unverified, while duplicate-row remains only partially complete.

Artifact `11-ISSUE-BY-ISSUE-ROOT-CAUSE-BLAST-RADIUS-AND-FIX-SIMULATIONS.md` is the detailed source correction and option-selection record for every finding below.

Current core classification: **7 P0 mission-critical, 15 P1 important/release-blocking, and 2 P2 non-mission-critical findings**. The absorbed Template audit adds ten lifecycle findings under `TPL-F-001` through `TPL-F-010`; its insertion idempotency and ambient-event risks are superseded by the stricter core `F-011` and `F-020` dispositions rather than double-counted.

## Product Decisions Fixed By This Pack

| Decision | Current rule |
| --- | --- |
| Stable pack path | Keep `Component-Variant-And-Estimate-Row-Audit/` during concurrent work; use the canonical title **Estimate Sheet MVP Feature Inventory, CRUD/Data/UI Audit, and Readiness**. |
| Permanent Library delete | The explicit permanent action removes the Library component and its dependent Estimate and Template row items after preview and typed confirmation. It does **not** silently detach them. The interactive path has a hard ceiling of `400` combined dependent rows; above that it refuses before mutation and offers Archive. |
| Delete evidence | A permanent delete must be atomic, workspace-scoped, impact-counted, auditable per affected estimate/template, attachment-safe, and cache-complete. Whether it is restorable must be explicit in the UI and history contract. |
| Variant ownership | Selected variant is row-owned state; editing the variant definition is a shared mutation keyed by component identity plus stable variant ID. |
| Source/link state | `linked-clean`, `linked-overridden`, and `source-changed` require a Library source ID; `unlinked` requires `NULL`; `detached` retains historical source ID as provenance but is excluded from live Library ownership and fan-out. |
| Copy failure policy | Template and reusable Project insertion is all-or-nothing per user intent. Any unavailable or invalid source rejects the whole intent before mutation. |
| Publication boundary | Estimate Sheet readiness owns authoring-to-issued projection parity. Recipient lifecycle, discussions, decisions, notifications, and full Client Portal UI remain auxiliary consumers. |
| Component Templates authority | This pack is the sole active authority for Template save/create, bounded browse, editor, category/header CRUD, composition, variant/source trust, and insertion. Artifact `12` preserves the absorbed 2026-07-15 audit and its complete crosswalk. |
| Evidence | Source presence, focused tests from older runs, local D1, browser behavior, Cloudflare preview, hosted D1/R2, and public-route behavior are separate evidence classes. |

## Current Mutation And Integrity Matrix

| Action | Existing guard/transaction shape | Current finding | Required repair/proof |
| --- | --- | --- | --- |
| Insert row | Correlation retry check precedes row + history + activation-outbox batch; new rows use revision `1`. | Strong source path, but every caller must provide an object snapshot. | Prove blank, Library, duplicate, template, and project-source inserts never pass `NULL` snapshot and are idempotent. |
| Update/detach row | Expected row revision, history, attachment reconciliation, and Project-component propagation can share a batch. | Source ID and `link_state` coupling is mostly application-enforced. | Validate allowed source/link combinations server-side and reconcile stale shared edits from authoritative rows. |
| Delete one/bulk row | Revision-qualified delete, attachment-retention statements, history, and outbox are batched. | Source appears strong; restore is the weak half. | Prove totals, last Project-component instance, bulk stale-row rejection, history, and restore window. |
| Restore row | Collision/idempotency checks exist. | `node_id` is not revalidated inside the restore boundary; no FK prevents a deleted/foreign target. | Validate target node belongs to the same estimate/active tab, or fail without inserting any row. |
| Duplicate row | Source row is scoped to project/estimate and optional revision is checked; insert uses normal history path. | Source read/revision check occurs before insert batch; concurrent edit can produce a stale duplicate. | Move source revision guard into the atomic D1 action; copy the complete persisted row contract with fresh row ID and new history event. |
| Replace row component | Target row revision is guarded. | Library source freshness is checked before the mutation boundary. | Bind source revision/fingerprint and target row revision in one commit or reject and refresh. |
| Move row | Expected source revision is available and order/history code exists. | Target node existence, same-estimate ownership, and tab consistency are not authoritatively checked in the same mutation; actor attribution is incomplete. | Validate target node and active tab in-batch, include actor, update source/target order atomically, and reject partial-tree stale targets. |
| Create/edit component | Component, options, costs, attachments, version snapshot, linked-row guards, and propagation use atomic D1 batches. | Strongest component path; runtime proof is stale/incomplete. | Re-run owner/variant fan-out and save/reopen evidence against the current source revision. |
| Permanent delete component | Preview hash and workspace authorization exist; current worktree deletes dependent Estimate rows, Template rows, attachment asset metadata state, then Library item in one batch. | This matches the user's destructive rule but bypasses Estimate row history and the previous detach implementation caused `source_snapshot_json` NOT NULL failure. | Add per-estimate/template audit receipts or an explicit irreversible-delete event contract; prove exact counts, stale preview, all cache invalidations, attachment cleanup, and no partial delete. |
| Promote component | Correlation retry, batched D1 writes, and `UNIQUE (workspace_id, source_estimate_row_item_id)` already exist. | Source-row update is not revision-qualified; a concurrent loser reports false failure and copied-object cleanup is best-effort. | Guard expected row revision, recover the canonical winner on uniqueness conflict, emit the normal outbox, and reconcile copied objects. |
| Tab duplicate | Copies nodes and rows to a new tab. | A child encountered before its parent can lose parentage; source reads can mix revisions; mutation replay is not stopped; copied rows retain source revisions/timestamps. | Two-pass identity/remap, source fingerprint, pre-mutation retry receipt, and revision-1 copied rows. |
| Tree/node CRUD | Most actions emit history and use optimistic rollback. | Parent/tab relationships are application-enforced; some reorder/archive no-ops can record history. | Validate parent/tab inside D1 action, reject cycles/no-ops, and prove route fallback/restore. |
| Template save/create | Source graph is reread under workspace/estimate permission and nodes/rows are batched after creating the header. | Header is committed separately and cleanup is a compensating delete, so interruption can leave a shell. | Put header, nodes, and rows in one hard D1 batch; remove compensating delete; prove no orphan shell. |
| Template editor/header/category CRUD | Workspace-gated server actions exist for header/category, node, row, and composition mutations. | D1 lacks complete recursive cycle/order constraints, row reorder wiring is unclear, library audit policy is unstated, and composition failure atomicity needs proof. | Keep app guards authoritative, wire/remove unreachable actions, define library audit/cache policy, and collect topology/atomicity receipts in `UNIT-009`. |
| Template/project-source insert | Structure and rows can be copied in a D1 batch. | Reusing the same correlation can insert a second subtree; caller-provided tab is not proven consistent with target parent; Project-source UI and server target rules contradict each other. | Use a stable per-intent receipt, derive target tab from the parent, and make one selected-node target contract authoritative. |
| Upload metadata | Session, asset, and event records exist. | Ordinary and direct-upload finalization perform multiple independent D1 writes. | Batch session finalization, asset creation, and event write; reconcile finalized sessions without valid assets. |
| Persisted image delete | R2 deletion endpoints and component reference checks exist. | Project deletion lacks complete reference/asset checks; component delete performs a separate reference read and removal claim that can race a save. | Atomically claim removal only at zero references, delay and recheck purge, and record terminal per-object cleanup. |
| Library folder create/reorder | Nested drag/drop is enabled and client code rejects obvious cycles. | Sidebar creates only roots, server applies parent IDs without authoritative cycle/stale checks, and top insertion shifts siblings before the folder write. | Add child creation and make create/reorder one authoritative atomic graph mutation. |
| History/outbox | Generic history helper and activation/activity outboxes exist. | Duplicate-event suppression does not automatically suppress mutation statements; correctness is caller-specific. Revision-fact writer coverage is unclear. | Define the mandatory event, correlation, actor, old/new snapshot, total delta, and outbox coverage for every destructive/shared action. |

## Ranked Findings

| Finding | Severity | Status | Evidence and consequence | Required disposition |
| --- | --- | --- | --- | --- |
| `F-001` Invalid row move target | `P0` | `OPEN` | `moveEstimateRowItemWithHistory` can update `node_id` without an in-batch proof that the node belongs to the same estimate/tab; schema has no FK. | Repair in `UNIT-002`; add same-estimate/tab guard and atomic order/history proof. |
| `F-002` Invalid row restore target | `P0` | `OPEN` | Restore can reinsert a row whose original node is gone or belongs outside the current restore scope. | Repair in `UNIT-002`; validate target or require an explicit recovery destination. |
| `F-003` Persisted image object deletion | `P0` | `OPEN` | Project image delete can remove referenced R2 objects; component delete has a separate reference-check/save race and non-terminal cleanup state. | Repair in `UNIT-006`; D1-safe removal claim, delayed reference-rechecked purge, and terminal cleanup state. |
| `F-004` Split upload metadata transaction | `P0` | `OPEN` | Session, asset, and event writes can partially succeed. | Repair in `UNIT-006`; one D1 batch plus reconciliation query. |
| `F-005` Destructive component delete lacks Estimate history | `P0` | `OPEN` | Current worktree deletes dependent rows as requested, but no row-delete history events are emitted for affected estimates/templates and an unbounded interactive batch can exceed D1 safety margins. | Repair in `UNIT-004`; exact-set audit/idempotency plus an atomic ceiling of `400` combined dependent rows, refusing larger interactive deletes before mutation and offering Archive. |
| `F-006` Legacy and Client Portal publication drift | `P0` | `OPEN` | Legacy omits newer authoring fields; Client Portal public rows and derived supplier/category labels do not apply one explicit display/privacy contract; legacy lacks the Portal's bounded source-fingerprint fence and its replacement has non-atomic edges. | Repair in `UNIT-007`; one private projector, bounded fingerprint read/reread, deterministic semantic identity/hash, channel-safe serializers, derived-field privacy, and atomic pointer replacement. |
| `F-007` Stale plan evidence | `P0` | `PARTIALLY_REMEDIATED` | Old blanket PASS is removed, but current records still lack executable source/diff fingerprints and method/actual-signal freshness. | Repair in `UNIT-001`/`UNIT-008`; proof-class receipts and validator-checkable source drift. |
| `F-008` Duplicate row race | `P1` | `OPEN` | New source checks revision before the insertion transaction, so a concurrent edit can create a stale duplicate. | Repair in `UNIT-002`; in-batch source revision guard and full-field receipt. |
| `F-009` Component promotion stale-row race | `P1` | `OPEN_REFRAMED` | Existing uniqueness prevents duplicate Library rows, but stale source-row overwrite, false loser failure, outbox omission, and copied-object cleanup remain. | Repair in `UNIT-004`; expected revision plus uniqueness-winner recovery and durable cleanup. |
| `F-010` Tab duplicate topology/retry drift | `P1` | `OPEN` | Child-before-parent ordering can lose linkage; mixed source reads, replay, and copied revision/timestamp semantics are also unsafe. | Repair in `UNIT-003`; two-pass remap, source fingerprint, true idempotency, and revision-1 copies. |
| `F-011` Template insertion idempotency/tab mismatch | `P1` | `OPEN` | Correlation retry can duplicate subtree; target tab can disagree with target parent. | Repair in `UNIT-005` under the integrated Template authority. |
| `F-012` Replace source freshness race | `P1` | `OPEN` | Library source may change after preflight and before row replacement commit. | Repair in `UNIT-002`/`UNIT-004`; bind source fingerprint to commit. |
| `F-013` Active variant rename loading scope | `P1` | `SOURCE_FIX_PRESENT_UNVERIFIED` | Stable option-ID mutation, revision-guarded fan-out, and component+option pending scope are present in current dirty source. | Preserve the implementation and collect current-route proof; do not broaden loading. |
| `F-014` Enter navigates instead of saves | `P1` | `SOURCE_FIX_PRESENT_UNVERIFIED` | Shared input key handling now prevents/halts Enter and commits through blur. | Verify every input class, Escape, duplicate-submit, and explicit multiline behavior. |
| `F-015` Permanent delete NOT NULL incident | `P1` | `SOURCE_FIX_PRESENT_UNVERIFIED` | Current destructive path deletes dependent rows and no longer writes `source_snapshot_json=NULL`; `F-005` remains open. | Keep the non-null invariant and complete destructive audit/idempotency. |
| `F-016` Duplicate row action | `P1` | `PARTIAL_FIX_PRESENT` | Icon and persisted-source path exist, but generic-insert magic fields, pre-batch source read, omitted pricing provenance, and pre-render double activation remain. | Replace with the dedicated atomic duplicate contract from `F-008` plus a synchronous click latch. |
| `F-017` Project/Template target contract mismatch | `P1` | `OPEN_REFRAMED` | UI/tree permit any selected node while Project-source D1 requires `group`; copy and retry intent are also ambiguous. | Repair in `UNIT-005`; one any-selected-node resolver, parent-derived tab, exact copy, and per-intent IDs. |
| `F-018` Favorite operation durability | `P2` | `OPEN_REFRAMED` | Favorites are account/workspace-backed, but whole-document delayed writes silently fail and lose cross-device intent. | Non-blocking `UNIT-004` tail: idempotent set/unset that changes only `favorite_item_ids_json` in the existing preference row; no new table. |
| `F-019` Folder nesting integrity | `P1` | `OPEN_REFRAMED` | Nesting is enabled, but child creation is absent and server create/reorder can persist stale/cyclic/partial topology. | Repair in `UNIT-004`; child creation plus atomic authoritative cycle-safe graph mutation. |
| `F-020` Ambient cross-surface command routing | `P1` | `PARTIALLY_REMEDIATED` | Types/readers exist, but events are unscoped, unacknowledged, and lack intent identity; one fallback literal has no listener. | Repair in `UNIT-003`/`UNIT-005`; versioned target-scoped acknowledged envelope plus authoritative server target/idempotency guards. |
| `F-021` Legacy reduced component form remains | `P2` | `CONFIRMED_DEAD_CODE` | Full modal is authoritative; reduced form is compiled but no runtime path can open it, and its save is local-only. | Delete the form and dead state/refs/helpers in `UNIT-004`. |
| `F-022` Source/link-state coupling | `P1` | `OPEN` | Database checks do not fully enforce valid `source_library_item_id` and `link_state` combinations, and readers disagree on detached provenance. | Enforce the fixed matrix in every writer/reader: linked states require ID, unlinked requires `NULL`, detached retains historical ID but leaves live Library ownership/fan-out; migrate only after data audit. |
| `F-023` Active row revision-zero drift | `P1` | `OPEN` | Migration permits `0`, and reusable-source/AI package producers still explicitly insert `0` while readers/actions disagree. | Repair in `UNIT-002`; fix producers, backfill, and rebuild default/check to `>=1`. |
| `F-024` Hosted Cloudflare behavior unknown | `P1` | `NOT_EVALUATED` | Bindings exist, but no local/preview/hosted integrity query or R2 object proof was collected here. | Execute the evidence ladder in `UNIT-006` only under the repository's test/provider rules. |

## Absorbed Component Template Findings

Artifact `12-COMPONENT-TEMPLATES-ABSORPTION-AND-LIFECYCLE-CONTRACT.md` is the complete retained architecture, flow, variant, requirement, unit, and evidence record. The integrated dispositions are:

| Finding | Current status | Canonical disposition |
| --- | --- | --- |
| `TPL-F-001` Create header/batch atomicity | `P2 OPEN` | `UNIT-009`: one hard header+node+row batch, no compensating delete. |
| `TPL-F-002` Missing insert pending feedback | `P2 OPEN` | `UNIT-005`: lightweight target-scoped pending affordance; no full optimistic subtree clone. |
| `TPL-F-003` Cross-panel global events | `SUPERSEDED_BY_F-020` | `UNIT-003`/`UNIT-005`: versioned target-scoped acknowledged envelope plus server guards. |
| `TPL-F-004` Contingency drift | `P3 OPEN` | `UNIT-009`: one explicit Template save/insert field invariant. |
| `TPL-F-005` D1 cycle/order constraints | `P3 ACCEPTED_WITH_EVIDENCE` | Keep current app guards for alpha; add integrity proof and only add a forward constraint when real data/concurrency requires it. |
| `TPL-F-006` Template CRUD history policy | `P3 DECISION_REQUIRED` | `UNIT-009`: distinguish Template-library audit from Estimate insertion history; document and implement the chosen bounded receipt. |
| `TPL-F-007` No zod schemas | `P3 ACCEPTED` | No new dependency/unit without a demonstrated validation defect. |
| `TPL-F-008` Synthetic seed fallback | `P3 OPEN_POLICY` | `UNIT-009`: prove active migration availability, then remove or make synthetic/demo state explicit. |
| `TPL-F-009` Dead pricing provenance | `P3 OPEN_EXPANDED` | `UNIT-002`/`UNIT-009`: one Estimate/Template/Project/publication field contract; no isolated cosmetic read deletion. |
| `TPL-F-010` Insert replay dedupe | `SUPERSEDED_BY_F-011` | `UNIT-005`: committed receipt before ID allocation/copy planning. |

## D1 Integrity Queries To Capture

These are planned evidence, not commands run by this audit. Execute against local D1 first, then preview/hosted only when the unit's authority and fixture cleanup are explicit.

| Query intent | Required result |
| --- | --- |
| Invalid row snapshots | `0` rows where `source_snapshot_json IS NULL`, JSON is invalid, or JSON root is not an object. |
| Orphan row nodes | `0` row items whose `node_id` is missing or whose node belongs to another estimate. |
| Invalid node parents/tabs | `0` nodes whose parent or tab belongs to another estimate; no parent cycles. |
| Orphan Template shells | `0` Template headers without the expected root graph after save; failed save fixture leaves no header, node, or row. |
| Invalid Template topology | `0` missing/cross-template parents, self/recursive cycles, invalid group/area placement, rows under invalid nodes, or unreconciled sibling order. |
| Template row source/variant fields | Object-shaped snapshots where required; exact selected-option receipt; no invalid source/link pair; contingency and pricing-provenance values satisfy the accepted cross-system contract. |
| Row revision floor | `0` active row items with `row_revision < 1`. |
| Invalid source/link state | `0` rows with disallowed Library source ID and link-state combinations. |
| Promotion uniqueness and stale rows | Existing unique source-row ownership holds; promotion source rows match the accepted revision; no loser-owned copied objects remain. |
| Library folder topology | `0` parent cycles, missing parents, cross-workspace parents, or duplicate/stale sibling placements after authoritative reconciliation. |
| Event coverage | Every destructive/shared fixture mutation has actor, correlation, target, old/new or delete snapshot, and expected total delta. |
| Restore target | Restore fixtures either return to a valid same-estimate node or fail atomically with a recoverable message. |
| Upload metadata | `0` finalized sessions without a valid asset; `0` active assets without required storage metadata; `0` removed assets still advertised as active. |
| Attachment ownership | Exclusive Library-or-Project attachment owner checks pass; no active attachment points at a removed asset. |
| Publication parity | Legacy and Client Portal source readers populate the agreed row/component/variant fields for the same fixture. |

## Cloudflare Evidence Ladder

| Level | Environment | What it proves | Current status |
| --- | --- | --- | --- |
| `E0` | Source/manifest | Action and binding exist. | `COLLECTED` |
| `E1` | Static diff/type contract | Current change is internally coherent and scoped. | `NOT_EVALUATED` for this refreshed pack |
| `E2` | Local Miniflare D1 | Schema, constraints, atomic actions, history, and fixtures behave locally. | `NOT_EVALUATED` |
| `E3` | Running local browser + local D1 | User action, feedback, reload, and persisted result agree. | `NOT_EVALUATED` |
| `E4` | Cloudflare preview D1/R2 | Provider bindings and preview resources behave under Worker runtime. | `NOT_EVALUATED` |
| `E5` | Bound hosted D1/R2 read or scoped fixture | Hosted migration parity, integrity counts, object lifecycle, and cleanup are proven. | `NOT_EVALUATED` |
| `E6` | Public share/client route | Issued projection, access, discussion/decision targets, and totals are client-safe. | `NOT_EVALUATED` |

No level can substitute for a later level. A local PASS is not hosted proof; a hosted schema query is not browser proof; and a plan validator PASS is only document-contract proof.

## Authoring-To-Issued Contract

The Estimate Sheet pack owns these downstream invariants:

1. active tab and tree membership determine which rows are eligible for issue;
2. non-included rows and rows outside active tabs are omitted deliberately, never accidentally orphaned;
3. one private authoring projection carries material, description, supplier/category, unit/cost inputs, selected variant receipt, component/link receipt, row revision, and computed minor-unit totals, while each public channel emits only approved and consumed fields;
4. internal Library/Project IDs and private upload paths are replaced by issue-local opaque anchors;
5. legacy shared-link and Client Portal issue builders produce equivalent row/tree meaning for the same authoring revision, and derived labels cannot bypass supplier/category visibility policy; and
6. later authoring changes do not mutate an immutable Client Portal issue, but they must make stale/reissue state clear.

The pack does not absorb recipient invitations, password/session UI, discussion CRUD, decision lifecycle, notification delivery, or financial presentation implementation.

## Verification Boundary

This is an artifact-only planning audit. It used current source, migrations, bindings, current dirty diff, and user-reported runtime incidents. It did not run automated product tests, browser automation, screenshots, hosted D1 queries, R2 object operations, deployment, or public-route verification. Those remain explicit execution-unit evidence rather than implied completion.
