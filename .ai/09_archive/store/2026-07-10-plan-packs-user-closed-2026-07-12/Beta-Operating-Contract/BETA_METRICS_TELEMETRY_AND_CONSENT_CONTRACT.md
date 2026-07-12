# Beta Metrics, Telemetry, And Consent Contract

## Authority And Scope

This is the independently reviewable domain contract for `REQ-001`, `REQ-002`,
`AC-001`, `AC-002`, `TEST-001`, `TEST-002`, `RISK-001`, `UNIT-001`, and the
telemetry inputs to `UNIT-002` and `UNIT-006`. It does not create an execution
queue or claim proof. `IMPLEMENTATION_PLAN.md` remains the sole canonical
execution artifact, and `plan-pack.json` remains machine authority.

## Current And Target Contract

Current evidence in `SRC-002` shows that `AppProviders` injects Cloudflare Web
Analytics globally while `LandingAnalyticsLoader` applies consent on the landing
surface. The target removes that contradictory global path and makes one typed,
versioned registry authoritative for every Beta metric.

Every registry entry must contain:

| Field | Contract |
| --- | --- |
| Identity | Stable `metric_id` plus schema version; no silent semantic reuse. |
| Purpose and owner | Named product/operating decision, producer, consumer, and accountable owner. |
| Population | Numerator, denominator, workspace/cohort boundary, and explicit bot, anonymous, test, and verified-recipient classification. |
| Consent | Consent basis, permitted surfaces, production-enable flag, withdrawal behavior, and provider-deletion limitation when no provider API exists. |
| Data | Source, event/version contract, dedupe key, freshness, retention, deletion/erasure behavior, and legal-hold handling. |
| Availability | `available`, `partial`, `stale`, or `unavailable` with source/as-of/reason; never sample or synthetic fallback. |
| Proof | Validation query or test, expected signal, evidence class, and invalidation trigger. |

Activation entries consume `ACTIVATION-PRODUCER-CONTRACT-v1` and
`ACT-RECEIPT-COHORT-CONSUMER-v1`; Operating must not duplicate the Activation
event store or its retention jobs. Publication/recipient inputs consume the
versioned Activity and Publisher receipts named in the pack README.

## Route, Identity, And Consent Matrix

| Surface/state | Provider analytics | Product event | Identity rule |
| --- | --- | --- | --- |
| Landing before consent | Denied | Only strictly necessary, non-analytics state | No identity inference. |
| Landing after allowed consent and production enablement | Allowed for approved aggregate events | Allowed by registry | No raw IP, user agent, token, email, or private URL in product evidence. |
| Consent withdrawn | Stop immediately | Retain/delete only under the registered lifecycle | No new provider events after withdrawal. |
| Protected workspace | Route-specific and consent-gated | Authenticated workspace event when registry allows | Tenant boundary is mandatory. |
| Public/share/recipient | Disabled unless explicitly registered and consent-valid | Snapshot/version-scoped event only | Device/country is not recipient identity; anonymous and verified recipients remain separate. |
| Test, bot, synthetic, or local | Disabled from production denominators | Marked and excluded by default | Environment/test classification cannot be omitted. |
| Provider unavailable or registry invalid | No request | Record safe unavailable state only | Never substitute a zero or sample metric. |

## Invariants And Failure States

- One event cannot enter two incompatible populations through retry, aliasing,
  or a changed metric version.
- Event producers must supply a deterministic dedupe/idempotency key and tenant
  identity before an aggregate consumer accepts the record.
- Missing consent, unknown route, unknown environment, invalid registry entry,
  missing denominator, stale source, or uncertain actor classification fails
  closed for provider analytics and renders the metric unavailable.
- Withdrawal races must stop future provider loads and events; a cached loader
  or client transition cannot preserve prior permission.
- Provider scripts, telemetry failures, and deletion limitations use structured,
  redacted operator errors. They never expose customer or credential material.
- Metric query cardinality and latency must be measured against the Beta cohort
  fixture and a 10x cohort fixture before an operator-readiness claim.

## Evidence, Ownership, And Handback

`UNIT-001` owns the registry, consent path, provider-load denial, and focused
source/DOM/network regression evidence. `UNIT-002` owns truthful operator
consumption. `UNIT-006` owns schema composition into the local operating
artifact. `UNIT-007` alone may collect authorized hosted consent/provider proof
under `AUTH-001`.

Evidence remains planned until the named units run. The handback to the Program
and Release packs is the versioned local operating artifact plus the distinct
hosted receipt, never this planning document. Any provider, consent, route,
metric, producer, retention, or cohort-contract change invalidates prior proof.
