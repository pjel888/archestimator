---
name: autopilot
description: "[OMX] Adaptive autonomous delivery router: use only the phases that materially help the current task"
---

# Autopilot

## Purpose

Autopilot delivers a requested outcome hands-off while staying lean. It is a
phase router, not a mandate to run every available workflow. Preserve the full
objective, map the evidence-supported direct/transitive blast radius, choose the
smallest coherent implementation, and use only phases that change a decision,
reduce elapsed time, or prove a required claim.

Tokens, context, elapsed time, tool calls, artifacts, agent fan-out, handoffs,
and repeated review are engineering costs. Availability is never a quota.

## Activation

Use Autopilot when the user explicitly asks for hands-off implementation of a
feature, fix, or concrete deliverable. Do not infer Autopilot from ordinary
phrases in Codex App/plain sessions when OMX runtime is unavailable; use direct
execution or native subagents instead.

Do not use Autopilot for explanation-only, brainstorming-only, review-only, or a
single bounded edit that one executor can finish more cheaply.

## Lean Phase Router

Evaluate each phase independently and record only selected phases plus a short
reason. Skipped phases are normal and do not need placeholder artifacts.

1. **Direct execution** — default for clear, bounded, reversible work.
2. **Deep interview** — use only when unresolved intent or boundaries would
   materially change the implementation. Stop questioning as soon as execution
   is safe and clear.
3. **Ralplan** — use only when architecture, material tradeoffs, sequencing, or
   high-blast-radius planning needs consensus. Do not require PRD/test-spec files
   for routine work.
4. **Ultragoal** — use only when durable goal state, checkpoints, or resume across
   multiple stories materially helps. Otherwise execute directly or use
   Ultrawork for bounded parallel work.
5. **Team** — use only for genuinely independent lanes whose throughput/coverage
   gain exceeds coordination cost.
6. **Code review** — add a separate review lane only when the diff or named risk
   materially benefits from independent challenge. Routine bounded work may use
   a fresh lead self-check plus deterministic evidence.
7. **UltraQA** — run only when the user explicitly requests testing, QA, E2E, or
   browser proof for the current task. Risk, criticality, nearby tests, a plan,
   or another workflow cannot authorize it.

Typical lean routes:

```text
clear bounded task: direct execute -> focused non-test evidence
independent slices: direct execute + ultrawork -> focused evidence
durable multi-story task: ralplan only if needed -> ultragoal
explicit QA task: implementation route -> optional review -> ultraqa
```

## Test Authorization

Follow Archestimator's supreme User Test Authorization Gate:

- Default to `NOT_REQUIRED` and the cheapest decisive source, diff, reference,
  type/LSP, lint, dry-run, resolver, provider-readback, or narrow runtime
  evidence.
- Only an explicit current-task user request maps to `TEST_TASK` and authorizes
  test creation, repair, execution, builds-as-gates, browser automation, or
  UltraQA.
- `TARGETED`, `BROADER`, `MVP_CRITICAL_INVARIANT`, and
  `CHEAPEST_DECISIVE_EXISTING_TEST` may create a `TEST_PROPOSAL` only.
- TDD runs only when the user explicitly asks for TDD.

## Execution Loop

1. Define outcome, constraints, non-goals, evidence class, and stop condition.
2. Map reachable callers/importers, contracts, state/data, failure/recovery
   paths, and rollout boundaries. Do not invent hypothetical surfaces.
3. Select the minimum phase set and minimum useful concurrency.
4. Implement the next smallest coherent slice using current patterns.
5. Run the narrowest authorized evidence that proves the changed claim.
6. Repair a concrete failure at its owning slice. Do not automatically restart
   planning or repeat the entire pipeline.
7. Record only durable decisions/evidence needed for resume or project truth.
8. Stop when the requested outcome is complete, required claims are grounded,
   no in-scope work remains, and any external boundary is reported precisely.

## State

When OMX state is useful, persist a compact state record:

```json
{
  "mode": "autopilot",
  "active": true,
  "current_phase": "execute",
  "selected_phases": ["execute"],
  "skipped_phases": {
    "deep-interview": "requirements already clear",
    "ralplan": "bounded implementation",
    "code-review": "routine narrow diff",
    "ultraqa": "no explicit user testing request"
  },
  "next_action": "implement smallest ready slice",
  "stop_condition": "requested result grounded by authorized evidence"
}
```

Use `omx state ... --json` when the runtime is active. Do not create state or
handoff artifacts merely to satisfy a phase list. On `continue`/`resume`, read
the current state and resume `next_action`; do not restart discovery.

## Recovery And Stop

- On a failed check, change the smallest responsible implementation or evidence
  tactic; widen planning only when the failure exposes a real design gap.
- After repeated identical failures, change hypothesis/tool/decomposition rather
  than looping ceremonially.
- Ask only for destructive, credential-gated, paid, external-production, or
  materially branching decisions.
- Preserve shared-worktree changes and clean only resources created by this run.
- Mark complete from actual artifacts and fresh authorized evidence, not workflow
  names, phase count, reviewer identity, or a single green check.

## Final Report

Report the outcome, selected/skipped phases, changed files/systems, decisive
evidence, explicit test authorization status, remaining boundaries/risks, and
stop condition. Keep it concise.
