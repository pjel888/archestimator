# Retention, Deletion, and Legal Holds

## Current-state grounding

- **Schedule (DRAFT):** `.ai/10_state/compliance/retention-schedule.md` — documents 17 classes,
  counsel-gated on OPEN-DEC-004.
- **Engine:** `DEFAULT_RETENTION_RULES` in `src/lib/compliance/retention-core.ts:87`.
- **Audit trail:** `data_retention_events` (`migrations/0034`, rebuilt `0040`).
- **Cron:** `30 3 * * *` daily, wired in `worker.ts` scheduled().

## Enforcement coverage gap (critical)

The engine enforces **10 of the 17 documented classes**. Three classes are platform-managed
and documented as accepted (`logs_worker_observability`, `logs_email_delivery`,
`sessions_expired`) and one is cleanup-cron-backed (`uploads_orphaned`). The **5 unenforced
D1 classes that need rules** are:

| Class | Documented TTL | Action | Enforcement status |
|---|---|---|---|
| `ai_action_runs` | 365d | purged | **NOT enforced** — no rule in `DEFAULT_RETENTION_RULES` |
| `ai_tool_calls` | 365d | purged | **NOT enforced** |
| `ai_data_access_events` | 365d | purged | **NOT enforced** |
| `operational_incidents` | 2555d (~7y) | purged | **NOT enforced** |
| `operational_incident_events` | 2555d (~7y) | purged | **NOT enforced** |

Additionally, these inventoried tables have **no retention class at all** (see
`25_D1_DATA_SYSTEM_INVENTORY.md`) and need one assigned: `privacy_requests` in-flight states,
`admin_audit_events`, `support_conversations`/`support_messages`, `client_portal_*` analytics
and audit, `client_error_events`, `web_vital_events`, `cron_run_events`, `ops_run_events`,
`beta_feedback_submissions`, `notification_deliveries`, `component_library_telemetry_events`,
`security_rate_limit_events`, `collaboration_invitations` (expired), `closed_beta_allowed_emails`.

## Objective

Replace arbitrary TTLs with a purpose-based, approved retention schedule enforced consistently
across primary stores, processors, caches, files, logs, and backups.

## Retention Schedule Fields

data class; processing purpose; retention trigger; active period; archive period; deletion or
anonymization method; legal basis; legal-claim rationale; processor deletion behavior; backup
behavior; hold eligibility; approver; review date.

## Lifecycle States

`active, archived, soft-deleted, retention pending, legally held, anonymized, purged,
processor deletion pending, backup aging, deletion complete.`

## Soft Delete Rule

Soft deletion is not final erasure. Every soft-deleted record must have: a purge deadline;
restore authority; hold evaluation; user disclosure; final deletion job; deletion evidence.

## Legal Holds

Three mechanisms exist today and must be unified or at least cross-referenced by a single
legal-hold service:

- `activity_event_legal_holds` (`0065`) — workspace-scoped, one active hold per
  `estimate_sheet_events` row; respected by the `estimate_sheet_events` retention rule.
- `beta_activation_retention_holds` (`0067`) — per-user/workspace; respected by
  `beta_activation_events` and `beta_activation_outbox` rules.
- `data_retention_events.action='skipped_legal_hold'` — audit trail of skips.

Legal holds must: identify scope and legal reason; be authorized; record start and review
dates; suspend only relevant deletion; prevent silent indefinite retention; support release;
be auditable; avoid exposing sensitive legal detail to unauthorized users.

## Anonymization Validation

Anonymization is valid only where re-identification is not reasonably possible. Test against:
linkage through project IDs; unique timestamps; event descriptions; actor sequence; membership
history; logs; email metadata; exports; backups. (e.g., `estimate_sheet_events` actor
anonymization sets `actor_user_id = 'anonymized-activity-actor'` — verify this cannot be
re-linked via `changed_fields`/`old_snapshot`/`new_snapshot`.)

## Cron and Failure Handling

Retention jobs must: support dry run; produce counts; record failures; alert on repeated
failure; be idempotent; process bounded batches; preserve legal holds; expose compliance health
in admin; include reconciliation against expected aged records.

## Counsel review checklist (OPEN-DEC-004)

Carried from `.ai/10_state/compliance/retention-schedule.md`: confirm 365-day audit TTLs vs PH
DPA IRR; confirm whether estimate events need 7-year contract retention; confirm 90-day
shared-link TTL; confirm 7-year privacy-request evidence TTL; confirm faster legacy-sha256
purge; sector-specific AEC retention; client-contract overrides.
