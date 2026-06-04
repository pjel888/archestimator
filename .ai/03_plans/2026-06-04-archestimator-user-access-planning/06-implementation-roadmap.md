# 06 — Implementation Roadmap & Feature Tracker Alignment

**Status:** Planning  
**Last updated:** 2026-06-04  
**Intent:** Give the active codebase AI a concrete, safe implementation plan without modifying the repo from this planning session.

---

## 1. Strategic Direction

Archestimator should not implement Type 3 as another collaboration role. The implementation must preserve the corrected model:

- **Identity:** who the user is.
- **Permission:** what the user can do.
- **Entitlement:** what the user paid for.

Type 3 is primarily an **entitlement** and **archive-access** actor, not a live project collaborator.

---

## 2. Implementation Principles

1. **Do not reuse project collaboration roles for clients.**
   - `project_members` and `estimate_sheet_members` remain Type 2 infrastructure.
   - Type 3 must not be inserted into project collaboration tables.

2. **Do not depend on live project tables for archive reads.**
   - Archive routes read from `client_archive_snapshots`, not `projects` or `estimate_row_items`.

3. **Start deletion behavior conservatively.**
   - Phase 1 should block hard delete if active archive subscribers exist.
   - Tombstone-safe deletion can come after proof.

4. **Use hosted billing flows for payment collection, but keep entitlement logic in Archestimator.**
   - Avoid custom card/payment UI for MVP.
   - Use Checkout/Customer Portal or the approved billing provider for payment operations.
   - Keep archive entitlement state, snapshot access, and deletion/tombstone logic in Archestimator tables.

5. **Treat durable client identity and paid archive entitlement as separate states.**
   - A client may need durable identity for comments/decisions before becoming a paid archive subscriber.
   - Paid deletion-independent archive access still requires an entitlement/subscription check.

6. **Keep all production/provider writes behind explicit approval.**
   - No Supabase production migration apply without Philip approval.
   - No Stripe product/price creation without Philip approval.
   - No deletion-behavior production changes without Philip approval.

---

## 3. Phase Plan

### Phase 0 — Planning & Source-of-Truth Alignment

**Goal:** Make the architecture official before coding.

**Tasks:**

- Add these planned items to `.ai/06_specs/feature-inventory.md` under a new `Client Archive / Paid Subscriber` section.
- Add a short current-state entry in `.ai/10_state/current-state.md` if code implementation begins.
- Create a repo plan folder, likely:
  - `.ai/03_plans/2026-06-04-client-archive-subscriber-access/`
- Copy or link this Desktop planning packet into that repo plan if Philip approves repo doc edits.

**Exit criteria:**

- Codebase AI has a single source-of-truth plan.
- No implementation begins before the Type 3 boundary is understood.

---

### Phase 1 — Schema Foundation (Local Only First)

**Goal:** Add archive/subscription tables and RLS in a forward migration.

**Files likely touched:**

- `supabase/migrations/20260604XXXXXX_client_archive_subscription_core.sql`
- `tests/vitest/client-archive-subscription-schema.test.ts`
- `tests/vitest/client-archive-snapshot-schema.test.ts`
- `src/lib/supabase/types.ts` (after type generation if used)

**Database additions:**

- `subscription_status` enum
- `subscription_event_type` enum
- `tombstone_entity_type` enum
- `client_archive_subscriptions`
- `client_archive_snapshots`
- `deletion_tombstones`
- `client_archive_subscription_events`
- `shared_link_recipients.upgraded_to_user_id`

**Initial RLS expectations:**

- Authenticated users can SELECT their own subscription row.
- Authenticated users can SELECT snapshots attached to their own active/trialing/past_due subscription.
- Authenticated users cannot INSERT/UPDATE/DELETE archive snapshots.
- Service role can create/update subscription and archive records.
- No FK constraints from archive snapshots to source project/publication tables.

**Verification:**

```bash
bunx vitest run tests/vitest/client-archive-subscription-schema.test.ts tests/vitest/client-archive-snapshot-schema.test.ts --maxWorkers=1
bun run type-check
bun run lint
```

**Exit criteria:**

