# Estimate Sheet Center Content Implementation Plan

Status: canonical implementation plan
Created: 2026-06-25
Planning folder: `.ai/03_plans/2026-06-24-Estimate-Sheet-Center-Content-Analysis`
Primary prompt: `.ai/08_prompts/000_Planning Prompts/Create-Implementation-Prompt.md`
Scope: planning-only; no application code, migrations, provider configuration, or production state changed

## 1. Executive Summary

The estimate-sheet center content is close enough for first-user iteration, but
it has launch-blocking integrity and recoverability gaps in row movement, bulk
delete, project-source insertion, trust-gated insertion, and read-only behavior.
This plan turns the existing 00-22 audit package into one implementation-ready
delivery plan with phased tasks, file-level ownership, validation gates, rollout
controls, and traceability.

The core strategy is not a rewrite. It is a narrow hardening pass around the
current architecture:

- Make multi-row persistence atomic where users experience one action:
  component move and bulk delete.
- Preserve existing optimistic single-row editing, but add revision gates where
  full-tree responses can overwrite newer local state.
- Push permission, payload, source-trust, and telemetry boundaries to shared
  seams instead of adding one-off guards.
- Keep first-user scope focused. Component decomposition, account-synced column
  widths, and polish-only enhancements remain post-launch unless they block the
  integrity path.

Plan readiness score, using the required prompt axes and based on source-package
audit plus current repo inspection:

| Dimension | Score | Reason |
| --- | ---: | --- |
| Strategic alignment | 91 | Focuses first-user work on launch-blocking integrity, recoverability, and edit access while deferring non-blocking polish/decomposition. |
| Requirements coverage | 94 | Covers all P0/P1/P2 findings, source decisions, threat-model risks, and validation requirements from docs 00-22. |
| Technical specificity | 88 | Names RPCs, actions, hooks, migrations, transaction contracts, files, and tests; exact SQL body remains implementation work. |
| Implementation sequencing | 90 | Separates contracts/telemetry, integrity fixes, validation hardening, a11y, perf, decomposition, and post-launch work. |
| Risk management | 87 | Covers atomicity, authz, TOCTOU, telemetry privacy, rollback triggers, and validation gaps; runtime proof remains future work. |
| Testability | 90 | Lists targeted failing tests, prove script, env-gated E2E, manual QA, and known validate limitations. |
| Operational readiness | 84 | Defines telemetry, alert thresholds, rollout/rollback, degraded behavior, and perf budgets; production sink proof remains required. |
| Overall implementation readiness | 89 | Implementation-ready as a planning artifact after current-review patches; runtime/provider/browser proof belongs to implementation phases. |

Reconciliation with `20-PLAN-AUDIT-AND-SCORECARD.md`: the historical source
package scored the earlier plan at 71 before the blocker-resolution pass. This
canonical plan incorporates the resolved conflicts, worker-lane evidence,
explicit DB contracts, prompt-required sections, rollout/ops coverage, and
review-gate patches, which is why the readiness score is now 89. It is not a
runtime quality score.

## 2. Source References

Planning authority:

- `Create-Implementation-Prompt.md`: requires this canonical plan, all 22
  sections, file-level maps, test strategy, risk analysis, and review evidence.
- `00-README.md`: audit summary, launch-readiness framing, environment limits.
- `01-SCOPE-AND-SYSTEM-MAP.md`: component inventory, query keys, MIME/event map.
- `02-ROW-DOMAIN-AND-SOURCE-OF-TRUTH.md`: canonical row model and editable-state
  separation.
- `03-COMPLETE-BEHAVIOR-INVENTORY.md`: complete center-sheet user behavior map.
- `04-ROW-CRUD-AUDIT.md`: insert, replace, update, clear, move, delete paths.
- `05-DRAG-DROP-AND-INSERTION-AUDIT.md`: drag/drop sources, targets, propagation,
  validation, and keyboard-equivalence gaps.
- `06-EDITING-MATH-AND-TOTALS-AUDIT.md`: numeric editing, totals, export parity.
- `07-TABS-SELECTION-SEARCH-AND-DISPLAY-AUDIT.md`: tab scoping, selection,
  search, facets, grouping/sorting.
- `08-STATE-CONCURRENCY-AND-ROLLBACK-AUDIT.md`: rollback, stale responses,
  optimistic/local/canonical divergence.
- `09-NETWORK-CACHE-AND-PERSISTENCE-AUDIT.md`: query keys, mutation queues,
  RPCs, invalidation.
- `10-UX-UI-ACCESSIBILITY-AUDIT.md`: interaction, keyboard, screen-reader,
  reduced-motion, responsive constraints.
- `11-PERFORMANCE-AUDIT.md`: virtualization, totals, cursor, large-row behavior.
- `12-ACTIVITY-DETAILS-EXPORT-AND-COLLABORATION-AUDIT.md`: activity, details,
  proposal preview/export, collaboration.
- `13-SECURITY-AND-DATA-INTEGRITY-AUDIT.md`: authz, RLS, input validation,
  payload size, transaction risks.
- `14-EDGE-CASE-AND-TEST-MATRIX.md`: state-combo and failure-injection matrix;
  most failure-injection cells are intentionally marked gaps.
- `15-PRIORITIZED-FINDINGS.md`: authoritative P0/P1/P2/P3 findings.
- `16-IMPLEMENTATION-PLAN.md`: source phased plan; this document supersedes it
  as the canonical plan.
- `17-VALIDATION-PLAN.md`: command and evidence strategy.
- `18-OPEN-QUESTIONS-AND-DECISION-LEDGER.md`: product/engineering defaults; no
  blocked decisions remain.
- `19-TRACEABILITY-MATRIX.md`: finding-to-task-to-file-to-test map.
- `20-PLAN-AUDIT-AND-SCORECARD.md`: historical review and resolved blocker list.
- `21-ADVERSARIAL-REVIEW.md`: residual risks and calibration.
- `22-THREAT-MODEL.md`: assets, actors, trust boundaries, mitigations.
- `23-IMPLEMENTATION-PLANNING-COORDINATION-LEDGER.md`: multi-lane coordination
  record for this planning run.

Current repo evidence inspected during this planning run:

- `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx`
- `src/components/workshop/EstimateWorkspaceClient.tsx`
- `src/components/workshop/EstimateSheetContent.tsx`
- `src/components/workshop/estimate-sheet/rows/branch.tsx`
- `src/components/workshop/estimate-sheet/rows/row-table.tsx`
- `src/components/workshop/estimate-sheet/rows/cells.tsx`
- `src/components/workshop/estimate-sheet/rows/drop-zones.tsx`
- `src/components/workshop/estimate-sheet/rows/constants.ts`
- `src/components/workshop/estimate-sheet/activity-history.tsx`
- `src/hooks/use-estimate-query.ts`
- `src/hooks/use-estimate-row-mutations.ts`
- `src/lib/estimates/actions.ts`
- `src/lib/estimates/estimate-row-tree-patch.ts`
- `src/lib/estimates/load-limits.ts`
- `src/lib/estimates/express-components-telemetry.ts`
- `src/lib/component-library/library-telemetry.ts`
- `src/lib/perf/server-timing.ts`
- `supabase/migrations/*` row history, RLS, node move removal, bulk node hardening.
- `tests/vitest/*estimate*`, `tests/vitest/perf/*estimate*`, and estimate E2E
  inventory.
- `package.json` scripts for typecheck, lint, design lint, unit, DOM, E2E,
  validate, Storybook checks, and existing Postgres prove scripts.

Evidence limitation: this plan is grounded in static source inspection and the
existing audit package. It does not claim browser, provider, SQL, NVDA,
VoiceOver, production telemetry, or live performance proof.

## 3. Scope

In scope for implementation:

- Phase 0/1 launch blockers:
  - Atomic component move between rows.
  - Revision-gated project-source insert.
  - Atomic bulk row-item delete.
  - Trust-gate stale-target and source-freshness hardening.
  - Read-only and mobile-read-only row mutation gating.
- Phase 2/3 supporting integrity and feedback:
  - Shared guarded library drag payload reader.
  - Custom `archestimator:add-library-item` event validation.
  - Drop propagation/highlight correctness.
  - Keyboard equivalents for replace and move.
  - Per-row save-state chips plus global summary.
- Phase 5/6 user recovery and accessibility:
  - Clear/delete clarity, Undo or recoverability policy, selection-pruning
    announcement, table semantics, focus, reduced motion.
- Phase 7 operational readiness:
  - Telemetry sink, event redaction, perf baselines, active-editor virtualization
    pinning, alert/rollback signals.
