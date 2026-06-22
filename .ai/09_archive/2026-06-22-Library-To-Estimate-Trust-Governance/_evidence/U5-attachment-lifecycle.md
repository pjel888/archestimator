# U5 Attachment Lifecycle Evidence

- Date/time: 2026-06-22.
- Unit and QA/ADV IDs: U5; QA-009, QA-010, QA-018, QA-021; ADV-009,
  ADV-010, ADV-014, ADV-016.
- Claim: component attachment lifecycle has durable uploaded/approved/rejected/
  superseded state, approved-current uniqueness by scope, admin-gated RPCs, and
  a draft cleanup route that refuses reviewed/current-approved files.
- Proof category: local route/static tests plus provider schema probes.
- Files under test:
  `src/app/api/component-library/attachments/route.ts`,
  `supabase/migrations/20260622143000_library_trust_governance.sql`,
  `src/lib/supabase/types.ts`,
  `tests/vitest/component-library-attachment-lifecycle.test.ts`.
- Commands/results:
  `bunx vitest run tests/vitest/component-library-versioning-schema.test.ts tests/vitest/component-library-cost-governance-actions.test.ts tests/vitest/component-library-attachment-lifecycle.test.ts --maxWorkers=1`
  passed `3` files and `18` tests.
- Provider proof:
  SQL-003 bad attachment paths `0`; attachment governance columns present;
  broad write grants `0`; public/anon governance RPC execute grants `0`.
- Residual risk: no live attachment rows existed during provider preflight, so
  provider proof validates schema and policy shape rather than live attachment
  state transitions. Local tests cover the lifecycle contract.
- Owner lane: attachment/security plus DB.
- Evidence privacy check: pass; no filenames or storage paths recorded.
