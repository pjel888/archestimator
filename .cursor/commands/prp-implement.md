---
description: Execute an implementation plan through the canonical Archestimator workflow.
argument-hint: "<path/to/plan.md>"
---

# Canonical Plan Execution Adapter

Load, in order:

1. `AGENTS.md` and the FAST PATH in `.ai/10_state/current-state.md`;
2. `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`;
3. `.ai/00_system/VALIDATION_MATRIX.md`;
4. `.ai/08_prompts/000_Planning Prompts/Executing-Plan-Prompt.md`;
5. `.ai/08_prompts/000_Planning Prompts/Multi-Agent-Execution-Directive.md`
   only when coordinated work is actually selected;
6. the plan path supplied in `$ARGUMENTS`.

## Execution Contract

- Treat current source and the original request as authoritative over stale plan
  claims.
- Reconcile requirements, dependencies, ownership, authorization, acceptance
  criteria, exact validation commands, and stop conditions before editing.
- Stay on the current branch/worktree. Preserve unfamiliar changes and never
  pull, rebase, switch/create branches, stash, reset, clean, commit, or push
  without separate explicit authorization for that exact Git operation.
- Use the fewest agents or logical passes needed. Follow the canonical Task,
  Assignment, Handoff, Completion, Failure/Retry, and portability contracts.
- Implement the smallest coherent dependency-ready unit, then run the cheapest
  decisive authorized evidence. Tests, builds-as-tests, browsers, screenshots,
  Storybook, and visual QA require an explicit current-task `TEST_TASK`.
- After failed evidence, diagnose and change the implementation or tactic; do
  not lower acceptance criteria or repeat an exhausted loop.
- Continue while safe in-scope work remains. Update plan truth only when reality
  changed, then report exact files, evidence, unrun tests, proof gaps, remaining
  risks, and any exact external boundary.

Do not create legacy PRP reports, fixed validation ladders, automatic branches,
or Git checkpoints unless the current request explicitly requires those
artifacts.
