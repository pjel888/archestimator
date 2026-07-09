# 22 — UX Wireframes and Screen Specs

**Created:** 2026-07-09 (Asia/Manila)
**Purpose:** Text-based wireframes and concrete copy for every admin screen,
with loading/empty/error/success states. Closes GAP-2 from `20`. Works with
`23` (component APIs) and `26` (a11y proof).

This is planning-only. Wireframes are ASCII-approximations to anchor
implementation, **not final visual designs**. Visual fidelity defers to
Philip (per `05` §5.1: DESIGN.md is alpha).

---

## 22.1 Visual fidelity disclaimer

Final pixel-level visuals are not specified here. Archestimator's
`DESIGN.md` is explicitly alpha-stage; Philip is the design authority. The
wireframes below fix **layout, copy, state, and component choice** so an
implementer can build a working surface without invention. Visual polish
(color tuning, spacing rhythm, typography hierarchy beyond the existing
token system) is deferred to a polish pass with Philip after Phase 3 lands.

What IS fixed here:
- Layout grid (columns, regions, breakpoints)
- Component choice per region (from existing `src/components/ui/`)
- All copy (labels, empty states, errors, tooltips)
- State transitions (loading → empty/success/error)
- Accessibility semantics (landmarks, headings, live regions — see `26`)

What is NOT fixed:
- Final color choices beyond existing tokens
- Animation easing / duration
- Decorative icon choice beyond Phosphor family
- Pixel-perfect spacing (use Tailwind v4 default scale + `DESIGN.md` tokens)

---

## 22.2 Admin shell (chrome around every page)

### Wireframe (≥ 1024 px)

```
┌───────────────────────────────────────────────────────────────────┐
│ [Logo]  Archestimator · Admin            [Philip's Avatar] [▼]     │
├──────────┬────────────────────────────────────────────────────────┤
│ Overview │                                                        │
│ Users    │                                                        │
│ Support  │                                                        │
│   ●  3   │   [Page content streamed from Server Component]        │
│ Analytics│                                                        │
│ Flags    │                                                        │
│ Audit    │                                                        │
│ Observ.  │                                                        │
│          │                                                        │
│ ───────  │                                                        │
│ ← Back   │                                                        │
│   to app │                                                        │
└──────────┴────────────────────────────────────────────────────────┘
```

### Wireframe (640–1024 px)

```
┌───────────────────────────────────────────────────────────┐
│ [≡] Archestimator · Admin            [Avatar] [▼]         │
├───────────────────────────────────────────────────────────┤
│ [icon sidebar rail, collapsible to icons-only]            │
│  ⌂  👥  💬●  📈  🎚  📋  📊                                │
│                                                           │
│  Page content                                             │
└───────────────────────────────────────────────────────────┘
```

### Wireframe (< 640 px)

```
┌─────────────────────────────┐
│ [≡] Admin        [Avatar]   │
├─────────────────────────────┤
│                             │
│  Page content (stacked)     │
│                             │
└─────────────────────────────┘
[≡] → opens SheetDrawer with sidebar
```

### Concrete copy

- Page title pattern: `<section> · Archestimator Admin`
  (e.g., "Overview · Archestimator Admin")
- Avatar menu items: "View profile" (links to `/workshop/settings/profile`),
  "Back to app" (links to `/workshop`), "Sign out" (existing Better Auth
  sign-out).
- Sidebar `● 3` badge on Support = unread conversation count
  (`UX-STATE-02`); `aria-label="Support, 3 unread conversations"`.
- Sidebar group label: `<nav aria-label="Admin sections">`.
- Sidebar footer link: "← Back to app" with `aria-label="Back to workshop"`.

### Component mapping

- `AdminShell.tsx` (Server Component) → wraps `getCurrentUserContext()` gate
- `AdminSidebar.tsx` (Client) → Zustand-collapsed state from
  `admin-ui-store.ts`
- `AdminHeader.tsx` (Server) → reads identity, renders `Avatar` + dropdown
- Sidebar items reuse `SidebarNavItemRow` from `src/components/sidebar/` if
  its API fits (TBD in `23`); otherwise a new `AdminSidebarItem`.

### States

- **Loading (initial):** Full-page `Skeleton` matching the shell layout
  (sidebar skeleton + content skeleton).
