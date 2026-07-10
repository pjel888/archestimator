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
| Action ceiling | `IMPLEMENT_LOCAL` |
| Next unit | `UNIT-001` |
| Canonical execution artifact | `IMPLEMENTATION_PLAN.md` |

The local implementation slice is ready. Production analytics/alert/support proof and owner/counsel acceptance remain behind `AUTH-001` and `AUTH-002`. The pack cannot approve its own residual risk or legal posture.

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
| Publication/recipient events | Existing Activity/Publisher packs after circle-back | Snapshot-versioned event/funnel inputs; no duplicate event store. |
| Recovery evidence | `Hosted-D1-Recovery-And-Data-Resilience` | Current restore proof and post-restore session treatment. |
| Release truth | `Release-Integrity-And-Golden-Path` | Consumes every operating gate with freshness and exact release ID. |

This pack owns `src/app/providers.tsx` analytics placement, landing analytics consent tests, telemetry/retention policy modules, Admin operator aggregation/presentation, operating scripts/artifacts, auth residual-risk and revocation proof, and legal readiness gates. Shared release consumers are integrated by the release-pack lead.

## Critical Path

`UNIT-001 -> UNIT-002`; `UNIT-003` and `UNIT-004` can run in parallel; `UNIT-005` consumes their evidence; `UNIT-006` composes the local contract; `UNIT-007` is blocked by both authorization boundaries.

## Artifact Map

- `SOURCE_AND_CODEBASE_AUDIT.md`: current telemetry/admin/auth/legal/support reality and official references.
- `REQUIREMENTS_AND_DECISIONS.md`: requirements, definitions, decisions, risks, and approval packets.
- `IMPLEMENTATION_PLAN.md`: disjoint executable units and handoffs.
- `VERIFICATION_ROLLOUT_AND_FINAL_AUDIT.md`: adversarial tests, hosted proof, rollout, rollback, completion audit.
- `LOOP_LEDGER.md`: append-only run state.
- `plan-pack.json`: machine-readable status/traceability.

## Restart Packet

1. Run `bun run ops:agent-debug-snapshot` and inspect structured readiness failures without treating stale/test-origin logs as runtime truth.
2. Re-read `src/app/providers.tsx`, `LandingAnalyticsLoader.tsx`, Admin routes/repositories, Better Auth config, legal/support/observability scripts, and the latest ignored readiness artifacts.
3. Validate the pack, then start `UNIT-001` with a regression that proves analytics is not globally injected without consent.
4. Keep production flags, alert sends, owner confirmations, and legal/risk acceptance behind the exact authorization packets.
5. Append evidence and next action to `LOOP_LEDGER.md`.

Stop only when every metric is real or `Unavailable`, consent/retention is proven, support/incident/rollback drills are current, auth residual risk is explicitly resolved, limited-cohort legal approval is recorded, broader/paid launch remains counsel-gated, and hosted production evidence is green.
