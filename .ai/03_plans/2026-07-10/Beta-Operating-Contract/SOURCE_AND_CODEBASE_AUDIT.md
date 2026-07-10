# Source And Codebase Audit

## Source Ledger

| ID | Source | Status | Relevant claim |
| --- | --- | --- | --- |
| `SRC-001` | `.ai/02_audits/archestimator_beta_readiness_audit_2026-07-10.md:643-680,755-759,1000-1076,1141-1196` | Current planning input | Telemetry, operator truth, incident/support, auth-risk, and legal gates block external Beta. |
| `SRC-002` | `src/app/providers.tsx:44`; `src/components/landing/LandingAnalyticsLoader.tsx:8-25`; `tests/vitest/cloudflare-web-analytics-integration.test.ts` | Current source/test observation | Cloudflare Web Analytics is injected globally even though the landing loader is consent-gated; current test misses the global provider. |
| `SRC-003` | `src/app/admin/page.tsx:21-138`; `src/app/admin/analytics/page.tsx`; `src/app/admin/observability/page.tsx`; `src/app/admin/users/page.tsx`; `src/components/admin/AdminUsersTable.tsx`; `src/lib/admin/users-repository.ts`; `src/lib/admin/user-actions.ts`; `tests/vitest/admin-users-repository.test.ts`; `tests/vitest/admin-flag-actions.test.ts` | Current source/test observation | Overview now reads signups, open incidents, and binding health through real repositories/probes, but Active Teams remains unavailable, the chart supplies one 30-day aggregate under a five-day label, and no activation-cohort view exists. Users UI now reads and mutates `account_status` through admin-gated actions with an audit write, but the searched user query binds parameters out of SQL placeholder order, status updates do not prove an affected row, non-active status is not enforced by the ordinary session gate, and focused user/flag tests remain red, including the stale `previousEnabled` audit expectation. |
| `SRC-004` | `src/lib/admin/support-actions.ts:60-106,124-140`; `tests/vitest/admin-support-actions.test.ts`; `scripts/check-production-observability-proof.ts`; `scripts/check-alert-scenario-readiness.ts`; `scripts/check-support-monitoring-readiness.ts`; `scripts/record-operational-incident.ts`; `scripts/run-observability-proof-drill.ts` | Current source/test observation | Strong local schemas/drills exist, but production proof and named owner confirmations remain separate gates. Failed support-reply retry is not yet single-flight: no durable in-flight claim prevents concurrent sends, and a failed/null post-email status write can return success with the old `send_failed` row. |
| `SRC-005` | `src/lib/auth/better-auth-cloudflare.ts:188-260`; `scripts/prove-hosted-auth-synthetic-cookie-matrix.ts`; `scripts/check-auth-audit-completion-readiness.ts` | Current security observation | Magic-link/rate-limit/cookie-cache controls exist; raw D1 session-token risk and hosted revocation/access proof remain explicit. |
| `SRC-006` | `src/lib/legal/terms-content.ts:9`; `scripts/check-legal-owner-readiness.ts`; `.ai/99_scratch/2026-07-04-legal-owner-readiness.json` when present | Current legal observation | Terms are owner-approved pending counsel; latest known report has unresolved confirmations and cannot be inferred green from source copy. |
| `SRC-007` | `migrations/0052_corporate_accounts.sql`; `src/lib/admin/corporate-account-actions.ts`; `src/lib/admin/corporate-account-repository.ts`; `src/app/admin/accounts/page.tsx` | Concurrent source observation | Corporate accounts add an optional organization layer above workspaces and platform-admin-gated management actions. Corporate roles are data facts only in the observed source; they do not replace platform-admin authorization or grant cross-workspace product access. The surface is concurrent and incomplete until its exact settled files and tests are frozen. |

## Explicit Assumptions

- `ASSUMP-001`: existing structured event, admin, support, incident, and
  activation-cohort contracts can supply the required operating metrics after
  consent and schema reconciliation; unavailable inputs must remain visibly
  unavailable and never fall back to sample data.
- `ASSUMP-002`: named operator coverage and current hosted observability evidence
  can be obtained only through the explicit owner/provider boundary in
  `AUTH-001`; local scripts and webhook schemas do not imply that coverage.
- `ASSUMP-003`: owner approval may authorize a constrained free Beta separately
  from counsel approval for broader, public, or paid launch. Auth residual-risk
  acceptance records scope, date, expiry, and unresolved risk under `AUTH-002`;
  limited-cohort and counsel-scope decisions record their independent scope,
  version, date, expiry, and unresolved risk under `AUTH-003`.

