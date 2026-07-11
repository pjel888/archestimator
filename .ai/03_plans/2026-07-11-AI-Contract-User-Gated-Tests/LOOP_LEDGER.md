# Loop Ledger

## Goal

Stop every coding agent (Codex, Claude, Cursor, ZCode, OpenCode, CommandCode,
Windsurf, etc.) from automatically creating or running tests. The ONLY trigger
for creating/running tests is an explicit user request. Otherwise agents use
cheap non-test verification and, if a risky surface was touched, **propose**
tests and **wait** for authorization.

## Scope

Rewrite the AI agent contract across all instruction surfaces so the **User
Test Authorization Gate** is the supreme rule: no agent may create, expand,
repair, or run any automated test, test suite, build-as-test-gate, browser
automation, or broad validation gate unless the user has explicitly requested
testing for the current task.

## Non-goals

- Do not change the `test_requirement` enum values in the plan-pack JSON schema
  (keeps validators valid).
- Do not change any source code, migrations, or actual tests.
- Do not remove the deterministic contract gates (`validate:agents`,
  `validate:planning-prompts`, `type-check`, `lint`) — those are not application
  tests.

## Root cause

The previous contract defaulted to `NOT_REQUIRED` but granted every agent
self-authorization loopholes: any agent could decide a change was
"MVP-critical" (auth, D1, estimate/proposal correctness, release/observability,
concurrency) and run tests on its own. Since Archestimator IS an
estimating/auth/D1 app, nearly every change qualified, so agents
self-justified auto-testing constantly. `.cursorrules` even mandated TDD;
`.gemini/GEMINI.md` said "prefer test-first."

## The new rule (canonical wording)

> **User Test Authorization Gate.** Do not create, expand, repair, or run any
> automated test, test suite, build-as-test-gate, browser automation, or broad
> validation gate unless the user has explicitly requested testing for the
> current task. This OVERRIDES every other `test_requirement`, `TARGETED`,
> `MVP-critical`, blast-radius, or "nearby tests exist" consideration. If you
> believe tests are warranted, do NOT run them: record a `TEST_PROPOSAL` (named
> risk + exact command) and await explicit user authorization. Non-test
> verification remains the default and is encouraged. `TEST_TASK` is the only
> decision that authorizes test execution, and it requires an explicit user
> request.

## Branch / Status

- **Branch:** `main` (no branch created — agent-contract change committed
  directly per shared-worktree policy).
- **Status:** implementation complete; verification in progress.

## Files changed

### Tier 1 — Policy authors
- `.ai/00_system/VALIDATION_MATRIX.md` — added User Test Authorization Gate as
  supreme rule; rewrote Governing Rule, Fast Selection, Broad Gates, Loop And
  Completion.
- `.ai/00_system/AGENT_OPERATING_PROTOCOL.md` — rewrote Verification And Test
  Gate section.
- `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md` — rewrote Shared Test Decision.
- `AGENTS.md` — rewrote inline verification bullet + Verification Policy
  section.

### Tier 2 — Root entry-point adapters
- `CLAUDE.md` — verification paragraph.
- `CODEX.md` — verification paragraph.
- `.cursorrules` — removed TDD mandate; aligned Validation + Forbidden sections.
- `.cursor/rules/00-archestimator-project-brain.mdc` — Evidence And Stop
  Condition block.
- `.cursor/rules/17-testing-discipline.mdc` — activation gate now requires
  explicit user authorization; removed self-authorization triggers.
- `.commandcode/README.md` — verification paragraph.
- `.ai/12_agents/README.md` + `.ai/12_agents/payloads/README.md` — test-gate
  paragraph.

### Tier 2 — Payloads + protocols
- `.ai/12_agents/payloads/{claude,codex,commandcode,opencode,antigravity,kimi,deepseek,_template}.md`
  — validation rules section (8 files).
- `.ai/00_system/AGENT_SELF_DIAGNOSTIC_PROTOCOL.md` — test-decision reference.
- `.ai/08_prompts/templates/codebase-ai-loop-task.md` — verification and test
  decision section.

### Tier 3 — Planning prompts (10 files)
- `Frontier-Planning-Kernel.md` — test decision section.
- `Frontier-Applicability-Gates.md` — GATE-VERIFY-01.
- `Plan-Pack-Schema.md` — section H (additive; preserved validator-pinned
  literals).
- `Creating-Plan-Prompt.md` — test classification phase.
- `Create-Implementation-Prompt.md` — test decision guidance.
- `Executing-Plan-Prompt.md` — criterion confirmation + Phase 6 reconciliation +
  Phase 4 test discovery.
- `Multi-Agent-Execution-Directive.md` — worker packet + adversarial QA.
- `Improve-Plan-Prompt.md` — execution DAG test guidance.
- `Prompt-Evaluation-Suite.md` — EVAL-03 + EVAL-32 expectations.

### Tier 4 — CommandCode sentinels (16 files)
- `.commandcode/agents/*.md` — all 16 sentinels updated.

### Tier 5 — Conflicting test-first language
- `.gemini/GEMINI.md` — removed "Prefer test-first"; aligned verification line.

### Tier 6 — Durable records
- `.ai/10_state/decisions.md` — added 2026-07-11 decision entry.
- `.ai/10_state/current-state.md` — updated FAST PATH verification summary.
- This `LOOP_LEDGER.md`.

## Validation evidence

- `bun run validate:planning-prompts`: PASSED (10 documents, 10 gates, 34 eval
  scenarios, 2784 lines, semantic fixture valid).
- `bun run validate:agents`: pending run.
- `rg` audit for residual self-authorize/TDD/prefer-test-first language:
  pending.
- `git diff --check`: pending.

## Next

Run `validate:agents`, the `rg` residual-language audit, and `git diff --check`.
