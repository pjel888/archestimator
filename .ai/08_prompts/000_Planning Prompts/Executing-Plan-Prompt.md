# Execute A Plan Pack

## Load

Read `Frontier-Planning-Kernel.md`, applicable gates, this prompt, and
`Plan-Pack-Schema.md`. When orchestration is used, also load and follow
`Multi-Agent-Execution-Directive.md`.

## Objective

Implement the full authorized repository outcome, integrate it, verify every
core requirement, update durable truth, and archive only when complete.

## Method

1. Inspect the Task Contract, current user request, Git state, manifest,
   canonical implementation plan, and first ready unit.
2. Repair stale plan state locally; do not return routine repair to the owner.
3. Build the minimal live dependency graph and assign one writer per mutable
   file/resource.
4. Delegate only independent bounded work with complete assignment contracts;
   otherwise execute sequentially.
5. For each unit: reread current source, decide, implement the smallest coherent
   slice, collect authorized evidence, inspect the diff, and update status.
6. Consume structured handoffs, inspect actual artifacts, integrate by
   dependency boundary, and rerun only invalidated evidence.
7. Apply the Failure/Retry contract to failed units without lowering the goal.
8. Audit every original requirement, decision, boundary, risk, cleanup item, and
   deliverable against fresh artifacts.
9. Update canonical state and archive only after the archived copy validates.

## Execution Rules

- Preserve unrelated work; do not branch, worktree, commit, push, deploy, or
  mutate prohibited external state without exact authority.
- Tests/build/browser/visual QA require explicit current-task user authorization.
- Internal dependencies, stale artifacts, optional tools/reviewers, memory, and
  unapproved tests are continuation work, not blockers.
- Continue while safe implementable work remains.

## Final Report

Return terminal status, changed files, requirement-to-evidence result,
orchestration mode and handoffs if used, provider boundary, validation actually
performed, explicitly unrun tests, and real remaining risk.
