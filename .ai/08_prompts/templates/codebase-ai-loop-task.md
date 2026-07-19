# Archestimator Task Contract Template

This is a reusable adapter, not a canonical policy source. Start with
`AGENTS.md`, the FAST PATH in `.ai/10_state/current-state.md`, and only the
task-relevant system protocol. Do not linear-read the full history logs.

## Outcome

- Objective and intent:
- Required result:
- Acceptance criteria:
- Stop condition:

## Scope

- Included paths/behavior:
- Exclusions:
- Authoritative sources:
- Constraints and authorization boundaries:
- Dependencies and assumptions:

## Execution

- Lane: `Direct|Brief|Plan Pack`
- Sequence: `DISCOVER -> DECIDE -> EDIT -> VERIFY -> FINISH`
- Owner and capability class:
- Tools and read/write permissions:
- Evidence/test decision: `NOT_REQUIRED|TEST_PROPOSAL|TEST_TASK`
- Failure/retry and escalation condition:

When orchestration is selected, append bounded Subagent Assignment and Handoff
contracts from
`.ai/08_prompts/000_Planning Prompts/Multi-Agent-Execution-Directive.md`.
Do not copy the full directive or planning suite into the task packet.

## Completion Report

Return result, changed files, decisive evidence, explicitly unrun tests or
external proof, remaining risk, and confirmation that no safe in-scope work or
ownership remains.
