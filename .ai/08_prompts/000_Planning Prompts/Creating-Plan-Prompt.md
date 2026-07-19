# Create A Plan Pack

## Load

Read `Frontier-Planning-Kernel.md`, applicable
`Frontier-Applicability-Gates.md`, this prompt, and `Plan-Pack-Schema.md`.
Load `Multi-Agent-Execution-Directive.md` only when orchestration is selected.

## Objective

Create the smallest executable pack that preserves the full requested outcome.
This stage plans; it does not implement product code.

## Method

1. Prove the task belongs in the Plan Pack lane.
2. Record the outcome-first Task Contract, non-goals, authorization boundaries,
   acceptance criteria, evidence decisions, and stop condition.
3. Inspect current source and only task-relevant durable truth.
4. Map the evidence-supported blast radius and triggered gates.
5. Resolve ordinary choices and isolate exact external boundaries.
6. Build the minimum acyclic, dependency-ordered units with owned paths,
   implementation boundaries, evidence, recovery, and completion signals.
7. Add orchestration assignments only for independent work that benefits.
8. Write `plan-pack.json` and the fewest useful Markdown artifacts.
9. Run the plan-pack validator and repair every failure.

## Completion

Return the folder, profile, first ready unit, material decisions/boundaries, and
validation result. Stop when a fresh executor can start without invention,
routine questions, or unrelated context.
