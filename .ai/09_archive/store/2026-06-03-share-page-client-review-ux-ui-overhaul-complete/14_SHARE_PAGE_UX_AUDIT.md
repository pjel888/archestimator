# 14 — Share Page UX Audit (Current State)

**Plan:** Share Page Client Review UX/UI Overhaul
**Date:** 2026-06-03

---

## Audit Method

Visual inspection of source code + running dev server at `http://localhost:3000/share/SHARE_TOKEN_PLACEHOLDER`.

---

## Issue Catalog

### CRITICAL Issues

#### UX-001: "View-only" Badge (Header)
- **File:** `src/app/share/[token]/page.tsx:74`
- **Current:** `<span className="text-[9px] font-medium uppercase tracking-normal text-tertiary">View-only</span>`
- **Problem:** Internal/developer language. A client seeing "View-only" may feel restricted, untrusted, or that they're using a limited/trial version.
- **Fix:** Remove entirely. Replace with subtle recipient status in session banner only.

#### UX-002: Surveillance Language (Main Content)
- **File:** `src/app/share/[token]/page.tsx:82`
- **Current:** `"Visits are logged for project security and activity history."`
- **Problem:** Sounds like surveillance. Erodes trust. A client sharing a proposal doesn't need this in the main content area.
- **Fix:** Move to subtle footer: "Activity logged" at 8px, tertiary color.

#### UX-003: Technical Jargon (Title Area)
- **File:** `src/app/share/[token]/page.tsx:79-81`
- **Current:** `"Client publication"` / `"View-only project page"`
- **Problem:** "Client publication" and "View-only project page" are internal product terminology, not client-facing language.
- **Fix:** Replace with "Proposal Review" and "Project Estimate — For Your Review".

#### UX-004: Hydration Warning (Console)
- **File:** `src/components/charts/CostDonutChart.tsx:375`
- **Current:** React hydration mismatch on SVG path `d` attribute
- **Problem:** Visible in browser console on every page load. Erodes trust in application quality.
- **Fix:** Deterministic SVG rounding. See bug plan.

### HIGH Issues

#### UX-005: Decision Buttons Buried in Sidebar
- **File:** `src/app/share/[token]/page.tsx:105-108`
- **Current:** Decision and comments in right sidebar (300px, sticky)
- **Problem:** The primary action a client takes (Accept/Decline/Request Revision) is visually buried in a sidebar, not prominently positioned. New clients may miss it entirely.
- **Fix:** Move decision buttons to a horizontal bar above the estimate content.

#### UX-006: Archestimator Logo Dominates Header
- **File:** `src/app/share/[token]/page.tsx:73`
- **Current:** Full Archestimator logo with wordmark in header
- **Problem:** The tool branding competes with the proposal content. A client cares about the proposal, not the tool that generated it.
- **Fix:** Reduce logo size, move to footer, or replace with subtle "Shared via Archestimator" text.

#### UX-007: Project Name Not Visually Prominent
- **File:** `src/app/share/[token]/page.tsx:80`
- **Current:** `<h1 className="mt-1.5 text-[12px] font-medium leading-4 text-ink">`
- **Problem:** 12px is the maximum allowed font size, but the project name shares this size with tab titles, estimate names, and other non-primary elements. No visual distinction for the most important information.
- **Fix:** Keep at 12px (design system max) but give more whitespace, stronger visual weight via positioning.

### MEDIUM Issues

#### UX-008: Desktop-First Layout
- **File:** `src/app/share/[token]/page.tsx:96`
- **Current:** `className="flex flex-col gap-5 lg:flex-row"`
- **Problem:** Mobile users must scroll past estimates to reach decision/comments. The flow is "read → scroll way down → decide" instead of "see proposal → decide → review details → discuss".
- **Fix:** Single-column layout with decision bar above content.

#### UX-009: No Visual Review Progress Indicator
- **Problem:** A client visiting for the first time has no indication of what step they're at in the review process. No "Step 1: Review → Step 2: Decide → Step 3: Done" guidance.
- **Fix:** Subtle status indicator in ProposalHeader: "Awaiting your review" → "Reviewed" after decision.

#### UX-010: Comments Don't Show History
- **File:** `src/components/share/SharePageComments.tsx:28`
- **Current:** `const [comments, setComments] = useState<Comment[]>([]);`
- **Problem:** Comments start empty on every page load. A returning client sees no prior discussion, making the feature feel broken or unused.
- **Fix:** Load existing comments on mount via GET request.

#### UX-011: Decision State Doesn't Survive Reload
- **File:** `src/components/share/SharePageDecision.tsx:25`
- **Current:** `const [decided, setDecided] = useState<DecisionState | null>(null);`
- **Problem:** After submitting a decision and reloading the page, the client sees the decision buttons again — confusing and potentially leading to duplicate submission attempts.
- **Fix:** Load prior decision on mount via GET request.

#### UX-012: Session Banner Language Too Technical
- **File:** `src/components/share/SharePageSessionBanner.tsx:55-57`
- **Current:** `"Recipient session required for interactive features (comments, decisions). Use a recipient link to enable."`
- **Problem:** "Recipient session", "interactive features" — technical jargon a client won't understand.
- **Fix:** "Sign in as a recipient to comment and respond to this proposal."

### LOW Issues

#### UX-013: Comment Composer Placeholder Text
- **File:** `src/components/share/SharePageComments.tsx:306`
- **Current:** `placeholder="Add a comment (visible to the team)..."`
- **Problem:** "(visible to the team)" is unnecessary — it's obvious comments are visible.
- **Fix:** "Add a note or question for the project team..."

#### UX-014: Post Button Label
- **File:** `src/components/share/SharePageComments.tsx:324`
- **Current:** `Send` (uses "Post" text)
- **Problem:** Minor — but "Send" feels more natural than "Post" for a conversation.
- **Fix:** Keep "Post" or change to "Send".

#### UX-015: Character Counter Placement
- **File:** `src/components/share/SharePageComments.tsx:314-317`
- **Current:** Character counter below textarea
- **Problem:** Minor — fine where it is.
- **Fix:** No change needed.

---

## Issue Summary

| Severity | Count | Must Fix |
|----------|-------|----------|
| CRITICAL | 4 | All (hydration, language, trust) |
| HIGH | 3 | All (layout, hierarchy, branding) |
| MEDIUM | 5 | All (state loading, progress, history) |
| LOW | 3 | 2 of 3 (minor copy improvements) |
| **TOTAL** | **15** | **14 must fix, 1 no change** |

---

## Before/After Screenshot Locations

Screenshots should be captured at:
- `bun run dev` → `http://localhost:3000/share/SHARE_TOKEN_PLACEHOLDER`
- Desktop (1440px), Tablet (768px), Mobile (375px)
- Before implementation (for comparison)
- After implementation (for verification)
