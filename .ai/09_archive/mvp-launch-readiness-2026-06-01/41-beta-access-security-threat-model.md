# Beta Access Security Threat Model

## Scope

This threat model covers closed beta access control through Google Sign-In plus Supabase allowlist enforcement.

## Assets

- Workshop data.
- Project and estimate data.
- Component library and templates.
- Public share links.
- Beta cohort membership.
- Supabase service role key.
- OAuth session cookies.

## Threats And Controls

| Threat | Risk | Control |
| --- | --- | --- |
| Non-whitelisted user enters `/workshop` | High | Server-side allowlist check in callback, proxy, and session/app server boundary |
| OAuth email spoofing | High | Use Supabase `getUser()`, Google provider email, and verified email metadata when available |
| Case sensitivity bypass | Medium | Store and match `lower(btrim(email))` unique normalized email |
| Plus-address confusion | Medium | Do not strip plus tags; invite exact Google account email |
| Revoked user keeps session | High | Check allowlist status on protected route/session resolution, not only at callback |
| Redirect loop | Medium | Exempt `/login`, `/auth/callback`, `/beta/access-required`, `/privacy`, `/terms`, `/share`, `/invite`, and static assets |
| Public share link blocked incorrectly | Medium | Keep `/share` under existing token/RLS rules, separate from beta app allowlist |
| Invite link grants app access | High | Invite route can remain public, but workshop acceptance requires allowlist unless explicitly approved |
| Service role key leakage | Critical | Never expose service role to client; only server env; no logs |
| Allowlist table enumeration | Medium | RLS enabled; no user list policy; server helper returns only current user's status |
| Manual admin mistake | Medium | Use status field, notes, and runbook; prefer revoke over delete |
| Missing audit trail | Medium | Record security events for denied/revoked access if feasible; at minimum preserve Supabase auth and Vercel logs |

## Public Share Links Versus Beta App Access

Closed beta access controls `/workshop` and authenticated app operations. Public share links remain governed by token/password/recipient-session rules. A non-whitelisted recipient may view a public share if the current sharing rules allow it, but cannot enter the workshop unless separately allowlisted.

## Invite Links Versus Beta App Access

Invite routes can remain public enough to display invite context. Accepting into a workspace or entering `/workshop` must require allowlist approval during closed beta.

## RLS Requirements

- `closed_beta_allowed_emails` RLS enabled.
- No broad `select` for `anon` or `authenticated`.
- Security-definer helper must be narrowly scoped.
- Profile/workspace RLS remains the primary data boundary after access is granted.

## Audit Requirements

Minimum:

- Vercel logs for callback/proxy redirects.
- Supabase Auth logs for OAuth sign-in.
- Supabase table row status history through `updated_at` and notes.

Preferred:

- `security_events` row for allowlist denied/revoked access.
- `accepted_at` update when an invited email first succeeds.

## Tests

- Denied account cannot access `/workshop`.
- Revoked account cannot access `/workshop` after a valid session exists.
- Public routes remain public.
- Public share link behavior unchanged.
- Case-insensitive email match works.
- Plus-address exact matching works.
- RPC/helper fails closed on DB error.

## No-Go Security Issues

- Client-side-only allowlist enforcement.
- Service role key available in browser bundles.
- Missing RLS on allowlist table.
- Revoked users keep workshop access.
- Public share/invite behavior accidentally leaks workspace edit access.
- Google OAuth callback accepts unverified or ambiguous email identities.
