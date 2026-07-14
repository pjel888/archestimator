# 04 — Information Architecture, UX, and Navigation

## 1. Design goal

The Admin shell must reduce founder context switching.

The current flat route list organizes by implemented page. The target navigation organizes by founder job.

## 2. Primary navigation

### Home

- **Today** — default `/admin`
- **Action Inbox** — `/admin/actions`
- **Weekly Review** — `/admin/review`

### Customers

- **Users** — `/admin/users`
- **Accounts & Workspaces** — `/admin/accounts`
- **Cohorts** — `/admin/cohorts`
- **Support** — `/admin/support`
- **Feedback & Signals** — `/admin/signals`

### Product

- **Projects** — `/admin/projects`
- **Estimates** — `/admin/estimates`
- **Publications / Client Portals** — `/admin/publications`
- **Product Analytics** — `/admin/product-analytics`
- **Feature Delivery** — `/admin/features`

### Business

- **Acquisition & Traffic** — `/admin/acquisition`
- **Financials** — `/admin/financials`
- **Integration Health** — `/admin/integrations`

These routes may begin as sections or filtered views in `/admin/review`; do not create empty destination pages before a useful read model exists.

### Operations

- **Health** — `/admin/operations`
- **Incidents** — `/admin/incidents`
- **Jobs & Queues** — `/admin/jobs`
- **Uploads & Scans** — `/admin/uploads`
- **Data Quality** — `/admin/data-quality`
- **Releases** — `/admin/releases`
- **Cost & Capacity** — `/admin/cost-capacity`

### Communications

- **Outreach** — `/admin/outreach`
- **Campaigns** — `/admin/notifications`
- **Templates** — `/admin/communications/templates`
- **Delivery Issues** — `/admin/communications/delivery`

### Governance

- **Feature Flags** — `/admin/flags`
- **Audit & Security** — `/admin/audit`
- **Privacy Requests** — `/admin/privacy`
- **Configuration** — `/admin/configuration`

## 3. Route migration strategy

Do not create every route before the shell is useful.

### Stage A — Navigation aliases and aggregated Home

Keep existing pages:

- `/admin/observability`
- `/admin/analytics`
- `/admin/notifications`
- `/admin/flags`
- `/admin/audit`
- workshop settings routes

Group them in the new sidebar and link existing surfaces.

### Stage B — New cross-domain routes

Create:

- `/admin/actions`
- `/admin/search` or command overlay
- `/admin/review`
- `/admin/signals`
- `/admin/releases`
- `/admin/data-quality`
- `/admin/acquisition`
- `/admin/financials`
- `/admin/integrations`

### Stage C — Entity routes

Create summary routes only when repositories are ready:

- `/admin/projects/[projectId]`
- `/admin/estimates/[estimateId]`
- `/admin/publications/[publicationId]`
- `/admin/workspaces/[workspaceId]`

### Stage D — Consolidate fragmented tools

Migrate mutation ownership from workshop settings only after:

- authorization parity;
- redirect;
- audit;
- source links;
- tests/proof when authorized.

## 4. Admin shell

### Desktop layout

```text
┌───────────────────────────────────────────────────────────────────────────┐
│ Logo  Search / Command   Environment  System state  Identity / Workshop  │
├──────────────┬─────────────────────────────────────────────┬──────────────┤
│ Grouped      │ Main route / table / command center         │ Context      │
│ sidebar      │                                             │ drawer       │
│ with badges  │ Full-width content                          │ optional     │
│ and pins     │                                             │              │
└──────────────┴─────────────────────────────────────────────┴──────────────┘
```

### Header

Required:

- global search trigger;
- keyboard shortcut;
- current environment;
- production status;
- unresolved urgent count;
- data freshness/degraded marker;
- current founder identity;
- link to Workshop;
- quick-create menu:
  - note/follow-up;
  - support conversation;
  - release record;
  - incident;
  - outreach draft.

### Sidebar

Required:

- grouped navigation;
- count badges only when actionable;
- collapse state;
- pinned entities or views;
- recent entities;
- visible current route;
- no badge for decorative totals.

### Context drawer

A reusable drawer provides:

- entity summary;
- source links;
- related items;
- timeline;
- next actions.

The founder can inspect a user or project without losing the current list/queue.

## 5. Home layout

### First viewport

1. **Today header**
   - local date;
   - “since last visit” checkpoint;
   - current release/environment;
   - stale/degraded source warning.

2. **Urgent action lane**
   - P0/P1 items only;
   - age/due;
   - affected user/customer/product;
   - next action.

