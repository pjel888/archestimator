---
title: Estimate Sheet Orchestration Loop Ledger
type: docs
date: 2026-06-25
---

# Loop Ledger

## 2026-06-25 Cycle 0: Setup

Mode: planning-only orchestration.

Inputs:

- User-specified target folder.
- User-specified planning prompt `.ai/08_prompts/000_Planning Prompts/Improve-Plan-Prompt.md`.
- Pasted planning directive attachment `/Users/philiplewis/.codex/attachments/e3d001f1-dfb4-43ee-9821-1a2471a2a0fc/pasted-text-1.txt`.
- Three source plan folders.

Actions:

- Read `AGENTS.md`, `.ai/10_state/current-state.md` fast path, relevant `.ai/00_system` protocol, requested skills, and planning prompt.
- Created target folder and `00_AGENT_COORDINATION.md`.

Evidence:

- No app/source-plan implementation files intentionally modified.
- Initial dirty worktree recorded in coordination notes from the original package-creation pass.

## 2026-06-25 Cycle 1: Source Plan Audits

Subagents:

- Center source-plan auditor: complete.
- Right sidebar source-plan auditor: complete.
- Tree sidebar source-plan auditor: complete.
- UX/a11y lane: complete.
- Validation lane: complete.
- Architecture mapper: closed after unusable partial output; lead targeted source audit filled the evidence gap.
- Planner/blast-radius lane: complete.
- Data-integrity replacement lane: complete after first data/security lane hit model capacity.

Key synthesis:

- Center Phase 0/1 data integrity is launch-blocking.
- Right Phase 1 persistence honesty must be one coherent bundle.
- Tree is a dependency lane for route/selection/cache/event contracts.
- UX policy selects grid dominance, disabled-not-hidden read-only reasons, snapshot-copy language, and explicit below-1024 fallback.
- Validation policy selects targeted RED->GREEN as merge blockers and treats broad validation as final/interpretable.

## 2026-06-25 Cycle 2: First Draft

Actions:

- Drafted package files `README.md` through `13_FINAL_READINESS_REVIEW.md` plus this ledger.
- Updated coordination ledger with completed specialist evidence.
- Ran lead self-critique and revised phase model to reconcile planner/data-integrity sequencing.
- Added MOP-0 project-boundary, live schema/RLS/grant introspection, and telemetry storage proof.

Closed:

- Initial independent verifier pass found stale status text, external dirty-state classification ambiguity, and missing center `M-*` source-ID coverage.
- Follow-up revisions updated package status, todo/readiness gates, dirty-worktree classification, and `14_SOURCE_ID_COVERAGE_APPENDIX.md`.

## 2026-06-25 Cycle 3: Adversarial Review And Revision

Reviewer:

- Specialist adversarial reviewer: complete.

Findings:

- Source-ID coverage needed explicit proof instead of requirement-level synthesis alone.
- Quick-win UI/a11y semantics needed a separate early phase.
- Migration rollback/fix-forward posture needed migration-specific runbooks.
- Tree security/privacy threats needed explicit master-plan coverage.
- Ownership needed conflict-proof RACI for shared files.
- Validation needed exact starting commands and RED/GREEN expectations.

Revisions:

- Added `14_SOURCE_ID_COVERAGE_APPENDIX.md`.
- Added MOP-0.5 quick UI/a11y preflight across the master sequence, plan, todo, and traceability matrix.
- Added migration runbooks, RACI, security/privacy risk rows, and exact validation commands.

Closed:

- Second independent verifier pass found no substantive content blockers after the prior fixes.
- Remaining stale coordination/ledger bookkeeping is reconciled in this cycle.

## 2026-06-25 Cycle 4: Final Verification Bookkeeping

Verifier:

- Independent verifier rerun: substantive package complete; bookkeeping-only fail.

Actions:

- Marked lead coordinator findings/conflicts/status complete.
- Marked final verifier row with pass-2 evidence.
- Closed prior open ledger items and requested a clean verifier rerun after bookkeeping reconciliation.

Closed:

- Final narrow verifier rerun returned PASS with no blocking findings.
- Final verifier PASS recorded in `README.md`, `00_AGENT_COORDINATION.md`, and `13_FINAL_READINESS_REVIEW.md`.
- Final artifact checks run after verifier PASS: all expected package files present; key coverage anchors present; placeholder scan contains only intentional future implementation fields or non-placeholder phrases; `git diff --check` is clean; original package-creation notes still recorded pre-existing external dirty state.

## 2026-06-25 Cycle 5: Continuation Reconciliation

Mode: planning-package audit and documentation-only correction.

Inputs:

- Active Codex durable goal continuation.
- User-specified planning prompt `.ai/08_prompts/000_Planning Prompts/Improve-Plan-Prompt.md`.
- Pasted planning directive attachment.
- Current worktree evidence from `git status --porcelain=v1`.

Actions:

- Re-read the requested skills, prompt, pasted directive, package files, and relevant `.ai` source-of-truth snippets.
- Launched six read-only document-audit subagents for coherence, feasibility, security, design, scope, and adversarial review.
- Corrected stale bookkeeping that treated original dirty-worktree caveats as current state and fixed the prompt-path reference from `Creating-Plan-Prompt.md` to `Improve-Plan-Prompt.md`.
- Applied independent coherence, scope, design, and security review findings: corrected critique-cycle numbering and readiness-score wording; added explicit below-1024 fallback, selected keyboard move model, permission matrix, a11y state/focus matrix, right-sidebar authz gates, bounded search/privacy requirements, and RPC security-posture runbook requirements.
- Applied independent feasibility and adversarial review findings: corrected the tree DnD command to the existing `estimate-sheet-tree-dnd.test.tsx`, added numeric performance budgets, expanded source-ID coverage for decision and edge-case IDs, and added the prompt-required scorecard/completion audit.

Evidence:

- `git status --porcelain=v1` returned no output before this reconciliation pass.
- Source plan folder counts and line totals still match the inventory: center 25 / 5,800, right 35 / 7,645, tree 21 / 6,394.
- Edits remain docs-only and confined to this orchestration package.

Stop condition:

- Fresh independent verifier, code-review, architect review, and final static checks must pass before completion.

## 2026-06-25 Cycle 6: Continuation Verification And Review Closure

Mode: final docs-only verification.

Verifier:

- Fresh independent continuation verifier: PASS.
- Continuation code-reviewer: requested two bookkeeping fixes; resolved in this cycle.
- Narrow architect rerun: PASS.
- Narrow verifier/code-review reruns found only this ledger's conditional stop-condition wording; resolved by this final closure entry.

Actions:

- Updated coordination, todo, readiness, README, and scorecard status so current final-verified claims refer to the fresh continuation verifier, not the older pre-continuation PASS.
- Recorded that post-continuation artifact checks were rerun.

Evidence:

- Fresh verifier confirmed docs-only scope, prompt-required scorecards, expanded source-ID coverage, corrected status wording, exact `estimate-sheet-tree-dnd.test.tsx` path, numeric budgets, security/authz/search/RPC posture, below-1024 fallback, selected keyboard model, and a11y/focus matrices.
- Final static checks were rerun after continuation edits: package inventory contains 18 files, stale-status scan has no blockers, scoped `git status` shows only target-package docs, and `git diff --check -- .ai/03_plans/2026-06-25-Estimate-Sheet-Orchestration` is clean.

Stop condition:

- Complete: final static checks are clean, fresh verifier PASS is recorded, architect rerun is clean, continuation code-review findings are resolved, and the package remains docs-only.

## 2026-06-25 Cycle 7: Implementation MOP-0 And MOP-0.5

Mode: implementation run, scoped to MOP-0 preflight and MOP-0.5 quick UI/a11y.

Actions:

