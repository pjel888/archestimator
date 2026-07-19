---
name: archestimator-plan-pack
description: "Bind generic planning workflows to Archestimator's Direct, Brief, and Plan Pack lanes and canonical planning suite."
---

# Archestimator Plan Pack Binding

This skill is a thin repository adapter. `AGENTS.md` and
`.ai/00_system/PLAN_PACK_EXECUTION_POLICY.md` decide whether work uses Direct,
Brief, or Plan Pack. Generic planning workflows cannot widen that gate.

## Routing

- **Direct:** clear bounded work; no written plan.
- **Brief:** multi-file, moderately risky, or ambiguous work; compact in-session
  Task Contract and sequence.
- **Plan Pack:** explicitly requested planning or genuinely expensive-to-reverse
  destructive data, live auth/token, security-boundary, broad architecture, or
  coordinated multi-owner work.

High blast radius increases analysis depth, not automatic artifacts, agents,
tests, ledgers, reviewers, rollout, or approval.

## Plan Pack Workflow

1. Load `.ai/08_prompts/000_Planning Prompts/README.md`.
2. Follow the kernel, triggered gates, one stage prompt, and schema.
3. Load
   `.ai/08_prompts/000_Planning Prompts/Multi-Agent-Execution-Directive.md`
   only when orchestration is used.
4. Create `plan-pack.json` plus the fewest artifacts a fresh executor needs.
5. Use `NOT_REQUIRED|TEST_PROPOSAL|TEST_TASK` from the Validation Matrix.
6. Validate the pack and stop when its Completion Contract is evidenced.

Do not create a separate contention ledger unless an active pack explicitly
needs one. Preserve unrelated shared-worktree changes and keep all Git, provider,
and test authority boundaries from `AGENTS.md`.
