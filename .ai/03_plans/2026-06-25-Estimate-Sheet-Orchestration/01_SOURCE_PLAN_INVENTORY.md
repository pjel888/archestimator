---
title: Source Plan Inventory
type: docs
date: 2026-06-25
---

# Source Plan Inventory

## Inventory Summary

| Source Plan Folder | Files | Approx Lines | Canonical Implementation Doc | Planning Status |
|---|---:|---:|---|---|
| `2026-06-24-Estimate-Sheet-Center-Content-Analysis` | 25 | 5,800 | `IMPLEMENTATION_PLAN.md` over older `16-IMPLEMENTATION-PLAN.md` when different | Static-analysis implementation plan with source-plan modifications present in current worktree. |
| `2026-06-24-Estimate-Sheet-Right-Sidebar-Analysis` | 35 | 7,645 | `IMPLEMENTATION_PLAN.md` over historical `18-IMPLEMENTATION-PLAN.md` when different | Most mature package; several files modified in current worktree. |
| `2026-06-24-Estimate-Sheet-Tree-Sidebar-Analysis` | 21 | 6,394 | `IMPLEMENTATION_PLAN.md` over historical `10-IMPLEMENTATION-PLAN.md` when different | Implementation plan and coordination ledger are untracked in current worktree. |

The source plan folders are inputs only. This orchestration package does not normalize, rewrite, or commit them.

## Center Content Plan

Stable IDs to preserve:

- Launch/data integrity: `ESC-P0-01`, `ESC-P0-02` as P1, `ESC-P1-03`, `ESC-P1-04`, `ESC-P1-05`, `ESC-P1-07`, `ESC-P2-26` as P1, `ESC-P1-09`.
- UX/a11y/perf: `ESC-P1-06`, `ESC-P1-08`, `ESC-P2-08`, `ESC-P2-09`, `ESC-P2-10`, `ESC-P2-12`, `ESC-P2-13`, `ESC-P2-15`, `ESC-P3-22` as P2.
- Tasks: `M-0`, `M-0T`, `M-0R`, `M-1` through `M-28`.
- Decisions: `Q3`, `Q4`, `Q5`, `Q14`, `Q18`, `Q23`, `Q32`, `Q33`, `Q34`, `Q37`.

Core findings:

- `ESC-P0-01`: component move uses two separate row replacements and can partially persist.
- `ESC-P0-02`: project-source insert can apply stale returned trees and hide newer local edits until refresh.
- `ESC-P1-03`: selected-row bulk delete is not atomic if implemented as repeated single deletes.
- Read-only controls, custom events, drag payloads, per-row save truth, destructive labels, table semantics, virtualization, and telemetry need coordinated fixes.

Master interpretation:

- Center Phase 0 is mandatory before client work: decision contracts, telemetry sink, rollout/rollback guard.
- Center Phase 1 is launch-blocking: atomic move RPC, revision-gated project-source insert, transactional bulk delete, stale target/source freshness, read-only gating, `row_moved` history support.
- Center Phase 8 decomposition is post-launch and must not precede behavior locks.

## Right Sidebar Plan

Stable IDs to preserve:

- Findings: `F-01` through `F-15`.
- Risks: `RR-01` through `RR-22`.
- Phase 1 tasks: `Task 1.0` through `Task 1.7`.
- Phase 2 tasks: `2.1` through `2.6`.
- Phase 3 tasks: `3.1` through `3.6`.
- Deferred/accepted: `F-07`, `F-08`, `F-12` mobile drawer as later phase.

Core findings:

- Component delete/edit/duplicate flows are local-only or persistence-dishonest while UI implies durable change.
- Template group creation is local-only and should be removed rather than persisted in this scope.
- Project-source labels imply live/read-through behavior; selected language is snapshot copy.
- Search needs latest-wins request identity.
- `AddComponentModal` edit identity semantics and telemetry table/storage existence must be characterized before Phase 1 implementation.

Master interpretation:

- Right Phase 1 must ship as one persistence-honesty bundle after shared telemetry/flag/read-only contracts are fixed.
- Right project-source proof cannot claim safety until center project-source revision gating is implemented or explicitly waived.
- Browser-local favorites/recents/widths are acceptable for beta if documented; local-only create/edit/delete/duplicate are not.

## Tree Sidebar Plan

Stable IDs to preserve:

- Findings: `F-01` through `F-27`.
- Phases: `P0` through `P8`.
- Migration/data IDs: `M-01`, `M-02`, `M-03`.
- Threat IDs: `T-04`, `T-13`.
- Decisions: `Q-06`, `Q-11`, `Q-14`, `Q-19`, `Q-20`, `Q-22`.
- Edge-case IDs: `EC-006`, `EC-022`, `EC-038` through `EC-041`, `EC-052`.

Core findings:

- `F-02/F-27`: `getEstimateTreeContentSignature` includes row-item fields, so row-only edits can trigger sidebar-wide tree reconciliation and optimistic-state clobbering.
- `F-11`: no keyboard drag alternative.
- `F-19`: tree mutation actions need explicit edit authorization.
- `F-06`: delete return is client-projected rather than authoritative.
- `F-01`: optimistic create/Zustand race.
- `T-13`: share-token referrer leakage risk needs route/header review.

Master interpretation:

- Tree is not isolated cleanup. It owns route, selection, cache, event-dispatch, external-drop, and responsive shell contracts shared with the center and right sidebar.
- `P0.5` release infrastructure belongs before risky DB, accessibility, or primitive changes.
- `M-02` numeric/sparse sort migration is high risk and must be single-owner with preflight, dump, generated types, and rollback/fix-forward plan.

## Cross-Source Themes

| Theme | Center | Right | Tree | Master Treatment |
|---|---|---|---|---|
| Data integrity | Atomic move, bulk delete, revision gate | Persisted component CRUD | Delete return, sort order, authz | Single data/RPC owner for MOP-2/MOP-3; right persistence honesty can run in MOP-1 after MOP-0. |
| Event contracts | `archestimator:add-library-item`, template/source insert consumers | Event emitters and source/search UI | Template/source insert dispatch | One shared event contract in MOP-4. |
| Read-only mode | Disable controls and entry points | Browse/search/preview only | Hide/disable CRUD and share gating | One permission matrix in MOP-0. |
| Telemetry | `M-0T` events | Task 1.0 telemetry | Rollout monitoring | One sanitized telemetry schema/sink. |
| Accessibility | Table semantics, row live states | Hit targets, labels | Keyboard DnD/tree APG | One a11y roadmap with targeted proof. |
| Responsive layout | Mobile read-only fallback | Right dock/fallback | Left tree drawer/fallback | Desktop-first beta with honest below-1024 fallback; drawer later unless scoped. |

## Known Source Limitations

- Source audits are primarily static/source-level.
- Runtime browser, screen-reader, live provider, linked Supabase, and production proof are not present.
- Some source folders are currently modified/untracked. This package treats that as the current evidence baseline and does not correct it.
