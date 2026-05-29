# UX / UI Specification — Shared Link Overhaul

**Date:** 2026-05-28
**Status:** Ready for implementation planning.

This specification defines the user experience, layout layouts, visual assets, interactive states, and mobile behaviors for the manager and receiver surfaces.

---

## 1. User Personas

### Persona A: The Project Estimator (Sender)
- **Role**: Estimator, Project Manager, or Business Development Lead at a design-build firm.
- **Goal**: Share pricing options and bills of quantities with a prospective client. Wants to hide internal workspace sheets (such as general requirements or supplier cost databases) and only show client-facing sheets. Wants to know when the client opened the proposal and easily receive their feedback or approval.
- **Pain Points**: Current stacked PDF or vertical web views feel messy and overwhelming. Cannot control which parts of the workspace are visible, forcing them to duplicate projects or estimates.
- **Device**: Primarily desktop (macOS/Windows), occasionally iPad for site visits.

### Persona B: The Client / Real Estate Developer (Recipient)
- **Role**: Property Developer, Owner, General Contractor, or Client Representative.
- **Goal**: Quickly review the proposed costs, check details of specific disciplines (e.g. finishes vs electrical systems), ask questions about specific items, and accept the final proposal.
- **Pain Points**: Sifting through a massive vertically stacked list of numbers is confusing. Navigating via phone on-site is difficult. Hard to tie comments to specific sheets.
- **Device**: Mixed — desktop in office, mobile (iOS Safari / Android Chrome) on construction sites.

### Persona C: The Subcontractor / Specialist Reviewer
- **Role**: M&E engineer, Finishes consultant, or Structural specialist invited to review only their discipline.
- **Goal**: Verify that their scope is accurately represented and priced. Flag discrepancies without seeing unrelated disciplines.
- **Pain Points**: Receiving a full project PDF and having to manually find their sections.
- **Device**: Mobile-heavy — reviewing on-site between inspections.

---

## 2. Step-by-Step Happy Paths

### Path A: Owner Curates & Shares Estimate Sheets
1. Owner opens project estimates view and clicks the **"Shared link"** button in the top-right header workspace bar.
2. The modal slides open. The owner navigates to the **"Sheets"** tab, revealing a list of all estimate sheets (e.g. `ES-001 (Structure)`, `ES-002 (Finishes)`, `ES-003 (M&E)`, `ES-004 (Internal Rates)`).
3. The owner checks boxes for `ES-001` and `ES-002` only, leaving the rest unchecked.
4. The owner selects the **"Access"** tab, checks "Require password", and inputs a password.
5. The owner selects the **"Recipients"** tab, types `client@example.com`, and clicks **Add**.
6. The owner clicks **"Generate shared link"**. The modal shows:
   - A copyable URL.
   - A "Send email" button that triggers delivery to the listed recipients.
   - Delivery status chips: "Pending", "Sent", "Opened".

### Path B: Client Reviews & Approves Estimates
1. Client receives an email: *"Philip Lewis shared a proposal with you — Valencia Residence"*.
2. Client clicks the unique link from their email.
3. The **Password Gate** screen displays (since password is required). Client enters the password and submits.
4. The receiver page loads, displaying:
   - Project hero image (if available).
   - Project metadata (code, location, client).
   - Horizontal tabs: `Structure` and `Finishes`.
   - A sidebar (desktop) or bottom sheet (mobile) for comments.
5. Client clicks on the `Finishes` tab. The table dynamically switches to show row items for finishes.
6. Client types a question in the feedback composer: *"Is the marble tile selection imported or local?"* and clicks **"Post comment"**.
7. Client clicks the primary success button: **"Accept Estimates"**. A confirmation modal displays: *"This will notify the project manager. Proceed?"*
8. Client confirms. The decision is recorded, the button group is replaced by a static badge: **"Accepted on May 28, 2026"**, and the view transitions to a read-only success state.

