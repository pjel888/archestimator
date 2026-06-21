---
title: OpenCode Audit Synthesis
date: 2026-06-21
status: synthesis
source: .ai/02_audits/OPENCODE-GLM5.2-2026-06-21-Estimate-Sheet-Plan-Audit.md
---

# OpenCode Audit Synthesis

## Input Boundary

This synthesis uses only
`.ai/02_audits/OPENCODE-GLM5.2-2026-06-21-Estimate-Sheet-Plan-Audit.md` as the
external audit input. The component taxonomy decision comes from the current
owner request and current estimate-sheet source/tests.

## What OpenCode Confirmed

- Non-default-tab reorder/delete/bulk-delete can refresh and write the default
  tab tree back into the active tab.
- Bulk row delete and component move still have partial-failure risk because
  row-scoped failures use broad rollback or multi-step mutation composition.
- Bulk tree-node delete loops one root-delete RPC per selected root, so a later
  failure can leave earlier roots committed.
- Template-node subtree insertion loops node and row RPCs and can partially
  copy large subtrees.
- Drag-over validation does full reorder planning work during pointer movement.
- Project-source insert responses can arrive out of order and overwrite visible
  tree state.
- Scalar save state is not mutation-counted.

## What OpenCode Corrected

- The plan should not assume a new template-subtree bulk migration is needed.
  The database already has `insert_estimate_subtree_into_estimate_with_history`;
  the next implementation step is to route the client action through that RPC
  and test the returned committed tree behavior.
- The replace-row RPC already returns a canonical row snapshot. The current bug
  is client-side: the replace mutation does not extract and patch the returned
  row into cache, so `rowRevision` can stay stale.
- The lazy library loader is not a full catalog fetch. It loads project-scoped
  lite component/template data on sidebar or command-palette demand. Route tree
  budgets and reusable-source search fan-out remain the larger payload risks.
- `createFolder` is persisted. The sidebar tree visibility gap is a rendering
  and IA issue, not a local-only folder-create issue.

## What OpenCode Added

- P1 auth hardening: several write RPCs use workspace-membership checks where
  sister write paths now use edit-gating. The remediation should harden
  `replace_estimate_row_item_with_history`,
  `delete_estimate_row_item_with_history`,
  `delete_estimate_node_with_history`, and
  `update_estimate_row_item_with_history`.
- P2 row queue gap: `rowUpdateQueuesRef` serializes scalar updates only.
  Replace, delete, detach, promote, and move paths can still interleave with an
  in-flight same-row update.
- P2/P3 event contract risk: the estimate-sheet/workshop surface has many
  stringly typed `CustomEvent` contracts with no central registry.
- P3 duplicate-id risk: sidebar duplicate component ids based on `Date.now()`
  can collide on rapid same-millisecond clicks.
- Cache compatibility risk: fixes that move to tab-scoped trees must remember
  the legacy `areaTree` query key while compatibility remains.
- UX/routing polish: no dedicated
  `src/app/workshop/projects/[projectId]/estimates/[nodeId]/loading.tsx` exists.

## Taxonomy Boundary

The estimate sheet should expose two user-facing component types:

- `Library Component` for library-linked rows.
- `Project Component` for inline-authored express rows, detached rows, projected
  project rows, and source-less project rows.

This is a UI taxonomy, not a domain migration. Do not rename internal
`expressComponent`, `projectComponentProjection`, `linkState`, source snapshot,
history, SQL, or provenance fields unless a separate compatibility plan covers
that blast radius.

## UI Changes Worth Considering Later

The current UI should largely be preserved. The useful future changes are
targeted clarity fixes:

- Extend `Library Component` / `Project Component` consistently into adjacent
  sidebar and project-source surfaces when those surfaces are next touched.
- Relabel local-view sidebar edit/duplicate/delete actions unless they become
  persisted library mutations.
- Show pending/success insert feedback only after persistence state is known.
- Add a sheet-shaped `[nodeId]/loading.tsx` if route-transition polish becomes
  worth the small implementation cost.

No broad visual redesign is recommended from this OpenCode revision.