- **Auth denied:** `proxy.ts` redirects before reaching shell; user sees
  `/access-required` page (existing).
- **Error:** Shell renders; content area shows `ErrorState` with retry.
- **Offline:** Shell renders from cache; content shows `offline banner`
  ("You're offline. Showing last cached state.").

---

## 22.3 Overview (`/admin`)

### Wireframe

```
┌────────────────────────────────────────────────────────────────┐
│ Overview                                          [Refresh ↻]  │
│ Today · Wed Jul 9                                               │
├────────────────────────────────────────────────────────────────┤
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │
│ │ Users online │ │ Signups (7d) │ │ Open tickets │             │
│ │      12      │ │      8       │ │      3       │             │
│ │   ● live     │ │  +2 vs prev  │ │   1 urgent   │             │
│ └──────────────┘ └──────────────┘ └──────────────┘             │
│                                                                │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ Incident strip                                           │  │
│ │ • [sev2] DB latency spike — opened 2h ago               │  │
│ │ No open sev1.                                           │  │
│ └──────────────────────────────────────────────────────────┘  │
│                                                                │
│ ┌────────────────────────┐  ┌────────────────────────────┐    │
│ │ Recent signups         │  │ Health strip                │    │
│ │ • jane@example.com  5m │  │ D1:    ● ok   4ms           │    │
│ │ • john@example.com 1h  │  │ R2:    ● ok                  │    │
│ │ • ...                  │  │ Queue: ● 2 jobs (max 5)      │    │
│ │ [See all →]            │  │ Email: ● ok                  │    │
│ └────────────────────────┘  │ Cron:  ● last 03:00 UTC ok  │    │
│                              │ Backup: ● verified 2h ago   │    │
│                              └────────────────────────────┘    │
│                                                                │
│ ┌────────────────────────┐  ┌────────────────────────────┐    │
│ │ Onboarding funnel      │  │ Closed-beta funnel          │    │
│ │ Signup       42        │  │ Invited   18                │    │
│ │ First estimate  21     │  │ Accepted  12                │    │
│ │ First proposal  7      │  │ First action 8              │    │
│ │ (last 30 days)         │  │ (last 30 days)              │    │
│ └────────────────────────┘  └────────────────────────────┘    │
│                                                                │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ Request & error trend (last 24h)  [CF Analytics link →]  │  │
│ │ [LineChart placeholder — link-out only until OPEN-3]     │  │
│ └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

### Concrete copy

- Page heading (h1): `Overview`
- Subheading: `Today · Wed Jul 9` (formatted via `Intl.DateTimeFormat("en", { weekday: 'short', month: 'short', day: 'numeric' })`)
- "Users online" tile:
  - Label: `Users online`
  - Value: live count (integer, `aria-live="polite"`)
  - Status line: `● live` (with `StatusBadge` variant `success`)
  - Tooltip: `Updated within 5 seconds. Counts authenticated WebSocket connections.`
- "Signups (7d)" tile:
  - Label: `Signups (7d)`
  - Value: integer count
  - Delta: `+2 vs prev` (or `−1 vs prev` / `no change`), `DeltaBadge` component
- "Open tickets" tile:
  - Label: `Open tickets`
  - Value: integer
  - Subline: `1 urgent` if any conversation has been open > 24h, else `none urgent`
  - Click → navigates to `/admin/support`
- Incident strip:
  - Empty state: `No open incidents.`
  - Single line per incident: `• [sev{N}] {title} — opened {humanized-time}`
  - sev1 → red StatusBadge, sev2 → amber, sev3 → neutral
- Recent signups:
  - Header: `Recent signups`
  - Row: `• {email} {relative-time}` (e.g., `5m`, `1h`, `2d`)
  - Footer link: `See all →` → `/admin/users`
- Health strip:
  - Per-binding row: `{Label}: {StatusBadge} {detail}`
  - D1 detail: `4ms` (probe latency)
  - R2 detail: blank (just status)
  - Queue detail: `2 jobs (max 5)` (current depth vs DLQ threshold)
  - Email detail: blank
  - Cron detail: `last 03:00 UTC ok` (last successful cron)
  - Backup detail: `verified 2h ago` (last restore-rehearsal timestamp)
- Onboarding funnel / Closed-beta funnel:
  - Standard 3-stage funnel display
  - Subtitle: `(last 30 days)`

### Loading state

Each tile streams in independently via Suspense boundaries; tiles don't
block each other on load. Use per-tile `Skeleton` matching the final shape.

### Empty state

- "Users online": `0` value with tooltip `No authenticated users online right now.`
- "Signups (7d)": `0` value, delta `none yet`, tooltip `No signups in the last 7 days.`
- "Open tickets": `0` value, subline `none urgent`, tooltip `All conversations closed.`
- Incident strip: `No open incidents.`
- Recent signups: `No signups yet.` (with CTA `Invite someone →` linking to closed-beta allowlist UI)
- Onboarding/Closed-beta funnels: `0` at each stage

### Error state

- Per-tile error: tile body becomes `ErrorState` with:
  - Title: `Couldn't load {tile-name}`
  - Body: short reason (e.g., `Cloudflare Analytics token missing.`)
  - Action: `Retry` button + `View in [provider] →` link-out where applicable
