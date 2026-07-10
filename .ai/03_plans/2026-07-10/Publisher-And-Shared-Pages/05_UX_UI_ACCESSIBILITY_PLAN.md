# 05 — UX/UI Accessibility Plan

This document covers the user experience, visual design, and accessibility
strategy for the redesigned Publisher and Shared Link surfaces.

## Design Principles

1. **Progressive disclosure.** Show the essential action first; reveal complexity
   on demand. The manager's primary job is "share this project with a client" —
   that path should be one click, one wizard, done.
2. **Plain language.** Every label a user sees should be a word they use in their
   daily work. No "publication," "scope outline," "sheet scope" in user-facing UI.
3. **Obvious primary action.** Every screen has one dominant CTA. The user should
   never wonder "what do I do next?"
4. **Professional polish.** The shared link page is the client's impression of the
   firm. It must look intentional, branded, and trustworthy — not like an admin tool.
5. **Mobile-first recipient.** Most clients open share links on phones. The
   recipient page is mobile-first; the publisher gains mobile capability.
6. **Accessibility is non-negotiable.** WCAG 2.1 AA: keyboard, screen reader,
   contrast, focus, touch targets, reduced motion.

## Terminology Mapping

| Current (jargon) | Proposed (plain language) | Surface |
|---|---|---|
| Publisher | **Share** or **Client Links** | Sidebar nav, page title |
| Publication | **Shared link** or **Share** | Manager UI |
| Generate shared link | **Create link** or **Share project** | Button |
| Update shared page | **Update link** | Button |
| Sheet scope / Sheets | **Estimates** or **Sheets to include** | Wizard step |
| Scope outline | **Summary** or **By section** | Share page toggle |
| Line item table | **Details** or **Line items** | Share page toggle |
| Recipient session | **Your review session** or just "signed in" | Share page |
| Stale snapshot | **Updated since shared** | Manager badge |
| Sheet scope (column) | **Estimates** | Roster column |
| Awaiting your review | Dynamic: **Pending your review** → **Approved** etc. | Share header |
| Access (drawer tab) | **Team access** (internal collaborators) | Publisher drawer |
| Approve proposal / Accepted | **Approve** / **Approved** (consistent verb) | Share decision |
| Request changes / Revision requested | **Request changes** / **Changes requested** | Share decision |
| Decline / Declined | **Decline** / **Declined** (already consistent) | Share decision |

The sidebar item currently "Publisher" (⌘5) becomes "Share" with icon
`ShareNetwork` or `PaperPlane`. The `NewspaperClipping` icon is misleading.

**Primary-action verb (REQ-016):** Use **"Share"** consistently across the header
CTA, draft-card CTA, and wizard step-3 button. Do NOT mix "Share project" /
"Create link" / "Generate shared link" within the same flow. The wizard step 3
button is "Share" (not "Create link" or "Generate").

**Decision-verb mapping (UX-004/UX-016):** Button → recorded-badge mapping:
- "Approve" → "Approved" (consistent verb)
- "Request changes" → "Changes requested" (consistent verb)
- "Decline" → "Declined" (already consistent)

All three are now verb-consistent (button imperative → badge past-tense of the
same verb). No more "Approve" → "Accepted" mismatch.

## Publisher (Manager) Redesign

### Roster page — visual hierarchy

```text
┌──────────────────────────────────────────────────────┐
│  Share                          [+ Share a project]  │  ← Primary CTA always visible
│  Manage shared project links                         │
├──────────────────────────────────────────────────────┤
│  [Search...]  [Project ▾]  [Status: All ▾]           │
│  Showing 1-10 of 23                                  │
├──────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────┐  │
│  │ 📋 Project Name                    ● Active    │  │  ← Card layout (mobile-friendly)
│  │    Code • Client                  🔒 Password  │  │
│  │    3 estimates • 2 recipients • 5 opens       │  │
│  │    [Copy link] [Preview] [Manage]              │  │  ← Clear labeled buttons
│  └────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────┐  │
│  │ 📋 Another Project                 ○ Draft     │  │  ← Draft = not yet shared
│  │    Code • Client                                │  │
│  │    Not shared yet                               │  │
│  │    [Share project]             ← primary action │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  ← 1  2  3 →                                         │  ← Working pagination
└──────────────────────────────────────────────────────┘
```

