# Launch-Readiness Audit — Frontend Rendering Performance

> Canonical status override: before implementing from this pack, read
> `../03-LAUNCH-GATE-DECISION-REGISTER.md` and `../08-IMPLEMENTATION-HANDOFF.md`.
> Pack-local blocker counts are historical/domain-scoped; the root register is authoritative
> for wider/external beta.

> Part of the **2026-06-19 Launch-Readiness Audit** (sibling pack:
> `.ai/03_plans/2026-06-19-Launch-Readiness-Audit/`). This is a **deletable
> audit pack** — findings only. No source was edited producing it; remediation
> is a separate, owner-approved step.

## Owner / user job

Philip is gating a **pre-launch closed-beta MVP** (no external users yet). This
pack answers one question for the **client-side rendering** domain: *will the UI
re-render, animate, virtualize, and paint acceptably for the first beta cohort,
and is anything here a hard launch blocker?*

## Domain scope (this pack)

Client rendering performance only: unnecessary re-renders, memoization
correctness, set-state-in-effect, selector/prop stability, list virtualization,
chart/3D cost (D3 / roughjs — no Three.js in the rendered client tree was found
in scope), content-visibility, liquid-glass blur arming, layout thrash.

Files read deeply: `src/components/charts/CostDonutChart.tsx`,
`src/components/workshop/project-charts/*` (esp. `ProjectChartsClient.tsx`),
`src/components/workshop/estimate-sheet/rows/{branch,row-table}.tsx`,
`src/components/workshop/EstimateSheetContent.tsx` (targeted),
`src/components/workshop/EstimateSheetTree.tsx` (targeted),
`src/components/workshop/{LiveProjectCard,projects-page-client}.tsx`,
`src/components/share/{ShareEstimateTreeView,SharePageComments,SharedLinkActivityFeed}.tsx`,
`src/components/sidebar/useLiquidGlassRefraction.ts`,
`src/components/system/LiquidGlassReady.tsx`,
`src/components/performance-monitor.tsx`,
`src/lib/workshop/virtualization-flags.ts`,
`src/stores/estimate-ui-store.ts`.
Verified `bun run lint` and `bun run test:dom tests/vitest/perf` first-hand.

## Routes / screens affected by remediation

- `/workshop/projects` (projects list cards)
- `/workshop/projects/[projectId]/charts` (D3 comparison + donut)
- `/workshop/projects/[projectId]/estimates/[id]` (estimate sheet — hot path)
- `/share/[token]` (published proposal receiver — only externally reachable UI)
- App shell sidebar (liquid-glass)

## Non-goals

- The full Performance-Refactor architecture (estimate-sheet decomposition,
  incremental totals) — owned by `2026-06-17-Performance-Refactor`; do not
  re-plan it here.
- Bundle/asset sizing (domain 6), data-fetch/RSC (domain 8), DB query perf
  (domain 3) — recorded in `cross_domain_notes` only.
- Design/contrast enforcement — DESIGN.md is an alpha guide, advise only.

## Files expected to change during remediation (if approved)

- `src/components/workshop/projects-page-client.tsx` (one set-state-in-effect →
  derive-during-render or `flushSync`-free latch).
- `src/components/sidebar/useLiquidGlassRefraction.ts` (delete dead
  `useGlassElasticity`, or fix its render-phase ref read + per-frame setState).
- Possibly `src/components/share/ShareEstimateTreeView.tsx` (content-visibility /
  windowing for large published estimates) — only if a real large-proposal
  case is observed.

## Validation gate

`bun run lint` (must reach 0 errors — currently 6, of which 3 are source-domain),
`bun run test:dom tests/vitest/perf` (24 tests, currently green — must stay green;
they assert `nodeTotalsComputes===1`, `rendersOutside===0`), plus a manual Chrome
Performance capture of an estimate-sheet keystroke and a `/share/[token]` load.

## Deletion criteria

If Philip rejects the findings or judges them out of scope for closed beta,
delete this entire folder. Nothing here is wired into build/test.

## Loop surface

Lightweight in-session loop (audit only — read-only on source). No dated
LOOP_LEDGER required; this pack is evidence, not execution.

## Durable-state path

Findings here; cross-domain hand-offs flow to the sibling Launch-Readiness pack
orchestration ledger at
`.ai/03_plans/2026-06-19-Launch-Readiness-Audit/00-ORCHESTRATION-LEDGER.md`.
