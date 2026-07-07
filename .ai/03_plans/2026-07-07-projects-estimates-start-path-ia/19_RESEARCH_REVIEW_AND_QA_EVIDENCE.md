# 19 — Research, Review, and QA Evidence

## Research questions and sources

This is an internal-architecture IA task grounded in the current codebase. External/best-practice research was **not material** to the decisions (the patterns — empty states, CTA hierarchy, route consistency — are standard and the constraints come from PROMPT.md + DESIGN.md + repo evidence). Recorded for honesty:

| Question | Searched? | Source | Decision it shaped |
|---|---|---|---|
| Is a template-chooser-at-create a common pattern? | Lightly (model knowledge) | n/a | OPEN-DEC-02 options (no codebase dependency) |
| Empty-state best practices | Not searched | DESIGN.md + repo `EmptyState` primitive | DEC-02/03 (reuse primitive) |
| Next.js 16 cache/Server Action specifics | Not needed for planning | local docs deferred to implementation | none (no framework-sensitive claim) |

No research was detached as an appendix; nothing searched-for-but-not-found materially affects the plan.

## Skills and workflows used / unavailable

| Skill/workflow | Used | Substitute if unavailable |
|---|---|---|
| `Creating-Plan-Prompt.md` | Yes | — |
| `Multi-Agent-Execution-Directive.md` | Yes | — |
| Native parallel explore subagents (5 lanes) | Yes (read-only) | emulated passes if unavailable (not needed — they ran) |
| Adversarial review (UltraQA-style) | Emulated (same-agent) | recorded as emulated |
| Performance-goal contract | Applied (reuse existing evaluators) | — |
| Autoresearch | Not applicable (internal IA) | — |
| GitNexus / code-review-graph | Not used (narrow local audit; AGENTS.md proportional policy) | `rg` + targeted reads |
| Playwright / browser proof | Deferred to implementation | named scope in `12_TEST_AND_VALIDATION_STRATEGY.md` |

## Specialist workstream outputs

Five native read-only explore lanes completed (see `00_AGENT_COORDINATION.md`). Key synthesized findings:
- 3 empty-state gaps (GAP-1/2/3), template-at-create gap (GAP-4), href mismatch (GAP-5), no analytics (GAP-6), no URL state (GAP-7), dead `createProject` (GAP-8).
- Auto-seed of one empty estimate exists and should be preserved (ASSUMP-03).
- Sibling plans de-conflicted (`first-user-activation`, `Estimate-Sheet-Tree`).

## Critique-and-revision cycle summaries (standard profile)

### Cycle 1 (full pass)
- Ran cross-document consistency + requirements-traceability + architecture + UX/a11y + security + performance + readiness review.
- **Findings resolved:**
  - FR-04 depended on a server-contract change → re-scoped to empty-state-only chooser (DEC-07) and isolated behind OPEN-DEC-02.
  - FR-05 href fix needed a sibling-file check (`MainSidebar.tsx`) → added to P1-T1 instructions.
  - Analytics "first" semantics risked stale-client false positives → moved to count/server-derived (AC-06b).
  - Added PERF-01/02 and ARCH-03 to prevent render/RPC/bundle regression.
  - Added shadow-path matrices for all four start mutations.
  - Confirmed no schema change (DATA-01) and recorded the missing-base-DDL precondition (RISK-12).
  - Confirmed same-agent verification → readiness cap (DEC-08).

### Cycle 2 (targeted)
- Re-checked: traceability completeness (every FR/UX/A11Y/ARCH/DATA/SEC/PERF/REL/TEST/DOC traced), task↔requirement bidirectionality, OPEN-DEC owner + conditional path, performance evaluator completeness, adversarial matrix coverage.
- **Findings resolved:**
  - Added AQ-8 (partial dashboard data) and AQ-9 (empty templates) adversarial rows.
  - Confirmed every task has exact path/symbol (no "likely"); the only blockers are the three named OPEN-DECs with recommended defaults.
  - Confirmed P3 is the only blocked phase; P1/P2/P4/P5 are ready (P1/P2-T1 carry a recommended-default note pending OPEN-DEC-01/03).

No third cycle needed — remaining items are owner decisions (OPEN-DECs), not internally resolvable defects.

## UltraQA-style adversarial scenario matrix

See `12_TEST_AND_VALIDATION_STRATEGY.md` (AQ-1 … AQ-10). Covers read-only collaborator, anonymous, cross-tenant, double-submit, rollback, analytics PII, partial data, empty templates, concurrent agent. For this *planning* task, dynamic adversarial QA is not applicable (no runtime behavior to prove); the matrix specifies the adversarial QA required for future implementation.

## Performance evaluator contract

See `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md`. Reuses `projects-page-render-baseline` (render count) and `projects-page-rpc-contract` (round-trips) as the declared evaluators; bundle as a manual implementation check.

## Independent final verifier evidence

**Verification mode: `same-agent`.** No native independent verifier lane was available in this session. The final review in `17_FINAL_READINESS_REVIEW.md` is an emulated separated pass by the same agent. Per the suite contract, this caps overall readiness at 94 for high-risk packages; this package is **not high-risk** (additive UI/IA, no schema/auth/provider change), so the honest status is **CONDITIONALLY READY** (owing to the three OPEN-DEC owner decisions + the deferred implementation browser proof), not IMPLEMENTATION-READY.

## Explicit validation gaps

| Gap | Why | Risk | Strongest substitute | Unblock action |
|---|---|---|---|---|
| Browser proof (focus/responsive/transition) | planning-only task | A11Y/responsive correctness at runtime | DOM tests + static review | implementation Playwright pass |
| Hosted activation-event proof | no SDK chosen (sibling plan) | can't prove funnel in production | unit redaction test | sibling analytics-SDK plan + deploy |
| Owner confirmation of OPEN-DEC-01/02/03 | product decisions | copy/chooser/landing shape | recommended defaults | owner confirm |

No internal planning defect remains unresolved.
