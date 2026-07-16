# Component Templates Absorption And Lifecycle Contract

**Absorption date:** 2026-07-15  
**Absorbed source:** `.ai/03_plans/2026-07-15/Component-Templates/`  
**Canonical owner after absorption:** this Estimate Sheet plan pack  
**Product implementation status:** `COMPLETE`; owning units `UNIT-005`, `UNIT-009`, `UNIT-010`, `UNIT-011`, and `UNIT-008` are `VERIFIED`
**Verification class:** source, migration, graph, focused tests, exact browser journey, performance receipts, and terminal manifest reconciliation; no deployment was run

## Terminal Implementation Reconciliation — 2026-07-16

The absorbed Template contracts are implemented and verified: lifecycle writes are atomic and replay-safe, summary browse is bounded, selected detail hydrates on demand, saved provenance/contingency semantics are canonical, insertion retains intent and validates arbitrary selected targets, unavailable schema/source states are explicit, and cache convergence is target-scoped. `TEST-004`, `TEST-006`, and `TEST-007` pass. Historical `CONFIRMED_OPEN` rows below remain the absorption baseline and no longer represent current implementation status.

## Authority And Disposition

This artifact preserves the complete useful content of the absorbed Component Templates audit while translating it into the current plan-pack schema and the wider Estimate Sheet identity, mutation, and evidence contracts.

The absorbed pack was complete as an **audit deliverable**: its eight requested research requirements, architecture map, end-to-end flows, ten findings, four proposed units, variant analysis, and eight source-evidence claims were present. At absorption time it did **not** prove that its proposed product fixes were implemented. Its legacy manifest reported `IMPLEMENTATION_READY / NOT_STARTED` and failed the current schema. The terminal integrated pack now supplies that implementation proof. Therefore:

1. its source-verified content is retained here;
2. its historical implementation claims are promoted only through the integrated pack's fresh terminal evidence;
3. conflicts are resolved in favor of the newer integrated Estimate Sheet contracts;
4. the separate source folder may be removed only after this artifact, the action inventory, implementation DAG, traceability, and manifest validate together; and
5. this pack becomes the sole active planning authority for Template create, browse, editor, lifecycle, and insertion interoperability.

## Current Source Recheck

The high-value claims from the absorbed pack were spot-checked against the current shared worktree before integration:

| Claim | Current source signal | Result |
| --- | --- | --- |
| Save-from-estimate has an atomicity seam | `createEstimateTemplateFromEstimateNode` still calls `insertTemplate` before a node/row `runBatch`, then performs a compensating `DELETE` on failure. | `CONFIRMED_OPEN` |
| Sidebar browse is bounded | `loadCurrentWorkspaceEstimateTemplateSummaries` clamps to `ESTIMATE_TEMPLATE_SUMMARY_PAGE_LIMIT` and reads aggregate counts/totals; graph detail remains separately loadable. | `CONFIRMED` |
| Insert preserves selected variant identity | `copyTemplateNodes` reads saved `priceOptionId`, resolves that option, rebuilds active options, and uses the current cost entry. | `CONFIRMED` |
| Unavailable variants require explicit fallback | Missing/inactive/mismatched source or selected option returns `requires_saved_snapshot_confirmation`; accepted fallback inserts unlinked saved data. | `CONFIRMED` |
| Template insert is atomic but not truly retry-idempotent | Rows/nodes/history use `runMutationWithHistory`, but row/node IDs are allocated per call and correlation alone does not return a committed mutation receipt before copy planning. | `CONFIRMED_OPEN` |
| Template editor CRUD exists | Node create/rename/delete/move, row add/update/delete/reorder, allowance creation, and template-into-template composition exports remain present. | `CONFIRMED` |
| Hard-coded fallback templates remain | `getTemplateTableFallbackTemplates` can still return the three seed templates when explicitly told the table is missing. | `CONFIRMED_OPEN_IMPLEMENTATION`; policy is fixed below. |
| `pricing_provenance_origin` remains incomplete | Template save, insert, and composition builders still do not consistently write the field. | `CONFIRMED_OPEN` |

