# Durable Governance Schema Evidence

- Date/time: 2026-06-22.
- Unit and QA/ADV IDs: U4/U5; QA-017, QA-018, QA-023; ADV-013, ADV-014,
  ADV-018.
- Claim: durable cost and attachment governance schema decisions are no longer
  just planned; they exist in a migration, local types, tests, and linked
  provider schema.
- Proof category: provider schema probe plus local static/type tests.
- Provider facts:
  governance columns found `19`, event tables found `2`, migration version
  `20260622143000` present remotely after repair.
- Local files:
  `supabase/migrations/20260622143000_library_trust_governance.sql`,
  `src/lib/supabase/types.ts`.
- Commands/results:
  `bun run type-check` passed; governance schema tests passed.
- Residual risk: provider-generated types should be regenerated after unrelated
  migration drift is reconciled.
- Owner lane: DB/action.
- Evidence privacy check: pass.
