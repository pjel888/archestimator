# Beta Operating Contract

## Outcome

Establish the privacy, telemetry, support, incident, rollback,
authentication-risk, legal, and operator-truth contract required to run a
limited external Beta. This pack owns `BETA-P0-06`, `BETA-P0-07`,
`BETA-P0-08`, `BETA-P0-09`, and `BETA-P1-07`; the Activation pack supplies its
versioned privacy-safe cohort data contract.

## Status

| Field | Value |
| --- | --- |
| Package | `CONDITIONALLY_READY` |
| Implementation | `NOT_STARTED` |
| Release | `BOUNDARY` |
| Lifecycle | `ACTIVE` |
| Action ceiling | `EXTERNAL_ACTIONS` |
| Next unit | `UNIT-001` |
| Canonical execution artifact | `IMPLEMENTATION_PLAN.md` |

The local implementation slice is ready and remains measured as `PLAN_ONLY` /
`NOT_STARTED`. Production analytics/alert/support/synthetic-auth proof remains
behind `AUTH-001`; owner auth-risk acceptance remains behind `AUTH-002`; and
limited-cohort/legal scope decisions remain behind `AUTH-003`. Local technical
criteria stay `FAIL` until implemented and cannot be hidden inside any boundary.

The `high-blast-radius` profile is proportionate because the pack crosses
consent/privacy, operator UX, D1/session credential risk, incident/support
operations, legal authorization, hosted proof, and release composition. The
domain artifacts below exist for independent review; they do not create a
second execution authority.

## Scope

- Define versioned, privacy-bounded product and operational metrics with bot/anonymous separation, consent, production enablement, retention, deletion, and evidence semantics.
- Remove global analytics injection that bypasses the landing consent loader and prove public/share/protected route behavior.
- Replace fabricated Admin overview values with D1-backed metrics or explicit `Unavailable` states, including activation milestones supplied by the activation pack.
- Define and prove Beta severity, response targets, named ownership, escalation, rollback, customer communication, support inbox, and first-24/72-hour review.
- Resolve the raw Better Auth D1 session-token residual risk through written acceptance or mitigation, revocation drills, backup/recovery treatment, and access review.
- Encode limited-cohort owner approval and a non-bypassable counsel boundary before broader or paid launch.

## Non-goals

- Building a general analytics warehouse, session replay product, billing system, or legal-contract engine.
- Treating provider link-outs or sample charts as operational metrics.
- Exposing raw IPs, user agents, tokens, emails, webhook URLs, or row-level support data in telemetry evidence.
- Implementing activation event producers, Publisher funnels, estimate intelligence, output parity, or provider recovery; this pack consumes their contracts.
- Claiming production support/observability from local artifacts.

## Dependencies And Ownership

| Dependency | Provider | Consumer contract |
| --- | --- | --- |
| Activation milestone events and cohort query | `First-User-Activation-And-Cohort-Operations` | Versioned event names, timestamps, account/workspace joins, bot/test exclusion. |
| Publication/recipient events | `Activity-History-Mapping` and `Publisher-And-Shared-Pages` | Validated manifest and handoff receipts for snapshot-versioned event/funnel inputs; no duplicate event store. |
| Recovery evidence | `Hosted-D1-Recovery-And-Data-Resilience` | Current `D1-RECOVERY-RECEIPT-v1` from its `UNIT-006`, including post-restore session treatment; this pack never reruns restore. |
| Release truth | `Release-Integrity-And-Golden-Path` | Composes the local operating artifact, hosted proof receipt, auth-risk decision receipt, and legal/cohort decision receipt with freshness and exact release ID; no external unit mutates a hidden combined record. |

This pack owns `src/app/providers.tsx` analytics placement, landing analytics consent tests, telemetry/retention policy modules, Admin operator aggregation/presentation, operating scripts/artifacts, auth residual-risk and revocation proof, and legal readiness gates. It does not own Corporate Accounts CRUD or `/admin/accounts`; `UNIT-002` only characterizes their platform-admin and workspace-boundary effects. Shared release consumers are integrated by the release-pack lead.

## Critical Path

`UNIT-001 -> UNIT-002`; `UNIT-003`, `UNIT-004`, and `UNIT-005` can run in
parallel; all five local lanes feed `UNIT-006`. `UNIT-009` consumes `UNIT-003`
and `UNIT-005` behind `AUTH-003` and remains independent of hosted proof.
`UNIT-007` consumes `UNIT-004`, `UNIT-006`, and the exact Unit 009 policy receipt
behind `AUTH-001`; `UNIT-008` consumes `UNIT-004` and `UNIT-007` behind
`AUTH-002`. `SLICE-001` remains `UNIT-001..UNIT-006`.

## Artifact Map

Core authority:

- `plan-pack.json`: machine-readable status, stable IDs, paths, hashes, DAG, and evidence index.
- `README.md`: execution entrypoint and restart packet.
- `SOURCE_AND_CODEBASE_AUDIT.md`: current source/provider facts and freshness.
- `REQUIREMENTS_AND_DECISIONS.md`: human-readable requirement, criterion, decision, risk, and authorization planning baseline; live record state remains solely in `plan-pack.json`.
- `IMPLEMENTATION_PLAN.md`: sole canonical execution artifact with unit packets and handoffs.
- `VERIFICATION_ROLLOUT_AND_FINAL_AUDIT.md`: human-readable test/gate planning baseline and completion audit; live status remains solely in `plan-pack.json`.
- `LOOP_LEDGER.md`: append-only run, supersession, and resume state.

Independent review surfaces:

- `BETA_METRICS_TELEMETRY_AND_CONSENT_CONTRACT.md`: metric registry, consent/route matrix, data lifecycle, and proof ownership.
- `OPERATOR_VIEW_UX_AND_ACCESSIBILITY.md`: operator journey, truthful states, accessibility, and performance boundaries.
- `INCIDENT_SUPPORT_AND_ESCALATION_MODEL.md`: frozen proposed severity/default fixture, support, acknowledgment, communication, and review model pending `AUTH-003` owner confirmation.
- `AUTH_SESSION_THREAT_AND_RESIDUAL_RISK_MODEL.md`: credential taxonomy, revocation/replay denials, recovery consumption, and residual-risk decision.
- `LEGAL_COHORT_AND_AUTHORIZATION_BOUNDARIES.md`: limited-cohort versus broader/public/paid decision separation.
- `TEST_AND_ADVERSARIAL_QA.md`: gate applicability plus local and boundary scenario setup, cleanup, and failure response.
- `ROLLOUT_ROLLBACK_AND_OPERATIONS.md`: staged rollout, go/no-go, fix-forward, receipt, and handback contract.

## Restart Packet

1. Run `bun run ops:agent-debug-snapshot` and inspect structured readiness failures without treating stale/test-origin logs as runtime truth.
2. Re-read `src/app/providers.tsx`, `LandingAnalyticsLoader.tsx`, Admin routes/repositories, Better Auth config, legal/support/observability scripts, and the latest ignored readiness artifacts.
3. Validate the pack, then start `UNIT-001` with a regression that proves analytics is not globally injected without consent.
4. Keep production flags and alert sends behind `AUTH-001`, auth-risk acceptance behind `AUTH-002`, and owner/legal scope decisions behind `AUTH-003`.
5. Append evidence and next action to `LOOP_LEDGER.md`.

Stop only when every metric is real or `Unavailable`, consent/retention is
proven, support/incident/rollback drills are current, and the release consumer
has separately validated current local, hosted, auth-risk, and legal/cohort
receipts. Limited-cohort approval never implies broader/paid counsel approval.
