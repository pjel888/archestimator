# Current Autopilot Board

**Last updated:** 2026-05-17

## Rules

- Continue autonomously inside documented MVP scope.
- Do not merge to `main`, deploy, connect Supabase, or perform destructive git/data operations without explicit approval.
- Keep code behind repository/store boundaries.
- Keep UI aligned with root `DESIGN.md` and reuse `src/components/ui/` primitives.
- Update roadmap/current-state/decisions/execution-ledger after meaningful slices.

## Now

1. Production library-to-Glide insertion has been implemented with drag handles and selected-item fallback.
2. Continue migrating proposal-section/action controls into first-class grid cells or side panels.
3. Validate with tests/build/E2E and independent review after each migration slice.

## Next

1. Move proposal-section assignment and row actions from the accessible table into grid-side controls without losing keyboard accessibility.
2. Add explicit floor/room/area hierarchy objects beyond current `sections` bridge.
3. Improve proposal package detail mode with space/location references.
4. Continue UX/UI hardening and visual QA.

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
