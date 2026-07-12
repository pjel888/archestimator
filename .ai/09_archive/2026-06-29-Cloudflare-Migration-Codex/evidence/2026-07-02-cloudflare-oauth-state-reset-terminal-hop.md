# Cloudflare OAuth State Reset Terminal Hop

Generated: `2026-07-01T21:47:46Z`

## Result

`https://archestimator.com/?error=state_mismatch` now performs a two-hop cleanup:

1. `302` to `https://archestimator.com/login?next=%2Fworkshop&oauth_state_reset=1`
2. `302` to `https://archestimator.com/login?next=%2Fworkshop&oauth_state_reset_done=1`
3. `200` normal sign-in page

The final page body has `0` `state_mismatch` matches.

The deployed edge Worker is `archestimator-auth-callback-normalizer` version `41c8abd6-31b6-42b9-9883-63ceffb81001`, active at 100%.

## Why This Changed

The previous reset flow served the login page directly from `oauth_state_reset=1` while attaching cleanup headers. The new flow makes that URL a one-time cleanup hop, then lands on a clean login URL. That avoids the user pressing Google from a page that is itself carrying stale OAuth cleanup state.

## Browser Proof

Fresh Chromium production smoke:

- started at `https://archestimator.com/?error=state_mismatch`;
- landed on `https://archestimator.com/login?next=%2Fworkshop&oauth_state_reset_done=1`;
- found `0` `state_mismatch` matches in the rendered login page;
- clicking `Continue with Google` created a fresh secure HttpOnly `__Secure-better-auth.state` cookie on `archestimator.com`;
- a fake Google callback using that fresh state cookie ended at `https://archestimator.com/?error=invalid_code`, not `state_mismatch`.

## Verification

- `bunx vitest run tests/vitest/auth-callback-normalizer-worker.test.ts tests/vitest/cloudflare-worker-route-optimizations.test.ts tests/vitest/auth-proxy.test.ts tests/vitest/auth-set-cookie-forwarding.test.ts tests/vitest/cloudflare-better-auth-route.test.ts --maxWorkers=1`: pass, `5` files / `63` tests.
- `git diff --check`: pass.
- `bunx wrangler deployments list --config wrangler.auth-callback-normalizer.jsonc`: version `41c8abd6-31b6-42b9-9883-63ceffb81001` active at 100%.

## Residual Risk

The main `archestimator-proof` OpenNext Worker upload/deploy path is still a separate blocker. Keep the edge normalizer active until the main Worker can publish current source. This proof validates stale-error recovery and the state-cookie handshake; it does not force a real Google account-picker completion in a brand-new human browser session.
