# 10 — Type 3 State Machine and Lifecycle Plan

**Status:** Second-pass planning  
**Last updated:** 2026-06-04  
**Scope:** State machines for public share viewers, recipient identity upgrade, client archive entitlement, immutable snapshots, source deletion, and activity/decision continuity.

---

## 1. Why a State Machine Is Required

Type 3 cannot be safely implemented as a boolean such as `is_client` or a role such as `viewer`.

It has multiple independent lifecycles:

- public share access lifecycle;
- recipient verification lifecycle;
- durable account binding lifecycle;
- paid archive entitlement lifecycle;
- immutable snapshot lifecycle;
- source deletion/tombstone lifecycle;
- comments/decisions/activity lifecycle.

Each lifecycle has different security implications. Collapsing them into one status would recreate the original user-type-vs-role problem.

---

## 2. State Machine A: Type 4 Public Share Viewer

### States

1. `anonymous_unverified`
2. `password_required`
3. `password_verified`
4. `recipient_token_present`
5. `recipient_session_verified`
6. `stateful_action_requested`
7. `identity_upgrade_required`
8. `link_expired`
9. `link_revoked`

### Transitions

- `anonymous_unverified -> password_required` when publication is password protected.
- `password_required -> password_verified` after valid password/access cookie.
- `password_verified -> recipient_token_present` when a valid recipient parameter/link is present.
- `recipient_token_present -> recipient_session_verified` after session route validates recipient and sets session cookie.
- `recipient_session_verified -> stateful_action_requested` when user clicks comment/approve/deny/request revision/save archive.
- `stateful_action_requested -> identity_upgrade_required` when action requires durable identity.
- any active state -> `link_expired` if publication/link expiry passes.
- any active state -> `link_revoked` if owner disables link/publication.

### Invariants

- Type 4 never receives project membership.
- Type 4 never receives deletion-independent archive rights.
- Share cookies never authorize `/client/archive/*` routes.
- Expired/revoked share access does not revoke already sealed Type 3 archives unless policy explicitly says so.

---

## 3. State Machine B: Recipient Identity Upgrade

This is the bridge from Type 4 stateful intent to Type 3 client identity handling.

### States

1. `not_started`
2. `recipient_session_verified`
3. `email_claim_requested`
4. `auth_account_created_or_found`
5. `recipient_email_verified`
6. `recipient_account_linked`
7. `client_identity_active`
8. `claim_conflict`
9. `claim_revoked`

### Transitions

- `not_started -> recipient_session_verified` through current shared-link recipient session flow.
- `recipient_session_verified -> email_claim_requested` when stateful action needs durable identity.
- `email_claim_requested -> auth_account_created_or_found` through Supabase Auth sign-in/sign-up.
- `auth_account_created_or_found -> recipient_email_verified` when account email matches or separately verifies recipient email.
- `recipient_email_verified -> recipient_account_linked` when `shared_link_recipients` or a new binding table records the relationship.
- `recipient_account_linked -> client_identity_active` when account is ready for comment/decision/history/archive flows.
- any verification mismatch -> `claim_conflict`.
- owner/security action -> `claim_revoked`.

### Recommended binding table

Use a dedicated table instead of overloading `shared_link_recipients`:

- `client_recipient_account_links`
  - `id`
  - `recipient_id`
  - `publication_id`
  - `client_user_id`
  - `verified_email`
  - `status`
  - `created_at`
  - `revoked_at`

This preserves current recipient tables while creating a durable identity bridge.

### Invariants

- A client identity can exist without a paid archive entitlement.
- A paid archive entitlement can be checked only after identity is established.
- Identity upgrade does not grant project CRUD permission.

---

## 4. State Machine C: Archive Entitlement / Subscription

### States

1. `none`
2. `checkout_started`
3. `pending_activation`
4. `trialing`
5. `active`
6. `past_due`
7. `grace_period`
8. `paused`
9. `canceled_pending_period_end`
10. `canceled`
11. `expired`
12. `revoked`

### Transitions

- `none -> checkout_started` when client starts paid archive subscription.
- `checkout_started -> pending_activation` after checkout session is created.
- `pending_activation -> active/trialing` after verified billing webhook or post-checkout verification.
- `active -> past_due` when billing provider indicates payment failure.
- `past_due -> grace_period` if product policy grants temporary access.
- `past_due/grace_period -> active` on successful payment recovery.
- `active -> canceled_pending_period_end` when cancellation is scheduled.
- `canceled_pending_period_end -> canceled` at period end.
- `canceled -> expired` after retention/grace policy.
- any state -> `revoked` for fraud/security/support action.

### Access rules by state