- Created branch `codex/estimate-sheet-orchestration`.
- Added implementation ledger and evidence folder under this package.
- Launched read-only data, center, right, tree/share, validation, and UX/a11y
  mapping lanes; tree/share subagent hit context exhaustion, so the lead
  recovered a narrow local tree/share pass.
- Ran MOP-0 local baseline and hosted read-only Supabase preflight against
  linked project `ebxxqidacheyapmmzavr`.
- Added RED tests for MOP-0.5 side-panel `aria-controls`, estimate-tree empty
  state copy/CTA, and below-desktop fallback notice.
- Implemented the MOP-0.5 quick wins in `ResizableSidePanel`,
  `EstimateSheetTree`, and `EstimateWorkspaceClient`.
- Updated stale adjacent static governance tests to current source contracts
  (`useMediaQuery` and `estimate-surface-class.ts`).

Evidence:

- MOP-0 baseline: `bun run type-check` passed; focused Vitest groups passed
  2 files / 10 tests, 2 files / 15 tests, 3 files / 32 tests, and 2 files /
  10 tests.
- Hosted preflight: `supabase migration list --linked` and SELECT-only
  metadata introspection completed with no DDL/DML/provider setting changes.
  Drift was recorded: linked remote is missing the proposed center RPCs and did
  not return `delete_estimate_nodes_bulk_with_history`.
- MOP-0.5 RED command failed before implementation on the three intended
  missing contracts.
- MOP-0.5 GREEN: focused tests passed 3 files / 14 tests; adjacent
  side-panel governance tests passed 2 files / 6 tests; `bun run type-check`
  and `git diff --check` passed.

Stop condition:

- MOP-0 and MOP-0.5 are ready to hand off to MOP-1. The overall
  estimate-sheet orchestration goal remains open; MOP-1 through MOP-5, review,
  and UltraQA are not complete.

## 2026-06-25 Cycle 8: Implementation MOP-1 Right Sidebar

Mode: implementation run, scoped to right-sidebar persistence honesty and
bounded reusable-source search/copy contracts.

Actions:

- Added RED tests for server-backed archive behavior, removal of local-only
  edit/duplicate affordances, latest-wins project-source search, snapshot-copy
  preview language, duplicate identity normalization, telemetry raw-query
  privacy, and local-only template-group creation removal.
- Reused existing component-library archive preview/execute actions in the
  estimate right sidebar with preview hash and correlation id.
- Removed right-sidebar local-only component Edit/Duplicate actions.
- Removed the right-sidebar local-only empty custom template group creator.
- Hardened reusable project-source search with an explicit request id.
- Updated project-source preview chips to snapshot-copy language.
- Normalized Add Component duplicate detection with trim, whitespace collapse,
  and lowercase comparison while preserving supplier OR brand matching.

Evidence:

- MOP-1 RED: focused suite initially failed on archive/delete copy, local
  Edit/Duplicate/Delete affordances, live/read-through preview labels, and
  duplicate whitespace matching; later focused RED failed on the remaining
  `Add Template Group` affordance.
- MOP-1 GREEN: `bun x vitest run tests/vitest/component-library-ui.test.tsx
  tests/vitest/library-add-component-modal-a11y.test.tsx
  tests/vitest/library-telemetry-emit.test.ts --maxWorkers=1` passed, 3 files /
  105 tests.
- `bun run type-check` passed.
- `git diff --check` passed.

Stop condition:

- MOP-1 is ready to hand off to MOP-2. The overall estimate-sheet
  orchestration goal remains open; MOP-2 through MOP-5, review, and UltraQA are
  not complete.

## 2026-06-25 Cycle 9: Implementation MOP-2 Center Integrity

Mode: implementation run, scoped to center row atomicity and project-source
tree revision gating.

Actions:

- Added RED tests for atomic center row move, all-or-nothing selected-row
  delete, viewer authorization denial, and project-source full-tree revision
  gating.
- Added local forward SQL for
  `move_estimate_row_component_with_history` and
  `delete_estimate_row_items_bulk_with_history`, with expected revisions,
  deterministic row locks, event-result idempotency, authenticated grants, and
  anon revokes.
- Updated generated Supabase types, server actions, row mutation hooks, and
  `EstimateSheetContent` to use the new atomic move and bulk-delete contracts.
- Guarded project-source insertion so a returned full tree is applied only when
  the local tree revision still matches the request-start revision.
- Recorded the local-only boundary because hosted migration drift remains
  unresolved from MOP-0.

Evidence:

- MOP-2 RED: focused suite initially failed on missing migration/type/action
  contracts, two-step center move, selected-row single-delete loop, direct
  project-source full-tree application, and unwired all-or-nothing rollback.
- MOP-2 GREEN: `bun x vitest run tests/vitest/estimate-sheet-version-control-schema.test.ts
  tests/vitest/estimate-sheet-version-control-actions.test.ts
  tests/vitest/estimate-sheet-actions-authz.test.ts
  tests/vitest/estimate-sheet-center-atomic-contracts.test.ts
  tests/vitest/estimate-sheet-bulk-row-delete-partial-failure.test.tsx
  --maxWorkers=1` passed, 5 files / 55 tests.
- `bun run type-check` passed.
- `bun x vitest run tests/vitest/project-source-insert-action.test.ts
  --maxWorkers=1` passed, 1 file / 7 tests.
- `git diff --check` passed.
- An adjacent run including `live-estimate-node-route.test.ts` exposed one
  stale unrelated source assertion expecting an inline estimate href string
  instead of `getEstimateHref`; it was recorded but not used as MOP-2 evidence.

Stop condition:

- MOP-2 is ready to hand off to MOP-3. The overall estimate-sheet
  orchestration goal remains open; MOP-3 through MOP-5, review, and UltraQA are
  not complete.

## 2026-06-25 Cycle 10: Implementation MOP-3 Tree Integrity

Mode: implementation run, scoped to tree mutation edit authority, delete
metadata authority, structure-only reconciliation signatures, and share/cache
regression proof.

Actions:

- Added RED tests for row-only tree signature isolation and viewer denial across
  tree create, rename, delete, bulk delete, and reorder server actions.
- Added app-level `can_edit_estimate` checks before tree write RPCs.
- Added a local forward migration hardening tree rename authorization and
  returning `deletedNodeIds`/`fallbackNodeId` from single and bulk tree delete
  RPCs.
- Updated tree delete actions to consume authoritative delete metadata from the
  RPC result, with fallback compatibility for older payloads.
- Changed tree prop-sync content signatures to ignore row totals and row-item
  fields while preserving path/kind/name/child-order sensitivity.
- Held numeric/sparse sort-order migration as an accepted local hold because
  hosted migration drift remains unresolved.

Evidence:

- MOP-3 RED: focused suite initially failed on row-only signature changes and
  missing tree action viewer denial.
- MOP-3 GREEN: focused schema/action/signature tests passed, 4 files / 64
  tests.
- Adjacent tree UI race/regression tests passed, 4 files / 49 tests.
- Security/action regression tests passed, 2 files / 43 tests.
- Share/cache/a11y regression tests passed, 3 files / 19 tests.
- `bun run type-check` and `git diff --check` passed.

Stop condition:

- MOP-3 is ready to hand off to MOP-4. The overall estimate-sheet
  orchestration goal remains open; MOP-4 through MOP-5, review, and UltraQA are
  not complete.

## 2026-06-25 Cycle 11: Implementation MOP-4 Interaction Contracts

Mode: implementation run, scoped to shared drag/custom-event contracts,
read-only mutation guards, cross-surface feedback acknowledgement, and
cache/selection-adjacent regression proof.

Actions:

- Added a shared guarded library item insert contract for drag MIME payloads,
  raw custom-event details, and acknowledged event envelopes.
