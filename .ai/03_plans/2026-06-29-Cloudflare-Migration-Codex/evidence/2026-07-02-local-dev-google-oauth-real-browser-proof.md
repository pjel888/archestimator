# Local Developer Google OAuth Real Browser Proof

Generated: 2026-07-02T13:39:54Z  
Mode: `local-dev-google-oauth-real-browser-proof`  
Base URL: `http://localhost:3000`  
Result: pass

## Boundary

This is a real Chrome desktop browser proof for the owner Google OAuth path on local developer mode. It does not record cookies, OAuth codes, state values, the account email, client secrets, raw callback URLs, or provider tokens.

## What Changed

- `src/lib/auth/request-proxy.ts` now defers protected localhost requests with a Better Auth session cookie to the server layout for validation.
- `src/components/auth/AuthStateMismatchRecoveryScript.tsx` now renders the recovery script through `next/script` with `beforeInteractive`, fixing the Next/React warning about script tags inside React components.
- Ignored local env files now include the non-secret Better Auth provider selector.
- The local D1 preview database had all app migrations applied before the final browser proof.

## Steps

1. Started the local dev server on `http://localhost:3000`.
2. Opened `/login?next=%2Fworkshop`.
3. Clicked `Continue with Google`.
4. Completed Google OAuth in the existing Chrome profile.
5. Returned to localhost without `state_mismatch`.
6. Reached the authenticated local terms gate at `/workshop/terms?next=%2Fworkshop`.
7. Accepted the clickwrap gate.
8. Landed on `/workshop` with the authenticated workshop dashboard visible.

## D1 Readback

Local D1 readback showed:

| Table / check | Count |
| --- | ---: |
| `user` rows | 1 |
| `account` rows | 1 |
| Google `account` rows | 1 |
| `session` rows | 3 |
| `profiles` rows | 0 |
| `legal_terms_acceptances` rows | 1 |

The terms acceptance row used `terms-of-service`, version `tos-2026-06-06-beta-v1`, surface `workshop_terms_gate`, and method `authenticated_clickwrap`.

## Verification

Focused auth regression tests passed:

`bunx vitest run tests/vitest/auth-entry-ui-contract.test.ts tests/vitest/auth-proxy.test.ts tests/vitest/cloudflare-better-auth-route-gate.test.ts tests/vitest/cloudflare-better-auth-route.test.ts tests/vitest/auth-set-cookie-forwarding.test.ts --maxWorkers=1`

Result: pass, 5 files / 56 tests.

## Assessment

Local developer Google OAuth on `http://localhost:3000` is now proven end-to-end for the owner Chrome profile: Google sign-in, callback, Better Auth session, local D1 persistence, terms acceptance, and authenticated `/workshop` render all passed.

Still open:

- Real non-owner Google closed-beta proof.
- Provider downgrade/cancellation, which remains a separate ops step after exports/backups and post-exit smoke.
