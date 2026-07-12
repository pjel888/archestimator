# Requirements And Decisions

## Requirements

| ID | Audit mapping | Requirement | Acceptance boundary |
| --- | --- | --- | --- |
| `REQ-001` | `BETA-P0-06` | Versioned telemetry defines purpose, producer, denominator, classification, consent, environment, retention/deletion, owner, availability, and validation for every Beta metric. | Undefined, test, bot, anonymous, or unavailable data cannot silently enter operator/product metrics. |
| `REQ-002` | `BETA-P0-06` | Analytics loads only on permitted routes after applicable consent and production enablement; public/share privacy behavior is explicit. | Global no-consent injection regression passes; provider events are absent before consent and carry no forbidden raw fields. |
| `REQ-003` | `BETA-P1-07` | Admin presents only repository/provider-backed current values or explicit `Unavailable`, including cohort milestones from the activation pack. | Stub/sample values and hard-coded charts cannot render as operational truth. |
| `REQ-004` | `BETA-P0-07` | Beta incident, rollback, support, escalation, communication, and first-24/72-hour review implement an exact owner-confirmed sev1/sev2/sev3 policy version and have named primary/backup owners. | Proposed defaults and local policy/scenario/tabletop proof remain separate from owner confirmation, hosted delivery, acknowledgment, and human coverage proof. |
| `REQ-005` | `BETA-P0-08` | Raw D1 session-token risk is explicitly accepted with expiry/triggers or mitigated; sign-out/current, specific-session, other-session, and all-session revocation, D1 access, and consumed `D1-RECOVERY-RECEIPT-v1` treatment are proven without rerunning restore. | Each revocation operation proves targeted session-row absence and replay denial; injected D1 deletion failure propagates and cannot pass through HTTP success or cookie clearing. Local proof, hosted synthetic canary, recovery receipt, and human residual-risk decision remain distinct evidence. |
| `REQ-006` | `BETA-P0-09` | Limited-cohort owner approval and broader/paid-launch counsel approval are distinct, versioned, non-bypassable gates. | Beta cohort constraints are explicit; broader/paid release remains boundary until qualified counsel evidence. |
| `REQ-007` | `BETA-P0-06/07/08/09` | A versioned local operating artifact plus distinct hosted-proof, auth-risk-decision, and legal/cohort-decision receipts expose gate status, evidence identity/freshness, owner, blocker, and next action to release truth. | Release composes the four receipts; missing/stale/unknown evidence fails closed, and no external unit mutates a hidden combined record or substitutes README/plan claims. |

## Criteria

| ID | Requirement | Current | Planned proof |
| --- | --- | --- | --- |
| `AC-001` | `REQ-001` | `FAIL` | `TEST-001` validates metric registry and cohort/funnel queries against bot/test/anonymous/empty/stale fixtures. |
| `AC-002` | `REQ-002` | `FAIL` | `TEST-002` proves analytics absent before consent and from forbidden routes, then present only after allowed consent/flag. |
| `AC-003` | `REQ-003` | `FAIL` | `TEST-003` verifies real, empty, error, stale, partial, and unavailable Admin source states with no sample fallback, while corporate-only roles remain denied from platform-admin and cross-workspace operator data. |
| `AC-004` | `REQ-004` | `FAIL` | `TEST-004` proves the proposed severity/SLA/escalation/channel/template/failover policy, owner-confirmation schema, local scenarios, single-flight support-reply retry/idempotency with fail-closed post-send persistence, rollback tabletop, and first-24/72 review machinery without treating the proposal as approved. |
| `AC-005` | `REQ-005` | `FAIL` | `TEST-005` separately proves sign-out/current, specific-session, other-session, and all-session row deletion plus replay denial, D1 deletion-failure propagation, D1 access, and strict consumption of current matching `D1-RECOVERY-RECEIPT-v1`. |
| `AC-006` | `REQ-006` | `FAIL` | `TEST-006` validates non-bypassable limited-cohort and broader/paid legal gate schemas against missing/expired/version/scope fixtures. |
| `AC-007` | `REQ-007` | `FAIL` | `TEST-007` rejects missing/stale/malformed/mismatched operating artifacts and feeds exact release ID. |
| `AC-008` | `REQ-002/004/005` | `BOUNDARY` | `TEST-008` records authorized production consent/provider, alert/support/incident acknowledgment, named coverage, and synthetic auth-canary proof under `AUTH-001`; it performs no restore. |
| `AC-009` | `REQ-005` | `BOUNDARY` | `TEST-009` records the time-bounded human residual-risk acceptance or mitigation decision under `AUTH-002`. |
| `AC-010` | `REQ-004/006` | `BOUNDARY` | `TEST-010` records the exact owner-confirmed incident-policy digest, support primary/backup/window, limited-cohort approval, and distinct broader/public/paid counsel status under `AUTH-003`, independently of hosted proof. |

