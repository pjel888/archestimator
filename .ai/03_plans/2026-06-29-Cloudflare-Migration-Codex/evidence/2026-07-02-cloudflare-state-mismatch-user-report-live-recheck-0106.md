# Cloudflare State-Mismatch User Report Live Recheck 0106

Generated: 2026-07-02T01:06:59Z

## Result

PASS. After the owner again reported
`https://archestimator.com/?error=state_mismatch`, the live Cloudflare edge,
callback recovery path, and a fresh browser Google-start flow all recovered
cleanly.

## Evidence

| Probe | Result |
| --- | --- |
| Curl follow on exact URL | Final URL `https://archestimator.com/login?next=%2Fworkshop&oauth_state_reset_done=1`, HTTP `200`, `2` redirects, zero `state_mismatch` body matches. |
| Apex first hop | HTTP `302` to `https://archestimator.com/login?next=%2Fworkshop&oauth_state_reset=1` with private no-store and `Clear-Site-Data`. |
| `www` first hop | HTTP `302` directly to the same clean apex reset URL. |
| Missing-cookie callback probe | `/api/auth/callback/google?state=fresh-state&code=fake-code` returns HTTP `302` to the clean reset URL with private no-store and `Clear-Site-Data`. |
| Fresh Playwright browser | From the exact bad URL, lands on `https://archestimator.com/login?next=%2Fworkshop&oauth_state_reset_done=1`; Google button visible; no state cookies remain. |
| Fresh Google start | Clicking Google reaches `accounts.google.com` with `redirect_uri=https://archestimator.com/api/auth/callback/google`; the generated Google `state` matches the single `__Secure-better-auth.state` cookie. |
| Deploy readback | Main Worker `archestimator-proof` is `e4476425-2fdb-41ce-856a-de78e3a22fd8` at 100%; normalizer Worker is `aaee7b3f-a120-4e5e-ada2-5950c57831df` at 100%. |
| Observability | Cloudflare observability API returned an API request failure for keys/values queries, so no log claim is made from that surface. |

## Conclusion

The hosted edge/server path is clean for the exact reported URL and for stale
Google callback state. If a browser still visibly shows
`/?error=state_mismatch`, the evidence points to an already-open stale surface
or an interrupted navigation before the current live 302 recovery chain
completes.
