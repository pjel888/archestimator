# 04 - UX Paths, Happy Paths, Sad Paths, and Edge Cases

## Fit Summary

The existing feature set fits the receiver job only if layout makes the estimate canvas primary. Passwords, comments, decisions, charting, tree view, and grid view are all useful, but their order and weight must change by persona.

| Persona | Must be optimized | Secondary |
| --- | --- | --- |
| Client decision-maker | project/sheet total, scope scan, response action | full row filtering |
| Cost reviewer / QS | tree/grid rows, search, section totals | hero imagery |
| Procurement / buyer | cost drivers, material/image detail, comment context | package-level branding |
| Executive mobile reviewer | first-screen summary, quick revise/accept path | full donut labels |
| Project sender / manager | trust/status clarity and fewer recipient questions | advanced exports |

## Path 1 - Open View-Only Link

### Happy Path

1. Recipient opens `/share/[token]`.
2. Page validates token and loads snapshot.
3. Recipient sees project identity, view-only state, total, sheet tabs, and estimate content.
4. Recipient scans tree/grid rows and understands the cost structure.

### Current Friction

- The page first reads as a centered document, not a workspace.
- The chart and hero push row content down.
- The right rail may be empty or low-value when no recipient session is active.
- The estimate pane does not use enough desktop width.

### Planned UX Direction

Make the first desktop viewport include:

- project name and status,
- selected sheet and total,
- quick section navigation,
- primary row/tree content,
- response/comment state only as a contextual rail.

### Fit Check

This path fits the current features only if the chart moves out of the lead position and sheet controls move above row content. If the chart remains above tabs, the path will continue to optimize presentation over inspection.

## Path 2 - Password-Protected Link

### Happy Path

1. Recipient opens protected link.
2. Password gate appears.
3. Recipient enters password.
4. Access cookie is set and snapshot loads.

### Sad Paths

- Wrong password.
- Too many attempts.
- Recipient does not know password.
- Link is expired/revoked/invalid.

### Planned UX Direction

Keep the password gate narrow and focused, but add future planning for:

- contact sender affordance,
- lockout duration copy,
- stronger error hierarchy,
- password gate visual parity with final receiver shell.

No password behavior changes should be bundled into layout work unless explicitly scoped.

## Path 3 - Recipient Session Link

### Happy Path

1. Recipient opens email link with the accepted recipient token query parameter.
2. Server verifies recipient token.
3. Session cookie and client flag are set.
4. Decision and comment controls appear.
5. Recipient accepts, declines, requests revision, or comments.

### Current Friction

- Source inspection on 2026-05-31 found generated recipient emails using `?rt=...` while the receiver route reads `?recipient=...`. The final implementation must align generated links and receiver parsing before session-gated controls are considered reliable.
- If not session-enabled, the right rail can mostly communicate that interaction is unavailable.
- Decision and comments compete with estimate reading width on desktop.
- On mobile, comments sit below estimate content and decision controls may not be immediately apparent.

### Planned UX Direction

Create a response model by viewport:

- Desktop: right rail with decision state, recipient identity, recent comments, and a collapse/minimize affordance if the estimate needs more width.
- Mobile: compact sticky response bar or top-of-estimate response strip, with comments in a bottom sheet or separate section.

### Response Lifecycle

| State | UX requirement |
| --- | --- |
| No session | Show a compact explanation that recipient links enable responses; do not reserve a large empty rail |
| Session active, no decision | Show response actions with non-legal wording and clear optional/required note behavior |
| Revision requested | Encourage or require a note explaining requested changes |
| Already submitted / 409 | Show locked state with the recorded response and clear "comments remain available" copy |
| Reload after local decision | Fetch/persisted state should eventually replace local-only confidence; until then, copy must not imply history is loaded if it is not |
| Session expired | Hide or disable response controls with a reload/use-recipient-link path |

Decision copy must say "response" or "send response" rather than legal approval language. Accept means "this estimate package looks acceptable for follow-up"; it does not mean signed contract, purchase order, or payment authorization.

### Fit Check

The response model should not be identical for session and non-session links. A non-session viewer needs a small status cue, not a full rail. A session viewer needs clear response controls, but those controls should not reduce the estimate canvas until they contain useful content.

