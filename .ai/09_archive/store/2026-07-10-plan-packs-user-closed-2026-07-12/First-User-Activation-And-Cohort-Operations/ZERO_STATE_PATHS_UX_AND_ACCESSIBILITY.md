# Zero-State Paths, UX, And Accessibility

This is a supporting review artifact for `UX-001`, `REQ-001`, `UX-002`, and
`UNIT-002..004`. Stable records remain in `REQUIREMENTS_AND_DECISIONS.md`; the
only execution authority is `IMPLEMENTATION_PLAN.md`.

## Current And Target Boundary

The current Projects client distinguishes search-empty and status-empty states,
but a settled All tab with zero owned projects renders no first-value choice.
The target adds one true-zero branch without changing the two existing filtered
empty branches. Server data determines eligibility; the client owns only focus,
pending, dialog, and recovery presentation.

| State | User-visible result | Allowed action | Proof owner |
|---|---|---|---|
| Settled, All tab, zero owned projects, creator role | Exactly guided sample, workspace template, and blank | Start one authorized path | `UNIT-002`, `TEST-002` |
| Search has no results | Existing search recovery remains | Clear or change search | Existing Projects regression suite |
| Status filter has no results | Existing status recovery remains | Change status filter | Existing Projects regression suite |
| Viewer/non-creator | Contact-owner/help state; no create control | Navigate to help or leave state | `TEST-002`, `TEST-005` |
| Server data loading | Stable loading region; no false zero state | Wait or navigate away | DOM state test |
| Path request pending | Selected control busy; all path submissions disabled | Cancel only when the action contract permits it | `TEST-002`, `TEST-003` |
| Partial sample/template setup | Explicit resume, retry, delete-partial, and blank fallback | One idempotent recovery action | `UNIT-003`, `TEST-003` |
| Recoverable action error | Shaped error and retry; entered safe fields retained | Retry or choose blank | `TEST-003` |
| Checklist incomplete | Non-blocking checklist with valid recovery targets | Deep-link to the next domain task | `UNIT-004`, `TEST-004` |
| Checklist complete or dismissed | Collapsed summary; Getting Started can reopen it | Reopen without clearing history | `UNIT-004`, `TEST-004` |
| External milestone unavailable | Honest `not_available` or degraded row | Continue editing or open support | `TEST-004`, `TEST-006` |

## Interaction And Accessibility Contract

- Use semantic headings, buttons, form labels, error descriptions, and live
  status. Do not turn a whole decorative container into the only control.
- Initial focus remains in normal document order. Opening a template chooser
  moves focus to its named heading or first field; closing returns focus to the
  path control that opened it.
- Busy and disabled state is programmatic and visible. Duplicate submit cannot
  create another attempt. Escape closes only dismissible overlays and never
  abandons an already committed partial setup without an explicit recovery row.
- The three paths remain understandable at 320px and 200% zoom without horizontal
  page scrolling. Touch targets and control dimensions do not shift when status
  text changes. Reduced-motion users receive no essential motion transition.
- Checklist completion and collapse use a polite announcement. Error text is not
  color-only, and path labels do not rely on icons alone.
- Guided sample is visibly identified as demo data on every project, estimate,
  preview, and export surface named by the implementation unit.

## Server And Client Ownership

`src/app/workshop/projects/page.tsx` owns the authenticated server seed and sends
serializable progress, role, and template-summary DTOs only when the authoritative
project count is zero. `FirstProjectZeroState.tsx` is the bounded path-control
island. `FirstEstimateChecklist.tsx` derives presentation from server-owned facts;
it may persist dismiss/reopen state but never user-asserted completion.

## Review And Resume

Static/DOM proof covers state selection, names, roles, busy/disabled behavior,
and unchanged filtered empties. The only browser-only claim is routed focus,
refresh persistence, and 320px reflow in `UNIT-007`; planning documents cannot
satisfy it. Resume from the relevant canonical unit and re-read the current
Projects client before choosing the insertion seam.
