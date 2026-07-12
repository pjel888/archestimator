# Golden Path Journey, Denial, And Accessibility

This supporting review artifact expands `REQ-004`, `RISK-002`, and
`UNIT-004/009`. The canonical 20-step route/action/assertion table stays in
`IMPLEMENTATION_PLAN.md`; this file adds cross-step state, denial, and
accessibility obligations without duplicating that table.

## Journey Phases And Receipts

| Phase | Canonical steps | Required receipts | Persistent boundary |
|---|---:|---|---|
| Access and workspace | 1-4 | Activation plus Operating/auth | Invite consumes once; session/workspace identity matches fixture; project query is truly zero |
| First estimate value | 5-13 | Activation, Estimate Intelligence, Calculation Parity | D1 project/estimate/tree/revision and export digest match server truth after reload |
| Publication and recipient | 14-18 | Publisher plus Activity | Snapshot scope, password/session denial, idempotent comment, and durable decision/event match fixture |
| Manager follow-up | 19-20 | Publisher plus Activity | Manager roster and append-only event/follow-up link reflect recipient actions without token leakage |

## Denial Matrix

- Consumed, expired, copied, or wrong-recipient invite/share credentials do not
  create a second identity/session or cross a publication boundary.
- Wrong password, expired/replayed session, cross-recipient/cross-workspace
  resource, unauthenticated manager route, and manager-only field access fail
  before protected projection or mutation.
- Comment retry produces one durable comment/event. Decision retry cannot create
  contradictory final state for the same idempotency identity.
- Export, publication, recipient, and activity assertions use repository/API
  truth; a visible control, navigation success, or toast alone is insufficient.

## Accessibility And Browser Policy

Each step uses semantic locators and observable server state, not CSS position or
arbitrary sleeps. Required interaction checks include named controls, keyboard
order, focus after navigation/dialog close, busy/disabled state, announced
validation/error/success, zoom/reflow, touch target, reduced motion, and mobile
public-review recovery where applicable.

The merge project is Chromium desktop. Release adds Chromium and WebKit mobile
public review. The broader Firefox/device matrix is scheduled. Product assertion
retries are forbidden; only categorized transient infrastructure retries may be
considered with retained evidence.

## Proof Boundary

`TEST-004` statically validates exactly 20 canonical mappings, stable fixture IDs,
routes, assertions, tags, receipts, reload persistence, no default skip, and no
arbitrary sleep. `TEST-010` is the authorized isolated hosted execution; static
plan validation cannot satisfy its browser claims.