- Added shared template and project-source event-detail validators.
- Replaced raw center library drag `JSON.parse` consumers with the shared
  parser.
- Routed right-sidebar add fallback through the shared acknowledged
  `archestimator:add-library-item` event so success/recents update only after
  center acceptance.
- Rejected malformed library custom events as no-op mutations with sanitized
  `insert_payload_rejected` telemetry.
- Added read-only guards and sanitized `authz_denied` telemetry to center
  insert/replace/template/project-source/blank-row mutation entry points.
- Fixed adjacent test-exposed interaction issues: React checkbox checked-state
  capture and explicit tab-search `role="search"`.

Evidence:

- MOP-4 RED: focused tests initially failed on missing shared parser/event
  contracts, malformed custom-event rejection, read-only custom-event denial,
  right-sidebar acknowledgement, and shared template/project-source validators.
- Parser/event contract tests passed, 1 file / 5 tests.
- Center library insert contract tests passed, 1 file / 27 tests.
- Cost-input interaction tests passed, 1 file / 40 tests.
- MOP-4 matrix passed, 6 files / 92 tests.
- Authz/telemetry guardrails passed, 2 files / 16 tests.
- Cache/selection-adjacent guardrails passed, 2 files / 13 tests.
- `bun run type-check` and `git diff --check` passed.

Stop condition:

- MOP-4 is ready to hand off to MOP-5. The overall estimate-sheet
  orchestration goal remains open; MOP-5 final evidence, review, and UltraQA
  are not complete.

## 2026-06-25 Cycle 12: Implementation MOP-5 Accessibility / Performance / Observability

Mode: implementation run, scoped to keyboard accessibility gaps, picker
affordances, table semantics, render/performance guardrails, and observability
proof for estimate-sheet orchestration.

Actions:

- Added tree primitive support for typeahead, F2, Shift+F10/context-menu, and
  full ArrowLeft/ArrowRight tree navigation.
- Wired estimate-tree keyboard rename/context menu behavior and a modal
  `Move...` flow for moving areas inside validated destinations.
- Added center-sheet component replace and move picker buttons/dialogs that use
  the existing replace, source-trust review, and atomic component-move paths.
- Fixed post-review lazy-library and editable-target keyboard edges: opening
  the replacement picker now warms the lite library query, and tree typeahead
  ignores inputs/contenteditable controls inside rows.
- Added `scope="col"` to estimate row table headers and regression coverage.
- Regenerated the estimate-sheet local render baseline JSON after the final
  picker implementation.

Evidence:

- Center-sheet picker regression passed, 1 file / 42 tests.
- MOP-5 interaction matrix passed after post-review fixes, 4 files / 99 tests.
- Render/performance guardrails passed, 6 files / 22 tests.
- Render baseline passed, 1 file / 3 tests, with regenerated JSON under
  `evidence/implementation-20260625T095050Z/`.
- Observability guardrails passed, 4 files / 111 tests.
- `bun x tsc --noEmit --incremental false` passed; stale
  `tsconfig.tsbuildinfo` was removed; `bun run type-check` passed.

Stop condition:

- MOP-5 implementation and focused verification are complete. The overall
  estimate-sheet orchestration goal remains open until final diff hygiene,
  review, and UltraQA complete.

## 2026-06-25 Cycle 13: Final Review / UltraQA Closure

Mode: local checker pass, scoped to final MOP-5 integration risks and
completion evidence.

Actions:

- Reviewed the tree primitive, estimate tree, center sheet picker, row-table
  semantics, and MOP-5 test diffs for keyboard focus traps, stale callbacks,
  read-only leaks, lazy-data gaps, and test coverage gaps.
- Fixed replacement-picker lazy-data behavior by enabling the existing lite
  library query when the picker opens and by showing a loading state while the
  query is in flight.
- Fixed tree typeahead bubbling from editable controls inside rows with an
  editable-target guard and a regression test.
- Confirmed unrelated `src/app/globals.css` and
  `src/components/landing-v3/landing-v3.module.css` worktree diffs are outside
  the MOP-5 completion claim and were not reverted.

Evidence:

- Post-review MOP-5 interaction matrix passed, 4 files / 99 tests.
- `bun run type-check` passed after the post-review fixes.
- `git diff --check` passed after evidence and post-review fixes.

Stop condition:

- MOP-0 through MOP-5 local implementation evidence and review are complete.
  Remaining gaps are explicit: hosted Supabase migrations were not applied
  because MOP-0 recorded linked migration drift, browser automation was
  intentionally skipped, and unrelated worktree diffs are not claimed as part
  of this completion.

## 2026-06-25 Cycle 14: MOP-6 Continuation Slice 1

Mode: implementation continuation after the owner explicitly authorized
previously deferred MOP-6 work unless rejected.

Actions:

- Persisted the shared side-panel collapse state using the existing
  `ResizableSidePanel` storage-key contract. This closes right-sidebar
  `Task 2.4` for local source/test scope.
- Hardened proposal workbook download fetches to use explicit
  `credentials: "same-origin"`.
- Added focused regression coverage for both behaviors.

Evidence:

- Focused continuation tests passed:
  `bun x vitest run tests/vitest/resizable-side-panel-a11y.test.tsx tests/vitest/estimate-sheet-center-atomic-contracts.test.ts --maxWorkers=1`,
  2 files / 6 tests.
- `git diff --check` passed.
- `bun run type-check` passed.

Stop condition:

- This slice is complete, but the overall estimate-sheet orchestration goal
  remains open. Remaining non-rejected work includes account-synced
  preferences, thumbnails, reducer extraction, mobile drawer proof, center
  decomposition, tree undo/lazy/realtime work, hosted Supabase migration proof,
  durable telemetry/ops proof, and browser-only interaction proof where needed.

## 2026-06-25 Cycle 15: MOP-6 Continuation Slice 2

Mode: implementation verification / traceability reconciliation.

Actions:

- Verified that right-sidebar `Task 3.2` is already implemented in the current
  code: repository normalization maps `thumbnail_path` / price-option
  `thumbnailPath` into `imageUrl`, and the library tree renders sanitized
  fixed thumbnails with placeholder fallback.
- Re-ran the relevant thumbnail and source-trust tests.

Evidence:

- First combined run found one transient unrelated
  `component-library-ui.test.tsx` inline folder-create cleanup failure; the
  same case passed in isolation immediately after.
- Full component-library UI rerun passed, 1 file / 93 tests.
- Thumbnail/source-trust evidence rerun passed:
  `bun x vitest run tests/vitest/component-library-ui.test.tsx tests/vitest/component-library-helpers.test.ts tests/vitest/library-source-trust.test.ts --maxWorkers=1`,
  3 files / 118 tests.

Stop condition:

- Right-sidebar `Task 3.2` is locally verified. The overall estimate-sheet
  orchestration goal remains open; reducer extraction, account-synced
  preferences, mobile drawer proof, provider proof, and durable ops proof remain
  incomplete.

## 2026-06-25 Cycle 16: MOP-6 Provider RPC Proof

Mode: scoped hosted Supabase apply and verification.

Actions:

- Rechecked linked project boundary: `supabase/.temp/project-ref` is
  `ebxxqidacheyapmmzavr`.
- Re-ran linked migration list and confirmed broad migration-history drift, so
  this cycle did not run `supabase db push`.
- Added a SELECT-only provider readiness query for the exact row/tree RPC
  signatures, grants, security flags, helper dependencies, and migration
  ledger rows.
- Added an explicit transaction wrapper to
  `20260625193000_estimate_tree_delete_authority_and_authz.sql` before
  applying it.
- Applied only the two scoped estimate-sheet RPC SQL files through
  `supabase db query --linked --file`.
- Captured post-apply function-catalog proof and a post-apply migration-list
  snapshot.

