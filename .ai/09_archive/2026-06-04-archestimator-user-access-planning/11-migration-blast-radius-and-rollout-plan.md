# 11 — Migration Blast Radius and Rollout Plan

**Status:** Second-pass planning  
**Last updated:** 2026-06-04  
**Scope:** Safe rollout strategy, affected repo areas, migration sequencing, rollback posture, and handoff notes for the codebase AI.

---

## 1. Blast-Radius Summary

Type 3 archive subscribers are a high-blast-radius feature because they affect:

- auth/account identity;
- project/publication data model;
- RLS and server/client data boundaries;
- public share-link UX;
- deletion governance;
- billing/subscription webhooks;
- client-visible archive UX;
- tests and launch-readiness scripts;
- product/legal retention policy.

Do not implement it as a one-shot feature branch. It should land in small additive phases.

---

## 2. Repo Areas Likely Affected

### Database migrations

Existing relevant paths:

- `supabase/migrations/20260518090000_archestimator_core_schema.sql`
- `supabase/migrations/20260518100000_auth_profiles_ceo_access.sql`
- `supabase/migrations/20260526142913_project_sheet_collaboration_access.sql`
- `supabase/migrations/20260527120000_project_client_publication.sql`
- `supabase/migrations/20260528220000_project_shared_link_overhaul.sql`
- `supabase/migrations/20260601003000_security_rate_limit_events.sql`
- `supabase/migrations/20260603160000_mass_deletion_governance.sql`

New likely migration:

- `supabase/migrations/20260604XXXXXX_client_archive_core.sql`

### Publication/share code

Existing relevant paths:

- `src/app/share/[token]/page.tsx`
- `src/app/api/share/[token]/session/route.ts`
- `src/app/api/share/[token]/comment/route.ts`
- `src/app/api/share/[token]/decision/route.ts`
- `src/lib/publication/security.ts`
- `src/lib/publication/public-repository.ts`
- `src/lib/publication/actions.ts`
- `src/lib/publication/snapshot.ts`
- `src/components/share/*`

### Deletion governance

Existing relevant paths:

- `src/lib/mass-deletion/bulk-action.ts`
- `src/components/workshop/BulkDestructivePreviewModal.tsx`
- `supabase/migrations/20260603160000_mass_deletion_governance.sql`

### Billing/webhooks

Existing related path:

- `src/app/api/webhooks/resend/route.ts`
- `src/lib/email/resend-webhooks.ts`

New likely paths:

- `src/app/api/webhooks/stripe/route.ts`
- `src/app/api/billing/client-archive/checkout/route.ts`
- `src/app/api/billing/client-archive/portal/route.ts`
- `src/lib/billing/*`
- `src/lib/client-archive/*`

### Client archive UI

New likely paths:

- `src/app/client/archive/page.tsx`
- `src/app/client/archive/[snapshotId]/page.tsx`
- `src/app/client/billing/page.tsx`
- `src/components/client-archive/*`

### Tests

Existing test infrastructure from `package.json`:

- `bun run type-check`
- `bun run lint`
- `bun run lint:design-system`
- `bun run test`
- `bun run test:dom`
- `bun run test:e2e`
- `bun run validate` = type-check + lint + design-system + unit + DOM

Existing relevant tests include publication, share, mass deletion, security, Resend webhook, and source-governance suites under `tests/vitest/`.

---

## 3. Rollout Phases

### Phase A — Additive schema only

Goal:

- Add tables/enums/RLS for client archive domain.

Do not:

- change existing public share behavior;
- change deletion execution;
- enable billing;
- expose client portal UI.

Rollback posture:

- Since additive, can disable feature by not using new tables/routes.
- Avoid destructive changes to existing migrations or tables.

### Phase B — Repository and access-check layer

Goal:

- Add `src/lib/client-archive/*` with pure access logic and server repository functions.

Do not:

- use service role in browser/client modules;
- depend on live project membership for archive reads.

Acceptance:

- unit/DOM tests prove access decisions.
- negative tests prove cross-user denial.

### Phase C — Snapshot capture from publication

Goal:

- Copy publication snapshot into sealed archive snapshot for eligible clients.

Do not:

- mutate sealed snapshots in place;
- archive for non-entitled users unless explicitly granted;
- break existing publication tests.

Acceptance:

- idempotency guard prevents duplicate snapshot versions for same entitlement/publication/version.

### Phase D — Client archive read UI/API

Goal:

- Add read-only client archive dashboard/detail routes.

Do not:

- show edit controls;
- route through share token/password cookies;
- call live project CRUD APIs.

Acceptance:

- accessible UI tests for active, empty, source-deleted, canceled/past-due states.

### Phase E — Billing integration

Goal:

