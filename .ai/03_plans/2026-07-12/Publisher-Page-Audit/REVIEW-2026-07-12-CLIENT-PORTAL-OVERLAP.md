# Review — Client Portal overlap

Reviewed: 2026-07-12

## Decision

**RETAIN ACTIVE — not archive eligible.**

The newer `Archestimator-Client-Portal-Audit-Plan-Pack` is the controlling plan
for the v2 `client_portals` control center, its migration, and the customer
portal contract. It does not supersede the still-live legacy publisher and
share surfaces audited here.

## Retained unique work

- `PF-1` through `PF-5`: remove the legacy publisher's serial/broad D1 access
  patterns and defer its heavy share UI modules.
- `BUG-1` through `BUG-3`: preserve source rows when limiting activity,
  eliminate the client-response dedupe race, and repair manager error paths.
- `A-BUG-1` through `A-BUG-6`, `A-BUG-12`, and `A-BUG-13`: correct legacy
  roster selection, URL/deep-link state, Share Wizard lifecycle, and related
  accessibility behavior.
- `SEC-1`: verify and, if needed, enforce no-store handling for shared HTML.
- `D-15`: provide semantic roster accessibility for the legacy publisher
  surface.

## Overlap boundary

The v2 plan may replace legacy flows over time, but it does not prove that
existing `/workshop/publisher`, legacy publisher components, or
`src/lib/publisher/**` are retired. Their active users and correctness risks
remain within this audit's scope until implementation or an explicit removal
decision provides evidence otherwise.

## Archive condition

Archive only after every retained finding is either implemented and verified,
or explicitly transferred to an active replacement plan with a documented
legacy retirement/removal proof. The current review finds neither condition.

## 2026-07-12 implementation update

- `BUG-2` is implemented in `src/lib/publication/d1-store.ts`: a failed D1
  batch now rechecks the publication/recipient response pair and returns the
  existing duplicate result only when a concurrent request created it. The
  focused activation producer contract covers that race.
- `SEC-1` already has a local implementation in `next.config.ts`: the
  `/share/:path*` response includes `Cache-Control: no-store`. Hosted Worker
  response evidence remains a `UNIT-020` release boundary, so this is not a
  completed hosted-proof claim.
- The new Client Portal create/compose/publish flow is active work in
  `UNIT-017`; it does not retire the legacy publisher until `UNIT-018` and
  `UNIT-021` have migration and retirement evidence.
- `UNIT-018` now has a manager-gated, dry-run-first legacy migration service.
  It preserves legacy token continuity and reports ambiguous legacy audience
  records without merging them. Applied imports must pass deterministic
  portal/issue/token/hash/count readback before their mapping is marked
  `verified`; only then does the legacy Publisher roster expose an `Open Client
  Portal` bridge to the project-scoped v2 control center. This is not an
  automatic redirect or retirement: no current legacy publication has been
  applied/cut over, so this audit remains active and archive-ineligible.
- The shared decision endpoint now preserves legacy-token handling while
  dispatching only Client Portal tokens to the v2 handler. This closes a
  compatibility regression in the overlap path, but does not retire the legacy
  Publisher or resolve this audit's remaining retained findings.
