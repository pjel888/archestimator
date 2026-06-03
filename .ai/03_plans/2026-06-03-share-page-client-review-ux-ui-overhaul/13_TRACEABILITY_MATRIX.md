# 13 — Traceability Matrix

**Plan:** Share Page Client Review UX/UI Overhaul
**Date:** 2026-06-03

---

## Requirement → AC → File → Step → Test → Risk Mapping

| # | Requirement | AC ID | Priority | Files Affected | Impl Step | Test/Verification | Risk |
|---|------------|-------|----------|---------------|-----------|-------------------|------|
| 1 | Hydration-free page load | AC-HYDRATION-001 | MUST | `CostDonutChart.tsx` | 2.2 | Manual QA: zero console warnings | Chart visual regression |
| 2 | Hydration-free production | AC-HYDRATION-002 | MUST | `CostDonutChart.tsx` | 2.2 | `bun run build && bun run start` + manual QA | Build failure |
| 3 | Deterministic SVG output | AC-HYDRATION-003 | MUST | `CostDonutChart.tsx`, `svg-rounding.ts` | 2.1, 2.2 | `cost-donut-chart-hydration.test.tsx` | Workshop chart regression |
| 4 | No "View-only" badge | AC-VISUAL-001 | MUST | `page.tsx` | 3.1 | Manual QA: visual inspection | N/A (text removal) |
| 5 | No "Visits are logged" in main | AC-VISUAL-002 | MUST | `page.tsx` | 3.1 | Manual QA: visual inspection | N/A (text relocation) |
| 6 | Professional language | AC-VISUAL-003 | MUST | `page.tsx`, `SessionBanner.tsx` | 3.1, 6.3 | Manual QA: read all copy | Subjective — verify with copy table |
| 7 | Design-system lint pass | AC-VISUAL-004 | MUST | All modified files | All phases | `bun run lint:design-system` | Repeated lint failures |
| 8 | No debug artifacts | AC-VISUAL-005 | MUST | `CostDonutChart.tsx` | 3.4 | Manual QA: visual inspection + DOM test asserting "buckets:" text absent | Bug B2 |
| 9 | Mobile layout usable | AC-VISUAL-006 | MUST | `page.tsx`, `DecisionBar.tsx` | 6.2 | Manual QA: 320px viewport | Responsive breakage |
| 10 | Clear hierarchy (desktop) | AC-VISUAL-007 | MUST | `page.tsx`, `ProposalHeader.tsx` | 4.4 | Manual QA: visual inspection | Subjective — verify against hierarchy diagram |
| 11 | Modal focus trap + a11y | AC-VISUAL-008 | MUST | `SharePageDecisionBar.tsx` | 6.1 | DOM tests: Tab trap, Escape close, focus restore | Bug B5 |
| 12 | Print stylesheet clean | AC-VISUAL-009 | SHOULD | `page.tsx`, print.css | 6.2 | Manual QA: Cmd+P preview | Print media query regressions |
| 13 | Comment functionality | AC-FUNC-001 | MUST | `SharePageComments.tsx` | 5.1 | Existing + new tests + manual QA | Comment submission breakage |
| 14 | Decision functionality | AC-FUNC-002 | MUST | `SharePageDecisionBar.tsx` | 4.1, 4.2 | Existing + new tests + manual QA | Decision submission breakage |
| 15 | Decision state on reload | AC-FUNC-003 | MUST | `SharePageDecisionBar.tsx`, GET route | 5.3, 5.4 | `share-page-decision-state.test.tsx` | GET route not approved (P4) |
| 16 | Duplicate decision handling | AC-FUNC-004 | MUST | `SharePageDecisionBar.tsx` | 4.1 | Existing decision tests | 409 handling regression |
| 17 | Comment history loads on mount | AC-FUNC-008 | MUST | `SharePageComments.tsx`, GET route | 5.1, 5.2 | `share-page-comments-state.test.tsx` | GET route not approved (P4) |
| 18 | Decision state persists on reload | AC-FUNC-009 | MUST | `SharePageDecisionBar.tsx`, GET route | 5.3, 5.4 | `share-page-decision-state.test.tsx` | GET route not approved (P4) |
| 19 | Password gate preserved | AC-FUNC-005 | MUST | `page.tsx` (password gate path) | Unchanged | Existing publication tests + manual QA | Gate logic accidentally modified |
| 20 | Recipient session preserved | AC-FUNC-006 | MUST | `RecipientSessionInitializer.tsx` | Unchanged | Existing publication tests + manual QA | Cookie logic accidentally modified |
| 21 | "Not you?" clears session | AC-FUNC-007 | MUST | `SessionBanner.tsx` | 6.3 | Manual QA: click "Not you?" | Session clear logic regression |
| 22 | Existing tests pass | AC-REGR-001 | MUST | N/A (test files updated) | All phases | `bun run test:dom` | Test assertion mismatches |
| 23 | CSRF preserved | AC-REGR-002 | MUST | API routes (unchanged) | Unchanged | Existing security tests | Unchanged — low risk |
| 24 | Rate limits preserved | AC-REGR-003 | MUST | API routes (unchanged) | Unchanged | Manual QA: exceed rate limit | Unchanged — low risk |
| 25 | Offline queue preserved | AC-REGR-004 | SHOULD | `SharePageComments.tsx` | 5.1 | Existing comment tests | Queue logic accidentally modified |
| 26 | Build succeeds | AC-REGR-005 | MUST | All modified files | All phases | `bun run build` | Type errors, import errors |
| 27 | Validate succeeds | AC-REGR-006 | MUST | All modified files | Phase 7 | `bun run validate` | Any sub-check failure |
| 28 | GET /comment route works | (API contract) | MUST | `comment/route.ts` | 5.1 | Route handler test per 24_API_CONTRACT_PLAN.md | GET route error handling |
| 29 | GET /decision route works | (API contract) | MUST | `decision/route.ts` | 5.3 | Route handler test per 24_API_CONTRACT_PLAN.md | GET route error handling |
| 30 | Session banner restyle | (UX improvement) | SHOULD | `SessionBanner.tsx` | 6.3 | Manual QA: visual inspection | Language regression |
| 31 | ProposalHeader component | (UX improvement) | SHOULD | `ProposalHeader.tsx` (NEW) | 3.2, 3.3 | `share-page-proposal-header.test.tsx` | Component rendering errors |
| 32 | DecisionBar component | (UX improvement) | SHOULD | `DecisionBar.tsx` (NEW) | 4.1, 4.2 | `share-page-decision-bar.test.tsx` | Component rendering errors |
| 33 | Loading states | (UX improvement) | COULD | Comments, Decision | 5.5 | Manual QA: slow network | N/A (visual only) |
| 34 | Accessibility pass | (UX improvement) | SHOULD | All modified files | 6.1 | Manual QA: keyboard navigation | Focus order issues |

