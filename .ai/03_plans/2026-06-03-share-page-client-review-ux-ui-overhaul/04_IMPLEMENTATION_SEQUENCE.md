# 04 — Implementation Sequence

**Plan:** Share Page Client Review UX/UI Overhaul  
**Date:** 2026-06-03  

---

## Sequence Overview

```
Phase 1: Tests & Foundation     →  ~2 steps
Phase 2: Hydration Fix          →  ~2 steps
Phase 3: Language & Artifacts   →  ~3 steps
Phase 4: Layout & Visuals       →  ~4 steps
Phase 5: State & Data Loading   →  ~3 steps
Phase 6: Accessibility & Mobile →  ~3 steps
Phase 7: Full Validation        →  ~3 steps
```

---

## Phase 1: Tests & Foundation

### Step 1.1: Add hydration regression test
**Files:** `tests/vitest/share/cost-donut-chart-hydration.test.tsx` (NEW)  
**Changes:** Create a test that renders `CostDonutChart` with identical props multiple times and asserts SVG output is identical (deterministic).  
**Validation:** Run test → RED (fails due to current non-deterministic output).  
**Rollback:** Delete test file.

### Step 1.2: Add share page UX contract tests
**Files:** `tests/vitest/project-publication-page.test.tsx` (MODIFY)  
**Changes:** Add test cases for:
- Project name visibility in header
- Decision buttons present when session is valid
- "View-only" and "Visits are logged" text presence (to be removed in Phase 3)
- Comment composer visibility when session is valid
**Validation:** Run existing test suite → GREEN (new tests may need adjustment).  
**Rollback:** Git revert.

---

## Phase 2: Hydration Fix

### Step 2.1: Implement deterministic SVG rounding utility
**Files:** `src/lib/charts/svg-rounding.ts` (NEW)  
**Changes:** Create `roundSvgNumber(n: number, precision?: number): number` and `roundSvgPath(pathD: string, precision?: number): string` utilities. Round all numeric values to 4 decimal places.  
**Validation:** Unit test the utility.  
**Rollback:** Delete file.

### Step 2.2: Apply rounding to CostDonutChart
**Files:** `src/components/charts/CostDonutChart.tsx` (MODIFY)  
**Changes:** Apply `roundSvgNumber` and `roundSvgPath` to all D3-generated numeric output:
- Arc path `d` attributes (pie slices)
- Connector line `d` attributes (callout connectors) — **primary bug location**
- `transform` attributes
- `cx`, `cy`, `r` attributes
- Text positioning coordinates  
**Validation:** 
1. Hydration regression test → GREEN
2. `bun run dev` → navigate to share URL → zero hydration warnings in console  
**Rollback:** Git revert `CostDonutChart.tsx`, delete utility.

---

## Phase 3: Language & Artifacts

### Step 3.1: Remove "View-only" badge and de-technicalize header
**Files:** `src/app/share/[token]/page.tsx` (MODIFY)  
**Changes:**
- Remove `<span>View-only</span>` from header
- Replace "Client publication" → "Proposal Review"
- Replace "View-only project page" → "Project Estimate — For Your Review"
- Move "Visits are logged..." to a subtle footer (or remove from main content)
- Make header cleaner: smaller logo or no logo, focus on proposal content  
**Validation:** Visual inspection, `bun run lint:design-system`.  
**Rollback:** Git revert.

### Step 3.2: Create SharePageProposalHeader component
**Files:** `src/components/share/SharePageProposalHeader.tsx` (NEW)  
**Changes:** Extract project identity into a dedicated header component:
- Project name (prominent, 12px medium)
- Client name (if available)
- Project code (if available)
- Location (if available)
- "Prepared for your review" subtitle
- Visual status: "Awaiting your review" (pending) / "Reviewed" (decided)  
**Validation:** Component renders correctly, `bun run lint:design-system`.  
**Rollback:** Delete file.

### Step 3.3: Integrate ProposalHeader into page layout
**Files:** `src/app/share/[token]/page.tsx` (MODIFY)  
**Changes:** Replace inline metadata section with `<SharePageProposalHeader>` component. Keep `SharePageHero` below header.  
**Validation:** Page renders, no visual regression in metadata display, design-system lint passes.  
**Rollback:** Git revert.

---

## Phase 4: Layout & Visual Redesign