- Whole-page error: rare (each tile is independent); if layout itself fails,
  global error boundary catches it.

### Success state

Each tile shows fresh data with a small `↻ {relative-time}` indicator in
the corner showing last refresh.

---

## 22.4 Users (`/admin/users`)

### Wireframe

```
┌────────────────────────────────────────────────────────────────┐
│ Users                                            [Export CSV ⬇]│
├────────────────────────────────────────────────────────────────┤
│ Search: [🔍 jane@___________]   Role: [All ▾]   Page 1 of 12  │
├────────────────────────────────────────────────────────────────┤
│  Email                 Display name   Role    Created   Session│
│ ───────────────────────────────────────────────────────────────│
│  jane@example.com      Jane D.       member  5m ago   active  │
│  john@example.com      John S.       member  1h ago   3d ago  │
│  philipjonlewis@gmail  Philip        ceo     Jun 1    now     │
│  ...                                                          │
├────────────────────────────────────────────────────────────────┤
│  Showing 1–50 of 583      [‹ Prev]  [1] 2 3 ... 12 [Next ›]   │
└────────────────────────────────────────────────────────────────┘
```

### Concrete copy

- Page heading: `Users`
- Search placeholder: `🔍 search by email prefix`
- Role filter options: `All`, `ceo`, `admin`, `member`
- Column headers: `Email`, `Display name`, `Role`, `Created`, `Last session`
- Export button: `Export CSV ⬇` (`FR-USERS-04`)
- Pagination: `Showing {start}–{end} of {total}` + numbered pages
- Row click: opens user detail drawer (FR-USERS-02, P2)

### User detail drawer (SheetDrawer, P2)

```
┌───────────────────────────────────┐
│ Jane D.                  [×]      │
│ jane@example.com                  │
│                                   │
│ Role: member                      │
│ Created: Wed Jul 9, 8:32 AM       │
│ Last session: 5m ago              │
│                                   │
│ Workspaces (2):                   │
│  • Lewis Residence (owner)        │
│  • Acme Project (member)          │
│                                   │
│ Recent activity:                  │
│  • Created estimate 5m ago        │
│  • Sent proposal 2h ago           │
│                                   │
│ [View in closed-beta allowlist →]│
│ [Start support conversation →]    │
└───────────────────────────────────┘
```

### States

- Loading: Skeleton rows (5 placeholder rows).
- Empty: `No users yet.` + (if admin) CTA `Invite someone →` to closed-beta allowlist.
- Error: `Couldn't load users.` + `Retry`.
- No results: `No users match "{query}".` + `Clear filters`.

### Session-health tile (FACET-20, FR-USERS-03)

```
┌────────────────────────────────────┐
│ Session health                     │
│ Active sessions: 12                │
│ Provider breakdown:                │
│  Google OAuth:  10                 │
│  Magic link:     2                 │
│ Avg session: 4.2 hours             │
└────────────────────────────────────┘
```

---

## 22.5 Support inbox (`/admin/support`)

### Wireframe

