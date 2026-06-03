# 12 — Open Questions & Decisions

**Plan:** Share Page Client Review UX/UI Overhaul  
**Date:** 2026-06-03  

---

## Decisions Made

| # | Decision | Rationale | Evidence |
|---|----------|-----------|----------|
| D1 | Deterministic SVG rounding for hydration fix | Preserves SSR, avoids layout shift, one-time fix | Bug evidence: `CostDonutChart.tsx:375` mismatch at 14th decimal place |
| D2 | Move Decision from sidebar to horizontal bar | More prominent, better UX for client review flow | Current sidebar placement buries the primary client action |
| D3 | Single-column layout (remove lg:flex-row) | Better mobile behavior, clearer reading order | Current two-column layout feels cramped and confusing on all viewports |
| D4 | No database schema changes | Outside scope, increases risk | Plan is UI/UX only — no migration dependency |
| D5 | Keep all API routes unchanged | Preserves security boundaries | CSRF, rate limiting, session cookies all battle-tested |
| D6 | Create new components rather than inlining | Smaller test surface, better maintainability | Follows existing component extraction patterns in codebase |
| D7 | Load comments/decisions via new GET routes | Necessary for state persistence across reloads | Current comments are optimistic-only; decision is useState-only |
| D8 | "Proposal Review" as replacement for "Client publication" | Client-friendly, professional | "Client publication" is internal product terminology |
| D9 | Remove "View-only" badge entirely | Unnecessary for client experience | Client doesn't need to know the page is "view-only" — it's implicit |
| D10 | Move "Visits are logged" to subtle footer | Reduces intimidation while maintaining transparency | Current placement in main content area feels surveillant |

---

## Assumptions (Labeled)

| # | Assumption | Risk if Wrong | Resolution |
|---|-----------|---------------|------------|
| A1 | `useSharedLinkSession` hook works correctly for session detection | Decision/comment features break for legitimate recipients | Low risk — hook is well-tested and stable |
| A2 | Existing API routes are stable and should not be changed | If API routes have bugs, they persist | API routes are outside scope — bugs should be separate bug plans |
| A3 | Comment/decision GET routes can be added without schema changes | Need to verify existing repository functions support public reads | Implementation agent should verify before adding GET routes |
| A4 | `CostDonutChart` deterministic rounding won't affect workshop charts | Workshop chart visual fidelity changes | Implementation agent must test workshop charts after rounding fix |
| A5 | Design system constraints are non-negotiable | Plan may need adjustment if design system changes | DESIGN.md is canonical — any deviations need explicit approval |
| A6 | The share page is not indexed by search engines | SEO considerations don't apply | Share pages use `force-dynamic` and are behind token gates |
| A7 | Existing test suite covers password gate + recipient session adequately | Regressions in these areas not caught by tests | Tests are the floor — manual QA is the ceiling |

---

## Items Requiring Philip (Owner)

| # | Item | Why Philip | Priority |
|---|------|-----------|----------|
| P1 | Approve "Proposal Review" as the replacement term for "Client publication" | Brand/product language decision | HIGH |
| P2 | Approve removing "View-only" badge entirely | UX philosophy decision | HIGH |
| P3 | Approve moving "Visits are logged" to subtle footer | Trust/transparency balance | MEDIUM |
| P4 | Approve adding comment/decision GET API routes (if needed) | API surface expansion | MEDIUM |
| P5 | Approve merge to main after PR review | Per repo policy: no automatic main merge | HIGH |
| P6 | Approve final visual design after implementation | Subjective quality gate | MEDIUM |

---

## Items Implementation Agent May Decide

| # | Item | Guidance |
|---|------|----------|
| I1 | Exact CSS class composition for new layout | Follow DESIGN.md, keep it simple, use existing Tailwind tokens |
| I2 | Whether to add comment/decision GET routes or use existing repository functions | Prefer existing functions if they support public reads; add minimal GET routes if needed |
| I3 | Exact precision for SVG rounding (3 vs 4 decimal places) | 4 decimal places recommended (sufficient for pixel precision, eliminates FPP differences) |
| I4 | Whether to make comments panel collapsible on mobile | Recommended: collapsible saves vertical space on mobile |
| I5 | Exact positioning of session banner | Keep at top, subtle styling |
| I6 | Whether to add loading skeletons for comment/decision loads | Recommended: prevents layout shift, improves perceived performance |

---

## No Hidden Ambiguity

All decisions are explicitly called out above. The plan has:
- ✅ Clear scope (what files change, what doesn't)
- ✅ Clear acceptance criteria (20 pass/fail gates)
- ✅ Clear implementation sequence (20 atomic steps)
- ✅ Clear architecture (before/after diagrams)
- ✅ Clear risk assessment (all 10+ surfaces covered)
- ✅ Clear rollback strategy (3 options)
- ✅ Clear security boundaries (all preserved)
- ✅ Clear design constraints (DESIGN.md compliant)
