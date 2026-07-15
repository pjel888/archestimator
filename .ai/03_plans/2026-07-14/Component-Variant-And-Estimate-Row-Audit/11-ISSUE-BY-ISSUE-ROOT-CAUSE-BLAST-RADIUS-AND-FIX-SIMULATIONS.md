# Estimate Sheet Issue-By-Issue Root Cause, Blast Radius, And Fix Simulations

**Audit date:** 2026-07-15  
**Evidence posture:** current source, migrations, dirty worktree, GitNexus/code-review graphs, and user-reported incidents  
**Product tests/browser/provider operations:** not run  
**Authority:** this artifact corrects finding premises and selects the smallest coherent repair; artifact `10` remains the ranked register and `IMPLEMENTATION_PLAN.md` remains the execution order.

## Executive Result

The deep audit keeps all 24 finding IDs for traceability, but it corrects five stale premises and reframes three partial fixes. The current distribution is:

- **7 P0 findings:** six open product/data/publication risks and one partially remediated evidence-governance risk.
- **15 P1 findings:** nine open/reframed correctness risks, one partially remediated routing risk, one unevaluated provider risk, three source-verified fixes awaiting runtime proof, and one partial implementation.
- **2 P2 findings:** account-preference durability and confirmed dead editor code.

The plan remains `IMPLEMENTATION_READY`, implementation remains `NOT_STARTED` for the remediation DAG, and release remains `NOT_READY`. Source presence is not runtime proof.

## Corrections To The Previous Register

| Finding | Previous premise | Current-source correction |
| --- | --- | --- |
| `F-003` | Component/project image deletion was broadly unsafe. | Project image deletion is directly unsafe; component image deletion has reference checks but still contains a save-versus-delete race and non-atomic D1/R2 lifecycle. |
| `F-009` | Promotion lacked uniqueness and could create duplicate Library rows. | Migration `0026` already enforces one Library item per source row. The real defects are stale-row overwrite, false failure for the concurrent loser, missing normal outbox coverage, and copied-object cleanup. |
| `F-017` | Mainly inconsistent disabled copy. | Project-source insertion is functionally contradictory: UI/tree allow any selected node while the server requires `group`; retries also cannot distinguish a retry from an intentional second copy. |
| `F-018` | Favorites were only device-local. | Favorites already persist per account/workspace. The remaining defect is best-effort whole-document overwrite, silent save failure, and cross-device last-writer-wins loss. |
| `F-019` | Right-sidebar nesting was disabled. | Nesting drag/drop is enabled. The real gap is root-only creation plus server-side cycle/stale-placement and non-atomic sibling-shift risk. |
| `F-020` | The cross-surface event bridge was untyped. | Payload types and runtime readers exist. Remaining gaps are ambient routing, missing target estimate/tab identity, no acknowledgement, no intent ID, and one unhandled fallback event literal. |
| `F-021` | The reduced component form might be active. | It is compiled but source-proven unreachable; if reactivated it would create local-only transient components. Delete it rather than maintaining it. |
| `F-023` | Revision `0` was mainly a schema-default drift. | Active reusable-source and AI package producers explicitly insert revision `0`, so first-edit conflicts can occur now. |

## Selected Resolution Matrix

