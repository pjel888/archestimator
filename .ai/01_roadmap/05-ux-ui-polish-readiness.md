# UX/UI Polish & Production Readiness

Last updated: 2026-05-30

This checklist covers every user-facing flow in Archestimator. Each flow is rated against 12 quality dimensions. The goal is to reach full ✅ coverage across all flows before launch.

> **Evidence rule**: a ✅ is not final until supported by a recorded observation (screenshot, video, test run log, or review sign-off). ⚠️ marks should be resolved to ✅ or ❌.

---

## Flow-by-Flow Quality Audit

| # | Flow | First-Time User Clarity | Empty State Quality | Loading/Skeleton State | Error State | Success Feedback | Mobile Behavior | Keyboard Behavior | Accessibility | Copy/Microcopy | Visual Hierarchy | Design-System Compliance | "Can Non-Technical User Complete Without Philip?" | Status | Notes |
|---|------|--------------------------|----------------------|-------------------------|-------------|------------------|-----------------|-------------------|---------------|----------------|------------------|---------------------------|---------------------------------------------------|--------|-------|
| 1 | Landing to login | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | LEFT TO DO | Public-facing. Needs brand-first hero, clear CTA, lightweight auth flow. No custom 404/500 pages exist yet. |
| 2 | Login to workshop | ⚠️ | ✅ | ✅ | ⚠️ | ⚠️ | ❌ | ❓ | ❓ | ⚠️ | ✅ | ✅ | ❌ | PARTIAL | Loading skeleton on /workshop exists. No mobile responsive guard. Onboarding flow exists but untested with non-technical users. No React error boundary on workshop routes. |
| 3 | Invite acceptance while signed out | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | LEFT TO DO | Requires cold-email flow, magic-link UX, session-less invite page. Entirely untested. |
| 4 | Invite acceptance while signed in | ⚠️ | ❓ | ❓ | ❓ | ⚠️ | ❓ | ❓ | ❓ | ⚠️ | ⚠️ | ⚠️ | ❓ | PARTIAL | In-app notification likely exists. Acceptance flow after notification unclear. Needs end-to-end validation. |
| 5 | Wrong-account invite recovery | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | LEFT TO DO | "This invite is for a different account" — sign-out-and-retry flow needs to be built or verified. No evidence of handling. |
| 6 | Project creation | ✅ | ✅ | ❓ | ⚠️ | ✅ | ❌ | ❓ | ❓ | ⚠️ | ✅ | ✅ | ❌ | IMPLEMENTED / NEEDS EVIDENCE | Basic flow works. /workshop/projects skeleton exists. No mobile guard. Form validation exists but edge-case error handling unclear. |
| 7 | Estimate creation | ✅ | ✅ | ❓ | ⚠️ | ✅ | ❌ | ❓ | ❓ | ⚠️ | ✅ | ✅ | ❌ | IMPLEMENTED / NEEDS EVIDENCE | Core creation flow implemented. Skeleton on workspace/projects path. Mobile layout unverified. |
| 8 | Estimate tree navigation | ✅ | ✅ | ❓ | ❓ | ✅ | ❌ | ❓ | ❓ | ⚠️ | ✅ | ✅ | ❓ | IMPLEMENTED / NEEDS EVIDENCE | Tree expand/collapse UX exists. Drag-to-reorder unknown. Deep-nesting overflow unknown. |
| 9 | Row editing | ✅ | ⚠️ | ❓ | ⚠️ | ✅ | ❌ | ❓ | ❓ | ⚠️ | ✅ | ✅ | ❌ | IMPLEMENTED / NEEDS EVIDENCE | Inline editing implemented. Empty rows may lack placeholder guidance. Currency/percentage formatting consistency unclear. |
| 10 | Component library add/edit | ✅ | ✅ | ✅ | ⚠️ | ✅ | ❌ | ❓ | ❓ | ⚠️ | ✅ | ✅ | ❌ | IMPLEMENTED / NEEDS EVIDENCE | /workshop/library skeleton exists. CRUD flows implemented. Bulk-import UX unknown. |
| 11 | Template usage | ✅ | ✅ | ✅ | ⚠️ | ✅ | ❌ | ❓ | ❓ | ⚠️ | ✅ | ✅ | ❌ | IMPLEMENTED / NEEDS EVIDENCE | /workshop/templates skeleton exists. Preview before apply unclear. Overwrite-conflict UX unknown. |
| 12 | Proposal XLSX export | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | UNKNOWN | Export trigger, loading state, progress feedback, and error handling all unverified. File-download UX on mobile unknown. |
| 13 | Project charts | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | UNKNOWN | Chart rendering, empty-state fallback, tooltips, and responsive behavior unknown. |
| 14 | Shared link manager modal | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | UNKNOWN | Create/share/revoke UX, copy-to-clipboard feedback, expiry visibility all unverified. |
| 15 | Shared link receiver page | ⚠️ | ❓ | ❓ | ⚠️ | ⚠️ | ✅ | ❓ | ❓ | ⚠️ | ⚠️ | ⚠️ | ❓ | PARTIAL | Responsive design confirmed. Read-only view UX implemented. Comment/decision sub-flow likely incomplete. |
| 16 | Password-gated share route | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | LEFT TO DO | Password prompt, retry limit, session persistence all unverified. |
| 17 | Comments/decisions/activity on shared link | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | LEFT TO DO | Threading UX, real-time updates, owner/client distinction unclear. |
| 18 | Account settings / profile / workspace | ✅ | ⚠️ | ✅ | ⚠️ | ✅ | ❌ | ❓ | ❓ | ⚠️ | ✅ | ✅ | ❓ | PARTIAL | /workshop/settings skeleton exists. Profile fields exist. Workspace-level settings (name, branding) unclear. |
| 19 | Ask Flip (AI copilot) | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | LEFT TO DO | Chat panel UX, streaming response feedback, error/rate-limit states, context-awareness all unverified. |
| 20 | Package-builder draft/refine/apply | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | LEFT TO DO | Multi-step builder, draft persistence, diff-on-apply, revert UX all unknown. |

