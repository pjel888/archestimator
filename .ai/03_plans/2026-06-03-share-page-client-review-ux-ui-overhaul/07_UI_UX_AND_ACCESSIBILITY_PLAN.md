# 07 — UI/UX & Accessibility Plan

**Plan:** Share Page Client Review UX/UI Overhaul
**Date:** 2026-06-03

---

## User Journey (Current → Improved)

### Current Journey (Problematic)
1. Client receives share link via email
2. Opens link → sees Archestimator logo (confusing: "what is this tool?")
3. Sees "View-only" badge (feels restricted/dismissive)
4. Sees "Visits are logged" (feels surveilled)
5. Sees project name (12px, same size as everything else — not prominent)
6. Sees estimate tabs + chart (feels technical)
7. Sees decision buttons buried in right sidebar (not obvious what to do)
8. Sees comment area (seems like an afterthought)

### Improved Journey (Target)
1. Client receives share link via email
2. Opens link → sees project name prominently with "Prepared for your review"
3. Immediately sees "Your Response" section with Accept / Decline / Request Revision buttons
4. Scrolls down to review estimate details, cost breakdown, and chart
5. Can add comments/questions for the project team
6. Makes decision → sees confirmation → feels confident and professional

---

## Visual Hierarchy (Proposed)

```
┌──────────────────────────────────────────────────────┐
│ [Session Banner — subtle: "Reviewing as client@..."]  │
├──────────────────────────────────────────────────────┤
│ [ProposalHeader]                                      │
│   Project Name (12px, medium, strong #292929)          │
│   "Prepared for your review" (10px, subtle #7F7F7F)   │
│   Client: XYZ Corp • Code: PROJ-001 • Location: ...   │
├──────────────────────────────────────────────────────┤
│ [DecisionBar]                                         │
│   "Your Response" (9px, medium, uppercase)            │
│   [Accept]  [Decline]  [Request Revision]             │
│   (prominent, centered or left-aligned, spaced)       │
├──────────────────────────────────────────────────────┤
│ [Cover Image — if present]                            │
├──────────────────────────────────────────────────────┤
│ [Estimate Tabs + Content]                             │
│   Estimate Name (12px)           Total Cost (12px)    │
│   [Donut Chart]                                       │
│   [Sheet 1] [Sheet 2] [Sheet 3] — tabs               │
│   [Tree View] [Grid Preview] — sub-tabs               │
│   [Estimate content — tree or grid]                   │
├──────────────────────────────────────────────────────┤
│ [Comments Section]                                    │
│   "Discussion" (9px, medium, uppercase)               │
│   [Comment list — chronological]                      │
│   [Comment composer]                                  │
├──────────────────────────────────────────────────────┤
│ [Footer — subtle]                                     │
│   "Shared via Archestimator • Activity logged"        │
│   (8px, very subtle, tertiary #7F7F7F)               │
└──────────────────────────────────────────────────────┘
```

---

## Layout Specifications

### Desktop (≥1024px)
- Single column, max-width 960px, centered
- Vertical rhythm: 16-24px gaps between major sections
- DecisionBar: full-width, horizontal button row
- Comments: full-width below estimates
- Chart: between header and tabs (compact, max 400px height)

### Tablet (768px–1023px)
- Same single-column layout
- Slightly reduced max-width (90vw)
- Decision buttons may wrap to two lines
- Chart: scaled to fit

### Mobile (320px–767px)
- Full-width, minimal horizontal padding (16px)
- DecisionBar: buttons stack vertically (Accept on top, then Decline, then Request Revision), full-width buttons, 12px gap between them
- Tabs: horizontal scroll with fade masks (existing behavior), touch-swipe support
- Chart: full-width, compact mode (520×400 viewBox), `h-[400px]` container to guarantee visibility
- Comments: full-width below estimates, collapsible with expand/collapse toggle button (chevron icon). Collapsed by default when comments exist; expanded when composing. Toggle state persists in sessionStorage.
- Session banner: compact single-line, wraps gracefully, "Not you?" as an X icon button on the right
- Cover image: full-width, constrained aspect ratio, `loading="lazy"`
- Safe area: `pb-[env(safe-area-inset-bottom)]` on all interactive bottom elements
- Touch targets: minimum 44px height for all interactive elements (buttons, tabs, toggles)
- Comment composer: `position: sticky; bottom: 0` with safe-area-inset to keep visible while typing

