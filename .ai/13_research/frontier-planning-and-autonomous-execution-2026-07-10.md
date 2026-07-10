# Frontier Planning And Autonomous Execution Research

**Date:** 2026-07-10
**Scope:** Planning prompts, long-horizon coding harnesses, multi-agent routing,
evaluator loops, context engineering, and safe autonomous execution.
**Evidence class:** Current primary vendor engineering guidance, official SDK
documentation, and one controlled multi-agent scaling study. External claims
were reviewed for this prompt-suite revision; repository policy and source still
control Archestimator-specific behavior.

## Decision Summary

The strongest available evidence supports a compact shared control kernel plus
stage-specific deltas, progressive disclosure, mechanically checkable state,
task-shape-based delegation, durable restart receipts, deterministic proof first,
and semantic evaluator loops driven by failed criteria. It does not support
duplicating a universal contract in every prompt, invoking every named workflow,
fixed multi-agent topology, ritual reviewer cycles, or arbitrary readiness-score
caps based on reviewer identity.

## Primary Sources

| Source | Relevant finding | Local design consequence |
|---|---|---|
| [OpenAI: Harness engineering](https://openai.com/index/harness-engineering/) | Repository guidance should be a compact map with progressively disclosed detail; mechanically enforce invariants where possible. | One kernel, one schema, applicability gates, concise stage prompts, deterministic validators. |
| [OpenAI: Codex long-horizon engineering white paper](https://cdn.openai.com/pdf/8a9f00cf-d379-4e20-b06f-dd7ba5196a11/OAI_WhitePaper_Codex-maxxing26.pdf) | Long work benefits from observable goals, constrained environments, durable progress, and verifiable completion. | Goal/ledger fallback, manifest/baseline hashes, restart packets, requirement-to-evidence audit. |
| [OpenAI: Running Codex safely](https://openai.com/index/running-codex-safely/) | Routine sandboxed actions can proceed while destructive, costly, or shared-system actions need explicit boundaries. | `current_run_scope`, `AUTH-*`, safe fallback, no external-authority inference from plan prose. |
| [OpenAI Agents SDK: Multi-agent orchestration](https://openai.github.io/openai-agents-python/multi_agent/) | Manager and handoff patterns should match task ownership and dependency shape. | One lead/integrator, bounded role packets, direct work for coupled tasks, parallel lanes only for independent nodes. |
| [Anthropic: Effective context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) | Context is finite; high-signal just-in-time retrieval and durable compact state outperform indiscriminate loading. | Progressive disclosure, bounded packets, evidence receipts, source manifests instead of full-repo preload. |
| [Anthropic: Building effective agents](https://www.anthropic.com/engineering/building-effective-agents) | Add orchestration and evaluator loops only when task complexity and clear criteria justify them. | Capability/task-shape router; failed-criterion iteration rather than ceremonial cycles. |
| [Anthropic: Multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system) | Parallel agents help decomposable information-gathering tasks but impose substantial coordination/context cost. | Parallel read lanes, serialized shared writes, lead-owned synthesis and evidence. |
| [Anthropic: Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) | Incremental slices, explicit progress state, baseline checks, and clean handoffs improve long-running reliability. | Unit DAG, manifest, current next node, fingerprints, cleanup and resume contracts. |
| [Anthropic: Harness design for long-running apps](https://www.anthropic.com/engineering/harness-design-long-running-apps) | Harness components should be evaluated and simplified as model capability changes. | Context budget validator, 30 regression scenarios, no duplicated legacy overlay. |
| [Anthropic: Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) | Prefer deterministic outcome graders; calibrate model judges with multiple trials and transcript inspection. | Semantic plan-pack fixture, structural validator, three-trial semantic protocol, retained transcripts and model/cost metadata. |
| [Controlled multi-agent scaling study](https://arxiv.org/abs/2512.08296) | Multi-agent gains depend on decomposability; sequential planning can regress under forced parallelism. | No fixed topology or agent-count target; dependency DAG and contention gate decide parallelism. |

## Applied Conclusions

1. **Context economy:** The five former monolithic prompts are replaced by a
   shared kernel/schema/gates plus short stage deltas. The suite validator caps
   combined prompt context and rejects the retired duplicated overlay.
2. **Authority safety:** Runtime authority is recomputed from current policy and
   invocation. A package records intended scope but cannot grant actions.
3. **Autonomous decisions:** Ordinary ambiguity is closed through evidence and
   `DEC-AUTO-*`; only destructive, paid, unauthorized external, credential, or
   legal boundaries become `AUTH-*`.
4. **Durable execution:** `plan-pack.json`, evidence fingerprints, status state
   machines, task DAGs, restart receipts, and atomic cross-process lease claims
   make interruption and concurrent work explicit.
5. **Evidence correctness:** Criterion, evidence, proof-boundary, implementation,
   release, lifecycle, and terminal states are separate. Reviewer identity is
   provenance, not readiness authority.
6. **Evaluation:** Thirty positive/negative scenarios cover action scope,
   concurrency, stale proof, manifest corruption, canonical promotion, recovery,
   provider boundaries, security, performance, and archival. Deterministic
   graders run on every change; stochastic semantic evaluation uses multiple
   trials and transcript review.

## Confidence And Limits

Confidence is high for context reduction, structured durable state, evidence
separation, and task-shape routing. Confidence is medium for any universal
parallelism threshold because results remain workload- and model-dependent.
This review does not claim that a single prompt version is permanently optimal;
the regression suite is the mechanism for future evidence-driven revision.
