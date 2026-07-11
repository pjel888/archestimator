# Implementation Plan

## Contract

Use one four-state test decision in planning and execution:

- `NOT_REQUIRED` - default; do not create or run tests.
- `TARGETED` - the smallest test that proves a named critical invariant.
- `BROADER` - an integrated suite is necessary because targeted evidence
  cannot cover the critical boundary.
- `TEST_TASK` - testing, QA, coverage, reproduction, or regression proof is the
  requested deliverable.

Every criterion also records `test_trigger` as `NONE`,
`EXPLICIT_TEST_TASK`, or `MVP_CRITICAL_INVARIANT`, plus a substantive
`test_rationale`. `BROADER` must explain why targeted evidence is insufficient.

Verification never becomes optional. For `NOT_REQUIRED`, use the cheapest
decisive evidence: current-source inspection, focused diff/path/reference
checks, relevant static/type/lint checks, dry runs, or a narrow runtime smoke
only when the claim requires it.

## Test Triggers

Tests are allowed when explicitly requested, when the task itself is testing,
or when an MVP-critical invariant is exposed and cheaper evidence is
insufficient. Critical surfaces include auth/security/session/public access,
D1 schema or data integrity, estimate/money/proposal correctness, first-user
release/rollback/observability paths, and concurrency or shared contracts whose
failure could leak, corrupt, deny access, or materially misstate results.

Being a source edit, multi-file, user-visible, or adjacent to existing tests is
not a test trigger. Broad tests, builds, browser automation, Storybook, and
manual QA need an explicit or integrated critical claim.

## Work Units

| Unit | Scope | Owner | Depends on | Proof |
|---|---|---|---|---|
| U-01 | Repo/stack/policy inventory | explore lanes + lead | none | source map |
| U-02 | Official OpenAI guidance | researcher lane | none | cited research note |
| U-03 | Canonical protocols and root contract | lead | U-01, U-02 | focused diff/static checks |
| U-04 | Agent adapters and payloads | executor lane | U-03 contract | adapter resolver checks |
| U-05 | Planning suite and validators | lead | U-01, U-02 | prompt-suite validator |
| U-06 | Independent adversarial review and repair | verifier/reviewer | U-03..U-05 | findings ledger |
| U-07 | State, run log, and Supermemory closeout | lead | U-06 | durable receipts |

## Source Audit

`PLAN-PACK-SCOPED-BASELINE-v1` uses this ordered, duplicate-free list of
literal repo-relative pathspecs:

1. `AGENTS.md`
2. `CLAUDE.md`
3. `CODEX.md`
4. `.codex/config.toml`
5. `.codex/agents`
6. `.codex/prompts`
7. `.commandcode/README.md`
8. `.commandcode/agents`
9. `.commandcode/taste/taste.md`
10. `.commandcode/workflow/taste.md`
11. `.cursor/rules/02-validation-and-evidence.mdc`
12. `.cursor/rules/17-testing-discipline.mdc`
13. `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md`
14. `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`
15. `.ai/00_system/AGENT_SELF_DIAGNOSTIC_PROTOCOL.md`
16. `.ai/00_system/VALIDATION_MATRIX.md`
17. `.ai/03_plans/README.md`
18. `.ai/05_logs/2026-07-11-agent-contract-speed-and-test-gate-implementation-run.md`
19. `.ai/08_prompts/000_Planning Prompts`
20. `.ai/08_prompts/templates/codebase-ai-loop-task.md`
21. `.ai/10_state/current-state.md`
22. `.ai/12_agents/README.md`
23. `.ai/12_agents/payloads`
24. `.ai/13_research/2026-07-11-openai-gpt-5-6-agent-prompt-efficiency.md`
25. `scripts/lib/plan-pack-validator.mjs`
26. `scripts/neutralize-graph-mandate.mjs`
27. `scripts/validate-ai-workflow-adapters.mjs`
28. `scripts/validate-planning-prompt-suite.mjs`
29. `tests/fixtures/planning-prompt-suite/valid-plan-pack/plan-pack.json`
30. `tests/vitest/planning-prompt-suite-contract.test.ts`

## Stop Condition

Stop when all active agent surfaces use the same test decision, the planning
schema and validator permit no-test criteria, affected deterministic checks
pass, independent review has no unresolved material finding, and durable state
is recorded. Do not run application tests merely because policy files changed.

## Completion

U-01 through U-07 are complete. The first independent verifier found missing
manifest and validator-trigger enforcement plus two durable adapter-guard gaps;
all were repaired before the final replay. Evidence is recorded in
`evidence/validation-summary.md` and the implementation run log.
