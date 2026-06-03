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

## Implementation Sequencing with Bug Dependencies

The bugs interact with the implementation phases. Here is the recommended bug resolution order:

```
Phase 2: B1 (hydration) → must be fixed before any visual changes
Phase 3: B2 (debug badge) + B6 (fontWeight=600) + B7 (tracking-normal) → language/artifact cleanup
Phase 4: Layout redesign (no specific bugs, but enables B5 fix surface)
Phase 5: B3 (comment history) + B4 (decision persistence) + B8 (API resolved)
Phase 6: B5 (modal a11y) → focus trap implementation
```

**Critical path:** B1 → B2 → B3/B4. B3 and B4 are gated by B8 (Philip's API approval).

## Why Each Bug Matters (User Impact)

| Bug | If NOT Fixed | User Experience |
|-----|-------------|-----------------|
| B1 | Console errors visible in DevTools | Client's technical contact sees errors → erodes trust |
| B2 | "🍩 buckets:3 total:5000000" badge visible | Client sees emoji debug output → "Is this a toy app?" |
| B3 | Comment section always empty on reload | Client adds comments, returns later, they're gone → "Did they see my note?" |
| B4 | Decision buttons reappear after reload | Client accepted, comes back, sees Accept button again → "Did my acceptance go through?" |
| B5 | Tab escapes modal, no Escape close | Keyboard user can't properly interact with decision flow → accessibility failure |
| B6 | Bold text on callout labels | Design inconsistency → "Why is this bold?" |
| B7 | Inconsistent letter spacing | Visual inconsistency → "This looks sloppy" |

## Implementation Agent Pre-Flight Checklist

Before starting implementation, verify:

```bash
# 1. Repo is clean and on main
git status --short --branch
# Expected: only intentional changes, no unrelated dirty files

# 2. next-env.d.ts is NOT modified by the plan
# (This file was pre-existing dirty before refinement — see final report.
#  Do NOT commit changes to this file as part of implementation.)

# 3. All bug plan files exist
ls .ai/15_Bugs/2026-06-03-share-page-*.md
# Expected: 5 files (B1 cost-donut-chart-hydration-mismatch,
#                     B2 cost-donut-chart-visible-debug-badge,
#                     B3 comments-not-loading-existing-history,
#                     B4 decision-state-not-persisting-on-reload,
#                     B5 decision-modal-focus-accessibility)

# 4. Plan folder is complete
ls .ai/03_plans/2026-06-03-share-page-client-review-ux-ui-overhaul/
# Expected: 00 through 15 + 24 + 25 (18 documents)
```

## Verification Requirements

Before declaring implementation complete:
1. All blocking bugs (B1-B5) must be resolved with passing tests and manual QA evidence
2. B3 and B4 are now MUST priority — returning clients seeing empty state is broken UX
3. B8 is resolved by Philip's decision on API strategy (see 24_API_CONTRACT_PLAN.md)
4. All bug plans must have their status updated to CLOSED with resolution evidence (test output, console screenshots)
5. Design-system audit must be performed on ALL share components (not just the ones audited in second-pass — see 02_CODEBASE_RESEARCH "Not Confirmed" section for the list)
6. `bun run lint:design-system` must pass with zero violations

## Implementation Closeout (2026-06-03)

All B1-B5 blocking bugs are **CLOSED in local implementation**.

| Bug | Resolution evidence |
|---|---|
| B1 CostDonutChart hydration mismatch | `src/lib/charts/svg-rounding.ts`, rounded D3 SVG output in `CostDonutChart`, and `tests/vitest/share/cost-donut-chart-hydration.test.tsx` |
| B2 visible debug badge | Debug badge removed from `CostDonutChart`; regression asserts no `buckets:`/emoji debug artifact |
| B3 comment history | Additive `GET /api/share/[token]/comment`, repository read helper, `SharePageComments` mount loading/retry state, GET contract tests |
| B4 decision persistence | Additive `GET /api/share/[token]/decision`, recipient-session scoped repository read helper, `SharePageDecision` prior-decision loading, GET contract tests |
| B5 decision modal accessibility | `SharePageDecision` focus trap, Escape close, focus restoration, `aria-modal`, decision-bar copy tests |

Validation: `bun run validate` (typecheck + ESLint + design-system + unit + 172 Vitest DOM files: 1318 passed / 2 skipped), `bun run build` (Next.js 16.2.6 production build), targeted share/publication suites (77/77), CRG detect_changes risk 0.55/no affected flows, and GitNexus detect-changes medium risk (12 files, 94 symbols, 2 GET/POST flows).
