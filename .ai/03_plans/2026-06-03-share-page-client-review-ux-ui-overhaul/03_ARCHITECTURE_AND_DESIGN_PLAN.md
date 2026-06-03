# 03 — Architecture & Design Plan

**Plan:** Share Page Client Review UX/UI Overhaul
**Date:** 2026-06-03

---

## Proposed Approach

### Philosophy: Client-First Restyling, Not Rewrite

The underlying architecture (Server Component → Client Components, password gate, recipient session, CSRF, rate limiting) is sound. The problem is presentation, not architecture. The approach is:

1. **Reskin, don't rebuild**: Keep all existing component boundaries, API routes, and data flows. Only change what the user sees and how they interact with it.
2. **Language-first redesign**: Replace all internal/technical copy with client-appropriate language before touching layout.
3. **Layout restructure**: Reorganize the visual hierarchy within existing components.
4. **Hydration fix**: Deterministic SVG rendering for `CostDonutChart`.
5. **State loading**: Load existing comments and decision state on page mount (within existing API boundaries).

### Why This Fits ArchEstimator

- Preserves the multi-layered security architecture (hashed tokens, scrypt passwords, HttpOnly cookies, CSRF, rate limiting)
- No database schema changes — zero migration risk
- No Supabase/RLS changes — security boundaries intact
- Follows existing component patterns (`"use client"` components receiving server-resolved props)
- Compliant with strict design system (`DESIGN.md`)
- Incremental, testable, reversible changes

---

## Component Architecture Changes

### Before (Current)
```
SharePage (Server Component)
└── ProjectPublicationView
    ├── Header (logo + "View-only" badge)
    ├── Project metadata area ("Client publication", project name, "Visits are logged")
    ├── SharePageHero (cover image)
    └── Two-column (lg:flex-row)
        ├── Left: SharePageTabs (estimates, chart, tree/grid)
        └── Right (sticky): SharePageDecision + SharePageComments
```

### After (Proposed)
```
SharePage (Server Component - UNCHANGED)
└── ProjectPublicationView
    ├── SharePageRecipientSessionInitializer (UNCHANGED)
    ├── SharePageSessionBanner (RESTYLED — warmer, clearer)
    ├── SharePageHero (UNCHANGED — already well-designed)
    ├── ProposalHeader (NEW SECTION — project name, metadata, review status)
    ├── DecisionBar (NEW — prominent accept/decline/revision buttons, horizontal)
    └── Content area
        ├── SharePageTabs (RESTYLED — estimates, chart, tree/grid)
        └── CommentsPanel (RESTYLED — collapsible, loads existing comments)
```

### Key Changes

1. **Remove "View-only" badge** — replace with subtle "Review in progress" or "Awaiting your review" when recipient has session
2. **Replace "Client publication" / "View-only project page"** — use "Proposal Review" / "Project Estimate for Your Review"
3. **Move "Visits are logged"** — into a discreet footer or remove from main content area entirely
4. **Create `ProposalHeader`** — prominent project name, client name, metadata, and visual status indicator
5. **Extract `DecisionBar`** — horizontal bar with prominent Accept/Decline/Request Revision buttons (not buried in sidebar)
6. **Redesign `SharePageComments`** — load existing comments from server, improve visual design
7. **Redesign `SharePageDecision`** — move from sidebar to prominent bar, improve confirmation flow
8. **Fix `CostDonutChart`** — deterministic SVG path rendering

---

## Files Likely to Change

### Modified (In Scope)
| File | Changes |
|------|---------|
| `src/app/share/[token]/page.tsx` | Rewrite `ProjectPublicationView` layout, copy changes, new component arrangement |
| `src/components/share/SharePageTabs.tsx` | Minor restyle, chart area refinement |
| `src/components/share/SharePageComments.tsx` | Load existing comments, visual redesign, add collapsible panel behavior |
| `src/components/share/SharePageDecision.tsx` | Extract to horizontal bar, redesign confirmation flow |
| `src/components/share/SharePageHero.tsx` | Minor restyle if needed |
| `src/components/share/SharePageSessionBanner.tsx` | Restyle — warmer tone, clearer status language |
| `src/components/charts/CostDonutChart.tsx` | Apply deterministic SVG rounding to all D3 path output |

### New Files
| File | Purpose |
|------|---------|
| `src/components/share/SharePageProposalHeader.tsx` | New component for proposal identity + review status |
| `src/components/share/SharePageDecisionBar.tsx` | New component for horizontal decision action bar |

