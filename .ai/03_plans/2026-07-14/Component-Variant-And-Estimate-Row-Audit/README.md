# Estimate Sheet MVP Feature Inventory, CRUD/Data/UI Audit, And Readiness

**Canonical route:** `/workshop/projects/[projectId]/estimates/[nodeId]`
**Package posture:** implementation-ready remediation plan, compiled and re-audited against `Create-Implementation-Prompt.md`
**Implementation status:** `IN_PROGRESS`
**Behavior status:** `NOT_EVALUATED`
**Objective status:** `NOT_ACHIEVED`
**Release status:** `NOT_READY`
**Browser/visual proof:** `PARTIAL` — verified unit receipts exist through `UNIT-004`; the integrated `TEST-007` route gate remains open
**Local/preview/hosted Cloudflare proof:** `NOT_EVALUATED`
**Implementation test authorization:** `TEST_TASK` — focused deterministic, D1, integration, browser, and performance tests are required by `UNIT-011`
**Last verified unit:** `UNIT-004`
**Exact next unit:** `UNIT-005`
**Current execution authority:** `IMPLEMENTATION_TRACKER.md`

## Outcome

This pack is the canonical Estimate Sheet system inventory and remediation plan for the MVP authoring route. It replaces the previous narrow posture centered on one Project-component variant defect and separates the route into three primary surfaces:

1. **Left sidebar** — Estimate tree, Area CRUD, bulk delete, move/reorder, search/filter, lazy loading, template handoff, and external drops.
2. **Center Estimate Sheet** — tabs, search/filter/grouping, row and component CRUD, inline editing, variants, duplicate/move/replace/delete/restore, history, totals, export handoff, and error/recovery behavior.
3. **Right sidebar** — Library, Project, and Templates source browsing; component/folder lifecycle; archive/permanent delete; bulk actions; drag/drop; and reusable-source insertion.

Secondary surfaces cover the project header, component editor, activity/export, Cloudflare storage, publication, and client review only where they consume or mutate Estimate Sheet state. The full Component Templates lifecycle is included because the completed 2026-07-15 Template audit has been absorbed into this pack. Dense inline editing and menu behavior are canonical in artifact `13`; whole-route speed, replay-safe D1 persistence, create-to-use cache continuity, adversarial testing, and measured optimization are canonical in artifact `14`; resumable implementation state is canonical in `IMPLEMENTATION_TRACKER.md`. The final authoring pass resolves those routine decisions rather than delegating them to the executor.

## Why The Pack Was Reopened

The prior manifest said implementation was complete and marked every criterion PASS. That status is no longer credible because:

- all 23 criteria were tied to one blanket evidence record;
- the pack itself said browser and hosted Cloudflare proof were not run;
- the source has changed since the frozen baseline;
- recent user-reported incidents exposed Enter-key behavior, variant-name editing/loading, permanent component deletion, a D1 `source_snapshot_json` NOT NULL failure, and missing duplicate-row behavior; and
- current source review found additional move, restore, upload, R2 image, promotion, template-copy, tab-copy, and publication-parity risks.

At reopening, the refreshed plan treated dirty fixes as `FIX_PRESENT_UNVERIFIED`, not as completed work. Current implementation truth now comes from the unit receipts in `IMPLEMENTATION_TRACKER.md`; historical reopening language does not override that tracker.

The current core register contains **7 P0 mission-critical findings, 15 P1 important findings, and 2 P2 non-mission-critical cleanup/quality findings**. Every `F-001` through `F-024` has a corrected premise, failure simulation, blast radius, selected resolution, and required evidence. Artifact `12` preserves all ten absorbed Template findings (`TPL-F-001` through `TPL-F-010`). Artifact `13` adds nine UI/readiness findings (`UI-F-001` through `UI-F-009`). Artifact `14` adds twelve performance/persistence readiness findings (`PP-F-001` through `PP-F-012`), including six mission-critical replay/atomicity gaps that must be fixed before objective completion.

## Current Highest-Risk Remaining Work

