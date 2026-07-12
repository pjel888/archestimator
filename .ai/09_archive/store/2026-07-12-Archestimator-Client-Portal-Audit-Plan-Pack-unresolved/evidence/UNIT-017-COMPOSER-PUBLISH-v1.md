# UNIT-017 — Composer, readiness, role preview, and explicit publish

Date: 2026-07-12

## Delivered boundary

- `ClientPortalCreateForm` creates a project-scoped draft through the manager-gated
  composer action.
- The full-page control center now provides a registry-only section composer with
  creation, ordering, typed configuration, save controls, and Proposal, Cost
  Review, and Executive templates that add only missing section kinds.
- Readiness blocks issue publishing when there is no visible section or an
  Estimate Browser section has no selected estimate source; missing recipients
  remains a clearly labelled delivery warning.
- Publishing requires a confirmation, snapshots only scoped selected sources,
  and lets the owner select historic open/resolved client threads to carry into
  the newly issued version. Carry-forward failures stay retryable and do not
  invalidate the immutable issue.
- The People tab queues invitation/resend requests through the existing outbox,
  supports role/revocation controls, and never renders recipient credentials.
- Role preview reads the current immutable issue sections and their policy
  snapshots, then filters them through `createClientPortalRolePreview` and
  `filterClientPortalSections`; it does not synthesize a separate permission
  model or return private issued payloads.

## Validation

- `bunx eslint tests/vitest/client-portal-composer-service.test.ts tests/vitest/client-portal-preview-service.test.ts src/lib/client-portal/composer-service.ts src/lib/client-portal/composer-actions.ts src/lib/client-portal/preview-service.ts src/lib/client-portal/preview-actions.ts src/lib/client-portal/recipient-actions.ts src/lib/client-portal/publisher-discussion-actions.ts src/components/workshop/publisher/ClientPortalComposer.tsx src/components/workshop/publisher/ClientPortalRolePreview.tsx src/components/workshop/publisher/ClientPortalRecipientManager.tsx src/components/workshop/publisher/ClientPortalControlCenter.tsx` passed.
- `bun run type-check` passed.
- `bunx vitest run tests/vitest/client-portal-composer-service.test.ts tests/vitest/client-portal-preview-service.test.ts tests/vitest/client-portal-publish-service.test.ts tests/vitest/client-portal-issue-builder.test.ts tests/vitest/client-portal-publisher-discussion-service.test.ts` passed: 5 files, 9 tests.
- `git diff --check` passed.

## Residual boundary

- Browser/device proof and hosted Email/Queue delivery evidence were not run;
  they require their separately authorized release surfaces.
- Legacy Publisher migration, old token routing, and legacy retirement remain
  `UNIT-018` and `UNIT-021` work.
