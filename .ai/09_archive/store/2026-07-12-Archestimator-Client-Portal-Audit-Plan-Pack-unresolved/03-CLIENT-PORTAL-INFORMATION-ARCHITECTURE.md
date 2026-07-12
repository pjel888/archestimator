# 03 — Client Portal Information Architecture

## 1. Top-level architecture

The current estimate-sheet tabs become content inside an **Estimates** section. They must not be confused with top-level portal navigation.

### Recommended top-level section registry

| Kind | Purpose | MVP | Commentable | Wide layout |
|---|---|---:|---:|---:|
| `overview` | Project identity, issue, total, status, key dates | Yes | Yes | Optional |
| `estimate_browser` | Selected estimates, tabs, hierarchy, rows | Yes | Yes | Yes |
| `financial_summary` | KPI cards and approved aggregate metrics | Yes | Yes | Yes |
| `cost_breakdown` | Space/category/discipline/supplier charts | Yes | Yes | Yes |
| `estimate_comparison` | Side-by-side sheet comparison and deltas | Yes | Yes | Yes |
| `budget_variance` | Budget, current total, variance, threshold | Conditional | Yes | Yes |
| `revision_comparison` | Added/removed/quantity/rate/total changes | Later | Yes | Yes |
| `assumptions_exclusions` | Issued assumptions, exclusions, validity | Yes | Yes | No |
| `documents` | Explicitly attached client-visible files | Later | Yes | Yes |
| `discussion` | All client-visible threads | Yes | N/A | Yes |
| `activity` | Owner-approved client-safe timeline | Yes, optional | No | Yes |
| `decision` | Formal issue-wide response | Yes | N/A | No |

Each portal section has a stable ID so threads, analytics, links, and carry-forward behavior remain meaningful across issues.

## 2. Recommended desktop shell

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Owner logo   Client logo   Project / Issue / Status        Identity / Print │
├──────────────────────┬───────────────────────────────────┬───────────────────┤
│ Portal navigation    │ Active section                    │ Context panel     │
│                      │                                   │                   │
│ Overview             │ Full-width chart, tree, table,    │ Selected target   │
│ Financial summary    │ comparison, or document content  │ Discussion thread │
│ Cost breakdown       │                                   │ Decision context  │
│ Estimates            │                                   │ Activity details  │
│ Discussion      (4)  │                                   │                   │
│ Activity              │                                   │                   │
│ Decision              │                                   │                   │
├──────────────────────┴───────────────────────────────────┴───────────────────┤
│ Issue identity, legal/attribution, privacy, contact                          │
└──────────────────────────────────────────────────────────────────────────────┘
```

The right panel is contextual. It is not always visible:

- visible for discussion-enabled sections on large screens;
- collapsible;
- replaced by a drawer on medium screens;
- replaced by a bottom sheet on mobile.

## 3. Navigation rules

### Desktop

Use a left rail rather than a crowded horizontal top tab list. The rail supports:

- section label;
- status/notification badge;
- unresolved thread count;
- decision/action-required marker;
- optional nested estimate outline when Estimates is active.

### Tablet

The left rail collapses to icons/labels or a compact selector. Discussion opens as a side drawer.

### Mobile

Use:

- a horizontally scrollable top-level section bar or section menu;
- one content column;
- a bottom action bar for discussion and decision;
- a full-height discussion sheet.

The existing fixed bottom navigation must preserve keyboard focus and must not obscure focused content.

## 4. Owner-configured section rules

For each section the owner can set:

- title;
- short description;
- order;
- enabled/disabled;
- visibility by recipient role;
- data source and selected estimates;
- field visibility;
- chart grouping and comparison selection;
- commentability;
- download/print behavior;
- whether the section appears in the printed package;
- empty-state behavior.

Owners cannot:

- author SQL;
- expose unapproved internal fields;
- inject arbitrary HTML/JS;
- override security headers;
- create custom capability names;
- make a draft/live-data join public.

## 5. Overview section

The Overview should answer, immediately:

- What project is this?
- Who prepared it and for whom?
- Which issue am I reviewing?
- Is it current, superseded, approved, or expired?
- What is the total and currency?
- What is the validity period?
- What action is expected from me?
- Which estimate sheets and financial views are included?
- How do I contact the project team?

Recommended content:

- dual-logo brand header;
- project title/code/location according to visibility;
- issue number/version and issued date;
- total and currency;
- validity;
- owner contact;
- client recipient identity;
- status;
- optional summary text;
- action-required banner;
- assumptions/exclusions summary;
- selected-scope count.

## 6. Estimates section

The current `SharePageTabs` capabilities move here after decomposition.

Requirements:

- every published row is reachable;
- sheet and estimate-tab selection persists per session;
- tree preserves Group/Area hierarchy;
- details view supports a wide table;
- owner-selected columns only;
- no silent truncation;
- a visible row count and loading state;
- direct links to estimate, tab, area, and row targets;
- contextual “Discuss” action;
- print-safe package;
- totals at sheet, tab, area, and issue level where applicable.

For large issues, rows can be paginated or virtualized, but “all rows” must remain available through a clear loading path.

## 7. Financial sections

Financial views should use section-specific wide canvases, not squeeze into proposal cards.

Examples:

- KPI strip;
- cost breakdown donut/treemap/table;
- space hierarchy rollup;
- category rollup;
- supplier rollup when explicitly permitted;
- estimate comparison bars and delta table;
- budget variance;
- top cost drivers.

Each chart must have:

- accessible text/table equivalent;
- currency and date basis;
- source issue identity;
- no ambiguous rounding;
- “Discuss this view” target;
- empty/truncated-data state;
- explicit privacy/field policy.

## 8. Discussion section

The Discussion section is the cross-portal inbox. It shows:

- open threads first;
- waiting on project team;
- waiting on client;
- resolved;
- filter by section, target, author, status, assignee;
- unread indicators;
- deep link back to content;
- one general portal discussion entry point.

This section complements, rather than replaces, the contextual rail.

## 9. Activity section

Only appears when the owner enables it and the recipient has `activity:view`.

Client-safe default events:

- issue published;
- issue superseded;
- client-visible comment/thread created;
- reply added;
- thread resolved/reopened;
- formal decision submitted/voided;
- visible document added;
- portal access expiry/withdrawal notices.

Never expose:

- password failures;
- raw access telemetry;
- internal estimate edits;
- internal comments;
- internal actor emails;
- other recipients' private security events;
- owner login/session data;
- supplier negotiation history;
- hidden draft activity.

## 10. Decision section

The Decision section is intentionally simple:

- issue identity;
- total and currency;
- scope summary;
- unresolved-thread warning;
- approval rule and designated approver state;
- approve / request changes / decline;
- signer name;
- optional note;
- explicit confirmation;
- saved decision record;
- audit/export notice.

A sticky decision action can appear elsewhere, but it always opens or links to this authoritative section.

## 11. Deep-link contract

Use stable semantic URLs after the portal token, for example:

```text
/share/<portal-token>?section=<section-public-id>
/share/<portal-token>?section=<section-public-id>&target=<target-public-id>
/share/<portal-token>?issue=3&section=<section-public-id>
```

The server resolves public IDs to issue-scoped targets. Internal UUIDs remain hidden.

## 12. Empty and unavailable states

Every configured section must render an explicit state:

- no data selected;
- no rows;
- financial data incomplete;
- section restricted for this role;
- issue superseded;
- activity disabled;
- discussion unavailable for anonymous viewers;
- decision unavailable because recipient is not an approver;
- data was omitted by owner policy.

Never silently omit a configured section after issue publication.
