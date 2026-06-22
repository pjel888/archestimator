# Agent Mandate & Workflow Optimization

**Date:** 2026-06-17
**Branch:** `feat/dashboard-content-uxui-improvement`
**Mode:** docs/governance implementation (loop-engineered)
**Lead:** Claude (Opus 4.8, ultracode orchestration)
**Source prompt:** `.ai/08_prompts/archestimator_codebase_ai_loop_prompt.md`

## Goal

Audit and optimize the complete coding-agent operating system for ArchEstimator so
every coding AI can answer, without guessing: what the source of truth is, what to
read first, when to work directly vs. loop vs. split into lanes, where state/evidence
goes, what validation proves completion, what is forbidden without owner approval, and
how to recover from drift. Patch the **canonical** docs/adapters where genuinely stale
or contradictory — make the surface leaner and more enforceable, not more ceremonial.

## Mode

Docs/governance only. No production source, migrations, provider mutations, package, or
deploy changes. Loop-engineered: bounded iterations persisted in `LOOP_LEDGER.md`, lead
reconciles all worker output and verifies evidence before stopping.

## Scope

- Top-level agent entrypoints/adapters: `AGENTS.md`, `CLAUDE.md`, `CODEX.md`, `GEMINI.md`, `README.md`.
- `.ai/00_system/*` governance docs.
- `.ai/10_state/*` (source-of-truth/reachability only — not content rewrites).
- `.ai/12_agents/*` roster + payloads.
- `.ai/08_prompts/*`, `.ai/11_skills/*`.
- Tool adapter dirs: `.codex/`, `.claude/`, `.agents/`, `.commandcode/`, `.opencode.json`.
- Loop-engineering research + archived mandate pack.

## Non-goals

- Rewriting product specs, roadmap content, or state-doc history.
- Changing the database autonomy mandate, design system, or validation thresholds on the merits.
- Building a new parallel instruction system. Patch canonical homes; thin the adapters.

## Allowed writes (default)

- `.ai/03_plans/2026-06-17-Agent-Mandate-And-Workflow-Optimization/` (this pack)
- `.ai/05_logs/`, `.ai/08_prompts/`, `.ai/11_skills/`, `.ai/12_agents/`
- `.ai/00_system/` only where the canonical contract is truly stale/contradictory
- Top-level thin adapters (`AGENTS.md`, `CLAUDE.md`, `CODEX.md`, `GEMINI.md`) only where stale, contradictory, or too thick

## Disallowed writes (without explicit owner upgrade)

`src/`, DB migrations, Supabase/provider mutations, GitHub/Vercel/Notion settings,
package/dependency changes, secrets/`.env*`, production deploys, destructive commands.
The pre-launch DB autonomy mandate is **not** permission to mutate the database here.

## Source-of-truth chain (verified order)

`git status` → `AGENTS.md` → `.ai/README.md` → `.ai/00_system/DOCS_SOURCE_OF_TRUTH.md` →
`ai-folder-canonical-map.md` → `AGENT_OPERATING_PROTOCOL.md` → `AGENT_FRAMEWORK_PROTOCOL.md` →
`AGENT_SELF_DIAGNOSTIC_PROTOCOL.md` → `VALIDATION_MATRIX.md` → `.ai/10_state/{current-state,decisions,known-issues}.md` →
`.ai/12_agents/README.md` + payloads → `DESIGN.md`/`README.md`/`package.json` →
loop-engineering research + archived mandate pack.

## Stop condition

All `LOOP_LEDGER.md` acceptance criteria checked with evidence, OR a documented
blocker, OR the 7-iteration cap with an exact continuation handoff in `08-final-implementation-report.md`.

## Validation plan

Docs/governance task → `git status --short --branch`, `git diff --check`, and path-existence
checks for every referenced file. No `bun run validate`/`build` unless production code,
package scripts, framework config, or source tests are touched (they are not).

## Deliverables

`01-source-of-truth-inventory.md`, `02-agent-contract-audit.md`, `03-drift-conflict-register.md`,
`04-loop-surface-map.md`, `05-workflow-friction-analysis.md`, `06-recommended-contract-patches.md`,
`07-validation-and-evidence-plan.md`, `08-final-implementation-report.md`, `LOOP_LEDGER.md`.
