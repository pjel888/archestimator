# User 360: Identity, Activity, and Lifecycle

## Identity Reconciliation Contract

Canonical identity is Better Auth `user`. `profiles` is an Archestimator projection. A User 360 row must expose one reconciliation state:

- `matched`;
- `auth_user_missing_profile`;
- `profile_missing_auth_user`;
- `email_mismatch`;
- `duplicate_or_ambiguous`;
- `synthetic_runtime_profile_observed`;
- `erased_or_tombstoned`.

Provision/repair is idempotent, audited, and preserves role/status ownership. It may not silently activate a banned/suspended identity or overwrite a deliberately tombstoned record.

## Lifecycle Milestones

| Field | Authoritative source | Fallback | Prohibited interpretation |
| --- | --- | --- | --- |
| `signed_up_at` | Better Auth `user.createdAt` | unavailable with reason | `profiles.created_at` |
| `profile_provisioned_at` | `profiles.created_at` | none | signup |
| `email_verified_at` | durable verification/auth fact if available | boolean + unavailable time | infer from account presence |
| `onboarding_completed_at` | `user_onboarding_profiles` | not completed/unavailable | signup/use |
| `last_login_at` | durable successful auth/session-creation event | surviving session createdAt labeled approximate | session updatedAt |
| `last_authenticated_at` | rate-limited protected-request heartbeat | unavailable | current session existence |
| `last_product_activity_at` | normalized durable event rollup | source-specific recent fact | heartbeat or page view |
| `currently_online` | authenticated presence with freshness | unknown | active session |

The implementation stores event time, source, collected/updated time, and confidence/availability.

## Online Presence Contract

`currently_online` is sourced from authenticated per-user presence in the existing `GlobalPresence` Durable Object contract, extended with an opaque stable user key, connection generation, server-observed heartbeat, and bounded expiry. The DO never stores or emits raw session tokens, email, IP, URL parameters, or activity payloads. Connect/disconnect is advisory; heartbeat freshness plus TTL is authoritative so lost WebSocket disconnects converge. Admin reads receive only `online|offline|unknown`, observed-at, freshness deadline, and source availability under an exact capability.

If the DO or binding is unavailable, User 360 returns `unknown` with source/as-of/error class and does not infer presence from Better Auth sessions or the durable authenticated-use heartbeat. Multi-tab connections collapse by user key; a user becomes offline only after every live generation expires. Presence is ephemeral, excluded from product-activity history and DSAR exports except for separately justified aggregate operational metrics, and receives focused DO tests for reconnect, duplicate tabs, missed disconnect, expiry, unauthorized subscription, and degraded reads.

## Authenticated Heartbeat

- update no more than once per user per bounded interval, initially 5–15 minutes;
- write only after server-side authenticated protected use;
- never include route parameters, raw IP, token, or content payload;
- tolerate write failure without blocking the user request;
- expose staleness explicitly;
- benchmark D1 cost and write amplification before rollout;
- use a direct rollup row or idempotent event/outbox contract, not one row per request.

## Normalized Activity Model

Each event returned to User 360 has:

- stable source and source revision;
- normalized category/action/outcome;
- actor user, workspace/project/estimate scope when authorized;
- occurred-at and ingested-at;
- target type and safe label;
- redacted summary;
- privacy class;
- retention class/legal-hold status;
- source availability/partial flag;
- deep link only when current admin authorization permits it.

Initial adapters:

- estimate/activity;
- collaboration/membership/invitation;
- corporate membership;
- publication/share;
- component library and AI actions;
- uploads;
- support and feedback;
- notifications;
- account security/auth;
- admin interventions;
- client error/vital correlation only when its privacy class permits user-level display.

Activity History owns the shared vocabulary, durable domain-event production, retention/outbox, and public/user-facing history. Admin owns person-level investigation composition and privileged access audit. A versioned consumer receipt binds the two.

## Query Contract

- cursor pagination, not offsets, for event timelines;
- filters: date, category, outcome, source, workspace/project, target, intervention versus product activity;
- independent source timeouts and partial-result reporting;
- bounded page size and source fanout;
- no raw payload JSON in client DTOs;
- count queries optional and clearly approximate when expensive;
- rollups for last activity and common categories; drilldown remains source-backed.

## Sessions and Security

Show session creation/update/expiry, device label derived from sanitized user agent, coarse location only if policy allows, and current/revoked state. Never expose token, raw IP, OAuth access/refresh tokens, or secret-bearing account fields.

Controls:

- revoke one session;
- revoke all sessions;
- suspend with reason and optional expiry;
- ban with reason and escalation/case reference;
- reactivate with reason;
- protect self, last admin, configured break-glass accounts, and peer roles according to capability policy;
- notify the user according to security-notice policy without leaking internal reasoning;
- preserve intervention and revocation evidence.

## Account Intervention State Machine

`active -> suspended -> active` and `active|suspended -> banned -> active` are explicit commands. Every command includes actor, target, prior state, desired state, reason code, free-text note policy, optional expiry, case/incident reference, idempotency key, affected-row proof, session-revocation result, user-notification result, and audit result.

Business mutation and audit/outbox must be recoverable as one logical command. A missing target, stale expected state, protected target, or audit persistence failure cannot be reported as success.

## User 360 Product Footprint

Display counts and authorized links for:

- corporate accounts and roles;
- workspaces and roles;
- project and estimate memberships;
- invitations sent/received;
- owned/created projects and estimates where semantics exist;
- publication/shared-link involvement;
- support conversations and beta feedback;
- notification campaign deliveries and engagement;
- terms/consent/onboarding state;
- retention/legal-hold/erasure state where appropriate.

The view is not an unrestricted graph. Every entity read uses the current admin capability and redaction contract.

## Completion Criteria

- no ambiguous timestamp is mislabeled;
- identity mismatches are visible and repairable;
- ordinary users show real product activity when sources exist;
- expired sessions do not erase last-login/use history;
- cross-tenant and sensitive-data denial tests pass;
- account actions have affected-row, revocation, audit, and protected-operator proof;
- retention/DSAR/legal-hold behavior covers every contributing source.