## Current Reality

1. The application has extensive structured logging, incident, alert-scenario, observability, support-monitoring, and readiness scripts. Local schemas and catalog checks are not hosted alert delivery or operator coverage.
2. `AppProviders` renders Cloudflare Web Analytics across the application using a public token, bypassing the cookie-consent decision used by `LandingAnalyticsLoader`. This is a concrete privacy/measurement defect, not merely missing documentation.
3. Admin Observability truthfully labels its local D1 readers and does not claim hosted readiness. Admin Overview now renders repository-backed 30-day signups, open incidents, and live binding probes. It still renders Active Teams as unavailable, labels a single 30-day aggregate as a five-day trend, lacks activation-cohort stages, and does not yet prove complete partial/error/stale behavior. Beta operators must see real values or explicit `Unavailable`, never an approximation presented as a real time series.
4. Real repositories exist for support conversations, incidents, observability events, users/audit/flags/health primitives. The pack should compose those sources and the activation cohort contract, not add a second data system.
5. `listAdminUsers` places search placeholders before `LIMIT/OFFSET` and the session-expiry placeholder, but currently binds `limit`, `offset`, and `now` first. Its focused test also fails and does not independently prove the actual placeholder sequence. The feature-flag action now emits `previousEnabled`, while its focused test still expects only `enabled`. Both are current red characterization inputs for `UNIT-002`, not completed implementation evidence.
6. Migration 0051 plus `users-repository.ts`, `user-actions.ts`, the Users page, and `AdminUsersTable` now expose audited active/suspended/banned mutations. `setUserAccountStatus` returns success without checking whether D1 changed a row, and ordinary auth/session resolution carries but does not enforce `profiles.account_status` or revoke existing sessions. This is current partial Admin implementation and a `UNIT-002`/`UNIT-004` input, not account-disable proof.
7. Migration 0052 and the concurrent corporate-account repository/actions introduce organization membership and roles above the existing workspace model. The observed mutations remain behind `requireAdminContext`; no current contract makes `owner`, `team_leader`, `member`, or `viewer` a product-resource authorization predicate. `UNIT-002` must preserve that separation and prove those roles cannot open the platform-admin operator view or another workspace.
8. `sendSupportReply` now retries an existing `send_failed` row. The retry has no durable compare-and-set/in-flight reservation, so concurrent calls with the same `clientMessageId` can both send. After a successful email, a failed or null `markSupportMessageSendStatusInD1` result falls back to the old row yet returns success; a later retry can send again. The focused support-action test has no concurrent retry or post-send persistence-failure case. This is a current red input for `UNIT-003`/`TEST-004`, not idempotency proof.
9. Better Auth controls include hashed short-lived magic links, D1 rate limiting, implicit-link blocking, and disabled cookie cache. The remaining risk is bearer-equivalent session tokens stored in D1 for up to seven days, their backup/restore exposure, and the absence of a proven operational revocation drill/access review.
10. Legal text states owner approval pending counsel. Limited-cohort Beta acceptance and broader/paid-launch counsel approval are different boundaries and must be represented separately.

## Official Better Auth Constraints

