# Cloudflare Better Auth Provider Proof

Generated: 2026-07-01T05:42:06.913Z
Base URL: https://archestimator-proof.philipjonlewis.workers.dev
Endpoint: /__cloudflare/better-auth-proof
Provider backed: yes
Response status: 200
Secret input present: yes
Secret input source: process.env

Calls the deployed proof Worker Better Auth provider-proof endpoint with a local bearer secret, then records sanitized provider behavior: hosted D1 schema/index readback, Better Auth secret/base URL presence, Google OAuth provider credential presence, one ephemeral D1 session fixture readback, magic-link callback/session-cookie/route-gate readback, token replay blocking, and cleanup. It does not print secret values, magic-link tokens, cookies, session tokens, deploy Workers, change DNS, or replace auth routes by itself.

## Summary

| Gate | Ready |
| --- | --- |
| Schema apply ready | yes |
| Expected tables present | yes |
| Expected indexes present | yes |
| Secret provider ready | yes |
| Google OAuth provider ready | no |
| Base URL ready | yes |
| Trusted origins ready | yes |
| Provider session fixture ready | yes |
| Magic-link request ready | yes |
| Magic-link callback ready | yes |
| Session cookie issued | yes |
| Route-gate session readback ready | yes |
| Magic-link replay blocked | yes |
| Provider-backed callback/session cutover proof ready | yes |
| Cleanup ready | yes |
| Better Auth provider proof ready | yes |
| Production cutover | no |

## Sanitized Results

- Tables: account, session, user, verification
- Indexes: account_userId_idx, session_userId_idx, verification_identifier_idx
- Rows remaining: 0
- Endpoint error: (none)

## Blockers

- (none)
