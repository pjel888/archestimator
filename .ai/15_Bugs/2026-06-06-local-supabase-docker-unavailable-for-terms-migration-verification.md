# Local Supabase Docker unavailable for Terms migration verification

**Classification:** validation environment gap / local Supabase proof gap
**Date discovered:** 2026-06-06
**Discovery context:** Terms and Conditions acceptance implementation on branch `codex/terms-and-conditions` in worktree `/Users/philiplewis/archestimator.omx-worktrees/launch-codex-terms-and-conditions`.

## Evidence

### Local Docker gap

- Command: `supabase status --output json`
- Result: `failed to inspect container health: Cannot connect to the Docker daemon at unix:///Users/philiplewis/.docker/run/docker.sock. Is the docker daemon running?`
- Supabase CLI was available and verified at `2.98.2`.
- Migration was created through `supabase migration new legal_terms_acceptance` as `supabase/migrations/20260606095935_legal_terms_acceptance.sql`.
- Because Docker/local Supabase was unavailable, `supabase migration up --local` and `supabase gen types typescript --local` were not run in this worktree.

### Provider proof completed after initial branch closeout

- With Philip's later approval to resolve the remaining issues, the worktree was linked to ArchEstimator Supabase project `ebxxqidacheyapmmzavr`.
- Exact-file linked migration apply succeeded for `supabase/migrations/20260606095935_legal_terms_acceptance.sql`.
- Single-version migration history repair succeeded for `20260606095935` as applied.
- Linked readback confirmed `public.legal_terms_acceptances` exists, migration `20260606095935` is recorded, authenticated users have own-row SELECT only, service role has INSERT, and the table has no raw IP/user-agent columns.
- Transactional RLS own-row proof returned `own_visible_count: 1` and rolled back; no test rows remained (`legal_terms_acceptances_total_rows: 0`).
- Linked generated type comparison confirmed the committed `legal_terms_acceptances` block in `src/lib/supabase/types.ts` matches the linked-generated block exactly.
- Evidence artifact: `.ai/09_archive/store/2026-06-06-terms-and-conditions-sheet-implementation-complete/evidence/2026-06-06-linked-supabase-terms-migration-proof.md`.

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
- No longer blocks Terms-specific provider migration/type-shape proof because linked exact-file apply/repair/readback completed successfully.
- Still blocks purely local `supabase migration up --local` / local type-generation proof until Docker is available.
- The branch includes a generated-type surface that matches the linked-generated `legal_terms_acceptances` block exactly; `bun run type-check`, `bun run validate`, and `bun run build` passed after the update.

## Severity

Medium local-validation gap. Not a production bug for the Terms migration after linked provider proof, but Docker/local parity remains useful before future schema work.

## Relationship to current plan

This is related to the archived Terms plan package and the implementation branch. The plan required migration/type safety; linked provider proof is now complete for this Terms migration, while local Docker proof remains unavailable.

## Proposed fix plan

1. Start Docker Desktop or restore Docker daemon access.
2. Run Supabase local status/start under repo safety rules.
3. Apply/reset the schema locally as appropriate for a local-only proof pass.
4. Regenerate Supabase types with the repo-approved command.
5. Compare generated local types against the committed linked-verified update and reconcile if needed.
6. Run `bun run validate`, `bun run build`, and Terms-focused tests again.

## Verification plan

- `supabase status --output json`
- `supabase migration up --local` or approved equivalent
- `supabase gen types typescript --local > src/lib/supabase/types.ts`
- `bun run validate`
- `bun run build`

## Status

Provider proof closed for the Terms migration; local Docker proof remains open/non-blocking.

## Blocks implementation?

No. It blocks only local Supabase migration/type-generation proof. Terms-specific linked provider proof and linked type-shape comparison are complete.

## Current plan reference

- Source plan: `.ai/09_archive/store/2026-06-06-terms-and-conditions-sheet-implementation-complete/`
- Intended archive after implementation: `.ai/09_archive/store/2026-06-06-terms-and-conditions-sheet-implementation-complete/`
