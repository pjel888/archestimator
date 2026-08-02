# UNIT-003 — Exercise hosted Google OAuth round-trip

## Goal

Confirm a real test account can complete the hosted Google OAuth flow
end-to-end: `/login` → click Google → `/api/auth/callback/google` → session
cookie set → `/workshop` loads.

## Source findings / requirements

- `OPS-AUTH-OAUTH-003` (High)
- `REQ-003` (CORE) — sign-in is a release-gate NO_GO

## Dependencies

- None (operator-driven; requires a real test account)

## Owned paths / resources

- `artifacts/auth-email-hosted-readiness.md`
- `artifacts/release-gate.json` (`GATE-OAUTH-003`)

## Non-goals

- Token/session security design (current authority
  `.ai/03_plans/2026-07-31/Code-Improvement/`; historical Infosec)
- Session-read coalescing (current authority
  `.ai/03_plans/2026-07-31/Code-Improvement/`; historical Quality Master
  UNIT-035)
- Magic-link path (depends on O-10 readiness)
- Client libraries or UI changes

## Implementation boundary

Operator-driven actions only:

1. Confirm hosted Worker secret names (not values):
   `bunx wrangler secret list --env prod` should include
   `BETTER_AUTH_GOOGLE_CLIENT_ID` (or `GOOGLE_CLIENT_ID`),
   `BETTER_AUTH_GOOGLE_CLIENT_SECRET` (or `GOOGLE_CLIENT_SECRET`),
   `BETTER_AUTH_SECRET`,
   `BETTER_AUTH_URL` (or `NEXT_PUBLIC_APP_URL`).
2. Confirm `BETTER_AUTH_URL` is `https://archestimator.com` (hosted secret
   value — operator dashboard).
3. Use a real test account to drive the round-trip in a browser:
   - Visit `https://archestimator.com/login`.
   - Click "Continue with Google".
   - Complete Google consent.
   - Confirm redirect to `https://archestimator.com/api/auth/callback/google`
     then to `/workshop`.
   - Confirm session cookie set (`__Secure-better-auth.session_token` or
     equivalent).
4. Capture the network trace (redacted) in
   `evidence/oauth-roundtrip-<date>.md`.
5. Test state-mismatch recovery: clear cookies mid-flow; confirm
   `/login?next=/workshop&oauth_state_reset=1` recovery.
6. Update `auth-email-hosted-readiness.md`: hosted OAuth round-trip transitions
   from `EVIDENCE_BLOCKED` to `HOSTED_CONFIRMED`.
7. Update `release-gate.json`: remove `GATE-OAUTH-003`.

## Invariants

- No real customer data.
- No secret values printed.
- No client libraries changed.

## Acceptance evidence

- `evidence/oauth-roundtrip-<date>.md` with redacted network trace.
- `release-gate.json` `NO_GO_items[GATE-OAUTH-003]` removed.

## Test decision

`NOT_REQUIRED` — operator-driven hosted verification (browser automation is
User Test Authorization Gate; operator may drive manually).

## Recovery / fix-forward

If round-trip fails: capture failure mode (redirect_uri mismatch, secret
missing, `BETTER_AUTH_URL` mis-set, trusted-origin rejection). Block cohort
admit until resolved.

## Completion signal

`release-gate.json` removes `GATE-OAUTH-003`.

## Status

`PLANNED` — ready for operator.
