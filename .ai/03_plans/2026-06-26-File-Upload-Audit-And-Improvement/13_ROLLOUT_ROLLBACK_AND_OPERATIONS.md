# Rollout Rollback And Operations

## Rollout Strategy

Use flags and dual-write to avoid breaking active work.

### Stage 1 - Tests And Authz Hardening

- Add missing tests and explicit project edit authz.
- Add component image/attachment edit authz and direct-storage bypass containment.
- Add estimate-row project-component image authz/projection coverage so the inline modal does not remain a hidden bypass.
- Capture provider-backed storage denial proof or block release.
- Freeze attachment approval/download/use until scan-clean or audited override exists.
- Enable temporary closed-beta upload rate limits and active-session caps.
- No user-facing change expected.
- Rollback: do not reopen broad direct writes. If authz blocks legitimate editors, fix the permission predicate or use a narrowly scoped server route. A signed-session exception is allowed only if the full finalization/proof minimum already exists.

### Stage 2 - Upload Broker Shadow Mode

- Routes call broker validators/providers but return current response shape.
- Write upload asset/session records in shadow/dual mode.
- Rollback: route continues using legacy fields; asset records can be ignored.

### Stage 3 - UI State Migration

- Replace one surface at a time: project image create/edit, component image, estimate-row project-component image, attachments.
- Keep old route contracts until all callers migrated.
- Rollback: feature flag back to old UI component for that surface.

### Stage 4 - Scan And Download Gate

- Enable quarantine/scanning for new attachments.
- Existing approved/current attachments must be scan-backfilled, quarantined, or blocked from download/use until `clean` or audited `override_approved`.
- Rollback: freeze attachment approval/download or disable the affected feature. Do not weaken scan enforcement or expose pending/failed/unsupported/infected files.

### Stage 5 - Storage Policy Tightening

- After Phase 0 direct-write closure, broker migration, and storage proof pass, remove remaining direct write/update/delete paths not backed by upload sessions.
- Rollback: restore prior policies only as a time-boxed emergency compatibility exception, never for reviewed attachments or unscanned documents, and keep monitoring plus explicit owner/security signoff.

### Stage 6 - Provider Portability And Cleanup

- Enable cleanup job and dashboards.
- Move canonical render/download logic to resolver.
- Run provider migration dry-run if considering new provider.

## Operational Runbooks

### Upload Outage

1. Check upload error dashboard by surface and provider.
2. Confirm auth/session failures vs storage provider failures.
3. If provider failure, disable large/signed uploads first and keep small server-mediated uploads if healthy.
4. Communicate retryable status in UI.
5. Verify no sessions are stuck in finalizing.

### Scan Backlog

1. Check scan queue age and failure rate.
2. Keep downloads/approval blocked for pending/failed scans.
3. Requeue transient scan failures.
4. If scanner is down, allow only explicit admin override if product/security accepts the risk and event is audited.

### Upload Abuse Or Quota Pressure

1. Check rate-limit, active-session, rolling-byte, and scanner-backpressure dashboards by actor/workspace/surface.
2. Confirm whether denials are expected user behavior, automated abuse, or provider/runtime degradation.
3. Tighten caps or pause upload-session issuance for affected surfaces before storage or scanner queues grow.
4. Keep current saved assets accessible; do not delete or block unrelated clean assets.
5. Record quota changes, duration, and affected workspace/user scope in audit/ops notes.

### Orphan Cleanup Backlog

1. Check `upload_assets`/`upload_sessions` orphan counts and cleanup failures.
2. Retry idempotent deletes.
3. Do not delete attached/current-approved assets.
4. Escalate repeated provider delete failures.

### Storage Policy Incident

1. Disable direct client write policies or affected signed-session issuance.
2. Rotate exposed provider keys if any credential is involved.
3. Search upload events for suspicious writes.
4. Quarantine unfinalized objects until validated.

### Audit Event Access Incident

1. Disable affected audit read RPCs or admin UI access.
2. Confirm `upload_events` RLS/grants deny anon, viewer, and cross-workspace access.
3. Preserve append-only audit rows and export only redacted evidence.
4. Rotate any exposed signed URL or provider credential if logs show leakage.

### Malware Found After Approval

1. Mark the asset `infected` or `failed_permanent` and immediately block download/current/proposal use.
2. Identify every component, project, proposal, and export that referenced the asset.
3. Revoke future read URL issuance; remove/quarantine the object where policy requires.
4. Notify affected internal users and record incident evidence.
5. Require clean replacement or documented admin/security override before reuse.

### Public Or Signed URL Exposure

1. Stop issuing new URLs for the affected asset/session.
2. If the object should not be public, move/delete/rotate the object key and invalidate any controlled cache layer.
3. Record that already-issued signed URLs may remain usable until expiry unless the object is removed.
4. Audit access events and domain references for unauthorized exposure.
5. Backfill asset visibility and privacy decision records before reenabling publication/download.

## Rollback Principles

- Roll back UI separately from route/data changes.
- Prefer disabling a new upload surface over weakening tenant isolation.
- Never roll back malware scan gates by exposing unscanned attachments publicly.
- Keep audit events even if a feature flag is disabled.
- Preserve old object metadata until new asset references are verified.

## Operational Evidence Required

- Dashboard links or local metric proof for upload success/error/duration.
- Scan queue dashboard or query.
- Cleanup backlog query.
- Rate-limit/quota/backpressure dashboard or query.
- Storage RLS proof output.
- Upload-domain table RLS/grant proof output.
- Runbook tested with at least one simulated provider/storage failure.
