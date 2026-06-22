# Loop Engineering Default Mandate

**Date:** 2026-06-17
**Branch:** `feat/dashboard-content-uxui-improvement`
**Mode:** docs/governance implementation (loop-engineered)
**Lead:** Claude (Opus 4.8, ultracode orchestration)
**Source prompt:** `.ai/08_prompts/loop-prompt.md`

## My goal (self-authored, per directive)

Make bounded loop engineering the **default repo-level execution contract for non-trivial
Archestimator AI work**, persisted in the canonical `.ai/00_system` docs + thin adapters, without
forking policy or burdening trivial work — AND first land the R1–R7 follow-ups from the prior
agent-mandate audit (`.ai/03_plans/2026-06-17-Agent-Mandate-And-Workflow-Optimization/06-recommended-contract-patches.md`).

## Two-part scope

1. **R1–R7 follow-ups** (from `06-recommended-contract-patches.md`): R1 neutralize the absolutist
   graph blocks at the source; R2 bind CommandCode sentinels; R3 proportional off-ramp + back-pointer
   for `.agents/skills/*`; R4 thin CLAUDE.md Codex-delegation; R5 normalize payload paths; R6 tag
   CommandCode autonomous-merge taste advisory; R7 `.codex/` housekeeping (mostly already gitignored).
2. **Loop-engineering default mandate** (`loop-prompt.md`): activation criteria, loop shape, stop
   conditions, durable artifacts, ledger contract, maker/checker, proof-boundary labels,
   proportionality, agent-neutral enforcement, a reusable prompt template, adapter updates.

## Orchestration (conflict-safe — a concurrent Workshop-Dashboard agent is active in src/tests)

- **Lead (sequential):** shared policy core — `AGENTS.md`, `CLAUDE.md`, `CODEX.md`, the four
  `.ai/00_system` docs, `.ai/12_agents/README.md`, the new template, R1 in-fence thinning, R4.
- **Parallel background lanes (disjoint file scopes):** R2 `.commandcode/agents/*` · R3
  `.agents/skills/*` · R5 `.ai/12_agents/payloads/*` · R6 `.commandcode/taste/workflow/taste.md`.
- No lane touches another lane's files, the lead's files, or the dashboard agent's
  `src/**`/`tests/**`/`scripts/**`/`.impeccable/**`. Lead owns integration + final verification.

## Non-goals

No production source / package / DB / migration / provider / GitHub / deploy changes. No parallel
`.ai` replacement system. No duplicated policy blocks in adapters. Loops NOT mandatory for trivial
work. No claim of permanent technical enforcement beyond repo instructions unless tool config changed.

## Stop condition

All 11 `loop-prompt.md` acceptance criteria proven + R1–R7 applied or explicitly bounded, validation
recorded, adversarial review passed — or a documented blocker / iteration cap with handoff.
