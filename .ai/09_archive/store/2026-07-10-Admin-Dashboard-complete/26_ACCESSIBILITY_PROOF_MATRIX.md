# 26 — Accessibility Proof Matrix

**Created:** 2026-07-09 (Asia/Manila)
**Purpose:** Action-level WCAG 2.2 AA proof matrix per admin surface.
Closes GAP-6 from `20`. Pairs with `05` (high-level a11y plan) and `22`
(wireframes).

This is planning-only. It defines what to prove and how; it does not
implement.

---

## 26.1 Method

For every interactive admin surface, this matrix names:
- **Surface:** the page/component.
- **Action:** what the user does (e.g., "Toggle feature flag").
- **Keyboard path:** keys to reach + activate (Tab/Shift+Tab/Enter/Esc/arrow keys).
- **Focus target:** where visible focus lands on activation.
- **Focus restoration:** where focus returns after the action closes.
- **Accessible name:** how it's named for screen readers.
- **Live-region behavior:** if updates announce (e.g., `aria-live="polite"`).
- **Proof type:** DOM test, keyboard test, or browser/visual QA.
- **WCAG SC:** the relevant Success Criteria.

WCAG 2.2 AA SCs most relevant to admin work:
- 1.3.1 Info and Relationships (A)
- 1.4.3 Contrast (Minimum) (AA)
- 1.4.11 Non-text Contrast (AA)
- 1.4.13 Content on Hover or Focus (AA)
- 2.1.1 Keyboard (A)
- 2.1.2 No Keyboard Trap (A)
- 2.4.3 Focus Order (A)
- 2.4.6 Headings and Labels (AA)
- 2.4.7 Focus Visible (AA)
- 2.4.11 Focus Not Obscured (Minimum) (AA) — **new in 2.2**
- 2.5.8 Target Size (Minimum) (AA) — **new in 2.2**
- 3.2.1 On Focus (A)
- 3.2.2 On Input (A)
- 3.3.1 Error Identification (A)
- 3.3.2 Labels or Instructions (A)
- 3.3.3 Error Suggestion (AA)
- 4.1.2 Name, Role, Value (A)
- 4.1.3 Status Messages (AA)

---

## 26.2 Admin shell — sidebar navigation

| Surface | Action | Keyboard path | Focus target | Focus restoration | Accessible name | Live region | Proof type | WCAG SC |
|---|---|---|---|---|---|---|---|---|
| Sidebar | Navigate to Overview | Tab to "Overview" link, Enter | "Overview" link | n/a | `Overview` (text) | n/a | DOM + keyboard test | 2.1.1, 2.4.3, 2.4.7, 4.1.2 |
| Sidebar | Active section indicator | Tab through items; the active one has `aria-current="page"` | Active item | n/a | `<section>, current page` announced | n/a | DOM test | 1.3.1, 4.1.2 |
| Sidebar | Unread conversations badge | Tab to "Support" link; badge announced | "Support" link | n/a | `Support, 3 unread conversations` | n/a | DOM test (aria-label) | 1.3.1, 4.1.2 |
| Sidebar (mobile) | Open sidebar via hamburger | Tab to hamburger button, Enter | First sidebar item | Returns to hamburger on close | `Open navigation` / `Close navigation` (toggled) | n/a | DOM + keyboard test | 2.1.1, 2.4.7, 4.1.2 |
| Sidebar (mobile) | Close sidebar (SheetDrawer) | Esc or click outside | Hamburger button | Hamburger button | `Close navigation` (on the × button) | n/a | DOM + keyboard test | 2.1.2, 2.4.3, 4.1.2 |
| Avatar menu | Open dropdown | Tab to avatar button, Enter/Space | First menu item | Returns to avatar on close | `Account menu` | n/a | DOM + keyboard test | 2.1.1, 2.1.2, 2.4.7 |
| Avatar menu | Navigate menu items | Arrow Up/Down (Radix pattern) | Each menu item in turn | n/a | Each item's text (e.g., "Sign out") | n/a | DOM test | 2.1.1, 4.1.2 |

---

## 26.3 Overview — tiles and strips

