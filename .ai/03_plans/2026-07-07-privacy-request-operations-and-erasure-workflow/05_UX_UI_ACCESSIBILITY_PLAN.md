# 05 — UX, UI, And Accessibility Plan

> Behavior, states, and a11y — not visual design. `DESIGN.md` is alpha-stage guidance and does not override these contracts or owner direction. UI primitives reused from `src/components/ui/`. No new design system is invented.

## 1. Actors and primary journeys

- **Requester (anonymous):** submits a request with email → receives confirmation email → (optional) verifies identity via token link → looks up status by id+token.
- **Requester (authenticated):** submits while signed in → identity auto-verified → sees status in a future "my requests" surface (out of scope for closed-beta beyond the lookup endpoint).
- **Operator (platform admin):** opens the queue → triages (verify identity, assign, transition `submitted→in_triage→in_progress`) → fulfills (export; or erasure dry-run+confirm) → transitions to `completed`/`rejected` → evidence recorded.

## 2. State inventory

| State | Definition | Primitive | Current coverage |
|---|---|---|---|
| Queue loading | Fetching list | `Skeleton` / table skeleton | none — new |
| Queue empty | Zero requests | `EmptyState` | none — new |
| Queue error | Fetch failed | `ErrorState` + retry | none — new |
| Detail loading | Fetching one | `Skeleton` | none — new |
| Detail not-found | Unknown id | `NotFound` | none — new |
| Permission denied | Non-operator | `Forbidden` (403) | pattern in `workshop/settings/users` |
| Transition pending | Mutating | button `disabled` + `Spinner` | none — new |
| Transition conflict | Illegal/unverified | inline `Alert` (409) | none — new |
| Identity not verified | Blocks `in_progress` | `Badge` "verification pending" + verify action | none — new |
| Export ready | Evidence present | `Badge` + download link (operator only) | none — new |
| Erasure dry-run result | Counts per table | `Dialog` confirm with counts | none — new |
| Erasure confirm pending | Mutating | `Dialog` button `disabled` + `Spinner` | none — new |
| SLA breach | Past due | `Badge` "breached" (red + icon) | none — new (P4) |

## 3. Loading-state decision tree

```
Route-level loading.tsx?
  - Queue route: yes, table skeleton (server component fetch)
  - Detail route: yes, skeleton matching layout
Section-level Suspense?
  - No heavy streamed sections in closed-beta; route-level is enough
Mutation pending?
  - Disable the triggering button; show inline spinner; do not navigate until settled
Long operation (export/erasure)?
  - Optimistic "generating..." state; poll or refetch; never block the queue
```

## 4. Accessibility behavior

- **Keyboard path:** queue is a table/grid operable with Tab/Enter; transition actions are buttons with accessible names; dialogs trap focus and restore on close (reuse `src/components/ui/dialog`).
- **Focus order:** logical DOM order; focus restored to the triggering button after a dialog closes.
- **Screen-reader semantics:** status changes use `aria-live="polite"` region; statuses conveyed by text (not color alone); tables use `<th scope>`; badges have accessible names.
- **Visible focus:** all interactive elements have a visible focus ring (Tailwind `focus-visible:` tokens).
- **Reduced motion:** no non-essential animation; spinners respect `prefers-reduced-motion`.
- **Contrast:** status colors meet WCAG AA against backgrounds; non-color cue always present (icon + text).
- **Copy hierarchy:** the request id is the primary identifier shown to requesters; never the raw email.

## 5. UX regressions to prevent

- Do not regress the existing anonymous intake response (201 + id; fast; no email-blocking).
- Do not expose raw email/IP/UA anywhere in the UI (only redacted/hashed).
- Do not allow the operator UI to bypass the state machine (all transitions go through the repository guard).
- Do not make erasure a one-click action (always dry-run → confirm dialog with counts → re-auth).

## 6. Copy and content hierarchy

- **Requester-facing copy** (confirmation/status emails, status lookup) is **gated on `OPEN-LEGAL-01`**. Until resolved, copy is generic: "We received your privacy request (ref: `<id>`). We'll respond within `[SLA]`."
- **Operator-facing copy** is ungated; uses existing workshop-settings tone.

## 7. User-facing documentation implications

- `src/app/privacy/page.tsx` currently says "email support@archestimator.com for deletion." Once `OPEN-LEGAL-01` resolves, it links to the request workflow (`DOC-1`). Until then, no doc change.

## 8. Full state matrix (mandatory)

Legend: `✓` covered, `✗` not covered, `△` partial.

| Surface | Loading (route) | Loading (section) | Empty | Error | Not-found | Permission-denied | Conflict (409) | Validation-error | Success | Disabled | Offline/degraded | Destructive-confirm | Progress (long op) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Queue page | ✓ | ✗ | ✓ | ✓ | n/a | ✓ | n/a | n/a | n/a | ✓ | △ | n/a | △ |
| Detail page | ✓ | ✗ | n/a | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | △ | ✓ (erasure) | ✓ |
| Status lookup (requester) | △ | ✗ | n/a | ✓ | ✓ | ✓ (token) | n/a | ✓ | ✓ | ✓ | ✗ | n/a | n/a |
| Intake (public form) | n/a | n/a | n/a | ✓ | n/a | n/a | n/a | ✓ | ✓ | ✓ | ✗ | n/a | n/a |

Cells marked `△`/`✗` are explicit closed-beta gaps with an owner note: offline/degraded is not specially handled in closed-beta (Cloudflare edge + TanStack Query retry covers the common case); section-level Suspense is deferred (route-level is sufficient at current volume).

## 9. Action-level accessibility proof matrix

| Action | Keyboard path | Focus target / restoration | Accessible name + live-region | Proof type |
|---|---|---|---|---|
| Transition status | Tab to button, Enter | focus stays on button; live-region announces new status | "Advance to in_progress" + `aria-live` | DOM test + (optional) browser for dialog focus |
| Verify identity | Tab to action, Enter | focus to confirmation | "Confirm identity verified" | DOM test |
| Run export | Tab, Enter | button disabled → focus stable | "Generate export" + progress region | DOM test |
| Erasure dry-run | Tab, Enter | opens dialog | "Preview erasure" | DOM test + browser for dialog trap |
| Erasure confirm | Tab to confirm, Enter (re-auth) | dialog close → focus to triggering row | "Confirm erasure — irreversible" | browser proof (destructive + focus) |

## 10. Dense / responsive constraints

- Queue table collapses to a stacked card list on narrow viewports (mirror `workshop/settings/users` responsive behavior).
- Detail page is single-column on mobile; evidence/notes in a disclosure.
- No horizontal scroll for the operator queue at any breakpoint.

## 11. Visual QA gate

| Risk | Needs browser proof? | Why |
|---|---|---|
| Erasure confirm dialog focus trap + restoration | Yes | Destructive + complex focus (browser-only claim) |
| Queue responsive collapse | Yes (one breakpoint) | Layout risk |
| Transition live-region announcement | No — DOM assertion suffices | `aria-live` is testable in DOM |
| Badge contrast / non-color cue | No — static review | Tailwind tokens + icon+text |
| Intake form validation | No — DOM/unit | Standard form behavior |

Per `AGENTS.md` proportional verification, browser proof is reserved for the two browser-only claims above; the rest use DOM/unit/static evidence.
