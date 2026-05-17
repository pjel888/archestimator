# Current Autopilot Board

**Last updated:** 2026-05-17

## Rules

- Continue autonomously inside documented MVP scope.
- Do not merge to `main`, deploy, connect Supabase, or perform destructive git/data operations without explicit approval.
- Keep code behind repository/store boundaries.
- Keep UI aligned with root `DESIGN.md` and reuse `src/components/ui/` primitives.
- Update roadmap/current-state/decisions/execution-ledger after meaningful slices.

## Now

1. PR #8 row move/copy checkpoint has been merged to `main`; revision/diff semantics work is isolated on `feat/revision-diff-semantics`.
2. Revision diff semantics now classify space moves, BOQ/proposal remaps, commercial edits, scope changes, added rows, and removed rows separately.
3. The Versions panel surfaces the active revision's diff summary against the prior saved version when available.
4. Cost Library Management v1, floor/room/area hierarchy, and row move/copy controls remain implemented.

## Next

1. Persist explicit revision diff records when saving duplicated revisions, not only compute them on demand in UI.
2. Continue UX/UI hardening and visual QA for revision summaries, row operation controls, Cost Library Management v1 panel, and issued proposal print route.
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
