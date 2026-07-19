---
description: Resolve a task capability class through the current role-model matrix and fallback chain.
---

# Capability Route Command

Read `.ai/12_agents/codex-role-model-matrix.json` and current runtime capability
before recommending an implementation.

## Routing

- `frontier_judgment`: ambiguity, architecture, cross-document synthesis,
  conflict resolution, and high-risk review.
- `balanced_read_heavy`: repository exploration, official-doc research,
  reference tracing, and structured extraction.
- `fast_repeatable`: bounded deterministic classification, formatting,
  comparison, and mechanical verification.

Resolve in matrix order: configured role/model, repository default at suitable
effort, nearest available capability with any judgment downgrade disclosed, then
lead-owned sequential execution. Model identity, reasoning effort, Pro mode, and
orchestration mode remain separate decisions.

## Output

Return the required capability class, current resolved role/model and effort,
evidence that the implementation is available, reason, latency/cost tradeoff,
escalation triggers, and the ordered fallback. Never invent a model slug or rely
on a stale provider-specific tier name.