- Add Stripe or approved billing provider hosted checkout/portal and webhook sync.

Stop conditions:

- Provider product/price creation requires Philip approval.
- Production env changes require Philip approval.
- Production webhook endpoint registration requires Philip approval.

Acceptance:

- verified webhook signature tests;
- duplicate/out-of-order event tests;
- entitlement status transition tests.

### Phase F — Type 4 to Type 3 upgrade

Goal:

- Convert a recipient-session user into durable client identity and optional paid archive subscriber.

Do not:

- silently bind mismatched email accounts;
- make every public viewer sign up before reading basic share link;
- store public token as archive credential.

Acceptance:

- share view still works for Type 4;
- stateful actions trigger upgrade only when needed;
- archive access after upgrade uses authenticated client identity.

### Phase G — Deletion integration

Goal:

- Extend mass deletion preview/execute with archive subscriber impact.

Initial safe behavior:

- block hard delete if active archive subscribers exist.

Later behavior:

- allow tombstone-preserving source deletion only after snapshot independence and retention policy are proven.

Acceptance:

- preview shows active archive count;
- execute blocks unsafe deletion;
- tombstone records are written when source deletion is allowed.

---

## 4. Migration Sequencing Details

Recommended migration order in a single additive migration or small migration series:

1. Create status domains/enums.
2. Create `client_archive_accounts` if needed.
3. Create `client_archive_entitlements`.
4. Create `client_archive_snapshots` without live-source cascade FKs.
5. Create `client_archive_activity_events`.
6. Create `client_archive_deletion_tombstones`.
7. Create `billing_webhook_events` idempotency ledger.
8. Add indexes and unique constraints.
9. Enable RLS and revoke broad access.
10. Create policies.
11. Add immutable-snapshot trigger or grant restriction.
12. Add helper RPCs only after table policies exist.

Avoid:

- editing old migrations unless the repo's migration policy explicitly requires it;
- replacing existing public share FK cascades before the new archive table exists;
- using `ON DELETE CASCADE` from source projects/publications into archive snapshots.

---

## 5. Backward Compatibility Requirements

Existing behavior that should remain unchanged until explicitly enabled:

- Type 1/2 collaboration roles.
- Public share link viewing.
- Password-protected share link access.
- Recipient session comment/decision gating.
- Resend delivery webhook updates.
- Existing publication snapshot rendering.
- Existing mass deletion active-publication blockers.

New behavior should be feature-flagged or route-isolated until tested.

---

## 6. Rollback and Kill Switches

Because billing and deletion behavior can create user harm, add kill switches:

- disable archive checkout route;
- disable archive snapshot capture;
- disable client archive dashboard route;
- disable tombstone-preserving deletion and fall back to hard-delete block;
- ignore billing webhook entitlement activation except logging while in test mode.

Rollback plan:

1. Turn off route/feature flags.
2. Keep additive tables in place.
3. Stop snapshot creation worker/repository path.
4. Do not delete archive rows as rollback unless legal/product approves.
5. Fix forward with migration patch.

---

## 7. Launch Gates

Before production enablement:

- `bun run validate`
- targeted archive unit/DOM tests
- publication/share regression tests
- mass deletion regression tests
- billing webhook tests
- at least one Playwright smoke for share-to-account/archive read if routes exist
- Supabase migration readiness check
- Vercel env readiness check if billing env vars are added
- manual review of RLS policies and service-role usage
- legal/product retention copy approval

Provider changes needing explicit approval:

- Stripe product/price creation.
- Stripe webhook endpoint registration.
- Production Supabase migration apply.
- Production Vercel env variable changes.
- Production deletion behavior changes.

---

## 8. Handoff Prompt for Codebase AI

```text
Implement the Type 3 Client/Buyer Archive Subscriber as a separate client archive entitlement domain.

Do not put Type 3 users in project_members or estimate_sheet_members.
Do not authorize archive reads with project collaboration roles.
Do not make archive snapshots depend on live projects/publications through cascading foreign keys.
Start additive: schema/RLS/tests first, then repository/access checks, then snapshot capture, then read-only client archive UI, then billing, then share-to-account upgrade, then deletion integration.

Use TDD. First PR should be schema/RLS/access-contract only if possible.
No production Supabase apply, provider setup, Vercel env change, or deletion behavior change without Philip approval.
```

---

## 9. Blast-Radius Acceptance Criteria

The rollout is safe only if:

- first implementation phase is additive and locally tested;
- production/provider mutations are gated;
- current Type 1/2/4 flows remain green;
- archive snapshots are proven deletion-independent before deletion behavior changes;
- billing entitlement writes are idempotent and server-only;
- codebase AI can implement from a small phase without needing the entire feature at once.
