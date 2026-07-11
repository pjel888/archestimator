# Frontier Planning And Execution Suite

This directory is Archestimator's canonical planning-to-delivery prompt suite.
It is designed for high-quality autonomous work without routine owner
involvement.

## Canonical Files

Load shared instructions in this order:

1. `Frontier-Planning-Kernel.md` - precedence, action scope, autonomy,
   capability routing, evidence, state, safety, and completion invariants.
2. Applicable sections of `Frontier-Applicability-Gates.md` - only the domain
   contracts changed or claimed by the task.
3. One active stage prompt or execution directive.
4. `Plan-Pack-Schema.md` - the artifact, ID, manifest, readiness, and handoff
   contract used by the active stage.

| Stage | Prompt | Output |
|---|---|---|
| 1. Create | `Creating-Plan-Prompt.md` | Evidence-grounded plan pack |
| 2. Improve | `Improve-Plan-Prompt.md` | Repaired, simplified, verified pack |
| 3. Compile | `Create-Implementation-Prompt.md` | Canonical `IMPLEMENTATION_PLAN.md` |
| 4. Execute | `Executing-Plan-Prompt.md` | Integrated implementation and evidence |

`Multi-Agent-Execution-Directive.md` is the reusable execution overlay when a
task brief or plan does not invoke the four stages directly.

`Prompt-Evaluation-Suite.md` defines the semantic regression scenarios and
grading assertions for future prompt changes.

Verification is mandatory; tests are conditional. Every criterion records
`test_requirement` as `NOT_REQUIRED` (default), `TARGETED`, `BROADER`, or
`TEST_TASK`. Do not create or run tests for `NOT_REQUIRED`; select tests only for
explicit testing scope or a named MVP-critical invariant that cheaper evidence
cannot prove.

## Validation

- `bun run validate:planning-prompts` is the fast deterministic contract check
  for suite edits. It checks structure, load order, context budget, eval
  inventory/rubric, and the semantic plan-pack fixture; it is not a product test
  suite.
- `bun run validate:plan-pack -- <planning-folder>` checks required manifest
  shape, hashes, traceability, DAG/slices, evidence freshness, real-path
  containment, and cross-status semantics.
- `bun run validate:plan-pack -- --write <planning-folder>` refreshes only
  ordinary artifact and manifest hashes after semantic validation. It never
  refreshes evidence fingerprints or changed current-source/readiness/proof-
  bearing hashes; invalidate and re-prove those claims explicitly.

## Progressive Disclosure

Do not paste the suite into every worker packet. The lead loads the kernel,
applicable gates, stage, and schema, then sends only the goal capsule, owned IDs,
exact source context, constraints, dependencies, and required evidence for that
lane. Retrieve supporting context just in time.

## Adaptive Artifact Shape

Plan packs have no fixed file-count ceiling. Use the selected depth profile and
applicable gates: keep a focused concern compact, but split substantive
independently reviewable data, threat, failure, evidence, rollout, or final-audit
domains when their ownership, freshness, invalidation, or retrieval boundaries
differ. Cross-link and register every artifact, keep one canonical execution
artifact, and never create files merely to match another pack's count.

## Research Basis

The primary-source review is recorded in
`.ai/13_research/frontier-planning-and-autonomous-execution-2026-07-10.md` and
`.ai/13_research/2026-07-11-openai-gpt-5-6-agent-prompt-efficiency.md`.
The governing conclusions are lean single-source instructions, task-shape
orchestration, conditional tests, durable checkpoints, deterministic evidence
first, and evaluator loops driven by failed criteria rather than ritual cycles.
