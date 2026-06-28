# 13 - Rollout, Rollback, and Operations

## Pre-launch MVP posture

Archestimator is pre-launch. Rollout is still direct: apply migration, merge app code, deploy, smoke. The feature is additive and does not require a feature flag for v1.

## Rollout sequence

1. Apply migration to Supabase project `ebxxqidacheyapmmzavr`.
2. Run `bun run gen:types`.
3. Run targeted SQL proof:
   - fixture recipient sees expected active/expired/revoked rows;
   - non-recipient is denied;
   - function signatures expose no `token_hash`, `encrypted_token`, or `recipient_token_hash`.
4. Merge app code after targeted tests, type-check/lint/build, and static leak checks pass.
5. Deploy through the normal hosting path.
6. Run post-deploy smoke with a fixture recipient: page loads, list renders, disabled rows stay disabled, active Review click creates session and lands on `/share/[raw-token]`.

## Feature flags

None required. If implementation wants a temporary internal gate, use an existing feature-flag pattern and keep it out of the core v1 plan unless the deployment surface requires it.

## Rollback triggers

| Trigger | Action |
|---|---|
| List RPC returns rows to a non-recipient | Halt; fix forward or drop new functions before redeploy |
| Any credential material appears in client payload, DOM, URL, logs, or static assets | Halt; remove leak; rotate affected tokens if exposure reached logs or users |
| Review action cannot establish the existing share session | Disable/hide Review action or revert app code; keep list route if safe |
| `/share/[token]` anonymous flow regresses | Revert app code touching action/cookie paths; investigate scope bleed |
| RPC p95 exceeds 500ms at MVP fixture scale | Inspect query plan; add index/pagination before launch |
| Route 500s for signed-in users | Revert app code; preserve migration if functions are harmless |

## Rollback procedure

### Database

```sql
drop function if exists public.list_recipient_publications_for_current_user(int);
drop function if exists public.authorize_recipient_publication_for_current_user(uuid);
drop index if exists public.shared_link_recipients_lower_email_idx;
```

Then run `bun run gen:types` to remove generated function signatures.

### Application

```bash
git revert <commit-sha>
```

Or manually remove the new route/components/repository/server-function/tests and revert the sidebar/action edits.

### Data loss

No user data is created, updated, or deleted by the migration. Rollback is metadata/code only.

## Monitoring

Watch:

- `/workshop/proposals` route 5xx rate.
- RPC error rate and p95 in Supabase logs.
- Server Action failures by reason (`unauthorized`, `unavailable`, `cookie_error`, `decrypt_error`) without logging credentials.
- Browser smoke result after deploy.

Pre-launch alerts are manual. After external users arrive, add route 5xx and RPC latency alerts.

## Runbook: recipient reports wrong proposals

1. Confirm the recipient's verified auth email.
2. Query `shared_link_recipients` for `lower(email) = lower(<email>)` using an authorized/admin context.
3. Confirm each publication status and workspace.
4. If the recipient should not see a publication, revoke the publication or correct the recipient row.
5. If the issue is email reuse, follow the operational privacy policy and revoke stale publications.

## Runbook: Review click fails

1. Confirm the row is `published` and not expired/revoked.
2. Confirm `project_publications.encrypted_token` exists and decrypts in the server action context.
3. Confirm `getSharedLinkSessionCookieParts` receives raw token, publication id, credential version, and recipient id.
4. Confirm response sets both HttpOnly session cookie and non-secret `_ok` marker.
5. Confirm redirect target is `/share/[raw-token]`, not a hash.

## Closed-beta gate

Signed-in recipients may still be subject to the closed-beta allowlist. Operationally, recipient emails should be allowlisted when a publication is sent, or support must be ready to add them manually. Future auto-allowlisting is out of v1 scope.

## Backward compatibility

All changes are additive. Existing `/share/[token]`, `/workshop/projects`, `/workshop/publisher`, publication RPCs, publication manager views, and existing cookies continue unchanged. Sidebar shortcuts intentionally shift: Proposals becomes `⌘4`; Publisher becomes `⌘5`.