---

## Component-Specific States

### ProposalHeader
| State | Behavior |
|-------|----------|
| Normal | Shows project name, client, code, location |
| Missing client | Omits client line |
| Missing code | Omits code line |
| Missing location | Omits location line |
| Long name | Truncates with ellipsis |

### DecisionBar
| State | Behavior |
|-------|----------|
| No session | Hidden (session required for decisions) |
| Session, undecided | Shows three buttons: Accept (primary), Decline (danger), Request Revision (secondary) |
| Pending confirm | Shows confirmation modal (extracted from current `SharePageDecision`) |
| Decided | Shows "Reviewed" badge with decision type + note |
| Submitting | Buttons disabled, "Recording..." on confirm |
| Error | Error message below buttons |
| 409 duplicate | Badge appears ("Decision already recorded") |

### SharePageComments
| State | Behavior |
|-------|----------|
| No session | "Recipient session required to comment" message |
| Session, no comments | "No comments yet. Add a note or question below." |
| Session, with comments | Chronological list of comments |
| Loading comments | Skeleton placeholder (2-3 gray bars) |
| Error loading | "Could not load comments" + retry button |
| Composing | Textarea with character counter |
| Posting | "Posting..." disabled state |
| Success | Comment appears in list, "Comment added" announcement |
| Rate limited | "Please wait before posting another comment" |
| Offline | "You appear to be offline. Comment queued." |
| Queued items | Badge showing pending count |

### SharePageTabs (Estimate Area)
| State | Behavior |
|-------|----------|
| Single estimate | No tabs (just content) |
| Multiple estimates | Horizontal tab bar with scroll fade |
| No rows | Empty state message |
| Tree view | Tree panel + content area |
| Grid view | Filterable table |
| Chart | Donut chart with callout labels |

### CostDonutChart
| State | Behavior |
|-------|----------|
| Normal | Renders donut with slices + callouts |
| Zero cost | Empty donut ring |
| Single slice | Full ring (one color) |
| Many slices | Compact mode: smaller slices, callouts in gutter |
| No data | "No cost data" message |

### SharePageSessionBanner
| State | Behavior |
|-------|----------|
| Known recipient | "You are reviewing as {email}" + "Not you?" button |
| Unknown, no session | "Sign in as recipient to comment and respond" (subtle, dismissible) |
| Dismissed | Hidden (until next page load) |
| Session expired | "Your review session has expired" + "Request a new link from the sender" |
| Invalid recipient token | "This recipient link is no longer valid" + "Request a new link from the sender" |

### SharePageRecipientSessionInitializer (Edge Cases)
| State | Behavior |
|-------|----------|
| Normal (`?recipient=valid`) | POST to session route → set cookie → reload page (existing) |
| No `?recipient=` | No-op (existing) |
| Session POST fails (network) | Retry once, then show "Could not verify your identity. Please try again or request a new link." |
| Session POST fails (invalid token) | "This recipient link is invalid or has expired. Please request a new link from the sender." |
| Session POST fails (rate limited) | "Too many attempts. Please wait a moment and try again." |
| Session POST succeeds but cookie blocked | Show warning: "Your browser may be blocking cookies. Please enable cookies to use interactive features." |

---

## Copy & Language Guidelines

