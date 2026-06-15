---
title: Express Components Plan Remediation Run
type: docs
date: 2026-06-15
---

# Express Components Plan Remediation Run

## Goal

Improve `.ai/03_plans/2026-06-15-Express-Components/` so the Claude deep audit findings are represented as concrete implementation contracts, QA gates, and rollout constraints.

## Mode

Plan-only documentation remediation. No application source, migrations, provider state, GitHub state, or production surfaces were changed.

## Source Of Truth Read

- `.ai/README.md`
- `.ai/00_system/ai-folder-canonical-map.md`
- `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`
- `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md`
- `.ai/10_state/current-state.md`
- `.ai/10_state/decisions.md`
- `DESIGN.md`
- Express Components plan pack docs 01-06 and evidence
- Claude audit docs 00-05 and evidence summaries

## Parallel Lanes

- Design/a11y lane: checked state machine, keyboard, focus, virtualization, contrast, microcopy, a11y, mobile/touch, DESIGN.md compliance.
- Architecture/blast-radius lane: checked data/RPC, projection plumbing, promotion, downstream surfaces, concurrency/permissions, rollout.
- QA lane: checked test inventory, virtualized repro, migration/RPC proof, static docs gate, rollback QA.

## Changes Made

- Corrected existing docs 01-06 for KTD7, U3 migration posture, U5 reproduction, U6 project-context plumbing, virtualization severity, and missing operational gates.
- Added docs 07-12: RPC contract, traceability, UX state/focus/virtualization spec, edge cases, concurrency/permissions, rollout/migration/observability.
- Added `00-scope-and-premise-decision.md` after the readiness verification audit: day-0 is U1-U4 plus minimum U9 gates; U5-U7 are gated fast-follows unless reapproved.
- Added `evidence/u5-duplicate-instance-repro-note.md` so U5 cannot be implemented as a claimed production bug fix without a real-project duplicate capture or explicit non-reproduction record.
- Expanded QA coverage with Q39-Q43 for exact Add row assertion changes, R8 delete/select regression, projection authorization negatives, published express image snapshots, and the U5 evidence gate.
- Expanded QA coverage with Q44-Q48 for AI package-builder metadata preservation, concurrent insert `sort_order`, promotion grant/folder/price-option checks, draft-abandon behavior, and static/provider evidence gates.
- Added INDEX glossary and stronger stop condition.
- Archived the audit folder after final verifier PASS: `.ai/09_archive/store/2026-06-15-Express-Components-claude-deep-audit/`.
- Archived the readiness verification audit after final archive verification: `.ai/09_archive/store/2026-06-15-Express-Components-claude-readiness-verification-audit/`.

## Audit Remediation Coverage

