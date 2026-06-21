---
title: Estimate Sheet Audit And Improvement
date: 2026-06-21
route: /workshop/projects/22222222-2222-4222-8222-222222222222/estimates/bf254cbd-13d4-4dbf-b21a-84b171cdd6db
status: current-plan
execution: knowledge-work
---

# Estimate Sheet Audit And Improvement

## Scope

This plan package covers the estimate sheet route at:

`http://localhost:3000/workshop/projects/22222222-2222-4222-8222-222222222222/estimates/bf254cbd-13d4-4dbf-b21a-84b171cdd6db`

The review includes route loading, auth gating, tab and tree behavior, row CRUD, library component insertion, reusable templates, reusable project sources, proposal export, activity/history, error handling, performance ceilings, UX affordances, and current test coverage.

The current revision uses one external audit input only:
`.ai/02_audits/OPENCODE-GLM5.2-2026-06-21-Estimate-Sheet-Plan-Audit.md`.
It corrects the plan assumptions that the OpenCode/GLM audit challenged and
makes the component taxonomy decision explicit: user-facing estimate-sheet copy
now has two component types, `Library Component` and `Project Component`.
Internal provenance states such as express, detached, project projection, source
snapshot, and link state remain implementation details.

This package also now includes a focused implementation handoff for adding
right-sidebar component row thumbnails. That addendum is grounded in repo
inspection and parallel review lanes, not any additional external source.

## OpenCode Revision Summary

The most important notice is that component terminology was mixing domain
states with user-facing types. Project-specific rows and express rows are both
project-local components from the user's point of view, so the canonical UI
language is now:

- `Library Component` for shared cost-library-linked rows.
- `Project Component` for project-local row components, including express,
  detached/project-specific, projected project, and source-less row components.

Claims outside this OpenCode/GLM revision are intentionally not carried forward
in this plan package.

## Thumbnail Planning Addendum

The right-sidebar component library can add compact square thumbnails without
changing the current UI direction or taxonomy. The supported approach is:

- render a 24px square thumbnail for component leaf rows only;
- place it after the existing tree icon and before title/supplier/price text;
- reuse `EstimateRowItem.imageUrl` from the existing lite library data path;
- use a stricter row-thumbnail helper, not the card/preview fallback helper;
- render placeholders for missing, broken, invalid, or disallowed URLs;
- keep thumbnail requests bounded by tree virtualization and native lazy image
  loading.

The key notice from the parallel pass is that `getComponentImageUrl(item)` is
too broad for virtualized rows because it can fall back to large category
images. The thumbnail addendum keeps those fallback images out of the right
sidebar list.

## Plan Evidence Summary

- Local dev server was listening on port 3000.
- Unauthenticated route request returned `307 Temporary Redirect` to `/login?next=...`, then `200 OK` for login. This proves the route is protected but blocks unauthenticated live interaction proof.
- Route entry loads `resolveEstimateTabRouteContext` and `requireCurrentUserContext` in parallel, then loads tabs/edit capability in a tail request: `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx:28`.
- Component library data is intentionally excluded from initial server render and lazy-loaded client side: `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx:32`, `src/components/workshop/EstimateSheetContent.tsx:1202`.
- Graph impact context showed the estimate sheet surface is broad: 7 route-related files touched 235 directly related nodes and 297 impacted graph nodes. This supports treating fixes as high-risk even when individual files look local.

## OpenCode Taxonomy Revision Validation Evidence

The OpenCode/taxonomy correction was checked with:

```bash
bunx vitest run tests/vitest/estimate-component-drag.test.tsx tests/vitest/estimate-sheet-library-insert.test.tsx tests/vitest/estimate-sheet-row-details-crud.test.tsx tests/vitest/estimate-sheet-cost-inputs.test.tsx --maxWorkers=1
bun run type-check
git diff --check -- .ai/03_plans/2026-06-21-Estimate-Sheet-Audit-And-Improvement .ai/10_state/current-state.md src/components/workshop/EstimateSheetContent.tsx src/components/workshop/estimate-sheet/activity-history.tsx src/components/workshop/estimate-sheet/rows/cells.tsx src/components/workshop/estimate-sheet/rows/row-table.tsx tests/vitest/estimate-component-drag.test.tsx tests/vitest/estimate-sheet-library-insert.test.tsx tests/vitest/estimate-sheet-row-details-crud.test.tsx tests/vitest/estimate-sheet-cost-inputs.test.tsx
```

Observed result: the focused suite passed 4 files / 82 tests, type-check passed,
and static guards returned clean for audit-source isolation, stale OpenCode
correction claims, old visible component labels, and accidental persistence of
canonical UI labels into provenance fields.

