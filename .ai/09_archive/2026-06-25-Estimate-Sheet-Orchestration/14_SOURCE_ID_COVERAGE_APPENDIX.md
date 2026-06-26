---
title: Source ID Coverage Appendix
type: docs
date: 2026-06-25
---

# Source ID Coverage Appendix

This appendix answers the adversarial review gap: every source finding/task/threat is explicitly incorporated, deferred, rejected, or superseded. The main traceability matrix stays requirement-oriented; this file is the source-ID completeness proof.

## Center Findings

| Source ID | Disposition | MOP Phase | Owner | Validation / Reason |
|---|---|---|---|---|
| `ESC-P0-01` | Incorporated | MOP-2 | Data + center | Atomic move SQL/RPC/action/DOM proof. |
| `ESC-P0-02` | Incorporated | MOP-2 | Center | Project-source revision-gate deferred-response test. |
| `ESC-P1-03` | Incorporated | MOP-2 | Data + center | All-or-nothing bulk row delete proof. |
| `ESC-P1-04` | Incorporated | MOP-2/MOP-4 | Center + contracts | Stale target/source trust gate tests. |
| `ESC-P1-05` | Incorporated | MOP-4 | Contracts | Shared drag payload parser and rejection tests. |
| `ESC-P1-06` | Incorporated | MOP-5 | Center + perf | Active editor virtualization and perf tests. |
| `ESC-P1-07` | Incorporated | MOP-0/MOP-4 | Contracts | Permission matrix and read-only entry tests. |
| `ESC-P1-08` | Incorporated | MOP-5 | UX/a11y | Table semantics and row live-region tests. |
| `ESC-P1-09` | Incorporated | MOP-4 | Contracts | Custom event validator/rejection tests. |
| `ESC-P2-08` | Incorporated | MOP-5 | UX/a11y | Destructive action language/affordance tests. |
| `ESC-P2-09` | Incorporated | MOP-4 | Contracts | Drag/drop stop-propagation and payload tests. |
| `ESC-P2-10` | Incorporated | MOP-4/MOP-5 | UX/a11y | Keyboard replace/move alternative proof. |
| `ESC-P2-11` | Incorporated | MOP-5 | UX/a11y | Selection pruning/live-region proof. |
| `ESC-P2-12` | Incorporated | MOP-5 | UX/a11y | Focus and virtualized row tests. |
| `ESC-P2-13` | Incorporated | MOP-5 | Perf | Cursor/cache/memoization budgets. |
| `ESC-P2-14` | Incorporated | MOP-5 | Ops/perf | Telemetry/performance observation. |
| `ESC-P2-15` | Incorporated | MOP-5 | UX/a11y | Table semantics/screen-reader release smoke. |
| `ESC-P2-26` | Incorporated | MOP-0/MOP-2 | Data/security | Source freshness and authz preflight/proof. |
| `ESC-P3-16` | Implemented | MOP-6 continuation | Product owner | Editable-total cost sort now uses live editable row totals; covered by `estimate-sheet-cost-inputs.test.tsx`. |
| `ESC-P3-17` | Implemented | MOP-6 continuation | Product owner | Missing component images now use local generated SVG placeholders shared by the library, activity cards, and seed fallback inference; covered by `component-library-helpers.test.ts`. |
| `ESC-P3-18` | Incorporated | MOP-5 | UX/ops | Activity/detail/export copy and evidence where touched. |
| `ESC-P3-19` | Implemented | MOP-6 continuation | Product owner | Proposal workbook export fetch now uses explicit same-origin credentials; covered by `estimate-sheet-center-atomic-contracts.test.ts`. |
| `ESC-P3-20` | Incorporated | MOP-5 | UX/a11y | Empty/degraded state copy and tests. |
| `ESC-P3-21` | Incorporated | MOP-5 | Perf | Large-data/perf budgets. |
| `ESC-P3-22` | Incorporated | MOP-5 | UX/a11y | A11y evidence and focus behavior. |
| `ESC-P3-23` | Implemented / scoped | MOP-6 continuation | Product owner | Same-scope activity history filter reloads are debounced while explicit scope navigation remains immediate; covered by `estimate-sheet-version-control-ui.test.tsx`. |
| `ESC-P3-24` | Implemented | MOP-6 continuation | Product owner | Toast viewport is offset above the bottom dock/safe area; covered by `toast.test.tsx`. |
| `ESC-P3-25` | Incorporated | MOP-5 | Perf/ops | Performance observation and budgets. |

