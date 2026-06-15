# 05 — Security Boundary & Deletion-Independent Archive Plan

**Status:** Planning  
**Last updated:** 2026-06-04  
**Scope:** Type 3 Paid Client / Buyer Archive Subscriber security, deletion lifecycle, and archive isolation

---

## 1. Security Objective

Type 3 must be treated as a **separate security domain**, not as a variation of the existing public share-link system.

A paid client archive subscriber must be able to read only the archive snapshots they are entitled to read, and that access must survive source project deletion without giving the client any access to live contractor workspace data.

Core rule:

> **Live project data and paid client archive data must be physically, logically, and policy-separated.**

---

## 2. Current Security Domains

Archestimator currently has three major access domains:

1. **Workspace domain**
   - Internal authenticated app users.
   - Tables: `workspaces`, `workspace_members`, `projects`, `estimates`, `estimate_nodes`, `estimate_row_items`, cost-library tables.
   - Access: workspace/project/sheet RLS and collaboration roles.

2. **Share-link domain**
   - Public/token/password-gated proposal viewers.
   - Tables: `project_publications`, `shared_link_recipients`, `shared_link_comments`, `shared_link_responses`, `shared_link_events`.
   - Access: token/password/session gates through server routes and service-role RPCs.

3. **Admin/audit domain**
   - Platform owner/admin and server-only audit flows.
   - Tables: profiles/admin tables, `mass_deletion_events`, security/rate-limit/audit tables.
   - Access: `is_platform_admin()` or service role only.

Type 3 needs a fourth domain:

4. **Client archive domain**
   - Paid client-side account with archive entitlement.
   - Tables: `client_archive_subscriptions`, `client_archive_snapshots`, `deletion_tombstones`, `client_archive_subscription_events`.
   - Access: authenticated client can read own paid archive snapshots only.

---

## 3. Non-Negotiable Boundary Rules

### Rule 1 — No live-project RLS dependency

Client archive reads must **not** call:

- `can_access_project()`
- `can_edit_project()`
- `current_project_access_rank()`
- `can_access_estimate()`
- `is_workspace_member()`

Those functions are for internal app users (Types 1 and 2). A Type 3 client may have paid archive rights without any workspace/project membership.

### Rule 2 — No source-table foreign-key dependency

Archive snapshots must not have enforced FK constraints to:

- `projects`
- `estimates`
- `estimate_nodes`
- `estimate_row_items`
- `project_publications`
- `shared_link_*` tables

The archive may store `source_project_id` or `source_publication_id` as plain UUID reference fields for audit/search, but those fields must be allowed to dangle after deletion.

### Rule 3 — No client write access to archive snapshots

The Type 3 user can read archive snapshots. They cannot mutate the archived estimate data.

Allowed client writes, if needed:

- subscription management through Stripe-hosted portal
- new comments/decisions only on active live publications, not archived snapshots
- client account/profile settings

Archive snapshot mutation is service-role only.

### Rule 4 — Archive snapshot is immutable

Once `client_archive_snapshots.estimate_data` is written, it must not be updated except by an explicit versioned superseding snapshot.

Permitted mutable fields:

- `source_deleted_at`
- operational metadata such as `updated_at` if required

Not permitted:

- changing costs
- changing project/client names
- changing comments/decision history inside an old snapshot
- changing totals

### Rule 5 — Type 4 sessions do not equal Type 3 accounts

A recipient-session cookie proves temporary publication access. It does **not** prove paid archive entitlement.

A Type 4 user becomes Type 3 only after:

1. durable identity is established, preferably Supabase Auth account or verified email identity;
2. subscription entitlement exists and is active/trialing/past_due within grace period;
3. an archive snapshot is linked to that subscription.

---

## 4. Target Data Flow

### 4.1 Live publication creation

```
Type 1 contractor publishes proposal
  → project_publications row created/updated
  → snapshot_json stores live share snapshot
  → shared_link_recipients rows created
  → For each recipient with active archive subscription:
      create client_archive_snapshots row
      copy publication snapshot into archive domain
      denormalize contractor/project/client metadata
```

Important: archive snapshot creation happens **at publication/republication time**, not at deletion time. Waiting until deletion risks missing data if source rows are already gone or if deletion fails halfway.

### 4.2 Type 4 viewer upgrade

```
Anonymous/token viewer opens /share/[token]
  → Password/session gate passes
  → Viewer comments, decides, requests revision, or clicks Save to archive
  → Email identity check / account creation
  → Stripe checkout for client archive subscription
  → subscription active/trialing
  → current publication snapshot copied into client_archive_snapshots
  → client can open /client/archive
```

### 4.3 Source project deletion