Evidence:

- Pre-apply provider proof showed the helper functions existed, while
  `move_estimate_row_component_with_history`,
  `delete_estimate_row_items_bulk_with_history`, and
  `delete_estimate_nodes_bulk_with_history` were absent on the linked project.
- Apply evidence files:
  `mop6-provider-apply-20260625183000.json` and
  `mop6-provider-apply-20260625193000.json` both succeeded with no result rows.
- Post-apply provider proof shows all target RPCs exist with authenticated
  EXECUTE, anon denied, `SECURITY DEFINER`, `search_path=public`, edit
  assertion, and idempotency lookup where expected. Tree delete RPCs now expose
  deleted-node and fallback-node metadata.
- Focused verification passed: schema contract 1 file / 11 tests; action/tree
  RPC matrix 3 files / 69 tests; `bun run type-check`; `git diff --check`.

Stop condition:

- Scoped provider RPC proof is complete. Migration-history drift remains open:
  `20260625183000` and `20260625193000` are still local-only in migration-list
  output because the cycle intentionally avoided broad migration push.

## 2026-06-25 Cycle 17: MOP-6 Durable Telemetry Sink

Mode: implementation plus scoped hosted Supabase apply and verification.

Actions:

- Added a locked-down `component_library_telemetry_events` migration with RLS,
  direct anon/authenticated table grants revoked, a restrictive deny-all policy,
  redaction-oriented payload constraints, and review indexes.
- Added a best-effort `recordComponentLibraryTelemetryEvent` server action that
  re-sanitizes records, requires an authenticated user, verifies workspace
  membership when a workspace id is present, and writes through service role.
- Installed the durable telemetry sink from `EstimateRightSidebar` outside test
  runs using the existing `setLibraryTelemetrySink` seam.
- Hardened `recordLibraryEvent` to swallow asynchronous sink rejections.
- Applied only the scoped telemetry DDL with `supabase db query --linked
  --file`, then captured SELECT-only provider metadata proof.

Evidence:

- Pre-apply telemetry provider readiness showed the table absent.
- Apply evidence `mop6-provider-apply-20260625203000-telemetry.json` succeeded
  with no result rows.
- Post-apply readiness shows the table exists, RLS is enabled,
  anon/authenticated direct SELECT and INSERT are denied, service-role INSERT is
  allowed, constraints/indexes exist, and the restrictive deny policy is active.
- Focused verification passed: telemetry unit/source suite 2 files / 12 tests;
  sidebar-adjacent telemetry suite 3 files / 105 tests; `bun run type-check`;
  `git diff --check`.

Stop condition:

- Durable component-library telemetry sink proof is complete. Migration-history
  drift remains open: `20260625203000` is still local-only in migration-list
  output because broad migration push remains unsafe.

## 2026-06-25 Cycle 18: Full-Scope Continuation Audit Closure

Mode: implementation audit, safe continuation edits, provider proof, and
ledger reconciliation.

Actions:

- Re-checked the three 2026-06-24 source-analysis folders against the
  2026-06-25 orchestration package and current code.
- Implemented safe non-rejected continuation gaps: account-backed right-sidebar
  preferences, account-backed estimate-sheet column widths, editable-total cost
  sort, destructive delete recovery copy, right-sidebar hover prefetch dedupe,
  context-menu rename focus restoration, sparse create-sort step, durable
  telemetry provider proof, and idempotency-helper execute hardening.
- Applied scoped SQL to linked Supabase project `ebxxqidacheyapmmzavr` for
  local versions `20260625183000`, `20260625193000`, `20260625203000`,
  `20260625213000`, `20260625214500`, and `20260625220000`.
- Repaired linked migration history for those six versions with
  `supabase migration repair --linked --status applied`.
- Kept explicit deferrals at this point for mobile right-sidebar drawer,
  right-sidebar reducer extraction, broad center/tree undo, numeric
  `sort_order` schema migration, tree lazy/realtime v2, and non-launch polish;
  later cycles closed the drawer, reducer, numeric sort, center row undo, and
  non-launch polish portions.

Evidence:

- Targeted Vitest suites passed: schema contract 1 file / 12 tests; center/right
  tree matrix 4 files / 140 tests; preferences/sort/telemetry matrix 4 files /
  52 tests.
- `bun run type-check` passed.
- `git diff --check` passed.
- Supabase provider readback at `2026-06-25T13:44:09Z` showed all three target
  provider tables exist with RLS enabled, anon/authenticated direct table access
  denied, and `deny direct api access` policies present.
- Supabase provider readback showed `estimate_sheet_event_result(uuid, uuid)`
  denies `anon` execute and grants authenticated/service-role execute.
- `supabase migration list --linked` shows the six target continuation versions
  aligned locally and remotely.

Stop condition:

- The audited safe continuation scope is complete. The correct answer remains
  "not everything in the source folders is implemented" because several rows
  are intentionally deferred product/refactor/future-scope work, not missed
  implementation.

## 2026-06-25 Cycle 19: Remaining-Deferrals Re-Audit And Route Polish

Mode: requirements re-audit, safe local implementation, and traceability
reconciliation.

Actions:

- Collected the remaining-deferrals subagent wave:
  requirements audit, architecture/integration, data/provider, UX/responsive,
  QA, and adversarial review.
- Confirmed the orchestration package still does not mean "everything in the
  three source folders is implemented." Remaining rows are proof-limited,
  unsafe without a separate owner/scope, or explicit future/product work.
- Implemented the safe tree `F-23` polish by reading the App Router `[nodeId]`
  route param with `useParams` instead of parsing the pathname string in
  `EstimateSheetTree`.
- Updated the focused tree test mocks from `usePathname` to `useParams`.
- Reconciled the source-ID appendix: `ESC-P3-19` is implemented, tree `F-23` is
  implemented, shared compact side-panel drawer is DOM-proved but
  browser/product-proof-limited, and tree `F-26` remains a source-ID mapping
  conflict before implementation.

Evidence:

- Focused tree route/interaction matrix passed: 8 files / 81 tests.
- `bun run type-check` passed.
- `git diff --check` passed.
- Browser proof was not run. Therefore the drawer claim is limited to
  source/jsdom behavior and explicitly excludes real viewport/focus-trap,
  scroll-lock, no-overlap, and overflow claims.

Stop condition:

- Safe route-param polish is complete. Full source-folder completion remains
  false: product-specific right `Sources` drawer proof, right reducer
  extraction, broad undo, numeric sort migration, tree lazy/realtime v2, and
  non-launch polish remain open slices.

## 2026-06-25 Cycle 20: Product-Specific Sources Drawer Slice

Mode: implementation, focused regression proof, and traceability reconciliation.

Actions:

- Implemented the below-1024 estimate-sheet right `Sources` drawer as a product
  surface, not just the shared generic compact side-panel drawer.
- Reused the existing right-sidebar body in one shell at a time: desktop keeps
  `ResizableSidePanel`, compact view opts out of the generic compact drawer and
  opens a `Sheet`/`Dialog`-backed right drawer from the sheet header.
- Added trigger labelling and ARIA wiring for `Open Sources drawer`, forwarded
  drawer content ids/focus props through the shared sheet primitive, and kept
  Escape sequencing ahead of the drawer close path.
- Added focused source/jsdom tests for product drawer content, lazy-load wiring,
  Escape order, generic compact drawer opt-out, and source contracts.
- Preserved `e2e/estimate-sources-drawer.spec.ts` as the route-level browser
  harness for the same claim; it remains gated by auth/provider environment.

Evidence:

- Focused drawer matrix passed:
  `tests/vitest/resizable-side-panel-a11y.test.tsx`,
  `tests/vitest/component-library-ui.test.tsx`,
  `tests/vitest/estimate-sheet-library-lazy-load.test.tsx`,
  `tests/vitest/estimate-component-library-lazy-load.test.tsx`, and
  `tests/vitest/estimate-sheet-sidebar-library-consumers.test.tsx`
  (5 files / 117 tests).
