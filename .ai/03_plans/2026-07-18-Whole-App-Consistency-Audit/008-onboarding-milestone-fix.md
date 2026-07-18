# Unit 008 — Onboarding Checklist Wrong Milestone (REFUTED — dead code + false premise)

**Finding:** F-08 · **Original severity:** HIGH · **Re-verdict (2026-07-19):** **REFUTED** · **Status:** REJECTED

## Original claim

The "Create an estimate" checklist item gates on `workspace_ready` (rank 1), reached before
`project_created` (rank 2), so the checklist can report complete with no project/estimate.

## Why it's refuted (two independent reasons)

**1. The checklist is not rendered anywhere.** The only consumer,
`src/components/workshop/FirstEstimateChecklist.tsx`, is mounted nowhere in `src/`
(`grep "<FirstEstimateChecklist" src/` returns nothing). The route
`src/app/workshop/getting-started/page.tsx` is now just `redirect("/workshop")` — refactored
away in commit `a68c8393d` ("tidy workshop routes"). So even if the milestone logic were wrong,
no user sees it.

**2. The milestone-order premise is also false.** `workspace_ready` is emitted ONLY in
`src/lib/projects/actions.ts:1159-1167`, batched together with `project_created` in the **same
D1 batch with the same `projectId`**. There is no code path that sets
`lastMilestone = workspace_ready` without a project existing. The "complete with no project"
state is unreachable on both counts.

## Related cleanup (filed as N-04, unit 035)

`tests/vitest/getting-started-route.test.ts` references the removed `FirstEstimateChecklist`
rendering and is stale — candidate for update/deletion.

## Disposition

**REJECTED.** No code change. (If `FirstEstimateChecklist` is ever revived, gate the estimate
item on `project_created` or a real `first_estimate_created` milestone per the original unit's
guidance — but it's moot today.)