Key changes from current:
- **Primary CTA "Share a project"** in the header (opens project picker → wizard).
- **Card layout** instead of dense table (works on mobile, scannable on desktop).
- **Clear labeled buttons** (Copy link / Preview / Manage) instead of icon-only.
- **Draft cards** show "Share project" as the primary action (not just a row).
- **Working pagination** at the bottom.
- **Mobile-responsive**: cards stack, table view optional on desktop.

### Publish wizard — guided step flow

Replaces the buried 6-tab drawer for first-time publishing:

```text
Step 1: Select estimates
┌───────────────────────────────────────┐
│  Share "Project Name"            1/4  │
│  Choose which estimates to include    │
│  ───────────────────────────────────  │
│  ☑ Kitchen estimate      ₱450,000     │
│  ☑ Bathroom estimate     ₱180,000     │
│  ☐ Living room estimate  ₱320,000     │
│  ───────────────────────────────────  │
│  Total: ₱630,000 (2 of 3 selected)    │
│                       [Cancel] [Next] │
└───────────────────────────────────────┘

Step 2: Access settings
┌───────────────────────────────────────┐
│  Share "Project Name"            2/4  │
│  Who can see this link?               │
│  ───────────────────────────────────  │
│  ○ Anyone with the link               │
│  ● Only people with the password      │
│    Password: [________________] 👁    │
│  ───────────────────────────────────  │
│  Expires: [Never ▾] or [Date picker]  │
│                       [Back]  [Next]  │
└───────────────────────────────────────┘

Step 3: Generate
┌───────────────────────────────────────┐
│  Share "Project Name"            3/4  │
│  Ready to create your link            │
│  ───────────────────────────────────  │
│  2 estimates • Password protected     │
│  [Create link]        ← primary CTA   │
└───────────────────────────────────────┘

Step 4: Success + send
┌───────────────────────────────────────┐
│  ✅ Your link is ready!          4/4  │
│  ───────────────────────────────────  │
│  https://archestimator.com/share/...  │  ← Selectable URL
│  [📋 Copy] [📱 QR Code] [👁 Preview]  │
│  ───────────────────────────────────  │
│  Send to clients:                     │
│  [email1@...] [email2@...] [+ Add]   │
│  [Send invitations]                   │
│  ───────────────────────────────────  │
│  [Done]  [Open manage panel]          │
└───────────────────────────────────────┘
```

The existing `PublisherDrawer` (6 tabs) remains available for advanced management
(editing recipients, rotating links, viewing activity, changing settings) but the
**first publish AND republish** go through the wizard (REQ-014). The drawer is
opened via "Manage" on a card — it is NOT the primary publish/update path.

### Wizard mobile form factor (REQ-012)

On viewports under 768px, the wizard renders as a **full-screen bottom sheet**:
- Step indicator (1/4, 2/4, 3/4, 4/4) is a sticky top bar.
- Content fills the viewport between the indicator and a sticky Cancel/Next footer.
- The success step stacks affordances vertically: Copy link (full-width), Preview
  (full-width), Send invitations (if email configured, full-width), Done (full-width).
- The QR code is **hidden on mobile** (REQ-013) — replaced by a "Share link" button
  using the native Web Share API (`navigator.share`) if available, with Copy as
  fallback. A QR code is useless when you're already holding the phone.

### Wizard accessibility (REQ-011)