---

## Dimension Definitions

| Dimension | What we mean |
|-----------|-------------|
| **First-Time User Clarity** | Can someone who has never seen the product understand what to do within 5 seconds of landing on the screen? Includes onboarding cues, empty-state CTAs, tooltips, and progressive disclosure. |
| **Empty State Quality** | When there is no data, does the screen communicate what the user can do, why it matters, and how to start? No dead-ends or blank panels. |
| **Loading/Skeleton State** | Are skeleton placeholders rendered immediately (no layout shift)? Is there a spinner/timeout for operations >3s? Are streaming/intermediate states handled? |
| **Error State** | For every failure mode (network, auth, validation, server, permission), is there a user-facing message that explains what happened AND what to do next? No raw stack traces or generic "Something went wrong." |
| **Success Feedback** | After a create/save/delete/share/export action, does the user see confirmation? Toast, inline message, redirect, or state change within 200ms of the action completing. |
| **Mobile Behavior** | Does the layout collapse to a single column? Are touch targets ≥44px? Is horizontal scroll avoided? Are modals and drawers full-screen or properly constrained? Is the nav reachable? |
| **Keyboard Behavior** | Can every interactive element be reached via Tab? Is focus order logical? Are Enter/Escape handled? Are custom widgets ARIA-compliant for keyboard? Is there a visible focus ring? |
| **Accessibility** | WCAG 2.2 AA minimum. Screen-reader labels, color contrast ≥4.5:1, focus management, reduced-motion support, semantic HTML, form error association. |
| **Copy/Microcopy** | Are button labels action-oriented? Are error messages helpful (not blaming)? Is tone consistent? Are there placeholder examples in inputs? Are loading messages human? |
| **Visual Hierarchy** | Does the most important action draw the eye first? Is spacing consistent? Are related elements grouped? Is there a clear reading/scanning path? |
| **Design-System Compliance** | Are all primitives from the shared component library (Button, Badge, Card, ControlInput, SearchInput, Field, TextInput, Textarea, StatCard, TabList, TabButton, StatusPill, Skeleton)? No feature-local reimplementations. Passes `bun run lint:design-system`. |

---

## Current Evidence Inventory

**Skeleton states confirmed** (6 of 20 flows):
- `/workshop`
- `/workshop/library`
- `/workshop/onboarding`
- `/workshop/projects`
- `/workshop/settings`
- `/workshop/templates`

**Known gaps:**
- No mobile responsive guard anywhere in the workshop
- No keyboard accessibility audit has been performed
- No React error boundaries exist on workshop routes
- No custom 404 or 500 error pages exist
- Shared link receiver page has responsive design ✅ (the only mobile-verified surface)
- Most implemented flows lack non-technical user validation
- Zero evidence exists for flows 12–17, 19–20

---

## Design Guardrails

These rules are non-negotiable. Any PR that violates them must be blocked at review.

### Typography

- Maximum font size: **12px** in compact app/workshop views (exception: public landing page may use larger hero text)
- Font family: **SF Pro** (system-ui stack fallback)
- Weight: **regular** (400) and **medium** (500) only. No bold, no semibold, no light.
- Line height: 1.4 default, 1.2 for headings
- Letter spacing: default (0), no custom tracking

### Shared UI Primitives (Mandatory Reuse)

Every UI surface MUST draw from this set. Creating a feature-local button, input, or card is forbidden.

