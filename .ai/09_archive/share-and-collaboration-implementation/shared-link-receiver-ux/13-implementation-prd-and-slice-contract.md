# 13 - Implementation PRD and Slice Contract

## Problem

The shared-link receiver page is functionally rich but visually misprioritized. Recipients need to inspect and respond to an estimate, yet the current layout uses a centered `max-w-7xl` document-like shell, a fixed right rail, an internal fixed tree rail, and a large chart before row content. This reduces row-reading efficiency and makes the page feel smaller than the viewport.

## Objective

Create an adaptive receiver workspace that makes estimate review faster and clearer while preserving all current security, view-only, password, recipient session, comment, and decision behavior.

## Users

- Client decision-maker.
- Cost reviewer / quantity surveyor.
- Procurement or buyer reviewer.
- Executive mobile reviewer.
- Project sender / manager.

## Non-Goals for First Implementation

- No schema changes.
- No new API routes.
- No changes to password/session/token security.
- No Teamspaces/member grants.
- No PDF/export pipeline.
- No threaded comments or attachments.
- No landing-style redesign.

## Slice 1 - Receiver Shell and Layout Rebalance

**Goal:** widen and rebalance the page without moving API behavior.

**Likely files:**

- `src/app/share/[token]/page.tsx`
- `src/components/share/SharePageSessionBanner.tsx`
- optional new `src/components/share/ShareReceiverShell.tsx`

**Acceptance:**

- desktop content no longer feels like a narrow centered document,
- non-session rail does not consume full 320px,
- no behavior changes to password/session/comments/decision,
- desktop and mobile screenshots captured.

## Slice 2 - Estimate Workspace Extraction

**Goal:** turn `SharePageTabs` into a thin compatibility wrapper around focused components.

**Likely files:**

- `src/components/share/SharePageTabs.tsx`
- `src/components/share/ShareEstimateWorkspace.tsx`
- `src/components/share/ShareEstimateToolbar.tsx`
- `src/components/share/ShareEstimateGridMode.tsx`
- `src/components/share/ShareCostBreakdownPanel.tsx`

**Acceptance:**

- `SharePageTabs` props remain stable,
- active sheet sessionStorage behavior remains stable,
- Tree/Grid per-sheet state remains stable,
- chart is no longer above sheet tabs by default,
- test coverage covers wrapper behavior.

## Slice 3 - Navigation and Search

**Goal:** make large estimates navigable.

**Likely files:**

- `ShareEstimateToolbar`
- `ShareEstimateGridMode`
- `ShareEstimateTreePanel`
- `ShareEstimateTreeView`
- `src/lib/share/reconstruct-share-tree.ts` only if necessary

**Acceptance:**

- row search filters description, designation, material, and discipline,
- search does not break tree expansion,
- section navigation remains keyboard accessible,
- old snapshots without `treeNodes` still render.

## Slice 4 - Context Rail and Response UX

**Goal:** make decision/comments/chart support the estimate instead of constraining it.

**Likely files:**

- `ShareReceiverContextRail`
- `SharePageDecision.tsx`
- `SharePageComments.tsx`
- `ShareCostBreakdownPanel`

**Acceptance:**

- session and non-session states are visibly different,
- mobile response affordance only appears when useful,
- comments and decisions remain session-gated,
- no public API behavior changes.

## Slice 5 - Route State Polish

**Goal:** prevent blank or ambiguous receiver states.

**Likely files:**

- `src/app/share/[token]/loading.tsx`
- `src/app/share/[token]/error.tsx`
- `SharePageTabs` empty state or extracted empty component

**Acceptance:**

- empty estimates do not render `null`,
- password/lockout/expired/revoked states are clear,
- no private data leaks in invalid-token states.

## Implementation Order

1. Slice 1.
2. Slice 2.
3. Slice 3.
4. Slice 4.
5. Slice 5.

Do not reorder unless a blocker proves a dependency is wrong.

## Slice Entry Gates

No slice may start until:

1. the previous slice has passed its exit gate or has been rolled back,
2. GitNexus/code-review-graph pre-edit requirements from `02` are recorded,
3. the relevant red tests/assertions from `15-implementation-test-spec.md` are written or explicitly marked not applicable,
4. file ownership is assigned if more than one agent is working,
5. the rollback checkpoint from the previous slice is available.

## Slice Exit Gates

No slice may be considered complete until:

1. focused tests for that slice pass,
2. `bun run lint:design-system` passes for UI changes,
3. `bun run type-check` passes or unrelated failures are documented,
4. desktop/mobile browser evidence exists for visual changes,
5. password/session/comment/decision behavior is confirmed unchanged or intentionally updated,
6. changed files and rollback path are listed,
7. the leader confirms the next slice can start.

## Required Evidence Per Slice

Each slice closeout must include:

- graph impact evidence,
- changed files,
- tests run,
- browser screenshots where visual behavior changed,
- explicit note that password/session/comment/decision behavior was preserved or tested,
- remaining risks.

## Rollback Checkpoint Contract

Before moving to the next slice, record:

1. changed files,
2. tests run,
3. screenshot evidence,
4. compatibility wrapper status for `SharePageTabs` if extraction started,
5. exact files/components to revert if the next slice fails.

If rollback is used, rerun the focused Vitest baseline and one desktop plus one mobile browser smoke before resuming implementation.