```
┌─────────────────────────────────────────────────────────────────┐
│ Support inbox                                  [Status: open ▾]│
├──────────────────────┬──────────────────────────────────────────┤
│ Conversations        │  Jane D. — jane@example.com              │
│ ─────────────────    │  Started Mon Jul 7, 3:04 PM              │
│ ● Jane D.    2m  ●1  │  Status: open                             │
│   "Hi, I can't..."   │                                          │
│                      │  ──── Messages ────                      │
│   John S.    1h      │                                          │
│   "Export failed..." │  [Mon 3:04 PM] Jane:                     │
│                      │  > Hi, I can't seem to add a row to my   │
│   Mary K.   2d  ✓    │  > estimate. It shows an error when...   │
│   "Thanks!"          │                                          │
│                      │  [Mon 3:10 PM] Philip (you):             │
│                      │  > Hi Jane, can you share the error      │
│                      │  > message? I'll take a look.            │
│                      │                                          │
│                      │  [just now] Jane:                        │
│                      │  > Here's the screenshot: [linked]       │
│                      │                                          │
│                      │  ──── Reply ────                         │
│                      │  ┌──────────────────────────────────┐    │
│                      │  │ Type your reply...               │    │
│                      │  │                                  │    │
│                      │  │                       [Send ↵]   │    │
│                      │  └──────────────────────────────────┘    │
│                      │  ↳ Reply will also send to jane@...      │
└──────────────────────┴──────────────────────────────────────────┘
```

### Concrete copy

- Page heading: `Support inbox`
- Status filter: `open` (default), `pending`, `resolved`, `archived`, `all`
- Conversation list row:
  - Unread indicator: `●` (filled dot) with `aria-label="unread"`
  - Read indicator: no dot (or `✓` for resolved)
  - Sender name + relative time + preview (truncated to one line)
- Thread header: sender name + email + started time + status
- Reply textarea:
  - Placeholder: `Type your reply...`
  - Helper text below: `↳ Reply will also send to {email}` (if email channel)
  - Send button: `Send ↵` (Cmd/Ctrl+Enter to send)
- Status badge colors:
  - open → blue
  - pending → amber
  - resolved → green
  - archived → neutral

### States

- Loading conversation list: Skeleton list rows.
- Loading thread: Skeleton thread with spinner.
- Empty conversation list: `No conversations yet.` + tooltip `When a user starts a support chat, it'll appear here.`
- Empty thread: `Select a conversation to view messages.` (initial state, before any selection)
- Send failure:
  - Reply textarea stays populated with the draft
  - Error toast: `Couldn't send reply. Email delivery failed. Your draft is saved.`
  - Status banner above thread: `Last send failed. [Retry ↻] [Dismiss ×]`
  - The message row in thread shows `send_failed` status with retry affordance
- WS disconnect:
  - Top of thread: `Reconnecting...` banner (amber)
  - On reconnect: `Reconnected.` (briefly, then disappears)
- New inbound message (WS):
  - Appears in thread with subtle highlight animation
  - Conversation list updates unread count
  - Optional: `aria-live="polite"` announces `New message from {sender}`

### Empty states (specific)

- No conversations:
  ```
  ┌──────────────────────────────────┐
  │       [💬 Icon]                  │
  │   No conversations yet           │
  │   When a user starts a support   │
  │   chat from the in-app widget,   │
  │   it'll appear here.             │
  │   [Learn about support widget →] │
  └──────────────────────────────────┘
  ```

---

## 22.6 Analytics (`/admin/analytics`)

### Wireframe