## Center Implementation Tasks

These rows cover the task IDs from the center source plan implementation file `16-IMPLEMENTATION-PLAN.md`.

| Source ID | Disposition | MOP Phase | Owner | Validation / Reason |
|---|---|---|---|---|
| `M-0` | Incorporated | MOP-0 | Lead + data + test | Decision contracts are consolidated into the common control plane before implementation. |
| `M-0T` | Incorporated | MOP-0 | Ops + data | Telemetry sink/redaction proof is a prerequisite, not a late dashboard task. |
| `M-0R` | Incorporated | MOP-0 | Ops | Feature flag, rollback checklist, and external-launch owner are control-plane gates. |
| `M-1` | Incorporated | MOP-2 | Data + center | Atomic move RPC/action/client rewrite with SQL/action/DOM proof. |
| `M-2` | Incorporated | MOP-2 | Center | Project-source revision gate before any project-source safety claim. |
| `M-3` | Incorporated | MOP-2 | Data + center | Transactional bulk-delete RPC or removal of atomic UX claim. |
| `M-4` | Incorporated | MOP-2/MOP-4 | Center + contracts | Stale trust-gate target detection before shared interaction lock. |
| `M-5` | Incorporated | MOP-0/MOP-4 | Contracts + UX | Permission matrix and read-only entry-point gating across all mutation surfaces. |
| `M-6` | Incorporated | MOP-4 | Contracts | Shared drag payload reader and rejection telemetry. |
| `M-6b` | Incorporated | MOP-4 | Contracts | Custom-event validation uses the same payload contract as drag/drop. |
| `M-7` | Incorporated | MOP-4 | Contracts | Drop propagation rule belongs to the shared interaction contract pass. |
| `M-8` | Incorporated | MOP-4 | Contracts | Drag hover state handling is consolidated with shared DnD behavior. |
| `M-9` | Incorporated | MOP-4/MOP-5 | UX/a11y + contracts | Keyboard replace/move model is selected in contract pass and proved in a11y pass. |
| `M-10` | Incorporated | MOP-2/MOP-5 | Center + UX/a11y | Row save-state chips are coupled to center mutation semantics and live-region proof. |
| `M-11` | Incorporated | MOP-5 | UX/a11y | Clear-component icon/copy is destructive-action polish after integrity gates. |
| `M-12` | Revisited / architecture-scope | MOP-6 continuation | Product owner | Current rollback-on-failure is implemented; full undo after successful edits/deletes requires restore data, ordering/conflict semantics, UI policy, and API/RPC work. |
| `M-13` | Incorporated | MOP-5 | UX/a11y | Sort/group copy cleanup in UX/a11y pass. |
| `M-14` | Incorporated | MOP-5 | UX/a11y | Selection pruning announcement in live-region proof. |
| `M-15` | Incorporated | MOP-5 | UX/a11y | Table semantics are a release accessibility gate. |
| `M-16` | Incorporated | MOP-5 | UX/a11y | Inserted-row focus under virtualization is a release accessibility gate. |
| `M-17` | Incorporated | MOP-5 | UX/a11y | Reduced-motion handling in focus/scroll proof. |
| `M-18` | Incorporated | MOP-5 | Perf + center | Active editor virtualization pinning and large-row smoke proof. |
| `M-19` | Incorporated | MOP-5 | Perf | Per-node total memoization belongs to performance budget work. |
| `M-20` | Incorporated | MOP-5 | Perf | Cursor anchor cache belongs to performance budget work. |
| `M-21` | Implemented | MOP-6 continuation | Refactor owner | Pure helper/model extraction is covered by direct tests, and row-handler/controller orchestration is extracted into `use-estimate-row-handlers.ts` with focused row edit/insert/delete/bulk-delete/version-control validation. |
| `M-22` | Implemented | MOP-6 continuation | Refactor owner | Template insertion clone/append helpers and full estimate-template insertion orchestration are extracted into `use-estimate-template-insertion.ts`; the batched template custom-event path remains covered. Project-source subtree insertion is a separate U2 path and remains in `EstimateSheetContent.tsx`. |
| `M-23` | Implemented | MOP-6 continuation | Refactor owner | Activity scope tree construction, same-scope reload debounce, and full activity-history controller orchestration are extracted into `use-estimate-history-panel.ts`; focused history, row-details, extracted-model, and version-control request-shape tests passed. |
| `M-24` | Implemented | MOP-6 continuation | Refactor owner | Proposal preview signature/settings/download helpers, dirty-state warning, and full proposal-preview controller orchestration are extracted and covered through `proposal-preview-model.ts` and `use-estimate-proposal-preview.ts`. |
| `M-25` | Implemented | MOP-6 continuation | Product owner | Account-backed estimate-sheet column-width sync added with locked-down provider table and local first-paint fallback. |
| `M-26` | Implemented for successful row and tree deletes / broader undo remains architecture-scope | MOP-6 continuation | Product owner | Center row delete now has post-success Undo backed by `restore_deleted_estimate_rows_with_history` and provider-applied migration `20260626013000`; tree node/subtree delete Undo is backed by persisted delete snapshots, `restore_deleted_estimate_nodes_with_history`, and provider-applied migration `20260626023000`. These delete-specific restore paths do not claim a general undo stack for every edit. |
| `M-27` | Implemented | MOP-6 continuation | Product owner | Proposal preview now warns when the preview includes unsaved row edits; covered by `proposal-export-preview.test.tsx`. |
| `M-28` | Implemented | MOP-6 continuation | Product owner | Group -> Cost sort uses live editable totals; covered by `estimate-sheet-cost-inputs.test.tsx`. |