| Finding | Current disposition | Selected minimal resolution | Owner |
| --- | --- | --- | --- |
| `F-001` | `P0 OPEN` | In-batch source/target node, estimate, tab, row-set, revision, actor, and retry-receipt guards. | `UNIT-002` |
| `F-002` | `P0 OPEN` | Validate every original restore node in the restore batch; fail atomically and offer a separate explicit recovery destination only when needed. | `UNIT-002` |
| `F-003` | `P0 OPEN` | D1-safe removal claim, delayed reference-rechecked purge, terminal purge state, and retryable per-object cleanup. | `UNIT-006` |
| `F-004` | `P0 OPEN` | Unify upload lifecycle and batch each D1 state transition with its asset/event; add repair queries and session-to-asset uniqueness. | `UNIT-006` |
| `F-005` | `P0 OPEN` | Exact row/revision preview, atomic delete up to the explicit 400-dependent interactive ceiling, per-estimate/template events, mass-deletion receipt, idempotent retry, and durable cleanup metadata. | `UNIT-004` |
| `F-006` | `P0 OPEN` | One private authoring projector, deterministic semantic identity, bounded source-fingerprint consistency fence, channel-safe serializers, derived-field privacy, and atomic pointer replacement. | `UNIT-007` |
| `F-007` | `P0 PARTIALLY_REMEDIATED` | Proof-class evidence receipts plus executable source/diff fingerprints; keep every product criterion `FAIL` until real proof exists. | `UNIT-001`, `UNIT-008` |
| `F-008` | `P1 OPEN` | Dedicated atomic duplicate operation with source revision, target/order, history, and receipt in one D1 boundary. | `UNIT-002` |
| `F-009` | `P1 OPEN_REFRAMED` | Keep existing uniqueness; add expected row revision, unique-conflict winner recovery, standard outbox, and reconcilable copied-object cleanup. | `UNIT-004` |
| `F-010` | `P1 OPEN` | Two-pass node identity/remap, source fingerprint, true retry receipt, and copied rows reset to revision `1`/copy timestamps. | `UNIT-003` |
| `F-011` | `P1 OPEN` | Stable client intent ID, pre-mutation receipt lookup, and target tab derived exclusively from the target parent. | `UNIT-005` |
| `F-012` | `P1 OPEN` | Guard target row revision plus Library item/option/current-cost fingerprint in the same replacement batch. | `UNIT-002` |
| `F-013` | `P1 SOURCE_FIX_PRESENT_UNVERIFIED` | Preserve current stable-option-ID mutation and component+variant pending scope; add no broader loading state. | `UNIT-001`, `UNIT-004` |
| `F-014` | `P1 SOURCE_FIX_PRESENT_UNVERIFIED` | Preserve shared Enter prevent/stop/blur behavior; verify every input class and clarify multiline behavior. | `UNIT-001`, `UNIT-002` |
| `F-015` | `P1 SOURCE_FIX_PRESENT_UNVERIFIED` | Keep destructive row deletion; complete `F-005`; never relax or null the snapshot invariant. | `UNIT-001`, `UNIT-004` |
| `F-016` | `P1 PARTIAL_FIX_PRESENT` | Replace the magic generic-insert branch with the `F-008` duplicate operation, a complete persisted-field contract, and a synchronous click latch. | `UNIT-002` |
| `F-017` | `P1 OPEN_REFRAMED` | Adopt the current any-selected-node product contract, derive target tab server-side, use exact copy, and use per-intent IDs. | `UNIT-005` |
| `F-018` | `P2 OPEN_REFRAMED` | Add idempotent favorite set/unset against the existing account preference row, with pending/error/retry; do not add a new favorites table. | `UNIT-004` non-blocking tail |
| `F-019` | `P1 OPEN_REFRAMED` | Add child-folder creation and make create/reorder authoritative, cycle-safe, stale-safe, and atomic. | `UNIT-004` |
| `F-020` | `P1 PARTIALLY_REMEDIATED` | Keep browser events but centralize a versioned, target-scoped, acknowledged command envelope with an intent ID; server validation/idempotency remain mandatory. | `UNIT-003`, `UNIT-005` |
| `F-021` | `P2 CONFIRMED_DEAD_CODE` | Delete the reduced form, dead state/refs/helpers, and local-only save path. | `UNIT-004` |
| `F-022` | `P1 OPEN` | Enforce linked-ID, unlinked-NULL, and detached-historical-provenance semantics in all writers/readers; audit data before adding a CHECK. | `UNIT-002` |
| `F-023` | `P1 OPEN` | Fix every producer, backfill active rows, and rebuild the table with default/check `>=1`; never clamp only in readers. | `UNIT-002` |
| `F-024` | `P1 NOT_EVALUATED` | Revision-anchored read-only hosted receipt plus one scoped current-revision lifecycle fixture after preview proof. | `UNIT-006`, `UNIT-008` |

## P0 Mission-Critical Findings

### `F-001` — Invalid Row Move Target

- **Root cause:** `moveEstimateRowItemWithHistory` accepts client topology, while `moveRowItem` validates row revision but writes the supplied `node_id` without proving same estimate/tab or current target existence. `activeTabId` and `sourceNodeId` are not authoritative guards, and history currently records no actor.
- **Direct blast radius:** moved rows, source/destination ordering, totals, estimate history/outbox, active-tab caches, and selected route.
- **Transitive blast radius:** later component fan-out, restore, publication hierarchy, exports, and any integrity query assuming rows belong to valid nodes.
- **Failure simulation:** the client validates target A; another client deletes or moves A; the batch then commits every row to an orphan or foreign-tab UUID. A lost response can retry and surface a revision conflict despite the first commit succeeding.
- **Options:** client recheck; composite FK plus guards; or D1-owned semantic move planning. **Selected:** a D1-owned guard/plan in the existing mutation boundary. FK-only cannot enforce active tab, source placement, allowed row set, or retry semantics.
- **Success simulation:** the guard statement proves source rows/revisions, source and target nodes, same estimate/tab, and actor before order updates. A stale target changes nothing; a repeated intent returns the stored receipt.
- **Data/migration:** no migration is required for the minimal repair. First run orphan/cross-tab integrity queries and quarantine any existing corruption before treating publication as safe.
- **Decisive evidence:** invalid target produces zero row/order/event changes; valid move produces one actor-attributed event and authoritative read-back.

