# UNIT-002 — Verify hosted observability + alert delivery

## Goal

Prove the application-level alert scaffolding delivers to an operator-visible
sink: confirm `OPERATIONAL_INCIDENT_ALERTS_ENABLED=1`, webhook URL reachable,
token valid, and each of S-01..S-07 scenarios produces a delivered payload.

## Source findings / requirements

- `OPS-OBS-ALERT-002` (High)
- `OPS-CRON-ALERT-010` (Medium) — cron-failure / missed-run alerting
- `OPS-OBS-RETENTION-011` (Medium) — Workers Logs retention duration
- `REQ-002` (CORE) — alert delivery is a release-gate NO_GO

## Dependencies

- None (operator-driven; AUTH-001 must be resolved first)

## Owned paths / resources

- `artifacts/observability-alert-evidence.md`
- `artifacts/release-gate.json` (`GATE-ALERT-002`, `GATE-CRON-005`, `GATE-OBS-RETENTION-006`)

## Non-goals

- Application-level scaffolding (already exists; not in scope)
- Alert scenario catalog changes (`ALERT_SCENARIOS` S-01..S-07)
- Cron-handler logic (historically resolved by Quality Master UNIT-028; current
  authority `.ai/03_plans/2026-07-31/Code-Improvement/`)
- Cron redaction (historical Infosec UNIT-010; current authority
  `.ai/03_plans/2026-07-31/Code-Improvement/`)

## Implementation boundary

Operator-driven actions:

1. Interactive terminal: `bunx wrangler login`.
2. Confirm hosted Worker secret **names** (not values):
   `bunx wrangler secret list --env prod` should include
   `OPERATIONAL_INCIDENT_ALERTS_ENABLED`,
   `OPERATIONAL_INCIDENT_ALERT_WEBHOOK_URL`,
   `OPERATIONAL_INCIDENT_ALERT_WEBHOOK_TOKEN`.
3. Set the hosted values (operator dashboard or `bunx wrangler secret put`):
   - `OPERATIONAL_INCIDENT_ALERTS_ENABLED=1`
   - Webhook URL and token valid.
4. For each scenario S-01..S-07:
   `bun run ops:verify-observability-alert -- --scenario <name>`.
5. Verify the webhook sink receives each payload (sink-side log).
6. Dashboard → Workers → Logs → confirm and pin retention duration
   (recommend ≥ 30 days for cohort beta).
7. Wire a periodic synthetic-alert probe (cron-driven or external uptime
   monitor) so silent alerting failure becomes detectable.
8. Update `observability-alert-evidence.md`: hosted layer transitions from
   `EVIDENCE_BLOCKED` to `HOSTED_CONFIRMED`.
9. Update `release-gate.json`: remove `GATE-ALERT-002` from `NO_GO_items`;
   update `GATE-CRON-005` and `GATE-OBS-RETENTION-006` to resolved.

## Invariants

- No real customer data is used in synthetic alerts.
- No production state mutated beyond the secret values.
- Webhook token never printed.

## Acceptance evidence

- `evidence/alert-delivery-<date>.md` with delivered-payload receipts for each
  S-01..S-07.
- `observability-alert-evidence.md` "Hosted delivery" → `HOSTED_CONFIRMED`.
- `release-gate.json` `NO_GO_items[GATE-ALERT-002]` removed.

## Test decision

`NOT_REQUIRED` — operator-driven hosted verification.

## Recovery / fix-forward

If delivery fails: capture failure mode (DNS, token, sink, payload safety
reject) and raise a new finding. Cohort admit blocked until resolved.

## Completion signal

`release-gate.json` removes `GATE-ALERT-002`; LOOP_LEDGER records operator
event.

## Status

`PLANNED` — ready for operator.
