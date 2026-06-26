---
title: Consolidated Requirements
type: docs
date: 2026-06-25
---

# Consolidated Requirements

## Requirement Table

| ID | Requirement | Sources | Acceptance Shape |
|---|---|---|---|
| `ESO-PREREQ-01` | Establish a single implementation brief, feature flag/rollback policy, telemetry schema/storage proof, read-only permission matrix, project-boundary check, live schema/RLS/grant introspection, and validation baseline before code work. | Center `M-0/M-0T/M-0R`, right `Task 1.0`, tree `P0.5` | Written contracts exist; owners assigned; Supabase project ref is `ebxxqidacheyapmmzavr`; known baseline reds recorded. |
| `ESO-DATA-01` | Replace center component move with one atomic persisted operation that either moves both source/target row values and history or writes nothing. | Center `ESC-P0-01`, `M-1` | SQL/RPC proof, generated types, action tests, DOM failure tests pass. |
| `ESO-DATA-02` | Make center selected-row bulk delete all-or-nothing if UI claims atomic delete. | Center `ESC-P1-03`, `M-3` | Mixed revision/failure writes zero rows; recovery message truthful. |
| `ESO-DATA-03` | Project-source insert must reject/stall/reconcile stale returned trees and preserve newer local edits. | Center `ESC-P0-02`, right `F-11`, tree external source events | Deferred-response test proves newer local row edit survives stale response. |
| `ESO-DATA-04` | Tree delete must return authoritative deleted IDs/fallback from the server or have an explicitly accepted guarded defer. | Tree `F-06`, `M-01` | Action/RPC proof matches cascade result; selection fallback deterministic. |
| `ESO-DATA-05` | Tree sort scheme must support repeated reorder without integer exhaustion or uniqueness churn. | Tree `F-02`, `M-02/M-03` | Preflight, migration proof, generated types, reorder payload tests pass. |
| `ESO-AUTHZ-01` | Every tree, row, library, drag, keyboard, and custom-event mutation entry point must enforce edit authority consistently. | Center `ESC-P1-07`, tree `F-19/T-04/Q-19`, right `Q28` | Viewer/public/share/cross-workspace mutations denied; server actions enforce workspace ownership before writes; UI disabled with reason. |
| `ESO-RIGHT-01` | Right sidebar component delete/archive must persist and refresh honestly, with undo/restore semantics if offered. | Right `F-01/F-06`, `Task 1.1` | DB row archive/restore proof; refresh shows expected state. |
| `ESO-RIGHT-02` | Right sidebar component edit and duplicate must use persisted server paths or remove the affordance. | Right `F-03/F-05`, `Task 1.2/1.3` | Refresh after edit/duplicate preserves server data and identity. |
| `ESO-RIGHT-03` | Remove local-only template group creation; do not add a table for this scope. | Right `F-10`, `Task 1.5` | Affordance absent or explicitly non-persistent with no save implication. |
| `ESO-RIGHT-04` | Reusable project-source search must be latest-wins, bounded, workspace-scoped, privacy-safe, and label source insertion as snapshot copy. | Right `F-04/F-11`, `Task 1.4/1.6/1.7` | Slow query cannot overwrite newer query; malformed/oversized searches fail closed; raw query text is not stored in telemetry; copy/toast no longer says live/read-through. |
| `ESO-TREE-01` | Tree structure signature must ignore row-item-only fields while including structural fields needed for navigation correctness. | Tree `F-02/F-27`, audit `C5` | Unit test proves row-only edits do not resync tree; name/sort changes still do. |
| `ESO-TREE-02` | Tree create, rename, delete, reorder races must preserve selection, expansion, pending prop queues, and failure recovery. | Tree `F-01/F-07/F-17`, `P3`, `Q-06/Q-14` | Focus/selection tests and deferred-response tests pass. |
| `ESO-TREE-03` | Share/public surfaces must not expose edit affordances or leak share tokens through referrers. | Tree `Q-19/T-13`, share tests | Header/static tests pass; public routes stay no-store/no-referrer as applicable. |
| `ESO-CONTRACT-01` | Drag MIME payloads and window event details must be parsed by shared guarded readers and rejected safely when malformed or unauthorized. | Center `M-6/M-6b`, right drag emitters, tree external drops | Shared parser tests; malformed/custom events no-op with telemetry. |
| `ESO-CONTRACT-02` | Success, recents, and toasts must fire only after actual insertion/persistence, not after opening a trust gate or local optimistic attempt. | Center `Q18`, right library recents, tree insert dispatch | Tests prove blocked trust gate does not update recents/success UI. |
| `ESO-UX-01` | Center grid remains the primary workspace; sidebars support it without permanently stealing width. | `DESIGN.md`, UX lane, right/sidebar plans | Right dock defaults near design range; below-1024 behavior is explicit. |
| `ESO-UX-02` | Use disabled-not-hidden read-only controls with reason copy for estimate actions; browse/search/preview may remain available. | Center, right, tree, UX lane | Keyboard and pointer cannot mutate; disabled reason is announced. |
| `ESO-A11Y-01` | Provide explicit picker/dialog keyboard alternatives for drag/replace/move and complete key support for tree rename/context/typeahead/move. | Center `M-6`, tree `F-11/P5`, UX lane | DOM plus keyboard/browser proof for claimed interactions; no implementation agent chooses a new keyboard model ad hoc. |
| `ESO-A11Y-02` | Add truthful row-level save/error/live-region states and table/tree semantics. | Center `M-8`, UX lane | ARIA/table/live region DOM tests pass. |
| `ESO-PERF-01` | Preserve active editor focus under virtualization and avoid tree re-render/payload cliffs on large estimates. | Center `M-18/M-19`, tree `P2`, right `3.3/3.4` | Targeted perf/unit tests and large-data smoke evidence pass. |
| `ESO-OPS-01` | Rollout requires telemetry events, dashboard/alert or daily review cadence, rollback/fix-forward instructions, and beta hold evidence. | Center `M-0T/M-0R`, right `23/24/31`, tree `P0.5/P8` | Evidence recorded before public/user-facing claim. |
| `ESO-TEST-01` | Each implementation slice starts with RED tests/proofs and ends with targeted GREEN validation; broad validate is final/interpretable. | All validation docs, current-state | RED->GREEN records include pre-existing baseline classification. |

