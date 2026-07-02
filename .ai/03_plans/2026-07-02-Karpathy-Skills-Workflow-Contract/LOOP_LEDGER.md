# Loop Ledger

## Goal

Fold the portable benefits of `multica-ai/andrej-karpathy-skills` into
Archestimator's AI workflow contract without creating a parallel tool-specific
policy.

## Scope

- `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`
- `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md`
- `.ai/00_system/DOCS_SOURCE_OF_TRUTH.md`
- `.ai/08_prompts/templates/codebase-ai-loop-task.md`
- `.ai/12_agents/README.md`
- `.ai/10_state/current-state.md`
- `.ai/13_research/2026-07-02-karpathy-skills-agent-workflow-guardrails.md`

## Non-goals

- Runtime code changes.
- Provider, deploy, database, or GitHub mutations.
- Vendoring external prompt/rule files as repo policy.

## Branch / Status

- Branch/status: existing worktree has unrelated dirty source/test files before
  this run; they are out of scope and must remain untouched.
- Proof boundary: `local-only`.

## Source of Truth Read

- `AGENTS.md`
- FAST PATH block in `.ai/10_state/current-state.md`
- `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`
- `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md`
- `.ai/00_system/DOCS_SOURCE_OF_TRUTH.md`
- External source:
  `https://github.com/multica-ai/andrej-karpathy-skills`

## Acceptance Criteria

1. Canonical docs describe the behavior benefits as Archestimator-native
   guardrails.
2. Source note records external influence as background only.
3. Reusable loop/agent contract surfaces point back to `.ai/00_system`.
4. Validation evidence is recorded before claiming completion.

## Validation Plan

- `git diff --check`
- `rg` reference checks for guardrails and source note
- `bun run validate:agents` if applicable to the changed agent contract files

## Iteration Log

### Iteration 1

- Hypothesis: A small contract update can capture the external repo's benefits
  without copying tool-specific prompt text or changing runtime behavior.
- Action: Add canonical guardrail sections, source note, loop prompt update,
  agent README inheritance text, current-state summary, and this plan pack.
- Files changed: listed in Scope.
- Evidence:
  - `git diff --check` passed.
  - `bun run validate:agents` passed with `AI workflow validation passed.`
  - `rg` reference check found the guardrails/source-note links in the intended
    `.ai/00_system`, loop template, agent README, current-state, research, and
    plan surfaces.
  - Supermemory local was unavailable after a startup attempt; `.ai` and source
    evidence remain authoritative for this run.
- Result: accepted for `local-only` documentation proof.
- Next decision: stop after final diff/status review.

## Stop Condition

Reached when the docs diff is scoped, reference checks pass, whitespace checks
pass, and the agent-contract validator passes.

## Proof Boundary

`local-only`; no provider, browser, app runtime, or external deployment proof is
claimed.

## Remaining Risks

- External repo content can change after this source note; future updates should
  re-check the source before further edits.
- Supermemory did not start during this run, so no advisory memory lookup or
  closeout memory write was performed.
