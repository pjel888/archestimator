# Karpathy Skills Workflow Contract Docs Run

**Date:** 2026-07-02
**Mode:** documentation implementation
**Proof boundary:** local-only

## Goal

Update Archestimator's AI workflow contract to include the portable benefits of
`multica-ai/andrej-karpathy-skills`: material assumption/tradeoff surfacing,
simplicity-first implementation, surgical diff discipline, and goal-driven
verification.

## Source Of Truth Read

- `AGENTS.md`
- FAST PATH block in `.ai/10_state/current-state.md`
- `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`
- `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md`
- `.ai/00_system/DOCS_SOURCE_OF_TRUTH.md`
- External source:
  `https://github.com/multica-ai/andrej-karpathy-skills`

## Files Changed

- `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`
- `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md`
- `.ai/00_system/DOCS_SOURCE_OF_TRUTH.md`
- `.ai/08_prompts/templates/codebase-ai-loop-task.md`
- `.ai/10_state/current-state.md`
- `.ai/12_agents/README.md`
- `.ai/13_research/2026-07-02-karpathy-skills-agent-workflow-guardrails.md`
- `.ai/03_plans/2026-07-02-Karpathy-Skills-Workflow-Contract/IMPLEMENTATION_PLAN.md`
- `.ai/03_plans/2026-07-02-Karpathy-Skills-Workflow-Contract/LOOP_LEDGER.md`

## Validation

- `git diff --check` passed.
- `bun run validate:agents` passed with `AI workflow validation passed.`
- `rg` reference check confirmed the new guardrail/source-note references in the
  intended `.ai/00_system`, loop template, agent README, current-state, research,
  and plan surfaces.

## Proof Boundary And Gaps

This is `local-only` documentation proof. No app runtime, browser, provider,
database, deploy, or GitHub settings proof is claimed.

Supermemory local at `http://localhost:6767/` was down; a local startup attempt
did not make it available during the run, so advisory memory lookup/closeout
write was skipped. `.ai` and current source evidence remain authoritative.

## Result

Complete for the requested contract update pending final user-facing closeout.
