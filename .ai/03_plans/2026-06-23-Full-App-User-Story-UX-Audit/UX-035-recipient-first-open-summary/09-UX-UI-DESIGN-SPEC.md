# UX-035 — UX/UI Design Spec

Date: 2026-06-23 | Surface: **Recipient comprehension** | Status: planned

Per [DESIGN.md](../../../DESIGN.md): SF Pro font (regular/medium), max 12px app font size, 3px border radius, zero letter-spacing, neutral palette (#292929 / #5D5D5D / #7F7F7F). All surfaces use `src/components/ui/` shared primitives — never one-off markup.

## State Rendering Matrix

| State | Visual | Copy | a11y |
|---|---|---|---|
| Idle | Default surface | Default copy | `aria-busy="false"` |
| Loading | Skeleton matching content shape | "Loading..." | `aria-busy="true"`, `aria-live="polite"` |
| Success | Green checkmark + pulse | "Saved successfully" | `role="status"`, `aria-live="polite"` |
| Error | Red border + inline text | "Add plain-language first-open summary, decision meaning, glo..." | `role="alert"`, `aria-live="assertive"`, focus to error |
| Empty | Icon + text | "No items yet." | `aria-live="polite"` |
| Permission denied | Grayed-out + disabled | "You don't have access." | `aria-disabled="true"` |

## Concrete Copy Strings

- Primary action: "Save Changes"
- Cancel: "Cancel"
- Retry: "Try Again"
- Support: "Contact Support"

- **Error to fix:** Non-technical recipients can receive a share link without a dedicated first-run explanation of terms, totals, decisions, or next steps.
- **Expected behavior:** 

## Motion

| Transition | Duration | Easing | Reduced Motion |
|---|---|---|---|
| Modal open | 200ms | ease-out | 0ms |
| Modal close | 150ms | ease-in | 0ms |
| Toast enter | 300ms | ease-out | 0ms |
| Toast exit | 200ms | ease-in | 0ms |
| Inline error | 150ms | ease-out | 0ms |
| Skeleton | 300ms | ease-out | 0ms |

## Accessibility (WCAG 2.2 AA)

- Tab order = DOM order; Enter/Space = action; Escape = close; Arrow keys = navigate
- Destructive confirmations: `role="alertdialog"` with `aria-modal="true"`
- Focus ring: 3px offset, trapped in modals, returned to trigger on close
- Color contrast: >= 4.5:1 text, >= 3:1 large; never rely on color alone
- Touch: 44x44px mobile, 24x24px desktop

## Responsive

| Breakpoint | Behavior |
|---|---|
| >= 1024px | Full layout, sidebars, multi-column |
| 768-1023 | Sidebars collapsed, single-column |
| < 768 | Stacked, full-width modals |
| All | No horizontal overflow outside data tables |

## Edge States

- Concurrent edits: "This was updated by someone else. Refresh to see changes."
- Offline: indicator bar + disable mutations
- Session expired: redirect + "Your session expired."

## Linkage

[03-TARGET-EXPERIENCE.md](03-TARGET-EXPERIENCE.md) | [05-ACCEPTANCE-CRITERIA.md](05-ACCEPTANCE-CRITERIA.md) | [10-PERFORMANCE-BUDGET.md](10-PERFORMANCE-BUDGET.md)
