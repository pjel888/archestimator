# Cloudflare OAuth State Mismatch Browser Recovery

Generated: `2026-07-01T18:38:00Z`

## Result

PASS for the reported production failure path. The live edge adapter now routes both root and Better Auth API `state_mismatch` errors into a retryable login page, clears stale browser cookies on those explicit error-entry URLs, and a real Chrome Google retry returned to `/workshop`.

## Live Adapter

| Field | Value |
| --- | --- |
| Worker | `archestimator-auth-callback-normalizer` |
| Version | `fb5d4528-9aac-473d-a5c2-c4304928e0c9` |
| Deployment | `a9da1b92-2d56-4282-b721-0fae88847f57` |
| Routes | `archestimator.com/*`, `archestimator.com/api/auth/callback/google*` |
| Binding | `ARCH_APP -> archestimator-proof` |

## Production Checks

| Probe | Result |
| --- | --- |
| `GET /?error=state_mismatch` | `302` to `/login?next=%2Fworkshop&error=state_mismatch`, no-store, OAuth state-cookie expiry, `Clear-Site-Data: "cookies"` |
| `GET /api/auth/error?error=state_mismatch` | `302` to `/login?next=%2Fworkshop&error=state_mismatch`, no-store, OAuth state-cookie expiry, `Clear-Site-Data: "cookies"` |
| `GET /login?next=%2Fworkshop&error=state_mismatch` | `200` from OpenNext |
| OAuth start | `200`, Google URL on `accounts.google.com`, apex callback URI, secure Better Auth state cookie minted |
| Matching-state fake-code callback | Reached `invalid_code`, not `state_mismatch` |
| Missing/stale-cookie callback | `302` to login retry with targeted OAuth state-cookie cleanup |
| Real Chrome recovery | Forced root error URL -> login retry -> Google button -> `/workshop` signed in as Philip Lewis |

## Verification

- `git diff --check`: pass.
- `NODE_OPTIONS=--max-old-space-size=8192 bunx tsc --noEmit --pretty false`: pass.
- Focused Vitest: `4` files / `24` tests passed.
- Lightweight adapter deploy: pass, live version `fb5d4528-9aac-473d-a5c2-c4304928e0c9`.

## Main Worker Deploy Watch

`bun run cf:deploy` built successfully, completed OpenNext bundling, and uploaded changed static assets. The process then hung after reporting total Worker upload size; `wrangler versions list --name archestimator-proof` still showed no new version after the wait. The process was interrupted to avoid leaving a wedged terminal.

Main Worker source parity is present and tested, including `/api/auth/error?error=state_mismatch`, but the active main Worker version remains `b909ac54-1a72-47f0-9a70-f6c70f7c6fb6`. Keep the edge adapter active until the full `archestimator-proof` deploy path succeeds.
