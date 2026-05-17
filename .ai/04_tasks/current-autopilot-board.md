# Current Autopilot Board

**Last updated:** 2026-05-17

## Rules

- Continue autonomously inside documented MVP scope.
- Do not merge to `main`, deploy, connect Supabase, or perform destructive git/data operations without explicit approval.
- Keep code behind repository/store boundaries.
- Keep UI aligned with root `DESIGN.md` and reuse `src/components/ui/` primitives.
- Update roadmap/current-state/decisions/execution-ledger after meaningful slices.

## Now

1. Explicit floor/room/area hierarchy objects are in the local-first estimate schema and demo seed (`floors`, `spaces`, row-level `spaceId`).
2. Selected-row inspector now exposes location assignment alongside proposal-section/scope/rate actions.
3. Proposal preview includes a detail mode with line-level space/location references.
4. Glide selection now listens to `onGridSelectionChange`, so keyboard selection changes can update the selected-row inspector.

## Next

1. Add row move/copy operations between spaces and keep proposal-section mapping stable.
2. Continue UX/UI hardening and visual QA.
3. Consider richer grid custom cells only after the side-panel workflow proves stable.

## Later

- Cost library management surface.
- CSV/XLSX import/export.
- Landing page.
- AI assistant/import/review role decision.
- Deployment only after Philip approves.

## Blocked / needs Philip later

- First MVP target project type.
- Cost/pricing source policy.
- First export format priority beyond browser print/PDF.
- AI role in v1.
