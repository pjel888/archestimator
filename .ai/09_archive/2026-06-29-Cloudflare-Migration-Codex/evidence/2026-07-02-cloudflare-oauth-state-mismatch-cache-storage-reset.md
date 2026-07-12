# Cloudflare OAuth State-Mismatch Cache/Storage Reset

Generated: `2026-07-01T21:18:32Z`

## Result

`https://archestimator.com/?error=state_mismatch` now has a stronger stale-browser recovery path. The small `archestimator-auth-callback-normalizer` Worker was redeployed as version `788e5aa4-6520-4136-83f6-a092cc0b1b55`, and the OAuth reset response now includes:

`Clear-Site-Data: "cache", "cookies", "storage"`

Live curl against the exact reported URL returned `302` to `https://archestimator.com/login?next=%2Fworkshop&oauth_state_reset=1`, body `state_mismatch` count `0`, and Cloudflare ray `a14870226d40cb36-SIN`.

The deployed response also still shows an additive legacy `Clear-Site-Data: "cookies"` header. The stronger header is present and remains the intended recovery directive.

## Browser Proof

In the Codex in-app browser after deploy:

- navigating to `https://archestimator.com/?error=state_mismatch` landed on `https://archestimator.com/login?next=%2Fworkshop&oauth_state_reset=1`;
- visible body had `0` `state_mismatch` matches;
- the reset page showed `Continue with Google`;
- clicking `Continue with Google` returned to `https://archestimator.com/workshop`;
- the page showed `Workshop`, `Philip Lewis`, and `philipjonlewis@gmail.com`;
- visible body had `0` `state_mismatch` matches after sign-in.

This is same browser profile recovery proof, not a forced fresh anonymous Google account-picker completion.

## Verification

- `bunx vitest run tests/vitest/auth-callback-normalizer-worker.test.ts tests/vitest/cloudflare-worker-route-optimizations.test.ts tests/vitest/auth-proxy.test.ts --maxWorkers=1`: pass, `3` files / `52` tests.
- `git diff --check`: pass.

## Residual Risk

The main `archestimator-proof` OpenNext Worker is still blocked on full Worker version upload, so the edge adapter must remain active. The earlier IPv6 timeout from this machine remains a network-path watch item.
