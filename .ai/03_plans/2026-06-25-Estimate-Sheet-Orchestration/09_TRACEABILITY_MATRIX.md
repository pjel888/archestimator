---
title: Traceability Matrix
type: docs
date: 2026-06-25
---

# Traceability Matrix

| Requirement | Source IDs | Phase | Primary Paths | Validation |
|---|---|---|---|---|
| `ESO-PREREQ-01` | Center `M-0/M-0T/M-0R`, right `Task 1.0`, tree `P0.5` | MOP-0 | `.ai` implementation ledger, telemetry helpers, flag config, Supabase introspection evidence | Contract review, project-ref proof, live schema/RLS/grants inventory, static tests for flags/events if added. |
| `ESO-QUICK-01` | Tree `P0` quick wins, right low-risk focus/hit-target findings | MOP-0.5 | tree empty state, `ResizableSidePanel.tsx`, isolated copy/focus/sizing files | Targeted DOM/static checks; no mutation/API/schema changes. |
| `ESO-DATA-01` | `ESC-P0-01`, center `M-1` | MOP-2 | `supabase/migrations`, `src/lib/estimates/actions.ts`, `use-estimate-row-mutations.ts`, `EstimateSheetContent.tsx` | SQL/RPC prove, action tests, `estimate-sheet-move-component-atomicity`. |
| `ESO-DATA-02` | `ESC-P1-03`, center `M-3` | MOP-2 | migrations, `actions.ts`, `EstimateSheetContent.tsx` | SQL/RPC prove, mixed-revision DOM failure test. |
| `ESO-DATA-03` | `ESC-P0-02`, right `F-11`, tree external source events | MOP-1, MOP-2, MOP-4 | `EstimateSheetContent.tsx`, `reusable-sources/actions.ts`, `component-library/index.tsx`, `EstimateSheetTree.tsx` | Deferred-response race test; snapshot-copy UI test. |
| `ESO-DATA-04` | Tree `F-06`, `M-01` | MOP-3 | migrations/RPC, `actions.ts`, `EstimateSheetTree.tsx` | RPC/action delete cascade proof, fallback selection test. |
| `ESO-DATA-05` | Tree `M-02/M-03` | MOP-3 | migrations/types, `estimate-tree-reorder.ts`, `actions.ts` | Preflight, migration proof, reorder payload/sort precision tests. |
| `ESO-AUTHZ-01` | Center `ESC-P1-07`, tree `F-19/T-04`, right permission docs | MOP-0 through MOP-5 | `actions.ts`, center/tree/right components, event parsers | Viewer/cross-workspace tests, DOM disabled reason tests. |
| `ESO-RIGHT-01` | Right `F-01/F-06`, `Task 1.1` | MOP-1 | `component-library/index.tsx`, `PreviewPanel.tsx`, `component-library/actions.ts` | Archive/restore refresh tests, DB row proof. |
| `ESO-RIGHT-02` | Right `F-03/F-05`, `Task 1.2/1.3` | MOP-1 | `AddComponentModal.tsx`, `component-library/index.tsx`, `actions.ts` | Edit/duplicate refresh tests, identity characterization tests. |
| `ESO-RIGHT-03` | Right `F-10`, `Task 1.5` | MOP-1 | `component-library/index.tsx`, templates tree files | UI absence/non-persistence tests. |
| `ESO-RIGHT-04` | Right `F-04/F-11`, `Task 1.4/1.6/1.7` | MOP-1 | `component-library/index.tsx`, `reusable-sources/actions.ts` | Latest-wins deferred promise test, copy/toast assertions. |
| `ESO-TREE-01` | Tree `F-02/F-27`, `C5` | MOP-3 | `estimate-tree-reorder.ts`, `EstimateSheetTree.tsx` | Signature unit test and row-edit integration test. |
| `ESO-TREE-02` | Tree `F-01/F-07/F-17`, `P3`, `Q-06/Q-14` | MOP-3, MOP-4 | `EstimateSheetTree.tsx`, `use-estimate-workspace-state.ts`, `use-estimate-query.ts` | Create/rename/delete/reorder race tests. |
| `ESO-TREE-03` | Tree `Q-19/T-13` | MOP-3, MOP-5 | `src/proxy.ts`, share routes, tree UI | Header tests, public/share no mutation tests. |
| `ESO-CONTRACT-01` | Center `M-6/M-6b`, right emitters, tree external drops | MOP-4 | event constants, shared parser, center/right/tree components | Parser tests, malformed custom-event tests. |
| `ESO-CONTRACT-02` | Center `Q18`, right recents/success, tree dispatch | MOP-1, MOP-4 | `component-library/index.tsx`, `EstimateSheetContent.tsx` | Trust-gate blocked action does not update success/recents. |
| `ESO-UX-01` | `DESIGN.md`, UX lane | MOP-5 | `ResizableSidePanel.tsx`, workspace shell, right sidebar | Source review, responsive DOM/browser where claimed. |
| `ESO-UX-02` | Center/right/tree read-only docs | MOP-4, MOP-5 | all mutation UI surfaces | Keyboard/pointer disabled tests with reason copy. |
| `ESO-A11Y-01` | Center `M-6`, tree `F-11/P5` | MOP-4, MOP-5 | `ui/tree.tsx`, center row controls | DOM keyboard tests, Playwright for browser-only DnD. |
| `ESO-A11Y-02` | Center `M-8`, UX lane | MOP-5 | row table/cells, toast/live regions | DOM/axe/live region tests, screen-reader release smoke. |
| `ESO-PERF-01` | Center `M-18/M-19`, tree `P2`, right `3.3/3.4` | MOP-5 | virtualization, tree reorder, right reducer/search | Perf unit/DOM, large-data local smoke. |
| `ESO-OPS-01` | Center `M-0T/M-0R`, right `23/24/31`, tree `P8` | MOP-0, MOP-5 | telemetry helpers/tables, docs, flags | Telemetry smoke, rollback drill, beta hold evidence. |
| `ESO-TEST-01` | All validation plans | All phases | tests/prove scripts | RED->GREEN evidence and baseline classification. |