| Surface | Action | Keyboard path | Focus target | Focus restoration | Accessible name | Live region | Proof type | WCAG SC |
|---|---|---|---|---|---|---|---|---|
| Presence counter | Receive live update | n/a (passive) | n/a | n/a | `Users online` (label) | `polite` announces new count | DOM test (aria-live + aria-atomic) | 4.1.3, 1.3.1 |
| Presence counter | Read stale value during WS disconnect | n/a | n/a | n/a | `Users online, last known value` (subline) | `polite` announces "Reconnecting" | DOM test | 4.1.3 |
| Metric card (e.g., Signups) | Hover/focus tooltip | Tab to card; tooltip appears | Card | n/a | `Signups (7d): 8` (label + value) | n/a | DOM test | 1.4.13, 4.1.2 |
| Metric card (clickable) | Navigate | Tab to card, Enter | n/a (navigates) | n/a | `<Label>` (e.g., "Open tickets, 3, click to view support inbox") | n/a | DOM + keyboard test | 2.1.1, 4.1.2 |
| Incident strip | Read open incidents | n/a | n/a | n/a | Each item: `[sev2] <title>, opened <time>` | n/a | DOM test | 1.3.1 |
| Health strip | Read probe status | n/a | n/a | n/a | `D1: ok, 4ms` per probe (label + status + detail) | n/a | DOM test | 1.3.1, 1.4.1 (uses StatusBadge color+text) |
| "Refresh" button | Click | Tab to button, Enter | Button | Stays on button | `Refresh overview` | Toast on success/failure | DOM + keyboard test | 2.1.1, 4.1.3 |
| Refresh button | Loading state | n/a | n/a | n/a | `Refreshing…` (button label changes + `aria-busy="true"`) | n/a | DOM test | 4.1.3 |

---

## 26.4 Users — table + drawer

| Surface | Action | Keyboard path | Focus target | Focus restoration | Accessible name | Live region | Proof type | WCAG SC |
|---|---|---|---|---|---|---|---|---|
| Search input | Type search query | Tab to input, type | Input | n/a | `Search by email prefix` (label) | n/a | DOM + keyboard test | 2.1.1, 3.3.2 |
| Role filter | Open and select | Tab to dropdown, Enter to open, Arrow keys + Enter | Trigger button → selected item | Trigger button after select | `Filter by role` (label) | n/a | DOM + keyboard test | 2.1.1, 4.1.2 |
| Pagination | Navigate pages | Tab to "Next" / page number, Enter | The clicked control | n/a | `Page 2`, `Next page`, `Previous page` | n/a | DOM + keyboard test | 2.1.1, 4.1.2 |
| Row click | Open user drawer | Tab to row, Enter | Drawer's first focusable element | Returns to the row on close | Row announced as `Jane D., jane@example.com, member, created 5m ago, last session active` | n/a | DOM + keyboard test | 2.1.1, 2.1.2, 2.4.3, 4.1.2 |
| User drawer | Close drawer | Esc or click × or click outside | × button first | Returns to triggering row | `Close` (on ×) | n/a | DOM + keyboard test | 2.1.2, 4.1.2 |
| User drawer | Focus trap | Tab cycles within drawer only | Within drawer | n/a | n/a | n/a | DOM test | 2.1.2 |
| Export CSV | Click | Tab to button, Enter | Button | Stays on button | `Export users as CSV` | Toast on success | DOM + keyboard test | 2.1.1, 4.1.3 |
| Empty state | Read | n/a | n/a | n/a | `No users yet. Invite someone.` | n/a | DOM test | 1.3.1, 3.3.2 |
| Error state | Retry | Tab to Retry, Enter | Retry button | n/a | `Retry loading users` | n/a | DOM + keyboard test | 2.1.1, 3.3.1 |

---

## 26.5 Support inbox

