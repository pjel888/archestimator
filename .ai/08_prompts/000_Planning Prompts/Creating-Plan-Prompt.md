# Create A Plan Pack

## Load

Read `Frontier-Planning-Kernel.md`, applicable
`Frontier-Applicability-Gates.md`, this prompt, then `Plan-Pack-Schema.md`.

## Objective

Create the smallest executable pack that preserves the full requested outcome.
This stage plans; it does not implement product code.

## Method

1. Record outcome, scope, non-goals, acceptance criteria, and stop condition.
2. Inspect current source and only task-relevant durable truth.
3. Map the evidence-supported blast radius and applicable gates.
4. Resolve ordinary decisions; isolate exact external authorization boundaries.
5. Create the minimum dependency-ordered units needed for execution.
6. Map each criterion to authorized evidence and a test decision.
7. Write `plan-pack.json` plus the fewest useful Markdown artifacts.
8. Run the plan-pack validator and repair failures.

## Lean Rules

- Alpha/pre-beta: prefer direct target design and fix forward.
- No speculative compatibility, flags, rollout, rollback, hosted proof, agents,
  tests, matrices, or artifacts.
- No internal blocker or routine owner decision.
- No file-count targets or duplicated summaries.
- Use a plan pack only because this task passed the Plan Pack entry gate.

## Completion

Return the folder, profile, first ready unit, material decisions/boundaries, and
validation result. Stop when a fresh executor can start without invention.