## Center Decision Ledger

These rows cover the center source plan decision IDs from `18-OPEN-QUESTIONS-AND-DECISION-LEDGER.md`.

| Source IDs | Disposition | MOP Phase | Owner | Validation / Reason |
|---|---|---|---|---|
| `Q1-Q2` | Incorporated | MOP-5 | UX/a11y | Clear/delete language and undo expectations are handled as destructive-action clarity; full undo policy is deferred unless selected for bulk-delete recovery. |
| `Q3-Q5` | Incorporated | MOP-2 | Data + center | Bulk delete and move semantics are launch-integrity gates: all-or-nothing bulk delete, atomic move, and target-value preservation. |
| `Q6-Q8` | Incorporated | MOP-2/MOP-5 | Center + UX | Editable unsaved rows, uncertain failure recovery, and numeric-input handling are covered by mutation-state and row-status tests. |
| `Q9-Q13` | Incorporated/deferred by accepted defaults | MOP-5/MOP-6 | UX/product | Spreadsheet navigation and drop/confirmation defaults are honored; row reorder and broad undo remain deferred product scope. |
| `Q14` | Incorporated | MOP-4/MOP-5 | Contracts + UX/a11y | Keyboard equivalent is the selected picker/dialog model in `05_MASTER_ORCHESTRATION_IMPLEMENTATION_PLAN.md`. |
| `Q15-Q18` | Incorporated | MOP-1/MOP-2/MOP-4 | Right + center + contracts | Inline edit/snapshot/trust/success semantics are tied to right-sidebar persistence honesty and center trust gates. |
| `Q19-Q23` | Incorporated or accepted defer | MOP-5/MOP-6 | UX/product | Selection pruning, terminology, search/collapse persistence, and column-width scope are covered by UX/a11y or deferred preference policy. |
| `Q24-Q31` | Incorporated or accepted defer | MOP-0/MOP-5/MOP-6 | Ops + UX/product | Proposal/export/save-pending/read-only/truncation/project-source/undo/save-chip/collaboration decisions are represented in requirements and risk gates. |
| `Q32-Q37` | Incorporated | MOP-0/MOP-5 | UX/a11y + ops | Focus, mobile fallback, WCAG target, peso/i18n default, save-chip states, and beta rollback guard are explicit implementation contracts. |

## Right Sidebar Findings, Risks, and Tasks

