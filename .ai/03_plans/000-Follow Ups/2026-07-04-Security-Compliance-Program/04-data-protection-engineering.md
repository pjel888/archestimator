# 04 — Data Protection Engineering

**Source:** Owner analysis Section 3
**Codes:** [HASH-HMAC], [OBS-GOV], [RETENTION]

---

## 4.1 Why lifecycle control is the strongest missing area

Archestimator handles:
- Estimate / project data
- File uploads (R2)
- Shared links + recipient email addresses
- Comments and decisions on shared proposals
- Analytics
- Account events / audit logs
- Security events
- Error diagnostics

That makes **retention and deletion as important as encryption.** A breach of a 5-year-old audit log containing pseudonymous IP hashes is just as real as a breach of last week's estimate data.

## 4.2 [HASH-HMAC] Telemetry hashing inconsistency

### Current state (verified by explore agent; see `01-current-state-baseline.md`)

| Surface | Hashing model | Status |
|---|---|---|
| **Publication telemetry** (share-link views, recipient opens) | **HMAC-SHA-256** with server-side pepper | Correct. Code documents why bare SHA-256 of IP/user-agent is reversible (rainbow tables). |
| **Account audit events** (`account_security_events`, login/logout/password change) | **Plain SHA-256** of IP + user-agent | **Wrong.** Same reversible-hash risk that publication telemetry already solved. |

### Risk

Plain SHA-256 of low-entropy inputs (IPv4 addresses ≈ 2^32, common user-agent strings ≈ thousands of distinct values) is reversible via rainbow tables or brute force. If the audit log ever leaks, attackers could deanonymize account activity by mapping hashes back to IPs.

### Target state

1. Migrate account audit hashing to **HMAC-SHA-256** with the same server-side pepper used for publication telemetry
2. Pepper stored in Worker secret store (`wrangler secret put`), not in repo
3. Treat existing plain SHA-256 hashes as **pseudonymous personal data** — they are not anonymous, they are reversible, so GDPR/DPA retention rules still apply to rows hashed with the old method
4. Backfill plan: re-hash on next account event (do not attempt to re-derive old hashes); keep old hashes until their retention TTL expires
5. Document the pepper rotation strategy (rotate at most once per year; rotation invalidates linkage to historical data, which is acceptable for audit deidentification)

### Code touchpoint

Repository helper that inserts into `account_security_events` (and any `*audit*` table that records IP/UA). See file map in `01-current-state-baseline.md`.

**Verified 2026-07-04** — the touchpoint is `src/lib/auth/account-audit.ts`:
- L1: `import "server-only"` (good — server-only boundary)
- L3: `import { createHash } from "node:crypto"`
- L24-26: `hashAccountSecurityValue` — plain SHA-256, the bug
- L39-40: writes `ip_hash` and `user_agent_hash` columns
- L48-51: `recordAccountSecurityEvent` catch block silently swallows all errors — **NEW FINDING (RISK-016)** that P0.6 must address

Reference model (correct pattern) — `src/lib/publication/security.ts`:
- L1: imports `createHmac`
- L78-81: `hashPublicationToken(token, secret)` — HMAC-SHA-256 with server-side pepper
- L212 / L451: same pattern used for cookie signing

### Acceptance

- New rows in `account_security_events` use HMAC-SHA-256 (verify via DB inspection)
- Existing rows remain on plain SHA-256 until retention TTL elapses (document this in `account_security_events` schema comment)
- Pepper is in Worker secret, not env file
- Test: a unit test that verifies two insertions of the same IP produce different hashes when the pepper changes
- **Added 2026-07-04 (RISK-016)**: Pepper-presence startup check raises in production if `ARCHESTIMATOR_AUDIT_HASH_PEPPER` is not set; opaque `audit_write_failed: true` telemetry signal added (does not change the "must not leak provider details" behavior — the catch block stays, but emits an opaque flag before swallowing); unit test verifies pepper-absence raises

## 4.3 [OBS-GOV] Logging / observability privacy governance

### Current state

Cloudflare observability logs and traces are enabled with persistence. Operationally useful. Not yet governance-ready.

