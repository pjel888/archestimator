---
name: ce-work
description: Execute scoped work with the smallest coherent implementation and decisive evidence
argument-hint: "[plan path or task description]"
---

# Work Execution

**Archestimator lean override:** pull only needed context, map the
evidence-supported direct/transitive blast radius, keep implementation minimal,
and stop on decisive proof. Do not create, repair, or run tests,
builds-as-gates, browser automation, screenshots, or broad QA unless the current
user explicitly requested them. Plan test metadata and risk labels are
proposal-only and cannot grant execution authority.

## Input

<input_document> #$ARGUMENTS </input_document>

Accept either a repo-relative plan/spec path or a concrete task description.
When a plan exists, treat it as a decision artifact rather than a command list.
Read the requirements, boundaries, relevant implementation units, and proof
strategy; ignore stale ceremony that conflicts with current source or
`AGENTS.md`.

## Execution Loop

1. **Discover**
   - Read `AGENTS.md`, the FAST PATH block, and only task-relevant guidance.
   - Run `bun run supermemory:ensure` before meaningful repo work, then query
     only task-relevant memory.
   - Inspect the named surface and direct/transitive callers, contracts, state,
     and failure paths until the evidence-supported blast radius is known.
   - Do not expand scope to hypothetical systems or inventory unrelated files.

2. **Plan proportionately**
   - Trivial work proceeds directly.
   - Multi-step work gets a short task list only when sequencing or risk
     benefits from it.
   - Reuse existing patterns, utilities, and boundaries before adding anything.
   - Define the cheapest decisive non-test evidence for the requested claim.

3. **Execute**
   - Make the smallest coherent edit that fixes the root cause or satisfies the
     requirement.
   - Preserve unrelated shared-worktree changes and re-read touched files before
     editing when concurrent work is plausible.
   - Delete unnecessary code or ceremony instead of adding abstraction.
   - Continue through recoverable local edit-inspect-verify loops without a
     permission handoff.

4. **Verify**
   - Inspect the diff and affected reference chain.
   - Prefer source checks, deterministic validators, type/LSP evidence, focused
     lint/static analysis, dry runs, and `git diff --check` as applicable.
   - Read command output before claiming success; if it fails, fix or use the
     next-best non-test proof.

5. **Record and stop**
   - Update canonical `.ai` state only when project truth changed.
   - Report changed files, the decisive evidence, and any real validation gap.
   - Stop when every requested requirement is implemented and the named claim
     is grounded. Do not add a polishing, reviewer, research, or QA phase merely
     because one is available.

## Test Authorization

- Default to `test_requirement=NOT_REQUIRED`.
- Only an explicit current-task user testing/QA request maps to `TEST_TASK` and
  authorizes creating, expanding, repairing, or running tests.
- `TARGETED`, `BROADER`, criticality, nearby tests, plan metadata, and
  `CHEAPEST_DECISIVE_EXISTING_TEST` may support a precise `TEST_PROPOSAL`; they
  never authorize execution.
- Builds-as-test-gates, Playwright, browsers, screenshots, Storybook, full
  suites, and broad QA are separate opt-in boundaries.

## Git And Workspace Safety

- For Archestimator, stay on the current branch/worktree and assume other agents
  and humans share it.
- Do not create/switch branches or worktrees, stage, commit, push, open a PR, or
  rewrite history unless the current user explicitly requests that exact Git
  action.
- Start with `git status --short --branch`; preserve unrelated changes.

## Delegation

Work directly by default. Delegate only an independent, bounded slice when it
materially improves elapsed time, correctness, or independent judgment. Use an
installed role such as `executor`, `explore`, or `verifier`; never use Worker
outside active team runtime. State ownership, write scope, evidence, and stop
condition. Do not create reviewer chains or subagents for ceremony.

## Optional References

- Use `references/non-code-execution.md` only for a genuinely non-code
  deliverable.
- Use `references/shipping-workflow.md` only when the user explicitly requests a
  commit, push, PR, or release-oriented handoff.