### Path C: Owner Receives Notification & Responds
1. Owner is in the Workshop. A subtle dot appears on the project card or sidebar.
2. Owner opens the project and clicks "Shared link".
3. In the modal, the **"Activity"** tab shows:
   - "Client opened the link — 10 minutes ago"
   - "Client posted a comment — 'Is the marble tile...' — 5 minutes ago"
   - "Client accepted the estimate — 2 minutes ago"
4. Owner clicks **"Reply"** next to the comment to post an internal or client-facing response.

---

## 3. Sad Paths & Edge Cases

| Scenario | Behavior | UI Presentation |
|----------|----------|-----------------|
| **Link Revoked or Expired** | Public page lookup fails to resolve the token. | Renders a generic neutral warning card: *"This link is no longer active. Please contact the project manager for a new link."* |
| **Password Locking** | Recipient enters incorrect passwords 5 times. | Blocks input for 15 minutes. Displays alert: *"Too many attempts. Please try again later."* |
| **Multiple Decisions** | Recipient tries to click "Accept" twice or modify a decision. | If a decision already exists in `shared_link_responses`, the button group is disabled and replaced by a static badge: `Accepted on [date]`. |
| **Owner Selects 0 Estimates** | `createProjectPublication` receives an empty `selectedEstimateIds` array. | **Two options**: (A) Show a validation error in the modal: *"Select at least one estimate sheet."* (B) Allow empty array but show an empty-state message on the receiver page. **Decision**: Option A — block creation with validation error. |
| **Email Bounces** | SMTP/Resend returns a hard bounce. | Update `shared_link_recipients.delivery_status` to `bounced`. Show a yellow warning chip in the manager modal next to the recipient. |
| **Recipient Opens Without Token** | Client opens `/share/[token]` without `?recipient=...` query param. | They can still view the proposal (if password is correct), but the comments and decision UI are hidden or show a "Verify your email to interact" prompt. |
| **No Internet on Mobile** | Client tries to post a comment while offline. | Show an inline error: *"Connection lost. Your comment will be sent when you're back online."* (Optimistic UI with retry). |
| **Very Long Comment** | Recipient types > 1,000 characters. | Client-side maxlength counter + server-side truncation with a polite error: *"Comments must be under 1,000 characters."* |
| **Snapshot Version Mismatch** | Owner republishes while client is viewing an old tab. | On the next comment/decision POST, server checks `snapshot_version`. If mismatch, return `409 Conflict` with message: *"This proposal has been updated. Please refresh the page."* |

---

## 4. Visual Layout & Interactive States

### Manager UI (Workspace Modal)
- Follows the strict **SF Pro compact system** from `DESIGN.md`:
  - Modals maximum width `512px` (`max-w-xl`).
  - Navigation tabs inside modal: `10px` medium, regular outline icons, background `#F5F5F5` for active state.
  - Multi-select list: 32px height rows with clean vertical alignment. Checkboxes are thin-bordered with standard accent checks.
- **Tabs inside modal**:
  1. **Sheets** — Estimate checklist with sheet code, name, and row count.
  2. **Access** — Password toggle + expiration date picker.
  3. **Recipients** — Email input with chip list, delivery status, and "Send email" button.
  4. **Activity** — Chronological feed of opens, comments, and decisions (read-only).

### Receiver UI (`/share/[token]`)
- Background set to `proposalPaper: #FFFDF8` to give a crisp, client-facing document feeling.
- **Hero Image**: Optional wide crop `4:1` aspect ratio at the top displaying the project's cover image from `projects.metadata`.
- **Meta Bar**: Project name, code, client, location, and "Published total" in a clean horizontal strip.
- **Tabs**: Horizontal segmented control. Clean hairline border bottom. Active tab has `#292929` bottom border indicator (2px thick). If >3 tabs, horizontal scroll with subtle fade masks on edges.
- **Estimate Table**: `overflow-x-auto` wrapper. Fixed column widths. Description column gets `min-w-[200px]` to prevent crushing.
- **Feedback & Comments**:
  - **Desktop**: Renders as a sticky sidebar on the right (width 320px) with a collapsible chevron.
  - **Mobile**: Stacks below the active estimate table. Collapsible accordion header.