**Verified 2026-07-04** (`wrangler.jsonc` lines 82-96):
- `observability.enabled: true`
- `observability.head_sampling_rate: 0.1` (10% of invocations)
- `observability.logs.enabled: true`, `head_sampling_rate: 0.1` (10% log sampling), `invocation_logs: true`, `persist: true`
- `observability.traces.enabled: true`, `head_sampling_rate: 0.05` (5% trace sampling), `persist: true`
- **No `tail_consumers`** configured (the plan's earlier "possibly tail_consumers" was speculative — corrected)

**Implication for retention policy (P2.5)**: with 10% log sampling + 5% trace sampling, the retention policy governs only sampled data. P2.5 must (a) document this sampling posture publicly if it ever becomes a compliance claim, (b) decide whether to retain 100% for security-event windows (e.g., during incident response, temporarily increase sampling), (c) define the retention TTL from the persisted sample date, not the invocation date.

### What governance needs

| Property | Required state |
|---|---|
| **Retention period** | Per-class: e.g., 30 days for raw logs, 90 days for traces, 1 year for security event logs |
| **Redaction rules** | PII patterns (email, IP for non-pseudonymous use) redacted at ingestion; allowlist of fields that may appear in logs |
| **Access controls** | Need-to-know basis; access logged; review quarterly |
| **Incident review** | Suspicious patterns trigger alerts; review SLA defined |
| **Deletion / anonymization** | Automated job that drops/anonymizes records at TTL boundary |

### Target state

- Add a `logs/redaction-rules.md` artifact under `.ai/11_skills/operations/`
- Define allowlist of fields safe to log (e.g., `request_id`, `route`, `status`, `latency_ms`, `workspace_id` — but NOT `email`, raw `ip`, raw `user_agent`)
- Configure Cloudflare Logpush (if not already) with redaction at the edge
- Quarterly access review documented

### Owner

Operations + engineering

## 4.4 [RETENTION] Retention schedules

### Why this matters

The current Privacy page says minimal legal/audit records may be retained/anonymized "subject to review" — too vague for GDPR/DPA readiness. Every data class needs a concrete TTL.

### Target schedule (proposed — requires `OPEN-DEC-004` counsel review)

| Data class | Example tables / stores | Proposed retention | Rationale |
|---|---|---|---|
| **Account data** (active) | `account`, `session` | While account is active + 30 days post-deletion request | DSAR window |
| **Workspace data** | `workspace`, `workspace_member` | While workspace is active + 90 days post-deletion | Collaborator notification window |
| **Project / estimate records** | `project`, `estimate`, `estimate_node`, `estimate_row_item` | While account is active; deleted on DSAR after export | User-owned content |
| **Shared links** (publication tokens, recipients) | `project_publication`, `shared_link_recipient` | Until publication revoked + 1 year for audit | Audit / abuse response |
| **Upload assets** (R2 objects) | `variant_attachments`, R2 objects | Same TTL as parent record; deleted with parent | Data minimization |
| **Comments / decisions** | `shared_link_comments`, `shared_link_responses` | Same as shared link | Lifecycle alignment |
| **Legal acceptance records** | `legal_acceptance`, `terms_acceptance` | 7 years (contract / tax evidence) | Statutory minimums |
| **Security events** | `account_security_events`, `collaboration_audit_events` | 1 year active, then anonymized | Incident investigation |
| **Analytics** | `publication_events` (HMAC hashed) | 18 months | Trend analysis; then aggregate |
| **Backups** | Daily D1 backups | 30 days rolling | Recovery window (free-tier posture) |
| **Queues / DLQ** | `UPLOAD_JOBS_QUEUE`, DLQ | Until job completes + 7 days for DLQ review | Failure triage |
| **Logs** | Cloudflare observability | 30 days raw, 90 days traces | Operational debugging |
| **Deleted-user remnants** (foreign keys, references) | Various | Tombstoned at DSAR; purged at parent TTL | Referential integrity |

### Enforcement

- Cron jobs for each TTL boundary (extend existing `0 3 * * *` and `15 3 * * *` cron schedule)
- Each cron writes an audit row to `data_retention_events` (new table — schema in P1.8)
- DSAR soft-delete marks a row with `deleted_at`; hard-delete cron purges when TTL elapses

### Approval gate

`OPEN-DEC-004` — counsel reviews statutory minimums (especially for legal acceptance records and security events).

## 4.5 Out of scope for this section

- Cryptographic key management — covered by future ASVS V2.4 / V8 work
- Database backup encryption — Cloudflare-managed; outside P0/P1 scope
- DPA / processor security audits — covered by `03-gdpr-and-philippine-dpa-gaps.md` §3.4.3
