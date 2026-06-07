# Shared Recipient and Paid Client Retention Plan

**Date:** 2026-06-07
**Phase:** 5 — Planning Only (NO implementation without explicit approval)
**Plan:** `.ai/03_plans/2026-06-07-archives-feature/`

> ⚠️ This is FUTURE ARCHITECTURE PLANNING. No code, migrations, or provider settings are to be modified for Phase 5. Implementation requires Philip's explicit approval, payment/subscription infrastructure, and legal review.

## Problem Statement

Creator lifecycle state (archive/delete) cannot be the only source of truth for recipients and paid clients. If a contractor creates an estimate, shares it with a client, and the client pays for access, the client's entitlement should not be revocable by the contractor archiving or deleting the source project.

Currently, Archestimator has no concept of paid access, subscriptions, or retained entitlements. This plan defines the architecture so that future implementation does not paint the product into a corner.

## Lifecycle Independence

| Action | Creator View | Paid Recipient View | Free Shared Link | Rationale |
|--------|-------------|-------------------|------------------|-----------|
| Creator archives project | Hidden in Archived tab | Retained access to issued estimate | Shows "Project Archived" | Paid access persists; free access follows creator state |
| Creator deletes project | Project removed | Retained snapshot access | Link broken (404) | Paid clients keep immutable snapshots |
| Recipient subscription expires | N/A | Access revoked | N/A | Time-limited access |
| Recipient access revoked | N/A | Immediate loss | Link invalidated | Manual revocation |
| Free shared link expires | Link shows "Archived/Expired" | N/A | Shows "Expired" | Free links are temporary |

## Conceptual Data Model (Future)

### `recipient_entitlements`
```
- id: uuid PK
- recipient_user_id: uuid FK → auth.users
- grantor_user_id: uuid FK → auth.users (creator)
- entity_type: enum (project | estimate_sheet | publication)
- entity_id: uuid
- access_level: enum (read_only | comment | decision)
- status: enum (active | expired | revoked)
- purchased_at: timestamptz
- expires_at: timestamptz (NULL = perpetual)
- revoked_at: timestamptz
- created_at: timestamptz
```

### `retained_publication_snapshots`
```
- id: uuid PK
- entitlement_id: uuid FK → recipient_entitlements
- publication_id: uuid (original publication)
- snapshot_data: jsonb (immutable copy of publication data at time of retention)
- retained_at: timestamptz
- source_entity_status: enum (active | archived | deleted)
```

### `retained_estimate_snapshots`
```
- id: uuid PK
- entitlement_id: uuid FK → recipient_entitlements
- estimate_id: uuid (original estimate)
- snapshot_data: jsonb (immutable estimate tree + rows at time of retention)
- retained_at: timestamptz
```

### `retained_activity_history`
```
- id: uuid PK
- entitlement_id: uuid FK → recipient_entitlements
- event_data: jsonb (activity events at time of retention)
- retained_at: timestamptz
```

## Access Control (Future)

- **Separate RLS policies** for retained snapshot tables — not bound to live workspace data
- Creator archive/delete does NOT cascade to retained snapshots
- Recipient reads retained snapshots through `recipient_entitlements.status = 'active'` AND (`expires_at IS NULL` OR `expires_at > now()`)
- Service role: writes retained snapshots (not recipient self-service)
- Anon: denied all retained tables

## Recipient UI States (Future)

| Scenario | Recipient Sees |
|----------|---------------|
| Creator archived project, recipient has active entitlement | "Creator archived this project, but your issued estimate remains available under your subscription. [View retained estimate]" |
| Creator deleted project, recipient has active entitlement | "Creator deleted the live project. A retained proposal snapshot remains available under your subscription. [View retained snapshot]" |
| Recipient subscription expired | "Your access to this estimate has expired. [Renew access]" |
| Recipient access revoked by creator | "Your access to this shared estimate has been revoked by the project owner." |
| Free shared link, project archived | "This project has been archived by the owner and is no longer available." |
| Free shared link, project deleted | 404 — "This shared link is no longer available." |

## Security/RLS Implications (Future)

1. Retained snapshot tables must have independent RLS policies — not inherited from workspace/project membership
2. `recipient_entitlements` RLS: recipient reads own entitlements; grantor manages entitlements for their entities
3. Retained snapshots are read-only — no recipient modifications
4. Service role: creates snapshots, manages entitlements (server-authoritative, not client-driven)
5. Audit trail: all entitlement changes and snapshot accesses logged

## Non-Goals (for Phase 5 Planning)

- No payment processing implementation
- No subscription management (Stripe, etc.)
- No billing infrastructure
- No email notification system for retention events
- No automated snapshot creation on archive/delete
- No recipient-facing UI (share pages remain unchanged)

## Legal/Product Review Gates (Before Any Implementation)

- [ ] Philip approves retained-recipient architecture
- [ ] Legal review of retained data model (GDPR, data retention, right to deletion)
- [ ] Commercial policy: what is retained, for how long, under what terms
- [ ] Payment model decision: one-time purchase vs subscription
- [ ] Recipient terms of service / commercial agreement
- [ ] Data export/portability for retained snapshots

## Relationship to Phases 1-4

Phases 1-4 implement creator-side archive/restore. They do NOT touch recipient entitlements. When a project or estimate sheet is archived in P1/P2:

- Existing shared links continue to work (paused state, not revoked)
- No recipient data is modified
- No snapshots are automatically created

This keeps P1-P4 simple while P5 defines the future retention model.
