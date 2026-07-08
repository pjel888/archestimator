# 05 — UX / UI / Accessibility Plan

This plan hardens the **existing** realtime surface. It does not add new user-facing UI.
The UX/a11y scope is therefore: (a) preserve the current presence cluster, cursor, and
row-update experience; (b) define the **states the user sees when realtime degrades**; and
(c) confirm no new a11y regression is introduced. Per the repo verification policy, browser
proof is opt-in; most claims here are provable by static review + DOM tests.

## Primary user journeys (unchanged, to preserve)

1. **Presence cluster:** A project member sees who else is online and their coarse surface
   (overview/estimates/data/library/templates/settings/workshop/other) in the project
   teamspace header. (`ProjectTeamspaceHeader`, `use-project-presence.ts`)
2. **Estimate cursors:** A member editing an estimate sheet sees other editors' cursors
   (color-matched, 80ms throttle, 6px min-distance, 5s stale-GC).
   (`EstimateSheetCursorLayer`, `use-estimate-cursor-broadcast.ts`)
3. **Estimate row updates:** A member sees another editor's row quantity/contingency change
   in near-real-time. (`use-estimate-row-update-broadcast.ts`)

## States the user sees (degradation — the new behavior this plan defines)

Full state matrix (Improve-Prompt §3 set; genuinely-N/A states marked with reason):

| State | Applicable? | Trigger | User-visible result | A11y note |
|---|---|---|---|---|
| `loading` | yes (as `subscribing`) | connecting | existing loading affordance; no new spinner | n/a |
| `empty` | yes | no other members online | presence cluster shows only self (or is absent) | empty state must not read as an error |
| `success` | yes (as `subscribed`) | connected + authorized | presence cluster + cursors live | presence items semantic (name/role), not color-only |
| `partial-success` | yes | transport up, some peers unverifiable (envelope rejected) | unverified peers omitted; cluster shows verified-only | silent; unverifiable peers simply absent |
| `error` (transient) | yes | `CHANNEL_ERROR` / `TIMED_OUT` | app continues; realtime pauses | do NOT announce via `aria-live` (avoid noise) |
| `conflict` | **n/a** | — | realtime carries no mutable shared doc with conflict semantics; estimate-tree merges are CRDT-like via contract v2 | n/a by design |
| `permission-denied` | yes | authz probe fails / non-member | no subscribe; realtime simply absent (denial indistinguishable from absence — security property) | no announcement (covert denial) |
| `offline` | yes | client network loss | realtime pauses; reconnect on restore | n/a |
| `retry` | yes | `CLOSED`/`CHANNEL_ERROR` backoff | cursors/presence pause then resume (FR-06) | optional polite `aria-live` "reconnecting" is a future a11y decision; not required for closed beta |
| `timeout` | yes | subscribe >10s (`SUBSCRIBE_TIMEOUT_MS`) | `TIMED_OUT` → error path | same as error |
| `cancellation` | **n/a** | — | realtime has no long-running user-initiated mutation to cancel; the user navigates away (cleanup is the hook unmount) | n/a by design |
| `idle` | yes | transport disabled, or not subscribed | no presence cluster; cursors absent; app fully usable (the dev default) | n/a |
| `auth_failed` (recovering) | yes | token expired mid-session | FR-06 refreshes transparently; user should not see it | n/a |
| `cap_exceeded` (room full) | yes | FR-04 reject | new joiner cannot collaborate; **future impl surfaces a non-modal message** ("room at capacity, retry shortly") | must not be color-only; text + icon (P2 — deferred; cap ≫ closed-beta load) |

## Action-level accessibility proof matrix (mandatory)

