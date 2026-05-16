# Current Autopilot Board

**Last updated:** 2026-05-17

## Rules

- Continue autonomously inside documented MVP scope.
- Do not merge to `main`, deploy, connect Supabase, or perform destructive git/data operations without explicit approval.
- Keep code behind repository/store boundaries.
- Keep UI aligned with root `DESIGN.md` and reuse `src/components/ui/` primitives.
- Update roadmap/current-state/decisions/execution-ledger after meaningful slices.

## Now

1. Resolve PR review comments on estimate grid/drop-targeting spike.
2. Establish production model bridge: working spaces/areas separate from proposal/BOQ sections.
3. Validate with tests/build/E2E and independent review.

## Next

1. Promote the estimate-grid spike into the real project workspace.
2. Add proposal-section assignment and warnings for unassigned rows.
3. Add explicit floor/room/area hierarchy objects beyond current `sections` bridge.
4. Improve proposal package detail mode with space/location references.
5. Continue UX/UI hardening and visual QA.

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
