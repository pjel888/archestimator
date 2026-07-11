# OpenAI GPT-5.6 Agent Prompt Efficiency

**Date:** 2026-07-11  
**Scope:** Official OpenAI guidance used to revise Archestimator agent contracts

## Sources

- [Latest model guidance](https://developers.openai.com/api/docs/guides/latest-model)
- [Reasoning best practices](https://developers.openai.com/api/docs/guides/reasoning-best-practices)
- [Multi-agent guidance](https://developers.openai.com/api/docs/guides/responses-multi-agent)
- [Codex subagents](https://developers.openai.com/codex/agent-configuration/subagents)
- [Codex approvals and security](https://developers.openai.com/codex/agent-approvals-security)
- [Prompt caching](https://developers.openai.com/api/docs/guides/prompt-caching)
- [Agent evaluations](https://developers.openai.com/api/docs/guides/agent-evals)
- [Codex AGENTS.md guidance](https://developers.openai.com/codex/agent-configuration/agents-md)

## Current Guidance

1. GPT-5.6 is the current frontier family. Model and reasoning effort should be
   intentional: use a balanced default and reserve higher effort for measured
   quality gains on genuinely difficult work.
2. Lean prompts perform better. State each instruction once, remove repeated
   examples, expose only relevant tools, and keep tool descriptions precise.
   OpenAI reports directional internal coding-agent improvements after prompt
   simplification, but recommends representative evaluation before treating
   token or call reductions as quality gains.
3. Specify the outcome, domain context, hard constraints, approval boundaries,
   evidence requirements, success criteria, and stop condition. Avoid
   prescribing every reasoning step or requesting hidden chain-of-thought.
4. Keep autonomy policy compact: inspect-only requests remain read-only;
   change/fix requests authorize in-scope local edits and relevant
   non-destructive validation; reserve confirmation for destructive, external,
   paid, credential-gated, or materially scope-changing actions.
5. Delegate concrete independent workstreams. Multi-agent execution can reduce
   wall time for separable exploration, research, review, and evidence lanes,
   but costs more tokens and is a poor fit for ordered reasoning or shared
   mutable writes.
6. Prefer direct tool calls when each result affects judgment, approval,
   citations, or final validation. Use programmatic orchestration only for
   bounded predictable processing with explicit inputs, outputs, retry limits,
   handoff, and stop conditions.
7. Put stable reusable instruction prefixes before variable task content to
   preserve prompt-cache matches. Pull detailed protocols on demand rather than
   repeatedly preloading them.
8. Stop once success criteria have sufficient evidence. Do not repeat completed
   retrieval or validation; retry only bounded transient failures and replan
   when evidence disproves the current approach.

## Archestimator Decisions

- Verification remains mandatory; tests become a conditional proof method.
- Tests default to `NOT_REQUIRED` and run only for explicit testing work or a
  named MVP-critical invariant that cheaper evidence cannot prove.
- Broad suites, builds, browser automation, Storybook, and manual QA require an
  explicit or integrated critical claim.
- The main thread owns requirements, decisions, integration, and the final
  claim. Subagents receive bounded scopes and are used only for independent
  work with measurable throughput or review value.
- Canonical policy lives in `.ai/00_system`; root and tool-specific files are
  compact adapters, not parallel policy sources.
- Prompt quality is judged on task success, evidence completeness, defect risk,
  latency, token/context cost, and unnecessary tool/test calls together.