| Primitive | Use for |
|-----------|--------|
| `Button` | All clickable actions (primary, secondary, destructive, ghost, icon-only) |
| `Badge` | Status indicators, counts, tags |
| `Card` | Container surfaces with consistent padding/radius/shadow |
| `ControlInput` | Number inputs, toggleable fields, slider-equivalents |
| `SearchInput` | Any search/filter field |
| `Field` | Label + input wrapper with error/help text |
| `TextInput` | Single-line text entry |
| `Textarea` | Multi-line text entry |
| `StatCard` | Metric display cards (used in dashboards) |
| `TabList` + `TabButton` | Tabbed navigation |
| `StatusPill` | Colored status indicators |
| `Skeleton` | Loading placeholders |

### Forbidden Patterns

- ❌ Duplicated feature-local controls (e.g., a custom `<ActionButton>` that wraps `<button>`)
- ❌ Custom font-size, border-radius, letter-spacing, or icon-weight values outside the design tokens
- ❌ Inline `style=` objects that override token values (use className or CSS modules keyed to tokens)
- ❌ Hardcoded color hex codes (use CSS variable or Tailwind token)

### Enforcement

```bash
bun run lint:design-system
```

This must pass in CI. The lint checks for:
- Unauthorized `<button>` / `<input>` / `<select>` / `<textarea>` outside the primitive library
- Non-token `font-size`, `border-radius`, `letter-spacing` values
- Hardcoded color values (`#...`, `rgb(...)`)
- Duplicate component definitions matching primitive signatures

---

## Summary

| Metric | Count |
|--------|-------|
| Total flows | 20 |
| Flows with ≥1 ✅ (verified dimension) | 7 (flows 2, 6, 7, 8, 9, 10, 11) |
| Flows where **all** dimensions are ❓ | 10 (flows 1, 3, 5, 12, 13, 14, 16, 17, 19, 20) |
| Flows rated PARTIAL | 4 (flows 2, 4, 15, 18) |
| Flows rated IMPLEMENTED / NEEDS EVIDENCE | 5 (flows 6, 7, 8, 9, 10) |
| Flows LEFT TO DO | 8 (flows 1, 3, 5, 16, 17, 19, 20 + 12–14 UX unknown) |
| Dimensions with most ❓ | Mobile Behavior (18), Keyboard Behavior (18), Accessibility (18), Error State (16) |
| Verified skeleton states | 6 of 20 |
| Mobile-verified surfaces | 1 (shared link receiver) |

**Immediate priorities:**

1. Add React error boundaries to all workshop routes before any other UX work (blast-radius: whole app)
2. Add custom 404 and 500 pages
3. Run keyboard accessibility audit on flows 2, 6–11 (the implemented set)
4. Validate flows 6–11 with at least one non-technical user
5. Begin building and testing flows 12–17, 19–20 from scratch

---

## UX/UI Excellence Upgrade

### Why the Existing Matrix Is Not Enough

The flow-by-flow quality audit above identifies **surface quality**: whether screens look right, load correctly, and handle errors gracefully. This is necessary but not sufficient for production excellence.

Surface quality answers: "Does this screen work?"

Product excellence answers: "Can a user complete meaningful work without help?"

### How to Use the Journey Matrices

The [Happy-Path User Journey Matrices](./18-happy-path-user-journey-matrices.md) document provides step-by-step journeys for 20 key workflows. Each journey maps:

- **User action** → what the user does
- **System response** → what happens in code/data
- **UI feedback** → what the user sees
- **Error/recovery alternate** → what happens when things go wrong
- **Success metric** → how we know it worked

Use the journey matrices to validate that users can complete work, not just that screens render correctly.

### How to Score Excellence

The [UX/UI Excellence Scorecard](./20-ux-ui-excellence-scorecard.md) scores 20 features across 17 dimensions on a 0–5 scale. A feature is not excellent until it has:

- A documented happy path
- A documented recovery path
- A success metric
- Evidence (user observation or test pass)
- At least one user-observation note

Current scores are estimates. All must be validated through usability testing.

### Which UX Gaps Block Beta

- **BLOCKS BETA**: Any flow where a non-technical user cannot complete the core task without help. Priority: login → estimate → rows → export/share.
- **BLOCKS BETA**: Any flow where the error/recovery path is missing or untested.
- **BLOCKS BETA**: Client-recipient flow (shared link receiver) — this is the primary client-facing surface.

### Which UX Gaps Block Public Launch

- **BLOCKS PUBLIC LAUNCH**: Any flow scoring below 3 (launch acceptable) on the excellence scorecard for core features.
- **BLOCKS PUBLIC LAUNCH**: No user-validated happy path for the core estimating loop.
- **BLOCKS PUBLIC LAUNCH**: Accessibility below WCAG 2.1 AA on critical paths.

### The Rule

> The UX matrix identifies surface quality. The journey matrix proves whether users can complete meaningful work.
