---
title: Estimate Sheet Executive Summary And Ratings
date: 2026-06-21
status: opencode-synthesis
---

# Executive Summary And Ratings

## Verdict

The current estimate-sheet plan is directionally correct and understated the
data-correctness risk. The OpenCode/GLM audit confirms the major P1/P2
findings, adds the component taxonomy decision, and corrects several
implementation assumptions in the plan package.

Only `.ai/02_audits/OPENCODE-GLM5.2-2026-06-21-Estimate-Sheet-Plan-Audit.md`
is used as external audit input for this revision.

Beta-quality status: do not treat the estimate sheet as finished for
high-volume or parallel editing until the P1 correctness queue is closed. The
normal single-user happy path is much stronger than the partial-failure,
non-default-tab, and large-data paths.

## OpenCode Claim Accuracy Rating

OpenCode rated the existing plan as largely accurate but incomplete:

| Measure | OpenCode result |
| --- | --- |
| Verified claims | 87 |
| Refuted claims | 3 |
| Partial/stale claims | 6 |
| Unverified areas | 0 |
| Overall usefulness | High, with required corrections before implementation |

Implementation-readiness rating: **medium-high**. The plan is safe to use as a
backlog foundation only after the corrections in this document are honored,
especially the existing subtree RPC, replace-row client patching, and RPC
edit-gate hardening.

## Canonical Component Taxonomy

User-facing copy should expose only two component types:

| Canonical type | Includes | Current internal signals |
| --- | --- | --- |
| Library Component | Rows linked to shared cost-library items, including clean, overridden, or source-changed linked rows | `sourceLibraryItemId`; `linkState` values `linked-clean`, `linked-overridden`, `source-changed` |
| Project Component | Project-local row components, including inline-authored express rows, detached/project-specific rows, projected project components, and source-less row components | `metadata.expressComponent`; `linkState = detached`; `metadata.projectComponentProjection`; source snapshots without a current library id |

Keep the internal implementation names until a separate domain migration proves
it is worth the blast radius. `expressComponent`, `projectComponentProjection`,
`linkState`, and source-snapshot provenance are implementation states, not
additional user-facing component types.

Source copy has been aligned for the estimate-sheet card/details path in this
revision. Wider domain cleanup remains future work.

## Confirmed P1 Queue

1. Bulk row delete and component move can cascade through whole-tree rollback.
2. Non-default tab reorder/delete can return and write the default tab tree.
3. Bulk tree-node delete can partially commit before client rollback.
4. Several write RPCs are membership-gated instead of edit-gated.
5. Template-node subtree insert performs serial RPC-per-node and RPC-per-row
   work even though an existing bulk subtree RPC is available.
6. Tree drag-over validation does too much full-tree planning work for large
   trees.

## Confirmed P2 Queue

1. Replace-row paths do not patch the canonical row already returned by the RPC;
   include replace-style clear paths in the fix.
2. Active-tab tree fetch failures can look like empty tabs.
3. Row mutation failures can roll back quietly, and scalar save state is not
   mutation-counted.
4. Project-source insert responses can arrive out of order and overwrite visible
   tree state.
5. Template insert refresh trusts caller tab id instead of the committed node tab.
6. Estimate route, library loader, and reusable project-source search need
   explicit payload and scan budgets.
7. Sidebar edit/duplicate/delete labels must either say they are local-view
   actions or become persisted library CRUD.
8. `Cmd/Ctrl+K` command-palette handling is less guarded than `/` while typing.
9. Proposal preview/download scope handling has fallback mismatches to verify.

## OpenCode Corrections To The Plan

- No new migration should be assumed for template subtree copy until the
  existing `insert_estimate_subtree_into_estimate_with_history` RPC has been
  wired and tested from the client action.
- The replace-row RPC returns canonical row JSON; the current gap is client-side
  extraction/cache patching, not RPC return shape.
- The lazy library loader is project-scoped/lite; the payload risk is route tree
  size and explicit budget/truncation behavior, not a full catalog fetch on
  every open.
- `createFolder` is persisted; the sidebar gap is that the current sidebar tree
  does not render the new folder.
- Auth hardening is still a live OpenCode P1: sister write RPCs should use the
  edit gate consistently.

## Stop Condition For This Plan Pack

This folder is useful when every confirmed P1/P2 is mapped to a concrete backlog
item, every backlog item has focused verification guidance, and the two
canonical labels are used consistently in estimate-sheet user-facing copy and
tests.