### Step 4.1: Create SharePageDecisionBar component
**Files:** `src/components/share/SharePageDecisionBar.tsx` (NEW)  
**Changes:** Horizontal decision action bar with:
- "Your Response" label (9px, medium, uppercase)
- Three buttons: Accept (primary), Decline (danger), Request Revision (secondary)
- Confirmation modal integrated (extracted from current `SharePageDecision`)
- Decision-locked state: read-only badge when decision exists
- Position: between ProposalHeader and content area (prominent placement)  
**Validation:** Component tests, visual inspection, `bun run lint:design-system`.  
**Rollback:** Delete file.

### Step 4.2: Integrate DecisionBar into page layout
**Files:** `src/app/share/[token]/page.tsx` (MODIFY)  
**Changes:** 
- Remove decision from right sidebar
- Place `SharePageDecisionBar` after ProposalHeader, before content
- Keep decision state logic (submit, 409 handling) unchanged from `SharePageDecision`  
**Validation:** Decision flow works end-to-end, `bun run lint:design-system`.  
**Rollback:** Git revert.

### Step 4.3: Restyle SharePageComments
**Files:** `src/components/share/SharePageComments.tsx` (MODIFY)  
**Changes:**
- Redesign comment list: cleaner cards, better typography
- Add comment count badge
- Improve composer: better placeholder text ("Add a note or question...")
- Remove `lg:w-80` fixed width — make full-width, positioned below estimates
- Make panel collapsible on mobile (expand/collapse toggle)
- Design-system compliance pass on all elements  
**Validation:** Visual inspection, `bun run lint:design-system`.  
**Rollback:** Git revert.

### Step 4.4: Redesign page shell layout
**Files:** `src/app/share/[token]/page.tsx` (MODIFY)  
**Changes:**
- Restructure two-column layout to single-column with clear sections:
  1. ProposalHeader (project identity)
  2. DecisionBar (review actions)
  3. SharePageHero (cover image)
  4. SharePageTabs (estimates + chart + tree/grid)
  5. SharePageComments (discussion)
- Increase vertical spacing between sections
- Remove `lg:flex-row` split — use single-column on all viewports
- Comments always below estimates (natural reading order)  
**Validation:** Full page visual inspection, mobile + desktop, `bun run lint:design-system`, `bun run build`.  
**Rollback:** Git revert.

---

## Phase 5: State & Data Loading

### Step 5.1: Load existing comments on page mount
**Files:** `src/components/share/SharePageComments.tsx` (MODIFY)  
**Changes:** Add a `useEffect` fetch to load existing comments. If no dedicated public GET route exists, add a lightweight GET handler at `/api/share/[token]/comment` (read-only, public, unauthenticated) that returns comments for the publication.  
**Validation:** Existing comments appear on page load. Test: create comments in one session, reload, comments persist.  
**Rollback:** Git revert.

### Step 5.2: Load prior decision state on page mount
**Files:** `src/components/share/SharePageDecision.tsx` (MODIFY) or `SharePageDecisionBar.tsx`  
**Changes:** Add a `useEffect` fetch to load prior decision. If no dedicated GET route, add a lightweight GET handler at `/api/share/[token]/decision` that returns the recipient's prior decision.  
**Validation:** Decision state persists on page reload. Test: submit decision, reload, decision badge shows.  
**Rollback:** Git revert.

### Step 5.3: Handle edge cases for comment/decision loading
**Files:** Same as above  
**Changes:**
- Loading state: show skeleton/spinner while fetching
- Error state: show "Could not load comments" with retry button
- Empty state: show "No comments yet" (existing behavior)
- 401/403: session expired → show session banner (existing behavior)  
**Validation:** All states tested.  
**Rollback:** Git revert.

---

## Phase 6: Accessibility & Mobile

### Step 6.1: Accessibility audit and fixes
**Files:** All modified share components  
**Changes:**
- Verify all interactive elements are keyboard accessible
- Verify focus order is logical (tab through ProposalHeader → DecisionBar → Tabs → Comments)
- Add `aria-label` to decision buttons
- Ensure confirmation modal traps focus
- Add `role="status"` for dynamic updates
- Verify screen reader announcements for comment post, decision submit
- Verify color contrast (strong `#292929` on white is 15.3:1 — passes AAA)  
**Validation:** Manual keyboard navigation, `bun run lint:design-system`.  
**Rollback:** Git revert.