## Path 4 - Compare or Switch Estimate Sheets

### Happy Path

1. Recipient sees all selected estimate sheets as tabs.
2. Recipient switches sheets.
3. Active sheet total, chart, tree/grid state, and row content update.
4. Session storage remembers the active sheet.

### Current Friction

- Sheet tabs are below the large chart, so sheet navigation is not early enough.
- There is no explicit package-level total vs sheet-level total comparison.
- Grid and tree mode are local per sheet, which is good, but the controls visually look like a secondary afterthought.

### Planned UX Direction

Move sheet navigation into the main estimate toolbar near the top of the receiver workspace. Add a compact summary strip with project total, sheet total, row count, and last published/generated timestamp.

## Path 5 - Inspect Line Items

### Happy Path

1. Recipient uses tree or grid to find a section.
2. Recipient reads descriptions, quantities, units, and totals.
3. Recipient can identify assumptions and cost drivers.

### Current Friction

- Tree row density is compact but hard to scan in a long vertical page.
- Grid preview has no search, sort, sticky header, or filter.
- Tree View disclaimer is visible, but the UI does not use available snapshot `treeNodes`.
- Row images help recognition but can add visual noise in dense rows.

### Planned UX Direction

Prioritize:

- sticky estimate toolbar,
- search/filter across row description, material, designation, discipline,
- optional sort in grid mode,
- section-level totals and row counts,
- row detail preview or inline expansion for assumptions and images.

### Minimum Viable Row Review

The next implementation should support these row-review tasks before advanced features:

1. Find a row by text.
2. Jump to a section.
3. Compare a section subtotal against the sheet total.
4. See quantity, unit, and total without horizontal confusion.
5. Open or expand image/detail context only when needed.
6. Leave a general comment while preserving visible sheet/section context.

Comment context in the first layout pass stays general to the shared link. The composer should remain visually near the active sheet/section context, but row-scoped comment persistence is deferred until a dedicated API/data slice.

## Path 6 - Mobile Review

### Happy Path

1. Recipient opens link on mobile.
2. Project and total are visible.
3. Recipient can switch sheets and read rows.
4. Recipient can respond or comment without losing place.

### Current Friction

- Chart dominates the top of the estimate section.
- Tree is collapsed by default, showing only root in the first viewport.
- There is no mobile-first row navigation pattern beyond vertical scroll.

### Planned UX Direction

Mobile should use:

- compact project/sheet summary,
- sheet tabs before chart,
- chart behind a collapsed "Breakdown" panel or secondary tab,
- tree/grid toggle near content,
- sticky response affordance only when recipient session exists.

### Mobile Fit Check

The mobile route should assume the user arrived from email and has limited time. The minimum mobile first flow is:

1. identify project and view-only status,
2. see active sheet total,
3. switch sheet if needed,
4. open Tree/Grid content,
5. respond or comment only after enough context.

Anything before step 4 that consumes a full screen must be collapsed or moved.

## Sad Path UX Contracts

| State | Primary message | Allowed action | Private-data boundary |
| --- | --- | --- | --- |
| Invalid token | Shared link unavailable | none or return to sender copy | do not reveal project name |
| Revoked link | This shared link has been turned off | contact sender if contact approved | do not reveal current snapshot |
| Expired link | This shared link has expired | contact sender if contact approved | do not reveal current snapshot |
| Wrong password | Password was not accepted | retry | project name may remain hidden until unlocked |
| Lockout | Too many attempts; wait before retrying | disabled retry until cooldown | do not reveal whether password was close |
| Empty snapshot | No estimate sheets were included | explain sender needs to update shared page | project metadata can show only if token valid |
| Comment failure | Comment was not sent | retry or queued status | do not expose server internals |
| Decision duplicate | Response already recorded | show locked state | do not allow second response without new product decision |

## Path 7 - Print or Share Internally

### Current State

There is no explicit print stylesheet or export UX in the receiver. Browser print will render the app-like page as-is.

### Planned UX Direction

Plan a print mode after layout stabilization:

- hide comments/decision controls by default,
- keep project identity and snapshot timestamp,
- render rows in printable order,
- avoid clipped charts and sticky elements.

This is a separate feature slice, not part of the first layout improvement.