### `F-002` — Invalid Row Restore Target

- **Root cause:** restore validates the delete event and row IDs but reinserts snapshot `node_id` values without verifying that every node still belongs to the same estimate and allowed tab.
- **Direct blast radius:** restored rows, component attachment holds, history/outbox, project-component projections, totals, and active tree caches.
- **Transitive blast radius:** invisible rows, later duplicate/move/delete behavior, issued hierarchy, and recovery trust.
- **Failure simulation:** delete rows, then delete their Area or archive/move its tab. Restore reports success, but the active tree cannot show the rows.
- **Options:** validate original destinations; require a new destination for every restore; or add FK constraints. **Selected:** preserve original placement only when all distinct nodes validate in the same batch, otherwise fail with an explicit recovery action.
- **Success simulation:** valid original nodes restore atomically; one invalid node rejects the whole set and writes no event. A user may deliberately choose a new recovery destination in a separate, clearly recorded action.
- **Data/migration:** no immediate migration. Never silently choose the first Area because that changes estimate meaning and falsifies history.
- **Decisive evidence:** orphan-destination fixture fails with unchanged counts; valid fixture restores once and same-correlation retry returns the same receipt.

### `F-003` — Persisted Image Object Deletion

- **Root cause:** project image DELETE performs ownership/path checks then deletes R2 without complete persisted-reference or upload-asset state checks. Component image DELETE checks references, but the check and removal claim are separate D1 operations, allowing a save to race between them.
- **Direct blast radius:** component/variant images, estimate snapshot descriptors, upload asset state, R2 full/thumbnail keys, modal discard/replacement cleanup.
- **Transitive blast radius:** missing authoring images, dead history/version metadata, operations cleanup, and future issue/public asset projection.
- **Failure simulation:** delete sees no reference; a concurrent save persists the finalized asset path; delete marks it removed and deletes both objects. The component now points to a 404. Partial `Promise.all` failure can delete one key while D1 already says removed.
- **Options:** atomic D1 removal claim and delayed cleanup; normalized reference table; immutable copied historical objects. **Selected:** removal claim plus delayed cleanup-time reference recheck and terminal purge state. A reference table remains a later option only if source scans become unbounded.
- **Success simulation:** save first causes removal claim to fail; removal first changes asset state so save fails safely. Cleanup records each object result, retries missing work, and marks `purged` only after accepted zero-reference proof.
- **Data/migration:** add terminal purge metadata/status and audit existing removed assets. D1 and R2 cannot be one transaction, so durable reconciliation is mandatory.
- **Decisive evidence:** referenced delete returns conflict without metadata/object change; unreferenced removal survives repeated cleanup with zero advertised references and terminal state.

### `F-004` — Split Upload Metadata Transaction

- **Root cause:** ordinary and direct uploads independently mutate session, asset, and event rows. Direct finalization can leave a session `finalized` without an asset; later retries detect the poison state but cannot repair it.
- **Direct blast radius:** component attachments/images, estimate-row images, project images, upload events, cleanup, and operational dashboards.
- **Transitive blast radius:** components/rows can reference objects whose metadata is incomplete or whose route compensation deleted R2 after a later D1 failure.
- **Failure simulation:** R2 write succeeds; session and asset insert succeed; event insert fails; route deletes R2 while D1 advertises a valid finalized asset. In direct upload, a crash after session finalization leaves every retry permanently failing.
- **Options:** batch current transitions; unify ordinary/direct lifecycle; add only a reconciler. **Selected:** unified lifecycle with each D1 transition/event batched, plus reconciliation for pre-existing drift.
- **Success simulation:** session finalization, one asset, and event commit atomically; concurrent loser reads the winner; missing event/session/asset states are repaired from deterministic object identity.
- **Data/migration:** add unique non-null session-to-asset relation where applicable and compatible FKs; preflight finalized-without-asset, asset-without-session, missing-event, and missing-object counts.
- **Decisive evidence:** injected D1 statement failure leaves no partial finalized state; retry returns one asset/event; repair query returns zero unresolved poison states.

### `F-005` — Destructive Component Delete Lacks Complete History