- `bun run type-check` passed.
- `git diff --check` passed.
- Non-executing Playwright harness check passed:
  `bun x playwright test --list e2e/estimate-sources-drawer.spec.ts` listed 1
  Chromium test.
- A later 2026-06-25 continuation attempted the browser proof against the
  existing dev server and configured provider values. The hardcoded seed
  project/route IDs were absent in the provider, an owner-accessible
  project/node route candidate was found through read-only provider lookup, and
  the candidate run still rendered the estimate route as 404 in the Playwright
  context before drawer assertions. Therefore real viewport/focus-trap,
  scroll-lock, and overflow claims remain explicitly unproved.

Stop condition:

- The product-specific drawer implementation is source/jsdom-complete. Full
  source-folder completion remains false until the browser-proof gate and the
  remaining explicit deferral/non-goal rows are resolved.

## 2026-06-25 Cycle 21: Right Sidebar Reducer/Hook Extraction Slice

Mode: implementation, checker review, focused regression proof, and
traceability reconciliation.

Actions:

- Extracted the right-sidebar monolithic reducer into tab-scoped state hooks:
  chrome, library, project, and templates.
- Preserved existing setter names and downstream handlers while removing the
  reducer/action boilerplate from `component-library/index.tsx`.
- Moved template prop reconciliation into the templates state hook and removed
  render-time ref writes flagged by targeted ESLint.
- Converted `EstimateRightSidebarBase` into a thin memoized wrapper around the
  internal controller hook. Changed-file React Doctor no longer reports the
  right sidebar component as `no-giant-component`.
- Used a verifier subagent for an independent read-only behavior review; it
  found no confirmed state-extraction behavior risks and recommended future
  prop-rerender tests for additional coverage.

Evidence:

- Targeted sidebar ESLint passed for:
  `src/components/workshop/component-library/index.tsx` and
  `src/components/workshop/component-library/use-estimate-right-sidebar-state.ts`.
- Focused sidebar matrix passed:
  `tests/vitest/component-library-ui.test.tsx`,
  `tests/vitest/estimate-sheet-library-lazy-load.test.tsx`,
  `tests/vitest/estimate-component-library-lazy-load.test.tsx`,
  `tests/vitest/estimate-sheet-sidebar-library-consumers.test.tsx`, and
  `tests/vitest/resizable-side-panel-a11y.test.tsx`
  (5 files / 117 tests).
- `bun run type-check` passed.
- `git diff --check` passed.
- Changed-file React Doctor passed with blocking disabled; it no longer lists
  `EstimateRightSidebarBase` under `no-giant-component`. It still lists
  unrelated/adjacent changed-file warnings, including `ResizableSidePanel` and
  inherited prop-sync warnings.

Stop condition:

- The reducer/hooks extraction and local React Doctor giant-component warning
  are closed. Do not claim full F-13 profiler success: React DevTools
  active-tab rerender proof remains unrun.

## 2026-06-25 Cycle 22: Numeric Sort-Order Migration Slice

Mode: data migration implementation, scoped provider dry run/apply, focused
regression proof, and traceability reconciliation.

Actions:

- Implemented migration `20260625221500_estimate_nodes_numeric_sort_order.sql`
  to convert `estimate_nodes.sort_order` from integer to `numeric(20,4)`.
- Rewrote active estimate-node RPC sort-order contracts from integer to
  numeric and removed the old integer create-node overload.
- Preserved tab-aware unique sort constraints and parent/sort indexes.
- Updated tree reorder planning to preserve persisted numeric sort values and
  emit one moved-node midpoint update when the persisted sibling gap permits it,
  with fallback full-sibling renumbering for missing or untrusted persisted
  sort values.
- Updated repository mapping, estimate tree types, package-builder parsing, and
  action validation so non-integer sort-order values flow through as numbers.
- Avoided broad `supabase db push` because unrelated provider migration-history
  drift remains.
- Attempted an official linked data dump first; it failed because Docker is not
  available in this shell. Captured a scoped `/tmp` JSON backup of
  `estimate_nodes` rows and touched RPC definitions instead.
- Ran the provider migration once in a `begin`/`rollback` wrapper, then applied
  the same SQL through a scoped `begin`/`commit` wrapper.
- Repaired remote migration history for `20260625221500`.

Evidence:

- Focused numeric matrix passed: 4 files / 60 tests.
- Broader affected tree/source matrix passed after the final SQL/docs updates:
  8 files / 104 tests.
- `bun run type-check` passed.
- Targeted ESLint for the changed estimate/tree/package-builder/repository
  files and focused tests passed.
- `git diff --check` passed.
- Provider preflight showed 5 rows, no duplicate sibling sort slots, no
  sub-10 sort values, no non-multiple-of-10 values, and preserved tab-aware
  constraints/indexes.
- Provider rollback dry run passed.
- Provider apply passed.
- `supabase migration repair --linked --status applied 20260625221500` passed.
- Provider readback shows `estimate_nodes.sort_order` as `numeric(20,4)`,
  5 rows preserved with min 10 and max 40, no duplicate sibling sort slots,
  preserved tab-aware unique constraints/indexes, no integer create-node
  overload, numeric create-node overload present, and migration history applied.

Stop condition:

- Tree numeric/sparse sort migration is implemented locally and applied to the
  linked provider. At this point the remaining source-folder gaps were
  non-numeric: real browser drawer proof, React DevTools profiler proof, broad
  center/tree undo, tree lazy subtree loading, and realtime-v2 contract work.
  Later cycles closed drawer proof, center row-delete Undo, and tree/subtree
  delete Undo.

## 2026-06-25 Cycle 23: Tree Polish And Scope Closure Slice

Mode: implementation, architecture classification, focused regression proof,
and traceability reconciliation.

Actions:

- Implemented tree F-24 by keeping the inline rename editor visible while the
  server rename is saving. The row now exposes a disabled input/action state
  and `Saving...` status until the save resolves.
- Implemented tree F-25 by scrolling the newly created optimistic row into view
  after create.
- Closed tree F-26 as the source-plan add-child placement decision: current
  behavior appends new/dropped children after existing children, and tests now
  make that contract explicit.
- Revisited broad center/tree undo. Current optimistic failure rollback was
  live, but full undo after successful save/delete required a restore model and
  was classified as a future architecture/product slice at that point. Cycle
  27 later implemented the center row-delete restore path, and Cycle 29 later
  implemented tree/subtree delete Undo.
- Revisited lazy subtree loading and realtime-v2. Current realtime
  cursor/presence is implemented; lazy subtree loading requires subtree
  fetch/merge and per-node loading contracts; realtime-v2 needs a separate
  concrete contract.

Evidence:

- Tree polish matrix passed:
  `tests/vitest/estimate-tree-context-menu.test.tsx`,
  `tests/vitest/estimate-tree-modal.test.tsx`, and
  `tests/vitest/estimate-sheet-tree-dnd.test.tsx`
  (3 files / 53 tests).
- `bun run type-check` passed.
- Targeted ESLint passed for:
  `src/components/workshop/EstimateSheetTree.tsx`,
  `tests/vitest/estimate-tree-context-menu.test.tsx`, and
  `tests/vitest/estimate-tree-modal.test.tsx`.
- Read-only lazy/realtime architecture lane passed:
  `tests/vitest/estimate-tree-refetch-on-mount.test.tsx` and
  `tests/vitest/project-collaboration-realtime.test.ts`
  (2 files / 13 tests).

Stop condition:

- Tree F-24, F-25, and F-26 are closed. At this point in the ledger the drawer
  browser proof was still open; Cycle 26 later closed it. Current remaining
  source-folder gaps are proof-limited or architecture-scope: React DevTools
  profiler proof, broad undo, lazy subtree loading, and a concrete realtime-v2
  collaboration contract.

## 2026-06-25 Cycle 24: Center P3 Polish And Refactor-Scope Closure

Mode: small implementation slice, source-ID reconciliation, focused regression
proof, and explicit refactor-scope classification.

Actions:

- Implemented local SVG component-image placeholders for missing image
  fallbacks in the component library, activity history cards, and seed
  fallback inference.
- Debounced same-scope activity-history reloads so filter/search churn does not
  fire immediate repeated reads after the initial scope load; explicit scope
  navigation stays immediate.
- Moved the global toast viewport above the bottom-docked action area and
  safe-area inset.
- Added a proposal preview warning when the preview contains unsaved editable
  row changes.
- Revisited `EstimateSheetContent` decomposition/extraction rows M-21 through
  M-24 and classified them as refactor-scope rather than safe local
  continuation work because they require characterization tests and behavior
  locks before moving hot template/history/proposal flows.

Evidence:

- Center P3 polish matrix passed:
  `tests/vitest/component-library-helpers.test.ts`,
  `tests/vitest/toast.test.tsx`,
  `tests/vitest/proposal-export-preview.test.tsx`, and
  `tests/vitest/estimate-sheet-version-control-ui.test.tsx`
  (4 files / 57 tests).
- `bun run type-check` passed.
- Targeted ESLint for the changed center/fallback/toast files and tests exited
  0 with existing unused-symbol warnings only.

Stop condition:

- `ESC-P3-17`, scoped `ESC-P3-23`, `ESC-P3-24`, and `M-27` are closed. At this
  point in the ledger the drawer browser proof was still open; Cycle 26 later
  closed it. Current remaining estimate-sheet source-folder gaps are
  proof-limited or architecture/refactor-scope: React DevTools profiler proof,
  broad undo, full center hook/component decomposition M-21 through M-24, lazy
  subtree loading, and a concrete realtime-v2 collaboration contract. Cycle 28
  later closed the pure helper/model extraction part of M-21 through M-24.

## 2026-06-25 Cycle 25: Final Source-ID Proof Re-Audit

Mode: read-only re-audit, browser-proof attempt, documentation reconciliation,
and harness cleanup.

Actions:

- Ran independent read-only audit lanes for source-ID coverage, drawer e2e
  preflight, F-13 profiler proof, broad undo architecture, lazy subtree/realtime
  architecture, and center decomposition scope.
- Corrected the stale Q8-Q10 ledger statement: favorites/recents and custom
  ordering no longer stay browser-local; they sync through account-backed
  preferences with browser-local first-paint/offline fallback.
- Attempted the right `Sources` drawer browser proof against the existing dev
  server and configured provider values.
- Found that the default hardcoded e2e seed IDs were absent in the configured
  provider, then found an owner-accessible project/node route candidate through
  read-only provider lookup.
- Updated the browser proof classification after the candidate route still
  rendered 404 in the Playwright context before any drawer assertions ran.
- Renamed the drawer harness route override to
  `ESTIMATE_SHEET_E2E_NODE_ID`, preserving `ESTIMATE_SHEET_E2E_ESTIMATE_ID` as
  a backward-compatible fallback.

Evidence:

- `PLAYWRIGHT_PORT=3000 bunx playwright test
  e2e/estimate-sources-drawer.spec.ts --project=chromium` failed before drawer
  assertions when the hardcoded fixture route rendered 404.
- Read-only provider lookup showed the hardcoded fixture IDs are absent, while
  the configured provider contains one accessible project, one estimate, and
  five estimate nodes for the configured owner context.
- A candidate run with the discovered project/node route still rendered 404 in
  the Playwright context before `[data-estimate-center-column='sheet']` or
  drawer assertions; the failure context is under
  `test-results/estimate-sources-drawer-es-5a856-oll-lock-and-overflow-proof-chromium/error-context.md`.
- Subagent audit consensus at this point: F-13 still lacked React DevTools
  active-tab rerender profiler proof; broad undo needed a restore
  contract/RPC/UI flow; center M-21 through M-24 needed characterization locks
  before extraction; lazy subtree loading and realtime-v2 required explicit
  contracts beyond current cursor/presence behavior. Cycle 28 later completed
  the pure helper/model extraction portion of M-21 through M-24, while full
  hook/component decomposition remains open.

Stop condition:

- The double-check answer remains no. Safe implemented rows and stale ledger
  corrections are recorded. Cycle 26 later closed the drawer browser-proof
  blocker, and Cycle 28 later closed pure center helper/model extraction. Full
  source-folder completion remains false until F-13 profiler proof, full center
  hook/component decomposition, lazy subtree loading, and concrete realtime-v2
  contract work are implemented or intentionally re-scoped by a newer plan.

## 2026-06-25 Cycle 26: Sources Drawer Browser Proof Recovery

Mode: focused implementation fix, browser-proof recovery, and evidence
reconciliation.

Actions:

- Diagnosed the prior drawer browser blocker as stale default e2e fixture IDs,
  then proved the configured owner session can read the discovered provider
  project/node route.
- Fixed the real-browser drawer search Escape sequence in `TreePanelHeader`.
- Focused the custom `Open Sources drawer` trigger before opening the drawer so
  return-focus restoration is stable in Chromium.
- Hardened `e2e/estimate-sources-drawer.spec.ts` with dev-auth cookie support,
  node-id route targeting, optional estimate-link discovery, compact-mode
  waits, and independent tablet/phone cases.
- Updated stale source-contract assertions for the shared tabs implementation.

Evidence:

- `PLAYWRIGHT_PORT=3000 ESTIMATE_SHEET_E2E_PROJECT_ID=0139e1e5-951d-4f2f-9081-6c953d288d8a ESTIMATE_SHEET_E2E_NODE_ID=8080f04c-fe18-4314-a1d8-9222e62d1eed bunx playwright test e2e/estimate-sources-drawer.spec.ts --project=chromium`
  passed 2 tests.
- `bunx vitest run tests/vitest/component-library-ui.test.tsx tests/vitest/estimate-sheet-sidebar-library-consumers.test.tsx --maxWorkers=1`
  passed 2 files / 103 tests.
- `bun run type-check` passed.
- `git diff --check` passed.

Stop condition:

- The right `Sources` drawer browser-proof gap is closed locally. Full
  source-folder completion remained false at this point because F-13 profiler
  proof, undo work, center decomposition/extractions M-21 through
  M-24, lazy subtree loading, and realtime-v2 protocol work remained open or
  architecture-scoped. Cycle 27 later closed center row-delete Undo, and Cycle
  29 later closed tree/subtree delete Undo.

## 2026-06-26 Cycle 27: Center Row Delete Undo

Mode: focused center/data implementation, provider apply, and documentation
reconciliation.

Actions:

- Added `restore_deleted_estimate_rows_with_history` through migration
  `20260626013000_estimate_row_delete_undo_rpc.sql`.
- Wired `restoreDeletedEstimateRows` through estimate actions,
  `useEstimateRowMutations`, and `EstimateSheetContent`.
- Added single-row and selected-row delete success-toast `Undo` actions that
  restore center rows from the persisted delete event snapshot.
- Updated destructive row-delete copy to the current narrower contract:
  center rows can be restored with Undo after delete/save. Cycle 29 later
  closed the parallel tree node/subtree delete Undo path.
- Applied the migration to linked Supabase project `ebxxqidacheyapmmzavr` with
  scoped direct SQL and repaired migration history for `20260626013000`.

Evidence:

