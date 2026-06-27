# Implementation Plan

This is a future implementation plan. Do not treat it as work already completed.

## Phase 0 - Preflight And Baseline

| Task | Files | Validation |
|---|---|---|
| Snapshot current dirty worktree and overlapping edits. | `git status`, touched estimate files | Record overlapping files; no reverts. |
| Lock reported row-move regression with failing tests. | `e2e/estimate-row-move.spec.ts`, new DOM/unit tests around tree drop and target reorder | Test fails before fix or is marked as current repro proof if already failing. |
| Lock current no-routine-toast target behavior. | New/updated DOM tests around row edit and tree reorder | Assert no global saving/saved toast for routine success; failure path remains visible. |
| Lock stale/offline/queue expectations. | New `estimate-mutation-queue` tests | Red tests for stale success, pending age, retry, rollback. |
| Lock Server Action/RPC/public/export attack surface. | `actions.ts`, RPC tests, public/share/export route tests | Direct-POST, direct RPC, public/export DTO, and direct browser repository reachability tests fail before hardening or are documented as current proof. |

## Phase 0.5 - Security/Data Gate Before UX Refactor

These tasks are release-blocking preconditions for broad Phase 1-3 UI/mutation refactors. Narrow RED tests and route-boundary documentation may run first, but no implementation lane should claim UX/mutation readiness while these gates are open unless a named owner waiver is recorded in `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md`.

| Gate | Files | Blocks | Exit Criteria |
|---|---|---|---|
| RPC edit authorization and history RLS | Supabase migrations/RLS/RPC tests | Phase 2 coordinator and Phase 3 move persistence | Direct RPC/RLS tests prove unauthorized actors fail closed. |
| Server Action direct-POST contracts | `src/lib/estimates/actions.ts`, action tests | Phase 1-3 UI mutation polish | Every mutation action has argument validation, authz, safe DTO, cache behavior, and direct invocation test. |
| Direct browser row-write reachability | `src/lib/repositories/estimate-repository.ts`, import/bundle tests | Phase 2 coordinator | Direct write paths are removed, server-only/test-only, or proven unreachable from production UI. |
| Private image/source snapshot/public-export DTO hardening | image routes, snapshot utilities, publication/export models | Component/source/image UX, proposal/export readiness | Unauthorized actors denied; public/export/history DTOs are redacted and bounded. |
| Abuse/rate-limit posture | Server Actions, route handlers, upload/export/comment surfaces | Release readiness and public/share exposure | Rate/backoff/threshold plan and tests exist for high-write/high-cost paths. |

## Phase 1 - Quiet Status And Local Recovery

| Task | Files | Requirements |
|---|---|---|
| Replace routine row save toasts with quiet status. | `EstimateSheetContent.tsx`, status component/hook if needed | UX-STATUS-001, UX-STATUS-002 |
| Replace routine tree mutation toasts with tree-local status. | `EstimateSheetTree.tsx` | UX-STATUS-001 |
| Add durable destructive recovery path or wire existing activity history. | Row/tree/tab/component surfaces, `activity-history` components | FR-ROW-004, UX-DESTRUCTIVE-001 |
| Add no-selected-node center empty state. | `EstimateSheetContent.tsx` | UX-EMPTY-001 |

## Phase 2 - Mutation Coordinator

| Task | Files | Requirements |
|---|---|---|
| Extract mutation identity/status model. | `use-estimate-row-mutations.ts`, possible new hook/store | DATA-IDEMP-001, PERF-QUEUE-001 |
| Replace global sheet-wide movement lock with scoped row/node pending state. | `use-estimate-row-handlers.ts`, row/table/tree status subscribers | FR-RECOVERY-001, FR-ROW-006 |
| Coordinate cross-row component moves. | `use-estimate-row-mutations.ts`, handlers | FR-COMP-001 |
| Add retry/revert model for failed mutations. | New coordinator/status UI | FR-RECOVERY-001 |
| Feature-flag if scope is broad. | Feature flag inventory, runtime env helper | DOC-FLAG-001 |

## Phase 3 - Row Move Reconciliation Fix

