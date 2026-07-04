# Goal: Make Loop Engineering the Default Repo-Level Mandate for Non-Trivial Archestimator AI Coding Work

You are working in the `pjel888/archestimator` repository.

## Mission

Update the Archestimator codebase AI mandate so future coding agents default to bounded loop engineering for non-trivial work.

This must become persistent repo behavior through the project’s agent instruction files and `.ai` governance docs. Do not merely say you will follow the loop in chat. Edit the repo-level mandate so future agents are instructed to use it.

Non-trivial work includes feature implementation, plan implementation, broad refactors, database/auth/security work, performance work, UI/workshop changes, provider-facing work, release-readiness work, and unclear debugging.

Do not make loops mandatory for trivial work. Simple typos, one-line reversible fixes, narrow lookups, formatting, and small docs cleanup may still use direct execution with proportional verification.

The goal is not infinite looping. The goal is bounded iteration:

DISCOVER → PLAN → EXECUTE → VERIFY → RECORD → DECIDE → repeat until proven pass, real blocker, owner decision, approval gate, or iteration cap.

---

## Required Starting Context

Before editing, inspect and reconcile these files:

1. `AGENTS.md`
2. `.ai/README.md`
3. `.ai/00_system/DOCS_SOURCE_OF_TRUTH.md`
4. `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`
5. `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md`
6. `.ai/00_system/VALIDATION_MATRIX.md`
7. `.ai/10_state/current-state.md`
8. `.ai/10_state/decisions.md`
9. `.ai/12_agents/README.md`
10. `CODEX.md`
11. `CLAUDE.md`
12. `DESIGN.md`

Also inspect these folders when relevant:

- `.ai/08_prompts/`
- `.ai/08_prompts/templates/`
- `.ai/11_skills/`
- `.ai/12_agents/payloads/`
- `.codex/`
- `.claude/`
- `.agents/`

Do not create a parallel instruction system. `.ai/00_system` remains the authority. Tool-specific files must only point back to the shared mandate.

---

## Required Implementation Scope

Make the smallest coherent repo edits needed to make loop engineering the default for non-trivial work.

Expected target files:

- `AGENTS.md`
- `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`
- `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md`
- `.ai/00_system/DOCS_SOURCE_OF_TRUTH.md`
- `.ai/00_system/VALIDATION_MATRIX.md`
- `.ai/08_prompts/templates/codebase-ai-loop-task.md`
- `.ai/12_agents/README.md`
- `CODEX.md`
- `CLAUDE.md`

Only edit additional adapter files if they conflict with the shared mandate, contain stale instructions, or fail to point back to `.ai/00_system`.

Important seed check: verify whether `CODEX.md` still contains stale stack language such as “local-first JSON data” or “future Supabase/Postgres migration.” If stale, correct it to the current Supabase/Postgres MVP reality and make `CODEX.md` subordinate to `AGENTS.md` and `.ai/00_system`.

---

## Required Mandate Language

Add or strengthen a rule with this meaning:

For non-trivial Archestimator work, loop engineering is the default execution contract. The agent must discover current repo truth, create or update a dated plan pack, execute through bounded iterations, verify with evidence, persist state outside chat, and decide the next iteration until a proven stop condition is reached.

The mandate must define all sections below.

---

## 1. Loop Activation Criteria

A loop is required when the task involves any of these:

- feature implementation;
- implementation of an existing `.ai/03_plans` plan;
- multi-file source changes;
- shared components;
- shared hooks;
- shared libraries;
- server actions;
- repositories;
- API routes;
- database work;
- Supabase work;
- RLS;
- RPCs;
- migrations;
- generated types;
- auth;
- invites;
- publication/shared links;
- provider-facing behavior;
- app/workshop UI;
- design-system-sensitive UI;
- route behavior;
- browser behavior;
- proposal/export behavior;
- performance work;
- unclear debugging/root-cause analysis;
- security;
- launch readiness;
- release work;
- CI/CD;
- validation framework work;
- codebase-wide audits;
- codebase-wide refactors;
- agent-framework changes;
- prompt changes;
- payload changes;
- orchestration/workflow changes.