| Audit demand | Remediated in |
| --- | --- |
| Rewrite KTD7/U3 JSON premise; precise merge rule | `02-data-model-and-supabase-research.md`, `04-implementation-plan.md`, `07-rpc-and-row-patch-contract.md`, evidence notes |
| State U3 no migration; U2/U7 migrations required | `05-readiness-qa-matrix.md`, `07-rpc-and-row-patch-contract.md`, `12-rollout-migration-and-observability-runbook.md` |
| Reframe U6 projectId as net-new plumbing | `01-current-state-audit.md`, `02-data-model-and-supabase-research.md`, `03-ux-interaction-design.md`, `04-implementation-plan.md` |
| Reproduce U5 before fixing | `01-current-state-audit.md`, `04-implementation-plan.md`, `06-review-and-risk-register.md`, `10-edge-cases-and-failure-modes.md`, `evidence/u5-duplicate-instance-repro-note.md`, Q43 |
| Resolve arrow-nav vs caret | `03-ux-interaction-design.md`, `09-virtualization-keyboard-focus-and-state-spec.md`, `05-readiness-qa-matrix.md` |
| Make virtualization decision and >=75-row QA | `03-ux-interaction-design.md`, `09-virtualization-keyboard-focus-and-state-spec.md`, `05-readiness-qa-matrix.md`, `06-review-and-risk-register.md` |
| Add metadata read-path work | `02-data-model-and-supabase-research.md`, `04-implementation-plan.md`, `05-readiness-qa-matrix.md`, `07-rpc-and-row-patch-contract.md` |
| Specify promotion atomicity/idempotency | `02-data-model-and-supabase-research.md`, `04-implementation-plan.md`, `07-rpc-and-row-patch-contract.md`, `12-rollout-migration-and-observability-runbook.md` |
| Add insert-return and draft-recovery details | `04-implementation-plan.md`, `07-rpc-and-row-patch-contract.md`, `10-edge-cases-and-failure-modes.md` |
| Add history-classification migration task | `02-data-model-and-supabase-research.md`, `04-implementation-plan.md`, `05-readiness-qa-matrix.md`, `07-rpc-and-row-patch-contract.md`, `12-rollout-migration-and-observability-runbook.md` |
| Add revert-to-blank blast radius | `04-implementation-plan.md`, `05-readiness-qa-matrix.md`, `10-edge-cases-and-failure-modes.md` |
| Fix `itemCost`/`unitCost` vocabulary | `INDEX.md`, `04-implementation-plan.md`, `07-rpc-and-row-patch-contract.md` |
| Author docs 07-12 | `07-rpc-and-row-patch-contract.md` through `12-rollout-migration-and-observability-runbook.md` |
| Add traceability matrix | `08-traceability-matrix.md` |
| Add state/copy/focus/a11y/mobile spec | `09-virtualization-keyboard-focus-and-state-spec.md` |
| Add concurrency and permissions | `11-concurrency-and-permissions-spec.md` |
| Add rollout/kill-switch/observability | `12-rollout-migration-and-observability-runbook.md` |
| Add static docs validation | `05-readiness-qa-matrix.md`, `12-rollout-migration-and-observability-runbook.md` |
| Enumerate exact Add row test assertion changes and preserve legacy blank placeholder test | `04-implementation-plan.md`, `05-readiness-qa-matrix.md` Q39, `08-traceability-matrix.md` |
| Add R8 move/clear/delete/select/keyboard/virtualization QA | `05-readiness-qa-matrix.md` Q22-Q24/Q35/Q40, `10-edge-cases-and-failure-modes.md`, `08-traceability-matrix.md` |
| Add projection authorization negative test | `05-readiness-qa-matrix.md` Q41, `11-concurrency-and-permissions-spec.md`, `08-traceability-matrix.md` |
| Add published express image snapshot QA | `04-implementation-plan.md`, `05-readiness-qa-matrix.md` Q42, `10-edge-cases-and-failure-modes.md`, `08-traceability-matrix.md` |
| Decide grouping defaults and proposal/dashboard implications | `02-data-model-and-supabase-research.md`, `04-implementation-plan.md`, `07-rpc-and-row-patch-contract.md`, `10-edge-cases-and-failure-modes.md` |
| Add exact promotion cache fan-out list | `02-data-model-and-supabase-research.md`, `04-implementation-plan.md`, `07-rpc-and-row-patch-contract.md`, `10-edge-cases-and-failure-modes.md`, `05-readiness-qa-matrix.md` |
| Reframe U5 without unproven production bug-fix claim | `04-implementation-plan.md`, `evidence/u5-duplicate-instance-repro-note.md`, `05-readiness-qa-matrix.md` Q43 |

## Readiness Verification Audit Absorption

The second readiness audit at `.ai/02_audits/2026-06-15-Express-Components-claude-readiness-verification-audit/` added V2-V14 findings. Absorbed changes:

