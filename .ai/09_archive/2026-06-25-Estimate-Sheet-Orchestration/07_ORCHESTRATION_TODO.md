---
title: Orchestration Todo
type: docs
date: 2026-06-25
---

# Orchestration Todo

## Planning Package Checklist

- [x] Create target folder.
- [x] Record master goal and coordination ledger.
- [x] Inventory three source plan folders.
- [x] Run independent center, right-sidebar, tree-sidebar source plan lanes.
- [x] Run independent UX/a11y lane.
- [x] Run independent validation lane.
- [x] Incorporate planner and data-integrity lane returns.
- [x] Incorporate architecture evidence from targeted local audit; external architecture lane returned unusable partial output and was closed.
- [x] Run adversarial document review.
- [x] Apply critique revisions.
- [x] Run independent final verifier.
- [x] Apply final readiness revisions from verifier pass 1.
- [x] Verify all package files exist.
- [x] Run `git diff --check -- .ai/03_plans/2026-06-25-Estimate-Sheet-Orchestration`.
- [x] Confirm no intentional writes outside target folder; earlier dirty-state notes were historical, and current continuation recheck found no external dirty files before this reconciliation pass.
- [x] Run continuation static checks after new edits: package file inventory, stale-claim `rg` scan, scoped `git status`, and `git diff --check`.
- [x] Run fresh independent continuation verifier after scorecard, source-ID, performance, security, and design corrections.
- [x] Resolve continuation code-review findings about stale verifier/checklist bookkeeping.

## Future Implementation Todo

Status note (2026-06-25 continuation): this checklist is a historical planning
breakdown. Current implementation status is superseded by
`17_FULL_SCOPE_COORDINATION_LEDGER.md`, `implementation-ledger.md`, and
`LOOP_LEDGER.md` Cycles 18-27. In short: the safe non-rejected continuation
gaps were implemented and provider-verified; remaining unchecked ideas are
either older completed MOP work already evidenced elsewhere or explicit
product/architecture deferrals such as lazy subtree loading and realtime-v2
contract work.

### MOP-0 Common Control Plane and DB/Authz Preflight

- [ ] Create implementation branch/worktree with source-plan state intentionally handled.
- [ ] Capture current `git status` and validation baseline.
- [ ] Confirm Supabase project ref `ebxxqidacheyapmmzavr`.
- [ ] Run live schema/function/grant/RLS/constraint/index introspection.
- [ ] Decide manual logical dump scope before destructive/high-risk migrations.
- [ ] Assign single owners for hot files.
- [ ] Choose RPC names and API shapes.
- [ ] Define feature flags and rollback controls.
- [x] Prove or create telemetry schema/sink and redaction allow-list.
- [ ] Define permission/read-only matrix.
- [ ] Define shared event/drag payload schemas.
- [ ] Define snapshot-copy and success/recents rules.
- [ ] Define validation matrix and RED test list.

### MOP-0.5 Quick UI/A11y Preflight

- [ ] Identify source quick wins that are isolated from persistence/API/event changes.
- [ ] Add stable `aria-controls` and panel ids where safe.
- [ ] Fix tree empty CTA/empty state if isolated.
- [ ] Apply rename input sizing/token fixes if isolated.
- [ ] Add below-1024 copy-only fallback if it does not alter panel behavior.
- [ ] Run targeted DOM/static tests for each quick win.

### MOP-1 Right Sidebar Persistence Honesty

- [ ] Characterize `AddComponentModal` edit identity.
- [ ] Persist archive/delete/restore through lifecycle archive.
- [ ] Persist edit.
- [ ] Persist duplicate.
- [ ] Remove template group local-only affordance.
- [ ] Add latest-wins project-source search.
- [ ] Replace live/read-through copy with snapshot-copy copy.
- [ ] Add transition explainer.
- [ ] Keep right-sidebar insertion safety claims blocked until center project-source revision gate passes.

### MOP-2 Center Integrity and Trust Gates

- [ ] Add RED SQL/RPC proof for center atomic move.
- [ ] Add RED SQL/RPC proof for center bulk row delete.
- [ ] Add project-source revision gate first.
- [ ] Wire atomic move with deterministic row locks and expected revisions.
- [ ] Wire atomic bulk delete or remove atomic UI claim.
- [ ] Add stale target/source trust gate.
- [ ] Add read-only gates to buttons, drag sources, drop targets, keyboard picker, custom events, callbacks.
- [ ] Add row save chips/live regions.
- [ ] Fix destructive copy.
- [ ] Add active-editor virtualization pinning.
- [ ] Record rollback/fix-forward.

