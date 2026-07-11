# Canonical Implementation Plan

**Date:** 2026-07-11
**Mode:** local agent-framework implementation
**Proof boundary:** local-only

## User Job

Improve Archestimator's coding-agent efficiency and output quality without
reducing reasoning depth, evidence quality, safety, or completion rigor.

## Scope

- Restore current-model context and native compaction defaults in Codex.
- Align role defaults with current OpenAI Sol/Terra guidance and validate the
  complete role matrix.
- Bound native delegation depth and Prometheus research fan-out by evidence
  need instead of fixed breadth.
- Make the mandatory current-state FAST PATH genuinely bounded while preserving
  the full append-only history below it.
- Remove or repair Cursor hooks that advertise behavior they do not execute,
  and reject future missing-target drift.
- Repair stale Cursor/root stack and provider guidance.
- Permit one existing focused test when it is the cheapest decisive behavior
  proof, while retaining the default no-test and broad-suite gates.
- Extend trace/evaluation guidance for tool choice, handoffs, delegation cost,
  and unnecessary calls.
- Record official-source decisions, deterministic evidence, and independent
  review.

## Non-goals

- No application feature, runtime, UI, database, migration, provider, release,
  deployment, browser, or production change.
- No dependency addition.
- No claim that local checks prove hosted or model-quality outcomes.
- No deletion of current-state history; only the read boundary may move.
- No mandatory workflow chain or unconditional multi-agent fan-out.

## Expected Files

- `AGENTS.md`
- `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md`
- `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`
- `.ai/10_state/current-state.md`
- `.ai/12_agents/README.md`
- `.ai/12_agents/codex-role-model-matrix.json`
- `.ai/13_research/2026-07-11-openai-gpt-5-6-agent-prompt-efficiency.md`
- `.ai/05_logs/2026-07-11-frontier-agent-depth-context-efficiency-implementation-run.md`
- `scripts/supermemory-memory.mjs`
- `scripts/lib/supermemory-config.mjs`
- `tests/vitest/supermemory-memory-script.test.ts`
- `tests/vitest/supermemory-start-script.test.ts`
- `.codex/config.toml`
- `.codex/agents/*.toml` only where routing changes
- `.codex/prompts/prometheus-strict-metis.md`
- `.codex/prompts/test-engineer.md`
- `.agents/skills/prometheus-strict/SKILL.md`
- `.agents/skills/ce-code-review/SKILL.md`
- `.agents/skills/ce-simplify-code/SKILL.md`
- `.cursor/hooks.json`, `.cursor/hooks/*.js`, and the small set of stale
  project-facing Cursor roles/rules
- `.ai/08_prompts/000_Planning Prompts/*` only where the shared test/evaluation
  contract changes
- `scripts/validate-ai-workflow-adapters.mjs`
- `scripts/lib/plan-pack-validator.mjs` and focused planning fixtures/tests only
  if the test-trigger enum changes
- `tests/vitest/agent-payload-contract.test.ts`,
  `tests/vitest/cursor-hook-contract.test.ts`, and
  `tests/vitest/planning-prompt-suite-contract.test.ts`
- `package.json` only for the fast/full validator split

## Work Units

| Unit | Work | Depends on | Required evidence |
|---|---|---|---|
| UNIT-001 | Current repo, adapter, configuration, and official-source audit | none | cited findings and baseline checks |
| UNIT-002 | Codex context, depth, role-routing, and bounded fan-out repair | UNIT-001 | config resolver plus role-matrix validation |
| UNIT-003 | FAST PATH, Cursor hook, and active-agent truthfulness repair | UNIT-001 | bounded-state checks plus focused hook tests |
| UNIT-004 | Cheapest-proof planning/test-gate repair | UNIT-001 | planning validator and negative fixtures |
| UNIT-005 | Drift guards, trace-eval contract, adversarial repair, and final local proof | UNIT-002..004 | deterministic validation, focused tests, and independent review |
| UNIT-006 | Auxiliary Supermemory synchronization | UNIT-005 | attempted ingestion plus truthful indexed/degraded result; never a core completion gate |

## Test Decision

- Application tests: `NOT_REQUIRED`, `test_trigger=NONE`. No application
  behavior changes.
- Adapter hook behavior: `TARGETED` only if the retained shell/session hook
  implementation changes; static inspection cannot prove block/pass semantics.
- Planning validator behavior: `TARGETED` only if the test-trigger schema or
  fail-closed parser changes; negative fixtures are then the cheapest decisive
  proof.