| Task | Files | Requirements |
|---|---|---|
| Make row movement a first-class coordinator path. | `use-estimate-row-handlers.ts`, `EstimateSheetTree.tsx`, `EstimateSheetContent.tsx` | FR-ROW-005, FR-ROW-006 |
| Recompute/validate target index against content-owned tree at submit time. | Row move coordinator | FR-ROW-006 |
| Ensure returned move rows cannot silently no-op when cache diverges. | `estimate-row-tree-move.ts`, `use-estimate-row-mutations.ts` | DATA-CACHE-001 |
| Clear drag state on success/cancel/failure. | `estimate-workshop-drag.ts`, tree/table drop handlers | UX-DND-001 |
| Preserve row handles after content-to-tree move. | `row-table.tsx`, row branch memoization if needed | PERF-DND-001 |

## Phase 4 - Data/API/Security Completion

| Task | Files | Requirements |
|---|---|---|
| Audit and patch authenticated mutation RPC DB auth checks. | New Supabase migration(s) | DATA-RPC-001, SEC-HISTORY-001, SEC-ACTION-001 |
| Add mutation event uniqueness or explicit duplicate policy. | Supabase migration(s), tests | DATA-IDEMP-001 |
| Replace/wrap sheet adjustment direct writes. | `actions.ts`, migration/RPC | FR-SHEET-001 |
| Disable or remove direct browser row writes. | `estimate-repository.ts`, imports/tests | DATA-RPC-002 |
| Harden private image route authorization. | `src/app/api/projects/images/route.ts`, row image route | SEC-IMAGE-001 |
| Allowlist source snapshot persistence. | `actions.ts`, image-url/snapshot utils | DATA-SNAPSHOT-001 |
| Harden public/share/proposal/export DTOs and tokens. | publication/share/export routes and models | SEC-PUBLIC-001, SEC-DTO-001 |
| Add abuse/rate-limit and secrets inventory proof. | action/route tests, env inventory | SEC-ABUSE-001, SEC-SECRETS-001 |

## Phase 5 - Benchmark And Proof

| Task | Files | Requirements |
|---|---|---|
| Convert perf profiles to budget tests. | `tests/vitest/perf/*` | PERF-TYPE-001, PERF-DOM-001 |
| Add browser interaction performance spec. | `e2e/estimate-sheet-interaction-performance.spec.ts` | PERF-DND-001 |
| Add offline/degraded e2e. | `e2e/estimate-sheet-offline.spec.ts` | REL-OFFLINE-001 |
| Add cache freshness suite. | Repository/server-action/browser tests | DATA-CACHE-001 |
| Run target-route manual smoke. | Target URL | ACT matrix completion |

## Phase 6 - Docs And Release Readiness

| Task | Files | Validation |
|---|---|---|
| Update stale `.ai/06_specs` docs. | Specs listed in `10_BLAST_RADIUS_AND_DEPENDENCIES.md` | Source-linked doc review |
| Update `.ai/10_state/current-state.md` with evidence. | Current state fast path | Only after implementation proof exists |
| Complete readiness report. | Future implementation log/evidence | Local/browser/provider gaps separated |
| Rollout through flag, staging, first-user gate. | Feature flag/env/runbook | `13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md` |

## Detailed Task Register

Every future task below must be implemented with behavior-locking tests first when the current behavior can be reproduced locally. The "Parallel" column indicates whether the task can run beside other lanes after Phase 0.