- Phase 8 post-launch maintainability:
  - Component decomposition only after behavior is locked.
- Phase 9 post-launch enhancements:
  - Account-synced column width, proposal dirty banner, editable-total sort, and
    other non-blocking product improvements.

Out of scope for the first-user hardening path:

- Rewriting `EstimateSheetContent.tsx` before data-integrity fixes land.
- Adding a broad feature-flag framework if a simpler rollout guard/checklist is
  enough.
- Adding a `user_preferences` table for column widths before post-1k-user
  evidence.
- Turning collaboration cursors into locking or realtime editing.
- Broad i18n; peso formatting stays.
- Browser proof for this planning document. Browser proof belongs to the
  implementation validation gates.

## 4. Current-State Analysis

The page entry point resolves route context, loads the initial estimate tree
under `ESTIMATE_SHEET_TREE_LOAD_LIMITS`, resolves `canEditEstimate`, and renders
the workspace shell. `EstimateWorkspaceClient.tsx` passes tree, tab, proposal,
library, and edit-capability state into `EstimateSheetContent.tsx`.

The center sheet is a high-ownership orchestrator. It owns tree/editable-row
coordination, mutation handlers, trust gates, sidebars, row details, activity,
proposal preview, search/facets, bulk selection, and cursor awareness. Row
rendering lives in `rows/branch.tsx`, `rows/row-table.tsx`, `rows/cells.tsx`,
and `rows/drop-zones.tsx`. Persistence flows through `useEstimateRowMutations`
and `src/lib/estimates/actions.ts` into Supabase RPCs.

Confirmed load-bearing current defects:

- `moveRowComponent` in `EstimateSheetContent.tsx` still calls `replaceRow`
  twice, once for target and once for source. Because `useEstimateRowMutations`
  queues by row id, this is two independent persistence operations with
  independent rollbacks.
- `deleteSelectedRows` loops selected row ids and calls `deleteRowItem`
  independently, then clears selection before the calls settle.
- `insertProjectSourceIntoParentById` still applies `setEstimateTree(() =>
  result.tree)` unconditionally, unlike template insert paths that use a local
  revision gate.
- `confirmPendingLibraryCommit` uses the target captured when the trust gate was
  opened and does not disable confirm if that target disappears.
- Save feedback uses one toast id, `estimate-row-save`, and one hook-level save
  state, so concurrent row mutations can mislead users.
- `canEditEstimate` currently gates tab lifecycle actions, but row/cell/drop
  mutation affordances and sidebar insert callbacks still pass through.
- Library drag payloads and the custom add-library-item event still trust raw
  client payload shapes in multiple places.
- `activity-history.tsx` does not list or render `row_moved`.
- Row virtualization disables entirely when an express editor is active.
- Table headers and virtualized row/cell semantics need WCAG-focused repair.

Existing strengths to reuse:

- Template insert already has the revision-gated full-tree pattern.
- `useEstimateRowMutations` already has mutation ids, expected row revisions,
  per-row queues, rollback hooks, and conflict-triggered refetch.
- `estimate-row-tree-patch.ts` centralizes row patch behavior.
- Server actions already check edit access before current row RPCs.
- `estimate_sheet_events.event_type` is text, so `row_moved` needs consumer
  support but not an enum migration.
- Existing tests cover many row, authz, drag, virtualization, activity, and
  schema paths.

## 5. Target-State Design

Target state is a center sheet where each user-visible action has matching
persistence semantics:

- One perceived multi-row action uses one server transaction and one client
  reconciliation path.
- One full-tree server response can only replace the visible tree if no newer
  local revision exists; otherwise the client refetches.
- One row mutation displays row-local status and a concise global summary.
- One edit permission value gates every local mutation path before optimistic
  state begins; server/RLS remains the authority.
- One shared payload reader validates all library drag and custom event inputs.
- One telemetry wrapper records redacted operational signals without exposing
  row names, free text, actor emails, raw snapshots, URLs, storage paths, or
  secrets.

The first-user target is not perfect offline collaboration. It is a defensible
closed-beta surface where data-loss and partial-persistence paths are removed,
recoverability is clear, and known residual risks are observable.

## 6. UX Plan

Primary journeys:

- Editor: open estimate tab, select area, search/filter/sort, edit values,
  insert blank/library/project-source rows, replace/move components, bulk-delete
  rows, inspect activity/details, preview proposal.
- Read-only viewer: inspect rows, totals, activity, proposal preview, and tabs
  without enabled mutation controls.
- Keyboard/screen-reader user: navigate tabs, rows, row controls, replace/move
  alternatives, save state, errors, and focus return without drag/drop.
- Collaborator: see cursors as advisory context while revision conflicts remain
  the concurrency authority.

Interaction requirements:

- Read-only controls stay visible but disabled with accessible explanation:
  "You don't have edit access." Use native `disabled` where possible; use
  `aria-disabled` only when native disabled breaks focus semantics.
- Mobile under 768px is read-only for v1: no editing, drag/drop, bulk selection,
  or column resizing.
- Empty-area add strip remains, but disables in read-only and mobile fallback.
- Search/facet no-results state must render an explicit keyboard-reachable empty
  result message.
- Bulk delete failure copy: "Couldn't delete selected rows. Nothing was deleted.
  Fix the listed row and try again."
- Trust-gate stale target copy: "This area was deleted. Close and try again."
- Row save chips support `idle`, `saving`, `saved`, `failed`, and `conflict`.
- "Clear component" uses an Eraser-style affordance and preserves the row.
  "Delete row" keeps the destructive Trash affordance.
- "Group" becomes "Sort" because the current behavior reorders rows without
  group headers.
- Replace and move must have keyboard equivalents through an engineering-owned
  command-palette-style picker with search, roving navigation, Enter confirm,
  and Esc cancel.

Accessibility requirements:

- WCAG 2.2 AA target for the first-user center-sheet path.
- Table headers use `scope="col"`.
- Virtualized rows expose `aria-rowindex`; cells expose `aria-colindex` where
  native table semantics are weakened by virtualization.
- Row save/error/conflict states are announced through row-level live regions;
  row errors use alert semantics.
- Selection pruning announces removed count.
- Insert/replace/clear/delete/rollback focus follows the Q32 defaults from the
  decision ledger.
- Reduced motion governs scroll/focus animations.
- Runtime SR proof is required before WCAG conformance is claimed.

## 7. Technical Architecture

Client layers:

- `EstimateSheetContent.tsx`: orchestration remains here for Phase 1. Add the
  new handler wiring, revision gate, trust-gate guard, read-only top-level
  gating, telemetry calls, and bulk/move client flows. Decomposition waits until
  Phase 8.
- `use-estimate-row-mutations.ts`: add atomic `moveComponent` and `deleteRows`
  mutation surfaces, row-status map, structured errors, and single-response
  reconciliation.
- `estimate-row-tree-patch.ts`: add a multi-row patch helper for atomic move
  and a bulk deletion helper if reconciling from row ids instead of a returned
  tree.
- `rows/branch.tsx`, `rows/row-table.tsx`, `rows/cells.tsx`,
  `rows/drop-zones.tsx`: thread `canEditEstimate`/mobile-readonly state and
  ensure drag sources, drops, inline inputs, add strips, delete buttons, clear
  buttons, and selection controls are inert when not editable.
- `rows/constants.ts`: add `readLibraryItemDragPayload` next to the existing
  safe estimate-component drag reader.
- `activity-history.tsx` and activity model/composer files: add `row_moved`
  filter, label, summary, target/source rendering, and tests.

Server/action layers:

- `src/lib/estimates/actions.ts`: add `moveEstimateRowComponent` and
  `deleteEstimateRowItemsBulk` server actions. Both check `can_edit_estimate`
  before invoking write RPCs and normalize structured conflict/forbidden/limit
  errors for the client.
- Existing insert/replace actions keep current behavior but must not be
  described as transactional source-freshness checks unless the source check is
  moved inside the relevant RPC transaction.
- `src/lib/supabase/types.ts`: regenerate after migrations.

Database layers:

- New migration for `move_estimate_row_component_with_history`, following the
  existing row-history RPC naming pattern.
- New migration for `delete_estimate_row_items_bulk_with_history`, following the
  existing row-history RPC naming pattern.
- Optional hardening migration if source freshness checks are moved from
  TypeScript preflight into existing insert/replace RPCs.
- New prove script for estimate-row integrity and authz, modeled after existing
  `scripts/prove-*-postgres.mjs` patterns.