| Source ID | Disposition | MOP Phase | Owner | Validation / Reason |
|---|---|---|---|---|
| `F-01` | Incorporated | MOP-1 | Right | Persist archive/delete refresh proof. |
| `F-02` | Incorporated | MOP-1/MOP-5 | Right + UX | Rename Project tab to Project Components and copy tests. |
| `F-03` | Incorporated | MOP-1 | Right | Persisted edit via characterized modal. |
| `F-04` | Incorporated | MOP-1 | Right | Latest-wins search test. |
| `F-05` | Incorporated | MOP-1 | Right | Persisted duplicate refresh proof. |
| `F-06` | Incorporated | MOP-1 | Right | Delete/archive invalidation and refresh proof. |
| `F-07` | Implemented | MOP-6 continuation | Product owner | Favorites/recents now sync through account-backed preferences with browser-local first-paint fallback. |
| `F-08` | Implemented | MOP-6 continuation | Product owner | Custom tree ordering now syncs through account-backed preferences with browser-local first-paint fallback. |
| `F-09` | Incorporated | MOP-1/MOP-5 | Right + UX | Folder delete or manage-link fallback; deadline preserved as right Phase 2. |
| `F-10` | Incorporated | MOP-1 | Right | Remove local-only template-group affordance. |
| `F-11` | Incorporated | MOP-1/MOP-2 | Right + center | Snapshot-copy copy; insertion safety waits for center gate. |
| `F-12` | Implemented / browser-proof-limited | MOP-6 continuation | UX/product | Product-specific below-1024 right `Sources` drawer is implemented through `EstimateSheetContent` + `EstimateRightSidebar`; source/jsdom proof covers the real source tools, trigger labelling, Escape order, generic-drawer opt-out, and lazy-load wiring. `e2e/estimate-sources-drawer.spec.ts` is present for browser proof. The 2026-06-25 continuation attempted it against the configured provider and an owner-accessible route candidate, but Playwright rendered the estimate route as 404 before drawer assertions; real-browser viewport/focus/overflow proof remains incomplete. |
| `F-13` | Implemented / automated-profiler-proved | MOP-6 continuation | Refactor owner | Right-sidebar state is split into chrome/library/project/templates hooks and the local `EstimateRightSidebarBase` React Doctor `no-giant-component` warning is cleared. The active-tab render-scope claim is covered by `tests/vitest/perf/estimate-right-sidebar-active-tab-renders.test.tsx`, which profiles the real sidebar shell and proves inactive tab trees stay at zero renders during active-tab interactions. |
| `F-14` | Implemented | MOP-6 continuation | Perf/right | Hover prefetch dedupe is implemented and covered by `component-library-ui.test.tsx`. |
| `F-15` | Implemented | MOP-6 continuation | UX/right | Context-menu rename restores focus to the inline rename input; covered by `component-library-ui.test.tsx`. |
| `RR-01` | Incorporated | MOP-1 | Right | Persistence honesty gate. |
| `RR-02` | Incorporated | MOP-1 | Right | Refresh/invalidation proof. |
| `RR-03` | Incorporated | MOP-1 | Right | Modal identity characterization. |
| `RR-04` | Incorporated | MOP-1 | Right | Duplicate persistence proof. |
| `RR-05` | Incorporated | MOP-1 | Right | Template group removal. |
| `RR-06` | Incorporated | MOP-1 | Right | Snapshot-copy language. |
| `RR-07` | Incorporated | MOP-1 | Right | Search race proof. |
| `RR-08` | Incorporated | MOP-5 | UX/a11y | Hit targets/a11y checks. |
| `RR-09` | Incorporated | MOP-5 | Perf | Prefetch/performance budgets. |
| `RR-10` | Incorporated | MOP-5 | UX | Responsive fallback. |
| `RR-11` | Incorporated | MOP-0/MOP-5 | Ops | Feature flag/rollback semantics. |
| `RR-12` | Incorporated | MOP-0 | Ops | Telemetry sink proof. |
| `RR-13` | Incorporated | MOP-0 | Security | Redaction allow-list. |
| `RR-14` | Incorporated | MOP-5 | Ops | Dashboard/alert or daily review cadence. |
| `RR-15` | Incorporated | MOP-5 | QA | Browser proof where needed. |
| `RR-16` | Incorporated | MOP-0 | Release | Baseline classification. |
| `RR-17` | Incorporated | MOP-5 | Ops | Beta hold evidence. |
| `RR-18` | Incorporated | MOP-5 | Security/ops | Live RLS/provider proof before public launch. |
| `RR-19` | Incorporated | MOP-5 | Security | External image/referrer policy proof. |
| `RR-20` | Incorporated | MOP-5 | Ops | Upload/deploy verification if touched. |
| `RR-21` | Incorporated | MOP-5 | Ops | Alert/daily review ownership. |
| `RR-22` | Incorporated | MOP-6 | Docs/refactor | Handoff cleanup after evidence. |
| `Task 1.0` | Incorporated | MOP-0 | Ops | Telemetry/bundle prerequisite. |
| `Task 1.1` | Incorporated | MOP-1 | Right | Archive delete/restore. |
| `Task 1.2` | Incorporated | MOP-1 | Right | Edit via modal. |
| `Task 1.3` | Incorporated | MOP-1 | Right | Duplicate via server create. |
| `Task 1.4` | Incorporated | MOP-1/MOP-2 | Right + center | Snapshot labels; center insertion safety. |
| `Task 1.5` | Incorporated | MOP-1 | Right | Remove template group. |
| `Task 1.6` | Incorporated | MOP-1 | Right | Search guard. |
| `Task 1.7` | Incorporated | MOP-1 | Right | Transition explainer. |
| `Task 2.1` | Incorporated | MOP-1/MOP-5 | Right + UX | Project Components label. |
| `Task 2.2` | Incorporated | MOP-1/MOP-5 | Right | Folder delete or fallback link. |
| `Task 2.3` | Incorporated | MOP-5 | Right | Manage-link alternative. |
| `Task 2.4` | Implemented | MOP-6 continuation | Product owner | Shared side-panel collapse state persists under the panel storage key; evidence in `mop6-continuation-slice-1.md`. |
| `Task 2.5` | Incorporated | MOP-5 | UX | UX state gaps. |
| `Task 2.6` | Incorporated | MOP-5 | UX | Below-1024 fallback. |
| `Task 3.1` | Incorporated | MOP-5 | UX/a11y | Hit targets. |
| `Task 3.2` | Implemented | MOP-6 continuation | Product owner | `thumbnail_path`/`thumbnailPath` data maps into sanitized sidebar thumbnails; evidence in `mop6-continuation-slice-2.md`. |
| `Task 3.3` | Implemented / automated-profiler-proved | MOP-6 continuation | Refactor owner | Extracted the giant field reducer into tab-scoped hooks in `use-estimate-right-sidebar-state.ts`; parent component now composes those hooks through a thin memoized wrapper. React Doctor no longer reports `EstimateRightSidebarBase` as a giant component, and the active-tab render-scope proof is covered by the automated React Profiler harness. |
| `Task 3.4` | Implemented | MOP-6 continuation | Perf | Hover prefetch dedupe is implemented and covered by `component-library-ui.test.tsx`. |
| `Task 3.5` | Implemented | MOP-6 continuation | UX/right | Context-menu rename focus is implemented and covered by `component-library-ui.test.tsx`. |
| `Task 3.6` | Incorporated | MOP-5 | UX/a11y | Remaining a11y polish. |
| `Task 4.1` | Implemented / browser-proved locally | MOP-6 continuation | UX/product | Dedicated right `Sources` drawer is wired below desktop with `Sheet`/`Dialog` semantics and a single reused sidebar body; focused tests cover source tools, labelling, Escape sequencing, lazy-load wiring, and absence of the generic compact drawer. `e2e/estimate-sources-drawer.spec.ts` now passes in Chromium at 1023px and 390px for dialog semantics, focus, Escape sequencing, scroll lock, and overflow. |

