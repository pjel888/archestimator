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
| `ESC-P3-16` | Deferred | MOP-6 | Refactor owner | Product/low-priority enhancement after behavior locks. |
| `ESC-P3-17` | Deferred | MOP-6 | Refactor owner | Non-launch cleanup after characterization tests. |
| `ESC-P3-18` | Incorporated | MOP-5 | UX/ops | Activity/detail/export copy and evidence where touched. |
| `ESC-P3-19` | Deferred | MOP-6 | Product owner | Not launch-blocking. |
| `ESC-P3-20` | Incorporated | MOP-5 | UX/a11y | Empty/degraded state copy and tests. |
| `ESC-P3-21` | Incorporated | MOP-5 | Perf | Large-data/perf budgets. |
| `ESC-P3-22` | Incorporated | MOP-5 | UX/a11y | A11y evidence and focus behavior. |
| `ESC-P3-23` | Deferred | MOP-6 | Product owner | Collaboration/export enhancement after integrity. |
| `ESC-P3-24` | Deferred | MOP-6 | Product owner | Collaboration/export enhancement after integrity. |
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
| `M-12` | Deferred | MOP-6 | Product owner | Undo pattern can follow launch integrity unless selected as the MOP-2 bulk-delete failure path. |
| `M-13` | Incorporated | MOP-5 | UX/a11y | Sort/group copy cleanup in UX/a11y pass. |
| `M-14` | Incorporated | MOP-5 | UX/a11y | Selection pruning announcement in live-region proof. |
| `M-15` | Incorporated | MOP-5 | UX/a11y | Table semantics are a release accessibility gate. |
| `M-16` | Incorporated | MOP-5 | UX/a11y | Inserted-row focus under virtualization is a release accessibility gate. |
| `M-17` | Incorporated | MOP-5 | UX/a11y | Reduced-motion handling in focus/scroll proof. |
| `M-18` | Incorporated | MOP-5 | Perf + center | Active editor virtualization pinning and large-row smoke proof. |
| `M-19` | Incorporated | MOP-5 | Perf | Per-node total memoization belongs to performance budget work. |
| `M-20` | Incorporated | MOP-5 | Perf | Cursor anchor cache belongs to performance budget work. |
| `M-21` | Deferred | MOP-6 | Refactor owner | Post-launch component decomposition after characterization tests. |
| `M-22` | Deferred | MOP-6 | Refactor owner | Post-launch template insertion extraction after behavior locks. |
| `M-23` | Deferred | MOP-6 | Refactor owner | Post-launch history panel extraction after behavior locks. |
| `M-24` | Deferred | MOP-6 | Refactor owner | Post-launch proposal preview extraction after behavior locks. |
| `M-25` | Deferred | MOP-6 | Product owner | Account-synced preferences remain separate schema/RLS scope. |
| `M-26` | Deferred | MOP-6 | Product owner | Broader undo policy follows launch-critical destructive clarity. |
| `M-27` | Deferred with guard | MOP-6 | Product owner | Proposal dirty-state banner is product enhancement unless proposal/export code is touched earlier. |
| `M-28` | Deferred | MOP-6 | Product owner | Editable-total cost sort is lower-priority product behavior after integrity gates. |

## Right Sidebar Findings, Risks, and Tasks

| Source ID | Disposition | MOP Phase | Owner | Validation / Reason |
|---|---|---|---|---|
| `F-01` | Incorporated | MOP-1 | Right | Persist archive/delete refresh proof. |
| `F-02` | Incorporated | MOP-1/MOP-5 | Right + UX | Rename Project tab to Project Components and copy tests. |
| `F-03` | Incorporated | MOP-1 | Right | Persisted edit via characterized modal. |
| `F-04` | Incorporated | MOP-1 | Right | Latest-wins search test. |
| `F-05` | Incorporated | MOP-1 | Right | Persisted duplicate refresh proof. |
| `F-06` | Incorporated | MOP-1 | Right | Delete/archive invalidation and refresh proof. |
| `F-07` | Deferred | MOP-6 | Product owner | Browser-local preferences accepted for beta. |
| `F-08` | Deferred | MOP-6 | Product owner | Account sync/custom ordering deferred. |
| `F-09` | Incorporated | MOP-1/MOP-5 | Right + UX | Folder delete or manage-link fallback; deadline preserved as right Phase 2. |
| `F-10` | Incorporated | MOP-1 | Right | Remove local-only template-group affordance. |
| `F-11` | Incorporated | MOP-1/MOP-2 | Right + center | Snapshot-copy copy; insertion safety waits for center gate. |
| `F-12` | Deferred | MOP-6 | UX/product | Mobile drawer deferred; honest fallback in MOP-5. |
| `F-13` | Deferred | MOP-6 | Refactor owner | Reducer extraction after behavior locks. |
| `F-14` | Incorporated | MOP-5 | Perf/right | Hover prefetch dedupe and budget tests. |
| `F-15` | Incorporated | MOP-0.5/MOP-5 | UX/right | Rename focus race can be quick win if isolated. |
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
| `Task 2.4` | Deferred | MOP-6 | Product owner | Collapse persistence after honesty. |
| `Task 2.5` | Incorporated | MOP-5 | UX | UX state gaps. |
| `Task 2.6` | Incorporated | MOP-5 | UX | Below-1024 fallback. |
| `Task 3.1` | Incorporated | MOP-5 | UX/a11y | Hit targets. |
| `Task 3.2` | Deferred | MOP-6 | Product owner | Thumbnails after integrity. |
| `Task 3.3` | Deferred | MOP-6 | Refactor owner | Reducer extraction after behavior locks. |
| `Task 3.4` | Incorporated | MOP-5 | Perf | Hover prefetch dedupe. |
| `Task 3.5` | Incorporated | MOP-0.5/MOP-5 | UX/right | Rename focus if isolated. |
| `Task 3.6` | Incorporated | MOP-5 | UX/a11y | Remaining a11y polish. |
| `Task 4.1` | Deferred | MOP-6 | UX/product | Mobile drawer separate scope. |

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
| `F-22` | Incorporated | MOP-5 | UX/tree | Responsive drawer/fallback posture. |
| `F-23` | Deferred | MOP-6 | Product owner | Non-launch tree polish. |
| `F-24` | Deferred | MOP-6 | Product owner | Non-launch tree polish. |
| `F-25` | Incorporated | MOP-5 | Perf/tree | Large-tree/perf proof. |
| `F-26` | Deferred | MOP-6 | Product owner | Lazy/realtime v2 scope. |
| `F-27` | Incorporated | MOP-3 | Tree | Signature isolation with row-edit integration. |
| `M-01` | Incorporated | MOP-3 | Data/tree | Delete RPC return runbook. |
| `M-02` | Incorporated | MOP-3 | Data/tree | Numeric/sparse sort runbook. |
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
