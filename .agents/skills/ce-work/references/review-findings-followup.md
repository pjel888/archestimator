# Review Findings Follow-Up

Use this reference only when a review produced concrete findings and the active
task includes applying them.

1. Re-read each finding against current source and discard stale, duplicate,
   speculative, or out-of-scope items.
2. Group only independent fixes; keep coupled changes serial.
3. Apply the smallest root-cause repair for accepted findings.
4. Verify each repair with the cheapest decisive non-test evidence unless the
   current user explicitly authorized a `TEST_TASK`.
5. Preserve unrelated shared-worktree changes. Do not stage, commit, push,
   branch, create a worktree, or open a PR without explicit current-user
   authority for that exact action.
6. Report applied, rejected, and residual findings with evidence, then stop.

Do not default to applying every finding, dispatching fix waves, running broader
suites, or creating durable residual artifacts. Add durable tracking only when
the user requested it or an existing task contract requires it.