- Schema tests prove the archive domain is independent and RLS-gated.
- No production apply yet unless explicitly approved.

---

### Phase 2 — Archive Snapshot Creation from Publication

**Goal:** When a publication is created or republished, create archive snapshots for recipients who already have active subscriptions.

**Files likely touched:**

- `src/lib/publication/actions.ts`
- `src/lib/publication/snapshot.ts`
- `src/lib/publication/public-repository.ts`
- `src/lib/client-archive/` (new)
- `tests/vitest/client-archive-publication-snapshot.test.ts`
- possibly `supabase/migrations/...` for `create_archive_snapshot_for_publication()` RPC

**Implementation options:**

#### Option A — Database RPC

Use `create_archive_snapshot_for_publication(publication_id)` service-role RPC.

**Pros:** transactional, close to data.  
**Cons:** JSON shaping inside SQL can become complex.

#### Option B — Server-side TypeScript repository

After successful publication action, server-side service-role repository copies `snapshot_json` into `client_archive_snapshots`.

**Pros:** easier tests and TypeScript type safety.  
**Cons:** needs careful transaction/idempotency handling.

**Recommendation:** Start with TypeScript repository using service-role client for MVP, with unique idempotency guard:

```sql
UNIQUE (subscription_id, source_publication_id, snapshot_version)
```

Add the unique index if using this approach:

```sql
CREATE UNIQUE INDEX client_archive_snapshots_unique_publication_version
  ON public.client_archive_snapshots(subscription_id, source_publication_id, snapshot_version)
  WHERE source_publication_id IS NOT NULL;
```

**Verification:**

```bash
bunx vitest run tests/vitest/client-archive-publication-snapshot.test.ts tests/vitest/project-publication-actions.test.ts tests/vitest/project-publication-snapshot.test.ts --maxWorkers=1
bun run type-check
bun run lint
```

**Exit criteria:**

- Active subscriber recipient gets an archive snapshot after publication.
- Non-subscriber recipient does not.
- Re-publish creates a new versioned snapshot or idempotently updates only allowed metadata per design.

---

### Phase 3 — Client Archive Read UI/API

**Goal:** Give Type 3 users a read-only archive portal.

**New routes:**

- `src/app/client/archive/page.tsx`
- `src/app/client/archive/[snapshotId]/page.tsx`
- `src/app/api/client/archive/route.ts`
- `src/app/api/client/archive/[snapshotId]/route.ts`

**New components:**

- `src/components/client-archive/ClientArchiveDashboard.tsx`
- `src/components/client-archive/ClientArchiveCard.tsx`
- `src/components/client-archive/ClientArchiveSnapshotView.tsx`
- `src/components/client-archive/ClientArchiveSourceStatus.tsx`

**Repository layer:**

- `src/lib/client-archive/repository.ts`
- `src/lib/client-archive/types.ts`
- `src/lib/client-archive/access.ts`

**UX rules:**

- Read-only only.
- Show source contractor/project metadata.
- Show active vs archived/source-deleted status.
- Do not show contractor internal unit-rate breakdowns if public snapshot sanitizer removes them.
- Reuse proposal/share rendering where safe, but do not make archive route depend on live share-token state.

**Verification:**

```bash
bunx vitest run tests/vitest/client-archive-access.test.ts tests/vitest/client-archive-ui.test.tsx --maxWorkers=1
bun run type-check
bun run lint
```

**Exit criteria:**

- Authenticated subscriber sees own archive list.
- Subscriber can open snapshot detail.
- Cross-user access denied.
- Canceled/expired subscription denied or hidden.

---

### Phase 4 — Billing Integration

**Goal:** Add Stripe Checkout, Customer Portal, and webhook synchronization.

**Files likely touched:**

- `src/app/api/billing/client-archive/checkout/route.ts`
- `src/app/api/billing/client-archive/portal/route.ts`
- `src/app/api/webhooks/stripe/route.ts`
- `src/lib/billing/stripe.ts`
- `src/lib/client-archive/subscription-repository.ts`
- `tests/vitest/stripe-client-archive-webhook.test.ts`

