# Current Autopilot Board

**Last updated:** 2026-05-17

## Rules

- Continue autonomously inside documented MVP scope.
- Do not merge to `main`, deploy, connect Supabase, or perform destructive git/data operations without explicit approval.
- Keep code behind repository/store boundaries.
- Keep UI aligned with root `DESIGN.md` and reuse `src/components/ui/` primitives.
- Update roadmap/current-state/decisions/execution-ledger after meaningful slices.

## Now

1. PR #7 Codex comments have been checked and remediated: `next-env.d.ts` is trackable, grid edits mark library overrides, and numeric grid edits clamp nonnegative.
2. Proposal-section assignment and row actions have moved from the accessible table into a keyboard-accessible selected-row inspector beside/below the production Glide grid.
3. Validate with tests/build/E2E and independent review after each migration slice.

## Next

1. Add explicit floor/room/area hierarchy objects beyond current `sections` bridge.
2. Improve proposal package detail mode with space/location references.
3. Continue UX/UI hardening and visual QA.
4. Consider richer grid custom cells only after the side-panel workflow proves stable.

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