---

## Status

All items: **PLANNED** — ready for implementation pending Philip approval on API strategy (P4) and priority upgrade (P7).

- MUST: 21 items (non-negotiable — includes upgraded AC-FUNC-008 and AC-FUNC-009)
- SHOULD: 5 items (high value)
- COULD: 1 item (nice to have)

---

## Cross-Reference

| Document | Reference |
|----------|-----------|
| Requirements | `01_REQUIREMENTS_AND_ACCEPTANCE_CRITERIA.md` |
| Research | `02_CODEBASE_RESEARCH.md` |
| Architecture | `03_ARCHITECTURE_AND_DESIGN_PLAN.md` |
| Sequence | `04_IMPLEMENTATION_SEQUENCE.md` |
| Risk | `05_BLAST_RADIUS_AND_RISK_ANALYSIS.md` |
| Testing | `06_TESTING_AND_VERIFICATION_PLAN.md` |
| UI/UX | `07_UI_UX_AND_ACCESSIBILITY_PLAN.md` |
| Security | `08_SECURITY_PERFORMANCE_AND_DATA_PLAN.md` |
| Deployment | `09_DEPLOYMENT_MIGRATION_AND_ROLLBACK_PLAN.md` |
| Prompt | `10_IMPLEMENTATION_PROMPT_DRAFT.md` |
| Scorecard | `11_READINESS_SCORECARD.md` |
| Decisions | `12_OPEN_QUESTIONS_AND_DECISIONS.md` |
| Bug: Hydration | `.ai/15_Bugs/2026-06-03-share-page-cost-donut-chart-hydration-mismatch.md` |
