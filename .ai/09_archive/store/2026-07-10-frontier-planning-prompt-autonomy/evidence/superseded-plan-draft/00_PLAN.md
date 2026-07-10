# Frontier Planning Prompt Suite Upgrade

**Date:** 2026-07-10 (Asia/Manila)
**Status:** active
**Classification:** high-blast-radius agent-framework and prompt-contract work
**Authoritative scope:** `.ai/08_prompts/000_Planning Prompts/`

## Goal

Upgrade all five planning-suite prompts into one coherent, frontier-quality
planning-to-delivery contract. A codebase AI must be able to create, improve,
compile, execute, review, and adversarially verify a complete plan pack without
routine owner questions or owner-gated engineering decisions.

## Success Criteria

1. Every prompt inherits the same versioned suite contract and source authority.
2. Planning outputs are repo-grounded, research-backed, traceable, executable,
   falsifiable, and proportionate to task risk.
3. All non-hard-gate ambiguity is resolved autonomously through evidence,
   bounded experiments, role-specialist review, and a recorded decision rubric.
4. A true hard gate blocks only the prohibited side effect. The AI completes all
   local/reversible work and emits a release-ready residual gate packet without
   waiting for the owner.
5. Reviewer provenance is reported honestly, but readiness follows evidence
   coverage rather than arbitrary numeric caps or mandatory human acceptance.
6. Execution uses dependency-aware work units, bounded agent packets, explicit
   file ownership, lead-owned integration, adversarial QA, and a final
   requirement-by-requirement completion audit.
7. Shared-worktree and provider boundaries from `AGENTS.md` remain intact.
8. A repository validator fails on the pre-upgrade contract and passes after all
   five prompts are consistent.

## Non-Goals

- Changing application behavior or product source code.
- Weakening destructive, irreversible, credential, paid-resource,
  cross-project, or unauthorized external-production safety boundaries.
- Requiring every installed skill or tool regardless of relevance.
- Claiming hosted, provider, browser, production, or manual proof from local
  checks.

## Workstreams

| Lane | Scope | Output | Write scope |
|---|---|---|---|
| Lead | Baseline, suite contract, integration, edits, validation | Five upgraded prompts and validator | Prompt suite, validator, this plan pack |
| Planning architecture audit | Creation/improvement/compilation quality | Gap report and normalized plan-pack contract | Read-only |
| Autonomous execution audit | Decision resolution, orchestration, blockers, completion | Execution protocol recommendations | Read-only |
| Frontier research | Primary-source agent/prompt/orchestration guidance | Evidence-backed rubric | Read-only |
| Independent checker | Adversarial post-edit audit | Requirement-by-requirement verdict | Read-only until lead-authorized fixes |

## Execution Plan

1. Inventory all prompt clauses, canonical policies, prior decisions, and known
   prompt-suite failures.
2. Establish the shared frontier/autonomy contract and encode it in a failing
   static validator.
3. Upgrade all five prompt documents, removing contradictory owner gates and
   stale completion/archival rules.
4. Run the validator, `validate:agents`, `git diff --check`, targeted searches,
   and an independent adversarial review.
5. Repair findings, record research and durable project truth, then run a final
   completion audit against the original objective.

## Evidence Contract

- Baseline evidence: prompt inventory, targeted clause searches, current Git
  state, canonical `.ai` protocol reads, and independent audit reports.
- Structural proof: `bun run validate:planning-prompts`.
- Adapter proof: `bun run validate:agents` when the prompt contract could affect
  shared agent surfaces.
- Diff proof: `git diff --check` plus focused diff review limited to owned files.
- Completion proof: every objective requirement mapped to current file evidence
  and a fresh command result in `LOOP_LEDGER.md`.

## Stop Condition

Stop only when all five prompts pass the suite validator, independent review has
no unresolved P0/P1 finding, no routine owner-decision stop path remains, all
canonical safety boundaries are preserved, and the completion audit proves the
full user objective. A missing external side-effect authority may remain only as
an isolated release gate; it may not leave locally achievable implementation
work pending.