```
┌─────────────────────────────────────────────────────────────────┐
│ Analytics                                        [Refresh all ↻]│
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ Cloudflare Web Analytics     [cached 2h ago]                 ││
│ │ Requests (24h): 1,234   Errors: 12 (0.97%)                   ││
│ │ [Trend chart — link-out only until OPEN-3]                   ││
│ │ [Open in Cloudflare →]                                       ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ Microsoft Clarity              [cached 1h ago]               ││
│ │ Sessions (24h): 89   Dead clicks: 4                          ││
│ │ [Open in Clarity →]                                           ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ Google Analytics 4             [cached 30m ago]              ││
│ │ Active users (30m): 7   Page views (24h): 432                ││
│ │ [Open in GA4 →]                                               ││
│ └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### Concrete copy

- Page heading: `Analytics`
- Per-tile:
  - Provider name + last-cached timestamp
  - 1–2 summary metrics
  - `[Open in {Provider} →]` link (always present)
  - Trend chart only when cached metrics exist (BLOCKED-EXTERNAL OPEN-1/2/3
    for read access)
- Refresh button: `Refresh all ↻` (forces cache invalidation)

### States

- Loading: Skeleton tiles.
- Token missing: tile becomes:
  ```
  ┌─────────────────────────────────────────────────────────────┐
  │ Cloudflare Web Analytics                                    │
  │ Not configured.                                             │
  │ [Open in Cloudflare →] [How to enable →]                    │
  └─────────────────────────────────────────────────────────────┘
  ```
- Quota hit / API error: tile becomes:
  ```
  ┌─────────────────────────────────────────────────────────────┐
  │ Microsoft Clarity                [quota exhausted]          │
  │ Daily quota hit. Resets in 4 hours.                         │
  │ [Open in Clarity →]                                         │
  └─────────────────────────────────────────────────────────────┘
  ```

---

## 22.7 Feature flags (`/admin/flags`)

### Wireframe

```
┌─────────────────────────────────────────────────────────────────┐
│ Feature flags                                                   │
├─────────────────────────────────────────────────────────────────┤
│ Flag                            Status      Last changed        │
│ ───────────────────────────────────────────────────────────────│
│ admin_dashboard_enabled         [● on ]     Philip, 2h ago      │
│ admin_support_realtime          [● on ]     Philip, 2h ago      │
│ admin_analytics_server_pulls    [ off ]     Philip, yesterday   │
│                                                                 │
│ + Add flag                                                      │
└─────────────────────────────────────────────────────────────────┘
```

### Concrete copy

- Page heading: `Feature flags`
- Column headers: `Flag`, `Status`, `Last changed`
- Toggle: existing `Switch` component
- Status: `● on` / `off` (text-based, not color-only — `A11Y-CONTRAST-01`)
- Last changed: `{actor}, {relative-time}`
- Add flag: `+ Add flag` (opens modal — minimal: key + description)

### Toggle interaction

- Click toggle → optimistic update (UI flips immediately)
- Server Action `setFeatureFlag` → audit row + cache invalidate
- On failure: revert toggle, show toast `Couldn't update flag. Reverted.`
- On success: toast `Flag updated.` (brief)

### States

- Loading: Skeleton rows
- Empty: `No flags defined yet. Flags you add will appear here.`
- Error: `Couldn't load flags. [Retry]`

---

## 22.8 Audit log (`/admin/audit`)

### Wireframe

```
┌─────────────────────────────────────────────────────────────────┐
│ Audit log                                  [Export CSV ⬇]        │
├─────────────────────────────────────────────────────────────────┤
│ Filter: Action [All ▾]  Actor [All ▾]  Date range [7d ▾]        │
├─────────────────────────────────────────────────────────────────┤
│ Time              Actor        Action             Target         │
│ ───────────────────────────────────────────────────────────────│
│ 2m ago            Philip       flag.update       admin_support  │
│                                                  prev=off → on  │
│                                                                 │
│ 1h ago            Philip       support.reply     conv_abc123     │
│                                                  msg_xyz789      │
│                                                                 │
│ 3h ago            Philip       user.export       jane@example    │
│ ...                                                             │
├─────────────────────────────────────────────────────────────────┤
│  Page 1 of 47      [‹ Prev]  [1] 2 3 ... 47 [Next ›]           │
└─────────────────────────────────────────────────────────────────┘
```

### Concrete copy

- Page heading: `Audit log`
- Filter labels: `Action`, `Actor`, `Date range`
- Column headers: `Time`, `Actor`, `Action`, `Target`
- Action format: `{domain}.{verb}` (e.g., `flag.update`, `support.reply`,
  `user.export`)
- Target format: target_type + target_id, plus optional summary (prev → new)
- Cursor pagination (high cardinality)

### States

- Loading: Skeleton rows
- Empty: `No audit events in this range.`
- No filter matches: `No events match these filters. [Clear filters]`
- Error: `Couldn't load audit log. [Retry]`

### DSAR queue viewer (FR-OPS-01) — embedded as a tab