This recheck also corrects one stale statement in historical artifact `03`: the current sidebar path is not accurately described as loading every template graph. The canonical current model is bounded summary browse plus selected graph hydration. Artifacts `01` through `08` remain dated baseline material and cannot override this artifact.

## Canonical Template Model

Templates are detached, workspace-owned blueprints. They are cloned by value in both directions:

```text
Estimate node/subtree
  -> save by value
estimate_templates
  -> estimate_template_nodes
  -> estimate_template_row_items
  -> edit independently
  -> insert by value with fresh estimate identities
Estimate nodes/rows
```

The invariant is deliberate:

- saving a template never creates a live reference back to estimate nodes or rows;
- editing, renaming, duplicating, moving, or deleting a template never mutates previously inserted Estimate rows;
- inserting a template always creates fresh destination node and row identities;
- component references inside a template are soft source receipts plus saved snapshots, not ownership of the Library component;
- current Library component and selected-variant state is re-resolved at insert; and
- if current source trust fails, the user explicitly chooses saved snapshot as unlinked or cancels.

### Active D1 storage

| Table | Responsibility | Required invariants |
| --- | --- | --- |
| `estimate_templates` | Workspace-scoped header, name, category, description, order, and provenance metadata. | Non-empty name/category, valid object metadata, workspace ownership, bounded quota, no orphan shell after failed save. |
| `estimate_template_nodes` | Detached group/area tree. | Same-template parent, no self-parent, valid hierarchy, deterministic sibling order, no cycle. |
| `estimate_template_row_items` | Detached row/component blueprint. | Same-template node, non-negative costs/quantity, valid link state, object snapshot when present, selected-variant receipt, explicit contingency/provenance policy. |

Active migrations are `migrations/0024_estimate_templates.sql`, `migrations/0072_estimate_intelligence_inputs.sql`, and `migrations/0075_remove_component_confidence.sql`. Legacy `supabase/migrations/*` is provider-exit evidence only and must not be changed.

The historical Postgres schema had stronger ordering and recursive hierarchy guards than the current D1 schema. Current app actions reject obvious invalid rewires, but D1 itself does not prevent every concurrent multi-node cycle or duplicate sibling order. That residual risk stays accepted for alpha unless concurrent authoring, import, or direct-write surfaces make it real; integrity queries remain required before any forward constraint.

## Authorization And Boundaries

| Operation | Required server authority |
| --- | --- |
| Browse/list/detail | Current workspace scope; cross-workspace IDs must not disclose data. |
| Save estimate node/tab as template | Library-manage permission, edit permission on the source estimate, workspace match, persisted source node/tab, and `LIBRARY_TEMPLATE_CAP = 2_000`. |
| Create/rename/duplicate/delete/category lifecycle | Workspace editor/library-manage authority and workspace-owned template. |
| Template editor mutations | `requireTemplateEditorAccess` plus workspace-owned template/node/row validation. |
| Insert into estimate | Edit access on the target estimate, authoritative target-node ownership/tab derivation, source workspace/lifecycle validation, bounded atomic statement count, and stable user-intent identity. |
| Reusable Project source insert | Edit target, access source, same workspace, non-archived source tab, authoritative target scope, and stable intent receipt. |

No client-supplied subtree, workspace, tab, source trust, or pricing payload is authoritative. Clients carry identifiers and intent; the server rereads the source graph and validates the destination.

## Complete Lifecycle And Action Surface

### Create and save

