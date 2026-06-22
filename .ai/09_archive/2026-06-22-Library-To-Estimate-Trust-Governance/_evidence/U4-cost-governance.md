# U4 Cost Governance Evidence

- Date/time: 2026-06-22.
- Unit and QA/ADV IDs: U4; QA-008, QA-017, QA-023; ADV-008, ADV-013,
  ADV-018.
- Claim: cost governance has durable review state, append-only event tables,
  admin-gated RPCs, conflict revisions, and accepted-current uniqueness.
- Proof category: local schema/action tests plus provider migration and grant
  probes.
- Files under test:
  `supabase/migrations/20260622143000_library_trust_governance.sql`,
  `src/lib/supabase/types.ts`,
  `tests/vitest/component-library-cost-governance-actions.test.ts`,
  `tests/vitest/component-library-versioning-schema.test.ts`.
- Commands/results:
  `bunx vitest run tests/vitest/component-library-versioning-schema.test.ts tests/vitest/component-library-cost-governance-actions.test.ts tests/vitest/component-library-attachment-lifecycle.test.ts --maxWorkers=1`
  passed `3` files and `18` tests.
- Provider proof:
  migration `20260622143000` applied through `supabase db query --linked`;
  migration history repaired for this version only; post-repair migration list
  shows local and remote both contain `20260622143000`.
- Provider probes:
  SQL-001 `0`; SQL-002 `0`; governance columns `19`; event tables `2`;
  broad write grants `0`; public/anon governance RPC execute grants `0`;
  authenticated governance RPC execute grants `9`.
- Residual risk: local Supabase reset was not run because Docker/local Supabase
  was unavailable. Regenerate generated types from provider after unrelated
  migration-history drift is reconciled.
- Owner lane: governance/DB.
- Evidence privacy check: pass.