| Task ID | Phase | Task | Requirement IDs | Primary Files | Instructions | Failure Cases To Test | Completion Evidence | Parallel |
|---|---:|---|---|---|---|---|---|---|
| IMP-00 | 0 | Record implementation preflight state | DOC-EVIDENCE-001 | worktree status, implementation log | Snapshot dirty files, branch, environment, and target route before source edits. Do not revert unrelated user work. | Existing dirty file overlap, untracked migrations, stale generated types | Preflight log with overlap decisions | No |
| IMP-01 | 0 | Reproduce content-to-tree row move regression | FR-ROW-006, PERF-DND-001 | `row-table.tsx`, `EstimateSheetTree.tsx`, e2e spec | Create failing browser or DOM proof: drag row from content to another tree branch, then reorder moved row and target siblings. | Target branch non-draggable, stale cache no-op, handle remains disabled | Red test or explicit reproduction artifact | No |
| IMP-02 | 0 | Lock quiet routine save behavior | UX-STATUS-001, UX-STATUS-002 | `EstimateSheetContent.tsx`, `EstimateSheetTree.tsx`, DOM tests | Add tests proving routine success does not emit global saving/saved toasts while failures remain visible and actionable. | Slow save, failed save, simultaneous unrelated edit | Red/green DOM test output | Yes |
| IMP-03 | 0 | Lock stale/offline queue semantics | FR-RECOVERY-001, DATA-IDEMP-001, REL-OFFLINE-001 | mutation tests, coordinator target files | Build tests for stale response suppression, duplicate retry prevention, visible degraded state, and retry/revert behavior. | Out-of-order success, offline insert, duplicate mutation ID, retry after reload if supported | Test output and scenario notes | Yes |
| IMP-03A | 0.5 | Lock and inventory attack surfaces before broad UX changes | SEC-ACTION-001, SEC-PUBLIC-001, SEC-ABUSE-001, SEC-DTO-001, SEC-SECRETS-001 | `actions.ts`, share/export routes, image routes, public snapshot/export models, env inventory | Create the Server Action/public/export/image/direct-RPC attack-surface inventory and RED or current-state tests for unauthorized direct invocation, DTO over-return, and rate-limit gaps. | Direct POST malformed args, public token misuse, export redaction leak, direct browser repository import, repeated upload/export/comment attempts | Attack surface inventory and initial failing/proving test output | No |
| IMP-04 | 1 | Replace routine row save toasts with local status | UX-STATUS-001, FR-ROW-003 | `EstimateSheetContent.tsx`, status component/hook | Remove global saving/saved toast path for ordinary row edits and expose scoped local state. Preserve failure visibility. | Failure hidden, unrelated row marked busy, screen reader spam | DOM/a11y test output | Yes |
| IMP-05 | 1 | Replace routine tree mutation toasts with tree-local status | UX-STATUS-001, FR-TREE-001 | `EstimateSheetTree.tsx` | Convert routine tree success feedback to scoped node/tree status, with failure-only actionable alerts. | Tree reorder failure, rename failure, bulk delete failure | Tree DOM test output | Yes |
| IMP-06 | 1 | Add durable destructive recovery | FR-ROW-004, UX-DESTRUCTIVE-001 | row/tree/tab/component surfaces, activity history | Replace toast-only recovery for destructive flows with durable undo/recently-deleted or a documented history-backed recovery path. | Toast timeout, reload after delete, undo failure | Delete/restore tests and UX proof | Partly |
| IMP-07 | 1 | Add no-selected-node recovery state | UX-EMPTY-001 | `EstimateSheetContent.tsx` | Show Select/Create Area actions when selected node is absent instead of a blank content pane. | Deleted selected node, tab switch to empty tree, load-limited tree | DOM test and manual smoke | Yes |
| IMP-08 | 2 | Extract mutation identity and scoped status model | DATA-IDEMP-001, PERF-QUEUE-001 | `use-estimate-row-mutations.ts`, new hook/store if justified | Create a coordinator contract for stable mutation IDs, scoped status, retries, failure reasons, and queue age. Keep the API narrow. | Duplicate retry, concurrent row edits, stale success, unbounded local queue | Unit tests and API notes | No |
| IMP-09 | 2 | Replace sheet-wide movement lock with scoped row/node locks | FR-RECOVERY-001, FR-ROW-006 | `use-estimate-row-handlers.ts`, row/table/tree subscribers | Stop blocking unrelated moves because global saveState is dirty/saving. Block only conflicting row/node operations. | Slow edit while moving different row, same-row conflicting move, load-limited sheet | DOM/e2e proof | No |
| IMP-10 | 2 | Coordinate component move/replace/clear/detach/promote | FR-COMP-001 | row mutations, handlers, `actions.ts` | Route all component mutations through the same identity/status/failure model and stale guards. | Cross-row move, stale replace, clear failure, promote blocked by unrelated save | Component CRUD tests | Yes after IMP-08 |
| IMP-11 | 3 | Make row movement first-class in the coordinator | FR-ROW-005, FR-ROW-006 | row handlers, row mutations, tree/table DnD | Submit row move with source/target metadata, expected revisions, stable mutation ID, and scoped status. | Same-node reorder, cross-node move, invalid target, target index drift | Unit and e2e row move proof | No |
| IMP-12 | 3 | Harden row move reconciliation | DATA-CACHE-001, FR-ROW-006 | `estimate-row-tree-move.ts`, `use-estimate-row-mutations.ts` | Ensure missing returned rows trigger explicit refetch/failure state instead of silently returning the old tree. | Cache divergence, partial result rows, stale target branch | Reconciliation tests | No |
| IMP-13 | 3 | Clear drag state on every terminal path | UX-DND-001, PERF-DND-001 | `estimate-workshop-drag.ts`, tree/table drop handlers | Clear active drag state on success, cancel, failure, invalid target, and window drop/dragend. | Drop outside, failed tree drop, Escape/cancel, touch pointer cancel | DnD DOM/browser proof | Yes after IMP-11 |
| IMP-14 | 0.5/4 | Patch RPC edit authorization and history access | DATA-RPC-001, SEC-HISTORY-001, SEC-ACTION-001 | Supabase migrations/RLS/RPC tests | Add DB-level edit checks to mutation RPCs and align history visibility to estimate/project access. This is a Phase 0.5 gate; Phase 4 tracks completion and type-generation cleanup. | Viewer direct RPC, wrong workspace, unrelated project, history read | Provider/local SQL test artifacts | No |
| IMP-15 | 4 | Remove or gate direct browser row writes | DATA-RPC-002 | `estimate-repository.ts`, import tests | Delete direct write APIs, move to server-only, or prove production UI cannot call them. Prefer deletion if no legitimate use remains. | Client import, browser bundle reference, missed write method | Import guard and bundle/source proof | Yes |
| IMP-16 | 0.5/4 | Harden sourceSnapshot, private image access, and public/export DTOs | DATA-SNAPSHOT-001, SEC-IMAGE-001, SEC-PUBLIC-001, SEC-DTO-001 | `actions.ts`, image routes, snapshot utilities, publication/share/export models | Allowlist snapshot fields/sizes, enforce project/estimate access for private images, and prove public/export/history DTOs are minimized. This is a Phase 0.5 gate for component/source/public surfaces. | Signed URL persistence, unrelated user image fetch, huge snapshot, export/source metadata leak, revoked share token | Security and DTO contract test output | Yes |
| IMP-16A | 0.5/4 | Add abuse/rate-limit and secrets posture proof | SEC-ABUSE-001, SEC-SECRETS-001 | Server Actions, route handlers, upload/export/comment tests, env inventory | Define rate/backoff/threshold behavior for direct RPC/action/upload/export/comment loops and verify server-only env boundaries. | Mutation spam, upload spam, export loop, comment spam, secret imported client-side | Rate-limit tests, env inventory review, source/bundle proof | Yes |
| IMP-17 | 5 | Convert performance contracts into evaluators | PERF-ROUTE-001, PERF-TYPE-001, PERF-DND-001, PERF-DOM-001 | perf tests, browser specs, route readiness script | Turn `19_BENCHMARK_CONTRACTS.md` into pass/fail test/evaluator artifacts with environment metadata. | 500/5000 row typing, DnD hover/drop, cold/warm route, mounted row count | Benchmark JSON and command output | Yes |
| IMP-18 | 5 | Prove offline/degraded and cache freshness | REL-OFFLINE-001, DATA-CACHE-001, PERF-QUEUE-001 | offline e2e, cache tests, route reload tests | Prove drafts survive degraded states, retries drain in order, and reload/navigation shows authoritative persisted state. | Offline insert/edit/delete, reconnect conflict, reload after move | E2E/cache evidence | Yes |
| IMP-19 | 6 | Reconcile stale docs and feature flag inventory | DOC-SPEC-001, DOC-FLAG-001 | `.ai/06_specs/*`, feature flag inventory | Update docs only after implementation reality is known. Include default, owner, rollout, rollback for any flag. | Spec contradicts source, undocumented flag | Doc review output | Yes |
| IMP-20 | 6 | Produce final implementation readiness report | DOC-EVIDENCE-001, FR-ACTION-001 | implementation log, `current-state.md`, action matrix | Report local, browser, provider, production, and manual proof separately. Do not claim fixed behavior beyond evidence. | Missing proof class, action without evidence, unclosed security gate | Final verifier signoff | No |

