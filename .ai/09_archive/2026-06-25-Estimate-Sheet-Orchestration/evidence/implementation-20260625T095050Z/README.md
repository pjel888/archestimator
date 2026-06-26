# Implementation Evidence 20260625T095050Z

Evidence folder for the Estimate Sheet Orchestration implementation pass.

Contents:

- `mop0-preflight.md` records branch, scope, Supabase boundary evidence,
  read-only lane findings, local baseline, and hosted SELECT-only preflight.
- `mop0-readonly-introspection.sql` is the SELECT-only hosted introspection
  script used for MOP-0.
- `mop0-5-quick-wins.md` records RED/GREEN evidence for the side-panel,
  tree-empty-state, and below-desktop notice quick wins.
- `mop1-right-sidebar.md` records RED/GREEN evidence for right-sidebar archive
  honesty, snapshot-copy language, latest-wins search, duplicate identity, and
  telemetry privacy locks.
- `mop2-center-integrity.md` records RED/GREEN evidence for atomic center row
  component moves, all-or-nothing selected row deletes, and project-source
  revision gating.
- `mop3-tree-integrity.md` records RED/GREEN evidence for tree mutation edit
  guards, authoritative delete metadata, structure-only signatures, and
  share/cache regression proof.
- `mop4-interaction-contracts.md` records RED/GREEN evidence for shared drag
  payload/custom-event validators, malformed-event telemetry no-ops, read-only
  mutation guards, right-sidebar acknowledgement feedback, and cache/selection
  guardrails.
- `mop5-accessibility-performance-observability.md` records GREEN evidence for
  tree keyboard affordances, tree and center picker dialogs, row-header
  semantics, render/performance guardrails, regenerated local render baseline,
  and observability tests.
- `mop5-estimate-sheet-render-baseline.json` is the regenerated local jsdom
  render/keystroke profile used for MOP-5 relative performance evidence.
- `mop6-continuation-slice-1.md` records the first MOP-6 continuation slice:
  persisted side-panel collapse state and explicit same-origin proposal export
  fetch credentials.
- `mop6-continuation-slice-2.md` records verified MOP-6 thumbnail rendering
  coverage for right-sidebar `thumbnail_path` / `thumbnailPath` data.
- `mop6-continuation-slice-4-sources-drawer.md` records the product-specific
  below-desktop right `Sources` drawer implementation and source/jsdom proof.
- `mop6-continuation-slice-5-right-sidebar-state.md` records the right-sidebar
  reducer/hook extraction and local React Doctor giant-component closure.
- `mop6-continuation-slice-6-numeric-sort-order.md` records the numeric
  `estimate_nodes.sort_order` migration, scoped provider dry run/apply, and
  readback proof.
- `mop6-continuation-slice-7-tree-polish-and-scope-closures.md` records the
  tree non-launch polish closure and the evidence-backed classification for
  broad undo plus lazy subtree loading / realtime-v2 work.
- `mop6-continuation-slice-8-center-p3-polish.md` records local component-image
  fallbacks, same-scope activity-history debounce, toast bottom-dock clearance,
  proposal preview unsaved-edits warning, and the refactor-scope classification
  for center M-21 through M-24.
- `mop6-continuation-slice-9-final-blocker-audit.md` records the final
  source-ID re-audit, right drawer browser-proof 404 blocker, stale Q8-Q10
  traceability correction, and remaining proof-limited / architecture-scope
  rows.
- `mop6-continuation-slice-10-sources-drawer-browser-proof.md` supersedes the
  slice-9 right-drawer browser blocker with a fixed harness, Escape/focus fixes,
  and passing Chromium proof at 1023px and 390px widths.
- `mop6-continuation-slice-11-center-row-delete-undo.md` records center
  row-delete post-success Undo, the restore RPC/provider apply, and the
  then-remaining tree/subtree undo boundary that Slice 13 later closed for
  successful tree deletes.
- `mop6-continuation-slice-12-center-model-extractions.md` records the
  center M-21 through M-24 pure helper/model extractions and focused behavior
  locks; full hook/component decomposition remains open.
- `mop6-continuation-slice-13-tree-delete-undo.md` records tree/subtree
  post-success delete Undo, the restore RPC/provider apply, and focused
  single/bulk restore tests.
- `mop6-continuation-slice-14-template-insertion-hook.md` records the center
  M-22 estimate-template insertion orchestration hook extraction and focused
  template insertion validation.
- `mop6-continuation-slice-15-proposal-preview-hook.md` records the center
  M-24 proposal-preview controller hook extraction and focused proposal preview
  validation.
- `mop6-continuation-slice-16-row-handlers-hook.md` records the center M-21
  row-handler/controller hook extraction and focused row edit/insert/delete
  validation.
- `mop6-continuation-slice-17-history-panel-hook.md` records the center M-23
  activity-history controller hook extraction and focused history, row-details,
  and version-control validation.
- `mop6-continuation-slice-18-right-sidebar-profiler-proof.md` records the
  F-13 active-tab render-scope proof using an automated React Profiler harness
  plus the surrounding right-sidebar regression matrix.
- `mop6-continuation-slice-19-tree-lazy-realtime-contract.md` records the tree
  lazy subtree hydration implementation, bounded branch fetch, per-node
  request-state proof, and concrete realtime-v2 tree event contract.
- `mop6-provider-rpc-apply.md` records the scoped hosted Supabase apply and
  post-apply function-catalog proof for the estimate-sheet row/tree RPCs.
- `mop6-durable-telemetry.md` records the durable component-library telemetry
  table/action/sink implementation and provider proof.

No production deploys or paid add-ons were used for these evidence entries.
Browser automation was limited to the local Chromium `Sources` drawer proof in
`mop6-continuation-slice-10-sources-drawer-browser-proof.md`. Provider writes
were limited to the scoped RPC DDL/grant
apply recorded in `mop6-provider-rpc-apply.md`, the scoped telemetry table DDL
recorded in `mop6-durable-telemetry.md`, the scoped numeric sort-order DDL
recorded in `mop6-continuation-slice-6-numeric-sort-order.md`, and the scoped
row-delete restore RPC DDL recorded in
`mop6-continuation-slice-11-center-row-delete-undo.md`, and the scoped
tree/subtree delete restore RPC DDL recorded in
`mop6-continuation-slice-13-tree-delete-undo.md`.
