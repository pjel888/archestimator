# Stale Migration Count Documentation

**Classification:** Documentation/source-of-truth drift
**Date discovered:** 2026-06-06
**Discovery context:** Terms and Conditions sheet implementation planning pack `.ai/09_archive/store/2026-06-06-terms-and-conditions-sheet-implementation-complete/`
**Status:** OPEN_NON_BLOCKING
**Blocks implementation:** No, provided future agents verify live migration state before schema work.

## Evidence

- `.ai/README.md:31` states the Supabase project has `48 migrations applied`.
- Root `README.md:14` states `67 local migration files`; `README.md:159` says `40+ tables across 67 local migration files`.
- Live command `find supabase/migrations -maxdepth 1 -type f -name '*.sql' | wc -l` returned `81`.
- Latest local migration files include `20260605131500_restore_lewis_residence_seed_rows.sql`.

## Reproduction steps

```bash
rg -n "48 migrations|67 local migration|migration files" .ai/README.md README.md
find supabase/migrations -maxdepth 1 -type f -name '*.sql' | wc -l
ls supabase/migrations | tail -20
```

## Expected behavior

Canonical docs should either avoid exact migration counts or match live local migration inventory and separate local-vs-linked/provider evidence.

## Actual behavior

Docs contain stale exact counts that can mislead future schema planning agents.

## Suspected root cause

Recent launch-readiness migrations were added after earlier README/current-state summaries and exact counts were not refreshed.

## Affected files/modules

- `.ai/README.md`
- `README.md`
- Future Supabase/schema planning tasks if they copy stale counts without live verification.

## Impact

Low runtime risk; medium agent-drift risk for Supabase migration planning. This Terms plan uses live migration count evidence and warns implementers to re-verify.

## Severity

LOW / NON_BLOCKING.

## Relationship to current plan

`.ai/09_archive/store/2026-06-06-terms-and-conditions-sheet-implementation-complete/02_CODEBASE_RESEARCH.md` records live migration evidence and flags this drift so future Terms acceptance schema work does not rely on stale counts.

## Proposed fix plan

1. In a separate root-doc sync task, update `.ai/README.md` and root `README.md` to avoid stale exact migration counts or refresh them from live inventory.
2. Prefer wording such as "verify live migration count with `find supabase/migrations ...`" when counts change frequently.
3. Run `git diff --check` after docs sync.

## Verification plan

```bash
rg -n "48 migrations|67 local migration|migration files" .ai/README.md README.md
find supabase/migrations -maxdepth 1 -type f -name '*.sql' | wc -l
git diff --check
```

## Status

Open, non-blocking for this planning package.