## Implementation Unit Contract Template

Each `IMP-*` task above is a future implementation unit. Before implementation starts, the executor must expand the selected row into this schema and keep it beside the implementation evidence:

| Field | Required Content |
|---|---|
| Unit ID | Existing `IMP-*` ID. |
| Requirement IDs covered | Exact IDs from `04_REQUIREMENTS_SPECIFICATION.md`; no `ACT-*` only rows. |
| Goal | One sentence describing why the unit exists. |
| User/system outcome | Observable outcome after completion. |
| Scope | Repo-relative files likely to create/modify/test. |
| Non-goals | Explicitly excluded adjacent work. |
| Existing patterns | Current repo components/hooks/actions/tests/docs to follow. |
| Dependencies/sequencing | Required prior `IMP-*` gates and safe parallel lanes. |
| Data/API/security/performance implications | Concrete risks and mitigations for this unit. |
| Detailed scenarios | Happy path, edge cases, error/permission failure, regression, accessibility/performance/security where relevant. |
| Verification evidence | Exact commands or artifact paths; classify local/browser/provider/production/manual. |
| Rollback/recovery | Flag rollback, revert path, data repair, or user recovery path. |
| Stop/blocker condition | Condition that requires owner decision or upstream fix. |
| Done criteria | Objective pass/fail evidence required before marking the unit complete. |

