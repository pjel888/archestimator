# Cloudflare State-Mismatch User Report Live Recheck 0121

Generated: 2026-07-02T01:21:33Z

## Result

PASS. After the owner again reported
`https://archestimator.com/?error=state_mismatch`, the live Cloudflare edge and
a fresh browser Google-start flow still recovered cleanly.

## Evidence

| Probe | Result |
| --- | --- |
| Curl follow on exact URL | `302 -> 302 -> 200`, final URL `https://archestimator.com/login?next=%2Fworkshop&oauth_state_reset_done=1`, zero `state_mismatch` body matches. |
| Apex first hop | HTTP `302` to `https://archestimator.com/login?next=%2Fworkshop&oauth_state_reset=1` with private no-store cleanup and `Clear-Site-Data`. |
| `www` first hop | HTTP `302` directly to the same clean apex reset URL. |
| App-path first hop | `/workshop?error=state_mismatch` returns HTTP `302` to the clean reset URL with private no-store cleanup. |
| Missing-cookie callback probe | `/api/auth/callback/google?state=fresh-state&code=fake-code` returns HTTP `302` to the clean reset URL with private no-store cleanup. |
| Fresh Playwright browser | From the exact bad URL, lands on `https://archestimator.com/login?next=%2Fworkshop&oauth_state_reset_done=1`; Google button visible; no state cookies remain. |
| Fresh Google start | Clicking Google reaches `accounts.google.com` with `redirect_uri=https://archestimator.com/api/auth/callback/google`; a single `__Secure-better-auth.state` cookie is created and matches Google's 32-character `state`. |
| Desktop Chrome session | The available signed-in Chrome session is already on `https://archestimator.com/workshop/publisher` with production Publisher data visible, so it was preserved for workflow QA instead of forcing a reset that clears cookies/storage. |

## Conclusion

The hosted edge/server path is clean for the exact reported URL, `www`, app-path
state-mismatch URLs, and stale Google callback state. If a browser still visibly
shows `/?error=state_mismatch`, current evidence points to an already-open stale
surface, an interrupted navigation, or a profile that has not completed the live
two-hop reset chain.
