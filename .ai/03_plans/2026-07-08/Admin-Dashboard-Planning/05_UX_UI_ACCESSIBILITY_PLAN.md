# 05 — UX, UI, and Accessibility Plan

DESIGN.md is **alpha-stage**; this plan reuses existing tokens + primitives and
defers final visual polish to Philip. No heavyweight design workflow invoked
(proportional verification policy).

## 5.1 Information architecture

```
/admin                       → Overview (live health + realtime + recent signups + incident strip)
/admin/users                 → Users & accounts (table + detail drawer)
/admin/support               → Support inbox (conversation list + thread + reply)
/admin/analytics             → Analytics integrations (CF / Clarity / GA tiles)
/admin/flags                 → Feature flags (toggle list)
/admin/audit                 → Audit log (filterable event table)
/admin/observability         → Observability links (Workers Obs / wrangler tail / dev log)
```

A persistent left **admin sidebar** (new component, distinct from the workshop
`MainSidebar`) provides nav across these seven destinations, plus a header with
the operator identity (`Avatar` + email) and a "back to app" link.

## 5.2 Primary user journeys

### J1 — "How is the product doing right now?" (Overview)
1. Philip signs in via Google OAuth → redirected to `/admin`.
2. Overview Server Component fetches: signups (D1), open incidents (D1), health
   probes (D1/R2/Queue/Email), cached CF/GA/Clarity metrics.
3. Client mounts `useGlobalPresence()` (WebSocket to `GlobalPresence` DO) → live
   "users online now" counter with `aria-live="polite"`.
4. TanStack Query polls `/api/admin/metrics/signups` every 60 s (deferred via
   `requestIdleCallback`).
5. Tiles degrade gracefully if a provider is unavailable.

### J2 — "Who signed up recently?" (Users)
1. `/admin/users` Server Component paginates `user`/`profiles` (≤ 50/page).
2. `DataTable<T>` with email-prefix search (server-side, debounced).
3. Row click → `SheetDrawer` detail (profile, recent sessions, workspace
   memberships, closed-beta link). Read-only MVP.

### J3 — "A user needs help" (Support inbox)
1. `/admin/support` shows conversation list ordered by `last_message_at` desc;
   unread badge in sidebar (`UX-STATE-02`).
2. Selecting a conversation opens the thread; `SupportInbox` DO WebSocket pushes
   new inbound messages within 5 s (`FR-SUPPORT-02`).
3. Philip types a reply → Server Action validates, appends message, sends via
   `EMAIL` binding; optimistic UI, rollback + draft kept on failure
   (`REL-INBOX-02`).
4. Status workflow: open / pending / resolved (manual control).

### J4 — "Toggle a feature flag" (Flags)
1. `/admin/flags` lists `feature_flags` with `Switch` toggles + descriptions.
2. Toggle → Server Action writes row + audit row + invalidates cache.
3. App reads new value within TTL.

### J5 — "Review admin actions" (Audit)
1. `/admin/audit` paginated `admin_audit_events`, filter by action/actor.
2. Read-only; export-to-CSV deferred (P2).

## 5.3 Screen and component states

| Surface | Loading | Empty | Success | Error | Disabled | Offline/degraded |
|---|---|---|---|---|---|---|
| Overview tiles | `Skeleton` | "No data yet" | metrics render | "View in [provider]" link | n/a | last-cached + badge |
| Presence counter | `Skeleton` | 0 | live int | last-known + tooltip | n/a | last-known |
| Users table | `Skeleton` rows | "No users" | paginated rows | retry button | search disabled | cached page |
| Support list | `Skeleton` | "No conversations" | list | retry | send disabled | reconnecting banner |
| Thread | spinner | "No messages" | thread | error+draft kept | send disabled | reconnecting |
| Flags | `Skeleton` | defaults list | toggles | toast | toggle disabled | n/a |
| Audit | `Skeleton` | "No events" | table | retry | filter disabled | n/a |

