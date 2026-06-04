# 12 — Testing and Verification Plan for Type 3 Client Archives

**Status:** Second-pass planning  
**Last updated:** 2026-06-04  
**Scope:** Tests, verification gates, and acceptance evidence for the Type 3 client archive subscriber feature.

---

## 1. Testing Philosophy

Use TDD for implementation:

1. write the failing test for the access/state rule;
2. verify the failure;
3. implement the smallest change;
4. verify the test passes;
5. run the relevant regression suite.

For Type 3, tests must prioritize **security boundaries and state transitions** over simple render checks.

A passing UI screenshot is not enough. The feature needs database/RLS, API, state-machine, webhook, deletion, and UX tests.

---

## 2. Existing Test Infrastructure

From `package.json`:

- `bun run type-check`
- `bun run lint`
- `bun run lint:design-system`
- `bun run test` → `bun test tests/unit`
- `bun run test:dom` → `vitest run --maxWorkers=1`
- `bun run test:e2e` → `playwright test`
- `bun run validate` → type-check + lint + design-system + unit + DOM

Existing relevant test families found under `tests/vitest/` include:

- publication snapshot/action/page/security tests;
- share page contract tests;
- share comments/decision tests;
- Resend webhook route tests;
- mass deletion action/contract/UI tests;
- auth-sensitive API boundary tests;
- security findings contract tests;
- source-governance and readiness tests.

Type 3 should extend these patterns instead of inventing a parallel testing style.

---

## 3. Unit Tests

### Access decision tests

Target files likely:

- `tests/unit/client-archive-access.test.ts`
- `tests/vitest/client-archive-access.test.ts`

Cases:

- active entitlement + own snapshot = allowed;
- active entitlement + other user's snapshot = denied;
- no entitlement = denied;
- expired/canceled/revoked entitlement = denied unless policy says grace;
- share recipient session alone = denied for archive route;
- project member viewer role alone = denied for archive route;
- owner/collaborator live access does not imply client archive access.

### State machine tests

Target file:

- `tests/unit/client-archive-state-machine.test.ts`

Cases:

- valid subscription status transitions;
- invalid transitions rejected;
- grace period expiry;
- canceled pending period end;
- source-deleted snapshot remains sealed;
- retention-expired snapshot read denied.

### Snapshot serialization tests

Target file:

- `tests/vitest/client-archive-snapshot.test.ts`

Cases:

- publication snapshot is copied into archive snapshot without live FK dependency;
- sensitive internal fields are omitted if public sanitizer requires omission;
- snapshot version/idempotency works;
- source metadata captured;
- sealed snapshot cannot be mutated through normal repository function.

---

## 4. Database / RLS Contract Tests

Target files:

- `tests/vitest/client-archive-schema.test.ts`
- `tests/vitest/client-archive-rls-contract.test.ts`
- `tests/vitest/client-archive-deletion-independence.test.ts`

Minimum assertions:

- new tables exist in migration SQL;
- RLS enabled on archive/entitlement/webhook/tombstone tables;
- broad grants revoked for webhook/audit tables;
- client snapshots do not use `ON DELETE CASCADE` from source projects/publications;
- `client_archive_snapshots` has no live-source FK that would delete archives;
- policies are SELECT-only for authenticated client reads;
- authenticated users cannot update entitlement status;
- service role has controlled management path;
- indexes exist for user/status/source lookups;
- billing event unique idempotency constraint exists.

If the repo supports real local Supabase integration tests, add true RLS tests with two users. If not, start with migration/source contract tests and add integration tests later.

---

## 5. API Route Tests

### Archive API

Target files:

- `tests/vitest/client-archive-route.test.ts`
- `tests/vitest/client-archive-security.test.ts`

Cases:

- unauthenticated request denied;
- own active snapshot returned;
- other user's snapshot denied;
- canceled/revoked entitlement denied;
- source-deleted snapshot returned if entitlement active;
- response does not include internal-only fields;
- service-role repository still filters by caller.

### Billing routes

Target files:

- `tests/vitest/client-archive-billing-route.test.ts`
- `tests/vitest/stripe-client-archive-webhook.test.ts`

Cases:

- checkout route requires authenticated user;
- checkout route does not accept arbitrary provider customer/subscription IDs from client;
- webhook rejects invalid signature;
- webhook stores processed event ID;
- duplicate event is idempotent;
- out-of-order event does not incorrectly grant/revoke access;
- unsupported event types ignored;
- webhook max body size enforced.

Use the existing Resend webhook test as a pattern for raw-body/signature/route tests.

### Share upgrade routes

Target files:

- `tests/vitest/share-to-client-upgrade-route.test.ts`

Cases:

- recipient session required before account binding;
- mismatched email requires verification or denies bind;
- binding creates client identity link but not paid entitlement unless checkout/subscription completes;
- expired link behavior follows product policy;
- recipient session cookie alone cannot access archive API.

---

## 6. DOM / Component Tests

Target files:

- `tests/vitest/client-archive-dashboard.test.tsx`
- `tests/vitest/client-archive-detail.test.tsx`
- `tests/vitest/client-archive-billing-status.test.tsx`
- `tests/vitest/share-upgrade-prompt.test.tsx`
- `tests/vitest/mass-deletion-archive-impact-ui.test.tsx`