| User-facing action | Keyboard path | Focus target / restoration | Accessible name / live-region | Proof type |
|---|---|---|---|---|
| Presence cluster render (read-only display) | none (decorative cluster, not operable) | none | each item: accessible name = roster display name + role; **not** color-only | DOM test asserting semantic name + role text (existing roster-from-server-trust design); source review of `presence-surface.ts` (coarse surface only) |
| Estimate cursor render (decorative) | none (cursors are `aria-hidden` decorative indicators) | none | `aria-hidden="true"`; never focusable | DOM/source test asserting cursors remain `aria-hidden` (preserve) |
| Row-update application (data change, no new control) | none (existing estimate-row controls keep their keyboard paths; realtime only updates values) | existing row control focus preserved | no new announcement; updates are reflected in existing AT-readable values | existing estimate-row a11y tests (out of scope to change) |
| Cap-exceeded message (P2, future) | dismissable via keyboard if modal-ish; else `role="status"` | focus moves to the message, restorable to last position | accessible name "Room at capacity"; `role="status"` (polite) or focusable dialog | DOM test when implemented (P2; not required for closed beta) |
| Reconnecting indicator (future, optional) | n/a (status, not operable) | n/a | polite `aria-live` "Reconnecting…" only if shown >10s | DOM test if implemented (deferred) |

## Why browser proof is mostly NOT required here

Per `AGENTS.md` verification policy, cosmetic/state changes provable by static review + DOM
tests do not auto-trigger Playwright. The a11y/UX claims above are provable by:
- DOM tests asserting presence items render semantic names (existing roster tests).
- Source review confirming cursors stay `aria-hidden`.
- The existing color-contrast tests (`collaboration-colors-contrast.test.ts`).

Browser proof is reserved for TEST-02 (hosted presence/reconnect/token-expiry) and only if
OPEN-02 approves it.

## UI components affected (future implementation — none modified by this plan)

| Component | Change | A11y consideration |
|---|---|---|
| `ProjectTeamspaceHeader` presence cluster | none directly; consumes hardened hook output | preserve semantic names/roles; no color-only status |
| `EstimateSheetCursorLayer` | none directly; consumes hardened cursor hook | cursors are decorative (`aria-hidden`); ensure that remains |
| (new, P2) cap-exceeded toast | only if FR-04 cap is hit at closed-beta load (unlikely) | text + icon, not color-only; `role="status"` |

## Accessibility checklist (preservation-focused)

- **Keyboard:** realtime adds no keyboard-operable controls. No change.
- **Focus:** cursors and presence are non-focusable decorative elements. No change.
- **Screen-reader:** presence cluster items must remain semantic (name + role), not
  color-only. Existing roster-from-server-trust design preserves this (display identity from
  roster, not wire). SEC-01c guards against leaking fine-grained state.
- **Color/contrast:** cursor colors are already contrast-tested
  (`tests/vitest/collaboration-colors.test.ts`,
  `collaboration-colors-contrast.test.ts`). No change.
- **Reduced motion:** cursors are transient; if a reduced-motion concern exists it is
  pre-existing and out of scope here.
- **Live regions:** do NOT add an `aria-live` region for transient realtime errors (noise).
  Reserve live-region announcements for a future "reconnecting for >10s" state if user
  feedback demands it.

## UX regressions to guard against (adversarial)

- **Ghost presence:** stale entries persist after a user leaves (F3/F10). FR-03 + FR-07 fix.
- **Silent cursor freeze:** a peer's cursor stops moving but the dot remains (envelope
  expired, F4). FR-06 refresh + existing 5s stale-GC handle it.
- **Flicker on reconnect:** presence cluster flashes empty/full on every reconnect. FR-03's
  stable keying + the hook's `setEntries` batching should prevent it; add a DOM test if it
  surfaces.
- **Cap message scaring users:** if FR-04 ever fires at closed-beta load, the message must
  be reassuring and non-blocking. Deferred (P2).

## Responsive / i18n

- Realtime UI is responsive-by-inheritance (header + sheet). No layout work here.
- Copy for any future cap/reconnecting message must go through the existing i18n string
  surface (out of scope for this plan; flagged for the future impl).
