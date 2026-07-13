# 13 — Rollout, Rollback, and Operations

## Rollout sequencing

1. **Local + preview:** Phase 1–5 code + tests land; proof scripts run locally
   (`proofClass: local-automated`); readiness verifier runs against local fixture receipts.
2. **Hosted staging:** migration `0040` applied to preview D1; provider-backed receipts gathered
   for non-critical scenarios (S-03/S-04/S-07); retention rules run in dry-run on hosted.
3. **Production launch (gated):** GATE-02 provider-backed receipts for S-01/S-02/S-05/S-06;
   GATE-03 first-24h/72h review owners named; readiness verifier `launchReady:true`.

## Feature flags / env (operational, not user-facing)

| Flag | Default | Purpose |
|---|---|---|
| `UPLOAD_OPERATIONS_ALERTS_ENABLED` | existing | upload-ops webhook (extend to log outcome) |
| `OPERATIONAL_INCIDENT_ALERTS_ENABLED` | 0 | enables redacted incident mutation webhook alerts |
| `OPERATIONAL_INCIDENT_ALERT_WEBHOOK_URL` | unset | HTTPS webhook for incident alerts; never store raw URL in artifacts |
| `OPERATIONAL_INCIDENT_ALERT_WEBHOOK_TOKEN` | unset | bearer token for incident alerts; never store in artifacts |
| `OPERATIONAL_INCIDENT_ALERTS_REQUIRED` | 0 | make remote `ops:incident` fail closed when alert delivery fails |
| `OPERATIONAL_INCIDENT_ALERTS_ALLOW_LOCAL` | 0 | allow local-scope alert drills only when explicitly set |
| `ARCH_INCIDENT_WRITE_ENABLED` | 0 | admin incident declare/close gate |
| `ALERT_PROOF_MAX_AGE_HOURS` | 72 | receipt staleness threshold |
| `ARCH_ERROR_RATE_POLL_INTERVAL_SECONDS` | 300 | S-02 poller cadence |
| `ARCH_ERROR_RATE_THRESHOLD` | 0.05 | S-02 error-rate threshold |
| `ARCH_RETENTION_DRY_RUN` | 1 | retention dry-run until owner flips |

## Release gates

| Gate | Blocks | Evidence required |
|---|---|---|
| GATE-01 readiness verifier | launch | `launchReady:true` on real artifacts |
| GATE-02 provider-backed proof (S-01/02/05/06) | launch | `proofClass:provider-backed` receipts |
| GATE-03 first-24h/72h review | post-launch (mandatory) | review receipts within 72h |
| Local tests green | merge | focused vitest |
| Migration applies locally | merge | `cf:d1:migrate` local |
| Hosted D1 migration readback | production | `data_retention_events`/incident table readback |
| Sibling observability pack landed (for S-02/S-05 precision) | those slices | sibling FR-01/02/05 OBS-03 merged |

## Rollback triggers and steps

| Trigger | Step |
|---|---|
| Readiness verifier cannot reach `launchReady` | do not launch; list `missing[]`; resolve |
| Alert-delivery channel down at launch | fall back to secondary channel + manual dashboard; runbook escalation |
| Retention rule deletes unexpected rows | flip `ARCH_RETENTION_DRY_RUN=1`; code revert; audit `data_retention_events` for the bad rule; restore from Time Travel if needed (backup pack) |
| Migration `0040` bad | `DROP TABLE operational_incident_events; DROP TABLE operational_incidents;` (safe, new) |
| Incident schema conflict | renumber to `0041`; coordinate `LOOP_LEDGER` |
| Redaction scan fails post-merge | the artifact is gitignored — prune it; re-run verify script; if a *log* leaked, sibling SEC-01 owns the fix |
| First-24h review finds real incident | follow incident runbook; rollback feature if root cause is a deploy |

## Observability of the observability (meta)

- `operational_alert_failed` rate is itself a signal: if alerts are failing, the readiness
  verifier should catch it via stale receipts, but the runbook also documents a manual GraphQL
  query for `event=operational_alert_failed` over 24h. Upload operational alert delivery now emits
  `operational_alert_sent` / `operational_alert_failed` structured records with redacted
  reason/status metadata.
- Retention-pass health: `data_retention_events` rows per class per day; `budget_reached` abnormal
  → S-07 alert.
- Incident count: `operational_incidents` open-by-age query.

## Runbook (operator-facing) — DOC-01

### Find a request by id
1. (After sibling FR-01) grep Workers Observability logs for `"request_id":"<id>"` via Query Builder.
2. Locally: `bun run logs:tail -- --grep <id>` (dev only; prod logs are in Workers
   Observability ~3d free).

### Read an error log
- NDJSON shape: `{timestamp, level, event, message, action, request_id, error:{name,kind,code,
  status_code, stack, cause}, context, tainted_fields}`. `tainted_fields` lists redacted paths.