## Expanded Critical Units

| Unit ID | Goal | Scope / Non-goals | Existing Patterns | Dependencies | Scenarios | Verification | Rollback/Stop/Done |
|---|---|---|---|---|---|---|---|
| IMP-03A | Prove attack surfaces before broad UX/mutation changes. | Scope: action/RPC/route/public/export/image/env inventory and tests. Non-goal: product UI polish. | Existing `estimate-sheet-actions-authz.test.ts`, route tests, launch security scripts. | Must run before Phase 1-3 readiness claims. | Direct POST malformed args, unauthorized actors, DTO over-return, rate-limit gap, client import of server-only env. | Targeted action/route/RPC tests plus inventory diff. | Stop if an unauthenticated/public path cannot be bounded without owner decision; done when every surface has owner/proof. |
| IMP-08 | Create scoped mutation identity/status model. | Scope: `use-estimate-row-mutations.ts`, possible coordinator hook/store, status subscribers. Non-goal: DB-backed offline queue unless product requires cross-session draining. | Existing row operation IDs, TanStack Query cache patching, Zustand drag store only if shared subscription is needed. | Requires IMP-03A/IMP-14/IMP-15/IMP-16 gates closed or waived. | Concurrent unrelated edits, same-row conflict, retry, stale success, degraded queue age. | Coordinator unit tests, DOM status tests, type-check/lint scoped to touched files. | Roll back with default-off flag; stop if security gates remain open. |
| IMP-11 | Make row movement first-class and fix content-to-tree regression. | Scope: row handlers, row mutations, tree/table DnD, move reconciliation. Non-goal: tree architecture split unless simpler patch fails. | Existing `move_estimate_row_item_with_history`, `estimate-row-tree-move.ts`, target e2e. | Requires IMP-08 and route/cache finalization contract. | Same-node reorder, content-to-tree move, stale target index, missing returned rows, cancellation. | Unit/DOM tests plus scoped Playwright row-move proof. | Roll back through feature flag; done when moved target branch remains draggable and reload shows authoritative order. |
| IMP-16 | Harden source/images/public/export DTOs. | Scope: snapshot allowlists, image auth, publication/share/export DTOs. Non-goal: unrelated proposal redesign. | Existing image route checks, publication snapshot builders, proposal export models. | Phase 0.5 gate for component/source/public/export work. | Signed URL stripping, unauthorized image read, revoked share token, export redaction, oversized snapshot. | Route handler/provider tests and DTO contract tests. | Stop if ACL precedence is unresolved; done when public/private actor matrix passes. |
