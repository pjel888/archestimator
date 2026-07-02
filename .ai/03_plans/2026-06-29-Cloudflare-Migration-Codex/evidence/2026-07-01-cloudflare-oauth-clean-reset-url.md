# Cloudflare OAuth Clean Reset URL

Generated: 2026-07-01T19:07:30.000Z

## Result

PASS. The exact reported URL no longer leaves the browser on a visible
`state_mismatch` URL. The edge adapter now redirects
`https://archestimator.com/?error=state_mismatch` to
`https://archestimator.com/login?next=%2Fworkshop&oauth_state_reset=1` while
clearing stale Better Auth OAuth state cookies.

## Evidence

- Deployed `archestimator-auth-callback-normalizer` version
  `c34e7f68-13a2-423e-8ff4-73689f35e17a`.
- Focused Vitest passed: 4 files, 27 tests.
- Live root probe returned `302` to the clean reset URL with `no-store`,
  `Clear-Site-Data: "cookies"`, and OAuth state-cookie expiry headers.
- Legacy retry URL
  `/login?next=%2Fworkshop&error=state_mismatch` now redirects to the clean
  reset URL with the same cleanup headers.
- Following the old root error URL returned login HTML with no
  `state_mismatch` string in the body.
- Fresh Playwright browser probe from the old root error URL found zero Better
  Auth cookies after reset, clicked `Continue with Google`, saw
  `redirect_uri=https://archestimator.com/api/auth/callback/google`, observed
  one matching `__Secure-better-auth.state` cookie for the Google `state`, and
  a fake-code callback ended at `https://archestimator.com/?error=invalid_code`
  instead of `state_mismatch`.

## Notes

The temporary OAuth `state` value from the Playwright run was intentionally
redacted from this evidence file.
