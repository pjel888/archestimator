---
description: Execute an accepted plan using the canonical portable orchestration contract.
---

# Portable Multi-Agent Execution Adapter

Load `AGENTS.md`, `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`, the Validation
Matrix, the accepted plan,
`.ai/08_prompts/000_Planning Prompts/Executing-Plan-Prompt.md`, and
`.ai/08_prompts/000_Planning Prompts/Multi-Agent-Execution-Directive.md`.

- Reconcile the plan with current source and refresh the Task Contract when
  assumptions changed.
- Decompose only independent bounded lanes. Route capability classes through
  `.ai/12_agents/codex-role-model-matrix.json` and follow its fallback chain.
- Use native subagents, threads, emulated passes, or single-agent execution with
  the same Assignment, Handoff, Failure/Retry, and Completion contracts.
- Assign one writer/integrator per file or mutable resource. Use isolated
  worktrees only when explicitly authorized; otherwise serialize conflicts.
- Continue through safe dependency work, verify actual artifacts, and rerun only
  invalidated authorized evidence. Product tests, builds-as-tests, browsers, and
  screenshots require an explicit current-task `TEST_TASK`.
- Use independent review only for a named material risk. The lead owns conflict
  resolution, final diff review, requirement reconciliation, and completion.
- Preserve mixed-worktree changes. Do not commit, push, branch, rebase, merge,
  stash, reset, clean, or mutate external state without separate authority.

Return exact files, decisions, handoffs, commands/results, unrun tests, proof
gaps, remaining risks, and any exact external boundary.
