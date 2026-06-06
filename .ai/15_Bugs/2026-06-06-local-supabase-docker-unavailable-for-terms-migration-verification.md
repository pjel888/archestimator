# Local Supabase Docker unavailable for Terms migration verification

**Classification:** validation environment gap / Supabase local proof gap
**Date discovered:** 2026-06-06
**Discovery context:** Terms and Conditions acceptance implementation on branch `codex/terms-and-conditions` in worktree `/Users/philiplewis/archestimator.omx-worktrees/launch-codex-terms-and-conditions`.

## Evidence

- Command: `supabase status --output json`
- Result: `failed to inspect container health: Cannot connect to the Docker daemon at unix:///Users/philiplewis/.docker/run/docker.sock. Is the docker daemon running?`
- Supabase CLI was available and verified at `2.98.2`.
- Migration was created through `supabase migration new legal_terms_acceptance` as `supabase/migrations/20260606095935_legal_terms_acceptance.sql`.
- Because Docker/local Supabase was unavailable, `supabase migration up --local` and `supabase gen types typescript --local` were not run in this worktree.

## Reproduction steps

```bash
cd /Users/philiplewis/archestimator.omx-worktrees/launch-codex-terms-and-conditions
supabase status --output json
```

## Expected behavior

Local Supabase Docker stack is available so the implementation agent can apply the new Terms acceptance migration locally and regenerate `src/lib/supabase/types.ts` from the resulting schema.

## Actual behavior

Docker daemon was unavailable, so local Supabase health inspection failed before migration apply/type-generation proof could run.

## Suspected root cause

Local Docker Desktop/daemon was not running or not reachable from the current shell environment.

## Affected files/modules

- `supabase/migrations/20260606095935_legal_terms_acceptance.sql`
- `src/lib/supabase/types.ts`
- Terms acceptance server persistence under `src/lib/legal/`

## Impact

- Does **not** block the branch code from compiling, building, linting, DOM testing, or E2E signed-out smoke verification.
- Does block local database apply proof and generated-type regeneration proof from the Supabase CLI.
- The branch includes a manual generated-type update matching the migration shape; `bun run type-check`, `bun run validate`, and `bun run build` passed after the manual update.

## Severity

Medium validation gap. Not a production bug, but provider/local DB proof is required before production rollout.

## Relationship to current plan

This is related to the archived Terms plan package and the implementation branch. The plan required migration/type safety; the migration exists, but local apply/type-generation verification needs a working local Supabase stack or a safe provider migration workflow.

## Proposed fix plan

1. Start Docker Desktop or restore Docker daemon access.
2. Run Supabase local status/start under repo safety rules.
3. Apply the migration locally.
4. Regenerate Supabase types with the repo-approved command.
5. Compare generated types against the manual update and reconcile if needed.
6. Run `bun run validate`, `bun run build`, and Terms-focused tests again.

## Verification plan

- `supabase status --output json`
- `supabase migration up --local` or approved equivalent
- `supabase gen types typescript --local > src/lib/supabase/types.ts`
- `bun run validate`
- `bun run build`

## Status

Open validation gap.

## Blocks implementation?

No. Blocks local Supabase migration/type-generation proof and production rollout confidence until resolved.

## Current plan reference

- Source plan: `.ai/09_archive/store/2026-06-06-terms-and-conditions-sheet-implementation-complete/`
- Intended archive after implementation: `.ai/09_archive/store/2026-06-06-terms-and-conditions-sheet-implementation-complete/`
