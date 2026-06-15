# Release Operator Runbook

## Goal

Give the operator a safe way to create, verify, reissue, expire, or roll back release/version announcement notifications after the feature exists.

## V1 Creation Path

V1 implementation proof path: deterministic local/test fixtures only.

Real beta release path after owner approval: seed migration or server-only operator script that creates one definition and fanout delivery rows for signed-in beta users only. No browser client creates definitions or delivery fanout rows.

Minimum announcement fields:

- `kind = 'release_announcement'`
- `surface = 'modal'`
- `title`
- `body`
- `release_version`
- `priority`
- `starts_at`
- `expires_at`
- optional `action_label`
- optional internal `action_href`
- `payload_json = { "schemaVersion": 1, "releaseVersion": "<version>" }`

V1 `action_href` must be null, `/workshop`, or a `/workshop/...` child path. The database check and static seed tests must reject external URLs, protocol-relative URLs, `javascript:`, `/share` paths, encoded slash/backslash bypasses, and whitespace.

## Fanout Rules

Allowed V1 targets:

- Real beta fanout after owner approval: `public.profiles` rows whose normalized email appears in `public.closed_beta_allowed_emails` with `status in ('invited','active')`.
- Current authenticated user for test-only local fixture path.
- Specific user ids only in local/test fixtures.

Not allowed without new approval:

- Public share recipients.
- Anonymous users.
- Email/SMS/browser push.
- All historical auth users without beta status review.

Fanout SQL shape:

```sql
select profiles.id
from public.profiles profiles
join public.closed_beta_allowed_emails beta
  on beta.normalized_email = lower(btrim(profiles.email))
where beta.status in ('invited', 'active');
```

## Reissue Rules

Reissue when the user should see an announcement again:

- Create a new `notification_definitions` row with a new `dedupe_key` or release version.
- Insert delivery rows for intended users.
- Keep old rows for audit unless owner approves cleanup.

Do not reuse the same delivery row to force a second modal unless the behavior is intentional and documented.

## Bad Content Rollback

If announcement copy/action is wrong:

1. Set `expires_at = now()` on the bad definition.
2. Hide UI by feature flag if modal has already reached users.
3. Mark affected deliveries dismissed only when the announcement must disappear from centers.
4. Create a corrected definition and delivery fanout only if users need a new modal.
5. Record the incident in `.ai/05_logs/<date>-notification-system-release-incident.md`.

## Monitoring Checklist

During a release smoke:

- Signed-in workshop loads.
- Modal appears once.
- Close/acknowledge persists.
- Reload does not show same modal.
- Notification center contains the release item.
- Unread badge matches read state.
- No notification action errors in server logs.
- Browser console has no notification errors.
- No sensitive payload appears in logs.

## Operator Non-Goals

- No provider setting changes.
- No email provider changes.
- No DNS changes.
- No PITR/cost posture changes.
- No production seed before owner approval.
- No linked production typegen before the notification migration is applied to the linked target with owner approval.

## Incident Escalation

Create `.ai/15_Bugs/<date>-notification-system-release-incident.md` if:

- Wrong users receive a notification.
- Cross-user visibility is suspected.
- Modal loops after acknowledgement.
- Public share or signed-out pages show authenticated notification UI.
- Release content contains sensitive data.
