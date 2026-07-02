# Cloudflare OAuth State Mismatch Live Recheck - 2026-07-02

Latest live probe against `https://archestimator.com/?error=state_mismatch` returned `302` to `https://archestimator.com/login?next=%2Fworkshop&oauth_state_reset=1`.

Signals observed:

- `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate`
- `Refresh: 0; url=https://archestimator.com/login?next=%2Fworkshop&oauth_state_reset=1`
- HTML fallback with meta refresh, `window.location.replace(...)`, and a manual continue link
- Better Auth OAuth state-cookie cleanup for `better-auth.state`, `__Secure-better-auth.state`, and `better-auth.oauth_state`
- Response body does not expose a visible `state_mismatch` retry page

Interpretation: the latest reported root error URL is being caught by the Cloudflare edge adapter and reset cleanly. The main `archestimator-proof` Worker remains stale because full OpenNext Worker deploy/upload still stalls, so the edge adapter must stay active until the main Worker deploy blocker is resolved.

Additional live probes:

- IPv4 through Cloudflare Singapore returned `302` to the clean reset URL; body `state_mismatch` count was `0`.
- Followed redirect finished at `https://archestimator.com/login?next=%2Fworkshop&oauth_state_reset=1` with HTTP `200`; body `state_mismatch` count was `0`.
- The Codex in-app browser tab forced to the exact reported URL also landed on the clean reset login URL with title `Sign in — Archestimator — Archestimator`.
- `curl -6` from this machine timed out before receiving a response, so IPv6 remains a network-path watch item rather than a passed auth probe from this environment.