## Right Sidebar Decision Ledger

These rows cover the right-sidebar decision IDs from `20-OPEN-QUESTIONS-AND-DECISION-LEDGER.md`.

| Source IDs | Disposition | MOP Phase | Owner | Validation / Reason |
|---|---|---|---|---|
| `Q1-Q3` | Incorporated | MOP-1/MOP-5 | Right + UX | Tab naming and reusable-source placement are resolved through Project Components/snapshot-copy copy and right-sidebar honesty. |
| `Q4-Q7` | Incorporated | MOP-1 | Right | Edit, duplicate, archive/delete, and local-only action policy are launch trust gates. |
| `Q8-Q10` | Implemented or incorporated by accepted defaults | MOP-1/MOP-6 | Product/right | Favorites/recents and custom ordering now sync through account-backed preferences with browser-local first-paint/offline fallback; folder delete/reparent is either implemented or given an honest fallback. |
| `Q11-Q14` | Incorporated | MOP-1/MOP-5 | Right + UX | Folder creation/rename validation and local-only template group creation are cleaned up or removed. |
| `Q15-Q17` | Incorporated | MOP-1/MOP-2 | Right + center | Project sources are snapshot copies; hover/search refresh behavior is bounded and latest-wins. |
| `Q18-Q22` | Incorporated | MOP-5/MOP-6 | UX/product | Search persistence, preview behavior, insertion quantity, double-click policy, and drag handle behavior are UX/a11y or product-default work. |
| `Q23-Q24` | Incorporated / browser-proved locally | MOP-5/MOP-6 continuation | UX/a11y | Canonical target term is Area; below-1024 right `Sources` drawer access has source/jsdom proof plus local Chromium viewport/focus/Escape/scroll-lock/overflow proof at 1023px and 390px. |
| `Q25-Q30` | Incorporated or accepted defer | MOP-1/MOP-5/MOP-6 | Right + product | Collapse state, transactional bulk insert, undo, read-only availability, shortcut behavior, and legacy `NewComponentForm` removal are scoped into right honesty, UX, or deferred product work. |

