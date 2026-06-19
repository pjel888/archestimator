# DSAR Manual Request UX Runbook

Date: 2026-06-19. This is the minimum user-facing operating model until self-serve
delete/export exists. It does not implement the erasure RPC.

## User-facing promise

Minimum acceptable wider-beta copy:

- Users can request account deletion or data export by contacting support.
- Archestimator acknowledges requests within the stated SLA.
- Archestimator fulfils eligible requests within the stated fulfilment SLA.
- Some security, billing, abuse-prevention, or legal records may be retained for the
  stated retention window, then deleted or anonymized.
- Self-serve deletion/export is not currently promised.

## Support states

| State | Support action | User copy requirement |
|---|---|---|
| Received | Log requester, channel, request type, date, and subject user id if known. | "We received your request and will review it within <SLA>." |
| Identity proof needed | Ask for the minimum proof needed to match the account. | "We need to verify that you control this account before changing data." |
| Accepted for dry run | Run count-only manifest. | No user-facing row counts unless needed; keep internal. |
| Fulfilment scheduled | Pick commit window and backup/recovery posture. | "Your request is scheduled for processing." |
| Fulfilled | Confirm export delivered or erasure/anonymization completed. | State retained categories if any. |
| Denied/deferred | Record legal/identity reason. | Give reason and next available step. |

## Required internal artifacts

- Request record with timestamp, requester, request type, owner, and status.
- Count-only `p_dry_run=true` manifest before destructive action.
- Optional outer-transaction mutating rehearsal evidence when needed.
- Final before/after count summary.
- Owner sign-off for any retained data category.

## UI and copy acceptance

- `/privacy`, `/terms`, and workshop settings must use the same SLA and contact path.
- Copy must not imply self-serve capability until the action exists.
- Mobile text must be readable without horizontal scrolling.
- Any future self-serve danger-zone UI must have confirmation, cancellation, pending,
  completed, failed, and identity-proof-needed states before implementation.

