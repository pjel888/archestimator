# DB Migration And RPC Readiness Evidence

- Date/time: 2026-06-22.
- Unit and QA/ADV IDs: U4/U5; QA-017, QA-018, QA-023; ADV-013, ADV-014,
  ADV-018.
- Claim: the durable governance schema and RPC layer are implemented locally
  and applied to the linked Archestimator provider.
- Proof category: provider migration/probes plus local static tests.
- Provider commands/results:
  `supabase db query --linked --file supabase/migrations/20260622143000_library_trust_governance.sql`
  succeeded; `supabase migration repair --linked --status applied 20260622143000`
  succeeded; `supabase migration list --linked` shows the new version present
  on both sides.
- Provider probe summary:
  duplicate current cost groups `0`, bad active cost refs `0`, bad attachment
  paths `0`, governance columns `19`, governance event tables `2`, broad write
  grants `0`, public/anon RPC execute grants `0`, authenticated RPC execute
  grants `9`.
- Local commands/results:
  governance/schema tests passed `3` files and `18` tests; `bun run type-check`
  passed.
- Residual risk: unrelated migration-history drift remains and local Docker
  reset was unavailable.
- Owner lane: DB/security.
- Evidence privacy check: pass.
