# Report: Workspace Homebase RLS Proof

Status: Completed — Kimi pass 1

## Goal

Upgrade the local `workspace_homebase_summary` Postgres proof so it exercises RLS-relevant behavior instead of relying only on the RPC's manual filters and the existing broad `select` grant.

## Starting worktree

```
 M .ai/03_plans/2026-06-19-Projects-Page-Performance/LOOP_LEDGER.md
 M src/components/workshop/LiveProjectCard.tsx
 M supabase/migrations-pending-review/AC-MOD-06_one_published_publication_per_project.sql
?? .team/
?? tests/vitest/perf/projects-page-render-baseline.test.tsx
?? tests/vitest/project-publication-one-published-index.test.ts
?? tmp/
```

## Plan

1. Keep the existing proof harness structure and existing scenarios.
2. Enable row-level security on the tables the RPC reads.
3. Add minimal `select` policies that mirror the production access semantics the RPC depends on.
4. Add a sheet-only collaborator `userD` who has no workspace/project membership and only an estimate-sheet membership for `estimateA`.
5. Assert `userD` sees project A but cannot leak project B, estimate B, node B, or cross-tenant data.
6. Preserve all existing assertions.
7. Verify with `bun run prove:workspace-homebase-summary` and `bun run type-check`.

## Changes

Changed files:
- `scripts/prove-workshop-homebase-summary-postgres.mjs`
  - Added `userD` UUID.
  - Enabled RLS on `workspaces`, `workspace_members`, `projects`, `project_members`, `estimates`, `estimate_sheet_members`, `estimate_nodes`, `project_favorites`, `estimate_favorites`.
  - Added minimal read policies for each table that mirror the access semantics used by the RPC.
  - Seeded `estimate_sheet_members` for `userD` on `estimateA` only.
  - Added `sheetOnly` RPC call and assertions for RLS containment.
  - Added `"sheet-only collaborator RLS containment"` to the final checks list.

Task-folder reports updated:
- `REPORT.md`
- `EVIDENCE.md`
- `CHECKLIST.md`
- `PASS_STATUS.md`
- `PASS_HISTORY.md`
- `PATCH_NOTES.md`

## Result

`bun run prove:workspace-homebase-summary` passed with all checks, including the new sheet-only collaborator RLS containment case.

`bun run type-check` passed after the RPC payload guard lane was tightened.

## Residual risk

- The proof remains `local-only`; it does not exercise the real Supabase project `ebxxqidacheyapmmzavr`.
- The RLS policies in the harness are minimal and slightly narrower than production's full membership-visibility policies (e.g., each user only sees their own membership rows). They are sufficient to prove the target invariants but are not a full replica of every production policy.
- No TypeScript red remains in the recorded local proof boundary.
