# Current Agentic Execution Profile

## Authority And Purpose

This file updates the pack to the current repository execution contract without
changing its product scope, requirement IDs, ownership boundaries, package
status, or release claims. AGENTS.md, the current .ai/00_system protocols,
and the User Test Authorization Gate override older workflow language in this
pack. Where an older artifact says to automatically run, add, repair, or require
tests, builds, browser automation, screenshots, Storybook, broad validation, or
named reviewer lanes, interpret that language through this profile.

## Lean Execution Contract

1. Re-read current source and mutable provider/configuration facts before work;
   historical source anchors are navigation aids, not proof of current reality.
2. Discover the evidence-supported direct and transitive blast radius, then stop
   exploring. Do not widen scope for hypothetical future reuse.
3. Implement the smallest coherent dependency-closed unit. Prefer deletion,
   existing utilities, and existing repository patterns over new abstractions.
4. Use one lead lane by default. Delegate only bounded independent work when it
   materially improves elapsed time, quality, or safety; no reviewer, critic,
   architect, team, swarm, or browser lane is mandatory by role name.
5. Keep coupled critical-path edits with one owner. Preserve concurrent work,
   stay on the current branch/worktree, and do not create branches or worktrees
   unless explicitly requested or required by an approved plan.
6. Select the cheapest decisive evidence for each acceptance claim. Static
   inspection, focused type/LSP checks, schema inspection, dry-run output,
   provider readback, and diff checks are valid when they directly prove it.
7. Stop when the current unit's acceptance claim is grounded and its handoff is
   durable. Do not add artifacts, agents, gates, or proof merely for ceremony.

## Test Authorization Contract

- Default test_requirement=NOT_REQUIRED. Do not create, expand, repair, or run
  automated tests, test suites, build-as-test gates, browser automation, visual
  QA, or broad validation unless Philip explicitly requests testing for the
  current task.
- TARGETED or BROADER means a named risk would benefit from testing. It
  authorizes only a TEST_PROPOSAL containing the risk and exact command; it
  does not authorize execution.
- TEST_TASK is the only state that authorizes test creation or execution and
  requires an explicit current-task testing request from Philip.
- Existing TEST-*, verification matrices, commands, browser scenarios, and
  proof destinations remain useful specifications. They are not standing
  execution instructions. Until authorized, use non-test evidence and record
  the unexecuted test as a validation gap or proposal rather than a blocker.
- Hosted, provider, GitHub, production, legal, and manual claims still require
  evidence from their own boundary. Local or static evidence cannot substitute.

## Proportional Loop And Handoff

For non-trivial implementation use the bounded
DISCOVER -> PLAN -> EXECUTE -> VERIFY -> RECORD -> DECIDE loop. Keep the plan
in-session unless the work is high-blast-radius or explicitly needs a durable
pack. Record only decisions, evidence, invalidations, ownership changes, and the
exact next action that another agent needs. Routine command transcripts and
repeated no-change review notes do not belong in the durable ledger.

Before each unit, record test_requirement as NOT_REQUIRED, TARGETED,
BROADER, or TEST_TASK. Before claiming that unit complete, map every
acceptance claim to current authoritative evidence, preserve unresolved external
or authorization boundaries, and identify any explicit validation gap. A plan
validator proves structural planning integrity only; it never proves product,
runtime, provider, hosted, or release completion.

## Stop Conditions

Stop the execution loop only when the requested unit is proven complete, the
user cancels, a destructive/irreversible/credential-gated boundary requires
authority, or materially distinct recovery paths cannot make the core
deliverable possible. Optional tooling, memory sync, reviewer availability,
hosted proof, or an unrequested test is not an artificial implementation
blocker; complete all safe local work and report the narrower boundary.