- `active`: archive read allowed.
- `trialing`: archive read allowed if trial is part of product plan.
- `past_due`: product decision; safest default is read allowed only until `grace_ends_at`.
- `grace_period`: read allowed until grace expiry.
- `canceled_pending_period_end`: read allowed until period end.
- `canceled`: no read unless cancellation retention policy grants it.
- `expired`: no read.
- `revoked`: no read.

### Invariants

- Entitlement state is controlled by server/billing/admin systems, not client updates.
- Archive reads must check entitlement at request time.
- Subscription status does not create collaboration permission.

---

## 5. State Machine D: Archive Snapshot

### States

1. `capture_requested`
2. `capturing`
3. `sealed`
4. `visible_to_client`
5. `superseded`
6. `source_deleted`
7. `access_suspended`
8. `retention_expired`
9. `purged`

### Transitions

- `capture_requested -> capturing` when publication snapshot is being copied.
- `capturing -> sealed` after snapshot JSON and metadata are saved.
- `sealed -> visible_to_client` when entitlement and identity checks pass.
- `visible_to_client -> superseded` when a newer publication/version is archived.
- `visible_to_client/superseded -> source_deleted` when owner deletes source and tombstone is created.
- any visible state -> `access_suspended` if entitlement is not active.
- `source_deleted/access_suspended -> retention_expired` when retention policy ends.
- `retention_expired -> purged` only through explicit retention job and audit record.

### Invariants

- `sealed` snapshot content is immutable.
- Do not update `snapshot_json` in place after sealing.
- Use new snapshot version or correction event for changes.
- `source_deleted` does not imply snapshot deletion.

---

## 6. State Machine E: Source Project Deletion With Archives

### States

1. `delete_not_requested`
2. `delete_preview_requested`
3. `delete_blocked_active_publication`
4. `delete_blocked_active_archive_subscriber`
5. `delete_allowed_no_archive`
6. `delete_allowed_with_tombstone`
7. `snapshot_integrity_verified`
8. `source_deleted_tombstone_created`
9. `storage_cleanup_pending`
10. `storage_cleanup_completed`

### Recommended Phase 1 behavior

- If active archive subscribers exist, transition to `delete_blocked_active_archive_subscriber`.
- Do not hard delete until archive snapshot independence has been proven with tests.

### Later behavior

- `delete_preview_requested -> delete_allowed_with_tombstone` only if every active archive has a sealed independent snapshot.
- `delete_allowed_with_tombstone -> snapshot_integrity_verified` through service check.
- `snapshot_integrity_verified -> source_deleted_tombstone_created` through deletion execution.
- Source storage cleanup excludes assets still referenced by client archive snapshots.

### Invariants

- Deletion preview must display archive impact.
- Deletion execution must write audit/tombstone records.
- Source deletion must not cascade into sealed client archives.

---

## 7. State Machine F: Comments, Decisions, and Revision Requests

### Current repo behavior

The current share-link implementation supports comment and decision APIs gated by recipient session. That is a good Type 4.5 pattern but not full durable account identity.

### Future states

1. `not_available_to_anonymous`
2. `available_to_recipient_session`
3. `durable_identity_required`
4. `client_identity_verified`
5. `submitted`
6. `owner_seen`
7. `archived_in_activity_history`
8. `source_deleted_archived`
9. `revoked_or_hidden`

### Design decision

Stateful actions should create or require a durable client identity record. Paid archive entitlement is separate:

- comment/decision identity can be free or included;
- deletion-independent archive access is paid or explicitly granted;
- both use the same client identity rail but different entitlements/permissions.

### Invariants

- Comment/decision records should survive source deletion if they are part of paid archive activity history.
- Do not let public session cookies alone create permanent archive rights.
- Use audit events for edits/corrections.

---

## 8. Cross-State Access Decision Function

Every archive read should reduce to a simple decision function:

```text
canReadArchiveSnapshot(user, snapshot):
  user is authenticated
  AND snapshot.client_user_id == user.id
  AND snapshot is sealed/not purged
  AND entitlement state permits read
  AND snapshot is not revoked
```

Every live project read remains separate:

```text
canReadLiveProject(user, project):
  user is owner OR project member OR sheet member with sufficient role
```

These functions must never fall back to each other.

---

## 9. State Machine Acceptance Criteria

Implementation is acceptable only if:

- each lifecycle has explicit status values or equivalent computed states;
- Type 4 share state does not authorize Type 3 archive routes;
- recipient identity upgrade is explicit and auditable;
- paid archive entitlement is separate from client identity;
- source deletion and archive snapshot states are separate;
- tests cover invalid transitions and cross-state privilege escalation;
- UI copy exposes relevant state without leaking internal provider details.
