# 10 — Implementation Prompt Draft

**Plan:** Share Page Client Review UX/UI Overhaul
**Date:** 2026-06-03

---

## Instructions for the Implementation Agent

This is a pre-written prompt for the future agent that will execute this plan. Copy everything below this line into your task prompt.

---

## IMPLEMENTATION PROMPT

```
You are implementing the Share Page Client Review UX/UI Overhaul for Archestimator.

BEFORE STARTING:
1. Read the plan folder: .ai/03_plans/2026-06-03-share-page-client-review-ux-ui-overhaul/
2. Start with 00_INDEX.md for navigation and scope
3. Read 01_REQUIREMENTS_AND_ACCEPTANCE_CRITERIA.md for pass/fail gates
4. Read 04_IMPLEMENTATION_SEQUENCE.md for exact step order
5. Verify plan against current repo reality — check that all referenced files still exist at expected paths

SCOPE:
- ONLY modify files listed in the plan
- DO NOT modify: API routes, data layer, Supabase, package.json, migrations
- DO NOT add new dependencies
- DO NOT change security boundaries (password gate, CSRF, rate limiting, session cookies)

EXECUTION ORDER (FOLLOW EXACTLY):
Phase 1: Tests & Foundation — Write failing tests first
Phase 2: Hydration Fix — Fix CostDonutChart SVG determinism
Phase 3: Language & Artifacts — Remove "View-only", de-technicalize copy
Phase 4: Layout & Visual Redesign — Restructure page layout
Phase 5: State & Data Loading — Load existing comments and decisions
Phase 6: Accessibility & Mobile — Keyboard, focus, responsive pass
Phase 7: Full Validation — Run all validation commands + manual QA

VALIDATION AFTER EACH STEP:
- bun run lint:design-system (after every visual change)
- bun run type-check (after component changes)
- bun run test:dom (after logic changes)

FINAL VALIDATION:
- bun run validate (full gate)
- bun run build (production build)
- Manual QA: navigate to share URL, verify zero hydration warnings
- Manual QA: verify on mobile viewport (375px)
- Manual QA: verify password-gated publication still works

AFTER IMPLEMENTATION:
1. Update .ai/10_state/current-state.md with completion status
2. Create bug plans in .ai/15_Bugs/ for any discovered issues
3. Archive this plan folder to .ai/09_archive/2026-06-03-share-page-client-review-ux-ui-overhaul/
4. Commit with message: feat(share): client review UX/UI overhaul for share page

MERGE POLICY:
- Create a feature branch: feat/share-page-client-review-ux-ui-overhaul
- Push to origin
- Create a PR to main
- DO NOT merge to main automatically unless explicitly authorized
- Default repo policy: Philip must approve merge

DESIGN SYSTEM RULES (BLOCKING):
- SF Pro font stack only
- Regular (400) and Medium (500) weights only — no bold
- 12px maximum font size
- 10px body/controls, 8-9px labels
- Zero letter spacing
- rounded-xs / 3px border radius only
- Phosphor regular outline icons only
- Colors: #292929 strong, #5D5D5D default, #7F7F7F subtle
- Reuse src/components/ui/ primitives before creating local controls
- Labels must be visually smaller than paired content

KNOWN ISSUE TO FIX:
- CostDonutChart SVG path hydration mismatch (bug: .ai/15_Bugs/2026-06-03-share-page-cost-donut-chart-hydration-mismatch.md)
- Apply deterministic SVG rounding (roundSvgPath utility, 4 decimal precision)
```

---

## Reference Paths

- Plan folder: `.ai/03_plans/2026-06-03-share-page-client-review-ux-ui-overhaul/`
- Bug folder: `.ai/15_Bugs/`
- Archive folder: `.ai/09_archive/`
- Feature branch: `feat/share-page-client-review-ux-ui-overhaul`
- Commit message: `feat(share): client review UX/UI overhaul for share page`
