# OpenAI GPT-5.6 Agent Prompt And Orchestration Guidance

**Date:** 2026-07-19
**Scope:** Official OpenAI guidance applied to Archestimator agent contracts

## Primary Sources

- [GPT-5.6 prompt guidance](https://developers.openai.com/api/docs/guides/prompt-guidance-gpt-5p6)
- [Latest GPT-5.6 model guidance](https://developers.openai.com/api/docs/guides/latest-model?model=gpt-5.6)
- [Responses API multi-agent guidance](https://developers.openai.com/api/docs/guides/responses-multi-agent)
- [Message roles and instruction following](https://developers.openai.com/api/docs/guides/text#message-roles-and-instruction-following)
- [Codex AGENTS.md discovery](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
- [Codex subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents.md)
- [Codex model selection](https://learn.chatgpt.com/docs/models#choosing-sol-terra-and-luna)
- [Prompt caching](https://developers.openai.com/api/docs/guides/prompt-caching#structuring-prompts)

## Confirmed Guidance

1. Start outcome-first: result, constraints, evidence, completion bar, output
   shape, and stop condition before process detail.
2. Simplify prompts. Repetition, broad tool exposure, and contradictory policies
   degrade reliability; use absolute language only for true invariants.
3. Define autonomy once. Continue safe in-scope reversible work; reserve
   escalation for destructive, credential-gated, external, paid, or materially
   scope-changing actions.
4. Parallelize independent reads and serialize dependent decisions or writes to
   shared mutable state. Delegate concrete bounded work, not vague goals.
5. Keep stable instructions first and volatile task data last for prompt-cache
   reuse. Preserve prior reasoning only while the objective and assumptions
   remain stable; compact at milestones.
6. `gpt-5.6` is the configured alias for the Sol frontier tier.
   `gpt-5.6-terra` balances capability and cost for read-heavy work.
   `gpt-5.6-luna` fits clear repeatable extraction, classification, inventory,
   and mechanical transformation.
7. Model, reasoning effort, API Pro mode, and orchestration are separate
   controls. Pro and Ultra are not model-slug suffixes.
8. Preserve the current reasoning setting as baseline, compare the same and one
   lower on representative work, and use the lowest effort that preserves
   quality. Reserve maximum settings for measured hard cases.
9. Native multi-agent defaults favor bounded flat delegation. Depth one and a
   six-thread ceiling limit fan-out; three concurrent workers is a practical
   normal reassessment point, not a quota.
10. Responses API multi-agent beta limitations are surface-specific and must not
    be generalized to Codex or every native agent runtime.

## Archestimator Decisions

- `AGENTS.md` remains the repository entry contract. Current source and
  executable configuration remain implementation evidence.
- `.ai/08_prompts/000_Planning Prompts/Multi-Agent-Execution-Directive.md` is
  canonical whenever orchestration is selected and defines portable native,
  thread, emulated, and single-agent behavior.
- Capability classes are semantic; concrete current mapping and fallbacks live
  in `.ai/12_agents/codex-role-model-matrix.json`.
- The normal fallback is configured role, repository default, nearest available
  capable model with critical downgrade disclosed, then sequential lead work.
- Completion requires artifact inspection and fresh authorized evidence; worker
  summaries are indexes, not proof.
- Archestimator's user-controlled product-test gate remains authoritative.
  Official generic coding examples do not grant test execution.
- Prompt changes are evaluated through ten representative workflow simulations,
  deterministic validators, and focused contract tests when the user requests
  testing.

## Unsupported Inferences

OpenAI does not define Archestimator's Task, Assignment, Handoff, Completion, or
Recovery schemas. Those are repository contracts. Public documentation absence
alone also does not justify deleting local experimental runtime flags; validate
resolver behavior before changing them.
