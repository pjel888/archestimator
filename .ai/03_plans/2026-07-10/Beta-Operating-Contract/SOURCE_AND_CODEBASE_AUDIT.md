# Source And Codebase Audit

## Source Ledger

| ID | Source | Status | Relevant claim |
| --- | --- | --- | --- |
| `SRC-001` | `.ai/02_audits/archestimator_beta_readiness_audit_2026-07-10.md:643-680,755-759,1000-1076,1141-1196` | Current planning input | Telemetry, operator truth, incident/support, auth-risk, and legal gates block external Beta. |
| `SRC-002` | `src/app/providers.tsx:44`; `src/components/landing/LandingAnalyticsLoader.tsx:8-25`; `tests/vitest/cloudflare-web-analytics-integration.test.ts` | Current source/test observation | Cloudflare Web Analytics is injected globally even though the landing loader is consent-gated; current test misses the global provider. |
| `SRC-003` | `src/app/admin/page.tsx:12-103`; `src/app/admin/analytics/page.tsx`; `src/app/admin/observability/page.tsx`; `src/lib/admin/*` | Current source observation | Overview metrics/chart/health/incident are stubs; other Admin repositories and local event readers are real. |
| `SRC-004` | `scripts/check-production-observability-proof.ts`; `scripts/check-alert-scenario-readiness.ts`; `scripts/check-support-monitoring-readiness.ts`; `scripts/record-operational-incident.ts`; `scripts/run-observability-proof-drill.ts` | Current source observation | Strong local schemas/drills exist, but production proof and named owner confirmations remain separate gates. |
| `SRC-005` | `src/lib/auth/better-auth-cloudflare.ts:188-260`; `scripts/prove-hosted-auth-synthetic-cookie-matrix.ts`; `scripts/check-auth-audit-completion-readiness.ts` | Current security observation | Magic-link/rate-limit/cookie-cache controls exist; raw D1 session-token risk and hosted revocation/access proof remain explicit. |
| `SRC-006` | `src/lib/legal/terms-content.ts:9`; `scripts/check-legal-owner-readiness.ts`; `.ai/99_scratch/2026-07-04-legal-owner-readiness.json` when present | Current legal observation | Terms are owner-approved pending counsel; latest known report has unresolved confirmations and cannot be inferred green from source copy. |

## Explicit Assumptions

- `ASSUMP-001`: existing structured event, admin, support, incident, and
  activation-cohort contracts can supply the required operating metrics after
  consent and schema reconciliation; unavailable inputs must remain visibly
  unavailable and never fall back to sample data.
- `ASSUMP-002`: named operator coverage and current hosted observability evidence
  can be obtained only through the explicit owner/provider boundary in
  `AUTH-001`; local scripts and webhook schemas do not imply that coverage.
- `ASSUMP-003`: owner approval may authorize a constrained free Beta separately
  from counsel approval for broader, public, or paid launch. Both decisions must
  record scope, version, date, expiry, and unresolved risk under `AUTH-002`.

## Current Reality

1. The application has extensive structured logging, incident, alert-scenario, observability, support-monitoring, and readiness scripts. Local schemas and catalog checks are not hosted alert delivery or operator coverage.
2. `AppProviders` renders Cloudflare Web Analytics across the application using a public token, bypassing the cookie-consent decision used by `LandingAnalyticsLoader`. This is a concrete privacy/measurement defect, not merely missing documentation.
3. Admin Observability truthfully labels its local D1 readers and does not claim hosted readiness. Admin Overview still displays `Stub` metrics, a hard-coded signup chart, and pending health/incident content. Beta operators must see real values or `Unavailable`.
4. Real repositories exist for support conversations, incidents, observability events, users/audit/flags/health primitives. The pack should compose those sources and the activation cohort contract, not add a second data system.
5. Better Auth controls include hashed short-lived magic links, D1 rate limiting, implicit-link blocking, and disabled cookie cache. The remaining risk is bearer-equivalent session tokens stored in D1 for up to seven days, their backup/restore exposure, and the absence of a proven operational revocation drill/access review.
6. Legal text states owner approval pending counsel. Limited-cohort Beta acceptance and broader/paid-launch counsel approval are different boundaries and must be represented separately.

## Official Better Auth Constraints

Accessed 2026-07-10. Better Auth lists 1.6.23 as the latest stable release in its [changelog](https://better-auth.com/changelog), matching the repository baseline. Its [session management](https://better-auth.com/docs/concepts/session-management) and [database schema](https://better-auth.com/docs/concepts/database) document a database `session.token` used by the session cookie, seven-day default expiry, rolling refresh, and revoke-current/other/all APIs. Its [cookie documentation](https://better-auth.com/docs/concepts/cookies) describes signed secure/httpOnly production cookies and JWE for cookie-cache data, but does not document hashing or encryption of the database session token. Vendor docs do not prove Archestimator storage, sign-out deletion, UI/API reachability, revocation latency, or D1 access controls; installed source and runtime tests must.

## Target Operating Contract

### Telemetry

Every metric has a stable name/version, purpose, producer, denominator, inclusion/exclusion rules, bot/test/anonymous classification, consent basis, source, environment, owner, retention/deletion, availability state, and validation query. Production enablement is an explicit flag/evidence item. Public share analytics never imply identity from device/country and never store raw IP/user-agent in product analytics.

### Operator truth

The Admin Beta view shows invited/accepted/active users, activation milestones, first estimate/valid total/export/publication/recipient view/engagement/decision, feedback, support, incidents, latest recovery, and latest release/smoke. A failed or unavailable source renders `Unavailable` with freshness/error metadata; it never falls back to a sample number.

### Incident/support

Severity, response/communication targets, primary/backup owner, intake channel, escalation, mitigation, rollback/fix-forward, customer message, incident evidence, and first-24/72-hour reviews are explicit. Webhook delivery is proof of transport, not proof a named human is covering the shift.

### Authentication risk

Document credential-material taxonomy, D1/backup visibility, session lifetime, rotation/revocation, restore behavior, operator access, compensating controls, residual likelihood/impact, acceptance expiry, and mitigation trigger. Prove current/other/all-session revocation plus post-restore invalidation and least-privilege D1 access.

### Legal gate

Limited free Beta requires owner-confirmed terms/privacy/cookie/contact/support/data handling and cohort constraints. Broader/public/paid launch remains blocked until qualified counsel approval is recorded with artifact version/date/scope.

## Baseline And Freshness

Before implementation fingerprint `src/app/providers.tsx`, landing analytics components/tests, `src/app/admin/**`, `src/lib/admin/**`, observability/incident/support/auth/legal scripts and tests, Better Auth config, migrations, and relevant readiness artifacts. Refresh on metric/event schema, analytics provider/token/consent, Admin source, auth version/config, session/recovery policy, legal copy/version, incident/support owner, alert producer, release, or hosted environment changes.

`EVID-001` is the collected source audit. `EVID-002` is planned verification/operating evidence and remains invalid until execution. Local tests, D1/local artifacts, hosted Cloudflare/GitHub evidence, and human legal/risk approvals are separate proof classes.