| Finding | Remediated in |
| --- | --- |
| Strategic scope decision: day-0 cut, inline-vs-modal gate, table-vs-metadata identity | `00-scope-and-premise-decision.md`, `INDEX.md`, `03-ux-interaction-design.md`, `04-implementation-plan.md`, `12-rollout-migration-and-observability-runbook.md` |
| V2 AI package-builder write path can clobber express metadata | `04-implementation-plan.md`, `05-readiness-qa-matrix.md` Q44, `07-rpc-and-row-patch-contract.md`, `08-traceability-matrix.md`, `10-edge-cases-and-failure-modes.md`, `06-review-and-risk-register.md` RSK14 |
| V3 virtualization day-0 blocker | `00-scope-and-premise-decision.md`, `03-ux-interaction-design.md`, `04-implementation-plan.md`, `05-readiness-qa-matrix.md` Q22, `06-review-and-risk-register.md`, `09-virtualization-keyboard-focus-and-state-spec.md` |
| V4 promotion RPC under-specs | `04-implementation-plan.md`, `05-readiness-qa-matrix.md` Q46/Q48, `07-rpc-and-row-patch-contract.md`, `11-concurrency-and-permissions-spec.md`, `12-rollout-migration-and-observability-runbook.md` |
| V5 concurrent `sort_order` race | `04-implementation-plan.md`, `05-readiness-qa-matrix.md` Q45, `07-rpc-and-row-patch-contract.md`, `08-traceability-matrix.md`, `10-edge-cases-and-failure-modes.md`, `11-concurrency-and-permissions-spec.md`, `06-review-and-risk-register.md` RSK15 |
| V6 stable-id collision/rekey rule | `00-scope-and-premise-decision.md`, `02-data-model-and-supabase-research.md`, `04-implementation-plan.md`, `05-readiness-qa-matrix.md` Q14, `07-rpc-and-row-patch-contract.md` |
| V7 stale revision UX is net-new | `11-concurrency-and-permissions-spec.md`, `05-readiness-qa-matrix.md` Q30, `08-traceability-matrix.md` |
| V8 duplicated contradictory U9 test bullet | `04-implementation-plan.md` |
| V10 traceability orphan QA rows/unmapped RSK6 | `08-traceability-matrix.md` risk and requirement coverage |
| V11 U1 read-path correction | `04-implementation-plan.md` U1 |
| V12 `applyEditableValuesToLibraryItem` mechanism correction | `10-edge-cases-and-failure-modes.md`, `04-implementation-plan.md` U8 |
| V13 draft id broadcast premise correction | `11-concurrency-and-permissions-spec.md`, `05-readiness-qa-matrix.md` Q47 |
| V14 operational specificity gaps | `12-rollout-migration-and-observability-runbook.md`, `05-readiness-qa-matrix.md` Q48, `11-concurrency-and-permissions-spec.md` |

## Proof Boundary

Local docs-only proof. Required verification after edits: `git diff --check`, static path/link/frontmatter checks, requirement-by-requirement audit mapping, and independent verifier review. This run does not prove provider behavior, browser behavior, or actual U5 real-project reproduction; it proves the plan now requires those checks before implementation claims.

## Final Verification

- Initial verifier: PARTIAL; identified missing U5 evidence note, exact Add row assertion changes, R8 delete/select QA, projection authorization negative QA, and published image snapshot QA.
- Second verifier: PARTIAL; identified remaining P2 specificity gaps for grouping defaults, promotion cache fan-out, and U5 framing.
- Focused final verifier: PASS; confirmed the three remaining gaps were resolved and the audit folder was safe to archive based on documented coverage.
- Local static gates passed after final edits: `git diff --check`, docs 07-12 existence, frontmatter checks, Q1-Q43 traceability token check, stale wording scan, and targeted token checks for grouping defaults/cache fan-out/U5 framing.
- Readiness verification verifier: ITERATE only on archive state; fixed by moving `.ai/02_audits/2026-06-15-Express-Components-claude-readiness-verification-audit/` to `.ai/09_archive/store/2026-06-15-Express-Components-claude-readiness-verification-audit/`.
- Post-fix local static gates passed: archive source absent/destination present, `git diff --check`, stale wording scan, docs 00-12 frontmatter, and Q1-Q48/R1-R16/RSK1-RSK15 traceability token check.
