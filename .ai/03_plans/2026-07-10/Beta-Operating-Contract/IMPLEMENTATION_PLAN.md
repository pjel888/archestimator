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

## Domain Contract Inputs

The units below remain the only executable plan. Before each unit, revalidate the
matching support contract rather than rediscovering or copying it:

- `UNIT-001`: `BETA_METRICS_TELEMETRY_AND_CONSENT_CONTRACT.md`.
- `UNIT-002`: `OPERATOR_VIEW_UX_AND_ACCESSIBILITY.md` plus the metric contract.
- `UNIT-003`: `INCIDENT_SUPPORT_AND_ESCALATION_MODEL.md`.
- `UNIT-004`, `UNIT-007`, `UNIT-008`: `AUTH_SESSION_THREAT_AND_RESIDUAL_RISK_MODEL.md`.
- `UNIT-005`: `LEGAL_COHORT_AND_AUTHORIZATION_BOUNDARIES.md`.
- `UNIT-009`: `LEGAL_COHORT_AND_AUTHORIZATION_BOUNDARIES.md` plus
  `INCIDENT_SUPPORT_AND_ESCALATION_MODEL.md`.
- Every unit: `TEST_AND_ADVERSARIAL_QA.md`; Units 003 and 006 through 009 also use `ROLLOUT_ROLLBACK_AND_OPERATIONS.md`.

## DAG And Ready Slice

```text
UNIT-001 Consent and telemetry registry -> UNIT-002 Operator truth
UNIT-003 Incident/support/rollback contract
UNIT-004 Auth residual-risk and revocation contract
UNIT-005 Legal limited-cohort/broader-launch gates
UNIT-001 + UNIT-002 + UNIT-003 + UNIT-004 + UNIT-005 -> UNIT-006 Operating artifact/release adapter
UNIT-006 + UNIT-009 + current D1-RECOVERY-RECEIPT-v1 + AUTH-001 -> UNIT-007 Hosted proof
UNIT-004 + UNIT-007 + AUTH-002 -> UNIT-008 Auth residual-risk decision
UNIT-003 + UNIT-005 + AUTH-003 -> UNIT-009 Incident-policy/cohort/legal decision
```

`SLICE-001 = UNIT-001..UNIT-006`; Units 007, 008, and 009 are blocked by their
respective authorization boundaries. Unit 009 is independent of hosted proof.

### `UNIT-001` — Fix consent and define telemetry

**Paths:** `src/app/providers.tsx`,
`src/components/landing/LandingAnalyticsLoader.tsx`,
`src/components/landing/CloudflareWebAnalytics.tsx`,
`src/components/landing/CookieConsentBanner.tsx`,
`src/lib/landing/consent.ts`,
`src/lib/landing/useLandingCookieConsent.ts`, new
`src/lib/landing/beta-telemetry-registry.ts`,
`tests/vitest/cloudflare-web-analytics-integration.test.ts`,
`tests/vitest/landing-consent.test.tsx`, and new
`tests/vitest/beta-telemetry-registry.test.ts`.

**Steps:** add a regression proving no global injection; remove provider analytics
from `AppProviders`; enumerate approved route/consent/withdrawal behavior; create
the typed/versioned metric registry and environment flag; implement bot/test/
anonymous rules and executable retention/deletion adapters for Operating-owned
event classes; consume existing event producers rather than duplicating storage.
Bind activation metrics to `ACTIVATION-PRODUCER-CONTRACT-v1` and its Activation-
owned lifecycle; provider analytics stops immediately on withdrawal and is
declared non-deletable only when the provider exposes no deletion API.

**Verification:** source/DOM tests and targeted provider-script/network assertions. Expected: no analytics component/network before consent or on forbidden surfaces; metric schema rejects undefined classifications.

### `UNIT-002` — Build truthful Beta operator view

**Paths:** `src/app/admin/page.tsx`, `src/app/admin/analytics/page.tsx`,
`src/app/admin/observability/page.tsx`, `src/app/admin/users/page.tsx`,
`src/components/admin/AdminUsersTable.tsx`,
`src/lib/admin/users-repository.ts`,
`src/lib/admin/incidents-repository.ts`,
`src/lib/admin/observability-repository.ts`,
`src/lib/repositories/support-conversations-repository.ts`, new
`src/lib/admin/beta-operating-overview.ts`, the versioned read-only Activation
interface in `src/lib/onboarding/activation-repository.ts`,
read-only Corporate Accounts characterization inputs in
`src/lib/admin/corporate-account-{actions,repository}.ts` and
`src/app/admin/accounts/**`, and new
`tests/vitest/beta-operating-corporate-role-boundary.test.ts`,
`tests/vitest/admin-users-repository.test.ts`,
`tests/vitest/admin-flag-actions.test.ts`,
`tests/vitest/admin-observability.test.ts`, and new
`tests/vitest/beta-operating-overview.test.ts`.

