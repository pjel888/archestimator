# 01 — Requirements & Acceptance Criteria

**Plan:** Share Page Client Review UX/UI Overhaul
**Date:** 2026-06-03

---

## Functional Requirements

### FR-001: Hydration-Free Page Load
The target share URL must load without React/Next hydration warnings or errors in both development (`bun run dev`) and production (`bun run build && bun run start`) modes.

### FR-002: Client Review State Clarity
A client visiting the share page must immediately understand:
- What project/proposal they are reviewing
- Whether they are viewing as a known recipient or anonymously
- What actions they can take (comment, accept, decline, request revision)
- The current state of their review (pending, decided, previous decision)

### FR-003: Comment Functionality
Recipients with a valid session must be able to:
- View existing comments from the project team
- Compose and submit new comments
- Receive clear feedback on comment submission (success, rate limit, offline queue)
- See comments in chronological order

### FR-004: Decision Functionality
Recipients with a valid session must be able to:
- Accept, decline, or request revision
- See confirmation before submitting a final decision
- Understand that decisions are final
- See their previous decision on subsequent visits

### FR-005: Estimate Viewing
All visitors (authenticated or not) must be able to:
- View estimate sheets with cost breakdowns
- Navigate between multiple estimate sheets via tabs
- View estimates in tree view and grid view
- See cost summary totals
- View the D3 donut chart without hydration warnings

### FR-006: Password Gate Preservation
Password-protected publications must continue to:
- Show password form before revealing content
- Enforce lockout after repeated failed attempts
- Issue secure HttpOnly session cookies on success
- Not expose snapshot content until password is verified

### FR-007: Recipient Session Preservation
Recipient session flow must continue to work:
- `?recipient=` parameter initializes session via POST
- Session cookie identifies recipient on subsequent loads
- "Viewing as {email}" banner shows for known recipients
- "Not you?" clears session and reloads
- Session is required for comment/decision interactions

---

## Non-Functional Requirements

### NFR-001: Design System Compliance
All visible UI must pass `bun run lint:design-system`:
- SF Pro font stack, regular/medium weights only
- Maximum 12px font size (titles), 10px body/controls, 8-9px labels
- Zero letter spacing
- `rounded-xs` / 3px border radius only
- Phosphor regular outline icon weight
- Color tokens: `#292929` (strong), `#5D5D5D` (default), `#7F7F7F` (subtle)
- Reuse `src/components/ui/` primitives before creating local controls

### NFR-002: Performance
- No regression in page load time
- No additional blocking requests
- Chart rendering must not cause layout shift (CLS)
- Image loading must use `loading="lazy"` with proper dimensions

### NFR-003: Accessibility
- All interactive elements must be keyboard accessible
- ARIA roles/labels must be preserved or improved
- Focus order must be logical
- Color contrast must meet WCAG AA minimums
- Screen reader announcements for dynamic state changes

### NFR-004: Mobile Responsiveness
- Share page must be usable on viewports down to 320px width
- Decision and comment panels must be accessible without horizontal scroll
- Estimate tabs must scroll horizontally with visual affordance
- Touch targets must be at least 44px (or use appropriate spacing)

### NFR-005: Backward Compatibility
- Existing share tokens must continue to work
- Existing password-protected publications must continue to work
- Existing recipient sessions must not be invalidated
- Existing API routes must not change behavior

---

## UX/UI Requirements

### UX-001: Premium Client-Facing Feel
The page must feel like a professional client proposal review portal, not an internal workshop tool:
- No "View-only" badge (replace with client-appropriate language)
- No "Visits are logged" scary compliance language in main view
- No internal/developer jargon (e.g., "snapshot", "publication", "recipient session")
- Professional, clean typography hierarchy
- Adequate whitespace and breathing room
- Warm, trust-building visual tone

### UX-002: Clear Information Hierarchy
- Project name and key metadata at top
- Cover image (if present) displayed prominently
- Estimate content as the primary content area
- Decision actions as clear, prominent call-to-action buttons
- Comments as secondary interaction area
- Session/identity status as subtle but visible indicator

