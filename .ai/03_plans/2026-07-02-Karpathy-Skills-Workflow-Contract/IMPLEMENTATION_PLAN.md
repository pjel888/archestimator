# Karpathy Skills Workflow Contract Update

**Date:** 2026-07-02
**Mode:** documentation implementation
**Proof boundary:** local-only

## Goal

Update Archestimator's AI workflow contract so it captures the useful behavior
benefits from `multica-ai/andrej-karpathy-skills` while preserving `.ai/00_system`
as the single source of truth.

## Scope

- Add the guardrails to canonical operating/framework docs.
- Add a source note under `.ai/13_research/`.
- Update the reusable loop prompt and agent contract README so future adapters
  inherit the same behavior.
- Update current state with the durable contract change.

## Non-goals

- Do not vendor the external `CLAUDE.md`, Cursor rule, or skill text.
- Do not change tool adapter payload files unless a validation failure requires it.
- Do not change runtime code, provider settings, or app behavior.

## Acceptance Criteria

1. Canonical docs describe the imported benefits as Archestimator-native
   guardrails: assumptions/tradeoffs, simplicity, surgical changes, and
   goal-driven verification.
2. External source influence is recorded as background research, not parallel
   policy.
3. Existing dirty app/source files are left untouched.
4. Documentation validation passes with whitespace/path checks and agent-doc
   validation when applicable.

## Validation Plan

- `git diff --check`
- `rg` for the new guardrail/source-note references in `.ai`
- `bun run validate:agents` if the agent contract surface accepts README-only
  changes without requiring payload edits
