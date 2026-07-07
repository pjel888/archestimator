# 23 — Readiness Scorecard (Improve pass, Phase 2)

Per-document, per-category scoring with evidence. Scoring rules from `Improve-Plan-Prompt.md` PHASE 2 are applied (caps: missing acceptance criteria → ≤84; missing security model → ≤79; unverified framework/provider claim → category ≤89; no objective testability → ≤84 overall; missing codebase inspection → 60; missing file/test refs → 70).

**Cap in force:** `verification_mode: emulated` → overall readiness ≤97; high-blast-radius package → status ≤ `CONDITIONALLY READY` until independent/owner review. 98-100 requires real independent verifier output (not available).

## Scoring scale (recap)
100 = evidence-backed, complete, internally consistent, testable, safe, independently verified. 95-99 = implementation-ready w/ minor non-blocking gaps. 85-94 = usable, not corporate-complete. 70-84 = significant gaps. <70 = not ready.

## Per-document scorecard

| Doc | Strat | Reqs | React/Next | Arch | Data/API | Sec/Priv | UX/A11y | Perf | Reliability | Test/QA | Rollout | Overall | Cap applied |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 00_COORDINATION | 95 | — | — | — | — | — | — | — | — | — | — | 95 | — |
| 01_EXECUTIVE_SUMMARY | 95 | 95 | — | 94 | 92 | 92 | 88 | 90 | 90 | 88 | 90 | 92 | — |
| 02_BRIEF_SCOPE | 96 | — | — | — | — | — | — | — | — | — | — | 96 | — |
| 03_SOURCE_AUDIT | — | — | 92 | 93 | 92 | 92 | — | — | — | — | — | 93 | grounded in repo |
| 04_REQUIREMENTS | 95 | 92 | — | — | — | 88 | 84→90* | — | — | 88 | — | 90* | UX/A11y cap lifted after 05 upgrade; sec cred-tax improved |
| 05_UX_A11Y | 92 | — | — | — | — | — | 84→92* | — | — | — | — | 90* | state matrix + action a11y matrix added (was ≤84) |
| 06_ARCHITECTURE | — | — | 90→95* | 95 | — | — | — | — | — | — | — | 94* | route boundary/cache contract added |
| 07_DATA_API | — | — | — | 92 | 92→95* | — | — | — | — | — | — | 93* | access-path matrix added |
| 08_SECURITY | — | — | — | — | — | 92→95* | — | — | — | — | — | 94* | attack-surface inventory added |
| 09_PERFORMANCE | — | — | — | — | — | — | — | 92 | 90 | — | — | 91 | — |
| 10_BLAST_RADIUS | — | — | — | 95 | 92 | 92 | — | — | — | — | — | 93 | — |
| 11_IMPLEMENTATION | 95 | 92 | 90 | 94 | 92 | 92 | 88 | 90 | 90 | 88 | 90 | 91* | test placement resolved (was vague) |
| 12_TEST_QA | — | 90 | — | — | — | — | — | — | — | 90→95* | — | 93* | proof-contract rows added |
| 13_ROLLOUT | — | — | — | — | — | — | — | 88 | 92 | — | 94 | 91 | — |
| 14_RISK | — | — | — | — | — | 95 | — | 92 | 92 | — | — | 93 | — |
| 15_DECISIONS | 95 | — | — | 94 | — | 92 | — | — | — | — | — | 94 | — |
| 16_TRACEABILITY | — | 90→96* | — | — | — | — | — | — | — | — | — | 95* | columns upgraded (Source strength, Gap/decision) |
| 17_READINESS | 95 | — | — | — | — | — | — | — | — | — | — | 94* | verification matrix + evidence-class table added |
| 18_STACK_CONTRACT | — | — | 95 | 95 | 95 | 95 | — | 92 | 92 | — | 92 | 94 | — |
| 19_RESEARCH_QA | — | — | — | — | — | — | — | — | — | 92 | — | 92* | adversarial structure added |
| 20_COST | — | — | — | — | — | — | — | 88 | — | — | 88 | 88 | no savings claim (correct) |
| 21_PROVIDER_PARITY | — | — | — | 92 | 92 | — | — | — | — | — | — | 92 | — |
| 22_INVENTORY (new) | 95 | — | — | — | — | — | — | — | — | — | — | 95 | — |
| 23_SCORECARD (new) | 95 | — | — | — | — | — | — | — | — | — | — | 95 | — |
| README | 95 | — | — | — | — | — | — | — | — | — | 92 | 94* | entrypoint, phase order |

`*` = upgraded this Improve pass.

## Weighted package overall

- **Before this Improve pass:** 94 (emulated cap; package CONDITIONALLY READY).
- **After this Improve pass:** **95** (emulated cap still applies → ceiling 97; package remains **CONDITIONALLY READY** because (a) verification is emulated, (b) OPEN-001/DEC-007 are external owner decisions, (c) hosted/provider/legal evidence is not locally provable).

Lifting to 96-97 requires: independent verifier lane OR owner acceptance. Lifting to 98-100 requires real independent reviewer output.

## Exact reasons every score is below 100

- **Verification mode:** emulated (native subagents unavailable for synthesized-pack review) → hard cap 97; high-blast-radius → status cap CONDITIONALLY READY.
- **OPEN-001 (external):** Track A vs B undecided by owner → blocks a single-track IMPLEMENTATION-READY claim.
- **DEC-007/SEC-006 (external):** platform-admin AI guard is a behavior change needing owner sign-off.
- **Hosted/provider evidence gaps:** DeepSeek hosted p95/error-rate, retention-cron hosted purge proof, DeepSeek dashboard budget, subprocessor/legal disclosure — not provable in a planning-only task.
- **DOC-001/DOC-002:** doc re-anchoring and decisions.md entries are planned work items, not yet executed (correctly — this is planning only).
- **Performance scores <100:** evaluator is mocked-fetch (correct for planning); hosted p95 is a hosted gap.

## Critical blockers (none internally resolvable remain)

- DATA-002 retention defect → resolved into work item T-P6-2 (internally resolvable, additive config).
- Test-placement uncertainty → resolved (concrete: `tests/vitest/`).
- Duplicate-helper clean-engineering → resolved into T-P1-2 instruction.

## Major/minor gaps remaining (all external or planned)

- Major: R-011 leakage suite (planned P4, launch-blocker for Track B only).
- Minor: per-workspace opt-out deferred (DEC-008); apply-broadcast gap accepted for beta (RISK-AI-11).

## Contradictions / unsupported claims

- None unresolved. Previously: test-placement `DISCOVERY-REQUIRED` (resolved); DATA-002 "verify only" (elevated to defect); doc Supabase→D1 drift (planned DOC-001).
- No score of 100 is claimed anywhere. No readiness claim exceeds the emulated cap.

## Scoring integrity self-check

- No document scores 100.
- Behavior-bearing docs (04, 11) have objective acceptance criteria (no ≤84 cap).
- Security/auth/data docs (04, 08) have a threat model + credential taxonomy (no ≤79 cap).
- High-risk data/provider work (07, 13) has rollback/recovery (no ≤79 cap).
- Framework claims are repo-grounded or labeled ASSUMPTION (no ≤89 framework cap triggered beyond the noted caps).