Operational layer:

- Add `centerSheetTelemetry` using the sanitized, swappable sink style from
  component-library telemetry rather than console-only express telemetry.
- Add redacted event payload contracts and tests before Phase 1 client paths
  ship.

## 8. Data/DB Plan

New RPC: `move_estimate_row_component_with_history`.

Contract:

- Inputs:
  - `target_project_id uuid`
  - `target_estimate_id uuid`
  - `target_row_id uuid`
  - `source_row_id uuid`
  - `target_replacement_payload jsonb`
  - `source_clear_payload jsonb`
  - `expected_target_revision integer`
  - `expected_source_revision integer`
  - `mutation_id uuid`
  - `correlation_id uuid`
- Validate:
  - derive `actor_id := auth.uid()` inside the SECURITY DEFINER function;
  - reject null actors and reject any caller-supplied actor attribution if a
    compatibility wrapper is unavoidable;
  - caller can edit the estimate through `assert_can_edit_estimate_for_history`
    using only the derived actor id;
  - both rows belong to the same estimate, project, workspace, and active tab
    scope where applicable;
  - target and source row ids are distinct;
  - both expected revisions match current rows;
  - payloads are objects, size-bounded, and normalized through existing row
    validation helpers;
  - target replacement preserves target row editable values per Q5.
- Transaction:
  - lock the target estimate, then lock both row records in deterministic id
    order with `FOR UPDATE` to reduce deadlock risk;
  - if either replacement payload references `sourceLibraryItemId`, lock and
    verify the source library row inside the same transaction;
  - update target row with the replacement payload;
  - update source row with the cleared component payload;
  - insert one `estimate_sheet_events` record with event type `row_moved`,
    target row, source row, correlation id, derived actor id, before/after
    snapshots, and redacted move metadata;
  - return canonical `targetRow`, `sourceRow`, `eventId`, and `idempotent`.
- Failure semantics:
  - any authz, scope, revision, validation, or write failure aborts all writes;
  - return structured error codes for `forbidden`, `not_found`, `revision_conflict`,
    `invalid_payload`, and `limit_exceeded`.

New RPC: `delete_estimate_row_items_bulk_with_history`.

Contract:

- Inputs:
  - `target_project_id uuid`
  - `target_estimate_id uuid`
  - `row_ids uuid[]`
  - `expected_revisions jsonb` or typed row/revision pairs
  - `correlation_id uuid`
- Validate:
  - derive `actor_id := auth.uid()` inside the SECURITY DEFINER function;
  - reject null actors and reject any caller-supplied actor attribution if a
    compatibility wrapper is unavoidable;
  - authenticated edit access inside transaction using only the derived actor id;
  - row count is non-zero and under a hard cap. Default cap: 100 rows for beta,
    adjustable only with perf and UX proof;
  - every row belongs to the target estimate/project/workspace;
  - every expected revision matches;
  - no duplicate row ids.
- Transaction:
  - lock the target estimate, validate the row-count cap, then lock requested
    rows sorted by id;
  - validate all rows before deleting any;
  - delete or tombstone according to existing row-delete semantics;
  - insert history events. Preferred: one batch event plus per-row row_deleted
    events if existing activity consumers require row-level history;
  - return deleted ids, affected nodes/tabs if needed, and event ids.
- Failure semantics:
  - one failed row aborts the whole batch;
  - client copy always states that nothing was deleted.

Project-source insertion:

- Keep the operation non-optimistic.
- Capture local tree revision before sending.
- Apply returned full tree only if the local revision is unchanged.
- If revision changed, refetch the active tree instead of overwriting local
  optimistic edits.

Source-trust checks:

- Current `assertCurrentLibrarySourceForEstimateCommit` is a TypeScript-side
  pre-RPC check and has a TOCTOU window before insert/replace RPCs.
- Phase 1 implementation must move source freshness validation inside the same
  DB transaction for every new or touched source-bearing write path that commits
  a source snapshot.
- Existing source-bearing insert/replace paths that remain TS-preflight-only are
  not external-launch acceptable without explicit owner signoff, a disabled or
  fallback behavior, and a follow-up gate. Telemetry alone is not an acceptable
  mitigation for persisting stale source snapshots.

Migration/prove requirements:

- `npx supabase@2.98.2 db push`
- `npx supabase@2.98.2 gen types typescript --project-id ebxxqidacheyapmmzavr > src/lib/supabase/types.ts`
- `npx supabase@2.98.2 migration list`
- `bun run prove:estimate-sheet-row-integrity` after adding the prove script.

## 9. Security/Privacy

Security goals:

- No client-side check is the authority for edit access.
- No row move, bulk delete, insert, replace, or event write can cross estimate,
  project, workspace, or tab boundaries.
- No untrusted drag/custom-event payload can reach mutation code without shape,
  size, and scope validation.
- No telemetry payload stores row names, free-text descriptions, raw snapshots,
  actor emails, URLs, storage paths, or secrets.

Controls:

- Server actions call `can_edit_estimate` before write RPCs for fast denial.
- RPCs derive actor identity from `auth.uid()` inside the function, reject null
  actors, and perform transaction-owned edit authorization with that derived
  actor. Public signatures should not accept caller-controlled actor ids.
- RLS grants remain narrow; authenticated users get execute grants only for
  intended RPCs and select grants only where existing policy allows.
- Drag/custom event readers reject malformed, oversized, cross-scope, and
  unsupported payloads before trust gates or local optimistic mutations.
- Trust gate must re-check target existence on confirm and should re-check
  source freshness when committing source-bearing writes.
- New RPCs use deterministic lock ordering to reduce deadlock risk.
- New history events must use bounded payloads and existing event table size
  constraints.

Privacy posture:

- Activity history remains project/workspace scoped through existing event table
  policies.
- Telemetry is operational, redacted, and best-effort. Product path continues if
  telemetry sink fails.

## 10. Performance/Reliability

Current envelope:

- Interactive load cap: `1500` nodes / `5000` row items.
- Export cap: `1200` nodes / `3000` row items.
- Row virtualization starts at 75 rows but currently disables with active
  express editor.
- Branch virtualization starts at 80 visible branches.
- Tree/tab query stale time: 5 minutes.
- Lazy component-library cache GC: 30 minutes.

Budgets:

| Area | Budget / assumption |
| --- | --- |
| Initial route data | p95 under 1s for route context under live cap with `PERF_TRACE=1`. |
| Standard row edit | p95 UI commit under 50ms for 1k rows, no express editor active. |
| Express editor active | p95 keystroke under 100ms after active-row pinning. |
| Single-row RPC | p95 under 200ms. |
| Move/bulk RPC | alert above 500ms p95. |
| Project-source insert | large operation; revision-gate and refetch on mismatch. |
| Closed beta load | tens of active editors, not hundreds; no table-wide realtime feed. |

Reliability rules:

- Do not auto-retry destructive multi-row writes.
- Use user-driven retry for recoverable single-row failures.
- Add scoped statement timeouts and row-count caps for new RPCs.
- If telemetry fails, do not block user work.
- If rollout guard is unavailable, ship with explicit client rollback steps.
- If active tree truncation warning is present, copy must clarify that visible
  totals are loaded-view totals.

## 11. Blast Radius

Affected users:

- Estimate editors using center-sheet row editing, move, insert, replace,
  delete, project-source, and bulk workflows.
- Read-only collaborators who will see disabled mutation controls and mobile
  read-only fallback.
- Keyboard and screen-reader users relying on table semantics and non-DnD
  alternatives.
- Proposal/export users if visible tree and canonical data diverge.

Affected modules:

- `EstimateSheetContent.tsx`
- `EstimateWorkspaceClient.tsx` only if additional edit/mobile flags need
  routing.
- `rows/branch.tsx`, `rows/row-table.tsx`, `rows/cells.tsx`,
  `rows/drop-zones.tsx`, `rows/constants.ts`
- `activity-history.tsx`, activity model/composer files
- `use-estimate-query.ts`
- `use-estimate-row-mutations.ts`
- `estimate-row-tree-patch.ts`
- `src/lib/estimates/actions.ts`
- `src/lib/reusable-sources/actions.ts` if project-source payload contracts are
  tightened
- `src/lib/component-library/library-telemetry.ts` or new telemetry wrapper
- `src/lib/supabase/types.ts`
- Supabase migrations and prove scripts
- Vitest and optional Playwright estimate-sheet specs

External/provider blast radius:

- Supabase/Postgres project `ebxxqidacheyapmmzavr` only.
- No Vercel, GitHub, Notion, production config, unrelated Supabase project, or
  secrets changes are part of this plan.

