# Implementation Plan

## Coordination And Ownership

The lead `executor` integrates. Use `test-engineer` for consent/Admin/auth/ops fixtures, `researcher` for Better Auth/provider/legal reference constraints, and a distinct `verifier` for final local and hosted evidence. Legal and risk acceptance cannot be self-verified by the maker.

| Scope | Owner/lease |
| --- | --- |
| `src/app/providers.tsx`, landing analytics loader/tests, telemetry registry | Telemetry lane; singleton through `UNIT-001`. |
| Admin overview/analytics/observability aggregation and tests | Operator-truth lane; consumes activation interfaces. |
| Incident/support/observability scripts and evidence | Ops lane; serialize shared release-gate changes with release integrator. |
| Better Auth/session/access/recovery proof | Auth lane; serialize auth files with recovery lane. |
| Legal readiness schema/artifact | Legal evidence lane; no product-copy expansion without separate review. |

## DAG And Ready Slice

```text
UNIT-001 Consent and telemetry registry -> UNIT-002 Operator truth
UNIT-003 Incident/support/rollback contract
UNIT-004 Auth residual-risk and revocation contract
UNIT-005 Legal limited-cohort/broader-launch gates
UNIT-001 + UNIT-002 + UNIT-003 + UNIT-004 + UNIT-005 -> UNIT-006 Operating artifact/release adapter
UNIT-006 + AUTH-001 + AUTH-002 -> UNIT-007 Hosted/human proof and Beta decision
```

`SLICE-001 = UNIT-001..UNIT-006`; Unit 007 is blocked.

### `UNIT-001` — Fix consent and define telemetry

**Paths:** `src/app/providers.tsx`, `src/components/landing/LandingAnalyticsLoader.tsx`, `CloudflareWebAnalytics.tsx`, cookie-consent modules, telemetry/event modules, `tests/vitest/cloudflare-web-analytics-integration.test.ts`, focused DOM tests.

**Steps:** add a regression proving no global injection; remove provider analytics from `AppProviders`; enumerate approved route/consent behavior; create typed/versioned metric registry and environment flag; implement bot/test/anonymous rules and retention/deletion declarations; consume existing event producers rather than duplicating storage.

**Verification:** source/DOM tests and targeted provider-script/network assertions. Expected: no analytics component/network before consent or on forbidden surfaces; metric schema rejects undefined classifications.

### `UNIT-002` — Build truthful Beta operator view

**Paths:** `src/app/admin/page.tsx`, Admin analytics/observability routes, `src/lib/admin/*`, activation cohort query interface, focused component/repository tests.

**Steps:** replace static metric/chart arrays with a server-side aggregation DTO; join invited/accepted/active/cohort milestones, feedback/support/incidents/recovery/release; return value/source/as-of/error/availability for each metric; render `Unavailable` for missing/error/stale provider facts; preserve authorization and pagination; avoid leaking person-level analytics where aggregates suffice.

**Verification:** repository and DOM fixtures for real, zero, partial, stale, denied, and failed sources. Expected: no `Stub` or hard-coded operational value remains and unavailable does not become zero.

### `UNIT-003` — Close incident, rollback, and support contract

**Paths:** current incident/support/observability scripts, D1 incident/support repositories, runbooks, matching Vitest suites.

**Steps:** version severity/response/communication targets; name primary/backup roles via evidence inputs; connect support intake and incident state; define rollback versus fix-forward per failure class; implement first-24/72-hour reviews; make local catalog and artifact consumers fail closed without pretending delivery/coverage.

**Verification:** S-01..S-07 catalog/producer fixtures, incident dry-run, support-monitoring fixtures, rollback tabletop. Hosted delivery/acknowledgment remains Unit 007.

### `UNIT-004` — Resolve auth residual risk

**Paths:** Better Auth config/session actions, auth audit/readiness scripts, D1 access matrix, recovery session adapter, focused auth/security tests.

**Steps:** document raw/hash/encrypted/derived/public taxonomy; verify actual installed token storage and cookie-cache state; expose/admin-protect revoke-current/other/all as required; test deletion/denial and bounded lifetime; record D1/backup operator access; integrate post-restore invalidation; produce time-boxed acceptance or mitigation artifact.

**Verification:** installed-package/source assertions, D1 readback using redacted hashes, revoke matrix, foreign/expired/rotated tokens, access matrix, restore canary. Expected: no raw token in logs/evidence and acceptance cannot be implicit.

### `UNIT-005` — Encode legal Beta gates

**Paths:** `src/lib/legal/terms-content.ts`, legal owner readiness producer/tests, current terms/privacy/cookie/contact surfaces and versions, canonical runbook/decision artifact.

**Steps:** inventory exact document versions and acceptance records; define limited free cohort scope/duration/support/data constraints; collect owner-confirmation fields; keep pending-counsel banner truthful; create a separate broader/public/paid counsel gate that release truth cannot bypass.

**Verification:** missing/expired/version-mismatch/wrong-scope fixtures and UI/source consistency tests. Expected: limited cohort can be separately evaluated while broader/paid remains boundary without counsel evidence.

### `UNIT-006` — Compose operating evidence

**Paths:** new versioned operating artifact producer or extension of current support/observability readiness, matching tests, release-manifest adapter.

**Steps:** join metric/consent/Admin/incident/support/auth/legal statuses with producer versions, release ID, SHA, environment, evidence age, owners, blockers, next actions; distinguish local/hosted/human proof; reject contradictions and absent fields; expose one JSON and Markdown summary.

**Verification:** exhaustive fixture matrix and strict release adapter. Expected: current repository stays not ready until Unit 007 evidence and approvals exist.

### `UNIT-007` — Run hosted drills and record human approvals

**Status:** blocked by `AUTH-001` and `AUTH-002`.

**Steps after authorization:** enable only approved production telemetry; prove consent/provider routing without storing raw traffic; run alert/support/incident/rollback scenarios and acknowledgment; record primary/backup coverage; perform auth revocation/access/restore drill; record limited-cohort owner acceptance and counsel scope/status; regenerate operating and release artifacts; roll back proof flags/test data/credentials.

**Verification:** `bun run ops:check-observability`, `bun run launch:check-support-monitoring`, strict agent snapshot/release gate, auth/legal focused commands, hosted artifacts and human decision records. Expected: every gate is current green or explicit boundary; no inferred readiness.

## Cleanup And Resume

Use temp `ARCHESTIMATOR_DEV_LOG_PATH` for logger tests. Remove synthetic events/users/incidents/support rows by run ID, disable proof flags, revoke test sessions/credentials, and never store raw webhook/token values. Resume at `UNIT-001` with the global-analytics regression; serialize any shared release/auth file with its named integrator.
