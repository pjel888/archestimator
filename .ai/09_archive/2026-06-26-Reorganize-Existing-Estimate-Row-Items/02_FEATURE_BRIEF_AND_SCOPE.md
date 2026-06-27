# Feature Brief And Scope

## User Need

Estimators need to reorganize estimate rows after entering work items. They may move a row from one area to another, or simply change the order of rows inside the same area. The UI should make that possible directly from the row without forcing delete/recreate or manual copy.

## Problem Evidence And Do-Nothing Cost

The demand source is the owner-requested row drag affordance plus the clarification that same-branch reorder is required. Source evidence supports the gap: the row table intentionally removed a reorder grip because there was no row reorder handler or RPC, so the UI cannot truthfully expose row movement yet.

If this is not built, beta estimators must keep using delete/recreate, manual copy, or unrelated component movement to correct row order. That raises rework risk, makes estimates harder to read in presentation order, and leaves a known gap in the core estimating happy path.

## Product Success Metrics

- A beta user can move a row to another branch and reorder rows inside the same branch without Philip explaining the workflow.
- Keyboard and coarse-pointer users can complete the same move or reorder without pointer drag.
- The common move path avoids delete/recreate and manual copy.
- Failed moves restore the prior order with clear feedback.
- Beta feedback confirms the handle reads as row movement, not row selection or component movement.

## User Stories

- As an estimator, I can drag a Living Room row above another Living Room row so the Living Room scope reads in my preferred order.
- As an estimator, I can drag a row from Living Room to Kitchen in the middle estimate sheet.
- As an estimator, I can drag a row from the middle sheet onto Kitchen in the left tree and have it append to Kitchen.
- As a keyboard user, I can move or reorder a row without pointer drag.
- As a touch user, I can access a move action without relying on hover.
- As a collaborator, I do not lose row edits or overwrite another user's newer row order.

## In Scope

- Single-row reorganization from a row drag handle.
- Same-node row reorder with explicit before or after row targets.
- Cross-node row move within the same estimate and same active tab.
- Left sidebar sheet tree inside-only row drop that appends to the target node.
- Keyboard and coarse-pointer Move row dialog for the same operation.
- Optimistic UI patch with rollback on server failure.
- Persistence through a new server action and transaction-safe RPC.
- History event for row reorganization.
- Focus restoration, live announcements, and keyboard/touch fallback.
- Tests for helper logic, middle sheet behavior, tree external drop, action/RPC authorization, and validation commands.

## Out Of Scope For First Implementation

- Multi-row drag based on selected rows.
- Cross-estimate, cross-project, or cross-tab row movement.
- Dragging rows into filtered or grouped virtual views with transformed order.
- Reordering sheet tree nodes as part of the row operation.
- New third-party drag-and-drop library.
- Production rollout or provider mutation during this planning phase.

## MVP Behavior

The MVP moves one row at a time. Row drag is disabled while multiple selected rows are active. This avoids accidental bulk moves without blocking future selected-row movement.

## Non-Goals

- The feature is not a cosmetic drag icon.
- The feature is not component swapping.
- The feature is not tree-node reorder.
- The feature is not a replacement for the existing row selection checkbox.
