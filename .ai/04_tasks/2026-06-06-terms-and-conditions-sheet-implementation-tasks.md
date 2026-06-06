# Terms and Conditions Sheet Future Implementation Tasks

**Date:** 2026-06-06
**Plan:** `.ai/03_plans/2026-06-06-terms-and-conditions-sheet/`
**Status:** PLANNED_ONLY — no implementation started.

## Task board

- [ ] Resolve legal/entity/governing-law/notices/billing/privacy metadata decisions in `12_OPEN_QUESTIONS_AND_DECISIONS.md`.
- [ ] Obtain qualified legal review for final Terms and Privacy copy.
- [ ] Implement versioned Terms content source and public Terms page metadata.
- [ ] Add Supabase acceptance schema/RLS/grants/generated types if enforcement is approved.
- [ ] Add server-side acceptance save/read paths.
- [ ] Add protected-app acceptance and re-acceptance UI.
- [ ] Add settings/account legal status links.
- [ ] Add unit/DOM/E2E/RLS tests.
- [ ] Run `bun run validate`, `bun run build`, `bun run test:e2e` when auth/user-flow changes land, `bun run lint:design-system` for UI changes, and `git diff --check`.
- [ ] Update `.ai` and archive the plan only after verified implementation.

## Non-goals

- No billing implementation unless separately approved.
- No final legal language without lawyer review.
- No absolute zero-liability claim.