- **Root cause:** permanent delete previews aggregate counts, then directly deletes dependent estimate/template rows. The preview hash omits exact row identities/revisions, correlation is not an idempotent receipt, and standard estimate history/outbox is bypassed.
- **Direct blast radius:** every linked estimate row, template row, component, attachments/upload assets, estimate totals, history, cache, and stale-publication detection.
- **Transitive blast radius:** other open estimate tabs, manager-originated deletion, activity views, immutable issue freshness, cleanup jobs, and incident recovery.
- **Failure simulation:** preview sees two rows; a third appears or one changes before execution; count-only validation can still delete an unpreviewed revision. A lost response commits deletion but retry reports the component missing. An unbounded interactive delete can exceed the D1 1000-statement/payload safety margin.
- **Options:** exact set plus mass-deletion receipt; orchestrate standard bulk-delete per estimate; or archive-only. **Selected:** exact IDs/revisions, bounded atomic deletion, one event/outbox per affected owner, and existing `mass_deletion_events` receipt.
- **Success simulation:** stale exact-set preview rejects before mutation; a component with at most **400 combined dependent Estimate and Template rows** deletes once; same intent returns stored counts; post-commit R2 cleanup remains retryable.
- **Data/migration:** existing mass-deletion/event/outbox tables appear sufficient. Update affected estimates/templates freshness markers in the same batch. `MAX_PERMANENT_DELETE_DEPENDENTS = 400` is the explicit interactive product ceiling, chosen below D1's 1000-statement limit to reserve audit/outbox/cleanup headroom. Above it, the confirmation must state that interactive permanent delete is unsupported and offer Archive; any larger destructive operation is a separately authorized maintenance task, not an automatic chunked retry.
- **Decisive evidence:** exact before/after row/template counts, actor/correlation snapshots, cache invalidation across affected owners, attachment state, and repeat-request receipt.

### `F-006` — Legacy And Client Portal Publication Drift

- **Root cause:** legacy publication reads an older authoring row shape, while Client Portal reads richer component/variant/link fields. Public serializers also differ: Client Portal drops some display fields, exposes unused internal receipts, and supplier grouping can leak controlled supplier values through a generic label. Current Client Portal already uses a bounded source-fingerprint reread and deterministic ID namespace, but legacy does not share that fence and a source can still change after the Portal's final check but before issue batch commit. Legacy replacement/rotation also has non-atomic fallback edges.
- **Direct blast radius:** legacy snapshots/tokens, Client Portal issues/sections/paged rows, component discussion anchors, privacy filtering, totals, and migration of legacy publications.
- **Transitive blast radius:** public share pages, discussion target resolution, reissue/stale state, historical migration fidelity, recipient-visible grouping, and active publication pointer safety.
- **Failure simulation:** identical authoring data produces different row meaning; migrated legacy issue cannot reconstruct component anchors; a hidden supplier becomes a visible group label; sequential legacy replacement can revoke the old publication before the new one succeeds. A change after the final fingerprint check can make a new immutable issue stale immediately even though its internal payload is coherent.
- **Options:** patch only legacy mapper; one private authoring projector plus consistency/hash and channel-safe serializers; or route legacy through Client Portal. **Selected:** shared private projector and consistency fence with separate public contracts. Full channel unification changes tokens/recipient/history behavior unnecessarily.
- **Success simulation:** both readers project one accepted private shape after a bounded fingerprint-read/reread loop; semantic hash excludes random token/delivery/issue IDs and stable opaque IDs derive from accepted semantic identity; each public serializer emits only approved/consumed fields; supplier/category derivation honors section policy; pointer changes only after complete persistence.
- **Data/migration:** current row columns suffice. Bump projection schema/payload hash; preserve immutable historical issues and old legacy snapshots until explicit republish. Never backfill old issues from current authoring.
- **Decisive evidence:** repeated unchanged-source builds produce the same semantic fingerprint/hash and opaque anchors; a mid-read change retries or returns source-changed; field-level same-fixture comparison, privacy-origin audit, totals equality, immutable issue identity, and replacement failure preserve the prior pointer.

### `F-007` — Stale Plan Evidence

- **Root cause:** the previous blanket PASS was removed, but current evidence records still contain artifact hashes and descriptive source revision rather than executable source/diff fingerprints, method, expected/actual signal, environment, and freshness.
- **Direct blast radius:** all criteria, unit readiness handoff, release status, archive decisions, and every future agent relying on the pack.
- **Transitive blast radius:** a source-only change can invalidate findings while plan validation still passes because planning artifact hashes remain unchanged.
- **Failure simulation:** product source changes but artifacts do not. `valid_until: null` never expires, stale-trigger strings are prose, and validator PASS falsely appears current.
- **Options:** proof-class receipts; validator source-fingerprint enforcement; or keep manual prose. **Selected:** receipts now and executable validator support as system hardening, without treating one record per claim as mandatory.
- **Success simulation:** a receipt may cover several claims only when one method/actual signal proves all of them; source or scoped diff drift makes the receipt stale and reopens only affected criteria/units.
- **Data/migration:** planning schema/validator only; no product migration. `valid_until: null` is allowed only for immutable-source proof.
- **Decisive evidence:** validator detects a changed source fingerprint, while unchanged scoped source plus current artifact hash validates. Product criteria remain `FAIL` until their own runtime/data/provider receipts exist.