| Surface | Action | Keyboard path | Focus target | Focus restoration | Accessible name | Live region | Proof type | WCAG SC |
|---|---|---|---|---|---|---|---|---|
| Conversation list | Select conversation | Tab to item, Enter | First message in thread (or composer if empty) | Returns to list item on Esc | `Jane D., 2 minutes ago, unread, "Hi, I can't..."` | n/a | DOM + keyboard test | 2.1.1, 4.1.2 |
| Conversation list | Status filter | Tab to dropdown, Enter to open, Arrow + Enter | Trigger button | Trigger button | `Filter by status` | n/a | DOM + keyboard test | 2.1.1, 4.1.2 |
| Thread | New inbound message | n/a (passive) | n/a | n/a | n/a | `polite` announces `New message from {sender}` | DOM test (aria-live) | 4.1.3 |
| Thread | XSS-safe render | n/a | n/a | n/a | Body as plain text (no `dangerouslySetInnerHTML`) | n/a | DOM test | 1.3.1 |
| Composer | Type reply | Tab to textarea, type | Textarea | n/a | `Type your reply` (label) | n/a | DOM + keyboard test | 2.1.1, 3.3.2 |
| Composer | Send reply | Cmd/Ctrl+Enter OR Tab to Send button, Enter/Space | Send button (briefly) then new message in thread | Composer (for next reply) | `Send reply` | n/a | DOM + keyboard test | 2.1.1, 4.1.2 |
| Composer | Body length validation | Type > 10000 chars | n/a | n/a | Inline error: `Reply must be 10,000 characters or less (currently 10,123)` | `assertive` for the error | DOM test | 3.3.1, 3.3.3, 4.1.3 |
| Send failure | Read error | n/a | n/a | n/a | `Last send failed` banner + retry button | `polite` announces | DOM test | 4.1.3 |
| WS disconnect banner | Read state | n/a | n/a | n/a | `Reconnecting…` amber banner | `polite` announces | DOM test | 4.1.3 |
| Status badge (open/pending/resolved) | Read | n/a | n/a | n/a | `Status: open` (color + text, not color-only) | n/a | DOM test | 1.4.1 |

---

## 26.6 Analytics tiles

| Surface | Action | Keyboard path | Focus target | Focus restoration | Accessible name | Live region | Proof type | WCAG SC |
|---|---|---|---|---|---|---|---|---|
| Provider tile (configured) | Read metrics | n/a | n/a | n/a | `Cloudflare Web Analytics, cached 2 hours ago, requests 1234, errors 12` | n/a | DOM test | 1.3.1 |
| Provider tile (not configured) | Read | n/a | n/a | n/a | `Cloudflare Web Analytics, not configured` | n/a | DOM test | 1.3.1, 3.3.2 |
| Provider link-out | Navigate | Tab to link, Enter | n/a | n/a | `Open in Cloudflare` | n/a | DOM + keyboard test | 2.1.1, 4.1.2 |
| Refresh all | Click | Tab to button, Enter | Button | Stays on button | `Refresh all analytics` | Toast on done | DOM + keyboard test | 2.1.1, 4.1.3 |

---

## 26.7 Feature flags

| Surface | Action | Keyboard path | Focus target | Focus restoration | Accessible name | Live region | Proof type | WCAG SC |
|---|---|---|---|---|---|---|---|---|
| Flag toggle | Toggle | Tab to Switch, Space/Enter | Switch thumb | Stays on switch | `Toggle admin_support_realtime` (aria-label uses flag key) | n/a | DOM + keyboard test | 2.1.1, 4.1.2 |
| Flag toggle | Status announce | n/a | n/a | n/a | `on` / `off` (text label, not color-only) | n/a | DOM test | 1.4.1 |
| Flag toggle | Optimistic / failure | n/a | n/a | n/a | n/a | `polite` announces `Flag updated` or `Couldn't update flag, reverted` | DOM test | 4.1.3 |
| Add flag modal | Open | Tab to "Add flag" button, Enter | First input (key field) | Returns to "Add flag" button on close | `Add flag` | n/a | DOM + keyboard test | 2.1.1, 2.1.2 |
| Add flag modal | Submit / cancel | Tab to Submit or Cancel, Enter | n/a | n/a | `Save`, `Cancel` | Toast on save | DOM + keyboard test | 2.1.1, 4.1.3 |

---

## 26.8 Audit log

