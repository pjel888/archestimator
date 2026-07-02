# Karpathy Skills Workflow Guardrails Source Note

**Date checked:** 2026-07-02
**Status:** Background source for Archestimator's canonical `.ai/00_system`
agent workflow contracts.

## Sources Checked

- GitHub repository:
  `https://github.com/multica-ai/andrej-karpathy-skills`
- Raw reusable skill:
  `https://raw.githubusercontent.com/multica-ai/andrej-karpathy-skills/main/skills/karpathy-guidelines/SKILL.md`
- Raw project `CLAUDE.md`:
  `https://raw.githubusercontent.com/multica-ai/andrej-karpathy-skills/main/CLAUDE.md`

## Source Facts

The repository describes itself as a compact Claude Code guidance file derived
from Andrej Karpathy's observations about common LLM coding pitfalls. It
packages four behavior principles:

1. Think before coding: surface assumptions, ambiguities, and tradeoffs instead
   of silently choosing an interpretation.
2. Simplicity first: avoid speculative features, unnecessary abstractions, and
   bloat.
3. Surgical changes: touch only what the task requires, preserve existing style,
   and avoid unrelated cleanup.
4. Goal-driven execution: convert work into success criteria and verify before
   claiming completion.

The repo also frames the tradeoff explicitly: these rules bias toward caution
for non-trivial work, while trivial tasks still need judgment.

## Portable Benefits For Archestimator

Archestimator already has a bounded loop contract. The useful addition is a
clearer behavioral preflight and diff-discipline overlay:

- Fewer wrong silent assumptions because agents must name material uncertainty
  before editing.
- Less overengineering because the default implementation target is the
  smallest coherent change.
- Cleaner diffs because unrelated refactors, formatting churn, and dead-code
  cleanup stay out of scope unless requested.
- Better autonomous execution because tasks become acceptance criteria plus
  validation gates, not loose imperatives.

## Adoption Boundary

Do not vendor the external `CLAUDE.md`, Cursor rule, or skill text as a new
authority in this repo. Archestimator's canonical application lives in:

- `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`
- `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md`
- `.ai/08_prompts/templates/codebase-ai-loop-task.md`
- `.ai/12_agents/README.md`

Tool adapters may reference those canonical docs. They must not fork the
behavioral contract.