| Priority | Finding | Required unit |
| --- | --- | --- |
| `P0` | Project image deletion can remove referenced R2 objects; component image deletion has a separate save-versus-delete race. | `UNIT-006` |
| `P0` | Upload session, asset, and event metadata can partially commit. | `UNIT-006` |
| `P0` | Legacy and Client Portal publication do not share one authoring/privacy projection, consistency-fence, and deterministic semantic-identity contract. | `UNIT-007` |
| `P1` | Template/Project insertion still needs target-derived topology, retained-intent replay, hard statement-ceiling enforcement, and authoritative subtree reconciliation. | `UNIT-005` |
| `P2` | Saving an Estimate node/tab as a Template still pre-commits the Template header before the node/row batch and relies on compensating deletion. | `UNIT-009` |
| `P2` | Template rename/menu/filter behavior and production fallback truth still need the integrated lifecycle pass. | `UNIT-009` |
| `P1` | Whole-route render, request, remount, D1 round-trip, retry, and adversarial behavior still require the final measured gate. | `UNIT-011` |

See `10-DATA-INTEGRITY-BUG-AND-READINESS-AUDIT.md` for the complete ranked register and `11-ISSUE-BY-ISSUE-ROOT-CAUSE-BLAST-RADIUS-AND-FIX-SIMULATIONS.md` for corrected premises, failure simulations, alternatives, and selected fixes.

## Permanent Delete Contract

The user's explicit product rule is authoritative:

- **Archive** is the non-destructive action and preserves existing Estimate/Template references.
- **Delete permanently** removes the Library component and its dependent Estimate and Template row items after impact preview and typed confirmation only when the combined dependent-row count is at most `400`.
- Above `400`, the interactive action refuses before mutation and offers Archive; larger destruction is a separately authorized maintenance operation, not automatic chunking.
- Permanent delete must be workspace-scoped, atomic, impact-counted, auditable, attachment-safe, and explicit about whether recovery is possible.
- No implementation may satisfy deletion by writing `NULL` into `estimate_row_items.source_snapshot_json`.

## Scope Boundaries

### Included

- every visible click, context-menu, keyboard, bulk, drag/drop, loading, retry, and recovery action on the three primary surfaces;
- inline rename, compact dropdown/menu, focus, geometry, loading-scope, and interaction-render contracts on those surfaces;
- Estimate tab/node/row/component/template-source identity and mutation contracts;
- the complete Component Template lifecycle: save/create, bounded browse, category/header CRUD, editor node/row CRUD, template composition, variant/source trust, and insertion;
- D1 constraints, revision guards, history/outbox, atomicity, cache reconciliation, and local-versus-hosted evidence;
- complete create-to-use cache projection, durable command receipts, whole-route performance scenarios, and mutation-by-mutation safety evidence;
- focused deterministic, D1, integration, browser, and performance tests authorized for implementation;
- R2/Images ownership only where Estimate rows/components reference stored assets; and
- authoring-to-issued/public snapshot parity and privacy.

### Auxiliary

- full Add/Edit Component modal detail already captured in artifacts `05` and `06`;
- favorite durability as `UX-003`/`AC-018`, implemented as an optional `UNIT-004` tail that does not gate the core MVP;
- proposal export formatting;
- collaboration/presence lifecycle; and
- recipient access, discussions, decisions, notifications, and full Client Portal presentation.

### Excluded

- implementation work in this planning turn;
- product tests or product mutations in this planning turn; the implementation program is authorized and required to execute the focused tests in `UNIT-011`;
- deployment or live production mutation;
- unrelated Admin Estimate System Map work.

## Canonical Artifact Order

Read the pack in this order:

1. `README.md` — objective, scope, current status, and pack authority.
2. `09-ESTIMATE-SHEET-FEATURE-ACTION-MATRIX.md` — complete left/center/right/secondary action inventory.
3. `10-DATA-INTEGRITY-BUG-AND-READINESS-AUDIT.md` — mutation audit, ranked findings, Cloudflare evidence ladder, and issued boundary.
4. `11-ISSUE-BY-ISSUE-ROOT-CAUSE-BLAST-RADIUS-AND-FIX-SIMULATIONS.md` — current-source corrections, blast radius, options, and the selected minimal resolution for every finding.
5. `12-COMPONENT-TEMPLATES-ABSORPTION-AND-LIFECYCLE-CONTRACT.md` — retained Template architecture, flows, variant contract, ten-finding disposition, source-unit mapping, and removal gate.
6. `13-ESTIMATE-SHEET-UX-UI-AND-INTERACTION-PERFORMANCE-READINESS.md` — live baseline, stable-surface rename contract, compact filter/menu contract, accessibility, render isolation, and visual/performance evidence requirements.
7. `14-ESTIMATE-SHEET-MVP-PERFORMANCE-PERSISTENCE-AND-TEST-CONTRACT.md` — whole-route scenarios, cache convergence, mutation safety, receipt model, D1 limits, failure simulations, and authorized test rules.
8. `IMPLEMENTATION_PLAN.md` — exact dependency graph, units, file scopes, acceptance, proof, and test commands.
9. `IMPLEMENTATION_TRACKER.md` — current execution epoch, dependency eligibility, unit/requirement/mutation/performance/test progress, and continuation state.
10. `TRACEABILITY.md` — requirement-to-capability-to-finding-to-unit-to-test-to-evidence map.
11. `01` through `08` — dated deep dives retained as baseline/reference; they are not current completion authority.
12. `LOOP_LEDGER.md` — append-only coordination history, not current execution state.

## Naming Decision

The folder is intentionally not renamed during concurrent work. No tracked inbound reference required the old name, but active agents may hold uncommitted or prompt-level references. The canonical title above changes immediately; a folder rename adds collision and hash-refreeze risk without improving execution.

## Evidence Boundary

Current evidence combines the frozen planning/source baseline with verified implementation receipts through `UNIT-004`:

- route/component/action source;
- D1 migrations and action transport;
- `wrangler.jsonc` bindings;
- current scoped worktree diff;
- user-reported runtime incidents from the live Estimate Sheet;
- the fully read Component Templates audit, reclassified through artifact `12` because its legacy manifest does not satisfy the current canonical validator; and
- a read-only in-app browser baseline of active Area rename and the Templates source-family trigger/menu, plus the current source styles and render boundaries consolidated in artifact `13`.
- current-source hot-path, persistence-boundary, query/cache, and historical lean-performance analysis consolidated in artifact `14`; and
- an implementation tracker that records verified row, tab/tree, component lifecycle, permanent-delete, replay, cache, and focused-test receipts through `UNIT-004`; and
- an exact continuation at `UNIT-005`, while whole-route behavior, provider, publication, and final release evidence remain open.

The completed unit receipts prove only their named slices. They do not prove the full Estimate Sheet objective, every failure/performance path, Cloudflare preview/hosted `ARCH_DB`/`ARCH_UPLOADS_R2`, or public-share parity. Those evidence levels remain mandatory under artifacts `10`, `13`, and `14`.

## Stop Condition

The remediation program is complete only when:

1. every matrix action has one current source owner and one decisive result;
2. all P0/P1 findings are fixed, explicitly accepted, or removed by a product decision;
3. destructive/shared mutations prove authorization, atomicity, revision/idempotency, history, cache reconciliation, and recovery/irreversibility;
4. local D1, focused tests, browser, performance, Cloudflare provider, and public-route evidence are reported separately and truthfully;
5. legacy and Client Portal issuance agree on authoring row/tree/component/variant meaning; and
6. Template save/browse/editor/insert lifecycle satisfies `REQ-009` and `AC-015` without duplicate planning authority;
7. inline rename and compact filter/menu behavior satisfy `UX-002`/`AC-016` without repainting or shifting the edited container;
8. edit/filter interactions satisfy `PERF-002`/`AC-017` without unrelated rerender, remount, fetch, loading, scroll loss, or layout shift;
9. every `MUT-*` and `PERF-S*` row satisfies `DATA-003`/`AC-019` and `PERF-003`/`AC-020` with required test evidence;
10. `IMPLEMENTATION_TRACKER.md` satisfies `OPS-002`/`AC-021`, every required test is `PASS`, and no repository-controlled continuation is left unresolved; and
11. `plan-pack.json` has claim-level evidence rather than blanket PASS records.