| Surface | Action | Keyboard path | Focus target | Focus restoration | Accessible name | Live region | Proof type | WCAG SC |
|---|---|---|---|---|---|---|---|---|
| Filters (action, actor, date range) | Set | Tab to each control; type/select | Each control | n/a | Each labeled (e.g., `Filter by action`) | n/a | DOM + keyboard test | 2.1.1, 3.3.2 |
| Pagination (cursor) | Next/prev | Tab to "Next", Enter | Next button | n/a | `Next page`, `Previous page` | n/a | DOM + keyboard test | 2.1.1 |
| Event row | Expand details | Tab to row, Enter | Row content | n/a | `Action flag.update by Philip, 2 minutes ago, target admin_support_realtime` | n/a | DOM test | 1.3.1, 4.1.2 |
| Export CSV | Click | Tab to button, Enter | Button | Stays on button | `Export audit log as CSV` | Toast on success | DOM + keyboard test | 2.1.1, 4.1.3 |
| DSAR tab | Switch tab | Tab to tab, Enter (or Arrow Left/Right per tabs pattern) | Tab panel | n/a | `DSAR queue` (tab label) | n/a | DOM + keyboard test | 2.1.1, 4.1.2, (ARIA tabs pattern) |
| Mark DSAR complete | Click | Tab to button, Enter | Button | n/a | `Mark DSAR request 4 complete` | Toast on done | DOM + keyboard test | 2.1.1, 4.1.3 |

---

## 26.9 Observability

| Surface | Action | Keyboard path | Focus target | Focus restoration | Accessible name | Live region | Proof type | WCAG SC |
|---|---|---|---|---|---|---|---|---|
| Cron health rows | Read | n/a | n/a | n/a | `upload-cleanup cron, last run today 03:00 UTC, status ok` | n/a | DOM test | 1.3.1 |
| Queue health | Read | n/a | n/a | n/a | `UPLOAD_JOBS_QUEUE, depth 2, in-flight 0, DLQ 0` | n/a | DOM test | 1.3.1 |
| View DLQ link | Navigate | Tab to link, Enter | n/a | n/a | `View dead-letter queue` | n/a | DOM + keyboard test | 2.1.1 |
| Client errors list | Read | n/a | n/a | n/a | Each error announced with message + count + route | n/a | DOM test | 1.3.1 |
| Web vitals ratings | Read | n/a | n/a | n/a | `LCP 1.8 seconds, good. INP 180 milliseconds, needs improvement. CLS 0.04, good.` | n/a | DOM test | 1.3.1, 1.4.1 |
| Free-tier gauge bars | Read | n/a | n/a | n/a | `Workers requests 34,000 of 100,000, 34 percent used` | n/a | DOM test | 1.3.1, 1.4.1 |
| Maintenance mode toggle | Toggle | Tab to Switch, Space/Enter | Switch | Stays on switch | `Maintenance mode` (label) + confirmation dialog | `assertive` announces "Maintenance mode enabled" | DOM + keyboard test | 2.1.1, 2.1.2, 4.1.2 |
| Maintenance mode confirmation | Confirm/cancel | Tab to Confirm or Cancel, Enter | Confirm button (default focus) | Returns to Switch on cancel | `Enable maintenance mode`, `Cancel` | n/a | DOM + keyboard test | 2.1.1, 2.4.3 |
| External link (Workers Obs) | Navigate | Tab to link, Enter | n/a | n/a | `Open Cloudflare Workers Observability` | n/a | DOM + keyboard test | 2.1.1, 4.1.2 |

---

## 26.10 Charts (recharts dynamic-imported)

| Surface | Action | Keyboard path | Focus target | Focus restoration | Accessible name | Live region | Proof type | WCAG SC |
|---|---|---|---|---|---|---|---|---|
| LineChart | Read trend | n/a (decorative if same data in table) | n/a | n/a | `aria-label` summarizing trend OR `aria-hidden="true"` if data available elsewhere | n/a | DOM test | 1.3.1, 1.4.1 |
| LineChart | Tabular alternative | n/a | n/a | n/a | Adjacent `<table>` with the raw data points | n/a | DOM test | 1.3.1, 1.4.1, 4.1.2 |
| LineChart tooltip | Hover point | Mouse hover; keyboard equivalent = the tabular alternative | n/a | n/a | Visible on hover/focus (1.4.13) | n/a | DOM test | 1.4.13 |

**Note:** Charts MUST NOT be the sole source of data. Each chart has a
tabular alternative (visible or screen-reader-only) so blind users can read
the values. This is non-negotiable per WCAG 1.3.1.

---

## 26.11 Toasts / banners / dialogs