## Artifact Index

- `00-executive-summary-and-ratings.md` - OpenCode verdict, rating, canonical component taxonomy, and carry-forward status.
- `01-user-step-matrix.md` - user-facing feature paths, step-by-step behavior, expected result, and evidence.
- `02-crud-and-edge-case-audit.md` - CRUD matrix and edge cases, including library/template auto-appearance.
- `03-performance-reliability-code-review.md` - prioritized defects and engineering review findings.
- `04-test-coverage-and-verification.md` - existing coverage map, targeted checks, and validation gaps.
- `05-improvement-backlog.md` - recommended implementation order with acceptance criteria.
- `06-cascading-and-blast-radius.md` - confirmed cascade risks, server-side guards, and blast radius.
- `08-opencode-audit-synthesis.md` - what the OpenCode audit corrected, added, or left as future work.
- `09-remediation-checklist.md` - stage-by-stage execution checklist and focused verification commands.
- `10-right-sidebar-component-thumbnails-plan.md` - implementation handoff for
  component row thumbnails, including row layout, network budgets,
  virtualization guardrails, tests, and ADR.

## Highest Priority Findings

### P0: Component taxonomy should stay two-type for users

The estimate sheet previously exposed Library, Express, Project-specific, and
Manual labels across adjacent row-card/detail paths. The supported user-facing
model is simpler and less confusing: `Library Component` and `Project
Component`.

Evidence:
- `src/components/workshop/estimate-sheet/rows/cells.tsx` maps row-card source
  labels.
- `src/components/workshop/estimate-sheet/activity-history.tsx` maps row-detail
  component status labels.
- `src/components/workshop/EstimateSheetContent.tsx` owns the detach dialog and
  inline-created component metadata labels.
- `src/lib/estimates/express-components.ts` still carries internal provenance
  classification. This should not be renamed casually.

Impact: users get two component types, while the code still preserves the
states needed for provenance, promotion, link-state, history, and copy behavior.

### P1: Several write RPCs should be edit-gated, not just membership-gated

OpenCode found that several sister write RPCs use workspace membership checks
where related insert paths use stricter estimate edit gates.

Affected RPCs:
- `replace_estimate_row_item_with_history`
- `delete_estimate_row_item_with_history`
- `delete_estimate_node_with_history`
- `update_estimate_row_item_with_history`

Impact: the UI and server actions may gate normal paths correctly, but the RPC
layer should enforce the same edit contract consistently.

### P1: Bulk row delete and component move can cascade through whole-tree rollback

Bulk row delete loops single-row deletes, and component move is implemented as
replace target then clear source. Both use whole-tree rollback snapshots. A
partial failure can visually restore, preserve, duplicate, or hide the wrong row
state even though the row RPC itself is scoped by exact row id.

Evidence:
- `src/components/workshop/EstimateSheetContent.tsx:2522` moves by two mutations.
- `src/components/workshop/EstimateSheetContent.tsx:2532` deletes one row with a whole-tree rollback.
- `src/components/workshop/EstimateSheetContent.tsx:2563` loops selected row deletes.
- `supabase/migrations/20260524033151_estimate_sheet_version_control.sql:797` deletes exact row id plus estimate id, confirming the DB row-delete primitive is not the broad-delete culprit.

Impact: one selected row or one side of a move can fail and change the visible
state of another row.

### P1: Non-default tab tree mutations can return the default tab tree

Tree reorder and delete actions refresh via `getProjectEstimateTreeByEstimate`, which resolves the default tab. On a non-default tab, the client writes that returned tree into the active tab cache.

Evidence:
- `src/components/workshop/EstimateSheetTree.tsx:611` applies `confirmed.tree` after reorder.
- `src/lib/estimates/actions.ts:1508` refreshes reorder with `getProjectEstimateTreeByEstimate`.
- `src/lib/repositories/workspace-repository.ts:2749` resolves default tab in `getProjectEstimateTreeByEstimate`.
- `src/components/workshop/EstimateSheetTree.tsx:996` and `src/components/workshop/EstimateSheetTree.tsx:1097` apply returned trees after single and bulk delete.
- `src/lib/estimates/actions.ts:2208` and `src/lib/estimates/actions.ts:2281` refresh delete paths with the default-tree loader.

Impact: a user editing a non-default tab can reorder/delete successfully in the database, then see the wrong tab content until a hard refetch.

### P1: Template-node subtree insert is serial RPC-per-node and RPC-per-row

Whole-template insertion is one RPC, but inserting a node inside a template loads the template subtree, loops node creates, loops row inserts, then reloads the tree.

