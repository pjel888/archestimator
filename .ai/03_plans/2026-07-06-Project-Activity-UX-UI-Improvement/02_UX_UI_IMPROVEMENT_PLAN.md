# UX/UI Improvement Plan

## Product Job

The activity page is for a contractor, estimator, or project lead who needs to
answer audit questions quickly:

- What happened?
- When did it happen?
- Who did it?
- Where in the project did it happen?
- Did it affect cost, estimate structure, sharing, client decision, access, or
  collaboration?
- Is the feed complete, filtered, partial, or failed?

The page should feel like a precise project log, not a social feed and not a
generic dashboard.

## Visual Direction

Use a "compact audit cockpit" direction:

- Dense but calm.
- Neutral, product-native, and work-focused.
- Strong alignment, stable dimensions, low visual drama.
- Information hierarchy through spacing, weight, labels, and columns rather
  than oversized typography or decorative cards.
- No hero treatment, ornamental gradients, motion choreography, or new art.

The existing workshop shell stays intact. The first screen should show the
activity purpose, active filters, feed completeness, and at least one activity
row as early as possible.

## Information Architecture

### Header

The header should answer state, not consume space:

- Title: `Activity`
- Project label/name
- Result count: `Showing 10 of 10` or `10 events`
- Feed health: complete, partial, failed, loading, or filtered
- Refresh control

Target: fixed or min/max height with no wrapping surprise.

### Filter Model

Split filters into primary and secondary controls:

- Primary scope: compact segmented control or select.
- Secondary filters: actor, client, action buckets.
- Active filter summary: compact inline summary such as `All scopes - 3 actions
  - Edited by me`.
- Clear filters: visible only when filters are active.

Do not render all 11 action chips as a permanent top-level block on every
viewport. The current chip row is understandable, but it steals vertical space
and can wrap. Use a popover/drawer/panel that overlays or reserves its own
drawer slot outside the feed's top offset.

Action buckets can still use chips inside the filter panel:

- Created
- Edited
- Deleted
- Reordered
- Shared
- Comments
- Decisions
- Invites
- Views
- Versions
- System

Each chip should support:

- explicit selected state
- count when available or cheap to compute
- keyboard activation
- minimum pointer target rules

### Feed Structure

Use day groups plus ledger rows.

Desktop row columns:

| Column | Width behavior | Content |
| --- | --- | --- |
| Time | fixed | Time, relative/absolute on hover or secondary text |
| Actor/action | fixed or bounded | Actor and verb/action family |
| Target/location | flexible | Estimate/sheet/row/proposal/comment target |
| Impact/facts | flexible | Stable count of key facts, cost delta, status, snippet |
| Source/status | fixed | Estimate, share, comment, decision, access, admin, system |

Rows should be visually tighter than current cards:

- Closed row baseline target: 64-72px desktop, 72-88px mobile depending content.
- Facts visible by default: 2 or 3 maximum, then expansion.
- Text truncates with stable line clamps.
- Expansion, if included, happens below the row and only on user action.
- No row should grow because a filter changes elsewhere on the page.

### Row Anatomy

Each row should have these semantic fields:

- `occurredAt`
- `source`
- `action`
- `actor`
- `target`
- `title`
- `summary`
- `facts`
- `badges`
- `changes`
- `visibility`

Recommended display by family:

Estimate work:

- Show estimate/sheet target first.
- Show row/node/tab/sheet location when available.
- Show cost delta or quantity/rate/material/labor deltas when available.
- Show template/version/restored/reordered actions as distinct labels.

Sharing/publication:

- Show publication/proposal state.
- Show safe recipient/client context without emails.
- Show sent/resent/version facts.

Client conversation:

- Show comment visibility: client/public/internal.
- Show a one-line snippet with stable line clamp.
- Link or expand only if there is a meaningful destination.

Client decision:

- Use explicit status labels: approved, declined, requested revision.
- Show proposal/client context and decision timestamp.

Client access/security:

- Show viewed/password attempt as access/security activity, not generic system
  noise.
- Avoid alarm styling unless the event is actually dangerous.

Collaboration/admin:

- Show invite/role/member/project metadata action.
- Distinguish admin events from estimate edits.