| Surface | Action | Keyboard path | Focus target | Focus restoration | Accessible name | Live region | Proof type | WCAG SC |
|---|---|---|---|---|---|---|---|---|
| Toast (success) | Read | n/a (passive) | n/a | n/a | n/a | `polite` announces message | DOM test | 4.1.3 |
| Toast (error) | Read | n/a | n/a | n/a | n/a | `assertive` announces message | DOM test | 4.1.3 |
| Toast action (Retry) | Click | Tab to Retry, Enter | Retry button | Returns to toast | `Retry` | n/a | DOM + keyboard test | 2.1.1 |
| Confirm dialog | Open | n/a (triggered by toggle) | Confirm button (default) | Returns to toggle on close | `Enable maintenance mode?` (h2) | n/a | DOM + keyboard test | 2.1.2, 2.4.3, 4.1.2 |
| Confirm dialog | Close | Esc | n/a | Triggering toggle | n/a | n/a | DOM + keyboard test | 2.1.2 |
| SheetDrawer (mobile sidebar / user drawer) | Open / close | Tab to trigger, Enter / Esc to close | First focusable / returns to trigger | Trigger | n/a | n/a | DOM + keyboard test | 2.1.2 |
| Banner (offline / reconnecting) | Read | n/a | n/a | n/a | Banner text | `polite` | DOM test | 4.1.3 |

---

## 26.12 Cross-cutting requirements

These apply everywhere, not per-surface:

| Requirement | How enforced | Proof | WCAG SC |
|---|---|---|---|
| Visible focus ring | `--focus` token applied via global CSS | LSP / DOM test that focus style is present | 2.4.7 |
| Focus not obscured | No `overflow: hidden` clipping the focused element; no sticky elements covering it | Visual QA where layout risk exists | 2.4.11 (2.2) |
| Target size ≥ 24×24 CSS px | Tailwind sizing utilities; custom check | DOM test measuring bounding rect | 2.5.8 (2.2) |
| Color contrast ≥ 4.5:1 (text) | Reuse existing tokens (already AA-verified) | Visual QA on new badge combinations | 1.4.3 |
| Non-text contrast ≥ 3:1 | StatusBadge pairs color with text/icon | DOM test (text present) | 1.4.11 |
| Reduced motion | `prefers-reduced-motion: reduce` respected | DOM test (no autoplay animations) | 1.4.10 (AAA, but applied as best practice) |
| No keyboard trap | Every modal/drawer has Esc + close button + focus restoration | Keyboard test | 2.1.2 |
| Page landmarks | `<nav>`, `<main>`, `<header>` per route | DOM test | 1.3.1, 2.4.1 |
| Heading hierarchy | One `<h1>` per page, `<h2>`/`<h3>` in order | DOM test (axe-core) | 1.3.1, 2.4.6 |
| Form labels | Every input has explicit `<label>` or `aria-label` | DOM test | 3.3.2, 4.1.2 |
| Error identification | Inline errors with `role="alert"` or `aria-live` | DOM test | 3.3.1, 4.1.3 |

---

## 26.13 Test execution plan

| Layer | Tool | Coverage |
|---|---|---|
| Static / DOM | `vitest` (RTL) + `@axe-core/playwright` (optional) | All "DOM test" rows above |
| Keyboard | `vitest` (RTL `userEvent.keyboard`) | All "keyboard test" rows |
| Browser / visual QA | Playwright + `visual-qa` skill | Triggered only for browser-only claims (see 22.13) |
| Screen reader | Manual VoiceOver / NVDA sample | Triggered for high-risk surfaces only (support inbox, user drawer) |

**Axe-core run:** `bun run test:dom -- admin-a11y` should produce zero
critical/serious violations on admin surfaces.

**Manual screen reader pass:** once per major release, run VoiceOver on:
1. Overview — verify live announcements.
2. Support inbox — verify new message announcements + composer status.
3. User drawer — verify focus trap + restoration.

---

## 26.14 What this doc does NOT specify

- Final color/contrast choices beyond existing tokens (assumed AA).
- Animations beyond "respect reduced motion."
- Specific a11y testing library imports (axe-core recommended but
  optional if a stronger tool is preferred at impl time).
- Mobile native accessibility (admin is web responsive, not native).

---

## 26.15 Confirmation

No application code, tests, migrations, schemas, `wrangler.jsonc`,
`package.json`, provider state, or runtime data were modified. All writes
are confined to `.ai/03_plans/2026-07-08/Admin-Dashboard-Planning/`.
