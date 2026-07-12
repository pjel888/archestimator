# Cloudflare Better Auth D1 Route-Gate Proof

Generated: 2026-07-01T13:41:34.202Z

Better Auth D1 route-gate proof with hosted Cloudflare provider evidence. It reads package, wrangler, generated type, source files, and sanitized provider-proof output; it does not print secret values, change DNS, make Supabase removable, or prove OAuth provider credentials.

## Summary

| Gate | Ready |
| --- | --- |
| Better Auth dependency present | yes |
| D1 binding ready | yes |
| D1 database adapter pattern ready | yes |
| Next route handler pattern ready | yes |
| Secure server session check ready | yes |
| Migration compilation helper ready | yes |
| Route-gate helper test coverage ready | yes |
| Route-gate D1 session fixture ready | yes |
| Better Auth D1 schema SQL generated | yes |
| Better Auth D1 schema SQL static review ready | yes |
| Hosted Better Auth D1 schema proof ready | yes |
| Better Auth provider secret/origin proof ready | yes |
| Provider-backed session fixture ready | yes |
| Provider-backed callback/session cutover proof ready | yes |
| Better Auth provider proof ready | yes |
| Route-gate parity matrix ready | yes |
| Legacy Supabase auth gate retired | yes |
| Local Better Auth route-gate proof ready | yes |
| Production Better Auth ready | yes |
| Local-only proof | no |
| Provider-backed proof | yes |

## Manifest And Mount Snapshot

| Item | Value |
| --- | --- |
| Better Auth version | 1.6.22 |
| Wrangler D1 bindings | ARCH_DB |
| Typed D1 bindings | ARCH_DB |
| Actual /api/auth route mounted | yes |
| Route-gate test files | tests/vitest/cloudflare-better-auth-route.test.ts, tests/vitest/cloudflare-better-auth-route-gate.test.ts |
| Schema SQL artifact | .ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-06-30-cloudflare-better-auth-d1-schema.sql |
| Schema SQL statements | 7 |
| Schema SQL SHA-256 | a6e8f988bdc954a9d8c8e02824584921f2d52d92d7493ebd2dff2e5aa948f694 |
| Schema SQL tables | account, session, user, verification |
| Schema SQL indexes | account_userId_idx, session_userId_idx, verification_identifier_idx |

## Hosted Provider Proof

| Item | Value |
| --- | --- |
| Provider proof artifact | .ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-07-01-cloudflare-better-auth-provider-proof.json |
| Provider proof present | yes |
| Provider proof generated | 2026-07-01T13:40:56.009Z |
| Provider proof base URL | https://archestimator.com |
| Provider proof endpoint | /__cloudflare/better-auth-proof |
| Provider proof response status | 200 |
| Provider proof response OK | yes |
| Schema apply ready | yes |
| Expected tables present | yes |
| Expected indexes present | yes |
| Secret provider ready | yes |
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
| Provider tables | account, session, user, verification |
| Provider indexes | account_userId_idx, session_userId_idx, verification_identifier_idx |
| Provider proof rows remaining | 0 |
| Magic-link proof rows remaining | 0 |

## Route-Gate Parity Matrix

| Surface | Current Supabase behavior | Better Auth D1 requirement | Local status |
| --- | --- | --- | --- |
| signed-out-protected-route | Proxy checks signed-in claims and redirects protected /workshop requests to /login with a safe next path. | Use auth.api.getSession({ headers, query: { disableCookieCache: true } }) and redirect null sessions before protected routes render. | mapped |
| signed-in-auth-route | Authenticated users visiting login/signup are redirected back to the workshop shell. | Use the secure Better Auth server session check rather than getSessionCookie before auth-route redirects. | mapped |
| closed-beta-denial | Closed-beta access uses the session email and redirects blocked users to /access-required. | Resolve the Better Auth user email from D1-backed session identity before running the existing closed-beta policy. | mapped |
| terms-gate | Terms acceptance is enforced after identity is known and before protected workshop access. | Preserve the terms gate after Better Auth session validation and before setting protected-route gate headers. | mapped |
| invite-entry | Invite continue, accept, and sign-out routes branch on current user context. | Keep invite entry on the Better Auth D1 session/user context before production cutover. | mapped |
| local-dev-bypass | Local dev auth can satisfy protected routes without a live provider session. | Keep the local dev auth gate ahead of provider-backed Better Auth session validation for local-only proof runs. | mapped |
| oauth-magic-link-callback | The legacy callback and OTP actions owned OAuth, magic-link, and sign-out provider calls. | Mount Better Auth handlers and email/OAuth provider config only after D1 schema, secrets, and callback tests are ready. | deferred |

## Official References Used

| Reference | URL |
| --- | --- |
| Better Auth Next.js integration | https://better-auth.com/docs/integrations/next |
| Better Auth session management | https://better-auth.com/docs/concepts/session-management |
| Better Auth database and migrations | https://better-auth.com/docs/concepts/database |
| Better Auth other relational databases | https://better-auth.com/docs/adapters/other-relational-databases |
| Cloudflare D1 Worker binding API | https://developers.cloudflare.com/d1/worker-api/d1-database/ |
| Next.js Proxy file convention | node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md |

## Blockers

- (none)
