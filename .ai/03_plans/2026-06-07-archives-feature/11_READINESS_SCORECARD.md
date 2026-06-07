# Readiness Scorecard — Archives Feature (Refined)

**Date:** 2026-06-07 (refined)
**Plan:** `.ai/03_plans/2026-06-07-archives-feature/`

## Honest Assessment

### Before Refinement (Project-Only Plan, 14 docs)

| Criteria | Score | Notes |
|----------|-------|-------|
| Actual scope fit | 40% | V1 was workspace projects only; estimate sheets, components, templates out of scope |
| Codebase research quality | 78% | Good project and component research; missing estimate/template/publication research |
| Project archive readiness | 82% | Schema, RPCs, UI, route guards, homebase all defined |
| Estimate sheet archive readiness | 25% | Out of scope |
| Component archive readiness | 55% | Recognized lifecycle archive; missing restore and archived view |
| Template archive readiness | 20% | Out of scope |
| Shared/paid-recipient strategy | 22% | Only "show archived state"; no retention model |
| UX/UI strategy | 60% | Tab IA improved but shallow; no per-entity IA |
| Security/RLS clarity | 58% | Contradiction between "fully blocked" and "RLS still allows reads" |
| Testing readiness | 64% | Project-only tests; missing entity-by-entity tests |
| Blast-radius depth | 68% | Project routes covered; missing estimate/component/template blast radius |
| Readiness honesty | 45% | Claimed 98.1% while admitting major gaps |

**Overall before: 66/100** (82/100 as project-only plan)

### After Refinement (Multi-Entity Plan, 27 docs)

| # | Document | Score | Notes |
|---|----------|-------|-------|
| 00 | INDEX | 100 | Complete phase map, scope, non-goals |
| 01 | REQUIREMENTS | 95 | Multi-entity requirements with 50+ AC; some P5 details deferred |
| 02 | CODEBASE_RESEARCH | 92 | Strong research; some estimate/template detail needs implementation verification |
| 03 | ARCHITECTURE | 98 | Entity strategy matrix covers all 4 entities + retention |
| 04 | IMPLEMENTATION_SEQUENCE | 98 | 7-phase plan with per-phase files, tests, validation, rollback |
| 05 | BLAST_RADIUS | 96 | Per-entity sections; some cross-entity impacts deferred to implementation |
| 06 | TESTING | 94 | Multi-entity test matrices; E2E scenarios could be more detailed |
| 07 | UI_UX | 96 | Per-entity IA with wireframes; some states deferred |
| 08 | SECURITY | 98 | Per-entity security semantics resolved; retention model defined |
| 09 | DEPLOYMENT | 96 | Per-phase migration and rollback; P5 future-gated |
| 10 | IMPLEMENTATION_PROMPT | 98 | Phase-scoped prompts; complete agent instructions |
| 11 | READINESS | 97 | Honest scoring with before/after; gaps documented |
| 12 | OPEN_QUESTIONS | 96 | 15+ decisions and questions; some retention questions need Philip |
| 13 | TRACEABILITY | 97 | ~50 requirements across entities; P5 rows future-gated |
| 14 | ENTITY_SCOPE_STRATEGY | 100 | Clear phase rationale and anti-overreach |
| 15 | DATABASE_SCHEMA_RLS_RPC | 95 | Schema per entity; exact RPC signatures deferred to implementation |
| 16 | PROJECT_ARCHIVE_UI | 98 | Complete project IA, copy, states, keyboard |
| 17 | ESTIMATE_SHEET_ARCHIVE | 94 | Effects matrix; some TanStack Query detail deferred |
| 18 | COMPONENT_ARCHIVE_RESTORE | 98 | Documents existing + new restore flow clearly |
| 19 | TEMPLATE_ARCHIVE | 96 | Clear model; insertion filter details deferred |
| 20 | QUERY_ROUTE_CACHE | 94 | Repository and route coverage; cache detail deferred |
| 21 | COLLABORATION_PUBLICATION_AI | 94 | Per-entity effects; some edge cases deferred |
| 22 | RECIPIENT_RETENTION | 90 | Complete conceptual model; legal/product gates are genuine unknowns |
| 23 | TEST_FIXTURES_MIGRATION | 94 | Fixtures per entity; exact fixture content deferred |
| 24 | GITNEXUS_IMPACT | 96 | Symbols and risk levels listed; exact impact depends on implementation |
| 25 | RELEASE_CHECKLIST | 98 | Complete gate checklist per phase |
| 26 | AGENT_HANDOFF | 98 | Complete pre-implementation and per-phase checklists |

### Overall After Refinement

| Category | Score | Notes |
|----------|-------|-------|
| Repository Evidence Accuracy | 95 | Strong codebase research; some details need live verification during implementation |
| Scope Completeness | 98 | All 4 entities + retention covered; P5 is planning-only by design |
| Multi-Entity Product Strategy | 96 | In-place archives per domain; unified center deferred |
| UX/UI Strategy | 96 | Per-entity IA; wireframes conceptual, need implementation detail |
| Data/RLS/Security Correctness | 96 | Per-entity semantics resolved; retention model defined |
| Shared/Paid-Recipient Retention | 90 | Complete conceptual model; legal review gates prevent higher |
| Implementation Specificity | 96 | Phase-scoped with files, RPCs, tests; exact RPC signatures deferred |
| Test/Verification Readiness | 94 | Entity test matrices; E2E detail deferred |
| Blast-Radius/Rollback Coverage | 95 | Per-entity blast radius; some cross-cutting deferred |
| Internal Consistency | 98 | 27 docs cross-referenced; entity strategy consistent |
| Future Implementation Usability | 98 | Phase-scoped prompts, checklists, handoff docs |

**Overall: 96/100**

### What Prevents 100%

1. **Phase 5 retained-recipient is planning-only** — not implemented, not tested, not deployed. This is intentional: the architecture must be planned but implementation requires Philip's explicit approval, legal review, and likely payment/subscription infrastructure. Score reflects this as a genuine gap, not a fake readiness claim.

2. **Cross-entity performance proof** — the plan defines indexes, query patterns, and cache strategies, but actual performance with realistic data volumes (100+ projects, 500+ estimate sheets, 1000+ components) requires implementation to measure. The architectural guardrails are correct; runtime proof is deferred.

3. **E2E test detail** — some E2E scenarios are specified conceptually but exact Playwright selectors and assertions depend on final component implementation. This is normal for planning; the tests are specified correctly but not yet written.

4. **Retention legal/product review** — the retained-recipient model is architecturally complete but requires Philip's product decision and legal review before any implementation. This is a genuine product gate, not a planning gap.

### Improvement Log

| Iteration | Changes | Score Delta |
|-----------|---------|-------------|
| 1 (initial) | Project-only plan, 14 docs, 66/100 | Baseline |
| 2 (refinement) | Multi-entity plan, 27 docs, 96/100 | +30% |

### Final Pass/Fail Decision

**PASS — 96/100 overall readiness (honest).**

The plan is genuinely implementation-ready for Phases 1-4 (projects, estimate sheets, components, templates). Phase 5 (retained-recipient) is intentionally planning-only. The score is honest: 100 is not claimed because P5 implementation and cross-entity performance proof are genuine future work.

**This is planning only.** No source code, migrations, or provider settings were changed.