A loop is not required for:

- trivial typo fixes;
- narrow docs cleanup that does not alter policy;
- simple file lookup or explanation;
- one-line reversible local fixes;
- bounded formatting changes;
- direct answers with no repo mutation.

Even when a loop is not required, agents must still verify proportionally and avoid false completion claims.

---

## 2. Mandatory Loop Shape

For non-trivial work, require this loop:

```txt
DISCOVER current repo truth
→ PLAN in .ai/03_plans/<YYYY-MM-DD>-<slug>/
→ EXECUTE the next smallest coherent change
→ VERIFY with the narrowest evidence that proves the changed behavior
→ RECORD evidence, proof boundary, gaps, and next decision
→ DECIDE whether to iterate, stop, or escalate
```

The loop must continue until one of these stop conditions is reached:

```txt
1. Proven pass against the acceptance criteria
2. Explicit blocker with evidence
3. Owner decision required
4. Destructive / paid / production / cross-provider action requires fresh approval
5. Iteration cap reached with remaining risks recorded
```

Default iteration cap: 3–6 meaningful iterations unless the task explicitly defines a different cap.

Never loop endlessly. Never stop after a worker self-report, a plan document, or one green check unless the whole requested outcome is proven.

---

## 3. Required Durable Artifacts

For non-trivial implementation work, require:

```txt
.ai/03_plans/<YYYY-MM-DD>-<task-slug>/
.ai/03_plans/<YYYY-MM-DD>-<task-slug>/LOOP_LEDGER.md
```

For major, risky, multi-agent, provider-facing, release, database, security, or agent-framework work, also require:

```txt
.ai/05_logs/<YYYY-MM-DD>-<task-slug>-implementation-run.md
```

For uncertain external, product, technical, dependency, pricing, regulation, construction-cost, code, labor, or materials claims, require:

```txt
.ai/13_research/<YYYY-MM-DD>-<research-topic>.md
```

Do not use chat history as durable memory.

---

## 4. Loop Ledger Contract

Create or reference a reusable `LOOP_LEDGER.md` structure.

Minimum required sections:

```md
# Loop Ledger

## Goal

## Scope

## Non-goals

## Branch / Status

## Source of Truth Read

## Acceptance Criteria

## Validation Plan

## Iteration Log

### Iteration 1
- Hypothesis:
- Action:
- Files changed:
- Evidence:
- Result:
- Next decision:

### Iteration 2
- Hypothesis:
- Action:
- Files changed:
- Evidence:
- Result:
- Next decision:

### Iteration 3
- Hypothesis:
- Action:
- Files changed:
- Evidence:
- Result:
- Next decision:

## Stop Condition

## Proof Boundary

## Remaining Risks

## Follow-up Bugs / Plans
```

The ledger must be updated during the work, not reconstructed vaguely at the end.

---

## 5. Maker / Checker Rule

For non-trivial work, add or strengthen this rule:

- the agent that implements must not treat its own edits as final without review;
- use a separate review lane, adversarial self-review, targeted test, code-review graph/GitNexus impact check, or equivalent checker surface when practical;
- the lead agent owns final integration and evidence;
- worker success, passing one test, or completing one iteration is not final completion;
- maker/checker separation is expected when risk, breadth, or user-visible impact justifies it.

---

## 6. Real-Surface Evidence Rule

Require proof surface to match the claim:

- code behavior → focused tests, type checks, lint, and build when justified;
- minor cosmetic UI edits (spacing, copy, color, icon, class-only tweaks) → static review, focused
  type/LSP/lint, or nearby component/unit checks when adequate; do not run Playwright just because
  the edit is visible;
- UI interaction/routing/auth/data/responsive-layout/a11y/complex-composition behavior →
  targeted browser/manual/Playwright proof when that proof is needed for the claim;