## Tree Findings, Migrations, and Threats

| Source ID | Disposition | MOP Phase | Owner | Validation / Reason |
|---|---|---|---|---|
| `F-01` | Incorporated | MOP-3 | Tree | Create/selection race tests. |
| `F-02` | Incorporated | MOP-3 | Tree | Structure-only signature tests. |
| `F-03` | Incorporated | MOP-3 | Data/tree | Sort/preflight and DB invariant runbook. |
| `F-04` | Incorporated | MOP-3 | Data/tree | Sort-order precision/rebalance proof. |
| `F-05` | Incorporated | MOP-3 | Tree | Reorder payload scaling. |
| `F-06` | Incorporated | MOP-3 | Data/tree | Authoritative delete return. |
| `F-07` | Incorporated | MOP-3 | Tree | Route/selection state tests. |
| `F-08` | Incorporated | MOP-0.5/MOP-5 | UX/tree | Empty state/CTA quick win if isolated. |
| `F-09` | Incorporated | MOP-5 | UX/tree | Focus/readability polish. |
| `F-10` | Incorporated | MOP-3 | Data/tree | Max-depth and recursive guard. |
| `F-11` | Incorporated | MOP-4/MOP-5 | UX/tree | Keyboard move alternative. |
| `F-12` | Incorporated | MOP-5 | UX/tree | Hit target/interaction polish. |
| `F-13` | Incorporated | MOP-5 | Perf/tree | Performance budget. |
| `F-14` | Incorporated | MOP-0.5/MOP-5 | UX/tree | `aria-controls`/semantics quick win if isolated. |
| `F-15` | Incorporated | MOP-5 | UX/tree | Focus restoration/a11y. |
| `F-16` | Incorporated | MOP-5 | UX/tree | Read-only/mobile fallback. |
| `F-17` | Incorporated | MOP-3 | Tree | Pending prop queue/selection recovery. |
| `F-18` | Incorporated | MOP-3 | Data/tree | Server create sort scheme. |
| `F-19` | Incorporated | MOP-3 | Data/tree | Explicit edit authz. |
| `F-20` | Incorporated | MOP-3/MOP-5 | Security/tree | Share/public mutation gating. |
| `F-21` | Incorporated | MOP-5 | UX/tree | Empty/degraded states. |
| `F-22` | Incorporated / proof-limited | MOP-5/MOP-6 continuation | UX/tree | Responsive drawer/fallback posture has DOM proof only; browser viewport proof remains unclaimed. |
| `F-23` | Implemented | MOP-6 continuation | Product owner | Tree route repair now reads `[nodeId]` through `useParams` instead of pathname parsing; covered by focused tree DOM/context suites. |
| `F-24` | Implemented | MOP-6 continuation | Product owner | Inline rename now keeps the editor visible while the server rename is saving, disables the controls, and renders a `Saving...` status. Covered by `estimate-tree-context-menu.test.tsx`. |
| `F-25` | Implemented | MOP-6 continuation | Product owner | Newly created tree rows are scrolled into view after optimistic create. Covered by `estimate-tree-modal.test.tsx`. |
| `F-26` | Implemented / split from lazy-realtime | MOP-6 continuation | Product owner | Source F-26 was the add-child placement decision, not lazy/realtime. Current behavior consistently appends new/dropped children after existing children; context-menu and DnD tests document that decision. Lazy subtree loading/realtime-v2 are tracked separately under Q-17/Q-18 and are now contract-closed. |
| `F-27` | Incorporated | MOP-3 | Tree | Signature isolation with row-edit integration. |
| `M-01` | Incorporated | MOP-3 | Data/tree | Delete RPC return runbook. |
| `M-02` | Implemented / provider-applied | MOP-6 continuation | Data/tree | Sparse ordering now preserves existing numeric sort values and emits one moved-node midpoint update when safe; migration `20260625221500` converts linked `estimate_nodes.sort_order` to `numeric(20,4)`, rewrites active RPC sort contracts, preserves tab-aware unique constraints/indexes, and is recorded in remote migration history. |
| `M-03` | Incorporated | MOP-3 | Data/tree | Create sort scheme update. |
| `T-01` | Incorporated | MOP-3 | Security/tree | Tree mutation authz proof. |
| `T-02` | Incorporated | MOP-3 | Security/tree | Cross-workspace rejection. |
| `T-03` | Incorporated | MOP-3 | Security/tree | RPC grants/RLS proof. |
| `T-04` | Incorporated | MOP-3 | Security/tree | Viewer mutation escalation proof. |
| `T-05` | Incorporated | MOP-4 | Contracts | Event validation/rejection. |
| `T-06` | Incorporated | MOP-4 | Contracts | Malformed payload handling. |
| `T-07` | Incorporated | MOP-3 | Security/tree | Delete authority/fallback. |
| `T-08` | Incorporated | MOP-3 | Security/tree | Sort/reorder guard. |
| `T-09` | Incorporated as accepted risk | MOP-3 | Tree | LWW boundary documented and tested. |
| `T-10` | Incorporated | MOP-5 | Ops/tree | Telemetry/monitoring. |
| `T-11` | Incorporated | MOP-5 | UX/a11y | Keyboard/focus proof. |
| `T-12` | Incorporated | MOP-5 | Perf/tree | Large tree/payload limits. |
| `T-13` | Incorporated | MOP-3 | Security | No-referrer/no-store route proof. |
| `T-14` | Incorporated | MOP-3 | Data/tree | Max-depth 100 client/server/DB enforcement. |
| `T-15` | Incorporated | MOP-5 | Ops/security | Rollout monitoring and rollback. |

