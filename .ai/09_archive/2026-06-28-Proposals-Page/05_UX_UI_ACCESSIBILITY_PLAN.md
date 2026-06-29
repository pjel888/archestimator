# 05 — UX, UI, and Accessibility Plan

`DESIGN.md` is alpha-stage guidance; this plan defers to current workshop patterns and the repo's design-system linter. No new design tokens. The UI should feel like a compact recipient inbox for proposal documents, not a generic SaaS dashboard.

## Owner-delegated UX decisions

| Decision | Choice | Rationale |
|---|---|---|
| Review click behavior | Same-tab server redirect | Preserves document-review flow and progressive enhancement; browser Back returns to inbox |
| Status copy | `New`, `Opened`, `Decision submitted`, `Expired`, `Revoked` | Plain recipient-facing language; detail chips can show accepted/declined/revision |
| Sidebar shortcut | Proposals `⌘4`, Publisher `⌘5` | Keeps shortcut order aligned with nav order |
| Expired/revoked visibility | Show rows disabled | Recipients can understand why a prior proposal is unavailable without gaining access |

## Primary user journey

```
Recipient receives proposal email -> opens /share/[token]
  -> later signs in with the same verified email
  -> sees Proposals in the main sidebar
  -> opens /workshop/proposals
  -> reviews every proposal sent to that email across workspaces
  -> clicks Review proposal
  -> same-tab redirect to /share/[token] with recipient session established
```

## Information hierarchy

```
Page header: Proposals
Subhead: Proposal packages sent to {user email}

List sorted by published_at desc:
  Project name + optional code
  From {sender} at {workspace}
  Status icon + label
  Published date + last activity
  Review proposal form button
```

## State matrix

| State | User-facing copy/control | Focus behavior | Proof path |
|---|---|---|---|
| Loading | Skeleton rows matching final geometry | No focus steal | DOM test + browser smoke |
| Empty | "No proposals yet"; mentions verified email | Page heading remains first landmark | DOM test |
| Success | List rows with Review controls | Normal tab order through rows | DOM + browser smoke |
| Partial/stale | Existing rows remain while refresh runs | No focus movement | DOM fake-timer refresh test |
| Error | "Couldn't load proposals." + Try again | Move focus to Try again after failed explicit retry | DOM test |
| Permission denied | Existing auth/login redirect | Existing auth gate | Route gate test + browser smoke |
| Conflict | Publication changed between list and click | Error shown near row; refresh list | Action test |
| Offline/network failure | Stale rows remain if present; otherwise error state | No focus drop | DOM test with rejected query |
| Timeout | Same as error, message can be generic | Try again receives focus on retry failure | DOM test |
| Cancellation | No destructive action exists | N/A | Not applicable |
| Expired/revoked | Row visible; Review disabled; explanation text/title | Disabled control skipped or explained via accessible text | DOM + browser smoke |

## Populated row layout

Desktop/tablet:

- Left: project name, code, sender/workspace.
- Middle: published date and last activity.
- Right: status icon + label, optional decision chip, Review button.

Mobile:

- Single column.
- Status still uses icon + label. A colored dot alone is not acceptable.
- Review button spans naturally without forcing horizontal overflow.

## Status taxonomy

| Raw signals | Display label | Detail chip |
|---|---|---|
| active, not opened | New | None |
| active, opened, no decision | Opened | None |
| active, decision exists | Decision submitted | Accepted / Declined / Revision requested |
| expired by status or `expires_at <= now()` | Expired | None |
| revoked by status or `revoked_at` | Revoked | None |

## Accessibility proof matrix

| Action/surface | Keyboard | Focus | Screen-reader name/live behavior | Proof |
|---|---|---|---|---|
| Page heading/list | Landmarks reachable | No auto focus on load | `<main>`/heading/list labels name the inbox | DOM |
| Review active row | Tab to button; Enter/Space submits | Successful submit navigates same tab | "Review proposal for {project}" | DOM + browser |
| Review expired/revoked row | Disabled/unavailable state is perceivable | No trap | Row explains unavailable status | DOM |
| Retry error | Tab/Enter activates | Focus moves to retry on explicit failed retry | Error text associated with control | DOM |
| Sidebar Proposals | Tab/click navigates | Existing sidebar focus styling | Link name "Proposals"; shortcut visible | DOM |
| Status labels | No color-only cue | N/A | Icon is decorative; label is text | DOM/static |

## Responsive behavior

| Breakpoint | Layout |
|---|---|
| `<640px` | Single-column rows, icon+label statuses, no horizontal overflow |
| `640px-1024px` | Compact two-column row |
| `>=1024px` | Full row with sidebar visible |

The standard `WorkshopPageShell` handles app chrome. No bespoke mobile shell.

## Visual QA requirement

This planning-only task does not run browser/visual proof. Implementation completion requires a targeted browser smoke because the critical claims depend on real auth, cookies, redirect, and layout:

- authenticated `/workshop/proposals` list
- empty state
- desktop and mobile no-overflow screenshots or equivalent browser assertions
- Review click to `/share/[token]`
- no hash/credential values in URL, DOM, or network responses

Storybook/Impeccable/design QA are optional unless implementation diverges from existing workshop patterns or visual proof fails.

## UX regressions to avoid

1. Do not break anonymous `/share/[token]`.
2. Do not change Projects "Shared" tab.
3. Do not add estimator "Sent" workflows here; that belongs to Publisher.
4. Do not introduce decorative cards, marketing copy, or oversized hero patterns.