- Supabase/Postgres behavior → migration status, SQL/RPC/RLS proof, generated types where relevant;
- provider claims → provider evidence, not local-only checks;
- docs-only mandate changes → path checks and `git diff --check`.

Agents must label proof precisely:

```txt
local-only
provider-proven
browser-proven
manual-proof-pending
not-verified
```

Never call local-only checks provider proof. Never claim completion from intent.

---

## 7. Proportionality Rule

Do not make the workflow heavy by default.

The mandate must say:

- loops are mandatory for non-trivial work;
- validation remains proportional to risk;
- broad `bun run validate`, full build, full E2E, Storybook, Playwright/browser automation, visual QA, provider proof, or multi-agent orchestration should be used only when blast radius justifies it;
- narrow reversible changes use focused checks;
- the loop exists to increase speed, quality, and memory, not to create ceremony.

---

## 8. Agent-Neutral Enforcement

Make it explicit that the mandate applies to all coding agents and adapters, including:

```txt
Codex
Claude
OpenCode
CommandCode
Antigravity CLI / agy
Kimi
DeepSeek
Hermes if approved
future codebase agents
```

Tool-specific files may translate the mandate, but they must not fork it, weaken it, or create separate policy.

Adapters should be short. They should point to `AGENTS.md` and `.ai/00_system`, not duplicate the full policy.

---

## 9. Add a Reusable Prompt Template

Create this file if it does not already exist:

```txt
.ai/08_prompts/templates/codebase-ai-loop-task.md
```

The template must be a reusable prompt Philip can paste before future serious tasks.

It should contain this kind of copyable task prefix:

```md
# Archestimator Non-Trivial Work Loop Prompt

Use the Archestimator non-trivial work loop.

## Task

<task>

## Mode

<implementation | plan-only | review | debug | provider-proof | release | recovery>

## Required Behavior

1. Read `AGENTS.md` and the `.ai/00_system` source-of-truth chain.
2. Decide whether this task is trivial or non-trivial.
3. If trivial, use the narrowest direct path and proportional verification.
4. If non-trivial, create or update a dated `.ai/03_plans/<YYYY-MM-DD>-<slug>/` plan pack.
5. Create or update `LOOP_LEDGER.md`.
6. Run bounded iterations:
   - discover;
   - plan;
   - execute;
   - verify;
   - record;
   - decide next iteration.
7. Stop only on proven pass, explicit blocker, owner decision, approval-gated action, or iteration cap.
8. Final report must include:
   - files changed;
   - evidence;
   - proof boundary;
   - validation gaps;
   - remaining risks.

Do not claim completion from intent.
Do not use chat as durable memory.
Do not mutate provider/GitHub/Notion/production/destructive surfaces unless explicitly authorized.
```

---

## 10. Adapter Updates

Update `CODEX.md`, `CLAUDE.md`, and any lightweight adapter docs so they say:

- read `AGENTS.md`;
- use `.ai/00_system` as authority;
- use `.ai/` as the shared project brain;
- for non-trivial work, follow the loop-engineering mandate;
- do not duplicate the full policy in adapter files;
- do not maintain separate tool-specific brains.

Keep adapter docs short.

Correct stale adapter claims when found.

---

## Required Execution Loop for This Task

You must perform this mandate-editing task itself through a bounded loop.

Create or update:

```txt
.ai/03_plans/<YYYY-MM-DD>-loop-engineering-default-mandate/
.ai/03_plans/<YYYY-MM-DD>-loop-engineering-default-mandate/LOOP_LEDGER.md
```

Use the current local date from the environment.

Run at least three meaningful iterations unless the first two iterations prove all acceptance criteria and no contradictions remain.

Minimum required iterations:

### Iteration 1 — Source-of-Truth Audit

Audit current mandate files for:

- loop rules already present;
- contradictions;
- missing trigger criteria;
- stale adapter language;
- duplicated policy;
- missing template references;
- missing proof-boundary language;
- missing proportionality language.

