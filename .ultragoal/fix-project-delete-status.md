# Coordination note — fix-project-delete (Claude, 2026-06-16)

Goal: (1) let users delete a project even when an active shared link exists;
(2) stop the project modal from "refreshing" the page.

## What I changed (mine — do not attribute to other agents' WIP)
- `src/components/workshop/ProjectDetailsModal.tsx` — Bug 2 fix. The modal body was a
  raw `<form action={updateProjectDetails}>`; that server action calls
  `revalidatePath("/workshop/projects")`, which re-streamed the route underneath the
  open modal (the "refresh"). Now it submits via a client `handleSaveDetails` wrapper
  that runs the action and `onClose()`s on success (with a "Saving…" pending state),
  so the list reconciles with the modal already dismissed. Behavior-preserving for the
  shared `updateProjectDetails` server action (left untouched — it is also used by
  `ProjectDashboardClient`, which is a full page, not a modal, so out of scope).
- `tests/vitest/project-deletion-active-publication-contract.test.ts` — NEW backend
  contract test locking in Bug 1 (active publication = warning not blocker; publications
  cascade on project delete). The existing `mass-deletion-contract.test.ts` filters
  migrations on `"mass_deletion"` in the filename, so the new migration was uncovered.

## UPDATE 2026-06-17 — migration had a real bug; fixed. Skeleton fixed.
- The original `20260616180000` migration (prior pass) had a CTE-SCOPE BUG: the
  `active_publication_items` statement referenced `project_rows`/`active_publications`
  CTEs from an EARLIER statement (CTEs are per-statement) → runtime
  `relation "project_rows" does not exist`. I applied it to prod before catching this
  (verified text, not execution — my mistake), which broke delete for ALL projects.
  FIXED: rewrote the function so warnings query base tables scoped by the eligible_ids
  VARIABLE. Re-applied to prod AND rewrote the file on disk. Verified by EXECUTING as the
  workspace owner (impersonated via request.jwt.claims): ok=true, eligibleCount=1,
  blocked=[], issues=[active_publication warning]. Delete now works end-to-end.
- Bug "skeleton blocks whole screen when opening the ⋮ modal": ProjectDetailsModal is a
  next/dynamic lazy import with no local Suspense; its chunk-load suspension bubbled to
  src/app/workshop/projects/loading.tsx (full-screen skeleton). FIXED in
  projects-page-client.tsx by wrapping the modal area in `<Suspense fallback={null}>`
  (this edit was captured into a concurrent agent's commit — it is now in HEAD).
- KNOWN UNRELATED RED: tests/vitest/project-creation-ui.test.ts asserts
  projects-page-client imports `from "@/lib/workshop/actions"` + calls setProjectFavorite —
  both removed by the concurrent favorites→Route A refactor. Stale assertions; owner = that
  refactor, not this delete work.

## Bug 1 status (original notes, superseded by the UPDATE above)
- The migration `supabase/migrations/20260616180000_allow_project_deletion_with_active_publications.sql`
  (authored by a prior Codex pass) is CORRECT: active-publication projects become
  `eligible`, `ok=true`, `execute_bulk_delete_projects` deletes them, and
  `project_publications` cascades (FK `on delete cascade`). No other blocker (no trigger,
  RLS permits managers, server actions are pass-through, types fine).
- ROOT CAUSE of "can't delete": migration `20260616180000` is NOT applied to the remote
  prod DB `ebxxqidacheyapmmzavr` (confirmed via list_migrations — remote stops at
  `20260616120000`). The fix is live in code; it just needs to reach the database.
  Note: several other out-of-order local migrations are also unapplied
  (20260611182000, 20260614170000, 20260615145915, 20260615150229, 20260616094500) —
  NOT mine, left untouched.
- APPLIED to prod (2026-06-16, user-approved): the corrected `preview_bulk_delete_projects`
  function was applied via Supabase apply_migration. Verified live: has `active_publication`
  + `warningsCount`, old `then 'blocked'` path gone. 2 real projects had active links and
  are now deletable. Recorded in history under version `20260616163259` (apply time), so the
  local file `20260616180000_*.sql` still shows "unapplied" to `supabase db push` — re-applying
  is idempotent (`create or replace function`), so a later `--include-all` push is harmless.

## Verification
- `tsc --noEmit`: 0 errors. ESLint on changed files: clean.
- Vitest (modal + delete + new contract suites): green.
- KNOWN-UNRELATED RED: `tests/vitest/projects-page-shared-access.test.tsx:170` expects
  `"4 opens"` — broken by the in-progress `LiveProjectCard` refactor that removed
  `renderOpenActivityRow`/`formatOpenCount`. NOT caused by my changes; left for the
  owner of that WIP.
