# Retention Schedule (DRAFT — P1.8)

**Status:** DRAFT. Treat as counsel-input material, not policy. Final TTLs require OPEN-DEC-004 sign-off.
**Source plan:** `.ai/03_plans/000-Follow Ups/2026-07-04-Security-Compliance-Followups.md` (P1.8)
**Enforcement code:** `src/lib/compliance/retention-repository.ts` (DEFAULT_RETENTION_RULES)
**Audit table:** `data_retention_events` (migration `0034_data_retention_events.sql`)
**Cron:** `30 3 * * *` (daily 03:30 UTC), wired in `worker.ts` scheduled()

**Local engineering evidence (2026-07-05):** `tests/vitest/compliance-retention-repository.test.ts` (5 tests pass) verifies the retention rule registry uses Cloudflare D1-supported positional binds, dry-run mode does not delete rows or write audit events, apply mode records retention events, and audit metadata stores aggregate counts rather than samples of purged row IDs.

**Boundary:** The local engine currently enforces the implemented rule subset in `DEFAULT_RETENTION_RULES`. The full per-class TTL policy, DSAR erasure propagation, and 30-day hosted cron/D1 observation remain blocked on OPEN-DEC-004 and operations proof.

## Industry defaults applied

These TTLs reflect common SaaS industry practice and the principle of data minimization (GDPR Art. 5(1)(c) + Philippine DPA IRR §11(c)). Counsel should adjust per jurisdiction-specific statutory minimums and any client contractual requirements.

## Per-class TTL registry

| Class | TTL (days) | Action | Rationale | Counsel note |
|---|---|---|---|---|
| `account_security_events` | 365 | purged | Industry default for auth audit logs. 1 year covers annual security review cadence. | NPC IRR §21(f) requires "reasonable" retention; 1y is reasonable. |
| `account_audit_legacy_sha256` | 180 | purged | Faster purge for pre-P0.6 plain SHA-256 rows (treated as pseudonymous personal data). | If considered personal data under DPA, shorter is safer. |
| `collaboration_audit_events` | 365 | purged | Audit trail for who-did-what in shared workshops. | Same as account security events. |
| `ai_action_runs` | 365 | purged | AI feature deferred; when enabled, holds prompt/response summaries. | Hold for abuse-investigation window. |
| `ai_tool_calls` | 365 | purged | Same. | Same. |
| `ai_data_access_events` | 365 | purged | Same. | Same. |
| `shared_link_events` | 90 | purged | Short TTL — these are page-view beacons for shared proposals. 90 days covers a proposal decision cycle. | Public-link recipients have no account; their data is minimal. |
| `estimate_sheet_events` | 365 | purged | Edit history for estimate sheets. 1 year. | If estimate becomes a contract, longer may be required — counsel to advise. |
| `privacy_requests_completed` | 2555 (~7y) | purged | DSAR requests themselves are compliance evidence. | Default 7y per common enterprise policy; NPC may require different. |
| `privacy_requests_rejected` | 365 | purged | Rejected requests are evidence of triage decisions. 1 year. | Counsel to advise on the rejection-appeal window. |
| `logs_worker_observability` | 3 | platform-managed | Cloudflare Workers Logs on Workers Free. Current platform TTL is 3 days / 200k written events per day; longer retention/export needs Workers Paid + Logpush/Tail Workers or another approved destination. | Not a D1 deletion rule; first-24h incident review must capture evidence before the short RCA window closes. |
| `logs_email_delivery` | 90 | purged | Email delivery logs (Cloudflare Email). 90 days covers support investigations. | Counsel to advise on retention for transactional email. |
| `uploads_orphaned` | 30 | purged | Orphaned uploads (no associated record). 30 days is grace period. | Aligns with upload-cleanup cron (`0 3 * * *`). |
| `sessions_expired` | 30 | purged | Expired Better Auth sessions. 30 days. | Platform-managed; this row records acceptance. |
| `operational_incidents` | 2555 (~7y) | purged | Durable sev1/sev2/sev3 incident lifecycle records and RCA evidence. | D1 table added by migration `0040`; final TTL remains counsel-gated under OPEN-DEC-004. |
| `operational_incident_events` | 2555 (~7y) | purged | Incident declaration/status/escalation/note/closure history. | D1 table added by migration `0040`; keep redacted and low-volume. |

## Class-action matrix

| Action | When to use |
|---|---|
| `purged` | Hard delete. Default for audit logs after TTL. |
| `tombstoned` | Soft-delete marker for user-facing records (e.g., projects, estimates). The record stays but is hidden. |
| `anonymized` | Replace PII fields with hash/null. Used for analytics aggregations. |
| `soft_deleted` | Mark `deleted_at` timestamp; hard delete later. Used for DSAR erasure requests. |
| `skipped_legal_hold` | Row under legal hold; cron records skip with reason. |

## DSAR erasure propagation

When a DSAR erasure request is completed (status = `completed` in `privacy_requests`), the response should propagate to:
- `users` table — soft-delete (mark `deleted_at`)
- `account_security_events` — anonymize `user_id` (replace with `erased:<request_id>`)
- `estimate_sheet_events` — keep row, anonymize actor fields
- `collaboration_audit_events` — keep row, anonymize actor fields
- R2 uploads owned by the user — tombstone metadata, keep file for 30 days then purge
- `privacy_requests` itself — keep the request row as evidence

This propagation logic is **NOT yet implemented**; it is tracked as a separate follow-up tied to P1.8 acceptance criteria. The retention cron does not perform DSAR propagation; that is a discrete operation triggered by the privacy-request triage workflow.

## Counsel review checklist (for OPEN-DEC-004 sign-off)

- [ ] Are 365-day audit log TTLs consistent with Philippine DPA IRR recordkeeping expectations?
- [ ] Should estimate_sheet_events have a longer TTL (e.g., 7 years) because estimates become contracts?
- [ ] Are 90-day shared_link_events TTLs adequate given proposal-decision-cycle use?
- [ ] Is the 7-year privacy_requests_completed TTL correct for evidence retention?
- [ ] Should account_audit_legacy_sha256 have a faster purge (e.g., 90 days) since it is pre-P0.6 weak hashing?
- [ ] Any client-contract-specific retention overrides needed (enterprise contracts may specify)?
- [ ] Any sector-specific retention laws that apply to AEC estimate data in PH/SEA?

## Review cadence

After OPEN-DEC-004 sign-off, review this schedule annually or whenever:
- A new data class is added to the schema
- A new processor is added (processor register change)
- A jurisdiction expansion occurs (new market entry)
- A client contract requires different retention
- A breach or audit finding suggests a different TTL