### Prove hosted observability
1. Capture redacted hosted evidence artifacts under
   `.ai/03_plans/2026-07-07-observability-alert-proof-and-log-retention/evidence/`:
   `workers-logs-query-proof.json`, `uptime-alert-delivery-proof.json`,
   `error-rate-alert-delivery-proof.json`, and
   `incident-escalation-alert-delivery-proof.json`.
   For the Workers Logs artifact, run while reproducing/observing the hosted request:
   `WORKERS_LOGS_PROOF_REQUEST_ID="<internal request id>" WORKERS_LOGS_PROOF_ROUTE="/route" bun run ops:collect-workers-logs-proof`.
   For each alert-delivery artifact, run after hosted observation and alert destination setup:
   `OBSERVABILITY_ALERT_DELIVERY_PROOF=1 OBSERVABILITY_ALERT_DELIVERY_HOSTED_OBSERVED=1 OBSERVABILITY_ALERT_WEBHOOK_URL="<https webhook>" OBSERVABILITY_ALERT_WEBHOOK_TOKEN="<token>" bun run ops:verify-observability-alert -- --scenario <uptime|error-rate|incident-escalation>`.
   The `incident-escalation` scenario uses the operational incident alert payload sanitizer used by
   `ops:incident`. The script records redacted status/channel evidence and never stores raw recipient addresses,
   webhook URLs, tokens, payload bodies, private paths, or cookies.
2. Run `bun run ops:check-observability`. The checker fails closed on missing,
   stale, local-only, preview-only, unredacted, or partial artifacts and writes
   `production-observability-proof-check.json` by default.
3. For support readiness, pass both artifacts:
   `SUPPORT_MONITORING_INCIDENT_STATUS_FILE=.ai/99_scratch/operational-incidents-readiness-remote.json SUPPORT_MONITORING_OBSERVABILITY_PROOF_FILE=.ai/03_plans/2026-07-07-observability-alert-proof-and-log-retention/evidence/production-observability-proof-check.json bun run launch:check-support-monitoring`.
4. Never paste raw cookies, bearer tokens, private URLs, invite/share/password-reset
   tokens, raw recipient addresses, or full payload bodies into proof artifacts.

### Declare an incident
1. Dry-run the scoped operator command first:
   `bun run ops:incident -- declare --scope remote --severity sev2 --owner "<owner>" --summary "<redacted summary>" --detail "<redacted detail>" --request-id "<internal request id>" --dry-run`.
2. If the dry-run report has `ready:true`, remove `--dry-run` to write the redacted
   `operational_incidents` and `operational_incident_events` rows through Wrangler D1.
   When `OPERATIONAL_INCIDENT_ALERTS_ENABLED=1` plus the HTTPS webhook URL/token are set,
   the report includes redacted `alertDelivery` evidence. Use
   `OPERATIONAL_INCIDENT_ALERTS_REQUIRED=1` only for drills or environments where missing
   alert delivery should fail the command after the D1 mutation attempt.
3. Confirm the incident status artifact:
   `OPERATIONAL_INCIDENTS_D1_SCOPE=remote OPERATIONAL_INCIDENTS_OUTPUT_FILE=.ai/99_scratch/operational-incidents-readiness-remote.json bun run ops:check-incidents`.
4. Confirm `incident_declared` event + alert delivered (S-06) once the alert-delivery channel is
   live.
5. If sev1, escalate to `escalation-target` (OPS-01 matrix).

### Escalate / close
- Add a human note:
  `bun run ops:incident -- note --scope remote --incident-id "<id>" --actor "<owner>" --detail "<redacted note>"`.
- Mark contained/resolved:
  `bun run ops:incident -- status --scope remote --incident-id "<id>" --status contained --actor "<owner>" --detail "<redacted detail>"`.
- Close with root cause:
  `bun run ops:incident -- close --scope remote --incident-id "<id>" --actor "<owner>" --detail "<resolution summary>" --root-cause "<redacted root cause>"`.
- Re-run `ops:check-incidents`; GATE-01 consumes the artifact through
  `SUPPORT_MONITORING_INCIDENT_STATUS_FILE=<artifact> bun run launch:check-support-monitoring`
  plus `SUPPORT_MONITORING_OBSERVABILITY_PROOF_FILE=<artifact>` and fails on
  `stale_incident:<id>` or `observability_proof:<key>`.

### Budget / retention thresholds
- See `09_…` latency budget + retention-pass cost budget. `budget_reached` → S-07.

### First-24h review (OPS-03)
- Alert receipts present for any real signal; `operational_incidents` empty or all `resolved`;
  `ops:check-incidents` has `operationalIncidentsReady:true`; error-rate within
  `ARCH_ERROR_RATE_THRESHOLD`; last retention pass `ok:true`. Record a review receipt.

### First-72h review
- Same + run a sev3 test-incident drill (`ops:incident declare` dry-run first, then
  declare→note/status→close if the operator intentionally performs the drill) and confirm delivery.

### Paid-upgrade triggers (owner-gated)
- `OPEN-ALERT-02`: enable PagerDuty/Datadog when alert volume or 24/7 coverage demands it.
- `OPEN-RET-01`: enable Logpush/Workers Paid when >3d log retention is needed for incident RCA.

## Support implications

- The support inbox (`support@archestimator.com`) becomes an operational alert target (S-02/05/06
  email channel). The first-24h review confirms inbox monitoring.
- Feedback triage couples to the beta-feedback pack; this runbook cross-references it but does not
  own the feedback SLA.

## Post-release verification

- First real incident is the end-to-end test of GATE-03.
- Weekly (pre-scale): review `operational_alert_failed` rate + stale-receipt count.
