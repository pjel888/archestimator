# 25 — Bug Triage & Blocker Register

**Plan:** Share Page Client Review UX/UI Overhaul
**Date:** 2026-06-03 (second-pass refinement)

---

## All Related Bugs

| # | Bug | Slug | Severity | Bug Plan Exists? | Blocks Implementation? | Plan Document Ref |
|---|-----|------|----------|-----------------|----------------------|-------------------|
| B1 | CostDonutChart SVG path hydration mismatch | `share-page-cost-donut-chart-hydration-mismatch` | MEDIUM | ✅ Yes | ✅ Yes (Phase 2) | 15_HYDRATION_FIX_PLAN.md |
| B2 | CostDonutChart visible debug badge ("🍩 buckets:...") | `share-page-cost-donut-chart-visible-debug-badge` | HIGH | ✅ Yes (created second-pass) | ✅ Yes (Phase 3) | AC-VISUAL-005 |
| B3 | SharePageComments does not load existing server comments | `share-page-comments-not-loading-existing-history` | HIGH | ✅ Yes (created second-pass) | ⚠️ Partially (Phase 5, currently SHOULD priority) | AC-FUNC-008 |
| B4 | SharePageDecision state not persisting on reload | `share-page-decision-state-not-persisting-on-reload` | HIGH | ✅ Yes (created second-pass) | ⚠️ Partially (Phase 5, currently SHOULD priority) | AC-FUNC-003, AC-FUNC-009 |
| B5 | Decision confirmation modal lacks verified focus trap/keyboard accessibility | `share-page-decision-modal-focus-accessibility` | MEDIUM | ✅ Yes (created second-pass) | ⚠️ Partially (Phase 6, general a11y pass) | 07_UI_UX_AND_ACCESSIBILITY_PLAN.md |
| B6 | CostDonutChart uses fontWeight={600} (violates DESIGN.md) | (tracked in B2 bug plan) | LOW | ✅ (covered by B2) | ✅ Yes (Phase 3) | DESIGN.md, AC-VISUAL-004 |
| B7 | Share page uses `tracking-normal` (violates DESIGN.md zero letter-spacing) | (tracked in main plan) | LOW | ❌ (covered by plan AC-VISUAL-004) | ✅ Yes (Phase 3) | page.tsx:74,79 |
| B8 | API scope contradiction: non-goal says "no new API routes" but architecture requires GET routes | (tracked in 24_API_CONTRACT_PLAN.md) | HIGH | ❌ (resolved in 24_API_CONTRACT_PLAN.md) | ✅ Yes (must resolve before Phase 5) | 24_API_CONTRACT_PLAN.md |
| B9 | Readiness score contradiction across plan documents | (tracked in this document) | MEDIUM | ❌ (resolved in second-pass refinement) | ✅ Yes (must resolve before handoff) | 00_INDEX.md, 11_SCORECARD.md, current-state.md |

---

## Bug Plan Files Created (Second-Pass)

| Date | Slug | File |
|------|------|------|
| 2026-06-03 | `share-page-cost-donut-chart-debug-badge` | `.ai/15_Bugs/2026-06-03-share-page-cost-donut-chart-debug-badge.md` |
| 2026-06-03 | `share-page-comments-not-loading-history` | `.ai/15_Bugs/2026-06-03-share-page-comments-not-loading-history.md` |
| 2026-06-03 | `share-page-decision-state-not-persisting` | `.ai/15_Bugs/2026-06-03-share-page-decision-state-not-persisting.md` |
| 2026-06-03 | `share-page-decision-modal-accessibility` | `.ai/15_Bugs/2026-06-03-share-page-decision-modal-accessibility.md` |

---

## Existing Bug Plans (Pre-Existing)

| Date | Slug | File |
|------|------|------|
| 2026-06-03 | `share-page-cost-donut-chart-hydration-mismatch` | `.ai/15_Bugs/2026-06-03-share-page-cost-donut-chart-hydration-mismatch.md` |
| 2026-06-03 | `shared-project-favorite-action-rejects-visible-shared-projects` | `.ai/15_Bugs/2026-06-03-shared-project-favorite-action-rejects-visible-shared-projects.md` |

---

## Blocking Classification Summary

| Blocking? | Count | Bugs |
|-----------|-------|------|
| ✅ Yes — blocks implementation start | 1 | B8 (API contradiction must be resolved) |
| ✅ Yes — blocks specific phase | 5 | B1 (Phase 2), B2 (Phase 3), B3 (Phase 5), B4 (Phase 5), B5 (Phase 6) |
| ⚠️ Partially — priority upgrade recommended | 2 | B3 (SHOULD→MUST), B4 (SHOULD→MUST) |
| ❌ Non-blocking | 1 | B9 (documentation hygiene, resolved by refinement) |

---

## Recommended Priority Upgrades

The following acceptance criteria should be upgraded from `SHOULD` to `MUST`:

1. **AC-FUNC-008** (comment history loading): Currently SHOULD. A returning client seeing an empty comment section is a broken experience. The API architecture to support this is lightweight (new GET handler). Should be MUST.

2. **AC-FUNC-009** (decision state persistence): Currently SHOULD. A client seeing decision buttons reappear after submitting a decision is confusing and undermines trust. The API architecture is lightweight. Should be MUST. Note: AC-FUNC-003 is already MUST and describes the same requirement — this duplication should be resolved.

---

## Verification Requirements

Before declaring implementation complete:
1. All blocking bugs (B1-B5) must be resolved with passing tests
2. B3 and B4 should have their priority upgraded to MUST
3. B8 must be resolved via the API contract decision in 24_API_CONTRACT_PLAN.md
4. All bug plans must have their status updated to CLOSED with evidence