## Domain Contract Index

The requirements above remain the stable authoritative records. Their detailed,
independently reviewable target contracts are intentionally split by risk:

| Domain | Detailed contract | Stable records retained here |
| --- | --- | --- |
| Metrics/consent/data lifecycle | `BETA_METRICS_TELEMETRY_AND_CONSENT_CONTRACT.md` | `REQ-001/002`, `AC-001/002`, `DEC-AUTO-001/003/004`, `RISK-001` |
| Operator UX/truth | `OPERATOR_VIEW_UX_AND_ACCESSIBILITY.md` | `REQ-003`, `AC-003`, `DEC-AUTO-002`, `RISK-002` |
| Incident/support/escalation | `INCIDENT_SUPPORT_AND_ESCALATION_MODEL.md` | `REQ-004`, `AC-004/008`, `DEC-AUTO-007/008`, `RISK-003`, `AUTH-001` |
| Session/auth residual risk | `AUTH_SESSION_THREAT_AND_RESIDUAL_RISK_MODEL.md` | `REQ-005`, `AC-005/008/009`, `DEC-AUTO-005/009`, `RISK-004`, `AUTH-001/002` |
| Legal/cohort scope | `LEGAL_COHORT_AND_AUTHORIZATION_BOUNDARIES.md` | `REQ-006`, `AC-006/010`, `DEC-AUTO-006`, `RISK-005`, `AUTH-003` |
| Evidence composition/operations | `TEST_AND_ADVERSARIAL_QA.md`; `ROLLOUT_ROLLBACK_AND_OPERATIONS.md` | `REQ-007`, `AC-007`, `RISK-006` |

## Decisions

### `DEC-AUTO-001` — Consent-gate analytics at the route-appropriate loader

Remove the global Cloudflare Web Analytics component from `AppProviders`; use the consent-aware loader only on approved surfaces. Rejected: exempting Cloudflare analytics as essential, because the current product contract presents analytics consent and global injection makes measurement/privacy ambiguous.

### `DEC-AUTO-002` — Display `Unavailable`, never sample operational values

Admin source errors, missing configuration, and intentionally deferred providers render explicit unavailable states with timestamp/source. Rejected: zero or demo data, because operators can misread it as current truth.

### `DEC-AUTO-003` — D1 is the Beta cohort/operations source of truth

Use durable application events and repositories for product milestones; use GA4/Clarity/Cloudflare only as supplementary aggregate analytics. Rejected: making provider dashboards required for core activation/support decisions.

### `DEC-AUTO-004` — Bot, anonymous, test, and verified-recipient traffic remain separate

Never merge these populations into unique-viewer or engagement denominators. Rejected: a single open count, because it distorts product decisions and recipient follow-up.

### `DEC-AUTO-005` — Default to mitigating raw-session risk where proportionate

Preserve disabled cookie cache, least-privilege D1/backup access, explicit revocation APIs, bounded lifetime, restore invalidation, and access audit. Owner may time-box residual acceptance only with documented triggers/expiry. Rejected: calling signed cookies encryption-at-rest for D1 tokens.

### `DEC-AUTO-006` — Separate limited Beta owner approval from counsel launch approval

Owner confirmation may authorize a named, free, limited cohort under explicit constraints. Broader/public/paid launch remains counsel-gated. Rejected: one blanket legal-ready boolean.

### `DEC-AUTO-007` — Evidence producers fail closed but do not perform production actions implicitly

Local checks may read artifacts and report next commands; sending alerts, toggling production analytics, or changing external owner assignments requires an explicit run boundary. Rejected: readiness scripts with hidden production side effects.

### `DEC-AUTO-008` — Make the Beta incident matrix executable before owner confirmation

Use `POLICY-BETA-INCIDENT-v1-proposed` as the complete local fixture and schema
default. It becomes binding only through an exact, current owner-confirmation
record under `AUTH-003`; a replacement must carry the same fields and invalidate
prior local/hosted receipts. Rejected: inventing targets during implementation
or treating plan-authored defaults as owner-approved policy.

### `DEC-AUTO-009` — Consume recovery proof; never rerun restore here

