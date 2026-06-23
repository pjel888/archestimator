# UX-043 — Target Experience

Date: 2026-06-23

## Target UX

User and support can identify whether the issue is redirect, invite, workspace, role, or save failure.

---

## Copy Strings (target)

| Surface | Copy |
|---|---|
| Heading | Derived from fix: Add or sharpen user-facing and admin-facing recovery states for next, invites, w |
| Body | Auth redirect sanitization, broken invite repair, workspace settings saves, and role-aware account recovery are too broad in first-pass rows. resolved by Add or sharpen user-facing and admin-facing recovery states for next, invites, workspace/default workspace, profile, and account settings. |
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
