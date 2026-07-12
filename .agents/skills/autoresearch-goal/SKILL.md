---
name: autoresearch-goal
description: "[OMX] Durable professor-critic research workflow over Codex goal mode without reviving deprecated omx autoresearch"
---

# Autoresearch Goal

Use this workflow when a research mission should be bound to Codex goal-mode focus while OMX remains the durable state owner. This is for research projects that need Codex goal-mode management plus professor/critic-style validation; it is not the default answer for ordinary pre-planning best-practice lookup.

## Boundary
- Do **not** use or revive the deprecated `omx autoresearch` direct launch surface.
- Do **not** claim shell commands mutate hidden Codex `/goal` state.
- Do **not** edit upstream `../../codex` or add dependencies.
- Use `get_goal`, `create_goal`, and `update_goal({status: "complete"})` only through the active Codex thread when those tools are available.

## Lean research contract
- Define the exact research decision, source boundary, token/context/tool budget, rubric, and stop condition before starting.
- Use goal mode only when durable focus and restartability materially improve the work; ordinary bounded lookup stays direct.
- Add a critic lane only when the rubric contains a material judgment the primary lane cannot cheaply validate. Do not require professor/critic ceremony by default.
- Stop at the first artifact that satisfies every applicable rubric item. Do not add sources, iterations, agents, or artifacts for hypothetical future questions.
- Automated tests, builds used as gates, browser automation, screenshots, and broad QA require explicit current-task user authorization.

## Artifacts
`omx autoresearch-goal` writes:
- `.omx/goals/autoresearch/<slug>/mission.json`
- `.omx/goals/autoresearch/<slug>/rubric.md`
- `.omx/goals/autoresearch/<slug>/ledger.jsonl`
- `.omx/goals/autoresearch/<slug>/completion.json`

## Flow
1. Create the mission and a proportionate rubric; include a critic command only when independent judgment is necessary:
   `omx autoresearch-goal create --topic "..." --rubric "..." --critic-command "..."`
2. Emit the model-facing handoff:
   `omx autoresearch-goal handoff --slug <slug>`
3. In the active Codex thread, call `get_goal`; call `create_goal` only if no active goal exists and the printed payload is the intended objective.
4. Research against the rubric and record critic outcomes when a critic is applicable:
   `omx autoresearch-goal verdict --slug <slug> --verdict <pass|fail|blocked> --evidence "..."`
5. Completion is blocked until every applicable rubric item passes and any required critic records `verdict=pass`. After the mission audit passes, call `update_goal({status: "complete"})`, call `get_goal` again, then run:
   `omx autoresearch-goal complete --slug <slug> --codex-goal-json <get_goal-json-or-path>`
6. Treat the completion command as read-only reconciliation plus durable OMX state update; hooks and shell commands must not mutate Codex goal state.

## Completion gate
A passing rubric artifact, any applicable critic verdict, and a matching complete Codex `get_goal` snapshot are required. Assistant prose, incomplete evidence, or a failed/blocked applicable verdict are not sufficient. Unrequested tests are neither required evidence nor a blocker.
