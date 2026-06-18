# Agents

This folder is the canonical Archestimator agent-role contract surface.

Shared framework rules live in `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md`.
Payloads in `payloads/` are thin role-specific adapters and must not fork
project policy.

All agents and harnesses inherit the same fast-start and loop-engineered
product-development mandate from `.ai/00_system`: read `AGENTS.md` plus the FAST
PATH block in `.ai/10_state/current-state.md`, pull deeper docs only by
task/risk, discover current reality, plan at proportional depth, research
uncertain claims in `.ai/13_research` when needed, execute through the narrowest
adequate loop surface, verify with maker/checker and real-surface evidence, and
persist durable state outside chat when project truth changes. Tool-specific
features translate this loop; they do not replace it.

The loop activation criteria (trivial vs non-trivial), the named loop shape, stop
conditions, and bounds are canonical in `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`
("Loop activation criteria and bounds"); the durable-artifact + `LOOP_LEDGER`
contract is in `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md`; the reusable prompt is
`.ai/08_prompts/templates/codebase-ai-loop-task.md`. Payloads point to these — they
do not restate the policy.

## Roster

| Agent/harness | Status | Primary lane | Notes |
|---|---|---|---|
| Codex | approved | implementation, tests, validation, PR-ready diffs | Default builder for source and docs execution. |
| Claude | approved | planning, architecture, critique, writing | Default review/planning lane; implementation only if assigned. |
| OpenCode | conditional | exploration, fallback planning/review | Verify installed schema before config edits. |
| CommandCode | conditional | taste-aware review, sentinel checks, PR work | Sentinels default read-only unless assigned. |
| Antigravity CLI (`agy`) | approved | isolated terminal lane | Use current checkout when assigned to `main`; isolate only when the lead chooses. |
| Kimi | conditional | UI/product, frontend review, long-context synthesis | Treat `DESIGN.md` as alpha guidance; use lint proportionally. |
| DeepSeek | conditional | debugging, logic critique | Read-only/default diagnostic unless assigned. |
| Hermes | unapproved until payload-backed | orchestration/evidence | May not orchestrate until explicitly approved. |
| Gemini | deprecated | none | Hard-stop fail closed unless Philip reapproves for a specific task. |
| Ollama | non-agent | embeddings only | No chat/planning/coding use without explicit approval. |

## Routing Rules

- Use the smallest number of agents needed.
- Give write-capable agents exact disjoint scopes. When the active user says to
  stay on `main`, use the current checkout or read-only lanes unless the lead
  explicitly authorizes isolation.
- Keep read-only reviewers read-only.
- The lead owns integration, validation, evidence, and final status.
- The lead maps agent-specific features to the shared loop surfaces: direct
  execution, parallel lanes, durable goal state, exhaustive research,
  adversarial QA, browser proof, and provider/manual proof.
- Provider, GitHub settings, Notion mutation, paid add-ons, and destructive
  actions require action-specific authority and proof logging.

## Payloads

Every active, conditional, deprecated, unapproved, and non-agent payload must
follow `payloads/_template.md` or intentionally fail closed.
