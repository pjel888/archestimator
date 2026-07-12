# UNIT-021 Rollout Control Evidence v1

## Local implementation

- Migration cutover is behind the audited D1 flag
  `client_portal_legacy_migration`, seeded disabled by
  `migrations/0070_client_portal_legacy_migration_rollout.sql`.
- `client_portal_legacy_write_freeze`, seeded disabled by
  `migrations/0071_client_portal_legacy_write_freeze.sql`, lets an operator
  stop legacy comment and decision writes before a backfill. Both public routes
  map that denial to a generic no-store `423`. The shared repository
  independently denies these writes once a mapping reaches `imported`,
  `verified`, or `cutover_complete`.
- The protected manager apply action fails closed before reading legacy
  publication data unless both the migration and write-freeze flags are
  enabled. Dry-run and rollback retain their separate recovery semantics.
- Publisher only renders the manager migration control after the flag resolves
  enabled; the server action independently rechecks the flag before it reads a
  legacy publication, so direct calls fail closed outside the cohort.
- Existing Client Portal reads remain available. This control gates migration
  mutation only; it is not a retroactive public-read kill switch.
- Verified mappings have a manager-confirmed rollback that restores legacy
  routing without deleting imported immutable records. A later enabled manager
  migration re-verifies that same mapping to fix forward; both directions use
  the rollout flag and project/workspace authorization check.
- Import, verification, and rollback each write an owner-visible system audit
  event to `client_portal_audit_events`. The metadata contains only migration
  IDs, reconciliation hashes, counts, and rollback state; it excludes stable
  tokens, recipient emails, and snapshot payloads. D1 batches the state change
  with its audit event where available; the compatible sequential fallback
  fails the action if either required write fails.

## Fresh validation

```text
bunx vitest run tests/vitest/client-portal-legacy-migration-action.test.ts tests/vitest/client-portal-legacy-migration-service.test.ts tests/vitest/client-portal-legacy-token-resolution.test.ts tests/vitest/share-no-store-invariants.test.ts
bun run type-check
git diff --check
```

Latest freeze validation:

```text
bunx eslint src/lib/client-portal/rollout.ts src/lib/publication/d1-store.ts src/lib/publication/public-repository.ts src/app/api/share/[token]/comment/route.ts tests/vitest/project-publication-public-repository.test.ts
bunx vitest run tests/vitest/project-publication-public-repository.test.ts tests/vitest/project-publication-password-lockout-route.test.ts tests/vitest/client-portal-legacy-migration-action.test.ts tests/vitest/client-portal-legacy-migration-service.test.ts tests/vitest/client-portal-legacy-token-resolution.test.ts
git diff --check
```

Result: both the original rollout proof and the latest freeze validation passed.
The latter covered lint, 5 focused Vitest files / 38 tests, and diff check.

Latest audit-trail validation reused that same focused five-file suite after
adding the import, verified, and rollback event assertions; it passed lint,
38 tests, and `git diff --check`.

Latest decision-freeze validation passed targeted ESLint, six focused Vitest
files / 68 tests, workspace `type-check`, and `git diff --check`.

## Release boundary

No flag was enabled in hosted D1, no dogfood/design-partner cohort was named,
and no migration or rollback was run against real data. The feature flags and
`RUNBOOK-CLIENT-PORTAL-LEGACY-CUTOVER-v1.md` make rollout controllable but do
not prove it has occurred.