Accessed 2026-07-10. Better Auth lists 1.6.23 as the latest stable release in its [changelog](https://better-auth.com/changelog), matching the repository baseline. Its [session management](https://better-auth.com/docs/concepts/session-management) and [database schema](https://better-auth.com/docs/concepts/database) document a database `session.token` used by the session cookie, seven-day default expiry, rolling refresh, and sign-out/current, specific-session, other-session, and all-session revocation operations. Its [cookie documentation](https://better-auth.com/docs/concepts/cookies) describes signed secure/httpOnly production cookies and JWE for cookie-cache data, but does not document hashing or encryption of the database session token. Installed Better Auth source at `node_modules/better-auth/dist/api/routes/sign-out.mjs:20-27` and `node_modules/better-auth/dist/api/routes/session.mjs:399-503` is the executable baseline for deletion behavior. Vendor docs or an HTTP success/cleared cookie do not prove Archestimator row deletion, failure propagation, replay denial, UI/API reachability, revocation latency, or D1 access controls; installed source plus runtime tests must.

## Target Contract Index

Source facts remain here; target design is split only where independent review
value justifies another artifact:

- `BETA_METRICS_TELEMETRY_AND_CONSENT_CONTRACT.md`: telemetry registry,
  consent/route/identity matrix, lifecycle, cardinality, and evidence ownership.
- `OPERATOR_VIEW_UX_AND_ACCESSIBILITY.md`: operator journey, truthful data states,
  authorization, accessibility, and query/degraded behavior.
- `INCIDENT_SUPPORT_AND_ESCALATION_MODEL.md`: proposed severity,
  acknowledgment, failover, communication, support, review, rollback, and
  owner-confirmation semantics.
- `AUTH_SESSION_THREAT_AND_RESIDUAL_RISK_MODEL.md`: session credential taxonomy,
  revocation/replay/failure proof, Recovery receipt consumption, and human risk
  boundary.
- `LEGAL_COHORT_AND_AUTHORIZATION_BOUNDARIES.md`: limited free cohort versus
  broader/public/paid counsel scope and denial fixtures.
- `TEST_AND_ADVERSARIAL_QA.md` and `ROLLOUT_ROLLBACK_AND_OPERATIONS.md`: proof,
  rollout, rollback, cleanup, receipts, and cross-pack handback.

## Baseline And Freshness

Re-audited at current HEAD
`e373bc865b978e237deb1d92011c96b0a3639fb4` against the live dirty worktree.
Concurrent changes centralize Admin API gates and same-origin/no-store helpers,
add display-only landing auth-hint behavior/tests, replace part of the Admin
Overview with repository-backed signup/incident/health reads, and add
`migrations/0050_admin_query_indexes.sql` plus
`migrations/0051_profiles_account_status.sql`, and concurrently introduce
`migrations/0052_corporate_accounts.sql` plus corporate-account Admin source.
The admin changes preserve the
platform-admin gate and remove several literal stubs, but they do not supply an
activation-cohort view, a real time series, a complete metric registry, or full
partial/error/stale semantics. The landing changes do not alter `AppProviders` or
`LandingAnalyticsLoader`, so the global analytics/consent contradiction remains.
Migration 0050 improves admin query indexes, while migration 0051 adds the
admin-facing account-status schema and index. Migration 0052 adds optional
corporate membership/workspace grouping, but does not itself grant product
authorization or operating-proof semantics. None of these migrations defines beta
operating metrics, closes consent/support/incident requirements, or supplies
hosted proof. These are observed planning inputs, not implementation evidence
for this pack; the frozen scoped baseline binds the exact relevant dirty state
using `PLAN-PACK-SCOPED-BASELINE-v1`.

The later support-action retry delta adds recoverability intent but does not
close support-delivery idempotency. It lacks an atomic retry claim, durable
attempt state, and a fail-closed outcome when sent-state persistence fails.
`TEST-004` must characterize those cases before implementation changes.

Before implementation fingerprint landing analytics/auth-hint surfaces, Admin
pages/routes/components/repositories, support/observability repositories and
routers, auth/authz/legal surfaces, scripts/tests, configuration, and migrations.
Refresh on
metric/event schema, analytics provider/token/consent, Admin source, auth
version/config, session/recovery policy, legal copy/version, incident/support
owner, retry/reservation/delivery-state behavior, alert producer, release, or
hosted environment changes.

Ordered literal pathspecs for `PLAN-PACK-SCOPED-BASELINE-v1`:

1. `src/app/providers.tsx`
2. `src/components/landing`
3. `src/components/landing-v3`
4. `src/app/api/landing`
5. `src/lib/landing`
6. `src/app/admin`
7. `src/app/api/admin`
8. `src/components/admin`
9. `src/components/support`
10. `src/lib/admin`
11. `src/lib/repositories/support-conversations-repository.ts`
12. `src/lib/observability`
13. `src/lib/cloudflare/observability-proof-router.ts`
14. `src/lib/cloudflare/support-inbox.ts`
15. `src/lib/cloudflare/support-inbox-router.ts`
16. `src/lib/auth`
17. `src/lib/authz`
18. `src/lib/legal`
19. `src/app/terms/page.tsx`
20. `src/app/privacy/page.tsx`
21. `src/app/contact/page.tsx`
22. `scripts`
23. `tests/vitest`
24. `migrations`
25. `package.json`
26. `bun.lock`
27. `wrangler.jsonc`
28. `next.config.ts`

Future-only `src/lib/onboarding` files are named exactly in the implementation
plan but are not source-baseline pathspecs until they exist. Their creation is
captured by the implementation diff and the next manifest freeze.

`EVID-001` is the collected source audit. `EVID-002` is planned verification/operating evidence and remains invalid until execution. Local tests, D1/local artifacts, hosted Cloudflare/GitHub evidence, and human legal/risk approvals are separate proof classes.