### Step 6.2: Mobile responsive pass
**Files:** `src/app/share/[token]/page.tsx`, `SharePageProposalHeader.tsx`, `SharePageDecisionBar.tsx`  
**Changes:**
- Ensure DecisionBar buttons wrap on narrow viewports (flex-wrap)
- Ensure tabs scroll horizontally with visual affordance (existing behavior, verify)
- Ensure comment composer is usable on mobile (no fixed heights that overflow)
- Ensure estimate grid scrolls horizontally (existing behavior, verify)
- Test at 320px, 375px, 768px, 1024px viewport widths
- Add `safe-area-inset-bottom` padding for mobile browsers with home indicator  
**Validation:** Manual QA on multiple viewport sizes, Chrome DevTools device toolbar.  
**Rollback:** Git revert.

### Step 6.3: Restyle SharePageSessionBanner
**Files:** `src/components/share/SharePageSessionBanner.tsx` (MODIFY)  
**Changes:**
- Warmer tone: replace `bg-canvas`/`bg-surfaceMuted` with friendlier styling
- Clearer language: "You are reviewing as {email}" instead of "Viewing as {email}"
- "Recipient" chip → more subtle indicator
- Make dismissible non-recipient banner less alarming  
**Validation:** Visual inspection, `bun run lint:design-system`.  
**Rollback:** Git revert.

---

## Phase 7: Full Validation

### Step 7.1: Run full validation suite
**Commands:**
```bash
bun run validate          # type-check + lint + design-system + unit + DOM
bun run build             # Next.js production build
bun run lint:design-system # Design system enforcement
git diff --check          # Whitespace
```
**Validation:** All commands exit 0.  
**Rollback:** N/A — final validation.

### Step 7.2: Manual QA on target share URL
**Actions:**
1. `bun run dev` — navigate to target share URL
2. Verify zero hydration warnings in browser console
3. Verify clean visual appearance (no "View-only", no "Visits are logged")
4. Verify proposal header shows project info correctly
5. Verify decision buttons work (if recipient session active)
6. Verify comments work (if recipient session active)
7. Verify estimate tabs + chart + tree/grid render correctly
8. Test on mobile viewport (375px)
9. Test password-gated publication separately
**Validation:** All manual checks pass, screenshots captured.  
**Rollback:** N/A — final QA.

### Step 7.3: Run existing test suite
**Commands:**
```bash
bunx vitest run tests/vitest/project-publication-*.test.{ts,tsx} --maxWorkers=1
```
**Validation:** All 13 publication test files pass.  
**Rollback:** N/A — final regression check.

---

## What NOT to Touch

- `src/lib/publication/*` — all data/security layer
- `src/app/api/share/[token]/*` — all API routes (unless adding GET handlers for Phase 5)
- `src/components/share/SharePageRecipientSessionInitializer.tsx`
- `src/components/share/ProjectPublicationPasswordForm.tsx`
- `src/components/share/ShareEstimateTreeView.tsx`
- `src/components/share/ShareEstimateTreePanel.tsx`
- `src/lib/share/*` — aggregation and reconstruction utilities
- `src/lib/publication/types.ts` — type definitions
- `package.json` — no dependency changes
- `supabase/migrations/` — no schema changes
- `.env*` — no environment variable changes

---

## When to Update `.ai` During Implementation

- After Phase 2: Update `current-state.md` with hydration fix status
- After Phase 5: Update with comment/decision state loading status
- After Phase 7: Update with completion status, archive plan folder

---

## Dependencies Between Phases

```
Phase 1 (Tests) ─────────────────────────────────────────┐
    │                                                      │
    ├── Phase 2 (Hydration) ──────────────────────────────┤
    │                                                      │
    ├── Phase 3 (Language) ──┬── Phase 4 (Layout) ────────┤
    │                        │                              │
    │                        └── Phase 5 (State) ──────────┤
    │                                                      │
    └── Phase 6 (A11y/Mobile) ────────────────────────────┤
                                                           │
                                    Phase 7 (Validation) ←─┘
```

- Phase 1 can be done in parallel with Phase 3 planning
- Phases 2, 3, 4, 5 are sequential (each builds on previous)
- Phase 6 can run in parallel with Phase 5
- Phase 7 is the final gate — everything must be complete first