```
Type 1 requests project deletion
  → preview_bulk_delete_projects checks active publications
  → also checks active client archive subscribers
  → if active subscribers exist:
      either block hard delete OR convert to tombstone-safe deletion
  → mark_archive_snapshots_source_deleted(project_id)
  → deletion_tombstone created
  → live project may be deleted only after archive is already independent
```

---

## 5. Deletion Policy Options

### Option A — Block deletion while active subscribers exist

**Behavior:** If a project has active Type 3 subscribers, `preview_bulk_delete_projects` blocks deletion.

**Pros:**
- Safest initial implementation.
- Lowest chance of archive data loss.
- Simple user-facing message: "This project has paid client archive subscribers. Resolve archive access before deleting."

**Cons:**
- Contractor may be unable to clean old projects.
- Requires UI for resolving/archive-exporting/subscription expiration.

**Recommended for Phase 1:** Yes. Start with hard blocking until archive infrastructure has been proven.

---

### Option B — Tombstone-safe deletion

**Behavior:** If active subscribers exist, source project may be deleted only after:

1. archive snapshots are verified to exist for all active subscriber entitlements;
2. `deletion_tombstones` row is created;
3. archive rows are marked `source_deleted_at`;
4. live data is deleted.

**Pros:**
- Lets contractors clean old projects.
- Honors deletion-independent archive promise.

**Cons:**
- More complex.
- Requires exact transactional ordering.
- Needs clear copy: client archive preserved, source removed.

**Recommended for Phase 2:** Yes, after Phase 1 archive reads and subscription gates are stable.

---

### Option C — Soft-delete all projects with subscribers

**Behavior:** Instead of physical delete, mark projects as `deleted_at` while hiding them from the contractor UI.

**Pros:**
- Easiest to preserve data.
- Reversible.

**Cons:**
- Requires retrofitting every project/estimate query with `deleted_at IS NULL`.
- Creates risk of hidden data still being reachable through old queries.
- Larger migration blast radius.

**Recommended:** Not for first implementation. Consider only if legal/data-retention requirements demand it.

---

## 6. Recommended Initial Policy

Phase 1 should implement:

1. Archive snapshots independent from source project tables.
2. Subscription-gated read access.
3. Deletion preview blocks hard delete when active Type 3 subscribers exist.
4. Clear blocker reason in the deletion UI.
5. Tombstone table exists, but tombstone-safe deletion is not yet enabled for broad use.

Phase 2 should implement:

1. Safe hard-delete with tombstone if all archive snapshots are verified.
2. Service-role deletion workflow that marks archive snapshots before live deletion.
3. Client-facing indicator: "The contractor deleted the source project on {date}; your archive copy remains available."

---

## 7. RLS Boundary Design

### 7.1 Subscription RLS

Type 3 user can read only their own subscription row:

```sql
user_id = auth.uid()
```

No direct authenticated INSERT/UPDATE/DELETE. Subscription state changes are driven by Stripe webhooks through service role.

### 7.2 Archive snapshot RLS

Type 3 user can read snapshots where:

```sql
snapshot.subscription_id IN (
  SELECT id FROM client_archive_subscriptions
  WHERE user_id = auth.uid()
    AND status IN ('trialing', 'active', 'past_due')
)
```

This makes the entitlement check independent of live project access.

### 7.3 Tombstone RLS

Tombstones should be readable by:

- platform admins;
- workspace admins for tombstones from their workspace;
- service role.

Clients do not need raw tombstone rows; they see derived `source_deleted_at` status on their archive snapshots.

---

## 8. API Boundary Design

### Client archive routes

| Route | Method | Purpose | Auth |
|-------|--------|---------|------|
| `/client/archive` | GET page | Archive dashboard | Supabase Auth |
| `/client/archive/[snapshotId]` | GET page | Read-only archived proposal | Supabase Auth + archive entitlement |
| `/api/client/archive` | GET | List archive snapshots | Supabase Auth + RLS |
| `/api/client/archive/[snapshotId]` | GET | Snapshot detail JSON | Supabase Auth + RLS |
| `/api/client/archive/[snapshotId]/export/pdf` | GET | Export archive PDF | Supabase Auth + entitlement |
| `/api/client/archive/[snapshotId]/export/xlsx` | GET | Export archive XLSX | Supabase Auth + entitlement |

### Stripe routes

| Route | Method | Purpose | Auth |
|-------|--------|---------|------|
| `/api/billing/client-archive/checkout` | POST | Create Stripe checkout session | Supabase Auth or verified recipient session |
| `/api/billing/client-archive/portal` | POST | Create Stripe customer portal session | Supabase Auth |
| `/api/webhooks/stripe` | POST | Subscription webhook | Stripe signature |

### Share upgrade routes

| Route | Method | Purpose | Auth |
|-------|--------|---------|------|
| `/api/share/[token]/upgrade/start` | POST | Start identity/subscription upgrade | Share token + session |
| `/api/share/[token]/upgrade/attach` | POST | Attach publication to active subscription | Supabase Auth + share session |