- **Buttons**:
  - Accept: Background `#15803D` (success), text white, transition `all 0.15s ease-in-out`.
  - Decline: Background `#FFFFFF`, border `1px solid #B91C1C` (danger), text `#B91C1C`.
  - Post Comment: Background `#292929`, text white.
- **Sticky Footer Action (Mobile Only)**: Accept/Decline button group pins to the bottom of the viewport with a subtle top shadow for easy thumb access.

---

## 5. Copy Matrix

| Context | String Key | Source / Action |
|---------|------------|-----------------|
| Header Trigger | `Share button` | Shared link |
| Modal Title | `Public client link` → | **Shared link** |
| Eyebrow | `Public header` | Client review |
| Header Subtitle | `Public description` | Review the estimate sheets, ask questions, and approve. |
| Button Action | `Create Link` | Generate shared link |
| Button Action | `Republish` | Update shared link |
| Button Action | `New link` | Create new shared link |
| Button Action | `Turn off link` | Turn off shared link |
| Decision Success | `Feedback status` | Decision recorded. The project team has been notified. |
| Comment Placeholder | `Comment placeholder` | Ask a question or leave a note... |
| Empty State — No Comments | `No comments yet` | No comments yet. Be the first to ask a question. |
| Empty State — No Sheets Selected | `Validation error` | Select at least one estimate sheet to share. |
| Email Subject | `Share email subject` | [Name] shared a proposal with you — [Project Name] |
| Email Body Lead | `Share email body` | You have been invited to review the estimate proposal for [Project Name]. Click the link below to view, comment, and approve. |

---

## 6. Mobile & Responsive Layout

- **Estimates Selector**: If there are more than 3 tabs, the horizontal list scrolls smoothly with subtle fading masks on the left/right edges to indicate overflow. Touch target minimum 44x44px.
- **Estimate Table**: The table wrapper is styled with `overflow-x-auto` to allow horizontal swipe on phones. Column widths are fixed to prevent content overlapping. Pin the "Total" column to the right for easy cost scanning.
- **Feedback composer**: Stacks below the active estimate sheet table. The textarea expands up to 120px height.
- **Sticky Footer Action**: Accept/Decline button group pins to the bottom of the viewport on mobile screens for easy access. Includes safe-area-inset-bottom padding.
- **Hero Image**: On mobile, switches from 4:1 to 16:9 aspect ratio to preserve vertical real estate.

---

## 7. Accessibility (a11y) Requirements

- **Sheet Picker Checkboxes**: Each checkbox must have an associated `<label>` with the estimate name. Use `aria-describedby` to link the row count.
- **Tabs**: Must implement the WAI-ARIA Tabs pattern:
  - `role="tablist"` on the container.
  - `role="tab"` on each button with `aria-selected` and `aria-controls` pointing to the panel.
  - `role="tabpanel"` on each estimate table wrapper.
  - Left/Right arrow keys move focus between tabs. Enter/Space activate.
- **Comment Composer**: Textarea must have `aria-label="Post a comment"`. The submit button must be a `<button type="submit">`.
- **Live Regions**: Comment list must be wrapped in a container with `aria-live="polite"` so screen readers announce new comments.
- **Decision Buttons**: Must announce state changes via `aria-live="assertive"` when a decision is recorded and buttons are replaced by the static badge.
- **Focus Management**: When a tab is activated, focus should move to the tabpanel or the first focusable element inside it.
- **Color Contrast**: All text on `#FFFDF8` background must meet WCAG 2.1 AA (4.5:1 for normal text, 3:1 for large text).