**Steps:** begin with red characterization that corrects searched
`listAdminUsers` binding to SQL placeholder order and verifies searched and
unsearched pagination/session aggregation; reconcile the flag-audit fixture with
the versioned `previousEnabled` field; replace static metric/chart arrays with a server-side aggregation DTO;
join invited/accepted/active/cohort milestones, feedback/support/incidents/
recovery/release; validate the frozen Activation query fixtures; emit
`ACT-RECEIPT-COHORT-CONSUMER-v1` with manifest/contract/query/test hashes,
retention basis, and unavailable behavior for program `UNIT-003`; return
value/source/as-of/error/availability for each metric; render `Unavailable` for
missing/error/stale provider facts; preserve authorization and pagination; avoid
leaking person-level analytics where aggregates suffice. Characterize corporate
roles as insufficient for platform-admin or foreign-workspace operator access;
do not edit Corporate Accounts CRUD or `/admin/accounts` in this unit.

**Verification:** repository and DOM fixtures for searched/unsearched binding
order, pagination and session aggregation, flag-audit before/after shape,
corporate-only-role and cross-workspace denials, real,
zero, partial, stale, denied, and failed sources. Expected: placeholder order is
asserted independently of the mock implementation, no `Stub` or hard-coded
operational value remains, and unavailable does not become zero.

### `UNIT-003` — Close incident, rollback, and support contract

**Paths:** `src/lib/admin/support-actions.ts`,
`src/lib/repositories/support-conversations-repository.ts`,
`src/lib/observability/alert-scenarios.ts`,
`src/lib/observability/incident-record.ts`,
`scripts/check-alert-scenario-readiness.ts`,
`scripts/check-support-monitoring-readiness.ts`,
`scripts/record-operational-incident.ts`,
`scripts/run-observability-proof-drill.ts`,
`.ai/01_roadmap/09-support-incident-rollback-runbooks.md`,
`tests/vitest/admin-support-actions.test.ts`,
`tests/vitest/alert-scenario-readiness-script.test.ts`,
`tests/vitest/support-monitoring-readiness-script.test.ts`, and
`tests/vitest/operational-incident-record-script.test.ts`.

**Steps:** encode the frozen proposed policy fixture/default from
`REQUIREMENTS_AND_DECISIONS.md`; the exact values bind only after `AUTH-003`
owner confirmation: sev1
15-minute acknowledgment, five-minute backup escalation, 60-minute containment,
30-minute initial/update communication and resolution notice within 60 minutes
of resolution; sev2 30-minute acknowledgment, 15-minute
backup escalation, four-hour containment, two-hour initial/update communication,
and resolution notice by the next business day; sev3 one-business-day
acknowledgment and three-business-day plan, with communication only for direct
user impact. Set ops webhook
plus support inbox as primary and Cloudflare Email to the named backup as
failover; enforce four-business-hour in-coverage and one-business-day
out-of-coverage support acknowledgment; version
redacted initial/update/resolution templates; connect support intake and incident
state; define rollback versus fix-forward per failure class; implement mandatory
24-hour sev1/external-sev2 and 72-hour open-incident/support-trend reviews. Make
local catalog/artifact consumers fail closed without pretending delivery or
human coverage. Characterize the current `send_failed` retry path first, then
reserve one durable retry attempt atomically per conversation/`clientMessageId`.
Persist attempt and provider/message identity, reject concurrent losers, and
surface an explicit uncertain/failure result when the post-email sent-state
write fails or returns null. Reconciliation must resolve that state before any
automatic resend; the stale `send_failed` row must never be returned as success.

**Verification:** S-01..S-07 catalog/producer fixtures, incident dry-run,
support-monitoring fixtures, concurrent same-key retry, post-send persistence
failure/reconciliation, and rollback tabletop. Assert one outbound email and no
success from stale state. Hosted delivery/acknowledgment remains Unit 007.

### `UNIT-004` — Resolve auth residual risk

**Paths:** `src/lib/auth/better-auth-cloudflare.ts`,
`src/lib/auth/session.ts`, `src/lib/auth/profile-d1-store.ts`,
`src/lib/auth/actions.ts:signOut`, new
`src/lib/auth/session-actions.ts` for specific/other/all-session revocation,
`src/lib/authz/d1-access.ts`,
`scripts/check-auth-audit-completion-readiness.ts`,
`scripts/check-cloudflare-d1-auth-realtime-readiness.ts`,
`scripts/generate-cloudflare-d1-authz-access-matrix.ts`,
`tests/vitest/auth-set-cookie-forwarding.test.ts`,
`tests/vitest/auth-session-closed-beta.test.ts`,
`tests/vitest/auth-audit-completion-readiness-script.test.ts`, and new
`tests/vitest/auth-session-revocation-actions.test.ts`.