Unknown/system:

- Replace repeated `Activity recorded.` rows with a safer fallback:
  `System activity recorded`
- Add one muted detail when available: event source, target family, or action
  code transformed to readable text.
- Never expose unsafe raw metadata, emails, or tokens.

## Layout Stability Rules

These are implementation gates, not suggestions:

1. Loading skeleton must reserve the same toolbar, filter summary, day header,
   and first-row dimensions as the settled UI at desktop, tablet, and mobile
   breakpoints.
2. Filter panels must not push the first visible activity row down. They should
   open as a popover/drawer or inside a reserved area.
3. Action bucket wrapping must not change the feed's top offset.
4. Partial-source warning must use a reserved status strip or overlay pattern.
5. Load-more pending state must reserve a row/control height before network work
   starts.
6. Appending older events must not insert content above the current viewport.
7. No-match, empty, error, and denied states must keep the toolbar footprint
   stable.
8. Row content must use fixed line clamps and predictable row min-heights.
9. Icons, badges, and hover/focus affordances must not resize rows.
10. The route shell remains `h-full min-h-0 overflow-hidden`; the feed area is
    the scroll container.

## Responsive Model

Desktop, 1280px and up:

- Ledger columns visible.
- Toolbar stays to 1-2 compact rows.
- Date group headers can be sticky within the feed scroll container.
- Filters open in popover or right-side panel.

Laptop/tablet, 768-1279px:

- Collapse source/status into row metadata.
- Keep time and title/action prominent.
- Filters open from a compact button.
- Header height should not exceed the agreed fixed budget.

Mobile, 640px and down:

- Use compact activity-list rows rather than squeezed table columns.
- Row line order:
  1. time + source/status
  2. title/action
  3. target/location and actor
  4. one fact/snippet when available
- Filters open in a drawer.
- Keep the first event visible much earlier than the current y = 358px state.

## State Matrix

| State | Target behavior |
| --- | --- |
| Initial loading | Skeleton exactly matches final top chrome and first rows. |
| Settled complete feed | Shows result count, date groups, stable rows. |
| Refreshing | Keep existing rows; show subtle busy state in toolbar, no feed jump. |
| Applying filters | Update summary immediately; keep row area reserved while results resolve. |
| No results for filters | Preserve toolbar and filters; show compact no-match panel in feed area. |
| Empty project activity | Preserve toolbar; show "No activity yet" with useful next context. |
| Editor-only denied | Preserve shell; explain required access without exposing activity. |
| Partial source | Reserved status strip explains some sources could not load. |
| Load more pending | Reserved footer row/control shows progress. |
| Load more error | Footer error appears in reserved footer area. |
| Unknown event | Safe system fallback with family/context where possible. |

## Accessibility Plan

- Keep the feed as an ordered list of semantic articles or use `role="feed"`
  deliberately if dynamic append semantics are needed.
- If `role="feed"` is used, rows should be `article` items and loading status
  should be exposed without trapping keyboard users.
- Buttons and filter chips need clear names, roles, and selected/pressed states.
- Dynamic result counts and partial/error statuses should announce through a
  polite status region.
- Pointer targets should meet WCAG 2.2 target-size expectations. On touch
  breakpoints, use larger hit areas even if the visual chip remains compact.
- Focus order: title/status, primary filter, filter panel trigger, refresh,
  clear, feed rows, load more.
- Expansion controls, if added, must expose expanded/collapsed state.

## Copy Direction

Replace generic feed language with audit-oriented copy:

- Prefer: "Row updated", "Proposal sent", "Client approved", "Password attempt",
  "Member invited", "Version created".
- Avoid: "Activity recorded" as the primary title for known events.
- Use fallback only when the event is genuinely unmapped.
- Keep actor-target text concise:
  `Philip changed Labor rate in Kitchen takeoff`
  rather than a title plus a separate vague summary when the data allows it.

## Non-goals

- No new activity source.
- No provider or D1 schema change unless implementation discovers a missing
  field required for safe copy.
- No redesign of the public shared proposal experience.
- No redesign of estimate sheet editing.
- No automatic infinite scroll.
- No decorative animation or new visual theme.
