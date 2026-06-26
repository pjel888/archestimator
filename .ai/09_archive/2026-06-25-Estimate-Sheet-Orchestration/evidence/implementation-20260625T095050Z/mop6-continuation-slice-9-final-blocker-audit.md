# MOP-6 Continuation Slice 9: Final Blocker Audit

Date: 2026-06-25

Mode: read-only re-audit, browser-proof attempt, traceability correction, and
e2e harness cleanup.

## Result

Superseded note: the right `Sources` drawer browser-proof blocker recorded in
this slice was later resolved by
`mop6-continuation-slice-10-sources-drawer-browser-proof.md`. The other
remaining rows listed below still stand unless superseded by a newer evidence
artifact.

The answer to "are the three estimate-sheet source analysis folders fully
implemented?" remains no.

Safe continuation rows are implemented or reconciled, but the remaining rows are
proof-limited or architecture-scope:

- Right `Sources` drawer: source/jsdom proof exists, but real-browser
  viewport/focus/scroll-lock/overflow proof is still unclaimed.
- Right-sidebar F-13: hooks/refactor proof and React Doctor local
  giant-component closure exist, but React DevTools active-tab rerender profiler
  proof is unclaimed.
- Broad undo: current code rolls back failed mutations; post-success restore
  needs a restore contract/RPC/UI flow.
- Center M-21 through M-24: decomposition/extractions need characterization
  locks before moving template insertion, activity history, and proposal preview
  flows.
- Lazy subtree loading and realtime-v2: current tree behavior is full-snapshot
  plus cursor/presence realtime; lazy subtree loading and a broader realtime-v2
  contract need explicit data/merge/loading-state contracts.

## Browser Proof Attempt

The drawer browser harness was attempted against the existing dev server with
configured auth/provider values.

Observed sequence:

- Default hardcoded project/route IDs rendered 404 before drawer assertions.
- Read-only provider lookup confirmed those hardcoded fixture IDs are absent in
  the configured provider.
- The configured provider does contain an owner-accessible project, estimate,
  and estimate nodes for the owner test context.
- A candidate run using the discovered project/node route still rendered 404 in
  the Playwright context before `[data-estimate-center-column='sheet']` or drawer
  assertions executed.

Relevant failure context:

- `test-results/estimate-sources-drawer-es-5a856-oll-lock-and-overflow-proof-chromium/error-context.md`

At this point in slice 9, the right drawer browser-only claim was explicitly
unproved; no drawer focus, scroll-lock, viewport, or overflow assertion had run
successfully. Slice 10 supersedes this blocker with passing browser proof.

## Traceability Corrections

- Corrected stale Q8-Q10 wording: favorites/recents and custom ordering now
  sync through account-backed preferences with browser-local first-paint/offline
  fallback.
- Corrected the F-12 blocker from "auth/provider env unavailable" to "harness
  attempted; route rendered 404 before drawer assertions."
- Updated the e2e harness to prefer `ESTIMATE_SHEET_E2E_NODE_ID` for the
  `[nodeId]` route segment while preserving `ESTIMATE_SHEET_E2E_ESTIMATE_ID` as
  a backward-compatible fallback.

## Verification

Commands and checks:

- `PLAYWRIGHT_PORT=3000 bunx playwright test e2e/estimate-sources-drawer.spec.ts --project=chromium`
  failed before drawer assertions with route 404.
- `PLAYWRIGHT_PORT=3000 bunx playwright test --list e2e/estimate-sources-drawer.spec.ts --project=chromium`
  listed 1 Chromium test after the harness node-id variable cleanup.
- `git diff --check` passed after the traceability and harness edits.
- Read-only provider checks confirmed hardcoded fixture IDs are absent and an
  owner-accessible route candidate exists.
- Subagent audits independently confirmed no remaining safe local implementation
  slice for F-13 profiler proof, broad undo, center decomposition, lazy subtree
  loading, or realtime-v2 without a new contract/proof surface.
