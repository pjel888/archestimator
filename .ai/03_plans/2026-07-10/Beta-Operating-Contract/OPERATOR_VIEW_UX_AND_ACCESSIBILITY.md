# Operator View UX And Accessibility

## Authority And Scope

This support contract expands `REQ-003`, `AC-003`, `TEST-003`, `RISK-002`, and
`UNIT-002`. It describes the operator-facing state and accessibility contract;
it is not a second implementation plan and does not claim browser or production
proof.

## User Job And Before/After Journey

The Beta operator must answer: who was invited, who activated, where estimating
or publication stopped, whether support or incidents need action, whether the
latest recovery/release evidence is current, and which facts are unavailable.
Today `SRC-003` records a mixture of repository-backed Overview values, one
explicitly unavailable metric, an approximate one-point trend, and missing
activation-cohort stages. The target view composes server-side aggregates and
labels every value with source, as-of time, availability, and actionable failure
state; an approximation is never presented as measured trend data.

## State Matrix

| State | Presentation | Operator action | Evidence expectation |
| --- | --- | --- | --- |
| Loading/pending | Stable skeleton or progress label; existing values are not presented as current | Wait or leave safely | DOM state test; no layout-dependent claim unless browser-tested. |
| Real data | Value, time window, source, and as-of timestamp | Inspect/drill into an authorized surface | Repository plus component evidence. |
| Valid zero/empty | Explicit zero or `No activity in this window` | Adjust a permitted filter or continue | Fixture proves source executed successfully. |
| Partial | Available values plus named unavailable inputs | Use available facts without inferring missing ones | Mixed-source fixture. |
| Stale | Last value and visible stale label with age | Refresh or follow source-specific next action | Clock-controlled freshness fixture. |
| Unavailable/error | `Unavailable`, safe reason category, and next action | Retry, inspect runbook, or escalate | Source failure fixture; no sample fallback. |
| Denied | No protected metric data; permission explanation | Use authorized account or contact admin | Lowest-role and cross-workspace denial test. |
| Degraded/offline | Last-known data only when registry permits, clearly marked | Retry after connectivity/service recovery | Degraded-state fixture. |

## Information And Interaction Contract

- Preserve the existing Admin authorization boundary; aggregates do not weaken
  repository access predicates or expose person-level records unnecessarily.
- Corporate-account roles (`owner`, `team_leader`, `member`, `viewer`) remain
  organization metadata unless a separately approved product-authz contract
  says otherwise. They do not satisfy the platform-admin gate or imply access
  to another workspace's operator facts.
- Primary groupings are cohort/activation, estimating/output, publication and
  recipient engagement, feedback/support, incidents, recovery, and release.
- Each grouping exposes one status summary, source/as-of metadata, and a bounded
  next action. It must not turn missing providers into zero values.
- Filters use deterministic URL or server state where shareable/reloadable
  behavior matters; no hidden client-only source of truth may change a metric
  denominator.
- Pagination or bounded aggregation is required for person-level drill-down;
  the overview cannot load unbounded rows to compute cards in the browser.

## Accessibility Contract

- Use semantic headings, tables/lists, and existing `src/components/ui/`
  primitives where practical. Color is never the only availability or severity
  signal.
- Status names are programmatically determinable. Updated values announce only
  when the operator initiated refresh or the change requires attention; routine
  polling must not create a live-region flood.
- Keyboard order follows reading order. Filters, refresh, retry, and drill-down
  controls have stable names, visible focus, disabled/pending states, and focus
  return after dialogs or routed detail views.
- Error, stale, and unavailable states remain readable at 200% zoom and narrow
  reflow. Tables provide a usable small-viewport alternative without hiding the
  source or as-of fields.
- Touch targets and contrast follow the existing component contract. Motion is
  unnecessary for operational state and must respect reduced-motion settings if
  introduced by an existing primitive.

## Performance And Failure Boundaries

The server aggregation must declare source timeouts, partial-result behavior,
query count, cohort fixture size, and a regression threshold before `AC-003` can
pass. A slow or failed source becomes an unavailable input; it cannot block the
entire operator view indefinitely or silently reuse stale data past its registry
window.

## Evidence, Ownership, And Handback

`UNIT-002` owns repository and DOM fixtures for real, zero, empty, partial,
stale, denied, error, and unavailable states. Its repository fixtures must prove
searched and unsearched SQL placeholder order, pagination, scoped session
aggregation, corporate-role/platform-admin separation, cross-workspace denial,
and the versioned flag-audit before/after summary without relying on
the mock's current bind order. Static/DOM proof covers semantics
and state rendering; browser proof is required only if routing, responsive
composition, or focus across navigation cannot be proven at that level. The
output to `UNIT-006` is a versioned aggregation DTO and availability contract,
not screenshots or this document.
