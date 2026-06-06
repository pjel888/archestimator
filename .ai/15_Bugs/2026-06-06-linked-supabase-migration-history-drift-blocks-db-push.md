# Linked Supabase migration history drift blocks broad db push

**Classification:** Supabase provider migration history drift / release tooling blocker
**Date discovered:** 2026-06-06
**Discovery context:** Terms and Conditions acceptance implementation on branch `codex/terms-and-conditions` in worktree `/Users/philiplewis/archestimator.omx-worktrees/launch-codex-terms-and-conditions`.
**Status:** OPEN / NON-BLOCKING FOR TERMS AFTER EXACT-FILE APPLY
**Blocks implementation?** No for the Terms branch after exact-file apply/repair/readback. Yes for using broad `supabase db push --linked` as a general migration release path.

## Evidence

- Approved linked project: ArchEstimator Supabase project `ebxxqidacheyapmmzavr`.
- `supabase migration list --linked --output pretty` showed unrelated drift before Terms migration apply:
  - some remote migration versions are recorded remotely but are not present in the local `supabase/migrations` directory.
  - local migrations `20260605113000`, `20260605123000`, and `20260605131500` appeared without matching remote entries.
  - the new Terms migration `20260606095935` appeared local-only before exact-file apply.
- `supabase db push --linked --dry-run` failed before the Terms apply with a remote/local migration history mismatch message beginning `Remote migration versions not found in local migrations directory...`, and suggested a multi-version `supabase migration repair --status reverted ...` sequence. That broad repair was not run because it was unrelated to the Terms migration and could affect other provider history assumptions.
- The safe Terms-specific path was exact-file apply plus single-version repair: `supabase db query --linked --file supabase/migrations/20260606095935_legal_terms_acceptance.sql --output json` followed by `supabase migration repair --linked --status applied 20260606095935 --yes`.
- A later dry-run refresh attempt also hit Supabase CLI temp-role authentication/circuit-breaker errors after repeated retries. This reinforces that future provider proof should be run deliberately, sequentially, and with known-good CLI credentials.

## Reproduction steps

```bash
cd /Users/philiplewis/archestimator.omx-worktrees/launch-codex-terms-and-conditions
supabase migration list --linked --output pretty
supabase db push --linked --dry-run
```

## Expected behavior

The linked Supabase migration history and local migration files are reconciled so a dry-run of broad `supabase db push --linked` can report only intended pending migrations or no-op safely.

## Actual behavior

Broad `db push` cannot be trusted because unrelated migration-history drift is present. Exact-file apply/repair/readback is currently safer for approved one-off schema changes.

## Suspected root cause

Earlier provider migration work appears to have been applied/repaired in linked Supabase independently of the current local migration inventory, and/or local migration files were created without being applied to the linked project yet.

## Affected files/modules

- `supabase/migrations/`
- Linked Supabase project `ebxxqidacheyapmmzavr`
- Future schema release workflows and migration/type-generation tasks

## Impact

- High release-process risk if a future agent runs broad `supabase db push --linked` without reconciling history first.
- Low runtime risk for the Terms implementation after the exact-file migration was applied and verified.
- Could confuse future type-generation and migration-parity claims if docs do not separate Terms-specific proof from global Supabase parity.

## Severity

MEDIUM / RELEASE-TOOLING BLOCKER.

## Relationship to current plan

The Terms implementation required a new acceptance table and RLS. That migration is now applied and verified through an exact-file path, but this bug remains as a separate global Supabase migration workflow issue.

## Proposed fix plan

1. Run a dedicated Supabase migration-parity audit comparing local `supabase/migrations` to `supabase_migrations.schema_migrations` on project `ebxxqidacheyapmmzavr`.
2. Classify each drifted version as intentionally provider-only, missing local file, pending local migration, or erroneous history entry.
3. Use `supabase migration repair` only with an explicit version-by-version plan and owner/provider approval.
4. Re-run `supabase db push --linked --dry-run` until it is a safe no-op or shows only an intended pending migration.
5. Regenerate linked Supabase types after parity is stable.
6. Update `.ai/10_state/current-state.md`, `.ai/10_state/known-issues.md`, and `.ai/01_roadmap/README.md` with the reconciled status.

## Verification plan

```bash
supabase migration list --linked --output pretty
supabase db push --linked --dry-run
supabase gen types typescript --linked --schema public > /tmp/archestimator-linked-types.ts
```

Pass condition: broad dry-run is safe/no-op or reports only explicitly intended migrations, and docs distinguish linked-provider proof from local migration inventory.

## Current plan reference

- `.ai/09_archive/store/2026-06-06-terms-and-conditions-sheet-implementation-complete/`
- Evidence: `.ai/09_archive/store/2026-06-06-terms-and-conditions-sheet-implementation-complete/evidence/2026-06-06-linked-supabase-terms-migration-proof.md`