3. **Customer attention**
   - unread/overdue support;
   - new high-severity feedback;
   - stalled activation;
   - client decision requiring follow-up.

4. **Operational state**
   - incident;
   - release health;
   - failed jobs/delivery;
   - data-quality blockers;
   - capacity threshold.

### Below first viewport

- growth/activation pulse;
- recent signups and activated users;
- recent product changes;
- current feature rollout;
- recent releases;
- upcoming follow-ups;
- weekly trend cards;
- quick links.

## 6. Table interaction standard

Every major table supports:

- server-side pagination or cursor;
- URL filters;
- sorting;
- explicit column meanings;
- saved view where useful;
- source and as-of;
- keyboard row navigation;
- open in context drawer;
- copy safe ID;
- empty/error/degraded states;
- bulk action only when eligibility and impact can be previewed.

Avoid:

- client filtering over a truncated page;
- tiny icon-only destructive actions without context;
- horizontal tables with twenty columns;
- hidden state in local component memory.

## 7. Status design

Standard status families:

### Operational urgency

- Critical
- Urgent
- Review
- Monitor
- Informational

### Workflow state

- New
- Active
- Waiting
- Snoozed
- Resolved
- Dismissed
- Duplicate

### Data confidence

- Current
- Stale
- Partial
- Estimated
- Unavailable
- Not instrumented

### Customer health

- Healthy
- Watch
- At risk
- Blocked
- Unknown

Every status has:

- definition;
- deterministic source;
- timestamp;
- reason.

## 8. Progressive disclosure

Home shows summaries, not full logs.

Pattern:

```text
Summary
→ Context drawer
→ Domain detail route
→ Provider/source link
```

Example:

```text
3 users affected by export failures
→ affected users and projects
→ estimate/export event detail
→ Cloudflare/GitHub trace/log
```

## 9. Search and filters

Global search uses:

- free text;
- exact ID detection;
- email detection;
- project/estimate code;
- optional operators:
  - `is:user`
  - `is:project`
  - `is:estimate`
  - `status:open`
  - `email:`
  - `code:`
  - `created:`
  - `has:support`
  - `has:publication`

Do not attempt a full query language in MVP.

## 10. Keyboard model

Recommended:

- `⌘K` / `Ctrl+K` — global search/command
- `G H` — Home
- `G A` — Action Inbox
- `G U` — Users
- `G S` — Support
- `G O` — Operations
- `J/K` — next/previous item
- `Enter` — open
- `E` — resolve/accept where safe
- `H` — snooze
- `P` — pin
- `N` — note/follow-up
- `Esc` — close drawer/dialog

Shortcuts must have visible discovery and never override typing contexts.

## 11. Responsive behavior

### Desktop

Full capability.

### Tablet

- collapsed grouped sidebar;
- context drawer overlays;
- tables reduce columns;
- command palette remains primary.

### Mobile

Support:

- Today;
- action triage;
- search;
- customer lookup;
- support reply;
- snooze/resolve;
- incident update;
- emergency flag/link.

Defer:

- complex campaign authoring;
- bulk repair;
- deep analytics;
- release checklist editing;
- schema/configuration.

## 12. Typography and density

Current Admin uses 9–12px across most content.

Recommended product-admin scale:

- route title: 18–22px;
- section title: 13–15px;
- body/table: 11–13px;
- metadata: 10–11px;
- key metric: 18–28px.

Density remains compact, but primary operational text cannot require zoom.

## 13. Accessibility requirements

- semantic landmarks and headings;
- real buttons/links;
- complete keyboard path;
- visible focus;
- no color-only urgency;
- status text and icon;
- live regions only for meaningful mutation state;
- sticky header does not obscure focus;
- data charts have text/table equivalents;
- drawer/dialog focus restoration;
- minimum practical touch size for mobile actions;
- no auto-refresh that steals focus;
- reduced-motion support;
- date/time includes timezone context.

## 14. Empty and degraded states

A world-class admin cannot silently show zero.

Every widget distinguishes:

- no matching records;
- no records ever;
- source unavailable;
- query failed;
- permission denied;
- not instrumented;
- stale snapshot;
- provider not connected.

Each degraded state includes:

- source;
- as-of;
- impact;
- safe next action;
- retry or provider link.

## 15. Founder personalization

MVP:

- pinned entities;
- pinned views;
- recently visited;
- default Home widgets;
- preferred time window;
- timezone;
- compact/comfortable density;
- hide/show optional sections.

Do not build a free-form dashboard builder initially. Use ordered approved modules.
