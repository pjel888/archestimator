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
- [Trace grading](https://developers.openai.com/api/docs/guides/trace-grading)
- [Tool search](https://developers.openai.com/api/docs/guides/tools-tool-search)
- [Compaction](https://developers.openai.com/api/docs/guides/compaction)
- [Running Agents SDK agents](https://openai.github.io/openai-agents-js/guides/running-agents/)
- [Codex long-running work](https://developers.openai.com/codex/long-running-work)
- [Codex AGENTS.md guidance](https://developers.openai.com/codex/agent-configuration/agents-md)

## Current Guidance

1. GPT-5.6 is the current frontier family. Sol is the hard-judgment default;
   Terra is the balanced full-capability tier for read-heavy work. Model tier,
   reasoning effort, response verbosity, and pro mode are separate controls.
   Use `medium` as the balanced effort and reserve `max` for the hardest
   quality-first work.
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
   preserve exact prompt-cache matches. API agents should record cache read/write
   telemetry and use deliberate cache keys rather than treating cache writes as
   free. Pull detailed protocols on demand rather than repeatedly preloading them.
8. Stop once success criteria have sufficient evidence. Do not repeat completed
   retrieval or validation; retry only bounded transient failures and replan
   when evidence disproves the current approach.
9. For API agents, defer tool schemas and load the relevant namespace on demand;
   keep namespaces cohesive and below ten functions where practical. Grade
   traces for tool choice, ordering, handoffs, routing, safety, and unnecessary
   calls before relying only on final-answer evaluation.
10. Responses API `reasoning.context`, `previous_response_id`, and server-side
    compaction are API-runtime controls, not Codex CLI settings. Preserve opaque
    compaction state exactly and do not manually prune when native continuation
    owns the conversation state.
11. Put approvals and guardrails on each side-effecting tool boundary; a parent
    agent policy does not transitively protect nested mutations. Bound turns and
    tool timeouts; exhaustion means replan or block, never success.
12. GPT-5.6 is concise by default. Preserve conclusion, evidence, material
    caveat, and next action before removing repetition; broad brevity mandates
    can reduce completeness.

## Archestimator Decisions

- Verification remains mandatory; tests become a conditional proof method.
- Tests default to `NOT_REQUIRED`. Explicit testing output maps to `TEST_TASK`;
  `TARGETED` is reserved for a named MVP-critical invariant that cheaper
  evidence cannot prove, with one narrow exception for an already-existing
  focused test that is demonstrably the cheapest decisive proof and requires no
  test edits.
- Broad suites, builds, browser automation, Storybook, and manual QA require an
  explicit or integrated critical claim.
- The main thread owns requirements, decisions, integration, and the final
  claim. Subagents receive bounded scopes and are used only for independent
  work with measurable throughput or review value.
- Canonical policy lives in `.ai/00_system`; root and tool-specific files are
  compact adapters, not parallel policy sources.
- Prompt quality is judged on task success, evidence completeness, defect risk,
  latency, token/context cost, correct tool/handoff traces, and unnecessary
  tool/test calls together.
- Native Codex subagent depth stays at one unless recursive delegation has a
  demonstrated need; six threads is a ceiling and three active lanes is the
  normal reassessment point.
- Writer remains on Sol/high because documentation accuracy and completeness are
  output-quality claims; Terra becomes the default only after a representative
  writer evaluation demonstrates parity rather than from configuration alone.
- Codex uses native model context and compaction defaults rather than stale
  manual caps. API-only cache/context/compaction controls stay in API runtimes.
