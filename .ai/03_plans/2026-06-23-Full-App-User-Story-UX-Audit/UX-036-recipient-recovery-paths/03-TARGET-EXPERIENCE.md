# UX-036 — Target Experience

Date: 2026-06-23

## Target UX

Recipient sees whether to retry, unlock, request a new link, or contact the owner.

---

## Copy Strings (target)

| Surface | Copy |
|---|---|
| Heading | Derived from fix: Add recipient-facing recovery copy for expired session, invalid/revoked links, u |
| Body | Recipient session expiry, dead links, unsubscribe links, and asset/API failures are covered mechanically but not as recovery stories. resolved by Add recipient-facing recovery copy for expired session, invalid/revoked links, unsubscribe edge cases, and failed asset loads. |
| CTA | Action verb (Save / Retry / Request / Cancel) |

### Recovery Copy

| State | Copy |
|---|---|
| Loading | "Loading..." with Skeleton |
| Empty | "No items yet." |
| Error | "Something went wrong. [Retry] [Contact support]" |
| Permission | "You don't have access to this. [Request access]" |

---

## State Matrix (target)

| State | Trigger | a11y semantics |
|---|---|---|
| Idle | Mount, no operation | `aria-busy="false"` |
| Loading | Async in flight | `aria-busy="true"`, `aria-live="polite"` |
| Success | Operation completed | `role="status"`, `aria-live="polite"` |
| Error | Operation failed | `role="alert"`, `aria-live="assertive"` |
| Permission denied | User lacks role | `aria-disabled="true"` |

---

## Accessibility Requirements

| Requirement | How |
|---|---|
| Keyboard parity | Enter / Space / Arrow keys for every mouse action |
| Screen reader | `role`, `aria-live`, `aria-label` per state matrix |
| Focus management | Move focus on open; return focus on close |
| Color contrast | WCAG 2.2 AA |
| Reduced motion | Respect `prefers-reduced-motion` |

---

## Non-Goals

- No IA redesign.
- No new data models / permission roles / persistent state (unless in 08-DECISIONS).
- No provider proof — local/browser only per 06-VERIFICATION.

---

## Linkage

- [02-CURRENT-STATE-ANALYSIS.md](02-CURRENT-STATE-ANALYSIS.md)
- [04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md)
