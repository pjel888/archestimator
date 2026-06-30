# Cloudflare Better Auth Provider Proof

Generated: 2026-06-30T10:15:21.367Z
Base URL: https://archestimator-proof.philipjonlewis.workers.dev
Endpoint: /__cloudflare/better-auth-proof
Provider backed: yes
Response status: 500
Secret input present: yes
Secret input source: process.env

Calls the deployed proof Worker Better Auth provider-proof endpoint with a local bearer secret, then records sanitized provider behavior: hosted D1 schema/index readback, Better Auth secret/base URL presence, one ephemeral D1 session fixture readback, magic-link callback/session-cookie/route-gate readback, token replay blocking, and cleanup. It does not print secret values, deploy Workers, change DNS, replace Supabase auth, prove OAuth provider credentials, or make production cutover ready.

## Summary

| Gate | Ready |
| --- | --- |
| Schema apply ready | yes |
| Expected tables present | yes |
| Expected indexes present | yes |
| Secret provider ready | yes |
| Base URL ready | yes |
| Trusted origins ready | yes |
| Provider session fixture ready | yes |
| Magic-link request ready | no |
| Magic-link callback ready | no |
| Session cookie issued | no |
| Route-gate session readback ready | no |
| Magic-link replay blocked | no |
| Provider-backed callback/session cutover proof ready | no |
| Cleanup ready | yes |
| Better Auth provider proof ready | no |
| Production cutover | no |

## Sanitized Results

- Tables: account, session, user, verification
- Indexes: account_userId_idx, session_userId_idx, verification_identifier_idx
- Rows remaining: 0
- Endpoint error: (none)

## Blockers

- Better Auth provider proof endpoint returned HTTP 500.
- Hosted Better Auth provider proof did not pass.
- Hosted Better Auth magic-link request did not pass.
- Hosted Better Auth magic-link callback did not mint a D1-backed session.
- Hosted Better Auth magic-link callback did not issue a session cookie.
- Hosted Better Auth session cookie did not pass route-gate getSession readback.
- Hosted Better Auth magic-link token replay was not blocked.
- Error: No such module "better-auth".