**Environment variables needed:**

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_CLIENT_ARCHIVE_PRICE_ID_MONTHLY`
- `STRIPE_CLIENT_ARCHIVE_PRICE_ID_YEARLY` (optional)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` only if client-side Stripe is needed; Checkout can avoid most client-side custom code.

**Stop condition:** Creating Stripe products/prices or mutating provider settings requires Philip approval.

**Verification:**

```bash
bunx vitest run tests/vitest/stripe-client-archive-webhook.test.ts --maxWorkers=1
bun run type-check
bun run lint
```

**Exit criteria:**

- Valid Stripe webhook changes subscription status.
- Invalid webhook rejected.
- Checkout route creates session for authenticated user.
- Customer portal route works for existing customer.

---

### Phase 5 — Type 4 → Type 3 Upgrade Flow

**Goal:** Convert public share-link viewers into durable paid archive users.

**Files likely touched:**

- `src/app/share/[token]/page.tsx`
- `src/components/share/SharePageDecision.tsx`
- `src/components/share/SharePageComments.tsx`
- `src/components/share/ShareArchiveUpgradeCta.tsx` (new)
- `src/app/api/share/[token]/upgrade/start/route.ts`
- `src/app/api/share/[token]/upgrade/attach/route.ts`
- `src/lib/share/recipient-upgrade.ts`
- `tests/vitest/share-recipient-upgrade.test.ts`

**Upgrade triggers:**

- Viewer clicks `Save this proposal`
- Viewer submits comment
- Viewer approves/denies/requests revision
- Publication is nearing expiry

**Critical rule:**

A recipient session alone is insufficient. Upgrade attach requires:

1. valid current share session;
2. authenticated user or verified email identity;
3. matching recipient email;
4. active/trialing archive subscription.

**Exit criteria:**

- Type 4 can start upgrade from share page.
- Type 4 cannot get archive access without subscription.
- Type 3 can attach current publication to archive after subscribing.

---

### Phase 6 — Deletion Guard Integration

**Goal:** Protect paid archive rights when Type 1 deletes projects.

**Files likely touched:**

- `supabase/migrations/...` update to `preview_bulk_delete_projects` and optionally `execute_bulk_delete_projects`
- `src/lib/projects/actions.ts`
- deletion preview UI tests
- `tests/vitest/client-archive-deletion-boundary.test.ts`
- existing mass deletion tests

**Phase 6A — Conservative block:**

- Add active-subscriber check to deletion preview.
- Return blocked reason:
  - `Project has active paid client archive subscribers. Archive rights must be resolved before hard deletion.`

**Phase 6B — Tombstone-safe deletion:**

- Only after Phase 6A is proven.
- Before live delete, mark source as deleted in archive snapshots and create `deletion_tombstones`.
- Delete project only after archive preservation transaction succeeds.

**Verification:**

```bash
bunx vitest run tests/vitest/client-archive-deletion-boundary.test.ts tests/vitest/mass-deletion-governance.test.ts --maxWorkers=1
bun run type-check
bun run lint
```

**Exit criteria:**

- Active archive subscriber blocks hard delete in Phase 6A.
- No existing deletion safety tests regress.

---

### Phase 7 — Archive Export

**Goal:** Let Type 3 subscribers export archived snapshots.

**Routes:**

- `/api/client/archive/[snapshotId]/export/xlsx`
- `/api/client/archive/[snapshotId]/export/pdf`

**Implementation:**

- Reuse `src/lib/proposal-export/create-proposal-workbook.ts` where possible.
- Build export model from `client_archive_snapshots.estimate_data`, not live estimate tables.

**Tests:**

- subscriber can export own snapshot.
- cross-subscriber denied.
- source-deleted snapshot still exports.
- exported workbook has expected sheets and no internal-only rate fields if public sanitizer excludes them.

---

## 4. Feature Tracker Alignment

Add a new section to `.ai/06_specs/feature-inventory.md`:

