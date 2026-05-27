# 04 - Data, Security, And Permissions Plan

Controlling note: `12-security-data-rpc-threat-model.md` is the data/RPC/security authority. This file is first-pass security context.

## Existing Data Model To Preserve

Keep the current project/sheet collaboration model:

- `project_members` is the durable project access table.
- `estimate_sheet_members` is the sheet-specific override table.
- `estimate_sheet_access_settings` controls inheritance.
- `collaboration_invitations` records pending invite lifecycle.
- `apply_pending_collaboration_invitations(target_user_id, target_email)` applies pending email-bound invitations for new auth users.

Security caveat: `apply_pending_collaboration_invitations` is write-capable and `security definer`. Before exposing any public invite route, implementation must prove this function is not executable by `anon` or ordinary `authenticated` clients with arbitrary arguments. It must be trigger/service-only, while narrow acceptance RPCs validate `auth.uid()`, JWT email, token hash, expiry, revocation, and invitation id in one transaction.

## Required Invitation Token Extension

Add the child table `collaboration_invitation_tokens` and lifecycle fields on `collaboration_invitations` with these concepts:

```txt
token_hash text not null
token_hint text null
delivery_method text check in ('email', 'copy_url')
last_sent_at timestamptz null
last_opened_at timestamptz null
accepted_via text null
```

Required:

- Store only `token_hash`, never raw tokens.
- Generate at least 32 random bytes, base64url encoded.
- Hash with SHA-256 plus the required server-only invite token pepper before database RPC calls.
- Keep `expires_at`, `revoked_at`, `accepted_at`, and `invited_user_id` as the lifecycle authority.
- Preserve active unique constraints by project/email/scope and estimate/email/scope using a materialized lifecycle state so expired rows do not block reissue.

## Email-Bound Invite Rule

V1 invite links are email-bound.

Acceptance requires:

- valid token;
- invite not expired;
- invite not revoked;
- invite not accepted by another user;
- authenticated user email matches `collaboration_invitations.email`, unless a later approved generic request-link flow exists.

This prevents copied links from silently adding arbitrary accounts.

Do not treat "invitation row exists" as "recipient accepted." Existing-user direct grants should be represented distinctly from invite acceptance.

Required lifecycle states:

```txt
pending
direct_granted_existing_user
accepted_by_recipient
revoked
expired
```

The action path may add existing users immediately, but direct grant does not set recipient-click `accepted_at`. Recipient-click acceptance is set only by the invite route/RPC.

## Copy URL Rule

For v1, "copy URL" means copying the email-bound invitation URL for the selected invited email. It does not mean "anyone with this link can join".

Future generic request links need a separate plan with:

- requester identity capture;
- owner approval queue;
- rate limits;
- audit events;
- no automatic project membership.

## Access Application

Project-scope invite:

- upsert `project_members(project_id, workspace_id, user_id, role, added_by)`;
- on conflict, keep the higher role by `collaboration_role_rank`;
- mark matching invitation `accepted_at` and `invited_user_id`.

Estimate-scope invite:

- upsert `estimate_sheet_members(estimate_id, project_id, user_id, role, added_by)`;
- keep the higher role on conflict;
- mark matching invitation accepted;
- ensure the project becomes visible in `/workshop/projects` as sheet-only or shared access.

## Anti-Enumeration Rules

- Invalid tokens must not reveal whether a project, email, or invitation exists.
- Expired and revoked states can be shown only after a valid token hash match.
- Email mismatch can show the invited email only after a valid token hash match.
- Do not put raw email, project id, or role in the token itself.
- Do not expose service-role failures to the client.
- Manager pending-invite reads exclude expired invitations from active pending lists and render expired rows only in an explicit expired state when that state is shown.

## RLS And Service Boundaries

- Token resolution is server-only.
- Browser clients do not query `collaboration_invitations` by token.
- Keep manager checks in server actions and database policies.
- Keep `project_members` and `estimate_sheet_members` writes protected by `can_assign_project_role`, `can_assign_estimate_role`, and manager rank checks.
- Invite acceptance can use a dedicated security-definer RPC that validates token hash, email, expiration, revocation, and lifecycle in one transaction.

Required RPCs:

```sql
public.resolve_collaboration_invitation(token_hash text)
public.accept_collaboration_invitation(token_hash text)
public.revoke_collaboration_invitation(invitation_id uuid)
```

`resolve` should return only a bounded preview. `accept` should perform the membership write and lifecycle update atomically.

Required grant posture:

```sql
revoke all on function public.apply_pending_collaboration_invitations(uuid, text) from anon, authenticated;
```

If a callable accept RPC is added, grant only that narrow function to `authenticated`, and keep its validation entirely server/database-side.

## Audit Events

At minimum, record:

- invite created;
- invite resent or copied;
- invite opened;
- invite accepted;
- invite expired during acceptance attempt;
- invite revoked;
- wrong-account attempt;
- already-member acceptance attempt.

Do not store raw invite tokens, magic links, auth callback codes, service-role details, or provider payloads in audit metadata.

## Abuse Controls

- Limit invite sends per project per time window.
- Avoid regenerating active tokens on every copy action unless explicitly refreshing the invite.
- Expire project invitations after 14 days by default.
- Make revocation immediate.
- Do not allow viewers or editors to invite above their own rank.
- Preserve "every project needs at least one owner or admin" constraints.