## 5.4 Component inventory (reuse vs new)

**Reuse from `src/components/ui/`:** `DataTable`, `Card`, `Panel`, `PageHeader`,
`Tabs`, `SegmentedControl`, `Badge`, `DeltaBadge`, `StatusBadge`, `Progress`,
`Skeleton`, `EmptyState`, `Timeline`, `Avatar`, `SheetDrawer`, `Dialog`,
`Popover`, `Tooltip`, `DropdownMenu`, `ScrollArea`, `Switch`, `SearchInput`,
`toast`.

**New (in `src/components/admin/`):**
- `AdminShell.tsx` — layout + sidebar + header (Server Component wrapper).
- `AdminSidebar.tsx` — nav with sections, badges, Phosphor icons.
- `AdminMetricCard.tsx` — KPI card (value, delta, sparkline).
- `AdminPresenceCounter.tsx` — live count + `aria-live`.
- `AdminUsersTable.tsx` — wraps `DataTable` with admin columns.
- `AdminSupportInbox.tsx` — split view (list + thread).
- `AdminSupportThread.tsx` + `AdminSupportComposer.tsx`.
- `AdminAnalyticsTiles.tsx` — provider tiles (link-out + cached metric).
- `AdminFlagsList.tsx` — toggle list.
- `AdminAuditTable.tsx`.
- `AdminCharts.tsx` — thin wrappers over `recharts` (Line/Bar/Area/Spark).

## 5.5 Responsive behavior

- ≥ 1024 px: sidebar persistent, content 2-column grids for metric cards.
- 640–1024 px: sidebar collapsible (icon-only), single-column content.
- < 640 px: sidebar as a `SheetDrawer` (hamburger), tables horizontally
  scrollable, metric cards stack.

## 5.6 Accessibility

- **Keyboard:** every interactive element reachable in logical order; visible
  focus ring (`--focus`); Esc closes drawers/menus; trap focus in modals.
- **Semantics:** `<nav aria-label="Admin">`, `<main>`, section `<h1>`/`<h2>`
  hierarchy; tables via `DataTable` (`<table>` with `<th scope>`); live count
  `aria-live="polite"` + `aria-atomic`.
- **Status cues:** `StatusBadge` pairs color with text/icon (non-color-only).
- **Motion:** no autoplay; CSS transitions respect `prefers-reduced-motion`.
- **Contrast:** reuse tokens (all currently WCAG AA on key surfaces); verify
  badge combinations during implementation.
- **Copy:** inline literals (no i18n); dates via `Intl.DateTimeFormat("en",...)`.

## 5.7 Tailwind v4 / design-system impact

- Reuse existing tokens (`--background`, `--surface`, `--hairline`, `--brand-*`,
  `--success/warning/danger`, `--grad-*`).
- Admin shell MAY use the glass tokens (`:root[data-glass="ready"]`) for visual
  continuity with the workshop, but it is optional and owner-deferred.
- **New dependency:** `recharts` (adds ~150 KB pre-gzip to the admin chunk only;
  code-split via `next/dynamic` so it never loads on non-admin routes).
- `lint:design-system` should pass; no new design tokens required for MVP.

## 5.8 UX regressions to avoid

- Do not alter the public site's analytics wiring (consent-gated) — admin only
  reads/links, never re-injects scripts.
- Do not couple admin layout to `WorkshopPageShell` (keep it standalone so
  workshop changes don't destabilize admin).
- Keep admin client bundle isolated (dynamic import) to protect workshop INP.

## 5.9 Browser-proof decision

Under the Codex App speed guardrail and the repo's proportional verification
policy, the dashboard's UX claims are largely provable by static review + DOM
tests + type/LSP. **Browser proof (Playwright) is opt-in** and recommended only
for: (a) the support inbox realtime flow (J3), (b) the responsive sidebar
collapse at < 640 px, and (c) keyboard focus trap in the user-detail drawer.
Routine tile/table rendering needs only DOM tests.