- `bunx vitest run tests/vitest/estimate-sheet-version-control-schema.test.ts tests/vitest/estimate-sheet-version-control-actions.test.ts tests/vitest/estimate-sheet-bulk-row-delete-partial-failure.test.tsx --maxWorkers=1`
  passed 3 files / 49 tests.
- `bun run type-check` passed.
- `git diff --check` passed.
- Provider readback shows `restore_deleted_estimate_rows_with_history` is
  `SECURITY DEFINER`, authenticated-executable, anon-denied, and has the
  expected arguments.
- `supabase migration list --linked` shows `20260626013000` aligned locally and
  remotely.

Stop condition:

- The center row delete Undo gap is closed locally and on the linked provider.
  Full source-folder completion remains false because F-13 profiler proof,
  center decomposition/extractions M-21 through M-24, lazy subtree loading, and
  realtime-v2 protocol work remain open or architecture-scoped. Cycle 29 later
  closed tree/subtree post-success delete Undo.

## 2026-06-26 Cycle 28: Center Model Extraction Locks

Mode: focused center refactor, characterization lock, and evidence
reconciliation.

Actions:

- Extracted proposal preview signature/settings/download helpers into
  `proposal-preview-model.ts`.
- Extracted template insertion id/clone/append helpers into
  `template-insertion-model.ts`.
- Extracted activity scope tree construction into `activity-scope-tree.ts`.
- Added direct model tests and a batched template-insertion custom-event lock.
- Updated row-details modal tests to await the native dialog open path.

Evidence:

- `bunx vitest run tests/vitest/estimate-sheet-extracted-models.test.ts tests/vitest/estimate-template-drop-zones.test.tsx tests/vitest/estimate-insert-target-authz.test.ts --maxWorkers=1`
  passed 3 files / 18 tests.
- `bunx vitest run tests/vitest/proposal-export-preview.test.tsx tests/vitest/estimate-header-actions.test.tsx tests/vitest/estimate-sheet-activity-history-ui.test.tsx tests/vitest/estimate-sheet-version-control-ui.test.tsx --maxWorkers=1`
  passed 4 files / 43 tests.
- `bunx vitest run tests/vitest/estimate-sheet-library-insert.test.tsx tests/vitest/estimate-sheet-row-details-crud.test.tsx tests/vitest/estimate-sheet-bulk-row-delete-partial-failure.test.tsx --maxWorkers=1`
  passed 3 files / 37 tests.
- `bunx vitest run tests/vitest/estimate-sheet-center-atomic-contracts.test.ts --maxWorkers=1`
  passed 1 file / 4 tests.
- `bun run type-check` passed.
- `git diff --check` passed.

Stop condition:

- Pure helper/model extraction for center M-21 through M-24 is closed and
  covered. Full `EstimateSheetContent.tsx` hook/component decomposition remains
  open, so the full source-folder completion answer remains no.

## 2026-06-26 Cycle 29: Tree/Subtree Delete Undo

Mode: focused tree/data implementation, provider apply, and documentation
reconciliation.

Actions:

- Added `restore_deleted_estimate_nodes_with_history` through migration
  `20260626023000_estimate_node_delete_undo_rpc.sql`.
- Added canonical node delete snapshots and full subtree row snapshots to new
  single/bulk tree delete history payloads.
- Raised the bounded event snapshot cap to 5 MB so subtree delete history can
  support post-success restore without duplicating the same snapshot in
  `old_snapshot`.
- Wired delete `eventId` through single/bulk tree delete actions and added the
  `restoreDeletedEstimateNodes` server action.
- Added tree success-toast `Undo` actions for single and bulk delete, including
  route/selection repair back to the restored node when the delete had forced a
  fallback.
- Applied the migration to linked Supabase project `ebxxqidacheyapmmzavr` with
  scoped direct SQL and repaired migration history for `20260626023000`.

Evidence:

- `bunx vitest run tests/vitest/estimate-tree-context-menu.test.tsx tests/vitest/estimate-tree-bulk-selection.test.tsx tests/vitest/estimate-node-reorder-action.test.ts tests/vitest/estimate-sheet-version-control-schema.test.ts --maxWorkers=1`
  passed 4 files / 82 tests.
- `bun run type-check` passed.
- `git diff --check` passed.
- Provider readback shows `restore_deleted_estimate_nodes_with_history` is
  `SECURITY DEFINER`, authenticated-executable, anon-denied, and has the
  expected arguments.
- Provider readback shows `estimate_node_snapshot` is not exposed to anon or
  authenticated roles.
- `supabase migration list --linked` shows `20260626023000` aligned locally and
  remotely.

Stop condition:

- Tree/subtree post-success delete Undo is closed locally and on the linked
  provider. Full source-folder completion remains false because F-13 React
  DevTools active-tab profiler proof, full `EstimateSheetContent.tsx`
  hook/component decomposition, lazy subtree loading, and a concrete
  realtime-v2 collaboration contract remain open.

## 2026-06-26 Cycle 30: Template Insertion Hook Extraction

Mode: focused center refactor and behavior-preservation validation.

Actions:

- Added `src/components/workshop/estimate-sheet/use-estimate-template-insertion.ts`.
- Moved `M-22` estimate-template insertion orchestration out of
  `EstimateSheetContent.tsx`, including whole-template insert, batched
  multi-template insert, template-node subtree insert, id lookup, left-tree
  template custom-event handling, optimistic tree/row updates, revision guards,
  rollback, and error toasts.
- Kept project-source subtree insertion in `EstimateSheetContent.tsx` because it
  is the separate U2 source-copy RPC flow rather than estimate-template
  insertion.

Evidence:

- `bunx vitest run tests/vitest/estimate-sheet-library-insert.test.tsx tests/vitest/estimate-sheet-extracted-models.test.ts --maxWorkers=1`
  passed 2 files / 34 tests.
- `bun run type-check` passed.
- `git diff --check -- src/components/workshop/EstimateSheetContent.tsx src/components/workshop/estimate-sheet/use-estimate-template-insertion.ts`
  passed.

Stop condition:

- Center `M-22` is closed. At that point, full source-folder completion remained
  false because
  F-13 React DevTools active-tab profiler proof, center `M-21`/`M-23`/`M-24`
  hook/controller extraction, lazy subtree loading, and a concrete realtime-v2
  collaboration contract remained open. Cycle 31 later closed `M-24`, and Cycle
  32 later closed `M-21`.

## 2026-06-26 Cycle 31: Proposal Preview Hook Extraction

Mode: focused center refactor and behavior-preservation validation.

Actions:

- Added `src/components/workshop/estimate-sheet/use-estimate-proposal-preview.ts`.
- Moved `M-24` proposal-preview controller orchestration out of
  `EstimateSheetContent.tsx`, including tab-scope selection, preview signature
  composition, preview model building, export settings changes, stale/download
  status, blob-download error handling, and focus restoration.
- Kept `EstimateSheetContent.tsx` as the owner of the reducer-backed proposal
  state and kept pure model helpers in `proposal-preview-model.ts`.

Evidence:

- `bunx vitest run tests/vitest/proposal-export-preview.test.tsx tests/vitest/estimate-sheet-extracted-models.test.ts --maxWorkers=1`
  passed 2 files / 19 tests.
- `bun run type-check` passed.
- `git diff --check -- src/components/workshop/EstimateSheetContent.tsx src/components/workshop/estimate-sheet/use-estimate-proposal-preview.ts src/components/workshop/estimate-sheet/use-estimate-template-insertion.ts`
  passed.

Stop condition:

- Center `M-24` is closed. Full source-folder completion remains false because
  F-13 React DevTools active-tab profiler proof, center `M-21`/`M-23`
  hook/controller extraction, lazy subtree loading, and a concrete realtime-v2
  collaboration contract remain open at this point. Cycle 32 later closed
  `M-21`.