---

## 9. Threat Model

### Threat 1 — Client reads another client's archive

**Attack:** Authenticated Type 3 user guesses a snapshot ID.

**Defense:** RLS requires snapshot subscription belongs to `auth.uid()` and subscription is active/trialing/past_due.

**Tests:**
- Client A cannot fetch Client B snapshot.
- Platform admin can fetch both.
- Anonymous cannot fetch either.

---

### Threat 2 — Client reads live contractor data through archive route

**Attack:** Archive API accidentally uses `project_id` to query live `estimate_row_items`.

**Defense:** Archive route must render only from `client_archive_snapshots.estimate_data`; no live project/estimate queries allowed.

**Tests:**
- Delete/tombstone source project in fixture; archive page still renders.
- Spy/mock repository calls to prove archive route does not call live project repository.

---

### Threat 3 — Contractor deletes project and destroys paid archive

**Attack:** Type 1 deletes project; cascade removes publications and client history.

**Defense:** Archive snapshots are independent. Deletion preview blocks active subscribers or tombstone-safe delete marks source as deleted before live cascade.

**Tests:**
- `preview_bulk_delete_projects` blocks project with active archive subscribers.
- Archive snapshot remains after deleting source project in test DB fixture.

---

### Threat 4 — Expired or canceled subscriber keeps archive access

**Attack:** User cancels or payment fails but keeps API session.

**Defense:** RLS checks subscription status on every read.

**Tests:**
- `active` can read.
- `trialing` can read.
- `past_due` can read only within grace rules if encoded.
- `canceled` cannot read.
- `expired` cannot read.

---

### Threat 5 — Stripe webhook spoofing

**Attack:** Attacker POSTs fake webhook to activate subscription.

**Defense:** Verify `Stripe-Signature` with `STRIPE_WEBHOOK_SECRET`; reject unsigned or mismatched body.

**Tests:**
- unsigned webhook returns 400.
- wrong signature returns 400.
- valid signature updates subscription.

---

### Threat 6 — Type 4 recipient session escalates to archive without paying

**Attack:** Viewer with recipient cookie calls attach endpoint.

**Defense:** Attach endpoint requires both recipient session and active subscription tied to verified email/user.

**Tests:**
- recipient session only: cannot create archive snapshot.
- auth user without subscription: cannot create archive snapshot.
- auth user with active subscription and matching recipient email: can attach.

---

## 10. Data Retention & Privacy

### Archive retention

Initial proposed policy:

- Active/trialing/past_due: archive available.
- Canceled: archive hidden from UI but retained for 30 days.
- Expired after 30 days: archive may be deleted or exported only on request.
- User-requested deletion: delete `client_archive_subscriptions`, cascade archive snapshots, remove subscription events where legally allowed.

### Contractor deletion vs client archive

The contractor's deletion request deletes or hides the contractor's live project data. It must not delete a client's paid archive unless:

1. the client subscription is inactive/expired and retention window has passed; or
2. legal/privacy policy requires removal; or
3. both contractor and client rights are resolved by explicit policy.

This needs Terms of Service language before public release.

---

## 11. Required Security Tests

Minimum focused test suite before implementation can be considered complete:

1. `client-archive-subscription-schema.test.ts`
   - table names, columns, RLS policies, grants, no direct write grants.

2. `client-archive-snapshot-schema.test.ts`
   - no FK to `projects` or `project_publications`.
   - immutable/no authenticated write policies.

3. `client-archive-access.test.ts`
   - own archive read allowed.
   - cross-client read denied.
   - anonymous denied.
   - canceled/expired denied.

4. `client-archive-publication-snapshot.test.ts`
   - publication creates archive snapshot for active subscriber recipient.
   - snapshot content is denormalized and complete.

5. `client-archive-deletion-boundary.test.ts`
   - project with active subscribers blocked from hard delete in Phase 1.
   - archive snapshot remains independent after source deletion fixture.

6. `stripe-client-archive-webhook.test.ts`
   - signature verification.
   - subscription status lifecycle mapping.
   - idempotent event handling.

7. `share-recipient-upgrade.test.ts`
   - recipient session alone cannot attach archive.
   - matching verified subscription can attach.
   - mismatched email/user denied.

---

## 12. Implementation Stop Conditions

Stop and require Philip approval if any of these happen:

- Stripe account/products/prices need to be created or modified.
- Production Supabase migration would be applied.
- Production deletion behavior would change.
- Any destructive migration is proposed.
- Any live project deletion or test deletion against production is needed.
- Any legal/Terms of Service wording is being finalized as public policy.

Planning can proceed without approval. Provider writes, billing setup, production migration apply, and deletion behavior changes need explicit approval.