```
┌─────────────────────────────────────────────────────────────────┐
│ [Audit log] [DSAR queue] [Mass ops]                             │
├─────────────────────────────────────────────────────────────────┤
│ DSAR queue                                                      │
│ Open: 1                                                         │
│ ─────                                                           │
│ #4  jane@example.com   export  requested 3d ago   SLA: 4d left │
│      [Mark complete] [View details]                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 22.9 Observability (`/admin/observability`)

### Wireframe

```
┌─────────────────────────────────────────────────────────────────┐
│ Observability                                                   │
├─────────────────────────────────────────────────────────────────┤
│ System status                                                  │
│ ─────────────                                                  │
│ Uptime (24h):           ● all systems nominal                  │
│ Last sev1 incident:     none                                   │
│ Last backup verified:   2 hours ago  [Run rehearsal ↻]         │
│ Data residency:         Cloudflare D1 · wnam                   │
│                                                                 │
│ Cron health                                                    │
│ ────────────                                                   │
│ 0 3 * * *  upload-cleanup   ● ok  last: today 03:00 UTC        │
│ 15 3 * * * upload-scan      ● ok  last: today 03:15 UTC        │
│ 30 3 * * * retention        ● ok  last: today 03:30 UTC        │
│                                                                 │
│ Queue health                                                   │
│ ────────────                                                   │
│ UPLOAD_JOBS_QUEUE:  depth 2  in-flight 0  DLQ 0                │
│   [View DLQ →]                                                 │
│                                                                 │
│ Client errors (last 24h)                                       │
│ ─────────────────────────                                      │
│ Top errors:                                                    │
│  TypeError: cannot read 'x' of undefined    12 hits  /workshop │
│  NetworkError: failed to fetch                  3 hits  /share │
│ [View all in Workers Observability →]                          │
│                                                                 │
│ Web Vitals (last 7d, p75 field)                                │
│ ──────────────────────────────                                 │
│ LCP: 1.8s (good)   INP: 180ms (needs improvement)   CLS: 0.04  │
│                                                                 │
│ Free-tier consumption (this month)                             │
│ ─────────────────────────────                                  │
│ Workers requests:  34K / 100K      [████░░░░░░] 34%            │
│ D1 rows read:      1.2M / 5M       [██░░░░░░░░] 24%            │
│ R2 storage:        340MB / 10GB    [░░░░░░░░░░]  3%            │
│ Queue operations:  2.1K / 10M      [░░░░░░░░░░] <1%            │
│                                                                 │
│ Maintenance mode                                               │
│ ──────────────                                                 │
│ Status: [ off ]  (toggle to put /workshop writes in read-only) │
│                                                                 │
│ External links                                                 │
│ ──────────────                                                 │
│ [Cloudflare Workers Observability →]                           │
│ [GitHub Security (Dependabot) →]                              │
│ [wrangler tail how-to →]                                       │
└─────────────────────────────────────────────────────────────────┘
```

### Concrete copy

Every label and metric is shown in the wireframe above. Specific copy notes:

- "all systems nominal" → green StatusBadge; replace with degraded language
  on incidents (`degraded`, `partial outage`, `major outage`)
- "needs improvement" for INP → amber; matches Core Web Vitals thresholds
- Free-tier consumption bars use `Progress` component; green <60%, amber
  60–85%, red >85%
- Maintenance mode toggle: confirmation dialog on enable
  ("Maintenance mode will block all writes to /workshop. Users will see a
  'back soon' message. Continue? [Cancel] [Enable]")

### States

- Loading: per-section Skeleton (sections are independent)
- Partial failure: per-section ErrorState
- WS disconnect for realtime tiles: amber banner `Realtime disconnected.
  Showing last known.`

---

## 22.10 Responsive behavior summary

| Breakpoint | Behavior |
|---|---|
| ≥ 1024 px | Full layout; sidebar persistent; content uses 12-col grid |
| 640–1023 px | Sidebar collapses to icon rail; content uses 8-col grid |
| < 640 px | Sidebar becomes SheetDrawer (hamburger); content stacks single-col; tables horizontally scroll; metric tiles stack |

Tables (`DataTable`) scroll horizontally on narrow screens. Metric cards
rearrange to single-column. Support inbox split view collapses to
"list view / thread view" navigation on < 640 px.

---

## 22.11 Empty / loading / error copy catalog

Centralized for consistency:

| State | Pattern | Example |
|---|---|---|
| Loading | `Skeleton` matching final layout shape | Per-tile skeleton |
| Empty (no data yet) | `[Icon] No {noun} yet. {helpful-context}` | `No conversations yet.` |
| Empty (no filter match) | `No {noun} match {filter}. [Clear filters]` | `No users match "jane@".` |
| Error (transient) | `Couldn't load {noun}. [Retry]` | `Couldn't load users.` |
| Error (config) | `{Noun} not configured. [How to enable →]` | `Clarity not configured.` |
| Error (quota) | `{Noun} quota hit. {reset-info}. [Open in {provider} →]` | `Daily quota hit. Resets in 4 hours.` |
| Success | Brief toast: `{Action} {past-tense}.` | `Flag updated.` |
| Offline | Top banner: `You're offline. Showing last cached state.` | n/a |

