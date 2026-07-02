# OAuth State Mismatch Follow-Up Proof

Generated: 2026-07-01T20:18:10.453Z

Base URL: `https://archestimator.com`

Reported URL: `https://archestimator.com/?error=state_mismatch`

Status: **PASS for the reported auth-state recovery path**.

## Findings

| Check | Result | Evidence |
| --- | --- | --- |
| Exact reported URL | PASS | Fresh Chromium navigation ended at `https://archestimator.com/login?next=%2Fworkshop&oauth_state_reset=1`; page body did not contain `state_mismatch`. |
| Google OAuth start | PASS | Clicking the production `Continue with Google` control reached `accounts.google.com` with `redirect_uri=https://archestimator.com/api/auth/callback/google`, `response_type=code`, email scope, and a 32-character OAuth state. |
| Better Auth state cookie | PASS | The browser had `__Secure-better-auth.state` on `archestimator.com`, secure, HttpOnly, SameSite=Lax, with an 83-character value. Values were not written. |
| Matching-state fake callback | PASS | Callback with a fake code and the live state ended at `https://archestimator.com/?error=invalid_code`, not `state_mismatch`. |
| No-cookie API/error paths | PASS | `/api/auth/error?error=state_mismatch` and a fake no-cookie Google callback both returned `302` to the clean reset login URL with OAuth cookie cleanup and `Clear-Site-Data: "cookies"`. |
| Focused auth tests | PASS | `6` files / `66` tests passed. |
| Hosted route refresh | PASS | `2026-07-02-cloudflare-hosted-route-proof-auth-followup.*` passed with `hostedRouteProofReady=true` and blockers empty. |
| Hosted auth smoke | PARTIAL | Signed-out `/workshop` fail-closed passed; fixture-backed allowed/denied/revoked/expired cases were not runnable because sanitized `HOSTED_AUTH_*_COOKIE` values were not present. |
| Codex in-app browser session | PASS | The exposed in-app browser profile started from the exact error URL, landed on the clean reset login page, and after `Continue with Google` reached `https://archestimator.com/workshop` as Philip Lewis with `philipjonlewis@gmail.com`, visible project data, and no `state_mismatch` or sign-in prompt. |

## Residual Risk

- This follow-up proved the exposed in-app browser profile could recover to an authenticated `/workshop` session, but did not force a fresh Google account-picker completion because that profile already had a valid session.
- Keep `archestimator-auth-callback-normalizer` active. The main `archestimator-proof` current-source Worker upload/version ingestion is still blocked.
- This proof does not close the broader migration QA gaps for hosted estimate history, component-library mutation, real R2 upload scanner persistence, publication recipient response, or two-client realtime UI.