1. Left Estimate Tree context action dispatches the selected persisted node.
2. The right sidebar opens `NewTemplateModal` in node, tab, or scratch mode.
3. The client submits IDs plus template name/category/description, never the source subtree payload.
4. The server re-reads the estimate, source tree, and rows under workspace and estimate authorization.
5. Nodes and rows are remapped into template-owned UUIDs.
6. Template header, nodes, and rows must commit in one hard D1 batch.
7. The current separate header insert plus compensating delete is an open atomicity defect owned by `UNIT-009`.
8. Attachments are not copied by the save path; this remains explicit rather than implied ownership transfer.

### Browse and drag source

- The right sidebar exposes Library, Project, and Templates source families.
- Custom Template summaries are bounded; a selected template graph hydrates on demand.
- Search can match template/category metadata and hydrated nested content without turning summary browse into an unbounded graph read.
- Native drag payloads carry IDs only:
  - whole template: `{ templateId }`;
  - template subtree: `{ templateId, templateNodeId }`;
  - category: `{ templateIds }`;
  - reusable Project source: typed project/estimate/tab/node IDs under its separate MIME type.
- Drag visibility can use the shared workshop drag store, but mutation authority remains the target action.

### Template editor

The canonical route is `/workshop/library/templates/[templateId]`. It supports:

- template header lifecycle outside the editor: rename, duplicate, delete, category move, and category rename;
- node create, rename, move, subtree delete, and structural drag/reorder;
- row add from Library, allowance creation, field edit, and remove;
- template-into-template composition by value with fresh IDs and self-insert rejection; and
- optimistic local editing followed by authoritative server action and route refresh/rollback.

The editor must not imply a Project-source insertion capability it does not support. Its Project source placeholder remains truthful until a dedicated, target-valid composition contract exists. `reorderEstimateTemplateRowItems` has no current route caller and is removed as unreachable capability; Template-row reorder is not advertised until a real UI intent and authoritative ordering contract exist. No second editor path is added.

### Insert into an estimate

1. A branch section, its trailing template drop zone, or the Estimate Tree inside-drop route accepts the typed template payload.
2. The client resolves one authoritative destination node and one stable user-intent ID.
3. The server derives estimate/tab/workspace from the destination node; caller hints cannot contradict it.
4. Before destination ID allocation, the server returns an existing committed receipt for a replay, then loads all selected template headers/nodes/rows and validates the complete source set.
5. Component and selected-variant receipts are re-resolved against current Library state.
6. Any unavailable source first returns one bounded confirmation result; accepted saved-snapshot fallback becomes explicitly unlinked.
7. All destination IDs are fresh and all roots/children preserve deterministic topology/order.
8. The server computes the exact statement count from the validated graph, including every guard, order shift, node, row, destination-project publication-revision bump, history, outbox, and committed-receipt statement. A count above `D1_MAX_BATCH_STATEMENTS = 1000` returns `selection_too_large` before ID allocation or mutation; the intent is never chunked.
9. One atomic D1 batch of at most `1000` statements writes the complete intent.
10. A replay of the same intent returns the prior committed receipt before generating IDs or statements; a deliberate second copy uses a new intent ID.
11. The client reconciles the authoritative inserted roots. While waiting, it shows a lightweight target-scoped pending affordance rather than cloning the full subtree optimistically.

Category insertion is one all-or-nothing intent. It must not become an unbounded serial partial-success loop.

### Reusable Project sources

Reusable Project sources share the sidebar and destination contract but remain a distinct copier. Their source kinds are Project, estimate, tab, and node, with only valid tab/node units becoming insert targets. The existing path already has stronger deterministic correlation and committed-event lookup than Template insertion. The integrated plan standardizes the **intent semantics**, target resolver, all-or-nothing policy, and receipt shape without merging the two copiers merely for symmetry.

## Variant And Row-Field Contract

### Save

- Save copies the estimate row's `source_snapshot_json` into the Template row without silently choosing another variant.
- The snapshot carries selected `priceOptionId`, label, and the available option graph when present.
- A stale or legacy source snapshot stays a saved fact; save does not pretend it revalidated live Library state.

### Insert

