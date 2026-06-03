# Agent Compliance Enforcement and Self-Diagnostic Plan

## Preflight checklist
Mode, scope, non-goals, branch/worktree, dirty status, source-of-truth read, graph check, allowed writes, disallowed writes, validation, stop condition, external authority boundary.

## Receipt format
`AGENT_RECEIPT: mode=<plan-only|read-only|implementation|review|release>; scope=<...>; writes=<...>; validation=<...>; proof-boundary=<...>`.

## Self-diagnostic triggers
Philip reports stale/worse/confused behavior; instructions conflict; context feels stale; repeated failed validation; provider/GitHub/Notion claim lacks evidence; agent skipped reading/validation.

## Fail-closed rules
No code implementation detection in plan-only prompts; no provider claims without proof; no secrets; no destructive commands; no source-of-truth drift.

## Scoring rubric
0–5 each: reading, scope, graph, validation, evidence, `.ai` updates, safety, final report. Critical safety failure fails the run regardless of average.

## Future docs-compliance checker contract

Phase 1 may implement this as documentation first and a script only after dry-run evidence justifies it. A concrete checker, if approved, should validate:
- all `.ai/12_agents/payloads/*.md` contain the required schema headings from `26_AGENT_PAYLOAD_STANDARDIZATION_PLAN.md`;
- deprecated/non-agent payloads fail closed;
- root/tool adapters contain a `.ai` pointer and do not duplicate long policy;
- implementation prompts include mode, required reading, allowed/disallowed writes, validation, stop conditions, and final report;
- CI job name proposal: `agent-docs-compliance` in advisory mode first.

A missing checker must not be described as enforcement. Until implemented and green, enforcement is procedural/advisory only.