## 2026-06-26 Cycle 32: Row Handlers Hook Extraction

Mode: focused center refactor and behavior-preservation validation.

Actions:

- Added `src/components/workshop/estimate-sheet/use-estimate-row-handlers.ts`.
- Moved `M-21` row-handler/controller orchestration out of
  `EstimateSheetContent.tsx`, including editable-row resync, express draft
  insert/retry/delete handling, row save buffering, library insert/replace trust
  gates, clear-component, project-specific detach, library promotion, component
  replace/move picker actions, single-row delete Undo, and selected-row bulk
  delete Undo.
- Kept template insertion, proposal preview, and activity-history controller
  state on their existing boundaries; `M-22` and `M-24` already have dedicated
  hooks, while `M-23` remains open.

Evidence:

- `bunx vitest run tests/vitest/estimate-sheet-cost-inputs.test.tsx tests/vitest/estimate-sheet-library-insert.test.tsx tests/vitest/estimate-sheet-row-details-crud.test.tsx tests/vitest/estimate-sheet-bulk-row-delete-partial-failure.test.tsx --maxWorkers=1`
  passed 4 files / 80 tests.
- `bunx vitest run tests/vitest/estimate-sheet-version-control-actions.test.ts --maxWorkers=1`
  passed 1 file / 32 tests.
- `bun run type-check` passed.

Stop condition:

- Center `M-21` is closed. Full source-folder completion remains false because
  F-13 React DevTools active-tab profiler proof, center `M-23`
  activity-history controller extraction, lazy subtree loading, and a concrete
  realtime-v2 collaboration contract remain open.

## 2026-06-26 Cycle 33: Activity History Panel Hook Extraction

Mode: focused center refactor and behavior-preservation validation.

Actions:

- Added `src/components/workshop/estimate-sheet/use-estimate-history-panel.ts`.
- Moved `M-23` activity-history controller orchestration out of
  `EstimateSheetContent.tsx`, including activity scope item construction,
  selected scope/row-details derivation, filter/reset/reload transitions,
  request-generation guards, initial fetch, pagination fetch, modal focus
  restoration, and Escape-key close handling.
- Kept reducer-backed activity/history state and modal rendering in
  `EstimateSheetContent.tsx`, with the controller behavior delegated through
  the hook return API.
- Recorded parallel audit evidence that lazy subtree loading and realtime-v2
  remain separate architecture/contract gaps, not hidden activity-history work.

Evidence:

- `bun run type-check` passed.
- `bunx vitest run tests/vitest/estimate-sheet-version-control-ui.test.tsx tests/vitest/estimate-sheet-activity-history-ui.test.tsx tests/vitest/estimate-sheet-extracted-models.test.ts tests/vitest/estimate-sheet-row-details-crud.test.tsx --maxWorkers=1`
  passed 4 files / 37 tests.
- `bunx vitest run tests/vitest/estimate-sheet-version-control-actions.test.ts --maxWorkers=1`
  passed 1 file / 32 tests.

Stop condition:

- Center `M-23` is closed. At this point the remaining source-folder gaps were
  F-13 React DevTools active-tab profiler proof, lazy subtree loading, and a
  concrete realtime-v2 collaboration contract. Cycle 34 later closed F-13 with
  automated React Profiler evidence.

## 2026-06-26 Cycle 34: Right Sidebar Active-Tab Profiler Proof

Mode: focused right-sidebar proof and behavior-preservation validation.

Actions:

- Added
  `tests/vitest/perf/estimate-right-sidebar-active-tab-renders.test.tsx`.
- Rendered the real `EstimateRightSidebar` shell inside React `<Profiler>` and
  mocked only the heavy `LibraryTree` / `TemplatesTree` bodies to count active
  and inactive tree renders.
- Proved that Library interactions commit React work and rerender the Library
  tree while the Templates tree remains at zero renders, and that Templates
  interactions commit React work and rerender the Templates tree while the
  Library tree remains at zero renders.
- Updated the static sidebar-consumer trust-gate test to follow the M-21 row
  handler extraction boundary.

Evidence:

- `bunx vitest run tests/vitest/perf/estimate-right-sidebar-active-tab-renders.test.tsx --maxWorkers=1`
  passed 1 file / 1 test.
- `bunx vitest run tests/vitest/perf/estimate-right-sidebar-active-tab-renders.test.tsx tests/vitest/component-library-ui.test.tsx tests/vitest/estimate-sheet-library-lazy-load.test.tsx tests/vitest/estimate-component-library-lazy-load.test.tsx tests/vitest/estimate-sheet-sidebar-library-consumers.test.tsx tests/vitest/resizable-side-panel-a11y.test.tsx --maxWorkers=1`
  passed 6 files / 118 tests.
- `bun run type-check` passed.
- `bun run doctor -- --scope files --base HEAD --no-score --blocking none --no-dead-code --no-color --verbose`
  exited 0. It still reported broader changed-branch warnings, but no
  `EstimateRightSidebarBase` giant-component finding.

Stop condition:

- Right-sidebar `F-13` is closed with automated React Profiler evidence rather
  than a manual React DevTools export. At this point the remaining
  source-folder gaps were lazy subtree loading and a concrete realtime-v2
  collaboration contract.

## 2026-06-26 Cycle 35: Tree Lazy Subtree And Realtime-v2 Contract

Mode: focused tree architecture implementation and behavior-preservation validation.

Actions:

- Added `src/lib/estimates/estimate-tree-lazy.ts` for typed subtree payloads,
  subtree merge, request-id freshness guards, and per-node hydration state.
- Added optional `childrenLoaded` / `rowItemsLoaded` metadata to estimate tree
  nodes and wired `EstimateSheetTree.tsx` to treat partial branches and
  over-limit terminal nodes as expandable lazy candidates.
- Added `getEstimateNodeSubtree`, `subtree-actions.ts`, and
  `subtree-client.ts` so expand-time branch hydration can fetch one bounded
  subtree and merge it into the current query tree without a full reload.
- Added `src/lib/collaboration/estimate-tree-realtime-contract.ts` as the
  concrete realtime-v2 tree contract for subtree request/load, last-write-wins
  branch changes, and full-refetch requests while leaving cursor/presence
  realtime unchanged.

Evidence:

- `bunx vitest run tests/vitest/estimate-tree-lazy-subtree.test.ts tests/vitest/project-collaboration-tree-contract.test.ts tests/vitest/estimate-tree-lazy-hydration-ui.test.tsx --maxWorkers=1`
  passed 3 files / 8 tests.
- `bunx vitest run tests/vitest/estimate-tree-refetch-on-mount.test.tsx tests/vitest/project-collaboration-realtime.test.ts tests/vitest/project-collaboration-schema.test.ts tests/vitest/estimate-sheet-tree-dom.test.tsx tests/vitest/estimate-tree-node-icon.test.tsx tests/vitest/estimate-tree-lazy-subtree.test.ts tests/vitest/project-collaboration-tree-contract.test.ts tests/vitest/estimate-tree-lazy-hydration-ui.test.tsx --maxWorkers=1`
  passed 8 files / 40 tests.
- `bunx vitest run tests/vitest/estimate-sheet-large-data-budgets.test.ts tests/vitest/estimate-query-cache-hydration.test.tsx tests/vitest/estimate-workspace-client-cache.test.tsx tests/vitest/estimate-tree-bulk-selection.test.tsx --maxWorkers=1`
  passed 4 files / 12 tests.
- `bun run type-check` passed.

Stop condition:

- Lazy subtree loading and the concrete realtime-v2 tree collaboration contract
  are closed locally. With this cycle, the three June 24 estimate-sheet source
  folders are implemented under the current orchestration scope. No production
  deploy, manual browser matrix, or provider write is claimed for this slice.