## 12. Phased Implementation

### Phase 0: Contracts, telemetry, rollout

- Objective: lock implementation decisions, add redacted operational telemetry,
  and make rollback criteria explicit before behavior changes ship.
- Requirements addressed: ESC-P3-22, rollout decision Q37, source-trust and
  integrity observability from docs 16, 18, 21, and 22.
- Inputs: `18-OPEN-QUESTIONS-AND-DECISION-LEDGER.md`,
  `22-THREAT-MODEL.md`, existing telemetry files, package scripts, and this
  plan.
- Work packages: M-0 decision-lock note, M-0T `centerSheetTelemetry` sink and
  redaction tests, M-0R rollout guard and rollback checklist.
- Files/modules: new or existing telemetry wrapper, tests for telemetry schema,
  PR/issue description, `estimateSheetIntegrityV2` rollout guard or equivalent
  internal-workspace allowlist.
- Dependencies: none.
- Parallelizable: telemetry tests, rollback checklist, migration design review.
- Sequential: do this before enabling Phase 1 client behavior.
- Outputs: redacted event schema, sink smoke path, default-off guard,
  internal-workspace allowlist, SQL verification checklist, rollback/backout
  steps, and named owner for release toggling.
- Validation commands: `bunx vitest run tests/vitest/estimate-sheet-telemetry-events.test.ts --maxWorkers=1`, `git diff --check`.
- Tests: telemetry schema/redaction tests, sink smoke, and guard default-off
  assertion.
- Exit criteria: events can be emitted and inspected in non-production smoke;
  rollback triggers are documented; Phase 1a/1b may not start until the guard,
  fallback path, owner, and SQL checklist exist.
- Risks: console-only telemetry or raw row payload leakage.
- Rollback: disable telemetry calls or sink adapter; product path must continue.
  For integrity behavior, the Phase 0 artifact must specify client fallback to
  the old path during internal validation and the criteria for fix-forward
  migration body replacement versus disabling client handlers.

### Phase 1: Data integrity and partial-failure corrections

- Objective: remove launch-blocking partial-persistence and stale-tree risks.
- Requirements addressed: ESC-P0-01, ESC-P0-02, ESC-P1-03, ESC-P1-05,
  ESC-P1-07, source freshness TOCTOU, `row_moved` activity visibility.
- Inputs: Phase 0 telemetry/rollback, current row RPC patterns, row mutation
  hook, template revision-gate pattern, threat model, authz tests.
- Work packages: M-1 atomic move RPC/action/hook/client/activity/tests; M-2
  project-source revision gate/refetch; M-3 atomic bulk delete RPC/action/hook
  UX/tests; M-4 trust-gate stale-target and source-freshness decision; M-5
  read-only/mobile-readonly gating.
- Files/modules: `EstimateSheetContent.tsx`, `use-estimate-row-mutations.ts`,
  `actions.ts`, `estimate-row-tree-patch.ts`, activity files, Supabase
  migrations, generated types, prove script, row/cell/drop-zone components.
- Dependencies: Phase 0. M-1 and M-3 need migrations before client enablement.
- Parallelizable: M-1 and M-3 migration/action/test work can run in disjoint
  lanes; M-2 and M-4 are smaller client lanes.
- Sequential: deploy RPCs unused first; then client handlers; then read-only
  gating sweep; then prove script and manual failure QA.
- Outputs: `move_estimate_row_component_with_history`,
  `delete_estimate_row_items_bulk_with_history`, regenerated Supabase types,
  client handlers, `row_moved` activity support, tests.
- Validation commands: `bun run type-check`, `bun run lint`,
  `bun run lint:design-system`, `bun run lint:design`,
  `bunx vitest run tests/vitest/estimate-sheet-move-component-atomicity.test.tsx tests/vitest/estimate-sheet-project-source-insert-race.test.tsx tests/vitest/estimate-sheet-bulk-delete-atomicity.test.tsx tests/vitest/estimate-sheet-trust-gate-stale-target.test.tsx tests/vitest/estimate-sheet-readonly-mode.test.tsx --maxWorkers=1`,
  `npx supabase@2.98.2 db push`, `npx supabase@2.98.2 migration list`,
  `bun run prove:estimate-sheet-row-integrity`.
- Tests: atomic move, project-source race, bulk-delete atomicity, trust gate,
  read-only, action authz, activity history.
- Exit criteria: P0/P1 integrity tests and prove script pass; no partial
  persistence scenario remains for move or bulk delete.
- Risks: SQL transaction defect, widened grants, overbroad read-only gating,
  source freshness still outside transaction.
- Rollback: disable new client handlers first; leave inert RPCs if safe; fix
  forward migration body for SQL defects.

### Phase 2: Drag/drop validation and action equivalence

- Objective: make drag/custom-event inputs safe and provide non-pointer
  equivalents.
- Requirements addressed: ESC-P2-26, ESC-P1-09, ESC-P2-09, ESC-P2-10, Q14.
- Inputs: Phase 1 read-only gating, existing drag MIME constants, event map,
  trust-gate flows.
- Work packages: M-6 shared `readLibraryItemDragPayload`; M-6b custom-event
  validation; M-7 material-cell drop propagation; M-8 hover containment; M-9
  keyboard replace/move picker.
- Files/modules: `rows/constants.ts`, `row-table.tsx`, `cells.tsx`,
  `drop-zones.tsx`, `branch.tsx`, `EstimateSheetContent.tsx`, picker UI tests.
- Dependencies: Phase 1 handler surfaces and edit gating.
- Parallelizable: payload reader and hover/propagation tests can run
  independently from picker UX.
- Sequential: reader first, consumers second, telemetry assertions third.
- Outputs: guarded reader, updated consumers, rejected-event telemetry, picker.
- Validation commands: `bunx vitest run tests/vitest/estimate-sheet-library-drag-payload-reader.test.ts tests/vitest/estimate-sheet-custom-library-event-validation.test.tsx tests/vitest/estimate-component-drag.test.tsx --maxWorkers=1`.
- Tests: malformed/oversized/cross-scope/valid payloads, custom event reject,
  double-drop prevention, stale highlight, keyboard picker.
- Exit criteria: malformed payloads never throw; invalid custom events do not
  mutate; keyboard and drag/drop paths are equivalent for first-user tasks.
- Risks: hidden sidebar/custom-event path bypasses reader.
- Rollback: keep reader but disable picker or revert individual consumers if a
  regression appears.

### Phase 3: Row-save and cache reconciliation

- Objective: make overlapping row saves visible, row-local, and accessible.
- Requirements addressed: ESC-P1-04 and ESC-P1-08 row-status portions.
- Inputs: Phase 1 mutation surfaces, current `useSaveState`, row actions cell.
- Work packages: M-10 row-status map, chips, row live regions, conflict state,
  aggregate toast.
- Files/modules: `use-estimate-row-mutations.ts`, `cells.tsx`, `row-table.tsx`,
  `EstimateSheetContent.tsx`, toast tests.
- Dependencies: Phase 1 stable mutation results.
- Parallelizable: hook state model and row chip rendering can be split if test
  fixtures are shared.
- Sequential: hook state before UI chips; UI chips before a11y assertions.
- Outputs: per-row states `idle`, `saving`, `saved`, `failed`, `conflict`.
- Validation commands: `bunx vitest run tests/vitest/estimate-sheet-row-save-status-a11y.test.tsx tests/vitest/estimate-sheet-cost-inputs.test.tsx --maxWorkers=1`.
- Tests: two rapid edits, failed row among successes, aria-live assertions.
- Exit criteria: overlapping mutations show truthful row-local and global
  feedback.
- Risks: row-status map leaks stale statuses after filtering/tab changes.
- Rollback: retain global toast and disable row chips if necessary, but keep
  underlying mutation fixes.

### Phase 4: Authorization UX follow-through

- Objective: prove every read-only and mobile-readonly path is inert locally.
- Requirements addressed: ESC-P1-07 and mobile fallback decision.
- Inputs: Phase 1/2 row controls, sidebars, keyboard picker, custom events.
- Work packages: end-to-end static/DOM sweep of controls, drags, drops, sidebar
  insert callbacks, custom events, and keyboard picker.
- Files/modules: `EstimateSheetContent.tsx`, `branch.tsx`, `row-table.tsx`,
  `cells.tsx`, `drop-zones.tsx`, sidebar library consumers.