### MOP-3 Tree Security, Delete Authority, and DB Invariants

- [ ] Add RED authz proof for tree mutations.
- [ ] Add RED proof for tree delete return or accepted defer gate.
- [ ] Verify share referrer/cache headers.
- [ ] Implement structure-only tree signature.
- [ ] Fix create/selection race.
- [ ] Fix pending prop queue.
- [ ] Fix rename failure recovery.
- [ ] Fix delete fallback selection.
- [ ] Add explicit tree mutation authz.
- [ ] Add max-depth and sort-order safeguards.
- [x] Decide and apply numeric/sparse sort after code/type/schema/provider
  preflight. `estimate_nodes.sort_order` is now `numeric(20,4)` on the linked
  provider via scoped SQL apply for `20260625221500`; broad `db push` remains
  unsafe because unrelated migration-history drift still exists.
- [ ] Implement selected keyboard move model only after MOP-4 contract selection.

### MOP-4 Shared Interaction and Feedback Contracts

- [ ] Add shared drag payload parser.
- [ ] Add window event validators.
- [ ] Gate custom event/drag/keyboard mutation entry points.
- [ ] Align tree dispatch and center consumers.
- [ ] Align right emitters and center consumers.
- [ ] Test malformed payloads and unauthorized custom events.
- [ ] Add mutation feedback/cache reconciliation/selection recovery tests.
- [ ] Lock keyboard equivalence model.

### MOP-5 UX/A11y/Responsive/Perf/Ops

- [ ] Align right dock width and grid dominance.
- [x] Add below-1024 fallback.
- [ ] Add table header/index semantics.
- [ ] Add live-region announcements.
- [ ] Add tree keyboard support.
- [ ] Add center keyboard replace/move alternative.
- [ ] Add focus restoration tests.
- [ ] Coordinate bottom bulk dock priority.
- [ ] Add render/payload budget tests.
- [ ] Run large-data local smoke tests.
- [x] Verify telemetry redaction.
- [ ] Create dashboard/alert or daily-review cadence.
- [ ] Run rollback drill.
- [ ] Hold beta observation window.

### MOP-6 Post-Launch

- [x] Revisited `EstimateSheetContent.tsx` decomposition. Pure helper/model
  extraction for M-21 through M-24 is now implemented and covered. `M-22`
  estimate-template insertion orchestration is also extracted into
  `use-estimate-template-insertion.ts`, and `M-24` proposal-preview controller
  orchestration is extracted into `use-estimate-proposal-preview.ts`; `M-21`
  row-handler/controller orchestration is extracted into
  `use-estimate-row-handlers.ts`; `M-23` activity-history controller state,
  fetch/pagination guards, and modal focus/Escape handling are extracted into
  `use-estimate-history-panel.ts`.
- [x] Extract right-sidebar reducer/hooks. React Doctor no longer reports the
  right sidebar component as giant; active-tab render scoping is now covered by
  an automated React Profiler regression harness.
- [x] Revisit account-synced preferences. Estimate-sheet column widths and
  right-sidebar state now have account-backed persistence with local first-paint
  fallback.
- [x] Revisit mobile drawers. Right `Sources` drawer now has source/jsdom proof
  and local Chromium browser proof at 1023px and 390px widths for dialog
  semantics, focus, Escape sequencing, scroll lock, and overflow.
- [x] Implement center P3 polish. Local SVG component-image fallbacks,
  same-scope activity-history filter debounce, toast bottom-dock clearance, and
  proposal preview unsaved-edits warning are implemented and focused-test
  proved.
- [x] Implement tree non-launch polish. F-24 keeps the inline rename editor
  visible with a disabled saving affordance, F-25 scrolls newly created tree
  rows into view, and F-26 is documented/proved as append-as-child placement.
- [x] Revisit delete undo. Center row delete post-success Undo is now
  implemented and provider-applied through `20260626013000`; tree node/subtree
  delete Undo is now implemented and provider-applied through `20260626023000`.
- [x] Revisit lazy subtree loading and realtime collaboration. Lazy subtree
  loading now has typed subtree payloads, request-id guards, bounded branch
  fetches, per-node hydration state, and expand-time hydration for partial /
  over-limit terminal nodes. Realtime cursor/presence remains unchanged, and
  tree collaboration v2 now has a concrete event contract for subtree
  request/load, LWW branch changes, and full-refetch requests.