### Replacements
| Current (Technical) | Replacement (Client-Friendly) |
|---------------------|------------------------------|
| "Client publication" | "Proposal Review" |
| "View-only project page" | "Project Estimate — For Your Review" |
| "Visits are logged for project security and activity history." | Move to subtle footer: "Activity logged for security" |
| "View-only" (header badge) | Remove entirely |
| "Viewing as {email}" | "You are reviewing as {email}" |
| "Recipient session required for interactive features (comments, decisions)." | "Sign in as a recipient to comment and respond to this proposal." |
| "Add a comment (visible to the team)..." | "Add a note or question for the project team..." |
| "Post" (comment button) | "Send" |
| "Your response" | Keep — good client language |
| "Accept" / "Decline" / "Request Revision" | Keep — clear action language |
| "Confirm Acceptance" | "Accept this proposal?" |
| "This action is final and cannot be changed." | "Your decision will be final. You can still add comments afterward." |

### Tone Principles
- **Professional, not technical**: Use language a construction client would understand
- **Confident, not scary**: Don't make the client feel surveilled or restricted
- **Clear, not vague**: Every action should have an obvious outcome
- **Warm, not cold**: The page should feel like a service, not a tool

---

## Design-System Compliance (ARCHESTIMATOR SPECIFIC)

All changes MUST comply with `DESIGN.md`:

| Rule | Application |
|------|------------|
| Font | SF Pro system stack everywhere |
| Weights | Regular (400) + Medium (500) only — no bold, semibold |
| Max size | 12px for titles only; 10px body/controls; 8-9px labels |
| Letter spacing | 0 (zero) everywhere |
| Border radius | `rounded-xs` / 3px only |
| Icons | Phosphor regular outline weight only |
| Colors | Strong `#292929`, Default `#5D5D5D`, Subtle `#7F7F7F` |
| Surface | `#FFFFFF`, Selected `#F5F5F5`, Border `#F2F2F2` |
| Primitives | Use `src/components/ui/` Button, Badge, etc. before creating local controls |
| Labels ≤ inputs | Labels (8-9px) must be visually smaller than paired content (10px) |

---

## Shared Primitive Reuse

| Need | Use |
|------|-----|
| Buttons (Accept, Decline, Request Revision) | `src/components/ui/button.tsx` — existing `variant="primary"`, `variant="danger"`, `variant="secondary"` |
| Decision badge | `src/components/ui/badge.tsx` or custom `rounded-xs` div with status tokens |
| Confirmation modal | Custom `role="dialog"` div (existing pattern in `SharePageDecision`) — keep consistent |
| Text inputs | Native `<textarea>` with design-system classes (existing pattern in comments) |

---

## Accessibility Requirements

### Keyboard Navigation
- Tab order: Session banner → ProposalHeader → DecisionBar buttons → Estimate tabs → Sub-tabs → Tree/Grid content → Comment composer → Comment list
- Enter/Space: activate buttons and tabs
- Arrow keys: navigate between tabs and sub-tabs
- Escape: close confirmation modal
- Focus visible: `focus-visible:ring-2 focus-visible:ring-focus` on all interactive elements

### Screen Reader
- `aria-label` on all icon-only buttons
- `aria-selected` on active tabs
- `role="tablist"`, `role="tab"`, `role="tabpanel"` on estimate tabs
- `role="dialog"`, `aria-modal="true"`, `aria-labelledby` on confirmation modal
- `role="status"`, `aria-live="polite"` on dynamic updates (comment post, decision submit)
- `aria-live="polite"` for screen reader announcements

### Color Contrast
- Strong `#292929` on white `#FFFFFF` = 15.3:1 (passes AAA)
- Default `#5D5D5D` on white = 7.0:1 (passes AAA)
- Subtle `#7F7F7F` on white = 4.6:1 (passes AA for normal text, borderline for small text)
- Danger `#B91C1C` on white = 7.0:1 (passes AAA)
- Success `#15803D` on white = 5.1:1 (passes AA)

### Touch Targets
- Decision buttons: 32px+ height (existing Button component handles this)
- Tab buttons: 32px height (existing)
- Dismiss button: 24px+ touch area
