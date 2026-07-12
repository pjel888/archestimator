# Production Google OAuth Real Browser Proof

Generated: 2026-07-02T13:16:36Z  
Mode: `production-google-oauth-real-browser-proof`  
Base URL: `https://archestimator.com`  
Result: pass

## Boundary

This is a real Chrome desktop browser proof for the owner Google OAuth path. It does not record cookies, OAuth codes, state values, account email, client secrets, or raw provider tokens.

## Steps

1. Opened the production reset path after the reported `state_mismatch` condition.
2. Observed the production login page at `/login?next=%2Fworkshop&oauth_state_reset_done=1`.
3. Clicked `Continue with Google` in the same Chrome profile.
4. The OAuth flow completed and landed at `https://archestimator.com/workshop`.
5. The authenticated workshop dashboard rendered with project, component, and estimate content.

## Assessment

Production owner Google OAuth is freshly proven for this Chrome profile. The original `state_mismatch` path now recovers into a clean login restart and a completed authenticated session.

Still open:

- Real non-owner Google closed-beta proof.

Superseding local proof:

- Local developer Google OAuth callback/session proof now passes in `evidence/2026-07-02-local-dev-google-oauth-real-browser-proof.*`.