- Broad suites, builds, browser automation, Storybook, and provider checks are
  not selected because they cannot prove these local agent-contract claims more
  directly.

## Acceptance Criteria

1. Codex no longer carries stale manual context or compaction caps and native
   subagent depth defaults to one.
2. Risky judgment roles use the frontier model; bounded read-heavy roles use the
   approved efficient model; every role default is manifest-validated. Writer
   remains on Sol/high until representative evaluation proves a lower-cost
   default preserves output quality.
3. The mandatory FAST PATH is at most 150 lines and 16 KiB, has explicit start
   and end markers, states current Cloudflare posture, and excludes superseded
   active-provider mandates.
4. Every configured Cursor hook exists and performs its advertised behavior;
   dead wrappers are removed or unregistered, security boundaries are
   fail-closed, official payload fields are consumed, and missing delegates fail
   validation.
5. Project-facing Cursor roles cannot prescribe active Supabase/Postgres/RLS,
   Next.js 15, Vercel, unconditional TDD, browser, or reviewer activation.
6. Prometheus starts with the smallest evidence lane and expands only for a
   named unresolved evidence gap or explicitly exhaustive mode.
7. One existing focused test may be selected when it is demonstrably the
   cheapest decisive behavior proof; its tracked baseline identity, exact
   single-runner command, and unchanged source hash are machine-validated, and
   broad test gates remain unchanged.
8. Evaluation guidance grades trace/tool/delegation quality as well as final
   output, and final responses preserve conclusion, evidence, caveat, and next
   action before trimming repetition.
9. Fresh affected validators, resolver checks, selected focused tests, syntax,
   and whitespace checks pass.
10. Independent review reports no unresolved P0/P1 or material P2 finding.
11. Canonical `.ai` state retains the sanitized durable update and Supermemory
    synchronization is attempted. Indexed/searchable state is reported when it
    exists; failed or unsearchable ingestion remains visible as auxiliary
    degraded-memory evidence and cannot downgrade the core implementation.

## Source Audit

`PLAN-PACK-SCOPED-BASELINE-v1` uses this ordered, duplicate-free list of
literal repo-relative pathspecs:

1. `AGENTS.md`
2. `CLAUDE.md`
3. `CODEX.md`
4. `package.json`
5. `.agents/skills/ce-code-review/SKILL.md`
6. `.agents/skills/ce-simplify-code/SKILL.md`
7. `.agents/skills/prometheus-strict/SKILL.md`
8. `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md`
9. `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`
10. `.ai/00_system/VALIDATION_MATRIX.md`
11. `.ai/03_plans/README.md`
12. `.ai/05_logs/2026-07-11-frontier-agent-depth-context-efficiency-implementation-run.md`
13. `.ai/08_prompts/000_Planning Prompts`
14. `.ai/10_state/current-state.md`
15. `.ai/12_agents`
16. `.ai/13_research/2026-07-11-openai-gpt-5-6-agent-prompt-efficiency.md`
17. `.codex`
18. `.cursor`
19. `scripts/lib/plan-pack-validator.mjs`
20. `scripts/validate-ai-workflow-adapters.mjs`
21. `scripts/validate-planning-prompt-suite.mjs`
22. `tests/vitest/agent-payload-contract.test.ts`
23. `tests/vitest/cursor-hook-contract.test.ts`
24. `tests/vitest/planning-prompt-suite-contract.test.ts`
25. `scripts/supermemory-memory.mjs`
26. `scripts/lib/supermemory-config.mjs`
27. `tests/vitest/supermemory-memory-script.test.ts`
28. `tests/vitest/supermemory-start-script.test.ts`
29. `.ai/08_prompts/templates/codebase-ai-loop-task.md`

## Deletion Criteria

If a routing or adapter change cannot pass current resolver/contract checks, or
if independent review finds a demonstrated quality regression without a repair,
revert only that optimization and retain the validator/evidence that exposed it.

## Stop Condition

Stop as achieved when all core acceptance criteria have fresh evidence, the
plan pack is exact-hash valid, the worktree diff excludes concurrent
Teamwork-plan edits, and the independent checker has no unresolved material
finding. Preserve auxiliary sync failures as degraded capability evidence and
continue. Use `TECH_BLOCKED` only if a core requested deliverable itself remains
impossible after materially distinct implementation fallbacks. Do not claim
model-output quality from static configuration alone.