`Hosted-D1-Recovery-And-Data-Resilience` `UNIT-006` emits
`D1-RECOVERY-RECEIPT-v1` binding artifact/schema version, source/target hashes,
app SHA, session invalidation, canaries, RTO/RPO, cleanup, and freshness. This
pack validates and consumes that receipt for auth risk. Rejected: importing or
restoring D1 in Operating Unit 007, because recovery owns the resource lifecycle
and its distinct authorization packet.

## Risks

| ID | Risk | Mitigation |
| --- | --- | --- |
| `RISK-001` | Consent bypass records users or share recipients unexpectedly. | Regression-first removal, route matrix, provider network assertion, no raw identifiers; `UNIT-001`, `AC-002`. |
| `RISK-002` | Metric definitions or stub fallbacks mislead Beta decisions. | Versioned registry, D1 truth, `Unavailable`, freshness and adversarial fixtures; `UNIT-002`, `AC-001/003`. |
| `RISK-003` | Incident/support machinery is green without policy implementation, idempotent delivery state, human coverage, or delivery. | Fixed local policy, concurrent retry/post-send persistence fixtures, and table tops (`AC-004`), then named coverage plus hosted delivery/acknowledgment (`AC-008`); `UNIT-003/007`. |
| `RISK-004` | D1 export/operator access exposes bearer-equivalent sessions or restore revives them. | Local taxonomy/access/revoke plus strict recovery-receipt consumption (`AC-005`), hosted synthetic canary (`AC-008`), and time-boxed human decision (`AC-009`); `UNIT-004/007/008`. |
| `RISK-005` | Owner-approved draft language is mistaken for counsel approval. | Local non-bypassable gate schema (`AC-006`) and separate human scope records (`AC-010`); `UNIT-005/009`. |
| `RISK-006` | A local or external receipt is structurally valid but stale, contradictory, or bound to another release. | Bind producer version, release ID, SHA, environment, source hashes, freshness, blockers, and next action; strict release-side composition of distinct receipts; `UNIT-006/007/008/009`, `AC-007`. |

## Authorization Boundaries

### `AUTH-001` — Hosted telemetry, alert, support, and synthetic-auth proof

Packet: exact environment/release ID, analytics flag/provider routes, current
owner-confirmed incident-policy version/digest, alert
scenarios and recipients, webhook/owner labels by redacted identifier, messages/
side effects, support participants, confirmed severity/SLA assertions, synthetic test
account/session IDs by hash, revoke/access canary steps, run window, rollback,
artifact paths, and cleanup. It authorizes only the named proof run on bound
Archestimator resources; it does not authorize paid features, real-user session
revocation, D1 export/import/restore, recovery resource creation, or unrelated
recipients.

### `AUTH-002` — Human auth residual-risk acceptance

Packet: installed auth/version evidence, credential taxonomy, local and hosted
synthetic-canary results, consumed recovery receipt identity/freshness,
mitigations, residual likelihood/impact, acceptance expiry/triggers, and the
exact `OPERATING-HOSTED-PROOF-RECEIPT-v1` identity. Approval identity/date/scope
must be recorded without privileged communications. It authorizes the auth-risk
decision only, not provider, session, recovery, cohort, or legal mutations.

### `AUTH-003` — Incident-policy, limited-cohort, and legal-scope decision

Packet: limited cohort identity/size/duration, current terms/privacy/cookie
versions, exact incident-policy version/digest, support window/primary/backup and
data constraints, requested owner confirmation, decision date
and expiry, and the distinct qualified-counsel scope/status for broader/public/
paid launch. Approval identity/date/scope must be recorded without privileged
legal communications. It authorizes decisions only, not product, provider,
session, or recovery mutations, and it does not require hosted-proof completion.

## Applicability Gates

- `CONTRACT`: metric, operating-evidence, risk-decision, and legal-gate schemas are versioned.
- `DATA`: retention/deletion, event dedupe, bot/test classification, session/backup lifecycle.
- `SEC`: no raw credential or sensitive diagnostic evidence; denial/revocation/access proof.
- `VERIFY`: local schemas, D1 behavior, hosted provider actions, and human approvals are distinct.
- `OPS`: named owners, incidents, support, rollback, alert delivery, reviews, freshness.
- `CLEAN`: revoke proof credentials and remove test data/flags after drills.
- `GATE-AGENT-01`: `N/A`. The pack does not change prompt, skill, payload,
  routing, memory, state, or completion contracts. An integrator, hosted
  operator, and maker/checker split are ordinary execution roles; the
  `Beta-Readiness-Program` pack owns cross-pack orchestration.
