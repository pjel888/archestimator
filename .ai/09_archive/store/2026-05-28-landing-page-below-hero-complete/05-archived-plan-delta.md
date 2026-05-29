# Archived Plan Delta

**Date:** 2026-05-21

## Archived plan

`.ai/09_archive/store/2026-05-21-intercom-v4-ui-ux-improvement-plan-superseded/intercom-v4-ui-ux-improvement-plan.md`

## Why the new plan is different

The archived plan was too broad. It combined:

- a public landing-page restyle;
- Intercom-inspired design-system token changes;
- authenticated dashboard/app-shell migration;
- old estimate-workspace layout migration.

That scope is no longer safe as an active instruction because Archestimator has a post-reset planning rule: future work must be route-scoped, screen-scoped, and easy to delete if Philip rejects the direction.

## New planning stance

The new folder is limited to the public `/` landing page. It uses the current source inventory first and treats the archived Intercom/v4 ideas as historical context only.

## Do not carry forward

- App-shell migration from the archived plan.
- `/projects` route assumptions from the archived plan.
- Broad design-token reset as a hidden prerequisite.
- Fake proof/logos/testimonials.
- `e2e/home.spec.ts` as an assumed existing test path; current repo evidence shows `e2e/auth.spec.ts` and `e2e/estimate-tree-dnd.spec.ts`, but no current landing E2E file.

## May carry forward only after restating in active plan

- Strong editorial hierarchy.
- Black/white CTA contrast where it fits current landing art direction.
- Product mockup as proof.
- Generous landing-page rhythm.