- The selected option comes from the saved `priceOptionId`, never from label matching.
- If that exact active option still belongs to the current component, insert preserves its ID and uses the current cost entry.
- The rebuilt option list is bounded to 50 entries.
- Missing component, unavailable lifecycle, missing selected identity, deleted/inactive option, or cross-item mismatch cannot silently select the default.
- Accepted saved-snapshot fallback writes `source_library_item_id = NULL`, `link_state = 'unlinked'`, and an explicit saved-template source receipt.
- Rows without a Library source remain unlinked allowance/project-specific rows.

### Integrated field decisions

1. Template save and insert use one explicit contingency invariant. The current save-zeroes/insert-copies asymmetry is removed; legacy contingency cannot silently reappear.
2. `pricing_provenance_origin` uses the existing constrained vocabulary across Estimate duplicate/restore, Template save/insert/composition, Project-source insert, health readers, and issued projection: `recorded` for a direct explicit resolution, `inherited_snapshot` for a detached copy of explicit upstream provenance, `synthesized_fallback` for compatibility-only synthesis, and `missing` for absent/legacy provenance. Pure duplicate/restore preserves the persisted marker. The field stays private and no authoritative read is removed in isolation.
3. `source_snapshot_json` remains object-shaped on destination Estimate rows and is never written as `NULL`.
4. Selected variant remains row-owned after insertion; later shared definition edits use component plus stable option ID.

### Template availability and activity

- Production Template reads never substitute `estimateTemplates` seed data when D1 Template tables are absent. Missing schema returns an explicit unavailable/migration state; seeds remain named development fixtures only.
- Every committed Template header/category/editor intent writes exactly one bounded same-batch operational receipt to existing `component_library_telemetry_events` with actor, workspace, template/resource identity, action, intent/correlation, and non-sensitive result metadata.
- This receipt is operational telemetry for Template lifecycle reconciliation, not Estimate history and not a compliance audit log.

## Retained Strengths

The absorbed audit identified eight strengths that remain part of the accepted design:

1. detached clone-on-save and clone-on-insert ownership;
2. workspace isolation on every read/write;
3. atomic destination insert plus history/outbox;
4. one batch for category insertion;
5. explicit unavailable-source confirmation;
6. live selected-variant price re-resolution;
7. layered save/insert/editor permissions and quota; and
8. a pre-mutation D1 statement ceiling for oversized insertion.

These are contracts to preserve, not evidence that the wider feature is release-proven.

## Absorbed Finding Crosswalk