## P1 Release-Blocking Findings

### `F-008` — Duplicate Row Race

- **Root cause:** source row/revision and target maximum order are read before the generic insert batch. A concurrent edit/delete can produce a stale duplicate, and concurrent inserts can choose the same order.
- **Blast radius:** copied component/variant snapshot, source/link state, provenance, sibling order, history, totals, caches, and publication.
- **Simulation:** source changes after read; duplicate still inserts the old snapshot. Two clients calculate the same sort maximum. Same mutation retry is currently mostly safe, but source freshness is not.
- **Options:** dedicated duplicate action; optional guards on generic insert; or another preflight read. **Selected:** dedicated action because duplicate has a distinct persisted-field and history contract.
- **Success:** one D1 boundary verifies source revision/target, assigns authoritative order, inserts a fresh revision-1 row, emits `row_duplicated`, and returns one receipt on retry.
- **Residual risk/evidence:** no migration required. Verify complete field parity, especially `pricing_provenance_origin`, selected option, link state, and snapshots.

### `F-009` — Promotion Stale-Row Race And Concurrent Loser Failure

- **Root cause:** uniqueness already exists, but promotion reads a row then updates it without an expected revision. Copied objects are prepared before D1; unique-conflict loser surfaces failure and cleanup is best-effort.
- **Blast radius:** source estimate row, Library item/options/version, copied R2 objects, attachments, estimate event/outbox, caches, and user trust.
- **Simulation:** A and B promote simultaneously. A wins; B rolls back on uniqueness but reports error and may leak copied objects. A concurrent edit can be overwritten by stale promotion data.
- **Options:** expected revision plus winner recovery; claim table; queue/DO serialization. **Selected:** expected revision and unique-conflict reconciliation using the existing constraint.
- **Success:** stale row rejects before link update; uniqueness loser rereads and returns the canonical winner as idempotent success; copied-object cleanup is durably queued/recorded; normal history outbox is emitted once.
- **Residual risk/evidence:** D1 and object copy remain cross-system; prove no orphaned copied objects after winner/loser and failed-D1 simulations.

### `F-010` — Tab Duplicate Topology, Snapshot, And Retry

- **Root cause:** node IDs are allocated while rows are iterated by `sort_order`; a child before its parent gets a null parent. Source tabs/nodes/rows are separately read, generic history dedupe does not stop mutation replay, and copied rows retain source revisions/timestamps.
- **Blast radius:** complete tab tree, row placement/order, history, active selection, totals, and future publication.
- **Simulation:** irregular sort turns a child into a root; source changes between reads produce a mixed copy; same correlation can create another tab with only one history event.
- **Options:** two-pass map; topological sort; SQL copy workflow. **Selected:** preallocate all identities, validate complete source fingerprint, then build inserts from the full map.
- **Success:** retry lookup runs before ID generation; one source fingerprint is accepted; copied rows use revision `1` and copy timestamps; deep irregular tree reload matches source topology with fresh IDs.
- **Residual risk/evidence:** no migration. Audit existing duplicate tabs for missing parents; automatic repair may be impossible without provenance.

### `F-011` — Template Insertion Idempotency And Tab Mismatch

- **Root cause:** server actions generate new correlations per call; even a repeated correlation suppresses only the event, not copy statements. Caller `targetTabId` can disagree with the authoritative parent tab.
- **Blast radius:** copied estimate nodes/rows, hierarchy, history/outbox, totals, cache refresh, and publication roots.
- **Simulation:** lost success response or rapid double drop creates two subtrees. Same correlation can create unhistoried duplicates. Parent in tab A plus caller tab B creates children loaded as roots in B.
- **Options:** stable intent ID and existing event receipt; new receipt table; schema parent/tab constraints. **Selected:** client intent ID plus pre-mutation event/receipt return and parent-derived tab.
- **Success:** repeated intent returns the existing inserted-root receipt before generating IDs; a conflicting tab hint is rejected or removed from the contract; intentional second copy uses a new intent ID.
- **Residual risk/evidence:** no initial migration. Run a read-only query for existing cross-tab parentage and duplicate insert fingerprints.

### `F-012` — Replace Source Freshness Race