### NOT Touched
| File | Reason |
|------|--------|
| `src/components/share/SharePageRecipientSessionInitializer.tsx` | Session init logic unchanged |
| `src/components/share/ProjectPublicationPasswordForm.tsx` | Password gate unchanged |
| `src/components/share/ShareEstimateTreeView.tsx` | Tree view rendering unchanged |
| `src/components/share/ShareEstimateTreePanel.tsx` | Tree nav panel unchanged |
| `src/app/api/share/[token]/*` | All API routes unchanged |
| `src/lib/publication/*` | All data/security layer unchanged |
| `src/lib/share/*` | Chart aggregation and tree reconstruction unchanged |

---

## Architectural Decisions

### Decision 1: Component Split
**Decision:** Create new `SharePageProposalHeader` and `SharePageDecisionBar` components rather than inlining everything.
**Rationale:** Smaller, focused components are easier to test, style, and maintain. Follows existing pattern of component extraction in the codebase.

### Decision 2: Comment History Loading
**Decision:** Load existing comments via new lightweight GET handler at `GET /api/share/[token]/comment`. This is additive — the existing POST handler is unchanged. The GET handler returns publicly-visible comments only (never internal/workshop comments) and respects the publication's password gate.
**Rationale:** Without loading existing comments, returning clients see an empty comment list — breaking trust. The GET route is read-only, unauthenticated, and scoped to publicly-visible comments.
**API Contract:** See `24_API_CONTRACT_PLAN.md` for full request/response shapes, error codes, and test contracts.
**Status:** ✅ APPROVED by Philip (2026-06-03). Implementation proceeds per Phase 5.1 of implementation sequence.

### Decision 3: Decision State Loading
**Decision:** Load prior decision state via new lightweight GET handler at `GET /api/share/[token]/decision`. This is additive — the existing POST handler is unchanged. The GET handler returns only the requesting recipient's own decision (never other recipients' decisions) and respects the publication's password gate and session cookie.
**Rationale:** Decision state must survive page reload. Currently it's `useState` only — reload loses the decision, confusing returning clients and potentially causing duplicate submission attempts.
**API Contract:** See `24_API_CONTRACT_PLAN.md` for full request/response shapes, error codes, and test contracts.
**Status:** ✅ APPROVED by Philip (2026-06-03). Implementation proceeds per Phase 5.3 of implementation sequence.

### Decision 4: Chart Hydration Fix
**Decision:** Apply deterministic rounding to all SVG numeric output from D3 in `CostDonutChart`. Use a utility that rounds to 4 decimal places for path coordinates.
**Rationale:** Approach A (deterministic rounding) preserves SSR rendering benefits, avoids layout shift, and is a one-time fix. Approach B (client-only render) would introduce flash-of-placeholder and potential CLS issues.

### Decision 5: No Schema Changes
**Decision:** No database migrations. Comment/decision state loading must use existing tables and API patterns.
**Rationale:** Schema changes increase risk, require migration management, and are outside the scope of a UX/UI overhaul.

### Decision 6: Preserve Security Boundaries
**Decision:** All existing password gate, CSRF, rate limiting, and session cookie logic remains untouched. Only visual/UX presentation changes.
**Rationale:** These are battle-tested security patterns. Changing them for visual reasons is unjustified risk.

---

## Data Flow (Unchanged)

```
Client → /share/[token]
  → resolveProjectPublicationAccessByToken(token)
  → [password gate check]
  → resolveProjectPublicationSnapshotByToken(token)
  → recordProjectPublicationAnalyticsEvent("open")
  → render ProjectPublicationView with snapshot data

Client interactions:
  → Comment: POST /api/share/[token]/comment (CSRF + session validation)
  → Decision: POST /api/share/[token]/decision (CSRF + session + version lock)
  → Session: POST /api/share/[token]/session (initialize recipient)
  → Session: DELETE /api/share/[token]/session (clear recipient)
```

---

## Alternatives Rejected

| Alternative | Why Rejected |
|-------------|-------------|
| Full page rewrite | Unnecessary risk, large blast radius |
| Client-only chart rendering | Flash of placeholder, CLS risk |
| Adding a new layout system | Over-engineering; existing flexbox layout works |
| Creating a separate `/review/[token]` route | Confusing URL split; share route is the established public surface |
| Database migration for comment/decision reads | Outside scope; use existing tables |
| Adding real-time WebSocket for comments | Over-engineering for MVP UX polish |
| Moving to a completely different component library | Design system mandates `src/components/ui/` reuse |

---

## Anti-Overengineering Guardrails

1. **No new state management libraries** — `useState` and `useSharedLinkSession` are sufficient
2. **No new UI libraries** — use existing `src/components/ui/` primitives
3. **No new API routes unless absolutely necessary** — prefer existing routes
4. **No animation libraries** — CSS transitions only
5. **No new dependencies** — keep `package.json` unchanged
6. **No component extraction unless a pattern repeats** — don't create abstractions for one-use layouts
