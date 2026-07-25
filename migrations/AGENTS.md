# Migration Integrity Contract

This path inherits `AGENTS.md`,
`.ai/00_system/BETA_QUALITY_ENGINEERING_PROTOCOL.md`, and
`.ai/00_system/VALIDATION_MATRIX.md`. Migration changes are always
`Q2_CRITICAL_CHANGE_GATE`.

- `migrations/` is authoritative; legacy `supabase/migrations/` is read-only.
- Preserve existing data, relationships, identity, constraints, and transaction
  safety. Prefer fix-forward repair over destructive rollback.
- Verify locally from a clean database and representative prior-schema/data
  fixtures. Include duplicate, partial-failure, retry/idempotency, constraint,
  and recovery cases where applicable.
- Rehearse restore or a documented fix-forward recovery before completion.
- Never target production data/endpoints or claim live application/readback
  without exact external authority.
- Record migration order, schema hashes, commands, results, fixture identity,
  recovery evidence, and unresolved risk in the quality manifest.
