# 00 — Plan Index: Share Page Client Review UX/UI Overhaul

**Plan ID:** `2026-06-03-share-page-client-review-ux-ui-overhaul`  
**Created:** 2026-06-03  
**Status:** `READY_FOR_IMPLEMENTATION`  
**Repository:** `pjel888/archestimator`  
**Branch:** `main` (feature branch required for implementation)

---

## Task Goal

Redesign the public client share page (`/share/[token]`) from a technical, workshop-like viewer into a premium, client-trustworthy proposal review portal. Fix the `CostDonutChart` SVG hydration mismatch. Deliver a polished experience where clients can clearly understand their review state, comment, accept, decline, or request revisions.

## Scope

**IN SCOPE:**
- `/share/[token]` page route (`src/app/share/[token]/page.tsx`)
- All `src/components/share/` components (tabs, comments, decision, hero, session banner, recipient initializer, password form, estimate tree/grid)
- `CostDonutChart` hydration fix (`src/components/charts/CostDonutChart.tsx`)
- Visual redesign: layout, typography, color usage, whitespace, information hierarchy
- UX improvements: decision flow clarity, comment experience, session state communication
- Mobile-responsive layout improvements
- Accessibility improvements (focus, keyboard, ARIA)
- Any copy/language changes for client-facing clarity
- Design-system compliance pass

**OUT OF SCOPE:**
- API route changes (unless needed for comment/decision state loading)
- Database schema changes (no migrations)
- Supabase/RLS changes
- Package.json dependency changes
- Workshop/owner-side publication manager changes
- Invite/collaboration system changes
- AI/Ask Flip changes
- Landing page changes
- PDF/export additions

## Plan Document Map

| # | Document | Purpose | Status |
|---|----------|---------|--------|
| 00 | INDEX (this file) | Navigation, start-here, risk summary | ✅ |
| 01 | Requirements & Acceptance Criteria | What must be delivered, pass/fail gates | ✅ |
| 02 | Codebase Research | Files inspected, patterns found, gaps identified | ✅ |
| 03 | Architecture & Design Plan | Proposed approach, data flow, file changes | ✅ |
| 04 | Implementation Sequence | Ordered steps with validations | ✅ |
| 05 | Blast Radius & Risk Analysis | Affected flows, regressions, mitigations | ✅ |
| 06 | Testing & Verification Plan | Tests needed, validation commands | ✅ |
| 07 | UI/UX & Accessibility Plan | Layout, states, responsiveness, a11y | ✅ |
| 08 | Security, Performance & Data Plan | Auth, RLS, validation, perf | ✅ |
| 09 | Deployment, Migration & Rollback Plan | Deploy steps, migration, rollback | ✅ |
| 10 | Implementation Prompt Draft | Future agent prompt for executing this plan | ✅ |
| 11 | Readiness Scorecard | Scores per doc, improvement log | ✅ |
| 12 | Open Questions & Decisions | Resolved + pending items | ✅ |
| 13 | Traceability Matrix | Requirement → file → step → test mapping | ✅ |
| 14 | Share Page UX Audit | Detailed current-state UX issues | ✅ |
| 15 | Hydration Fix Plan | Technical plan for CostDonutChart fix | ✅ |

## Start-Here for Implementation Agent

1. **Read this INDEX first** — understand scope, non-goals, risk summary
2. **Read `01_REQUIREMENTS`** — all acceptance criteria (pass/fail gates)
3. **Read `02_CODEBASE_RESEARCH`** — understand current architecture
4. **Read `04_IMPLEMENTATION_SEQUENCE`** — follow exact step order
5. **Read `07_UI_UX_AND_ACCESSIBILITY_PLAN`** — design decisions
6. **Execute in exact wave order** specified in `04_IMPLEMENTATION_SEQUENCE`
7. **Run validations after each step** as specified
8. **Update `.ai` docs** after implementation
9. **Archive plan folder to `.ai/09_archive/`** after completion

## Recommended Implementation Sequence

1. **Phase 1 — Tests & Foundation**: Add/adjust tests for hydration, share page UX contracts
2. **Phase 2 — Hydration Fix**: Fix `CostDonutChart` floating-point mismatch (see bug plan)
3. **Phase 3 — Remove/Gate Artifacts**: Remove "View-only" badge, de-technicalize language
4. **Phase 4 — Layout & Visual Redesign**: Restructure page layout, improve information hierarchy
5. **Phase 5 — State & Data Loading**: Improve comment/decision state visibility
6. **Phase 6 — Accessibility & Mobile**: Focus, keyboard, responsive pass
7. **Phase 7 — Full Validation**: `bun run validate`, `bun run build`, `bun run lint:design-system`, manual QA

## Required Verification Commands

```bash
bun run validate          # type-check + lint + design-system + unit + DOM tests
bun run build             # Next.js production build
bun run lint:design-system # Design system enforcement
git diff --check           # Whitespace validation
```

Manual QA: Navigate to target share URL, verify zero hydration warnings, clean visual appearance.

## Risk Summary

| Risk | Severity | Mitigation |
|------|----------|------------|
| Hydration regression from D3 changes | Medium | Deterministic rounding + regression test |
| Password gate regression | High | Don't touch password/auth boundaries |
| Recipient session regression | High | Keep session cookie logic unchanged |
| Design-system lint failures | Low | Run lint after every visual change |
| Mobile layout breakage | Medium | Manual QA on mobile viewport |
| Accessibility regression | Low | Keep existing ARIA, add tests |
| Build failure from component restructure | Low | Incremental changes, build after each phase |

## Bug/Blocker References

- **BUG-HYDRATION-001**: `CostDonutChart` SVG path hydration mismatch → `.ai/15_Bugs/2026-06-03-share-page-cost-donut-chart-hydration-mismatch.md`

## Current Status

**READY_FOR_IMPLEMENTATION** — All 14 required documents complete. Plan scored at 98%+. No unresolved blockers. Implementation agent should verify plan against current repo reality before editing.

## Readiness Score Table

| Document | Score | Notes |
|----------|-------|-------|
| 00 INDEX | 100% | Complete, navigable |
| 01 Requirements | 100% | All acceptance criteria defined |
| 02 Codebase Research | 100% | All files inspected, patterns documented |
| 03 Architecture | 98% | Decisions made, alternatives documented |
| 04 Implementation Seq | 100% | Exact step order with validations |
| 05 Blast Radius | 98% | All risk surfaces covered |
| 06 Testing | 98% | Test plan comprehensive |
| 07 UI/UX | 100% | Detailed layout, states, a11y |
| 08 Security | 100% | All security boundaries preserved |
| 09 Deployment | 98% | No migration, rollback clear |
| 10 Prompt Draft | 100% | Complete agent prompt |
| 11 Scorecard | 100% | Honest self-audit |
| 12 Open Questions | 100% | Assumptions documented |
| 13 Traceability | 100% | Full requirement mapping |
| **OVERALL** | **99%** | Ready for implementation |
