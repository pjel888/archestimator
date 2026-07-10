# Requirements And Decisions

## Requirements

| ID | Audit mapping | Requirement | Acceptance boundary |
| --- | --- | --- | --- |
| `REQ-001` | `BETA-P0-06` | Versioned telemetry defines purpose, producer, denominator, classification, consent, environment, retention/deletion, owner, availability, and validation for every Beta metric. | Undefined, test, bot, anonymous, or unavailable data cannot silently enter operator/product metrics. |
| `REQ-002` | `BETA-P0-06` | Analytics loads only on permitted routes after applicable consent and production enablement; public/share privacy behavior is explicit. | Global no-consent injection regression passes; provider events are absent before consent and carry no forbidden raw fields. |
| `REQ-003` | `BETA-P1-07` | Admin presents only repository/provider-backed current values or explicit `Unavailable`, including cohort milestones from the activation pack. | Stub/sample values and hard-coded charts cannot render as operational truth. |
| `REQ-004` | `BETA-P0-07` | Beta incident, rollback, support, escalation, communication, and first-24/72-hour review have named primary/backup owners and tested procedures. | Scenario drills and support-monitoring gate prove intake-to-resolution/rollback and owner coverage. |
| `REQ-005` | `BETA-P0-08` | Raw D1 session-token risk is explicitly accepted with expiry/triggers or mitigated; current/other/all revocation, restore treatment, and D1 access are proven. | Written taxonomy/decision and denial/revocation drills match installed Better Auth behavior. |
| `REQ-006` | `BETA-P0-09` | Limited-cohort owner approval and broader/paid-launch counsel approval are distinct, versioned, non-bypassable gates. | Beta cohort constraints are explicit; broader/paid release remains boundary until qualified counsel evidence. |
| `REQ-007` | `BETA-P0-06/07/08/09` | One operating artifact exposes all gate status, evidence identity/freshness, owner, blocker, and next action to release truth. | Missing/stale/unknown evidence fails closed and cannot be replaced by README/plan claims. |

## Criteria

| ID | Requirement | Current | Planned proof |
| --- | --- | --- | --- |
| `AC-001` | `REQ-001` | `FAIL` | `TEST-001` validates metric registry and cohort/funnel queries against bot/test/anonymous/empty/stale fixtures. |
| `AC-002` | `REQ-002` | `FAIL` | `TEST-002` proves analytics absent before consent and from forbidden routes, then present only after allowed consent/flag. |
| `AC-003` | `REQ-003` | `FAIL` | `TEST-003` verifies real, empty, error, stale, partial, and unavailable Admin source states with no sample fallback. |
| `AC-004` | `REQ-004` | `BOUNDARY` | `TEST-004` runs local scenarios and hosted alert/support drills with named owners under `AUTH-001`. |
| `AC-005` | `REQ-005` | `BOUNDARY` | `TEST-005` proves installed storage/revocation/access/restore behavior and records owner risk decision under `AUTH-002`. |
| `AC-006` | `REQ-006` | `BOUNDARY` | `TEST-006` validates limited-cohort confirmations and records counsel boundary/approval under `AUTH-002`. |
| `AC-007` | `REQ-007` | `FAIL` | `TEST-007` rejects missing/stale/malformed/mismatched operating artifacts and feeds exact release ID. |

## Metric Contract Minimum

The registry must include activation milestones, publication funnel inputs, support/incident/recovery/release facts, and provider analytics only where consent permits. Each metric definition includes `metric_id`, `version`, `purpose`, `producer`, `source`, `numerator`, `denominator`, `dimensions`, `bot_policy`, `anonymous_policy`, `test_policy`, `consent_basis`, `environment_policy`, `retention`, `deletion`, `owner`, `freshness`, `unavailable_behavior`, and `validation_query_or_test`.

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

## Risks

| ID | Risk | Mitigation |
| --- | --- | --- |
| `RISK-001` | Consent bypass records users or share recipients unexpectedly. | Regression-first removal, route matrix, provider network assertion, no raw identifiers; `UNIT-001`, `AC-002`. |
| `RISK-002` | Metric definitions or stub fallbacks mislead Beta decisions. | Versioned registry, D1 truth, `Unavailable`, freshness and adversarial fixtures; `UNIT-002`, `AC-001/003`. |
| `RISK-003` | Incident/support machinery is green without human coverage or delivery. | Named primary/backup confirmations, hosted delivery and acknowledgment drills, review schedule; `UNIT-003/007`, `AC-004`. |
| `RISK-004` | D1 export/operator access exposes bearer-equivalent sessions or restore revives them. | Taxonomy, least privilege, revoke drills, restore invalidation, acceptance expiry; `UNIT-004`, `AC-005`. |
| `RISK-005` | Owner-approved draft language is mistaken for counsel approval. | Separate gates/statuses/artifacts and launch-scope labels; `UNIT-005/007`, `AC-006`. |
| `RISK-006` | The operating artifact is structurally valid but stale, contradictory, or bound to another release. | Bind producer version, release ID, SHA, environment, source hashes, freshness, blockers, and next action; strict consumer and final recomposition; `UNIT-006/007`, `AC-007`. |

## Authorization Boundaries

### `AUTH-001` — Hosted telemetry, alert, and support proof

Packet: exact environment/release ID, analytics flag/provider routes, alert scenarios and recipients, webhook/owner labels by redacted identifier, messages/side effects, support participants, run window, rollback, artifact paths, and cleanup. It authorizes only the named proof run on bound Archestimator resources; it does not authorize paid features or unrelated recipients.

### `AUTH-002` — Human auth-risk and legal acceptance

Packet: installed auth/version evidence, credential taxonomy, mitigations, residual likelihood/impact, acceptance expiry/triggers, limited cohort identity/size/duration, current terms/privacy/cookie versions, support/data constraints, requested owner confirmations, and the distinct counsel scope for broader/paid launch. Approval identity/date/scope must be recorded without privileged legal communications.

## Applicability Gates

- `CONTRACT`: metric, operating-evidence, risk-decision, and legal-gate schemas are versioned.
- `DATA`: retention/deletion, event dedupe, bot/test classification, session/backup lifecycle.
- `SEC`: no raw credential or sensitive diagnostic evidence; denial/revocation/access proof.
- `VERIFY`: local schemas, D1 behavior, hosted provider actions, and human approvals are distinct.
- `OPS`: named owners, incidents, support, rollback, alert delivery, reviews, freshness.
- `AGENT`: one operating integrator; maker/checker split; external actions stay isolated.
- `CLEAN`: revoke proof credentials and remove test data/flags after drills.