**Steps:** document raw/hash/encrypted/derived/public taxonomy; verify actual
installed token storage and cookie-cache state; expose/admin-protect sign-out/
current, specific-session, other-session, and all-session operations as required;
extend existing server-component account-status enforcement (`session.ts:80-86`
already redirects banned/suspended for the current request) to the edge path and
make suspend/ban prove the target row changed plus revoke that user's active
sessions atomically or return failure;
test each operation independently with multiple sessions, assert the exact targeted
session rows are absent, and replay every deleted token against the protected
session path. Inject D1 deletion failure for every operation and require a
propagated failure with rows still present; an HTTP success or cleared cookie alone
never passes. Test bounded lifetime; record D1/backup operator access; implement a
strict consumer for current matching
`D1-RECOVERY-RECEIPT-v1` from Recovery `UNIT-006`, including session invalidation,
canaries, revisions, cleanup, and freshness; prepare but do not self-sign the
time-boxed acceptance or mitigation artifact. Do not export, import, restore, or
create recovery resources in this unit.

**Verification:** installed-package/source assertions, D1 readback using redacted
hashes, separate sign-out/current/specific/other/all revoke matrices, targeted-row
absence, deleted-token replay denial, injected deletion failure with preserved rows,
foreign/expired/rotated tokens, access matrix, and recovery
receipt fixtures for missing/stale/wrong source/target/SHA/session/cleanup. Expected:
no raw token in logs/evidence, no restore execution path in this pack, and human
acceptance remains separate.

### `UNIT-005` — Encode legal Beta gates

**Paths:** `src/lib/legal/terms-content.ts`,
`src/lib/legal/terms-acceptance-record.ts`, `src/app/terms/page.tsx`,
`src/app/privacy/page.tsx`, `src/app/contact/page.tsx`,
`scripts/check-legal-owner-readiness.ts`,
`tests/vitest/legal-owner-readiness-script.test.ts`,
`tests/vitest/legal-terms-content.test.ts`, and
`LEGAL_COHORT_AND_AUTHORIZATION_BOUNDARIES.md`.

**Steps:** inventory exact document versions and acceptance records; define limited free cohort scope/duration/support/data constraints; collect owner-confirmation fields; keep pending-counsel banner truthful; create a separate broader/public/paid counsel gate that release truth cannot bypass.

**Verification:** missing/expired/version-mismatch/wrong-scope fixtures and UI/source consistency tests. Expected: limited cohort can be separately evaluated while broader/paid remains boundary without counsel evidence.

### `UNIT-006` — Compose operating evidence

**Paths:** new `scripts/check-beta-operating-readiness.ts`, new
`tests/vitest/beta-operating-readiness-script.test.ts`, generated
`.ai/99_scratch/beta-operating-readiness-current.json` and `.md`, and the strict
consumer in `scripts/check-cloudflare-release-gates.ts` plus
`tests/vitest/cloudflare-release-gates-script.test.ts`.

**Steps:** join metric/consent/Admin/incident/support/auth/legal statuses with
producer versions, release ID, SHA, environment, evidence age, owners, blockers,
next actions, `ACT-RECEIPT-COHORT-CONSUMER-v1`, and
`D1-RECOVERY-RECEIPT-v1`; distinguish local criteria `AC-001..007` from hosted
`AC-008`, human auth `AC-009`, and human legal `AC-010`; reject contradictions
and absent fields; expose one local JSON and Markdown summary. Emit the REQUIRED
`BETA-P1-10-MAINTAINABILITY-RECEIPT-v1` containing the pre-change caller map,
pre-change characterization results, extraction-versus-retention decision and
rationale, exact changed files, named regression owner, exact regression tests,
and distinct-verifier result. The receipt is incomplete if any field is absent.

**Verification:** exhaustive fixture matrix, strict release adapter, and schema/
content validation for every required maintainability-receipt field. Expected:
the current repository stays not ready until the distinct Unit 007, 008, and 009
receipts exist and the release pack composes them.

### `UNIT-007` — Run hosted drills

**Status:** blocked by `AUTH-001`.

**Dependencies:** `UNIT-004`, `UNIT-006`, and `UNIT-009`.

