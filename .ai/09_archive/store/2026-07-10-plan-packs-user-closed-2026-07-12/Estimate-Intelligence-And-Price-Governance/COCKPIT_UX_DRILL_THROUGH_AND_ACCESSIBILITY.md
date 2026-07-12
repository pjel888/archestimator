# Cockpit UX, Drill-Through, And Accessibility

## Scope

This is the independent user-state review for `REQ-002`, `UX-001`, `AC-003`,
`AC-004`, `AC-011`, and UNIT-005/007. It does not change existing chart meaning
or own server health arithmetic.

## User Journey

1. The authorized Data route presents current health summary, policy/basis state,
   budget state, risk priorities, and cost drivers alongside existing charts.
2. Selecting a KPI/risk writes a canonical versioned URL filter and opens the
   exact estimate/row/category/supplier set that produced it.
3. Selected issue details are paged and show why each row matched without exposing
   internal provenance data or recomputing the rule.
4. Clearing returns to the prior comparison context; browser back/forward restores
   the same authorized selection.
5. Revision explanation is separate and can be unavailable while current health
   remains usable.

## State Matrix

| State | Presentation | Action/recovery |
|---|---|---|
| Loading/pending | Stable skeleton and busy semantics; existing content not relabeled current | Await or cancel navigation |
| No estimates | Empty cockpit without warning grade | Create/open estimate |
| Estimate with zero rows | `empty`; budget may remain visible | Add area/component/template |
| Healthy | Passive summary with evaluation/policy revision context | Continue workflow |
| Warning/error | Prioritized severity and exact drill-through | Open affected rows |
| Missing inputs | Explicit incomplete state, not zero/default | Edit project analytics inputs |
| Mixed currency | Per-estimate facts; monetary comparison disabled with reason | Select compatible estimates |
| Truncated | Incomplete marker, result count, pagination | Narrow scope/load page |
| Revision unavailable | Current health stays usable; reason and Activity path shown | Refresh/inspect Activity History |
| Repository error | No cached healthy fallback; request-safe retry | Retry |
| Unauthorized/not found | Existing denial surface; no counts/IDs | Request access outside this pack |

## Interaction And URL Contract

Rule IDs and filter values, not display text, drive route state. Unknown enums,
inaccessible IDs, invalid cursor, duplicate parameters, and unsupported version
are removed or rejected through canonical repair. A canonicalized URL must round
trip to the same visible selection; clearing must not erase unrelated project
comparison state.

## Accessibility Contract

- KPI/risk controls are semantic buttons/links with names that include label,
  severity, and count where needed; color/icon is supplemental.
- Focus moves to the drill-through heading/result region after explicit selection
  and returns predictably on clear/back; retry keeps focus at the error action.
- Result-count, error, truncation, and filter-clear changes use restrained live
  announcements. Table/list semantics preserve row-to-reason association.
- Keyboard order follows visual order; every disclosure/filter/clear/page control
  is operable without pointer input and exposes pressed/expanded/disabled state.
- At 200% zoom and narrow mobile width, summary, risk rows, filters, and actions
  reflow without clipping or forcing financial text under controls.
- Reduced motion preserves meaning; no animation is required to locate a changed
  grade or selected row set.

## Proof Boundary And Ownership

Focused DOM tests prove roles, labels, state transitions, announcements, URL
round trip, exact row counts, selection/clear/back, and bounded rendering. A
targeted browser test is reserved for real route history, cross-navigation focus,
and responsive reflow that DOM tests cannot prove. Broad screenshots/visual QA
are not completion gates.

Health summary, risk table, driver view, revision view, and route state may be
extracted as independently tested capabilities. Existing chart composition is
preserved; line-count-only refactoring is out of scope. A failed UX review returns
surface/state/filter, keyboard path, expected focus/announcement/reflow, actual
result, and UNIT-005/007 owner.

