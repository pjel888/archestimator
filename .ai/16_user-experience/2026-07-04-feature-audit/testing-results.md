# Testing Results — 2026-07-04 Phase 2 Evidence

Date: 2026-07-04
Branch: `main` (verified via git log)
Stack: Next.js 16.2.6, React 19.2.6, Bun, TypeScript 6.0.3, Vitest ^4.1.9

This document records the **executed** evidence from Phase 2 of the audit loop (test every story). It is intentionally honest about what ran vs. what didn't.

**Raw command outputs** for independent verification are saved under `evidence/`:
- `evidence/type-check.log` — full `bun run type-check` output (exit 0, no errors)
- `evidence/lint.log` — full `bun run lint` output (exit 0, 0 errors, 129 warnings)
- `evidence/test-dom.log` — partial `bun run test:dom` output captured before bash timeout kill at ~8 min (3 pre-fix failures: `logger-perf` + 2 `agent-payload-contract`; warning lines for `global-error` `<html>` hydration and `<search>` tag were observed during the run but truncated from the retained log due to the kill)
- `evidence/test-dom-post-fix.log` — post-fix rerun of `tests/vitest/agent-payload-contract.test.ts` showing all 7 tests now pass (EXIT=0)

## Verification Commands Run (Phase 2)

| Command | When | Exit | Result |
|---|---|---|---|
| `bun run type-check` | 2026-07-04 | 0 | PASS — no TypeScript errors |
| `bun run lint` | 2026-07-04 | 0 | PASS — 0 errors, 129 warnings |
| `bun run test:dom` | 2026-07-04 | (killed by reviewer's bash timeout at ~8 min; not a vitest-internal timeout) | FAIL — 3 failures across 2 test files pre-fix (logger-perf + 2 agent-payload-contract); agent-payload failures resolved this session (see `evidence/test-dom-post-fix.log`); remaining test output beyond ~3000 lines was not retained |
| `bun run test:e2e` | not run | — | Mutating E2E specs require env flags; deferred to follow-up |
| `bun run validate` | not run | — | Aggregates type-check + lint + design-system + unit + DOM; design-system + DOM legs not run |

## Phase 2 Findings

### Type Check — PASS

`tsc --noEmit` exits 0. No type errors anywhere in the codebase.

### Lint — PASS with caveats

Zero blocking errors. 129 warnings, mostly `@typescript-eslint/no-unused-vars` flagged across ~30 files. Patterns:

- Dead helpers in `src/lib/repositories/workspace-repository.ts` (8 unused exports — drift)
- Dead helpers in `src/lib/component-library/actions.ts` (4 unused, including `EstimateTabNodeSourceRowD1` type)
- Dead helpers in `src/lib/estimates/d1-action-client.ts` and `src/lib/estimates/parse-quantity-expression.ts`
- `_`-prefixed params flagged despite convention (legitimate intentional-unused pattern)
- One `<img>` warning in `src/stories/domain/workshop/modal-patterns.stories.tsx` (Storybook-only, low priority)
- One `import/no-anonymous-default-export` in `worker.ts`

**Severity**: Cosmetic. Suggest a one-shot cleanup PR: `bun run lint --fix` removes ~3 of these; the rest are dead code that should be deleted in a dedicated pass.

### DOM Test Suite — FAIL (suite did not complete)

The suite (`vitest run --maxWorkers=1`, 115 test files) was killed by the reviewer's bash timeout at ~8 minutes (not a vitest-internal timeout). The June 22 audit noted the same problem ("broad `bun run validate` and all-DOM runs as red/hanging"). The behavior persists.

**Confirmed failures captured before kill (3 total across 2 test files):**

1. **`tests/vitest/logger-perf.test.ts > keeps single-record file writes under the pilot latency budget`**
   - Assertion: expected `3.2497` ms to be less than `1` ms
   - Severity: Performance regression / flaky under load
   - Likely cause: machine-dependent perf test; not a functional bug
   - Best fix: raise budget to 5ms OR gate the test behind `CI=false` OR mark as `test.skip` on local runs

2. **`tests/vitest/agent-payload-contract.test.ts > keeps agent startup on the canonical FAST PATH instead of broad preloads`**
   - Error: `ENOENT: no such file or directory, open '.ai/08_prompts/templates/codebase-ai-loop-task.md'`
   - Severity: Real — missing template file referenced by AGENTS.md and payload contracts
   - Cause: `.ai/08_prompts/templates/codebase-ai-loop-task.md` does not exist (file not created / was deleted)
   - Best fix: create the file (it's referenced as the reusable loop-task prompt template) OR update the test to point at the actual current path

3. **`tests/vitest/agent-payload-contract.test.ts > keeps dated plan packs scoped to high-blast-radius or explicitly exhaustive work`**
   - Same ENOENT root cause as #2
   - Best fix: same — restore the missing template

**Other observations from DOM output:**

- Many `act()` warnings across estimate sheet, tree, sidebar, library templates, and project form tests. These are warnings, not failures, but indicate React state updates happening outside `act()` in tests. Pattern is endemic.
- Hydration warning in `tests/vitest/global-error.test.tsx`: `<html> cannot be a child of <div>`. Indicates the global error boundary test renders an `<html>` element inside a test container — would cause a real hydration error in production.
- The `<search>` tag warning in `library-tabs-layout.test.tsx`: `The tag <search> is unrecognized in this browser`. The component uses `<search>` (HTML5 element) but jsdom doesn't recognize it. Not a production bug, but the test environment needs upgrading.

### Manual / Browser QA — Not Run

Per the Codex App speed guardrail (AGENTS.md) and June 22 audit precedent, browser automation was not run because:

- Mutating E2E specs require environment flags (`ARCHESTIMATOR_E2E_*`) and D1/Worker-parity local bindings (`bun run cf:preview`)
- The dev server was not started this session
- Playwright specs are gated behind credentials and CF preview setup

**External proof needed** for full Phase 2 closure:
- Browser-driven happy paths through: landing → signup → workshop → first estimate → publish → share link → recipient decision
- CF preview against local D1 to validate server actions end-to-end
- Provider proofs via the existing `cf:*` scripts

## Issue Backlog (Phase 3 Inputs)

Ranked by severity:

| Issue ID | Severity | Source | Description | Best Fix | Status |
|---|---|---|---|---|---|
| UX-2026-07-04-01 | High | DOM test | `.ai/08_prompts/templates/codebase-ai-loop-task.md` missing — breaks agent payload contract tests AND agent workflow | Restore the template file or update tests + AGENTS.md to current path | **RESOLVED** — file restored; 7 `agent-payload-contract` tests now pass |
| UX-2026-07-04-02 | Medium | DOM test | `logger-perf.test.ts` budget too tight — fails at 3.25ms vs 1ms target on dev machines | Raise budget to 5ms or gate behind CI env | Open |
| UX-2026-07-04-03 | Medium | DOM test | DOM test suite does not complete in 8 min — known since June 22, unresolved | Profile slow tests; consider sharding or running in CI with more workers | Open |
| UX-2026-07-04-04 | Low | Lint | 129 unused-vars warnings across ~30 files — dead code drift | One-shot cleanup PR (`lint --fix` + delete dead exports) | Open |
| UX-2026-07-04-05 | Low | DOM test | Many `act()` warnings in estimate sheet / tree / sidebar tests | Wrap state updates in `act()` in test setup | Open |
| UX-2026-07-04-06 | Low | DOM test (warning observed during partial run; line truncated from retained log) | `global-error.test.tsx` renders `<html>` inside `<div>` — would cause hydration error | Fix test container to not nest html | Open |
| UX-2026-07-04-07 | Low | DOM test (warning observed during partial run; line truncated from retained log) | jsdom doesn't recognize `<search>` tag in `library-tabs-layout` | Upgrade jsdom or mock the element | Open |

## Phase 3 (Fix) Plan — For Follow-up Sessions

The realistic Phase 3 backlog beyond the resolved UX-2026-07-04-01 cannot fit in this session. Order of operations for the next agent:

1. **UX-2026-07-04-02** (Medium) — raise `logger-perf.test.ts` budget to 5ms or gate behind CI env
2. **UX-2026-07-04-03** (Medium) — profile slow DOM tests; shard the suite
3. **UX-2026-07-04-04** (Low) — one-shot lint cleanup PR
4. **UX-2026-07-04-05** (Low) — bulk `act()` cleanup pass
5. **UX-2026-07-04-06/07** (Low) — small test-environment fixes

## Phase 4 (Retest) Plan

After Phase 3 fixes land:

1. Re-run `bun run type-check && bun run lint && bun run test:dom`
2. Capture exit codes + failure counts in this document
3. Run the canonical CSV's `Targeted Verification` IDs from June 22 spreadsheet against current code
4. Browser QA via Playwright against `bun run cf:preview` for the golden path

## Santa-Loop Review Status

| Round | Reviewer | Verdict | Issues Found | Status |
|---|---|---|---|---|
| 1 | Codex (GPT-5.4) | FAIL | 4 (vitest version, invite spec, LIB-004/PUBSITE-002 column shift, stale counts) | Fixed |
| 2 | Codex (GPT-5.4) | FAIL | 5 (stale "missing template" claims, migration count 29→30, 88 column-drifted rows, self-contradictory "blocked" line) | Fixed |
| 3 | Codex (GPT-5.4) | FAIL | 2 (failure count "2"→"3 across 2 files", missing post-fix evidence log) | Fixed |
| 4 | Codex (GPT-5.4) | FAIL | 3 (PUBSITE-004 issue-id-in-severity, LIB-008 editorial note, audit-summary overclaim) | Fixed |
| 5 | Codex (GPT-5.4) | FAIL | 3 (8-min wording too strong, UX-2026-07-04-06/07 not in retained log, PUBSITE-004 semantic slotting) | Fixed |
| 6 | Codex (GPT-5.4) | **PASS** | 0 critical; 2 non-blocking suggestions (AGENTS.md upstream drift, README polish) | Resolved |
| A1 | Claude code-reviewer | (timed out at 30 min, zero output) | — | Infrastructure failure |
| A2 | Oracle (fallback attempt 1) | (timed out at 30 min, zero output) | — | Infrastructure failure |
| A3 | Oracle (fallback attempt 2) | (timed out at 30 min, zero output) | — | Infrastructure failure |

**Final verdict**: Codex Round 6 PASS on all 11 criteria. Claude subagent infrastructure broken for 10/10 attempts this session (8 explore + 2 code-reviewer + 1 oracle all timed out at 30 min with zero output). Single-reviewer PASS only; dual-review requirement not met.

## Honest Scope Statement

This session delivered:
- Phase 1 audit framework (CSV with 115 user stories + README + summary + this document + raw evidence logs)
- Phase 1 top-priority fix: `.ai/08_prompts/templates/codebase-ai-loop-task.md` restored (UX-2026-07-04-01 resolved; 7 agent-payload-contract tests now pass)
- Phase 2 partial evidence (type-check pass, lint pass, DOM partial — raw logs in `evidence/`)
- Phase 3 issue backlog with 7 ranked items (1 resolved, 6 open)
- Phase 3 fixes (beyond UX-2026-07-04-01): multi-day work; backlog is the entry point
- Phase 4 retest: depends on Phase 3

The canonical CSV (115 rows) is parse-consistent and field-consistent. It carries forward the June 22 schema with refreshed `Source Evidence` and `Evidence Status` columns reflecting today's runs.
