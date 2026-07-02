# Cloudflare Magic-Link UI Mailbox Proof

Generated: 2026-07-01T19:14:15.000Z

## Result

PASS. The production login UI requested a magic link, Gmail received the
message from `noreply@archestimator.com`, and the one-time link created a
Better Auth session on `archestimator.com`.

## Evidence

- Production UI submission from
  `https://archestimator.com/login?next=%2Fworkshop` reached
  `https://archestimator.com/login?sent=1&next=%2Fworkshop` and displayed the
  "Check your email" success banner.
- Gmail received message `19f1f18a63cc824d` from `noreply@archestimator.com` to
  `philipjonlewis@gmail.com`, subject `Sign in to Archestimator`, at
  `2026-07-01T19:12:10Z`.
- The email link used host `archestimator.com`, path
  `/api/auth/magic-link/verify`, and callback `/workshop`.
- A fresh browser context opened the link and landed on
  `https://archestimator.com/workshop`, loaded as Philip Lewis, with no auth
  error text or `error=` URL.
- The browser received one secure HttpOnly Better Auth session cookie:
  `__Secure-better-auth.session_token`.

## Notes

The one-time magic-link token was consumed during verification and is redacted
from this evidence file.
