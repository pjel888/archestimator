# Terms and Conditions Sheet Implementation Tasks

**Date:** 2026-06-06
**Source plan:** `.ai/09_archive/store/2026-06-06-terms-and-conditions-sheet-implementation-complete/`
**Archive target:** `.ai/09_archive/store/2026-06-06-terms-and-conditions-sheet-implementation-complete/`
**Branch:** `codex/terms-and-conditions`
**Status:** IMPLEMENTED_ON_BRANCH / LINKED_PROVIDER_PROOF_COMPLETE / LEGAL_REVIEW_AND_MAIN_CLOSEOUT_OPEN

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
- [x] Apply/verify the new Terms Supabase migration through the approved linked-provider exact-file workflow.
- [x] Compare committed Terms type block against linked-generated Supabase types for `legal_terms_acceptances`.
- [ ] Merge to main after final branch validation because Philip subsequently authorized resolving the remaining integration steps.

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

## Remaining validation / release gaps

- Qualified lawyer review remains required before public/paid Terms enforcement.
- Local Supabase Docker proof remains unavailable; see `.ai/15_Bugs/2026-06-06-local-supabase-docker-unavailable-for-terms-migration-verification.md`.
- Global linked migration parity remains open; broad `supabase db push --linked` is blocked by unrelated drift. See `.ai/15_Bugs/2026-06-06-linked-supabase-migration-history-drift-blocks-db-push.md`.
- Final main merge/push and worktree cleanup are pending this closeout run.