- **Root cause:** Library lifecycle/version is preflighted before the target-row mutation. The commit guards target revision but not the chosen Library item, option, current cost, or lifecycle fingerprint.
- **Blast radius:** row snapshot, selected variant, link state, price/cost fields, revision/history, caches, totals, and issue input.
- **Simulation:** source option is edited/archived/deleted after preflight; stale data commits as `linked-clean`.
- **Options:** source fingerprint in batch; construct payload inside D1; parent timestamp only. **Selected:** explicit item/option/current-cost/lifecycle fingerprint plus target revision in the same batch.
- **Success:** changed source rejects with a refreshable conflict and changes no row/event; accepted source fingerprint is written into history and returned for cache reconciliation.
- **Residual risk/evidence:** no migration. Parent `updated_at` alone is too indirect for a durable selected-option contract.

### `F-013` — Active Variant Rename Loading Scope

- **Root cause/status:** the reported defect is source-fixed. Current code mutates the stable option ID, narrows impact/pending rows to component identity plus selected option ID, revision-guards fan-out, and keeps linked-Library labels read-only.
- **Blast radius:** same Project-component instances using one option, history/outbox, active query cache, and later publications.
- **Simulation:** a concurrent affected-row edit changes the impact fingerprint and rejects the shared rename; unrelated component/options never enter pending state.
- **Options:** retain current implementation; return exact server row IDs; or mark whole component pending. **Selected:** retain current path; exact server row IDs are optional refinement, not a correctness requirement.
- **Success:** only mounted instances matching component+stable-option show skeletons and receive the shared label update; other variants stay interactive and unchanged.
- **Residual risk/evidence:** static source proof only. Runtime proof remains required when authorized; no schema change.

### `F-014` — Enter Must Save, Not Navigate

- **Root cause/status:** current dirty source centralizes Enter as prevent-default, stop-propagation, and blur; blur remains the existing commit boundary. Combobox Enter stays internal.
- **Blast radius:** every inline text/numeric/tab/Area/component/variant input, row mutation queue, revision/history, focus, and duplicate-submit behavior.
- **Simulation:** rapid Enter then edit is serialized by row queue; server failure rolls back/refetches. Remaining product decision: express description Enter now commits rather than inserting a newline.
- **Options:** keep shared helper; explicit commit-and-blur callbacks; form submission. **Selected:** keep the helper and define multiline fields explicitly.
- **Success:** Enter commits exactly once and does not select another row/newline; Escape restores authoritative value; blur after Enter does not double-submit.
- **Residual risk/evidence:** source fix is present but runtime input-class matrix was not authorized.

### `F-015` — Permanent Delete NOT NULL Incident

- **Root cause/status:** the prior detach branch wrote `source_snapshot_json = NULL` against migration `0073`. Current code deletes dependent rows instead and no longer reaches that assignment.
- **Blast radius:** same destructive component lifecycle as `F-005`.
- **Simulation:** the original constraint failure is source-closed; D1 failure now rolls back deletion. Lost-response, stale-preview, history, and cleanup risks remain under `F-005`.
- **Options:** complete destructive delete; detach with non-null snapshot; relax schema. **Selected:** destructive delete, matching explicit product copy and user intent.
- **Success:** no action writes null; permanent delete either commits all exact dependants/audit or changes nothing.
- **Residual risk/evidence:** no migration. Runtime proof remains absent; never weaken the object snapshot invariant.

### `F-016` — Duplicate Row Action Is Partial

- **Root cause/status:** the icon and persisted-source path exist, but duplication is encoded through magic fields on generic insert, source freshness is pre-batch, and `pricing_provenance_origin` is not copied.
- **Blast radius:** every copied row-owned field, selected variant/link/provenance, order, revision/history, cache, totals, and publication.
- **Simulation:** visible values look correct while provenance silently changes; rapid distinct clicks create multiple rows by design before pending UI rerenders.
- **Options:** dedicated duplicate; strengthen generic magic branch; debounce only. **Selected:** the dedicated `F-008` operation plus a synchronous click latch for accidental pre-render double activation.
- **Success:** one intentional click creates one fresh row with complete persisted contract and `row_duplicated` receipt; deliberate second click after completion creates another row with a new intent ID.
- **Residual risk/evidence:** no migration. Runtime interaction and complete-field read-back remain required.

### `F-017` — Right-Sidebar Target Contract Contradiction

- **Root cause:** sheet/tree code declares any selected node valid, while Project-source D1 copy requires `kind='group'`; sidebar copy still uses Area-oriented text. Deterministic source/target correlation also makes an intentional second copy look like a retry forever.
- **Blast radius:** Project and Template insertion, tree drops, selected-node feedback, target tab refresh, copied rows/nodes, and history.
- **Simulation:** select an Area, click Project source, UI enables and says adding, server rejects because it is not a Group, then error tells the user to select an Area.
- **Options:** honor any-node contract; restore operation-specific restrictions; or build a shared target resolver. **Selected:** any existing selected node, matching current product direction, with server-derived tab and one shared resolver.
- **Success:** sidebar, tree, and server name/accept the same target; invalid/missing target rejects before mutation; retries reuse one intent while deliberate copies use new intents.
- **Residual risk/evidence:** no migration. Historical Area/Group semantics remain elsewhere and should not be globally erased by this fix.