Beyond the basic focus-trap/Escape/return pattern:
- **Step-change announcements:** When the user clicks "Next" or "Back", an
  `aria-live="polite"` region announces the new step (e.g., "Step 2 of 4: Access
  settings"). Focus moves to the step heading.
- **Focus management between steps:** On step transition, focus moves to the new
  step's heading (or first interactive element if no heading). This is the most
  common wizard-a11y failure and must be explicit.
- **Keyboard navigation:** All controls within each step are in a logical tab order.
  The sheet/modal traps Tab within the wizard. Escape closes (with confirmation if
  mid-publish to prevent accidental data loss).
- **Progress indicator:** The step indicator uses `role="progressbar"` with
  `aria-valuenow`, `aria-valuemax="4"`.

### Accessibility — Publisher

- All interactive elements keyboard-reachable with visible focus rings.
- Wizard modal traps focus, supports Escape to close, returns focus to trigger.
- Card buttons have `aria-label` with project name context.
- Status badges use `aria-label` (not just color).
- `aria-busy` on roster during transitions.
- Pagination controls are nav with `aria-label="Pagination"` and `aria-current="page"`.
- Search input has associated `<label>` (not just placeholder).
- Mobile: minimum 44px touch targets, no hover-only interactions.

## Shared Link (Recipient) Redesign

### Page structure — improved hierarchy

```text
┌──────────────────────────────────────────────────────┐
│  [Firm/Workspace Name]           Proposal Review     │  ← Sender branding
│                                                      │
│  Kitchen Renovation Project                          │  ← Project name (h1)
│  Prepared for ABC Construction • Code KR-2026-001   │
│  [● Pending your review]  or  [✓ Approved]          │  ← Dynamic status
├──────────────────────────────────────────────────────┤
│  Proposal Total                                      │
│  ₱ 630,000.00                                        │
│  2 sheets • 47 line items • Valid until Dec 31      │  ← Expiry shown
├──────────────────────────────────────────────────────┤
│  [Cover image or branded placeholder]                │
├──────────────────────────────────────────────────────┤
│  Estimates                                           │
│  [Kitchen ▾] [Summary | Details]                     │
│  ...estimate content...                              │
│  ...                                                  │
├──────────────────────────────────────────────────────┤
│  Discussion (3 comments)                             │
│  ...comments with dates and author badges...         │
├──────────────────────────────────────────────────────┤
│  Your Response                                       │
│  [Approve] [Request changes] [Decline]              │
├──────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────    │
│  │ [Approve] [Request changes]    ← sticky bar      │  ← Sticky decision bar
│  └───────────────────────────────────────────────    │  (desktop, appears on scroll)
└──────────────────────────────────────────────────────┘
```

### Key UX changes

| Change | Current | Proposed |
|---|---|---|
| Header status | Static "Awaiting your review" | Dynamic: reflects decision state |
| Sender branding | None (project cover only) | Workspace/firm name in header |
| Decision CTA | Bottom of page only | Sticky bar on desktop; mobile bottom-nav |
| Session banner | Non-actionable text | "Reviewing as {email}" or "Open your email link to respond" with explanation |
| Cover image | Silent null if missing | Branded placeholder with project initials |
| Expiry | Not shown | Shown in summary card |
| Row actions | Button on every row | Row-click/hover to select; "Ask about this item" in a detail panel |
| Cost donut | Hardcoded PHP/USD | Locale-aware `Intl.NumberFormat` |
| Comments | Flat, time-only, nested scroll | Dates, author badges, page scroll |
| Print/PDF | Hidden (user must know Ctrl+P) | Visible "Download PDF" button |
| View toggle labels | "Scope outline" / "Line item table" | "Summary" / "Details" |

### Mobile bottom nav improvements

- Add scroll-spy (highlight active section).
- Make "Summary" anchor point to the summary card (currently above the workspace).
- Ensure safe-area-inset-bottom padding works on iOS Safari.

### Accessibility — Shared Link

- All existing a11y patterns (roving tabindex, ARIA tablist, `aria-live` regions)
  are preserved — the current components are already a11y-rigorous.
- Sticky decision bar must not trap focus or obscure content.
- "Download PDF" button has `aria-label` describing the action.
- Dynamic header status uses `role="status"` with `aria-live="polite"`.
- Password toggle button has `aria-label="Show password"` / `aria-label="Hide password"`.
- Comment author distinction uses visual badge + `aria-label`.
- QR code has accessible name and `role="img"`.
- All new interactive elements: minimum 44px touch targets, visible focus.

## Component Reuse Strategy

Reuse from `src/components/ui/`:
- `Drawer` (for the wizard modal / advanced manage panel)
- `Dialog` / `ConfirmDialog` (for confirmations)
- `Tabs` (for view toggles)
- `Tooltip` (for icon buttons)
- `Button` variants (primary/secondary/danger)
- `Input`, `Label`, `Checkbox`
- `Badge` (for status indicators)
- `Skeleton` (for loading states)

New components needed:
- `ShareWizard` (the guided publish flow)
- `ShareLinkDisplay` (URL + copy + QR)
- `ClientPreviewBanner` (preview-mode indicator)
- `StickyDecisionBar` (desktop floating CTA)
- `ProposalStatusBadge` (dynamic header status)
- `SenderBrandingHeader` (workspace name/logo)
- `CoverImagePlaceholder` (project initials fallback)
- `CommentItem` (redesigned with date + author badge)

## DESIGN.md Alignment

`DESIGN.md` is alpha-stage — defer to Philip on visual decisions. This plan
specifies structural/behavioral UX changes (hierarchy, flow, terminology,
accessibility) that are implementation-ready regardless of the evolving visual
language. Visual specifics (colors, spacing, typography) follow the existing
component patterns and `DESIGN.md` guidance where it exists, and are subject to
Philip's design direction during implementation.