Evidence:
- `src/lib/estimates/actions.ts:2454` loads template nodes and rows.
- `src/lib/estimates/actions.ts:2502` loops subtree nodes.
- `src/lib/estimates/actions.ts:2507` calls `create_estimate_node_with_history` per node.
- `src/lib/estimates/actions.ts:2531` loops subtree rows.
- `src/lib/estimates/actions.ts:2541` calls `insert_estimate_row_item_with_history` per row.
- `src/lib/estimates/actions.ts:2574` reloads the tree.

OpenCode correction: the database already has
`insert_estimate_subtree_into_estimate_with_history`. The highest-value fix is
to change the client action to use that existing set-based RPC before adding any
new migration.

Impact: a large reusable section can require hundreds of sequential awaits, and
mid-way failure can leave a partial copied subtree because each RPC commits
independently.

### P1: Bulk tree-node delete can partially commit before failing

Bulk tree delete dedupes selected roots but calls one delete RPC per root. If a
later root fails after an earlier root commits, the client can roll back to a
pre-delete tree while the database has already deleted the earlier root.

Evidence:
- `src/lib/estimates/actions.ts:2269` loops root deletes.
- `src/lib/estimates/actions.ts:2270` calls `delete_estimate_node_with_history` per root.
- `src/components/workshop/EstimateSheetTree.tsx:1107` rolls back the optimistic tree after any thrown error.

Impact: a user can see a failed bulk delete while the database is partially
changed until refetch reveals the committed delete.

### P2: Replacing a row from the library leaves a stale row revision

The replace-row RPC already returns a canonical row snapshot, but the client
replace mutation uses generic success handling instead of extracting that row
and patching `rowRevision`.

Evidence:
- `src/components/workshop/EstimateSheetContent.tsx:2353` optimistically swaps the row.
- `src/hooks/use-estimate-row-mutations.ts:267` uses generic mutation options for replace.
- `src/hooks/use-estimate-row-mutations.ts:408` later mutations read `expectedRowRevision` from cached row state.
- `src/lib/estimates/actions.ts:2675` defines `replaceEstimateRowItemWithLibrary`.
- `src/lib/estimates/actions.ts:2680` calls the replacement RPC.
- `src/lib/estimates/actions.ts:2707` returns from the action without applying the returned canonical row to client cache.

Impact: the next edit/delete/detach/replacement can send an old row revision and hit a conflict until refetch/remount.

### P2: Active tab tree fetch failures can look like empty tabs

Tree hooks expose TanStack query state, but the sheet render branch checks loading, selected node, and empty states without a visible error branch.

Evidence:
- `src/hooks/use-estimate-query.ts:103` seeds tab-tree queries with `initialData`.
- `src/components/workshop/EstimateSheetContent.tsx:2819` renders loading only while fetching and empty state if no selected node.
- `src/components/workshop/EstimateSheetContent.tsx:2896` says "This tab is empty".

Impact: network/auth/provider failures can be misread as an empty tab.

### P2: Project-source inserts have stale-response risk

Project-source insertion applies an authoritative returned tree without optimistic revision guarding or serialization. Bulk project-source insert calls can fire concurrently from the sidebar.

Evidence:
- `src/components/workshop/EstimateSheetContent.tsx:2157` starts project-source insert handling.
- `src/components/workshop/EstimateSheetContent.tsx:2174` applies `result.tree` directly.
- `src/components/workshop/EstimateSheetContent.tsx:2177` comments that concurrent bulk source inserts are a tracked risk.
- `src/components/workshop/component-library/index.tsx:1804` loops bulk project-source targets.

Impact: out-of-order responses can overwrite earlier inserts in the visible tree.

## What Is Working Well

- The route avoids first-paint library payload by lazy-loading the sidebar library only when needed.
- Row edits use optimistic patches, operation IDs, per-row update queues, rollback, and stale-response protection for inline scalar updates.
- Template insertion paths have optimistic rollback and tab-scoped refresh for insert operations.
- Tree create/rename/delete/reorder are largely optimistic and include rollback or reconciliation.
- Proposal export has strong server-side route coverage, rate limiting, JSON error bodies, XLSX content checks, and workbook tests.
- Activity/history reads are bounded, cursor-based, filtered, and have stale-response guards in UI.
- The test suite is broad at component/action/helper level.

## Stop Condition

This plan package is complete when the files in this folder capture:

- the route and moving parts,
- every major user feature path,
- CRUD behavior,
- newly created library/template auto-appearance behavior,
- performance/reliability/error/code-quality findings,
- test coverage and gaps,
- and a prioritized improvement backlog.
