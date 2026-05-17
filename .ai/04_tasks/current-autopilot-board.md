# Current Autopilot Board

**Last updated:** 2026-05-17

## Rules

- Continue autonomously inside documented MVP scope.
- Do not merge to `main`, deploy, connect Supabase, or perform destructive git/data operations without explicit approval.
- Keep code behind repository/store boundaries.
- Keep UI aligned with root `DESIGN.md` and reuse `src/components/ui/` primitives.
- Update roadmap/current-state/decisions/execution-ledger after meaningful slices.

## Now

1. Main is the consolidated checkpoint branch; old stacked PR branches were closed/deleted after merging the checkpoint to `main`.
2. Selected-row inspector supports moving or copying estimate rows between floor/room/area spaces while preserving proposal-section mapping.
3. Cost Library Management v1 remains implemented inside the project workspace library tab.
4. Explicit floor/room/area hierarchy objects remain in the local-first estimate schema and demo seed (`floors`, `spaces`, row-level `spaceId`).

## Next

1. Add revision/diff semantics that distinguish moved spaces from changed BOQ/proposal grouping.
2. Continue UX/UI hardening and visual QA for the row operation controls, Cost Library Management v1 panel, and issued proposal print route.
3. Consider richer grid custom cells only after the side-panel workflow proves stable.

## Later

- Library import/export and bulk pricing update workflows.
- CSV/XLSX import/export.
- Landing page.
- AI assistant/import/review role decision.
- Deployment only after Philip approves.

## Blocked / needs Philip later

- First MVP target project type.
- Cost/pricing source policy.
- First export format priority beyond browser print/PDF.
- AI role in v1.
