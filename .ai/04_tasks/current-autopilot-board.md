# Current Autopilot Board

**Last updated:** 2026-05-17

## Rules

- Continue autonomously inside documented MVP scope.
- Do not merge to `main`, deploy, connect Supabase, or perform destructive git/data operations without explicit approval.
- Keep code behind repository/store boundaries.
- Keep UI aligned with root `DESIGN.md` and reuse `src/components/ui/` primitives.
- Update roadmap/current-state/decisions/execution-ledger after meaningful slices.

## Now

1. Persisted revision change records are being implemented on `feat/persisted-revision-change-records` after PR #9 was merged.
2. Codex comments from PR #8/#9 are being remediated in this slice: row-operation target fallback, persisted prior-version diff lookup, and text-only scope revision detection.
3. The Versions panel now uses project-level saved versions and persisted revision records when available.
4. Kimi has a separate landing-page worktree/branch at `/Users/philiplewis/archestimator-kimi-landing` / `feat/landing-page-simple` for later review.

## Next

1. Finish validation, independent review, and PR for persisted revision records + Codex comment fixes.
2. Review Kimi's simple SaaS landing page branch and decide whether to PR/merge after the revision-record slice lands.
3. Continue UX/UI hardening and visual QA for revision summaries, row operation controls, Cost Library Management v1 panel, and issued proposal print route.

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