| Absorbed ID | Severity in source pack | Integrated assessment | Canonical owner/disposition |
| --- | --- | --- | --- |
| `TPL-F-001` Create header/batch atomicity | `P2 OPEN` | Confirmed. A failed node/row batch plus failed/interrupted compensating delete can leave a shell. | `REQ-009`, `DATA-001`, `UNIT-009`, `AC-015`; one hard graph+activity batch within the inclusive `1000`-statement ceiling, no compensating delete. |
| `TPL-F-002` No immediate insert feedback | `P2 OPEN` | Confirmed UX gap; full optimistic subtree cloning remains rejected. | `REQ-007`, `UX-001`, `UNIT-005`, `AC-007`, `AC-012`; lightweight target-scoped pending affordance. |
| `TPL-F-003` Implicit global events | `P3` | Superseded by broader `F-020 P1`: unscoped/unacknowledged commands can misroute or duplicate insertion. | `UNIT-003`, `UNIT-005`; versioned acknowledged envelope plus server guards. |
| `TPL-F-004` Contingency semantic drift | `P3 OPEN` | Confirmed latent field-contract drift. | `REQ-009`, `DATA-001`, `UNIT-009`, `AC-015`; one explicit zero/fold or removal invariant. |
| `TPL-F-005` D1 cycle/order constraints | `P3 ACCEPTED` | App guards cover normal alpha authoring, but concurrent move/direct-write risk remains. | `RISK-001`, `RISK-008`, `UNIT-009`; integrity query now, forward constraint only after real data and concurrency need justify it. |
| `TPL-F-006` No Template CRUD history | `P3 DECIDED` | Estimate insertion remains historized; Template library CRUD receives one bounded same-batch operational receipt, not fake Estimate events. | `OPS-001`, `UNIT-009`, `AC-014`, `AC-015`; use existing `component_library_telemetry_events` and make no compliance-log claim. |
| `TPL-F-007` No zod schemas | `P3 ACCEPTED` | No demonstrated correctness defect; existing guards are currently adequate. | No unit/dependency added. Add schema validation only when a concrete boundary gap is found. |
| `TPL-F-008` Synthetic seed fallback | `P3 DECIDED` | Confirmed degraded-mode ambiguity. | `REQ-009`, `PERF-001`, `OPS-001`, `UNIT-009`; remove the production fallback after preflight, return explicit schema-unavailable state, and retain seeds only as named development fixtures. |
| `TPL-F-009` Dead pricing provenance | `P3 DECIDED_OPEN_IMPLEMENTATION` | Confirmed, with broader row/publication blast radius than the source pack modeled. | `REQ-004`, `REQ-009`, `DATA-001`, `UNIT-002`, `UNIT-009`; apply the fixed `recorded`/`inherited_snapshot`/`synthesized_fallback`/`missing` contract and keep it private. |
| `TPL-F-010` No insert replay dedupe | `P3 ACCEPTED` in source pack | Superseded by `F-011 P1`: current cross-surface intent/retry contract requires real idempotency before release. | `REQ-007`, `UNIT-005`, `AC-007`; committed receipt before copy planning. |

## Absorbed Requirement Crosswalk

| Source requirement | Retained destination authority | Proof boundary |
| --- | --- | --- |
| `TPL-REQ-001` Audit CREATE | `REQ-009`, `L-16`, `R-35`, `UNIT-009`, `AC-015` | Save flow and atomicity are documented; implementation/runtime proof remains open. |
| `TPL-REQ-002` Audit Templates browse/drag | `REQ-009`, `R-25`, `R-34`–`R-44`, `PERF-001`, `AC-015` | Bounded summaries, selected hydration, tree, search, and ID payloads retained. |
| `TPL-REQ-003` Audit INSERT | `REQ-007`, `C-17`, `L-19`, `R-27`–`R-30`, `UNIT-005`, `AC-007` | Source path retained; target/idempotency/pending proof remains open. |
| `TPL-REQ-004` Audit schema/data layer | `REQ-009`, `DATA-001`, `SEC-001`, `UNIT-009`, `AC-009`, `AC-015` | Active D1 tables/migrations and legacy-provider boundary retained. |
| `TPL-REQ-005` Findings and recommendations | `TPL-F-001`–`TPL-F-010`, `RISK-008`, `UNIT-005`, `UNIT-009` | All ten findings have a canonical disposition. |
| `TPL-REQ-006` Implementation-ready units | `IMPLEMENTATION_PLAN.md`, `UNIT-005`, `UNIT-009`, `UNIT-008` | Four source units are mapped; optional/rejected work is explicit. |
| `TPL-REQ-007` Variants | `REQ-005`, `REQ-007`, `REQ-009`, `DATA-001`, `AC-005`, `AC-007`, `AC-015` | Exact selected-option/current-price/fallback semantics retained. |
| `TPL-REQ-008` Correctness/no fabricated facets | `REQ-001`, `OPS-001`, `SRC-006`, `EVID-006`, `AC-001`, `AC-014`, `AC-015` | File/path/source spot-check and current validator replace the legacy manifest claim. |

## Source Unit Crosswalk

