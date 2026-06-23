# UX-039 — Target Experience

Date: 2026-06-23

## Target UX

Release operator previews a campaign, verifies target users and safe link, then inspects delivery state.

---

## Copy Strings (target)

| Surface | Copy |
|---|---|
| Heading | Derived from fix: Add campaign authoring/preview/targeting and delivery inspection rows with safe  |
| Body | Release announcement authoring, preview, targeting, and delivery inspection are not distinct operator stories. resolved by Add campaign authoring/preview/targeting and delivery inspection rows with safe CTA validation. |
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