### `F-019` — Folder Nesting Integrity And Creation Mismatch

- **Root cause:** nesting drops are enabled, but sidebar creation hard-codes root. Client reorder validates a local graph while the server blindly applies parent IDs; concurrent moves can create cycles. Top-position creation shifts siblings through separate writes before insert.
- **Blast radius:** Library folder graph/order, component placement, sidebar and manager caches, concurrent tabs, and folder navigation.
- **Simulation:** clients concurrently move X under Y and Y under X; each local proposal is valid, persisted result is a cycle. Folder insert failure can leave siblings reordered without the new folder.
- **Options:** extend shared tree and authoritative actions; replace sidebar tree with manager; or retain drag-only nesting. **Selected:** child-folder create plus atomic server-side semantic reorder/cycle validation.
- **Success:** server reads/guards the current graph, rejects cycles/missing/stale placements, shifts siblings and inserts in one batch, and returns the authoritative tree.
- **Residual risk/evidence:** schema already supports nesting. Audit for existing cycles; bound traversal depth and define recovery for corrupt graphs.

### `F-020` — Ambient Cross-Surface Command Routing

- **Root cause/status:** payloads are typed and runtime-validated, but global events omit target estimate/tab, intent ID, acknowledgement, and completion. One fallback literal has no listener; `dispatchEvent` can imply success when nobody handled it.
- **Blast radius:** Template/Project/component drops, center owner binding, retries, pending feedback, duplicate listeners, and wrong-estimate mutation attempts. Server authorization remains the security boundary.
- **Simulation:** during tab transition, a listener binds a node-only event to whichever estimate/tab is mounted; no listener silently consumes the drop; duplicate listeners can start two mutations.
- **Options:** versioned acknowledged event envelope; React context/store port; TypeScript map only. **Selected:** keep the pragmatic event bridge and centralize an accepted command envelope.
- **Success:** envelope contains schema version, target estimate/tab/node, intent ID, and acceptance callback; exactly one listener claims it; producer shows rejected/unhandled state; authoritative server target validation and mutation idempotency prevent misrouting from committing.
- **Residual risk/evidence:** no migration. Because current routing can select the wrong owner or duplicate a core insertion, this is P1 until target-scoped acknowledgement and server-side guards are proven.

### `F-022` — Source ID And Link-State Coupling

- **Root cause:** schema validates enum values but not valid pairs; writers assign fields independently and readers disagree on whether a linked state without an ID is linked.
- **Blast radius:** every row insert/update/replace/duplicate/detach, component fan-out, ownership classifier, cache keys, publication anchors, and history.
- **Simulation:** `NULL + linked-clean` appears linked in one reader and Project-owned in another; `source ID + unlinked` preserves provenance but is excluded from synchronization.
- **Options:** writer invariant; table CHECK after audit; normalized ownership model. **Selected:** one state matrix in every D1 writer first, then a forward CHECK only after real data is reconciled.
- **Success:** `linked-clean`, `linked-overridden`, and `source-changed` require a source ID; `unlinked` requires `NULL`; `detached` **retains the historical source ID for provenance** but is excluded from live fan-out and Library ownership. Every reader/writer/publication mapper applies that matrix.
- **Residual risk/evidence:** count every invalid pair before migration and record both fields atomically in history. Do not hide corruption through read-time coercion.

### `F-023` — Active Revision-Zero Rows

- **Root cause:** migrations default/check `>=0`, generic insert now uses `1`, but reusable-source and AI package paths explicitly insert `0`; some readers clamp to `1` while D1 guards compare persisted `0`.
- **Blast radius:** first edit/delete/move, row queues, component fan-out, cache reconciliation, reusable source insertion, AI package application, and issued row revision.
- **Simulation:** row persists at `0`; UI reads/clamps `1`; first edit sends expected `1`; D1 sees `0` and conflicts forever after refresh.
- **Options:** producer fixes plus backfill and schema rebuild; producer/backfill only; or reader clamp. **Selected:** producer fixes, preflight/backfill, and default/check `>=1`, optionally sharing the controlled table rebuild with `F-022`.
- **Success:** every active producer writes `1`; no active row is below `1`; first mutation accepts revision `1` and returns `2`; no reader needs a semantic clamp.
- **Residual risk/evidence:** refresh row caches across migration. Use a migration receipt rather than per-row activity events for mechanical backfill.