### UX-003: Obvious Review Actions
The Accept/Decline/Request Revision buttons must be:
- Visually prominent (not hidden in sidebar)
- Clearly labeled with client-friendly language
- Grouped logically
- Confirmation-gated for final decisions
- Visually distinct from secondary actions

### UX-004: Polished States
Every component must handle:
- **Empty**: No comments, no estimates, no cover image
- **Loading**: Skeleton placeholders during data fetch
- **Error**: Clear error messages with recovery actions
- **Success**: Confirmation feedback
- **Offline**: Graceful degradation with queue
- **Rate-limited**: Clear "wait" messaging

---

## Acceptance Criteria (Pass/Fail Gates)

### Hydration
| ID | Criterion | Priority |
|----|-----------|----------|
| AC-HYDRATION-001 | Target share URL loads with zero React/Next hydration warnings in dev mode | MUST |
| AC-HYDRATION-002 | Target share URL loads with zero React/Next hydration warnings in production build | MUST |
| AC-HYDRATION-003 | `CostDonutChart` produces stable deterministic SVG attributes from identical props | MUST |

### Visual & UX
| ID | Criterion | Priority |
|----|-----------|----------|
| AC-VISUAL-001 | No "View-only" badge visible on client-facing page | MUST |
| AC-VISUAL-002 | No "Visits are logged" language in main content area | MUST |
| AC-VISUAL-003 | Client-facing language is professional and non-technical | MUST |
| AC-VISUAL-004 | Design-system linter passes (`bun run lint:design-system`) | MUST |
| AC-VISUAL-005 | No visible developer/debug artifacts | MUST |
| AC-VISUAL-006 | Mobile layout is usable at 320px width | MUST |
| AC-VISUAL-007 | Desktop layout has clear information hierarchy | MUST |

### Functional
| ID | Criterion | Priority |
|----|-----------|----------|
| AC-FUNC-001 | Recipient can view comments and post new comments | MUST |
| AC-FUNC-002 | Recipient can accept, decline, or request revision | MUST |
| AC-FUNC-003 | Decision state is maintained on page reload | MUST |
| AC-FUNC-004 | Duplicate decision submission returns clear message (not error) | MUST |
| AC-FUNC-005 | Password-gated publication flow still works | MUST |
| AC-FUNC-006 | Recipient session initialization via `?recipient=` still works | MUST |
| AC-FUNC-007 | "Not you?" clears session and reloads page | MUST |

### Regression Protection
| ID | Criterion | Priority |
|----|-----------|----------|
| AC-REGR-001 | Existing share/publication tests pass | MUST |
| AC-REGR-002 | CSRF/same-origin protections preserved | MUST |
| AC-REGR-003 | Rate limits still enforced | MUST |
| AC-REGR-004 | Comment offline queue still functional | MUST |
| AC-REGR-005 | `bun run build` succeeds without errors | MUST |
| AC-REGR-006 | `bun run validate` succeeds | MUST |

---

## Priority Legend

| Priority | Meaning |
|----------|---------|
| MUST | Non-negotiable — plan fails without it |
| SHOULD | High value, include unless blocked |
| COULD | Nice to have, include if time permits |
| OUT_OF_SCOPE | Explicitly not part of this plan |

---

## Non-Goals (Explicit)

- Adding new database tables or migrations
- Changing Supabase RLS policies
- Adding new API routes
- Modifying the workshop/owner publication manager
- Adding PDF export or download features
- Adding real-time features (WebSocket, Supabase Realtime)
- Translating the page to other languages
- Adding analytics or tracking
- Changing the underlying publication security model
- Adding user authentication/login to the share page

---

## Assumptions

1. The existing `useSharedLinkSession` hook works correctly for session detection
2. The existing API routes (`/api/share/[token]/comment`, `/decision`, `/session`, `/activity`) are stable and should not be changed
3. Existing recipient sessions and passwords will not be invalidated by UI-only changes
4. The D3 `CostDonutChart` component is shared between share page and workshop charts — changes must not break workshop charts
5. The design system constraints in `DESIGN.md` are non-negotiable
6. The implementation agent has access to a running local dev server for manual QA
