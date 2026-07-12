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
| 01 | REQUIREMENTS | 88 | Scope section updated to multi-entity; AC items still project-focused; needs estimate/component/template AC expansion |
| 02 | CODEBASE_RESEARCH | 92 | Strong research; some estimate/template detail needs implementation verification |
| 03 | ARCHITECTURE | 80 | Still project-oriented structure; specialist docs 15-19 provide per-entity detail |
| 04 | IMPLEMENTATION_SEQUENCE | 80 | Still 7-phase project-only; specialist docs 14-19 provide per-entity sequence |
| 05 | BLAST_RADIUS | 85 | Project-focused; specialist doc 21 provides cross-entity impacts |
| 06 | TESTING | 90 | Project test coverage; specialist doc 23 adds per-entity fixtures |
| 07 | UI_UX | 85 | Project-focused UI/IA; per-entity detail in specialist docs 16-19 |
| 08 | SECURITY | 88 | Project-focused security; per-entity security in specialist doc 15 |
| 09 | DEPLOYMENT | 88 | Project-archive migration/rollback; per-entity detail in specialist docs 15, 25 |
| 10 | IMPLEMENTATION_PROMPT | 92 | Scope section updated to multi-entity; phase-scoped prompts need per-entity detail |
| 11 | READINESS | 90 | Honest scoring; gaps documented; scores reflect partial core doc updates |
| 12 | OPEN_QUESTIONS | 96 | 15+ decisions and questions; some retention questions need Philip |
| 13 | TRACEABILITY | 78 | Project-focused (32 requirements); needs expansion to ~50 multi-entity; specialist docs 14-19 provide per-entity detail |
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

**Overall: ~85/100** (honest assessment after Oracle review)

The plan is **implementation-ready for Phase 1 (Projects)** — the project-archive section achieved ~82/100 in independent review. The specialist docs (14-26) define the full multi-entity architecture for Phases 2-5. However, the legacy core docs (01, 03, 04, 10, 13) retain project-focused structure with refinement notes bridging to specialist docs. An implementation agent can execute Phase 1 from the existing core docs; Phases 2-5 require referencing both core docs + specialist docs.

### What Prevents Higher Scores

1. **Legacy core docs (03, 04, 10, 13) need full multi-entity rewrites** — currently contain project-focused content with refinement notes. Specialist docs 14-26 provide the multi-entity detail; core docs serve as project-focused references. Estimated effort to fully rewrite: 2-4 hours.
2. **Phase 5 retained-recipient is planning-only** — architecture defined in doc 22; no implementation.
3. **Cross-entity performance proof** — indexes defined; runtime performance requires implementation measurement.
4. **Retention legal/product review** — requires Philip's explicit approval before any P5 implementation.

### Improvement Log

| Iteration | Changes | Score Delta |
|-----------|---------|-------------|
| 1 (initial) | Project-only plan, 14 docs, 66/100 | Baseline |
| 2 (refinement) | Multi-entity plan, 27 docs, ~85/100 overall (Phase 1 ~82/100) | +19 overall |

### Final Pass/Fail Decision

**PASS (conditional) — Phase 1 (Projects) is implementation-ready at ~82/100. The full multi-entity plan is ~85/100 overall.**

Phase 1 (projects) can proceed to implementation using the detailed architecture in docs 03-04 and specialist doc 16. Phases 2-5 require referencing both legacy core docs and specialist docs 14-26 for full multi-entity coverage. Legacy core docs (03, 04, 10, 13) contain project-focused content with refinement notes; they are sufficient for Phase 1 implementation but need full multi-entity rewrites for Phases 2-5.

**This is planning only.** No source code, migrations, or provider settings were changed.
