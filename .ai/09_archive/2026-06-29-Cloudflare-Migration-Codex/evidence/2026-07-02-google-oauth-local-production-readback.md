# Google OAuth Local And Production Readback

Generated: 2026-07-02T11:58:12Z

## Summary

Google OAuth client `4723547505-0keh5nqvk40b7rv2meror8opnpjm10s8.apps.googleusercontent.com`
is configured for production Archestimator, the Cloudflare Worker preview URL,
and local developer sign-in on `localhost` / `127.0.0.1`.

Google Auth Platform Audience is now `In production` with user type `External`.
The prior Google-side test-user blocker for non-owner accounts is removed.
App access remains controlled by the Cloudflare/D1 closed-beta gate after
authentication.

## Authorized JavaScript Origins

| Origin |
| --- |
| `https://archestimator-proof.philipjonlewis.workers.dev` |
| `https://archestimator.com` |
| `https://www.archestimator.com` |
| `http://localhost:3000` |
| `http://127.0.0.1:3000` |
| `http://localhost:8787` |
| `http://127.0.0.1:8787` |

## Authorized Redirect URIs

| Redirect URI |
| --- |
| `https://archestimator-proof.philipjonlewis.workers.dev/api/auth/callback/google` |
| `https://archestimator.com/api/auth/callback/google` |
| `https://www.archestimator.com/api/auth/callback/google` |
| `http://localhost:3000/api/auth/callback/google` |
| `http://127.0.0.1:3000/api/auth/callback/google` |
| `http://localhost:8787/api/auth/callback/google` |
| `http://127.0.0.1:8787/api/auth/callback/google` |

## Data Access

| Scope bucket | Rows shown |
| --- | ---: |
| Non-sensitive custom scopes | 0 |
| Sensitive scopes | 0 |
| Restricted scopes | 0 |

## Boundary

This is a sanitized provider-console readback. It does not include OAuth client
secrets, access tokens, refresh tokens, cookies, raw browser storage, or a
completed second-person Google account sign-in.
