# RPC Hardening Evidence

- Date/time: 2026-06-22.
- Unit and QA/ADV IDs: U4/U5/security; QA-023; ADV-018.
- Claim: durable trust-changing RPCs use fixed search path, SECURITY DEFINER,
  expected revision arguments, beta admin checks, and no public/anon execute
  grant.
- Proof category: provider grant probe and local migration static tests.
- Files under test:
  `supabase/migrations/20260622143000_library_trust_governance.sql`,
  `tests/vitest/component-library-cost-governance-actions.test.ts`,
  `tests/vitest/component-library-attachment-lifecycle.test.ts`.
- Provider probe:
  public/anon governance RPC execute grants `0`; authenticated governance RPC
  execute grants `9`; the internal admin-check helper has no public/anon/
  authenticated execute grant.
- Local tests:
  governance schema/action tests passed `3` files and `18` tests.
- Residual risk: unauthenticated live RPC calls were not attempted with a
  browser/session token; proof is grant/predicate/static plus local tests.
- Owner lane: DB/security.
- Evidence privacy check: pass.
