# Terms and Conditions Sheet Implementation Tasks

**Date:** 2026-06-06
**Source plan:** `.ai/09_archive/store/2026-06-06-terms-and-conditions-sheet-implementation-complete/`
**Archive target:** `.ai/09_archive/store/2026-06-06-terms-and-conditions-sheet-implementation-complete/`
**Branch:** `codex/terms-and-conditions`
**Status:** IMPLEMENTED_ON_BRANCH / NOT MERGED_TO_MAIN / LEGAL_AND_PROVIDER_GATES_OPEN

## Task board

- [x] Resolve product defaults from Philip: professional/B2B closed beta, Philippine-law placeholders, authenticated clickwrap, append-only records, no raw IP/user-agent by default, no payment enforcement now.
- [ ] Obtain qualified legal review for final public/paid Terms and Privacy copy.
- [x] Implement versioned Terms content source and public Terms page metadata.
- [x] Add Supabase acceptance schema/RLS/grants/generated type surface for enforcement.
- [x] Add server-side acceptance save/read paths with service-role-stamped writes.
- [x] Add protected-app acceptance and re-acceptance UI at `/workshop/terms`.
- [x] Add settings/account legal status links.
- [x] Add unit/DOM/migration/static/E2E validation coverage.
- [x] Run `bun run validate`, `bun run build`, `bun run test:e2e`, `bun run lint:design-system`, and focused Terms tests.
- [x] Update `.ai` implementation logs/state.
- [ ] Apply/verify the new Supabase migration through the approved provider/local workflow before production rollout.
- [ ] Regenerate Supabase types from a working local/provider schema once Docker/Supabase local proof is available.
- [ ] Merge to main only if Philip explicitly authorizes branch integration.

## Non-goals preserved

- No billing implementation.
- No absolute zero-liability claim.
- No raw IP/user-agent acceptance storage by default.
- No SlateCamp/provider mutation.
- No main merge without current-run owner authorization.

## Validation evidence

- Focused Terms/Auth settings suite: 7 files / 19 tests passed.
- `bun run validate`: passed; 195 Vitest files / 1475 passing / 2 skipped, unit 9 passing, typecheck/lint/design-system included.
- `bun run build`: passed.
- `bun run test:e2e`: passed; 9 passed / 24 environment-gated skipped.

## Open validation gap

See `.ai/15_Bugs/2026-06-06-local-supabase-docker-unavailable-for-terms-migration-verification.md` for the local Supabase Docker/type-generation proof gap.