## Tree Decision Ledger

These rows cover the tree decision IDs from `12-OPEN-QUESTIONS-AND-DECISIONS.md`.

| Source IDs | Disposition | MOP Phase | Owner | Validation / Reason |
|---|---|---|---|---|
| `Q-01-Q-05` | Incorporated | MOP-0.5/MOP-3/MOP-5 | Tree + UX | Create/rename selection and cancel behavior are current or quick-win/tree-race validation. |
| `Q-06` | Incorporated | MOP-3 | Tree | Escape on unsaved optimistic node rolls back; covered by create/race tests. |
| `Q-07-Q-10` | Incorporated | MOP-3 | Tree + data | Name validation, delete fallback, and cascade behavior are tree mutation proof. |
| `Q-11` | Implemented for successful deletes / broader undo remains architecture-scope | MOP-6 continuation | Product owner | Center row delete Undo is provider-applied through `20260626013000`; tree/subtree delete Undo is provider-applied through `20260626023000` with persisted delete snapshots, restore RPC, and success-toast Undo. Do not claim a general undo stack for every edit from these delete-specific restore paths. |
| `Q-12-Q-16` | Incorporated | MOP-3/MOP-5 | Tree + UX | Hover expand, move selection, expansion persistence, URL selection, and per-row pending states are implementation/test gates. |
| `Q-17-Q-18` | Implemented / contract-closed | MOP-3/MOP-5/MOP-6 continuation | Tree + perf | Last-write-wins remains the tree conflict strategy, virtualization remains the visible-row renderer, and lazy subtree loading now has typed subtree payloads, request-id freshness guards, bounded branch fetches, per-node hydration state, and expand-time hydration for partial / over-limit terminal nodes. Realtime cursor/presence remains unchanged; tree collaboration v2 now has a concrete event contract for subtree request/load, LWW branch changes, and full-refetch requests. |
| `Q-19-Q-20` | Incorporated | MOP-3/MOP-5 | Security + data/tree | Public/share CRUD hiding and max depth 100 are security/data gates. |
| `Q-21-Q-25` | Incorporated or accepted defer | MOP-4/MOP-5/MOP-6 | Contracts + UX/product | Multi-node drag, character count, external drops, presence, and two-tab behavior are scoped into v1 contracts or deferred product scope. |