- Dependencies: Phase 1/2 must expose final handler surfaces.
- Parallelizable: UI control audit and event-path tests.
- Sequential: must run after all mutation affordances exist.
- Outputs: read-only matrix and fixed gaps.
- Validation commands: `bunx vitest run tests/vitest/estimate-sheet-readonly-mode.test.tsx tests/vitest/estimate-sheet-sidebar-library-consumers.test.tsx --maxWorkers=1`.
- Tests: viewer attempts every row mutation and mobile under 768px attempts
  edit-only workflows.
- Exit criteria: no local optimistic mutation starts for read-only users.
- Risks: `aria-disabled` controls can still fire handlers.
- Rollback: disable suspect affordance while preserving inspect/read paths.

### Phase 5: Destructive-action clarity and selection feedback

- Objective: distinguish destructive actions and announce selection changes.
- Requirements addressed: ESC-P2-08, ESC-P2-12, ESC-P2-13, Q1, Q2, Q19, Q20.
- Inputs: current row/cell actions, bulk toolbar, search/facet selection logic.
- Work packages: M-11 clear-component icon/copy; M-12 delete recovery/Undo
  policy; M-13 "Group" to "Sort"; M-14 selection-pruning announcement.
- Files/modules: `cells.tsx`, `row-table.tsx`, `EstimateSheetContent.tsx`,
  bulk toolbar tests.
- Dependencies: Phase 1 bulk-delete semantics.
- Parallelizable: copy/icon updates and selection announcement.
- Sequential: delete recovery copy must match final bulk/single delete behavior.
- Outputs: distinct clear/delete affordances, recovery copy, live pruning notice.
- Validation commands: `bunx vitest run tests/vitest/estimate-sheet-cost-inputs.test.tsx tests/vitest/estimate-tree-bulk-selection.test.tsx --maxWorkers=1`.
- Tests: string/icon/a11y assertions and selection-pruning live region.
- Exit criteria: destructive and recoverable actions are distinguishable and
  announced.
- Risks: Undo policy can imply recovery when server delete is already final.
- Rollback: revert copy/icon only; do not revert Phase 1 atomic delete.

### Phase 6: Accessibility

- Objective: bring the first-user center-sheet path to testable WCAG 2.2 AA
  target semantics.
- Requirements addressed: ESC-P1-08, ESC-P2-15, Q32, Q34.
- Inputs: final row table, row chips, focus targets, virtualization behavior.
- Work packages: M-15 table header scopes and virtual indexes; M-16 focus after
  insert under virtualization; M-17 reduced-motion-compatible scrolling.
- Files/modules: `row-table.tsx`, `cells.tsx`, `EstimateSheetContent.tsx`,
  a11y tests and manual SR checklist.
- Dependencies: Phases 1, 3, and 5.
- Parallelizable: static semantics and reduced-motion checks.
- Sequential: manual SR proof after DOM semantics pass.
- Outputs: DOM semantics, focus contract, reduced-motion branch, SR checklist.
- Validation commands: `bunx vitest run tests/vitest/estimate-sheet-a11y-row-semantics.test.tsx tests/vitest/estimate-sheet-row-save-status-a11y.test.tsx --maxWorkers=1`.
- Tests: table header scope, row/column indexes, row busy/error/live state,
  virtual focus.
- Exit criteria: targeted DOM a11y tests pass; manual SR residuals are recorded
  before any WCAG claim.
- Risks: virtualized table semantics remain imperfect due offscreen unmounting.
- Rollback: keep semantic fixes; disable only focus animation behavior if it
  causes regression.

### Phase 7: Performance and observability

- Objective: keep large-row editing inside the beta performance envelope and
  make regressions detectable.
- Requirements addressed: ESC-P1-06, ESC-P3-21, ESC-P3-25, operational
  telemetry requirements.
- Inputs: load limits, row virtualization code, perf tests, telemetry sink.
- Work packages: M-18 active-editor virtualization pinning; M-19 totals
  memoization if benchmarked hot; M-20 cursor anchor cache if runtime evidence
  supports it; perf baselines.
- Files/modules: `row-table.tsx`, totals helpers, cursor broadcast/rendering
  code, perf tests, telemetry dashboards.
- Dependencies: Phase 0 telemetry and Phase 6 semantics.
- Parallelizable: perf benchmark and telemetry dashboard work.
- Sequential: benchmark before optimization claims.
- Outputs: active-row range pinning, perf baseline artifacts, alerts.
- Validation commands: `bunx vitest run tests/vitest/estimate-row-table-virtualization.test.tsx tests/vitest/perf/estimate-sheet-render-baseline.test.tsx tests/vitest/perf/estimate-sheet-render-relief.test.tsx --maxWorkers=1`.
- Tests: pinned editor, 1k-row baseline, memoization relief if implemented.
- Exit criteria: budgets have measured baselines and telemetry can detect
  regressions.
- Risks: optimizing unmeasured paths adds complexity.
- Rollback: disable optional memo/cache changes; keep integrity telemetry.

### Phase 8: Post-launch component decomposition

- Objective: reduce `EstimateSheetContent.tsx` ownership after behavior is
  locked.
- Requirements addressed: ESC-P2-14 maintainability only.
- Inputs: passing characterization suite from Phases 1-7.
- Work packages: M-21 `useEstimateRowHandlers`; M-22
  `useEstimateTemplateInsertion`; M-23 `useEstimateHistoryPanel`; M-24
  `useEstimateProposalPreview`.
- Files/modules: `EstimateSheetContent.tsx` and new hook files.
- Dependencies: post-launch behavior lock.
- Parallelizable: extraction can split by hook only after shared interfaces are
  frozen.
- Sequential: add characterization tests first, extract one hook at a time.
- Outputs: smaller orchestrator with unchanged behavior.
- Validation commands: targeted DOM matrix plus `bun run type-check`.
- Tests: existing behavior tests plus characterization for promote, detach,
  move, bulk delete, project-source insert, proposal preview.
- Exit criteria: behavior unchanged; file size reduced; no launch blockers.
- Risks: refactor churn before first users.
- Rollback: revert extraction PR; keep earlier behavior fixes.

### Phase 9: Product enhancements

- Objective: handle deferred polish and product improvements after beta signals.
- Requirements addressed: ESC-P2-11, ESC-P3-16, ESC-P3-18, Q23, Q24, Q25.
- Inputs: beta feedback, perf telemetry, proposal/export usage, column-width
  storage behavior.
- Work packages: M-25 local column-width hardening/reset and future account
  sync decision; M-26 broader confirmation/Undo policy; M-27 proposal preview
  dirty-state banner; M-28 editable-total sort.
- Files/modules: column-width store, proposal preview, sorting logic, UX tests.
- Dependencies: not launch-blocking; account sync waits for post-1k-user
  decision.
- Parallelizable: proposal banner and local width hardening.
- Sequential: account-sync schema only after product decision.
- Outputs: polish enhancements with separate acceptance criteria.
- Validation commands: focused Vitest for changed modules; browser/manual only
  if interaction/responsive risk justifies it.
- Tests: local-storage, proposal dirty banner, sort parity.
- Exit criteria: enhancement-specific tests pass and no integrity regression.
- Risks: enhancements distract from launch integrity.
- Rollback: revert enhancement PRs independently.

## 13. File-Level Change Map