---

## 22.12 Component reuse map

Reused from `src/components/ui/`:
- `Card` (tile container)
- `Panel` (section container)
- `PageHeader` (page heading + actions)
- `Skeleton` (loading states)
- `EmptyState` (no-data states)
- `StatusBadge` / `DeltaBadge` (status indicators)
- `Switch` (feature flag toggles)
- `DataTable<T>` (users, audit, queues)
- `SheetDrawer` (user detail drawer, mobile sidebar)
- `DropdownMenu` (filter selects, avatar menu)
- `Tabs` (audit / DSAR / mass-ops tabs)
- `Progress` (free-tier consumption bars)
- `Avatar` (header identity)
- `toast` (success / failure feedback)
- `Button`, `SearchInput`, `Alert`, `Banner`

New in `src/components/admin/`:
- `AdminShell.tsx`, `AdminSidebar.tsx`, `AdminHeader.tsx`
- `AdminMetricCard.tsx` (value + delta + status)
- `AdminPresenceCounter.tsx` (live count + aria-live)
- `AdminHealthStrip.tsx`, `AdminIncidentStrip.tsx`
- `AdminFunnelTile.tsx` (onboarding / closed-beta)
- `AdminUsersTable.tsx`, `AdminUserDrawer.tsx`
- `AdminSupportInbox.tsx`, `AdminSupportThread.tsx`, `AdminSupportComposer.tsx`
- `AdminAnalyticsTiles.tsx`
- `AdminFlagsList.tsx`
- `AdminAuditTable.tsx`, `AdminDSARQueue.tsx`, `AdminMassOpAudit.tsx`
- `AdminObservabilityView.tsx`, `AdminCronHealth.tsx`, `AdminQueueHealth.tsx`
- `AdminClientErrors.tsx`, `AdminWebVitals.tsx`, `AdminFreeTierGauge.tsx`
- `AdminCharts.tsx` (thin wrappers over `recharts`)

Component prop interfaces are in `23`.

---

## 22.13 Visual QA gates (when to invoke)

Per the repo's proportional verification policy, browser-based visual QA is
**opt-in** for routine admin surfaces. Trigger visual QA only when:

- A wireframe here makes a layout claim that DOM tests cannot prove (e.g.,
  "metric tiles rearrange to single-column on narrow screens without
  overlap").
- A realtime interaction has browser-only behavior (e.g., support inbox
  WS reconnect focus behavior).
- A focus-management claim cannot be proven by static review (e.g., user
  detail drawer focus trap).

When triggered, use the `visual-qa` skill: capture reference + actual
screenshots, run the diff script, get dual-verifier verdict.

Routine tile / table / form rendering needs only DOM tests + type/LSP checks
per the existing Codex App speed guardrail.

---

## 22.14 What this doc does NOT specify

- Final visual design (color tuning, typography hierarchy beyond existing
  tokens, decorative choices).
- Animation specifics (durations, easing curves).
- Icon choices beyond Phosphor family.
- Marketing-style microcopy (this is operator software; copy is plain and
  functional).
- Localization (inline literals only, per repo convention).

---

## 22.15 Confirmation

No application code, tests, migrations, schemas, `wrangler.jsonc`,
`package.json`, provider state, or runtime data were modified. All writes
are confined to `.ai/03_plans/2026-07-08/Admin-Dashboard-Planning/`.