**Precondition:** validate a current `D1-RECOVERY-RECEIPT-v1` from Recovery
`UNIT-006` against the exact app SHA/environment and the Unit 009 decision receipt
against the exact owner-confirmed incident-policy digest and support
primary/backup/window. A missing/stale/mismatched receipt keeps auth/release red;
this unit never reruns restore.

**Steps after authorization:** enable only approved production telemetry; prove
consent/provider routing without storing raw traffic; run alert/support/incident/
rollback scenarios against the frozen sev1/sev2/sev3 policy and capture delivery
plus primary/backup acknowledgment; run revoke/access only against the packet's
synthetic account/session, never a real user; emit
`OPERATING-HOSTED-PROOF-RECEIPT-v1` bound to the local operating artifact,
recovery receipt, exact app SHA/environment, hosted evidence identities,
freshness, cleanup, and remaining boundaries; roll back proof flags/test data/
synthetic sessions/credentials. Do not record auth-risk or legal decisions and do
not mutate the local operating artifact.

**Verification:** `bun run ops:check-observability`, `bun run launch:check-support-monitoring`, strict agent snapshot/release gate, synthetic-auth commands, recovery-receipt consumer, hosted artifacts, receipt schema/freshness, and cleanup readback. Expected: `AC-008` is current green or an explicit boundary; `AC-009/010` remain boundaries, and no restore or inferred readiness occurs.

### `UNIT-008` — Record the auth residual-risk decision

**Status:** blocked by `AUTH-002`.

**Dependencies:** `UNIT-004` and `UNIT-007`.

**Precondition:** validate the exact local auth evidence, current matching
`D1-RECOVERY-RECEIPT-v1`, and current matching
`OPERATING-HOSTED-PROOF-RECEIPT-v1`. Missing, stale, mismatched, or failed-cleanup
evidence keeps `AC-009` at `BOUNDARY`; this unit runs no provider, session, or
recovery action.

**Steps after authorization:** record mitigation status, residual likelihood and
impact, time-bounded acceptance or rejection, expiry, review triggers, approver
identity, decision scope, evidence identities, blockers, and next action in
`AUTH-RISK-DECISION-RECEIPT-v1`. Do not make or infer any cohort or legal decision.

**Verification:** decision-schema fixtures reject missing approver/scope/expiry/
trigger/evidence fields, stale or mismatched hosted/recovery receipts, and any
self-referential claim that the auth decision satisfied its own prerequisite.
Expected: `AC-009` is current green or remains an explicit boundary. This unit
is the sole producer of `AUTH-RISK-DECISION-RECEIPT-v1`; the Release consumer
composes its aggregate decision from that immutable receipt and never recreates
the auth-risk decision.

### `UNIT-009` — Record the limited-cohort and legal-scope decision

**Status:** blocked by `AUTH-003`.

**Dependency:** `UNIT-003` and `UNIT-005`. This unit is independent of `UNIT-007`
hosted proof and `UNIT-008` auth-risk acceptance.

**Precondition:** validate the exact local incident-policy confirmation and legal
gate schemas; the proposed or replacement incident-policy digest; and current
terms, privacy, cookie, contact, cohort-constraint, support-owner/window, and
acceptance-record versions.

**Steps after authorization:** record the named free limited-cohort owner
decision; identity/size/duration/data constraints; exact current incident-policy
version/digest; support coverage window, primary, and backup roles; decision
date/expiry; and distinct qualified-counsel scope/status for broader/public/paid
launch in `LIMITED-COHORT-LEGAL-DECISION-RECEIPT-v1`. Owner approval must not
satisfy or imply counsel approval. The receipt is the sole durable producer of
the owner-confirmed policy digest consumed by `UNIT-007`; it performs no hosted
action.

**Verification:** schema and source-version fixtures reject missing/expired/
wrong-scope decisions, missing or mismatched policy digest/support roles/window,
and any attempt to use limited-cohort approval as broader/public/paid counsel
proof. Expected: `AC-010` is current green or remains an explicit boundary;
`UNIT-007` can consume only the exact current policy digest. This unit is the
sole producer of `LIMITED-COHORT-LEGAL-DECISION-RECEIPT-v1`; the Release consumer
composes its aggregate decision from that immutable receipt and never recreates
the cohort/legal decision.

## Cleanup And Resume

Use temp `ARCHESTIMATOR_DEV_LOG_PATH` for logger tests. Remove synthetic events/
users/incidents/support rows by run ID, disable proof flags, revoke test sessions/
credentials, and never store raw webhook/token values. Recovery cleanup is proved
only by the consumed receipt, not repeated here. External units emit immutable,
distinct receipts; they do not share a combined mutation surface. Resume at
`UNIT-001` with the global-analytics regression; serialize any shared release/
auth file with its named integrator.
