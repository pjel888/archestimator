# UNIT-012 — Publisher Discussion Inbox and Owner Replies

## Delivered

- `src/app/workshop/projects/[projectId]/client-portals/[portalId]/discussions/page.tsx` is a manager-gated discussion route with an explicit portal identity.
- `PublisherDiscussionInbox` exposes target context, client-visible history, public reply, isolated internal notes, resolve/reopen, and refreshed action queues.
- Owner actions retain explicit `client` versus `internal` message visibility; recipient history cannot select internal notes.

## Validation

- Focused Client Portal suite passed: 11 files, 32 tests.
- Targeted ESLint and `git diff --check` passed.

## Boundary

- The existing Publisher drawer does not yet carry a v2 portal identifier, so it does not guess a portal. `UNIT-016` owns portfolio/control-center navigation.
- No browser, hosted D1, or provider proof is claimed.
