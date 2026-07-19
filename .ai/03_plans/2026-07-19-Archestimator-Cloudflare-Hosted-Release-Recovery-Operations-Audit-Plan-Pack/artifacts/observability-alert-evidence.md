# Observability + Alert Evidence — O-11

## Workers Logs configuration — CURRENT_SOURCE_CONFIRMED

`wrangler.jsonc:110-123`:

```jsonc
"observability": {
  "enabled": true,
  "head_sampling_rate": 1,
  "logs": {
    "enabled": true,
    "head_sampling_rate": 1,
    "invocation_logs": true,
    "persist": true
  },
  "traces": {
    "enabled": false,
    "head_sampling_rate": 0,
    "persist": false
  }
}
```

- Logs: 100% sampled, persisted, invocation logs on.
- Traces: disabled (posture).
- `tail_consumers`: not present.
- `retention`: not specified — relies on account default. **Finding OPS-OBS-RETENTION-011 (Medium)**: operator must pin retention for incident reconstruction.

## Hosted availability of Workers Logs — EVIDENCE_BLOCKED

- Cannot confirm the account has Workers Logs paid feature enabled or what the actual retention is. AUTH-001 continuation: dashboard → Workers → Logs.

## Log sampling / persistence / retention — see above

100% sampled + persisted at the config layer. Retention duration hosted-side: EVIDENCE_BLOCKED.

## Traces disabled posture — CURRENT_SOURCE_CONFIRMED

Explicit `enabled: false`. Not a defect — deliberate cost/privacy posture.

## Request IDs — HOSTED_CONFIRMED

- Header `x-request-id` propagated end-to-end (`worker.ts:147, 159, 165, 170, 177, 182, 190, 193`).
- Observed on every probed response (`req_<uuid>` internal IDs).
- Inbound `x-request-id` honored if valid (`request-id.ts:24-37`).

## Redaction — CURRENT_SOURCE_CONFIRMED

- `redactMessage` (`redact.ts:50-103`): sanitizes control chars, masks emails (`sha256:16hex`), `Bearer …`, JWTs, share/invite path segments, secret-ish querystring keys, long hex blobs, prompt-injection phrases.
- `redactForLog` walks objects; `NEVER_LOG_KEYS` (`redact.ts:9-25`) covers `authorization`, `cookie`, `password`, `passcode`, `secret`, `setcookie`, `token`, `access_token`, `refreshtoken`, `refresh_token`, `apikey`, `api_key`, `jwt`, `service_role_key`.
- `HASHED_ONLY_KEYS` (`redact.ts:27`): `email`, `recipient_email`, `user_email`.
- Cross-ref Infosec `SEC-LOG-001..003` for the residual console.error paths and PII plaintext concerns (UNIT-010 owns those).

## Web-vitals / client errors — CURRENT_SOURCE_CONFIRMED

- `POST /api/internal/client-error` — same-origin + Fetch-Metadata gate, per-IP rate limit 10/min, 16 KiB body cap, hashes UA, writes `client_error_events`.
- `POST /api/internal/web-vitals` — same-origin, 4 KiB cap, allow-list metrics, writes `web_vital_events`.
- Quality Master UNIT-026/027/042..043/058..060 owns the deterministic lifecycle + migration of these reporters.

## Queue / DLQ alert — NEW_OWNER_HERE (finding OPS-QUEUE-DLQ-012)

- **No hosted alert wiring for DLQ depth.** Quality Master owns the queue contract; Infosec owns queue signing; this audit owns the hosted DLQ-depth alert gap.
- Application has no DLQ poller. Operator must inspect dashboard.

## Cron failure alert — NEW_OWNER_HERE (finding OPS-CRON-ALERT-010)

- `cron_run_events` writes one row per branch (source-confirmed).
- **No hosted alert fires on `status:'error'` or missed cron window.**
- Operator must manually inspect.

## Uptime / error-rate alert — NEW_OWNER_HERE (finding OPS-OBS-ALERT-002)

- Application-level `sendOperationalIncidentAlert` (`operational-alerts.ts:196-268`) POSTs to `OPERATIONAL_INCIDENT_ALERT_WEBHOOK_URL` (HTTPS-only) with Bearer token, gated on `OPERATIONAL_INCIDENT_ALERTS_ENABLED=1`.
- Alert scenario catalog `ALERT_SCENARIOS` (`alert-scenarios.ts`) defines S-01..S-07 with target latencies and proof commands.
- **Hosted delivery never exercised.** This is the central hosted-evidence gap (GATE-ALERT-002 in `release-gate.json`).

## Incident declaration / note / status / close — CURRENT_SOURCE_CONFIRMED

- `INCIDENT_SEVERITIES`, `INCIDENT_STATUSES` from `incident-record-core`.
- Events: `incident_declared|incident_note_added|incident_status_changed|incident_closed`.
- Durable incident ledger: migration `0040_operational_incidents.sql`.

## Webhook delivery — CURRENT_SOURCE_CONFIRMED + EVIDENCE_BLOCKED

- Single webhook target.
- Outcomes: `delivered|skipped(reason: disabled|local_scope|not_configured|missing_token|invalid_url)|failed(reason: webhook_rejected|request_failed|unsafe_payload)`.
- Payload safety: `operationalIncidentAlertPayloadPathSafe` rejects storage paths, filenames, `component-attachments/`, signed URLs, bearer tokens, cookies, invite/share tokens.
- **Delivery to the actual sink**: EVIDENCE_BLOCKED under AUTH-001.

## Escalation — NOT PRESENT

- No escalation chain defined. Single webhook target.

## Alert ownership — CURRENT_SOURCE_CONFIRMED

- Application code: `src/lib/observability/operational-alerts.ts`.
- No operator-side ownership document (runbook gap).

## Noisy / false-positive behavior — NOT EVALUATED

- Hosted logs not available; cannot evaluate false-positive rate.

## Evidence retention — CURRENT_SOURCE_CONFIRMED

- `DEFAULT_UPLOAD_RETENTION_POLICY.auditEventRetentionDays = 365` (`uploads/cleanup.ts:87`).
- Other classes: failed 7d, deleted 30d, expired 1d.
- DSAR: migration `0033_privacy_request_register.sql`.
- Hosted Workers Logs retention: EVIDENCE_BLOCKED (finding OPS-OBS-RETENTION-011).

## Failure when observability itself is down — finding (recovery-scenario-matrix "Alerting outage")

- If the webhook sink is unreachable or token invalid, alerts silently fail.
- Worker continues operating; observability loss is not fail-closed for the app, only for detection.
- Mitigation: periodic synthetic alert + dashboard inspection cadence (operator ritual).

## Audit commands (read-only, available) — NOT ALL RUN THIS SESSION

- `bun run ops:check-incidents` (READ_ONLY_LOCAL — incident records)
- `bun run ops:check-alert-scenarios` (READ_ONLY_LOCAL — scenario catalog)
- `bun run ops:check-observability` (READ_ONLY_LOCAL — proof JSON)
- `bun run ops:collect-workers-logs-proof` (READ_ONLY_PROVIDER — AUTH-001)
- `bun run ops:verify-observability-alert -- --scenario <name>` (READ_ONLY_PROVIDER — AUTH-001; **key recovery action for GATE-ALERT-002**)
- `bun run launch:check-observability` (READ_ONLY_LOCAL)