Cases:

- archive dashboard empty state;
- active subscription archive list;
- source-deleted badge/banner;
- past-due/grace warning;
- canceled/expired denied state;
- read-only detail view has no edit controls;
- billing manage CTA appears only when applicable;
- share prompt appears when comment/decision/save archive requires durable identity;
- deletion modal shows active archive subscriber impact.

Use accessible roles and names. Do not assert brittle class names except for explicit design-system governance tests.

---

## 7. E2E / Browser Tests

Target file examples:

- `e2e/client-archive-smoke.spec.ts`
- `e2e/share-to-client-archive-upgrade.spec.ts`
- `e2e/mass-deletion-archive-preservation.spec.ts`

Recommended E2E flows:

1. **Share link to account upgrade smoke**
   - open shared proposal link;
   - verify proposal renders as Type 4;
   - click Save to archive or stateful action;
   - sign in/create test account;
   - verify client archive route shows the snapshot.

2. **Archive read security smoke**
   - client A can open own snapshot;
   - client A cannot open client B snapshot.

3. **Source deletion preservation smoke**
   - owner preview shows active archive subscriber impact;
   - unsafe hard delete blocked in Phase 1; or
   - tombstone-preserving deletion shows client source-deleted archive in later phase.

4. **Billing status smoke**
   - active subscriber sees archive;
   - canceled/revoked state hides archive and shows billing recovery path.

Avoid making Stripe live payments part of default E2E. Use mocked provider events or test-mode webhook fixtures.

---

## 8. Security Regression Checklist

Before merging any Type 3 PR, verify:

- no Type 3 flow inserts into `project_members`;
- no Type 3 flow inserts into `estimate_sheet_members`;
- no archive API authorizes by project role;
- no client-side code imports service-role client helpers;
- no raw token/password/secret logs;
- webhook route verifies signature before parsing/trusting event;
- duplicate webhook events are safe;
- share cookie and auth account access are separated;
- deletion preview includes archive impact;
- source deletion cannot cascade into archive snapshots.

---

## 9. Source-Governance Tests to Add

Because this feature is easy to regress through naming/role confusion, add tests that read source/migration text and enforce boundaries:

- `client_archive` code must not call `.from("project_members")` for access authorization.
- archive schema must not declare `references public.projects(id) on delete cascade` on snapshot table.
- archive routes must require authenticated user context.
- billing webhook route must read raw request body and verify signature.
- share session cookie name should not appear in client archive route authorization.
- deletion governance SQL must mention archive subscriber/snapshot counts once Phase G begins.

These tests are not a replacement for behavior tests, but they prevent the predictable architectural drift.

---

## 10. Verification Commands by Phase

### Phase A — schema only

```bash
bunx vitest run tests/vitest/client-archive-schema.test.ts tests/vitest/client-archive-rls-contract.test.ts --maxWorkers=1
bun run type-check
bun run lint
```

### Phase B/C — repository and snapshot capture

```bash
bunx vitest run tests/vitest/client-archive-access.test.ts tests/vitest/client-archive-snapshot.test.ts tests/vitest/project-publication-snapshot.test.ts tests/vitest/project-publication-actions.test.ts --maxWorkers=1
bun run type-check
bun run lint
```

### Phase D — UI/API

```bash
bunx vitest run tests/vitest/client-archive-route.test.ts tests/vitest/client-archive-dashboard.test.tsx tests/vitest/client-archive-detail.test.tsx --maxWorkers=1
bun run validate
```

### Phase E — billing

```bash
bunx vitest run tests/vitest/stripe-client-archive-webhook.test.ts tests/vitest/client-archive-billing-route.test.ts --maxWorkers=1
bun run validate
```

### Phase F/G — upgrade/deletion

```bash
bunx vitest run tests/vitest/share-to-client-upgrade-route.test.ts tests/vitest/mass-deletion-action-contract.test.ts tests/vitest/mass-deletion-contract.test.ts tests/vitest/mass-deletion-ui-contract.test.ts --maxWorkers=1
bun run validate
bun run test:e2e
```

Before production release:

```bash
bun run build
git diff --check
```

Use the repo's launch readiness scripts when provider/env/Supabase production readiness is in scope.

---

## 11. Evidence Required for Completion

A codebase AI should not report this feature “done” without:

- changed files summary;
- migration/RLS summary;
- test names and real command output;
- cross-user denial proof;
- billing webhook idempotency proof if billing touched;
- deletion preview/block proof if deletion touched;
- source-deleted archive proof if tombstone behavior touched;
- remaining policy decisions and risks.

---

## 12. Testing Acceptance Criteria

The test plan is satisfied only if:

- new code follows TDD where feasible;
- archive access is tested independently from project roles;
- entitlement states are tested as a state machine;
- immutable snapshot/deletion independence is tested;
- public share access remains backward compatible;
- billing webhooks are signature/idempotency/order tested;
- UI states cover empty, active, past-due, canceled, source-deleted, expired, and revoked;
- `bun run validate` is green for implementation PRs unless a documented unrelated baseline blocker exists.
