# 10 — Implementation Prompt Draft

**Plan:** Share Page Client Review UX/UI Overhaul
**Date:** 2026-06-03 (second-pass refinement)

---

## Instructions for the Implementation Agent

This is a pre-written prompt for the future agent that will execute this plan. Copy everything below this line into your task prompt.

---

## IMPLEMENTATION PROMPT

```
You are implementing the Share Page Client Review UX/UI Overhaul for Archestimator.

⚠️  PLAN REFINEMENT ONLY was performed on 2026-06-03. Before implementing, verify the plan folder
against current repo reality. Plan may need Philip's approval on API strategy (see P4 below).

BEFORE STARTING (REQUIRED READING):

1. Read AGENTS.md — project entry point, Next.js 16 rules, GitNexus requirements
2. Read .ai/README.md — project brain navigation
3. Read .ai/00_system/DOCS_SOURCE_OF_TRUTH.md — canonical source map
4. Read .ai/00_system/AGENT_OPERATING_PROTOCOL.md — safety and work rules
5. Read .ai/10_state/current-state.md — current project state
6. Read .ai/10_state/decisions.md — durable decisions
7. Read DESIGN.md — strict design system rules (BLOCKING)
8. Read relevant Next.js 16 local docs under node_modules/next/dist/docs/ before touching:
   - App Router behavior
   - Route handlers (if adding GET routes — see Phase 5)
   - Server/client component boundaries
   - Hydration/SSR behavior
   - This version has breaking changes from your training data

REPO SAFETY CHECK (BEFORE ANY EDIT):

```bash
pwd
git rev-parse --show-toplevel
git status --short --branch
git branch --show-current
git worktree list
git remote -v
git fetch --prune origin
git log --oneline -5
```

DO NOT:
- Force push, git reset --hard, git clean -fd
- Overwrite unrelated dirty files
- Stage unrelated files
- Modify production source code outside planned scope
- Delete branches, delete worktrees
- Touch secrets, env files

PLAN FOLDER:
.ai/03_plans/2026-06-03-share-page-client-review-ux-ui-overhaul/

Read in this order:
1. 00_INDEX.md — scope, non-goals, bug references
2. 01_REQUIREMENTS_AND_ACCEPTANCE_CRITERIA.md — pass/fail gates
3. 02_CODEBASE_RESEARCH.md — current architecture, second-pass findings
4. 03_ARCHITECTURE_AND_DESIGN_PLAN.md — architecture decisions
5. 04_IMPLEMENTATION_SEQUENCE.md — exact step order
6. 24_API_CONTRACT_PLAN.md — GET route contracts (Phase 5)
7. 25_BUG_TRIAGE_AND_BLOCKER_REGISTER.md — all known bugs
8. 07_UI_UX_AND_ACCESSIBILITY_PLAN.md — design decisions

GITNEXUS / CODE-REVIEW GRAPH REQUIREMENT:

Before editing any exported symbol, run:
- code-review-graph__get_minimal_context_tool or gitnexus_impact
- code-review-graph__get_impact_radius_tool on changed files
- Report HIGH/CRITICAL blast radius findings before editing

CostDonutChart is shared between share page and workshop charts — MUST verify
workshop charts are unaffected by rounding changes. Run impact analysis before
editing CostDonutChart.tsx.

SCOPE:

Modify files within the planned blast radius. Do not modify outside scope unless
current repo reality proves it necessary, then document why before editing.

IN SCOPE:
- src/app/share/[token]/page.tsx
- src/components/share/SharePageTabs.tsx (minor restyle)
- src/components/share/SharePageComments.tsx (visual redesign + state loading)
- src/components/share/SharePageDecision.tsx (extract to DecisionBar)
- src/components/share/SharePageHero.tsx (minor restyle if needed)
- src/components/share/SharePageSessionBanner.tsx (restyle)
- src/components/charts/CostDonutChart.tsx (hydration fix + debug badge removal)
- src/components/share/SharePageProposalHeader.tsx (NEW)
- src/components/share/SharePageDecisionBar.tsx (NEW)
- src/lib/charts/svg-rounding.ts (NEW utility)
- src/app/api/share/[token]/comment/route.ts (add GET handler — IF approved by Philip)
- src/app/api/share/[token]/decision/route.ts (add GET handler — IF approved by Philip)
- Test files (create and modify per 06_TESTING_AND_VERIFICATION_PLAN.md)

DO NOT MODIFY:
- src/lib/publication/* — data/security layer
- Existing POST/DELETE API route behavior
- src/components/share/SharePageRecipientSessionInitializer.tsx
- src/components/share/ProjectPublicationPasswordForm.tsx
- src/components/share/ShareEstimateTreeView.tsx
- src/components/share/ShareEstimateTreePanel.tsx
- src/lib/share/* — aggregation and reconstruction utilities
- src/lib/publication/types.ts — type definitions
- package.json — no dependency changes
- supabase/migrations/ — no schema changes
- .env* — no environment variable changes

TDD REQUIREMENT:

Every behavior change follows RED → GREEN:
1. Write failing test FIRST
2. Capture RED output proving it fails for the right reason
3. Write SMALLEST change that flips RED→GREEN
4. Capture GREEN output
5. No production code before its failing test

EXECUTION ORDER (FOLLOW EXACTLY):

Phase 1: Tests & Foundation (TDD-first)
- Step 1.1: Add hydration regression test (NEW file: cost-donut-chart-hydration.test.tsx)
- Step 1.2: Add share page UX contract tests (MODIFY: project-publication-page.test.tsx)
- Validation: Run tests → RED for new tests, GREEN for existing

Phase 2: Hydration Fix
- Step 2.1: Create SVG rounding utility (NEW file: svg-rounding.ts)
- Step 2.2: Apply rounding to ALL SVG numeric output in CostDonutChart
  - Arc paths, connector paths, transform attributes, cx/cy/r, text positioning
- Validation: Hydration regression test → GREEN. bun run dev → zero hydration warnings.
- Bug: B1 (.ai/15_Bugs/2026-06-03-share-page-cost-donut-chart-hydration-mismatch.md)

Phase 3: Language & Artifacts
- Step 3.1: Remove "View-only" badge, de-technicalize copy in page.tsx
  - Replace "Client publication" → "Proposal Review"
  - Replace "View-only project page" → "Project Estimate — For Your Review"
  - Move "Visits are logged" to subtle footer
  - Remove "View-only" from header badge
- Step 3.2: Create SharePageProposalHeader component (NEW)
- Step 3.3: Integrate ProposalHeader into page layout
- Step 3.4: REMOVE debug badge from CostDonutChart.tsx:325-327
  - Bug: B2 (.ai/15_Bugs/2026-06-03-share-page-cost-donut-chart-debug-badge.md)
- Validation: bun run lint:design-system after each change

Phase 4: Layout & Visual Redesign
- Step 4.1: Create SharePageDecisionBar component (NEW)
- Step 4.2: Integrate DecisionBar into page layout (replaces sidebar decision)
- Step 4.3: Restyle SharePageComments (cleaner cards, full-width, collapsible on mobile)
- Step 4.4: Redesign page shell to single-column layout (remove lg:flex-row)
- Validation: bun run lint:design-system after each change

Phase 5: State & Data Loading (IF API strategy approved by Philip — see P4)
- Step 5.1: Add GET handler to /api/share/[token]/comment (per 24_API_CONTRACT_PLAN.md)
- Step 5.2: Load existing comments on mount in SharePageComments
  - Bug: B3 (.ai/15_Bugs/2026-06-03-share-page-comments-not-loading-existing-history.md)
- Step 5.3: Add GET handler to /api/share/[token]/decision (per 24_API_CONTRACT_PLAN.md)
- Step 5.4: Load prior decision on mount in SharePageDecisionBar
  - Bug: B4 (.ai/15_Bugs/2026-06-03-share-page-decision-state-not-persisting-on-reload.md)
- Step 5.5: Handle loading, error, empty, offline states for both
- Validation: Respective DOM tests → GREEN

Phase 6: Accessibility & Mobile
- Step 6.1: Implement focus trap in decision confirmation modal
  - Bug: B5 (.ai/15_Bugs/2026-06-03-share-page-decision-modal-focus-accessibility.md)
  - Trap Tab/Shift+Tab within modal
  - Escape closes modal
  - Focus restores to trigger on close
  - aria-modal="true", aria-labelledby
- Step 6.2: Mobile responsive pass (320px–1024px)
- Step 6.3: Restyle SharePageSessionBanner (warmer tone, clearer language)
- Validation: Manual keyboard navigation, multi-viewport QA

Phase 7: Full Validation
- Step 7.1: bun run validate (type-check + lint + design-system + unit + DOM)
- Step 7.2: bun run build (Next.js production build)
- Step 7.3: bun run lint:design-system
- Step 7.4: git diff --check
- Step 7.5: Run existing publication test suite:
  bunx vitest run tests/vitest/project-publication-*.test.{ts,tsx} --maxWorkers=1
- Step 7.6: Manual QA on target share URL
  - Zero hydration warnings in browser console
  - No "View-only" badge, no "Visits are logged" in main content
  - No debug badge on chart
  - Proposal header shows project info
  - Decision buttons work (if session active)
  - Comments work (if session active)
  - Estimate tabs + chart + tree/grid render
  - Mobile viewport (375px) usable
  - Password-gated publication still works

DESIGN SYSTEM RULES (BLOCKING — bun run lint:design-system MUST PASS):

- SF Pro font stack only
- Regular (400) and Medium (500) weights only — NO bold (600), semibold
- 12px maximum font size for titles
- 10px body/controls, 8-9px labels
- ZERO letter spacing (no tracking-normal, tracking-wide, etc.)
- rounded-xs / 3px border radius only
- Phosphor regular outline icons only
- Colors: #292929 strong, #5D5D5D default, #7F7F7F subtle
- Surface: #FFFFFF, Selected: #F5F5F5, Border: #F2F2F2
- Reuse src/components/ui/ primitives before creating local controls
- Labels must be visually smaller than paired content
- NO hardcoded colors (bg-black/70, text-white, etc.) — use design tokens
- NO emoji in production UI

AFTER IMPLEMENTATION:

1. Update .ai/10_state/current-state.md with completion status
2. Update .ai/10_state/decisions.md with final decisions
3. Close all bug plans in .ai/15_Bugs/ with resolution evidence
4. Archive this plan folder to .ai/09_archive/2026-06-03-share-page-client-review-ux-ui-overhaul/
5. Commit with message: feat(share): client review UX/UI overhaul for share page

MERGE POLICY:

- Create a feature branch: feat/share-page-client-review-ux-ui-overhaul
- Push to origin
- Create a PR to main
- DO NOT merge to main automatically unless explicitly authorized
- Default repo policy: Philip must approve merge

PHILIP DECISION REQUIRED (BEFORE PHASE 5):

P4: Approve adding lightweight GET routes for comment/decision state loading?
- Recommended: YES (Option 1 in 24_API_CONTRACT_PLAN.md)
- If YES: proceed with Phase 5
- If NO: skip Phase 5, comment/decision state loading is deferred
- If alternate approach: adjust Phase 5 per Philip's direction

KNOWN BUGS TO FIX:

| Bug | Plan | Phase |
|-----|------|-------|
| B1 | CostDonutChart SVG hydration mismatch | Phase 2 |
| B2 | CostDonutChart visible debug badge | Phase 3 |
| B3 | Comments not loading existing history | Phase 5 |
| B4 | Decision state not persisting on reload | Phase 5 |
| B5 | Decision modal focus trap/keyboard a11y | Phase 6 |

Complete bug plans in .ai/15_Bugs/ — read before fixing.
```

---

## Reference Paths

- Plan folder: `.ai/03_plans/2026-06-03-share-page-client-review-ux-ui-overhaul/`
- Bug folder: `.ai/15_Bugs/`
- Archive folder: `.ai/09_archive/`
- Feature branch: `feat/share-page-client-review-ux-ui-overhaul`
- Commit message: `feat(share): client review UX/UI overhaul for share page`
- Target share URL: `http://localhost:3000/share/vTePfd5eq4ZbBFzHNae0JYOCLfPd_QcrW4F3cnf9Y_E`