## Tree Edge-Case Matrix

These rows cover `EC-001` through `EC-060` from `08-EDGE-CASE-AND-TEST-MATRIX.md`. Ranges are grouped by interaction family so implementation owners can test by behavior without losing ID coverage.

| Source IDs | Disposition | MOP Phase | Owner | Validation / Reason |
|---|---|---|---|---|
| `EC-001-EC-009` | Incorporated | MOP-3 | Tree | Create, optimistic remap, selection preservation, parent chaining, IME, and server echo behavior. `EC-006` is P1 create/selection race proof. |
| `EC-010-EC-016` | Incorporated | MOP-3/MOP-5 | Tree + UX | Rename validation, failure, escape, concurrent rename, and delete-during-rename handling. |
| `EC-017-EC-025` | Incorporated | MOP-3 | Data/tree | Delete, cascade, fallback selection, bulk dedupe, and all-or-nothing/authoritative server return. `EC-022` is P1 delete-cascade proof. |
| `EC-026-EC-035` | Incorporated | MOP-3/MOP-5 | Tree + perf | Same-parent/cross-parent reorder, invalid drops, mutation blocking, hover expand, and auto-scroll/perf behavior. |
| `EC-036-EC-037` | Incorporated | MOP-4 | Contracts | Template and project-source external drops use shared event/payload contracts. |
| `EC-038-EC-041` | Incorporated | MOP-4/MOP-5 | UX/a11y + contracts | F2, context menu, keyboard move, and typeahead support; v1 uses explicit Move dialog/picker rather than hidden keyboard DnD. |
| `EC-042-EC-046` | Incorporated | MOP-3/MOP-5 | Tree + UX | Selection, tab-switch stale selection, expand/collapse, and expansion persistence. |
| `EC-047-EC-048` | Incorporated/deferred by fallback | MOP-5/MOP-6 | UX/product | Resize persistence and mobile/sidebar fallback; drawer requires separate proof if implemented. |
| `EC-049-EC-051` | Incorporated | MOP-5 | UX/tree | Search, hide-empty filter, and bulk selection behavior. |
| `EC-052` | Incorporated | MOP-3/MOP-5 | Security/tree | Read-only permission denial and no optimistic mutation. P1 permission proof. |
| `EC-053-EC-055` | Incorporated as accepted risk/test scope | MOP-3 | Tree + data | Concurrent create/rename/bulk delete behavior; last-write-wins or server dedupe boundaries documented. |
| `EC-056-EC-059` | Incorporated | MOP-3/MOP-5 | Tree + reliability | Cancel/unmount/offline/slow-network recovery and persistent feedback. |
| `EC-060` | Incorporated | MOP-5 | Perf/tree | Large-tree virtualization and payload budget proof. |