Record findings in the loop ledger.

### Iteration 2 — Mandate Patch

Patch the canonical `.ai/00_system` docs, `AGENTS.md`, adapter docs, and prompt template.

Record files changed and rationale in the loop ledger.

### Iteration 3 — Contradiction / Enforcement Review

Re-read the changed files and check:

- no conflicting instruction remains;
- simple tasks are not overburdened;
- non-trivial tasks clearly trigger loops;
- stop conditions are bounded;
- adapter files point to the canonical system;
- validation remains proportional;
- CODEX.md no longer contains stale stack claims;
- reusable prompt template is discoverable from source-of-truth docs.

Patch any defects found.

Additional iterations are required if contradictions, stale claims, missing references, or validation failures remain.

---

## Validation Requirements

Since this is docs/governance work, run the narrowest meaningful checks:

```bash
git status --short --branch
git diff --check
```

Also run path/reference checks:

```bash
test -f AGENTS.md
test -f .ai/00_system/AGENT_OPERATING_PROTOCOL.md
test -f .ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md
test -f .ai/00_system/DOCS_SOURCE_OF_TRUTH.md
test -f .ai/00_system/VALIDATION_MATRIX.md
test -f .ai/08_prompts/templates/codebase-ai-loop-task.md
test -f CODEX.md
test -f CLAUDE.md
```

Use `rg` to confirm the new mandate is discoverable:

```bash
rg -n "non-trivial|loop engineering|LOOP_LEDGER|codebase-ai-loop-task|bounded loop|stop condition|proof boundary" AGENTS.md .ai CODEX.md CLAUDE.md
```

Do not run `bun run validate` or `bun run build` unless production source, package scripts, tests, framework config, or runtime behavior changed.

---

## Acceptance Criteria

The task is complete only when all are true:

1. `AGENTS.md` clearly says non-trivial work defaults to bounded loop engineering.
2. `.ai/00_system/AGENT_OPERATING_PROTOCOL.md` defines loop activation criteria, loop shape, stop conditions, and proportionality.
3. `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md` defines durable artifact, ledger, maker/checker, and proof-boundary requirements.
4. `.ai/00_system/DOCS_SOURCE_OF_TRUTH.md` points to the reusable loop prompt template.
5. `.ai/00_system/VALIDATION_MATRIX.md` explains how to validate looped implementation work without forcing full validation on every task.
6. `.ai/08_prompts/templates/codebase-ai-loop-task.md` exists and is usable as a future task prompt.
7. `CODEX.md`, `CLAUDE.md`, and relevant adapter docs point back to the shared mandate instead of duplicating or weakening it.
8. Any stale `CODEX.md` local-first / future-Supabase wording is corrected.
9. A dated plan pack and `LOOP_LEDGER.md` exist for this mandate-editing task.
10. Validation evidence is recorded.
11. Final report names changed files, evidence, proof boundary, remaining gaps, and whether any future enforcement is still manual.

---

## Non-Goals

Do not:

- change production source code;
- change package dependencies;
- change database schema;
- apply Supabase migrations;
- change provider settings;
- change GitHub branch protection;
- deploy anything;
- create a separate `.ai` replacement system;
- create long duplicate policy blocks in every adapter file;
- make loops mandatory for trivial tasks;
- claim permanent technical enforcement beyond repo instructions unless actual tool config/enforcement was changed.

---

## Final Report Format

Return:

```md
## Result

<what changed>

## Files Changed

<list>

## Loop Evidence

<iterations completed and ledger path>

## Validation

<commands/checks and results>

## Proof Boundary

<local-only / provider-proven / browser-proven / manual-proof-pending>

## Remaining Risks

<any manual behavior still dependent on the agent respecting repo instructions>

## Recommended Next Step

<one decisive next action, if any>
```

Do not stop after editing one file. Complete the full loop, verify the mandate is coherent across the repo, and only claim completion when the acceptance criteria are proven.
