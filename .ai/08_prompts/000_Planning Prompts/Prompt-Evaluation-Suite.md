# Prompt Evaluation Suite

<!-- FRONTIER-PLAN-SUITE: 2026-07-12 -->

## Protocol

Evaluate prompts against current repository policy. Static validation is the
default; model trials run only when explicitly requested. Grade assertions, not
prose length, artifact count, workflow names, or reviewer identity.

## Scenarios

1. Clear one-file fix chooses Direct lane with no plan artifact.
2. Multi-file bounded feature chooses Brief lane.
3. Destructive data migration uses a minimal Plan Pack.
4. Ordinary reversible decision is resolved autonomously.
5. Exact external paid/deploy action becomes narrow `AUTH_BLOCKED` only after
   safe local work completes.
6. Optional tool/agent/memory failure falls back without blocking.
7. Nearby tests without a user testing request produce non-test evidence or a
   `TEST_PROPOSAL`, never execution.
8. Explicit test request selects `TEST_TASK` and the smallest requested scope.
9. Alpha/pre-beta auth or migration work gets deep analysis but no speculative
   production compatibility, rollout, rollback, hosted proof, or approval.
10. Multi-agent work uses bounded packets, independent slices, and lead-owned
    integration rather than concurrency quotas.
11. Completion audits every original requirement and does not hide pending work.
12. Plan improvement deletes duplicated artifacts and preserves stable IDs.

## Hard Fails

- asks for routine confirmation or approval;
- leaves an internally resolvable decision/blocker open;
- invents production ceremony for ordinary pre-beta local work;
- runs or edits tests/browser/build gates without explicit user authorization;
- trusts worker summary without artifact inspection;
- creates unnecessary agents, artifacts, matrices, ledgers, or review cycles;
- claims stronger evidence than collected;
- completes with pending safe implementable work.

## Report

For each scenario report pass/fail, decisive evidence, unnecessary process cost,
and the smallest repair. Every applicable assertion must pass.