| File / path | Phase | Planned change | Tests / evidence |
| --- | --- | --- | --- |
| `src/components/workshop/EstimateSheetContent.tsx` | 1-6 | Rewrite move and bulk-delete handlers, project-source revision gate, trust-gate stale-target guard, read-only gating, selection announcements, focus/reduced motion. | Move atomicity, project-source race, bulk-delete atomicity, trust-gate, read-only, focus tests. |
| `src/hooks/use-estimate-row-mutations.ts` | 1,3 | Add atomic move/bulk APIs, structured errors, row-status map, aggregate save state. | Action/hook tests, concurrent save tests. |
| `src/lib/estimates/actions.ts` | 1 | Add `moveEstimateRowComponent`, `deleteEstimateRowItemsBulk`, structured error normalization; ensure new/touched source-bearing writes use DB-transaction source freshness. | `estimate-sheet-actions-authz.test.ts`, prove script. |
| `src/lib/estimates/estimate-row-tree-patch.ts` | 1 | Add multi-row move patch and bulk-delete reconciliation helpers. | `estimate-row-tree-patch.test.ts`. |
| `src/lib/supabase/types.ts` | 1 | Regenerate after migrations. | Typecheck and schema tests. |
| `supabase/migrations/*move_estimate_row_component_with_history*.sql` | 1 | Create atomic move RPC, grants, comments. | Migration tests and prove script. |
| `supabase/migrations/*delete_estimate_row_items_bulk_with_history*.sql` | 1 | Create atomic bulk row delete RPC, grants, comments. | Migration tests and prove script. |
| `scripts/prove-estimate-sheet-row-integrity-postgres.mjs` | 1 | Prove authz denial, revision conflicts, atomic rollback, history events. | `bun run prove:estimate-sheet-row-integrity`. |
| `src/components/workshop/estimate-sheet/rows/constants.ts` | 2 | Add guarded library item drag payload reader. | Payload reader tests. |
| `rows/row-table.tsx` | 1,2,5,6,7 | Read-only controls, remove unsafe root drop, use shared payload reader, table semantics, virtualization pinning. | Read-only, payload, a11y, virtualization/perf tests. |
| `rows/cells.tsx` | 1,2,3,5,6 | Read-only clear/promote/drag/drop gating, shared payload reader, row chips, clear/delete copy, live state. | Read-only, drag, row save, a11y tests. |
| `rows/drop-zones.tsx` | 1,2 | Read-only add/drop gating, shared payload reader, stable hover logic. | Drop-zone tests. |
| `rows/branch.tsx` | 1,2 | Thread edit/mobile flags and drop-zone state. | Read-only and drop-zone tests. |
| `activity-history.tsx` and model/composer files | 1 | Add `row_moved` labels, filters, summaries, details. | Activity UI tests. |
| `src/lib/estimates/express-components-telemetry.ts` or new telemetry file | 0,7 | Move from console-only event posture to shared sanitized sink for center sheet. | Telemetry event/redaction tests. |
| `tests/vitest/estimate-sheet-bulk-row-delete-partial-failure.test.tsx` | 1 | Replace/invert broken-behavior assertions for all-or-nothing semantics. | Targeted DOM matrix. |
| New `tests/vitest/estimate-sheet-*.test.tsx` files | 1-7 | Add focused regression and a11y/perf tests from Section 14. | Targeted Vitest. |
| New `e2e/estimate-sheet-*.spec.ts` files | 1 | Env-gated mutating DnD/bulk smoke tests. | Optional Playwright with explicit env. |

## 14. Testing Strategy

Principles:

- New P0/P1 tests should fail before implementation, or explicitly replace a
  current broken-behavior test.
- Prefer targeted Vitest and prove scripts over full `bun run validate` during
  the implementation loop because current FAST PATH documents unrelated main
  reds and possible DOM hangs.
- Run broader validate/build only when risk justifies the time and known reds
  are separated.
- Browser/E2E is opt-in evidence for interaction paths such as mutating DnD and
  bulk delete, not a default planning-document gate.

Required new tests:

- `estimate-sheet-move-component-atomicity.test.tsx`: both succeed, target
  fails, source fails, both fail, reverse/out-of-order responses.
- `estimate-sheet-project-source-insert-race.test.tsx`: late full-tree response
  does not overwrite newer local edit; refetch path is called.
- Replace or invert `estimate-sheet-bulk-row-delete-partial-failure.test.tsx`.
- `estimate-sheet-bulk-delete-atomicity.test.tsx`: one failed row means zero
  selected rows are deleted and copy says nothing was deleted.
- `estimate-sheet-trust-gate-stale-target.test.tsx` and source-changed coverage.
- `estimate-sheet-readonly-mode.test.tsx`: every row mutation path is disabled
  or inert for viewers and mobile fallback.
- `estimate-sheet-library-drag-payload-reader.test.ts`: malformed, oversized,
  cross-scope, valid payloads.
- `estimate-sheet-custom-library-event-validation.test.tsx`: malformed custom
  events rejected before local mutation/trust gate.
- `estimate-sheet-a11y-row-semantics.test.tsx`: scope/index/live/busy/error
  semantics.
- `estimate-sheet-row-save-status-a11y.test.tsx`: row statuses announce without
  misleading global toast.
- `estimate-sheet-row-virtualization-editor-pinned.test.tsx`: active editor
  remains mounted while virtualized.
- Extend `estimate-sheet-actions-authz.test.ts` for new server actions and
  viewer denial before write RPC.
- Add migration/RPC proof script: `scripts/prove-estimate-sheet-row-integrity-postgres.mjs`.
- Add an RPC auth matrix in the prove script or a documented Supabase test
  environment:
  - direct anon RPC call rejected;
  - authenticated editor accepted;
  - authenticated viewer rejected;
  - cross-workspace/project/estimate ids rejected;
  - service-role behavior explicitly scoped and never used as product proof;
  - actor attribution equals `auth.uid()` and cannot be spoofed by direct RPC
    calls.

Focused implementation commands:

```bash
bun run type-check
bun run lint
bun run lint:design-system
bun run lint:design
git diff --check
```

Targeted DOM matrix:

```bash
bunx vitest run \
  tests/vitest/estimate-sheet-cost-inputs.test.tsx \
  tests/vitest/estimate-sheet-library-insert.test.tsx \
  tests/vitest/estimate-sheet-bulk-row-delete-partial-failure.test.tsx \
  tests/vitest/estimate-sheet-actions-authz.test.ts \
  tests/vitest/estimate-row-table-virtualization.test.tsx \
  tests/vitest/estimate-sheet-activity-history-ui.test.tsx \
  --maxWorkers=1
```

After new tests exist:

```bash
bunx vitest run \
  tests/vitest/estimate-sheet-move-component-atomicity.test.tsx \
  tests/vitest/estimate-sheet-project-source-insert-race.test.tsx \
  tests/vitest/estimate-sheet-bulk-delete-atomicity.test.tsx \
  tests/vitest/estimate-sheet-trust-gate-stale-target.test.tsx \
  tests/vitest/estimate-sheet-readonly-mode.test.tsx \
  tests/vitest/estimate-sheet-library-drag-payload-reader.test.ts \
  tests/vitest/estimate-sheet-custom-library-event-validation.test.tsx \
  --maxWorkers=1
```

Database/RPC gates:

```bash
npx supabase@2.98.2 db push
npx supabase@2.98.2 gen types typescript --project-id ebxxqidacheyapmmzavr > src/lib/supabase/types.ts
npx supabase@2.98.2 migration list
bun run prove:estimate-sheet-row-integrity
```

Env-gated E2E smoke:

```bash
ARCHESTIMATOR_E2E_MUTATING_DND=1 ARCHESTIMATOR_DEV_AUTH_BYPASS=1 bun run test:e2e -- e2e/estimate-sheet-move-component.spec.ts --project=chromium
ARCHESTIMATOR_E2E_ESTIMATE_SHEET_BULK_DELETE=1 ARCHESTIMATOR_DEV_AUTH_BYPASS=1 bun run test:e2e -- e2e/estimate-sheet-bulk-delete.spec.ts --project=chromium
```

Performance/a11y targeted:

```bash
bunx vitest run \
  tests/vitest/estimate-row-table-virtualization.test.tsx \
  tests/vitest/perf/estimate-sheet-render-baseline.test.tsx \
  tests/vitest/perf/estimate-sheet-render-relief.test.tsx \
  --maxWorkers=1
bun run storybook:check-components
```

Manual QA checklist:

- Move component with throttled target failure, source failure, both failure.
- Bulk delete five rows with one forced revision conflict.
- Project-source insert resolving after local row edit.
- Trust gate open while target area is deleted.
- Viewer and mobile-readonly attempts on every mutation affordance.
- Malformed drag payload and malformed custom event injection.
- Non-default tab for move, insert, bulk delete, and read-only paths.
- Offline/timeout mid-bulk operation.
- 1k-row active editor latency.
- NVDA or VoiceOver path through row headers, row status, errors, and delete
  recovery.

## 15. Deployment/Rollout

Recommended rollout:

1. Phase 0: ship telemetry sink, dashboards/events, and the
   `estimateSheetIntegrityV2` default-off guard or an equivalent
   internal-workspace allowlist. Record the release owner and SQL verification
   checklist in the PR.
2. Phase 1a: deploy new RPCs unused by the client; smoke authz, actor
   derivation, actor-spoof rejection, revision conflict, row-count cap, event
   writes, and rollback.
3. Phase 1b: enable client move and bulk paths for an internal workspace only
   through the guard/allowlist. Keep the old client path available only during
   internal validation and remove or permanently disable it before external
   rollout unless an owner explicitly approves a degraded emergency fallback.
4. Phase 1c: enable closed beta after 7 days of clean telemetry or enough manual
   pilot usage to cover the scenario matrix.