## Deferred or Rejected Requirements

| ID | Decision | Reason |
|---|---|---|
| `ESO-DEFER-01` | Defer center component decomposition until post-launch. | Behavior locks and data safety are higher priority; decomposition would increase merge risk. |
| `ESO-DEFER-02` | Superseded by MOP-6 continuation for account-synced favorites/recents, right-sidebar state, and estimate-sheet column widths. | No longer an active deferral for those preferences; browser-local storage remains the first-paint/offline fallback. |
| `ESO-DEFER-03` | Defer full mobile editing; compact right `Sources` drawer was separately scoped and source/jsdom-implemented in MOP-6. | Browser viewport/focus/overflow proof for the drawer remains open; full mobile editing is still outside this scope. |
| `ESO-DEFER-04` | Defer tree delete undo. | Source plan explicitly defaults `Q-11` to post-launch. |
| `ESO-REJECT-01` | Reject partial-success bulk row delete. | Center plan selected all-or-nothing contract for recovery and user trust. |
| `ESO-REJECT-02` | Reject live/read-through project sources. | Right and UX lanes select snapshot copy semantics. |
| `ESO-REJECT-03` | Reject new broad feature-flag framework by default. | Existing config/cookie patterns and rollback checklist should be used unless proven insufficient. |
| `ESO-REJECT-04` | Reject persisting template groups as a new table for this scope. | Right plan selected removal over new schema. |
| `ESO-REJECT-05` | Reject new tree dependency and multi-node drag for v1. | Adds blast radius without launch-critical value. |

## Open Implementation Clarifications

These are not blockers to planning, but must be resolved in MOP-0 before code:

- Exact RPC names for center atomic move and bulk row delete, including `_with_history` naming.
- Telemetry sink/table/delivery path and allow-listed event fields.
- Feature flag default and whether rollback requires rebuild/redeploy.
- Exact microcopy for disabled/read-only reason tooltips and live-region announcements may be refined in implementation, but must preserve the selected matrices in `05_MASTER_ORCHESTRATION_IMPLEMENTATION_PLAN.md`.
- Sparse sort precision/rebalance trigger after repeated-move tests.
- Live Supabase function signatures, grants, RLS policies, constraints, and indexes before any migration SQL is written.
- `AddComponentModal` edit identity semantics.
- Monitoring owner: managed alerts or daily dashboard review during beta hold.