```md
## Client Archive / Paid Subscriber

| Feature | Code | Spec | Plan | Tests | Archive |
|---------|------|------|------|-------|---------|
| Client archive subscriptions | `src/lib/client-archive/`, `src/app/api/billing/client-archive/` | `client-archive-subscription-spec.md` | `2026-06-04-client-archive-subscriber-access/` | `client-archive-subscription-schema.test.ts`, `stripe-client-archive-webhook.test.ts` | — |
| Deletion-independent archive snapshots | `src/lib/client-archive/`, `supabase/migrations/*client_archive*` | same | same | `client-archive-snapshot-schema.test.ts`, `client-archive-publication-snapshot.test.ts` | — |
| Client archive portal | `src/app/client/archive/`, `src/components/client-archive/` | same | same | `client-archive-ui.test.tsx`, `client-archive-access.test.ts` | — |
| Recipient identity upgrade | `src/lib/share/recipient-upgrade.ts`, `src/app/api/share/[token]/upgrade/` | same | same | `share-recipient-upgrade.test.ts` | — |
| Archive-safe deletion boundary | `preview_bulk_delete_projects`, `deletion_tombstones` | same | same | `client-archive-deletion-boundary.test.ts`, mass deletion tests | — |
| Archive export | `src/app/api/client/archive/[snapshotId]/export/` | same | same | `client-archive-export.test.ts` | — |
```

Also update the existing `Shared Link / Publication` section with a note:

- Public share links remain Type 4 and do not grant durable archive access.
- Type 4 upgrade to Type 3 is handled by `Recipient identity upgrade`.

---

## 5. Suggested New Spec File

Create a new spec under:

```text
.ai/06_specs/client-archive-subscription-spec.md
```

Recommended headings:

1. Product definition
2. User types and axes
3. Subscription lifecycle
4. Archive snapshot lifecycle
5. Share-link upgrade lifecycle
6. Deletion-independent access rule
7. Security/RLS model
8. Routes and surfaces
9. Billing integration
10. Tests and acceptance criteria
11. Risks and non-goals

---

## 6. Acceptance Criteria by Capability

### Client archive subscription

- Authenticated user can have exactly one active archive subscription per email/customer.
- Subscription state is controlled by Stripe webhook or service-role admin flow only.
- Direct authenticated mutation of subscription status is impossible.

### Archive snapshot

- Archive snapshot has no FK dependency on live project/publication tables.
- Snapshot captures enough data to render the client proposal after source deletion.
- Snapshot is immutable once created.

### Archive portal

- Subscriber can list/open own snapshots.
- Subscriber cannot open another subscriber's snapshot.
- Anonymous user is redirected to login.
- Canceled/expired users cannot view protected archive content.

### Share upgrade

- Public share viewer can become an identified subscriber.
- Recipient session alone does not grant archive access.
- Subscription must match recipient identity.

### Deletion safety

- Project with active paid archive subscriber cannot be hard-deleted in initial phase.
- Later tombstone-safe deletion preserves archive before live deletion.
- Existing active-publication delete block remains intact.

---

## 7. Verification Matrix

Minimum local verification before PR-ready claim:

```bash
bunx vitest run \
  tests/vitest/client-archive-subscription-schema.test.ts \
  tests/vitest/client-archive-snapshot-schema.test.ts \
  tests/vitest/client-archive-access.test.ts \
  tests/vitest/client-archive-publication-snapshot.test.ts \
  tests/vitest/client-archive-deletion-boundary.test.ts \
  tests/vitest/stripe-client-archive-webhook.test.ts \
  tests/vitest/share-recipient-upgrade.test.ts \
  --maxWorkers=1

bun run type-check
bun run lint
git diff --check
bun run build
```

If database migration logic changes existing deletion functions, also run existing mass deletion/project publication suites.

---

## 8. Risks & Open Decisions

### Product/legal decisions needing Philip

- Exact archive subscription price.
- Trial length.
- Cancellation retention policy.
- Whether canceled clients retain view-only archives for 30 days or lose access immediately.
- Terms of Service language for contractor deletion vs client archive rights.
- Whether contractors can opt out of client archive subscriptions.

### Technical decisions needing implementation spike

- Whether archive snapshot creation should be TypeScript service-role repository or SQL RPC.
- Whether archive PDF export should be first-class in MVP or deferred after XLSX.
- Whether source-deleted project data needs soft-delete instead of hard-delete + tombstone.
- Whether Type 3 can exist as email-verified identity without full Supabase Auth account.

### Provider decisions needing approval

- Stripe account/product/price creation.
- Stripe webhook endpoint setup.
- Production Vercel env changes.
- Production Supabase migration apply.

---

## 9. Codebase AI Handoff

If another codebase AI is implementing this, give it this mission:

```text
Implement Type 3 Paid Client / Buyer Archive Subscriber for Archestimator as a separate entitlement/archive security domain.

Do not model Type 3 as a project collaborator. Do not put Type 3 users in project_members or estimate_sheet_members. Create client archive subscriptions and deletion-independent archive snapshots. Archive reads must not depend on live project RLS or live project tables. Initial deletion policy should block hard deletion when active archive subscribers exist. Use local migrations/tests first; do not apply production Supabase migrations, create Stripe products, modify Vercel env vars, or change production deletion behavior without Philip's explicit approval.

Start with schema/RLS tests, then snapshot creation, then client archive read UI/API, then Stripe, then Type 4→Type 3 upgrade, then deletion integration.
```

---

## 10. Definition of Done for First PR

A good first PR should include only Phase 1 and possibly Phase 2:

- Forward migration for archive tables/RLS.
- Local schema contract tests.
- TypeScript types/repository stubs if needed.
- No Stripe provider mutation.
- No production migration apply.
- No client portal UI yet unless Phase 1 is already stable.

This keeps the blast radius manageable while establishing the correct security boundary.

---

## 11. Second-Pass Addenda Incorporated

The first-pass roadmap remains valid, but the second-pass audit adds these mandatory companion docs:

- [`07-ux-ui-client-portal-and-share-upgrade-plan.md`](./07-ux-ui-client-portal-and-share-upgrade-plan.md) — client archive portal UX, billing state UX, and share-to-account upgrade rules.
- [`08-database-operations-rls-and-deletion-lifecycle-plan.md`](./08-database-operations-rls-and-deletion-lifecycle-plan.md) — immutable snapshot operations, RLS, entitlement checks, tombstones, and webhook event ledger.
- [`09-infosec-threat-model-and-control-plan.md`](./09-infosec-threat-model-and-control-plan.md) — Type 3 threat model and required controls.
- [`10-type-3-state-machine-and-lifecycle-plan.md`](./10-type-3-state-machine-and-lifecycle-plan.md) — explicit state machines and invariants.
- [`11-migration-blast-radius-and-rollout-plan.md`](./11-migration-blast-radius-and-rollout-plan.md) — additive rollout plan, rollback posture, and provider/deletion stop conditions.
- [`12-testing-and-verification-plan.md`](./12-testing-and-verification-plan.md) — test matrix, verification commands, and completion evidence.

### New roadmap gates

Before implementing any Type 3 feature code, the codebase AI should lock these gates:

1. **Architecture gate:** Type 3 is not inserted into `project_members` or `estimate_sheet_members`.
2. **Schema gate:** `client_archive_snapshots` are deletion-independent and not source-cascade dependent.
3. **RLS gate:** authenticated client reads are scoped to `auth.uid()` plus entitlement status.
4. **State gate:** share access, durable identity, paid entitlement, snapshot visibility, and deletion/tombstone state are separate.
5. **UX gate:** client archive is read-only vault UI, not workspace/member UI.
6. **Billing gate:** provider webhooks are signature-verified, idempotent, and order-tolerant.
7. **Deletion gate:** source hard delete is blocked until archive independence and tombstone behavior are tested.
8. **Testing gate:** cross-user denial, no-project-member Type 3, webhook idempotency, and source-deleted archive behavior are covered.

### Revised first PR recommendation

A safer first PR is now:

- additive migration for archive account/entitlement/snapshot/tombstone/webhook-event tables;
- RLS/grants/policies;
- schema/source-governance tests proving no source cascade and no project-member dependency;
- pure access/state helpers with tests;
- no billing provider mutation;
- no client archive UI yet unless the schema/access boundary is already green;
- no mass deletion behavior change beyond preview-only calculations.