5. Phase 2+: ship validation/a11y/perf phases in smaller reversible PRs after
   Phase 1 integrity is stable.

Rollback:

- Roll back client route/handler usage first.
- Keep unused RPCs if inert, backward-compatible, and grants are correct.
- Revert/drop migrations only if they break existing RPCs, grants, or RLS.
- Maintain and execute a manual SQL verification checklist for row counts,
  history events, grants, actor attribution, no partial move/bulk states, and no
  cross-workspace writes.
- Fix forward by replacing RPC bodies when possible. Do not run destructive data
  rollback against `estimate_row_items` or `estimate_sheet_events` without a
  fresh recovery plan and owner instruction.

Rollback triggers:

- Any partial move outcome or rollback-failed telemetry.
- Any cross-estimate or cross-workspace write signal.
- Row mutation 5xx rate above 0.5 percent for 30 minutes.
- Project-source revision mismatch above 0.1 percent sustained.
- Move/bulk RPC p95 above 500ms sustained.
- p95 row edit latency above 100ms for beta users.
- Support report of missing or duplicated moved component.

## 16. Observability/Ops

Required telemetry events:

- `row_moved_outcome`
- `bulk_delete_outcome`
- `bulk_delete_atomic_failure`
- `bulk_delete_retry`
- `project_source_insert_revision_mismatch`
- `trust_gate_stale_target`
- `malformed_library_drag_payload`
- `custom_library_item_event_rejected`
- `readonly_mutation_attempt_blocked`
- `row_save_status_outcome`

Required properties:

- operation id or correlation id;
- estimate/workspace/project identifiers only if already allowed in internal
  telemetry and not exposed to user-facing analytics;
- row counts, not row names;
- reason codes, not raw error strings when error strings may contain provider
  detail;
- duration bucket and success/failure classification;
- client version/build if available.

Alerts:

- Page: any `row_moved_outcome=partial_or_rollback_failed`.
- Warn: bulk atomic failure above 1 percent.
- Warn: project-source revision mismatch above 0.1 percent.
- Warn: move/bulk RPC p95 above 500ms.
- Warn: malformed payload spike.
- Warn: load/export limit errors increasing after rollout.

Dashboards:

- Row integrity operations by event type and outcome.
- RPC latency p50/p95/p99.
- Revision conflicts by operation.
- Read-only blocked attempts.
- Payload rejection counts.
- Large-row editor perf baseline.

## 17. Risk Register

| Risk | Severity | Probability | Impact | Owner | Mitigation | Detection method | Contingency |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Atomic move RPC defect creates partial or wrong-row state. | P0 | Medium | Data corruption / duplicate or missing component | Backend owner | One transaction, deterministic locks, revision checks, deploy unused first, prove script, E2E smoke. | M-1 tests, prove script, `row_moved_outcome` telemetry, manual SQL check. | Disable guarded client path, leave inert RPC if safe, replace RPC body with fix-forward migration. |
| Bulk delete still partially deletes rows. | P1 | Medium | Irrecoverable user confusion and data loss perception | Backend owner | Validate all rows before deleting any; abort whole transaction on any failure. | M-3 tests, prove script, bulk telemetry, SQL row-count check. | Disable bulk client path and keep single-row delete only until fixed. |
| Project-source response hides newer local edits. | P1 | Medium | Visible tree divergence | Frontend owner | Local revision gate and refetch on mismatch. | Race test and `project_source_insert_revision_mismatch` telemetry. | Disable project-source insert from center sheet until refetch path is fixed. |
| Read-only viewer can trigger local optimistic mutation. | P1 | Medium | Unauthorized-looking local state and trust erosion | Frontend owner | Gate controls, drags, drops, custom events, keyboard picker, and sidebars. | Read-only DOM matrix and blocked-attempt telemetry. | Disable mutation affordance family while preserving read-only inspection. |
| Source freshness remains TOCTOU. | P1 | Medium | Stale source snapshots persisted | Backend owner | Transaction-local source freshness for new/touched source-bearing writes; no telemetry-only acceptance. | Source freshness prove tests and stale-source simulation. | Do not external-launch affected path; disable/fallback source-bearing commit until transactional check lands. |
| Telemetry leaks sensitive row data. | P1 | Low | Privacy breach in operational logs | Platform owner | Redaction schema tests and no raw snapshots/free text/actor emails. | Telemetry unit tests and sample payload review. | Disable telemetry sink and purge bad event stream per provider policy. |
| New RPC grants widen access. | P0 | Low | Unauthorized write capability | Backend owner | Revoke public/anon, grant authenticated only, assert edit inside RPC using `auth.uid()`. | Migration tests, auth matrix, prove script. | Revoke execute grants immediately; replace RPC body or drop function if needed. |
| Actor spoofing in SECURITY DEFINER RPCs. | P0 | Low | Tampered history/authz attribution | Backend owner | Derive actor from `auth.uid()` and reject caller-supplied actor ids. | Direct RPC spoof tests and history actor assertions. | Disable RPC execute grants; ship hardening migration before re-enable. |
| Virtualized table remains inaccessible. | P1 | Medium | Screen-reader users blocked | Frontend/a11y owner | DOM semantic tests plus manual SR checklist. | A11y tests, NVDA/VoiceOver notes. | Document residual, disable WCAG claim, prioritize targeted semantic fix. |
| Express editor perf cliff persists. | P1 for large areas | Medium | Large-area editing unusable | Frontend/perf owner | Pin active row while virtualization stays on; benchmark. | Perf Vitest and 1k-row manual profile. | Keep row caps, disable large-area inline editor if necessary. |
| Phase 8 decomposition changes behavior. | P2 | Medium | Regression after integrity fixes | Frontend owner | Defer until behavior lock; run characterization tests before extraction. | Existing + new tests. | Revert extraction PR; keep behavior fixes. |
| Full `validate` red obscures changed-scope failures. | P2 | High | False confidence or wasted cycles | Lead owner | Use targeted matrix first; document unrelated reds before broad validate. | FAST PATH and command output. | Report skipped/broader validation gap with exact pre-existing failure evidence. |

## 18. Pros/Cons

Pros:

- Removes real data-integrity risk before first users depend on the surface.
- Uses existing architecture, query revisions, row mutation hooks, and RPC
  patterns instead of a rewrite.
- Improves UX trust by aligning feedback with actual row-level state.
- Makes read-only behavior coherent across visible controls and hidden event
  paths.
- Creates measurable telemetry for the riskiest operations.
- Keeps post-launch maintainability work separated from launch integrity work.

Cons:

- Adds two database RPCs and a prove script before visible UX polish.
- Requires careful SQL transaction and grant review.
- Touches several row-rendering components to propagate edit gating.
- Test setup grows, especially around failure injection and env-gated E2E.
- WCAG claims still require manual runtime proof; static DOM tests are not
  enough.

Rejected alternatives:

- Client-side compensating move transaction: rejected because it cannot safely
  recover from partial persistence after concurrent edits.
- Partial-success bulk delete: rejected because it gives users a recovery
  problem after a single action.
- Disabling move/bulk workflows: rejected because it removes useful workflows
  and leaves underlying architecture ambiguous.
- Full component decomposition first: rejected because it increases churn before
  behavior is locked.
- Account-wide column-width schema now: rejected for beta until usage proves
  cross-device pain.

## 19. SWOT

Strengths:

- Existing audit package is deep and traceable.
- Current code has reusable revision, mutation-id, expected-revision, and patch
  patterns.
- Existing server actions and RPCs already model edit access and history.
- Test inventory is broad enough to add focused regression coverage without
  inventing a new harness.

Weaknesses:

- `EstimateSheetContent.tsx` is a large orchestrator with many coupled states.
- Current save state is global rather than row-local.
- Source-trust freshness is partly outside DB transactions.
- A11y and perf proof are mostly static/inferred today.

Opportunities:

- Telemetry can turn first-user risk into measurable signals.
- Atomic row-operation contracts create reusable patterns for future estimate
  editing.
- Keyboard replace/move picker can become the basis for faster power-user flows.
- Behavior-locking tests make later decomposition safer.

Threats:

- SQL transaction mistakes could create worse data-integrity issues than the
  current client bugs.
- Overbroad gating could accidentally disable legitimate editor workflows.
- Hidden custom-event or sidebar paths can bypass visible UI controls if not
  explicitly tested.
- Known unrelated validation reds can mask new failures if not isolated.

## 20. Requirements Traceability Matrix

