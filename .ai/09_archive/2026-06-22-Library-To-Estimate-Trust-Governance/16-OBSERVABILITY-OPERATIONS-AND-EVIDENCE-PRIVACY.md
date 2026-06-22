# Observability, Operations, And Evidence Privacy

This document closes the operational and privacy gaps around runtime metrics,
rollout, kill switches, evidence artifacts, and release reporting.

## Runtime Metric Dictionary

Metrics are allowlist-based and privacy-safe. They may use enums, booleans,
counts, timings, result-count buckets, byte-size buckets, retry counts, and
opaque IDs already permitted by the app's telemetry policy. They must not include
raw names, source URLs, filenames, storage paths, review prose, SQL row dumps, or
signed URL values.

| Event | Required fields | Forbidden fields |
| --- | --- | --- |
| `library_estimate_insert_attempted` | sourceType, freshnessTier, lifecycle, hadAcceptedCost, hadAttachment, targetKind, cacheState, result. | component name, row text, source URL, confidence prose. |
| `library_estimate_replace_attempted` | sourceType, warningCount, highestSeverity, expectedRevisionPresent, result, rollbackOccurred. | row name, source URL, notes. |
| `library_sidebar_query_completed` | queryShape, sourceTab, resultCountBucket, payloadByteBucket, cacheHit, durationMs. | raw search text, component names. |
| `library_cache_invalidated` | mutationKind, keyShape, refetchType, fanoutCount, workspaceScoped boolean. | raw query key values beyond approved opaque IDs. |
| `library_mutation_retry` | mutationKind, attemptNumber, backoffBucket, terminalResult. | error stack with private payloads. |
| `cost_governance_action` | action, fromStatus, toStatus, wasLocked, conflictOccurred, durationMs. | review note, lock reason, supplier free text. |
| `attachment_review_action` | action, fileKind, sizeBucket, status, durationMs. | filename, storage path, signed URL. |
| `attachment_signed_url_issued` | attachmentId opaque, actorRoleBucket, reasonCode, ttlSeconds, denied boolean. | signed URL, bucket/path, filename. |
| `workspace_switch_discarded_response` | queryShape, mutationKind, discarded boolean. | previous workspace data. |

## Performance And Reliability Signals

| Signal | Threshold for investigation | Evidence |
| --- | --- | --- |
| Sidebar first page provider-adjacent p95 | > 500 ms at 5,000 Library items. | QA-020, SQL-006A. |
| Filter next page p95 | > 300 ms at 5,000 Library items. | QA-020. |
| Browser keystroke-to-paint p95 | > 150 ms desktop or > 250 ms mobile at 5,000 Library items. | Browser proof when real UI responsiveness is claimed. |
| Cache invalidation fanout | More than the documented max for the mutation. | QA-006, QA-020. |
| Retry attempts | More than 3 automatic attempts or retries on 4xx auth/scope failures. | QA-011, QA-020. |
| Signed URL TTL | Greater than the configured max in `09`. | QA-021. |
| Unauthorized governance attempt | Any successful unauthorized mutation. | SEC-3, SEC-6, SEC-9. |

## Rollout And Kill Switches

| Capability | Rollout control | Disable behavior |
| --- | --- | --- |
| Compare-before-replace | UI feature flag or narrow component gate. | Fall back to existing insert/replace only if stale/archived silent commit risk is not introduced; otherwise keep replacement disabled. |
| Sidebar source taxonomy | Component-level gate. | Keep old sidebar but hide unproven Project/Templates source actions. |
| Cost governance queue | Admin-only route/control. | Hide queue/actions; preserve DB data and warnings. |
| Attachment approval | Admin-only action controls. | Hide approve/supersede; keep upload/download denial rules. |
| Signed URL issuance | Server route/action guard. | Return denial; do not expose raw path. |
| Telemetry events | Emission allowlist. | Drop event entirely rather than emit raw fields. |

Durable DB writes are fix-forward after migration. Disable UI paths before
dropping columns, deleting events, or deleting storage evidence.

## Evidence Privacy Contract

The `_evidence/` folder lives under `.ai/`, which is shared through Git. Treat it
as a privacy sink.

Evidence must not contain:

- Raw signed URLs or query strings.
- Raw source URLs.
- Storage bucket/path values.
- Original filenames.
- Customer, project, supplier, user, or component names from real data.
- Review notes, lock reasons, comments, confidence prose, or SQL row dumps.
- Provider tokens, `.env` values, session cookies, service-role keys, or private
  connection strings.

Evidence should use:

- Redacted examples.
- Boolean assertions.
- Counts and status summaries.
- Opaque IDs only when necessary and safe.
- SQL aggregate results rather than row dumps.
- Sample telemetry payloads with placeholder values.

## Evidence Audit

Before final completion, run or manually perform an evidence audit. The audit
must check for:

- `http://` and `https://` raw URL leakage, except redacted placeholders.
- `?token=`, `signature=`, `X-Amz-`, or similar signed URL markers.
- Storage bucket/path strings such as `component-attachments/` with real object
  paths.
- `.env`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, and provider key names.
- Raw filenames with extensions from real uploads.
- Review prose markers such as `review_note`, `lock_reason`, or copied SQL row
  dumps.

Record the audit result in `_evidence/U7-release-evidence.md` or the final
implementation report.

## Release Report Required Sections

- Current baseline reconciliation date and commands.
- Units completed by U-ID.
- Beta cutline status: beta reuse foundation, full governance, or partial internal progress. Partial is not a release-ready claim unless the beta or full-governance gates in `13` and `17` are satisfied.
- Files changed and file-lock ledger status.
- Evidence artifacts and redaction audit result.
- Commands run, with pass/fail.
- Browser/provider/manual proof skipped with `SKIP-WITH-RISK`.
- Migration applied, SQL probes run, generated types refreshed, and fix-forward
  notes if durable data changed.
- Remaining release NO-GO items, explicitly distinguishing this pack from older
  Library page proof.
