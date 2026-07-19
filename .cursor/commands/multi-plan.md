---
description: Create a planning-only multi-agent plan through the canonical portable orchestration contract.
---

# Portable Multi-Agent Plan Adapter

Load `AGENTS.md`, the FAST PATH,
`.ai/08_prompts/000_Planning Prompts/README.md`,
`.ai/08_prompts/000_Planning Prompts/Frontier-Planning-Kernel.md`, and
`.ai/08_prompts/000_Planning Prompts/Multi-Agent-Execution-Directive.md`.

- Stay planning-only: inspect current source and evidence but do not edit product
  code, run product tests, or mutate Git/provider state.
- Establish the parent Task Contract, dependency graph, relevant files,
  acceptance criteria, exact validation commands, proof boundaries, and stop
  conditions.
- Use the fewest independent lanes that materially improve time or judgment.
  Select capability classes through
  `.ai/12_agents/codex-role-model-matrix.json`; never hardcode provider models.
- Use native subagents, parallel threads, emulated passes, or single-agent fallback
  according to runtime capability. Apply identical Assignment and Handoff
  contracts and never claim independence in emulated mode.
- Serialize same-file or shared-resource work and name one final synthesizer.
- Return one executable plan with ordered dependencies, parallelizable lanes,
  ownership, risks, recovery, validation strategy, and definition of done.

Do not impose fixed agent counts, dual-model approval, mandatory external calls,
or user confirmation before returning a completed planning artifact.