### `F-024` — Hosted Cloudflare Behavior Is Unknown

- **Root cause:** `wrangler.jsonc` proves configured bindings, not current deployment, migration parity, runtime flags, or repaired lifecycle behavior. Latest located hosted proof predates current upload/config changes and exercises only a happy-path attachment.
- **Blast radius:** bound Worker, `ARCH_DB`, `ARCH_UPLOADS_R2`, upload cleanup crons, queues/DLQ, and every claim promoted from source/local to hosted.
- **Simulation:** cron fires in dry-run while removed objects accumulate; deployed Worker can run against lagging migrations; current D1/R2 fault behavior differs from old proof.
- **Options:** revision-anchored read-only receipt; preview plus tiny hosted lifecycle fixture; logs only. **Selected:** read-only identity/parity first, preview fault proof, then one scoped hosted fixture with zero residue.
- **Success:** receipt names deployment/source SHA, binding identities, migration checksums, and live/dry-run flags; fixture proves upload, persistence, guarded removal, cleanup, and exact cleanup.
- **Residual risk/evidence:** a synthetic proof samples one run. Ongoing reconciliation metrics remain necessary; config, public 200, or secret-name readback are never substituted for lifecycle proof.

## P2 Non-Mission-Critical Findings

### `F-018` — Favorite Persistence Loses Intent Silently

- **Root cause:** favorites are account-backed but saved as part of one delayed preference document. `{ok:false}` is not thrown, unmount can cancel the timer, and two devices overwrite each other's entire document.
- **Blast radius:** favorite set, recents, tree order, active tab/view mode, local-storage hydration, and cross-device consistency. No estimate history/publication impact.
- **Simulation:** device A favorites X and device B favorites Y; last whole-document writer erases the other operation. UI already records the local serialized state, so failed save has no retry feedback.
- **Options:** new normalized favorites table; aggregate document CAS/merge; idempotent set/unset against the existing preference row; or device-local only. **Selected:** a narrow set/unset action that atomically changes only `favorite_item_ids_json` in the existing account/workspace row, preserves recents/tree/view fields, and returns authoritative state.
- **Success:** concurrent operations on different items merge, repeated set/unset is idempotent, failures remain pending/retryable, and account hydration remains authoritative.
- **Residual risk/evidence:** no new table is needed. Qualify local cache by workspace and add visible non-blocking failure/retry. This P2 tail does not block `UNIT-004`'s destructive/component core gate.

### `F-021` — Unreachable Reduced Component Editor

- **Root cause/status:** `showNewComponent` starts false and has no external true setter; real create/edit opens `AddComponentModal`. The hidden save path only mutates local arrays and can insert transient `custom-*` rows.
- **Blast radius:** code maintenance, accidental future reactivation, local/data-URL images, variant/attachment capability drift, and transient estimate inserts.
- **Simulation:** if rewired, UI announces save without D1 component/version/history; refetch removes it while “Save & Add” may already have inserted the transient row.
- **Options:** delete; wrap authoritative modal; retain hidden fallback. **Selected:** delete the form and all dead state/refs/helpers.
- **Success:** every create/edit path reaches the version/variant/attachment-aware authoritative modal; no `custom-*` transient component path remains.
- **Residual risk/evidence:** no migration. Run a focused source reachability/import sweep during implementation; no product test is needed merely to prove deleted dead code.

## Cross-Cutting Order And Stop Rules

1. **Freeze truth first:** capture scoped source/diff fingerprints, integrity query definitions, dirty-fix receipts, and provider revision identity.
2. **Repair row invariants before features:** fix revision-zero producers/backfill and source/link matrix, then move/restore/duplicate/replace.
3. **Repair topology and intent identity:** tab duplicate, folder graph, Template/Project target resolution, Template create/editor lifecycle (`UNIT-009`), and event acknowledgement.
4. **Repair destructive and object lifecycles:** component delete history/idempotency, Template lifecycle storage rules from `12-COMPONENT-TEMPLATES-ABSORPTION-AND-LIFECYCLE-CONTRACT.md`, promotion, upload transactions, image purge, and reconciliation.
5. **Repair issued projection:** shared private authoring projector, channel-safe serializers, privacy, totals, and atomic publication pointers.
6. **Verify without substitution:** static, local D1, browser, preview, hosted, and public evidence remain separate. Missing authorized proof keeps the associated criterion `FAIL`.

No implementation unit may close an issue by adding a second editor, a compatibility layer, client-only validation, another preflight read, post-commit audit logging, or an unbounded partial-success loop. If an atomic destructive/copy operation exceeds a safe bounded statement/event ceiling, it must fail before mutation and surface the non-destructive alternative.
