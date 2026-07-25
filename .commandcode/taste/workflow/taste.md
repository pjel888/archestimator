# Workflow Taste

Advisory only; `.ai/00_system` and the lead orchestrator control execution.

- Start with the smallest current-source read that can answer the task.
- Use read-only review unless the lead assigns a bounded implementation scope.
- Delegate only independent work with an explicit deliverable and stop condition.
- Keep shared-worktree edits disjoint and preserve unrelated changes.
- Choose one primary workflow; named helpers are optional, not a mandatory chain.
- Verify the claim with the cheapest decisive evidence under the shared
  `quality_profile` gate.
- Never commit, push, merge, delete branches/worktrees, archive another lane's
  plan, or mutate providers merely because a taste file suggests it.
- Record durable state only when project truth actually changes.
