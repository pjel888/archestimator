# Scope, Non-Goals, and Terminology

## In Scope

- all current `/admin/**` routes and the operator functions they represent;
- admin-only API routes, Server Actions, repositories, D1 tables, tests, and feature flags;
- Better Auth user/session/account facts required for administration;
- the `profiles` projection and onboarding/business persona data;
- user membership footprint across corporate accounts, workspaces, projects, estimate sheets, invitations, publications/shares, support, notifications, security, and activity;
- a normalized read model for person-level product activity without changing domain-event ownership;
- safe user lifecycle and session interventions;
- a full in-app notification campaign control plane and its user-inbox integration;
- scheduling, fanout, history, targeting, metrics, preferences, cancellation/retraction, retry, audit, and reconciliation;
- support, feature configuration, audit/security, observability, incidents, analytics, and fragmented operator-tool consolidation;
- data retention, DSAR/erasure, legal-hold, redaction, audit durability, performance, cost, rollout, rollback, and hosted proof boundaries.

## Explicit Non-Goals

- billing, payments, entitlements, invoices, or revenue operations until the product has a chosen billing system;
- replacing Better Auth with a custom identity provider;
- exposing raw session tokens, OAuth tokens, raw IP addresses, raw user-agent strings, secrets, or unrestricted event payloads;
- equating an active session, session refresh, WebSocket connection, or UI visit with durable product activity;
- direct SQL consoles, arbitrary query builders, or unrestricted raw data exports in `/admin`;
- redefining Corporate Account roles, Teamwork authorization, Activity event taxonomy, publication authority, support delivery, or observability alert ownership;
- using product notification campaigns as a substitute for operational alert sinks or transactional auth/invite emails;
- destructive deletion of campaign/audit evidence as a rollback mechanism;
- recurring/rrule campaigns in v1; v1 supports one scheduled occurrence per campaign, and recurrence requires a later occurrence-generation, edit/cancel, DST, and history contract;
- server-side GA4, Clarity, or Cloudflare analytics reads without credentials, quota/cost validation, and hosted proof;
- a paid Cloudflare add-on or new third-party admin product without explicit owner authorization;
- browser screenshots as proof of data correctness; visual proof is reserved for later interaction/layout/accessibility claims.

## Canonical Terms

| Term | Definition |
| --- | --- |
| Better Auth user | Canonical authentication identity in runtime-managed D1 `user` |
| Profile | Archestimator authorization/person projection in `profiles`; not canonical signup evidence |
| User 360 | Admin read model joining identity, lifecycle, access, activity, support, notifications, and interventions with provenance |
| Product activity | Durable normalized business/domain event attributable to a user |
| Last authenticated | Rate-limited evidence of a protected request by an authenticated identity |
| Last login | Successful authentication/session creation, retained independently of surviving sessions |
| Online | Ephemeral authenticated presence younger than a declared freshness window |
| Campaign | Admin-authored notification intent with lifecycle, audience, schedule, content version, and audit history |
| Definition | Immutable user-facing notification content and behavior materialized for publication |
| Audience rule | Versioned server-side eligibility expression |
| Audience snapshot | Frozen eligible/excluded recipient set or deterministic query revision used for one publish run |
| Materialized delivery | A row exists in `notification_deliveries`; not device/email delivery proof |
| Campaign run | One idempotent publish attempt over a frozen campaign version and audience |
| Retraction | Durable suppression/tombstone of a previously materialized campaign while preserving evidence |
| Replacement | New campaign that supersedes an incorrect prior campaign |
| Operator audit | Immutable redacted record of privileged reads and mutations |
| Domain activity | Product-owned event facts consumed through Activity contracts |
| Local proof | Source/test/D1-local/runtime-local evidence only |
| Hosted proof | Evidence from the bound deployed Worker/D1/Queue/DO/Email resources |

## Evidence Rules

- Every timestamp displayed in User 360 includes a semantic label and source.
- Every aggregate includes denominator, filters, as-of time, freshness, and error state.
- Missing data is `Unavailable`, `Not instrumented`, or `Never` only when that exact claim is proven.
- Cross-source activity retains source identity and redaction/retention class.
- Admin reads of sensitive detail are themselves auditable when the access is investigation-grade.
- Any source mismatch is visible; it must not be silently normalized away.

## Planning Scope Boundary

The current task may write only this plan pack. It may inspect source/tests/docs and run non-mutating validation. It must not fix the confirmed source defects, add migrations, change provider configuration, deploy, or mutate hosted resources.
