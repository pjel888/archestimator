# Cloudflare State-Mismatch User Report Live Recheck

Generated: 2026-07-02T00:51:54Z

## Result

PASS. After the owner again reported
`https://archestimator.com/?error=state_mismatch`, fresh production curl and a
fresh no-cookie browser context both recovered to the clean login reset page.

## Evidence

| Probe | Result |
| --- | --- |
| Curl follow on exact URL | Final URL `https://archestimator.com/login?next=%2Fworkshop&oauth_state_reset_done=1`, HTTP `200`, `2` redirects, zero `state_mismatch` in body. |
| No-cache curl with cache-bust probe | Same clean reset-done login URL, HTTP `200`, `2` redirects, zero `state_mismatch` in body. |
| Fresh Playwright browser | Final URL `https://archestimator.com/login?next=%2Fworkshop&oauth_state_reset_done=1`; title `Sign in - Archestimator - Archestimator`; Google sign-in visible; no state cookies remained. |
| Desktop Chrome observation | The active Chrome tab was already signed in at the hosted project estimates page, not on the error page. |

The first three hosted responses in the browser probe were:

1. `/?error=state_mismatch` -> `302`
   `/login?next=%2Fworkshop&oauth_state_reset=1`
2. `/login?next=%2Fworkshop&oauth_state_reset=1` -> `302`
   `/login?next=%2Fworkshop&oauth_state_reset_done=1`
3. `/login?next=%2Fworkshop&oauth_state_reset_done=1` -> `200`

All three auth-recovery responses used
`private, no-cache, no-store, max-age=0, must-revalidate`.

## Conclusion

The hosted edge/server recovery path is clean for the exact reported URL. Any
remaining visible error is most likely an already-open browser surface holding a
stale URL or client state until it reloads through the current recovery path.