| Source unit | Integrated unit | Decision |
| --- | --- | --- |
| Source `UNIT-1` — atomic create | `UNIT-009` | Retained as required work. |
| Source `UNIT-2` — insert pending affordance | `UNIT-005` | Retained, narrowed to a lightweight target-scoped placeholder. |
| Source `UNIT-3` — contingency symmetry | `UNIT-009` | Retained under the full row-field contract. |
| Source `UNIT-4` — pricing provenance decision | `UNIT-002` + `UNIT-009` | Resolved as the fixed four-value private contract; isolated read deletion is superseded. |

The source pack rejected dedicated units for idempotency, cycle constraints, validation schemas, global-event refactor, Template CRUD history, and fallback removal. Integration keeps validation-schema and speculative D1-constraint work deferred, promotes real insertion idempotency/event acknowledgement into existing `UNIT-005`, and folds the chosen telemetry/fallback cleanup into `UNIT-009` rather than leaving routine implementation decisions open.

## Retained Evidence Index

| Source evidence | Retained claim |
| --- | --- |
| `TPL-EV-001` | Active D1 Template tables and later schema evolution exist. |
| `TPL-EV-002` | Destination Template insertion writes nodes/rows/history atomically within the statement ceiling. |
| `TPL-EV-003` | Left-tree Save as template dispatch exists and is permission/persistence gated. |
| `TPL-EV-004` | Template/category/node drag payloads carry IDs under typed MIME contracts. |
| `TPL-EV-005` | Create atomicity seam is header pre-insert versus node/row batch, not nodes versus rows. |
| `TPL-EV-006` | Insert preserves exact selected option, resolves current price, and explicitly handles unavailable sources. |
| `TPL-EV-007` | `pricing_provenance_origin` is not consistently written by Template-related producers. |
| `TPL-EV-008` | Reusable Project source insertion is a distinct copier with stronger committed-correlation replay handling. |

These claims are consolidated into manifest evidence `EVID-006`. They are planning/source evidence only and cannot pass product criteria by themselves.

## Implementation And Verification Ownership

- `UNIT-005` owns Template/Project-source destination targeting, intent idempotency, source-set validation, pending feedback, acknowledged command routing, authoritative reconcile, and insertion receipt behavior.
- `UNIT-005` also owns the Templates source-family control's compact transparent trigger, `All sources`/`Custom templates`/`Project sources` vocabulary, local loaded-family switching, and preservation of source-tree continuity.
- `UNIT-009` owns Template save/create atomicity, bounded browse/detail, editor CRUD/topology, category/header lifecycle, contingency/provenance policy, synthetic fallback policy, Template library audit/cache semantics, and the shared inline rename/menu treatment for Template/category/editor surfaces.
- `UNIT-008` cannot make a final release decision until those units and `AC-007`/`AC-015`/`AC-016`/`AC-017` are resolved with the named evidence.
- Artifact `13` is the sole visual/interaction-performance authority for these Template surfaces; it does not alter detached Template data semantics in this artifact.
- This absorption did not independently authorize automated product or browser tests when written. The later pack-wide authority in artifact `14` and `IMPLEMENTATION_PLAN.md` supersedes that test boundary with required `TEST_TASK` coverage; provider mutation and deployment remain separately governed operational boundaries.

## Source Pack Removal Gate

The absorbed source folder may be removed only after all of the following are true:

1. every source requirement, finding, unit, decision, and evidence claim appears in the crosswalks above;
2. Template lifecycle actions are canonical rows in artifact `09`;
3. `REQ-009`, `AC-015`, `UNIT-009`, `RISK-008`, `SRC-006`, and `EVID-006` are reciprocal in `TRACEABILITY.md` and `plan-pack.json`;
4. the old protected/concurrent-pack boundary is removed everywhere in this pack;
5. the destination pack passes the canonical validator after the source folder is absent; and
6. repository search finds no stale active reference to `.ai/03_plans/2026-07-15/Component-Templates/`.

Deletion removes duplicate planning authority only. It does not mark any Template product fix implemented or release-proven.