| Requirement | Source | Implementation phase | Work package | Acceptance criterion | Test coverage | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Atomic move component | `15-PRIORITIZED-FINDINGS.md` ESC-P0-01; `19` P0 | Phase 1 | M-1 | One RPC updates both rows or neither; `row_moved` history renders. | Move atomicity tests, action authz tests, prove script, optional DnD E2E | Planned |
| Project-source race, severity P1 | `15` ESC-P0-02; `08`; `19` P1 | Phase 1 | M-2 | Late full-tree response never overwrites newer local revision; refetch path runs. | Project-source race test | Planned |
| Atomic bulk delete | `15` ESC-P1-03; `18` Q3; `19` P1 | Phase 1 | M-3 | One failed row means no selected rows deleted; copy says nothing was deleted. | Bulk-delete atomicity tests, prove script, optional E2E | Planned |
| Per-row save feedback | `15` ESC-P1-04; `18` Q30/Q36 | Phase 3 | M-10 | Row chips and summary toast truthfully report overlapping saves/failures. | Concurrent save and a11y tests | Planned |
| Trust-gate stale target and source freshness | `15` ESC-P1-05; `21` A2; `22` T6 | Phase 1 | M-4 | Confirm disables when target is gone; source freshness is transactional for new/touched source-bearing writes. | Stale target/source-changed tests and source freshness prove tests | Planned |
| Active-editor virtualization cliff | `15` ESC-P1-06; `11` | Phase 7 | M-18 | Virtualization remains on; active editor stays mounted; latency budget measured. | Virtualization pinned editor and perf tests | Planned |
| Read-only mutation controls | `15` ESC-P1-07; `18` Q26 | Phase 1 / Phase 4 | M-5 | No local optimistic mutation can start for viewer/mobile-readonly paths. | Read-only mode matrix | Planned |
| Virtualized table a11y | `15` ESC-P1-08; `10`; `18` Q32/Q34 | Phases 3 and 6 | M-10, M-15, M-16, M-17 | WCAG 2.2 AA target checks pass or residuals documented. | DOM a11y tests, manual SR proof | Planned |
| Custom library event validation | `15` ESC-P1-09; `01`; `22` T5 | Phase 2 | M-6b | Invalid event detail rejected before mutation/trust gate. | Custom event validation test | Planned |
| Library drag payload validation, severity P1 | `15` ESC-P2-26; `05`; `13` | Phase 2 | M-6 | Guarded reader shared by all paths; telemetry records rejects. | Payload reader tests | Planned |
| Clear/delete confusion | `15` ESC-P2-08; `18` Q1/Q2 | Phase 5 | M-11/M-12 | Clear and delete are distinct; recovery/Undo policy implemented. | Visual/a11y assertions | Planned |
| Material-cell drop propagation | `15` ESC-P2-09; `05` | Phase 2 | M-7 | Handler stops propagation before any branch can append accidentally. | Double-drop test | Planned |
| Drag highlight underflow | `15` ESC-P2-10; `05` | Phase 2 | M-8 | Hover state clears deterministically. | Highlight stale-state test | Planned |
| Column width leakage | `15` ESC-P2-11; `18` Q23 | Phase 9 | M-25 | Beta local persistence hardened; account sync deferred. | Local-storage tests | Post-launch |
| Silent selection pruning | `15` ESC-P2-12; `18` Q19 | Phase 5 | M-14 | Pruned selection count is announced. | Aria-live assertion | Planned |
| "Group" label misleading | `15` ESC-P2-13; `18` Q20 | Phase 5 | M-13 | Label says "Sort" and copy matches behavior. | String/unit assertion | Planned |
| Orchestrator size | `15` ESC-P2-14 | Phase 8 | M-21..M-24 | Extraction changes no behavior and is post-launch. | Characterization suite | Post-launch |
| Inserted-row focus budget | `15` ESC-P2-15; `18` Q32 | Phase 6 | M-16 | Focus is deterministic under virtualization. | Virtualized focus test | Planned |
| Telemetry sink, severity P2 | `15` ESC-P3-22; `16` M-0T; `22` T12 | Phase 0 / Phase 7 | M-0T | Integrity workflow events reach sink with redacted payloads. | Telemetry redaction/sink tests | Planned |
| Orphan server row after local draft deletion | `04-ROW-CRUD-AUDIT.md`; `14` failure matrix; `21` multi-client gaps | Phase 1 / Phase 3 | M-1/M-10 validation | Uncertain insert/delete retry states reconcile or visibly require refresh; no silent orphan remains hidden. | Failure-injection DOM test or explicit residual with owner signoff | Planned |
| Edit/delete/replace/detach rollback conflicts | `14-EDGE-CASE-AND-TEST-MATRIX.md`; `08` rollback audit | Phase 1 / Phase 3 | Mutation rollback suite | Conflicting row operations end in canonical state or conflict chip with refetch. | Deferred promise tests for stale/out-of-order responses | Planned |
| Tab delete while row mutation is in flight | `14`; `21` adversarial gaps | Phase 1 / Phase 4 | Read-only/authz and query invalidation checks | In-flight mutation cannot patch deleted/off-tab tree without refetch/reconciliation. | Targeted in-flight mutation test or documented residual | Planned |
| Multi-client same-row optimistic conflict | `14`; `21`; `08` concurrency audit | Phase 3 / Phase 7 | Conflict telemetry and row chip | Conflict is row-local, announced, and refetches canonical state. | Two-context or deferred mutation test | Planned |
| Offline mid-bulk reconciliation | `14`; `21`; testing lane UltraQA matrix | Phase 1 / Phase 7 | Bulk delete failure handling | Timeout/offline leaves no ambiguous partial delete; user sees pending/retry/refetch state. | Bulk offline/timeout test and manual QA | Planned |

## 21. Definition of Done

Global DoD before claiming implementation complete:

- All P0/P1 tasks have tests that fail before implementation or explicitly
  replace current broken-behavior tests.
- `git diff --check` passes.
- `bun run type-check`, `bun run lint`, `bun run lint:design-system`, and
  `bun run lint:design` pass or unrelated pre-existing failures are documented
  with exact evidence.
- Targeted DOM matrix passes.
- New RPC migrations apply to Archestimator Supabase project
  `ebxxqidacheyapmmzavr`; types regenerate.
- `bun run prove:estimate-sheet-row-integrity` passes.
- Viewer authz denial is proven before write RPCs.
- RPC auth matrix proves anon rejection, editor acceptance, viewer rejection,
  cross-workspace rejection, scoped service-role behavior, and actor attribution
  from `auth.uid()`.
- Activity history renders `row_moved`.
- Move, bulk delete, project-source race, stale trust gate, read-only, malformed
  payload, and custom-event tests pass.
- Manual QA records throttled move and bulk-delete failure behavior.
- A11y DOM tests pass and manual SR residuals are documented before any WCAG
  conformance claim.
- Runtime perf baseline exists before increasing limits or claiming perf
  improvement.
- Rollback triggers and telemetry dashboards/events are present before external
  rollout.
- No unrelated worktree changes are reverted.

Phase 1 cannot close unless:

- Move and bulk delete are transactionally atomic at DB level.
- Project-source full-tree response is revision-gated.
- Trust-gate stale target disables confirm.
- Read-only viewer/mobile fallback cannot start optimistic mutation.
- Source freshness TOCTOU is closed transactionally for new/touched
  source-bearing writes. Any deferred existing source-bearing path is not
  external-launch acceptable without explicit owner signoff plus a disabled or
  fallback behavior.

## 22. Open Decisions

No product/planning blocker remains. The decision ledger provides defaults for
the first implementation pass.

Implementation decisions to make explicit in the first PR:

- Rollout mechanism: use `estimateSheetIntegrityV2` or an equivalent
  internal-workspace allowlist. It must be default-off, owner-named, tested, and
  paired with SQL verification before Phase 1a/1b.
- Source freshness: move source freshness checks into the same DB transaction
  for new/touched source-bearing writes. Deferrals require owner signoff and are
  not external-launch acceptable by default.
- Bulk delete cap: default to 100 rows for beta unless implementation evidence
  justifies a different cap.
- Telemetry sink: use the sanitized component-library telemetry style, not raw
  console-only express telemetry.
- Manual QA owner: record who runs the throttled move, bulk delete, non-default
  tab, mobile-readonly, and SR checks before closed beta.
- E2E scope: run mutating Playwright only with explicit env/auth setup and
  isolated cleanup.

Implementation stop condition:

- Stop at Phase 1 if any atomicity, authz, or rollback proof fails. Do not
  continue into polish/decomposition until the integrity path is proven.
