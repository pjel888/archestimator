# OAuth state mismatch recovery hardening

Generated: 2026-07-01T18:55:00.000Z  
Base URL: `https://archestimator.com`

## Summary

After the user still reached `https://archestimator.com/?error=state_mismatch`, the small Cloudflare edge adapter was hardened and redeployed as `archestimator-auth-callback-normalizer` version `2f2216e0-0953-4b29-91b7-dd10d6c6f55c`, deployment `e0685901-b19b-4bd9-9db1-fd340562fbf2`.

The adapter now applies `Clear-Site-Data: "cookies"`, no-store headers, and broad Better Auth OAuth state-cookie cleanup on:

- root/API retry URLs: `/?error=state_mismatch` and `/api/auth/error?error=state_mismatch`;
- Google callback requests whose `state` parameter has no matching Better Auth OAuth state cookie;
- the final `/login?next=/workshop&error=state_mismatch` retry page itself.

Normal `/login?next=/workshop` remains untouched.

## Verification

| Check | Result |
| --- | --- |
| Focused Vitest | PASS: `3` files / `18` tests passed. |
| Adapter deploy | PASS: version `2f2216e0-0953-4b29-91b7-dd10d6c6f55c` deployed. |
| Deployment readback | PASS: deployment `e0685901-b19b-4bd9-9db1-fd340562fbf2` at `100%`. |
| Root retry URL | PASS: `302` to `/login?next=%2Fworkshop&error=state_mismatch` with no-store, cleanup cookies, and `Clear-Site-Data`. |
| Retry login page | PASS: `200` with no-store, cleanup cookies, and `Clear-Site-Data`. |
| Normal login page | PASS: `200` without recovery cleanup headers. |
| Missing-cookie callback | PASS: `302` to retry login with no-store, cleanup cookies, and `Clear-Site-Data`. |
| Stale-cookie callback | PASS: `302` to retry login with no-store, cleanup cookies, and `Clear-Site-Data`. |
| Fresh Playwright browser path | PASS: exact reported URL landed on retry login, stale Better Auth cookies were empty, Google OAuth started with apex callback URI, a fresh matching state cookie was minted, and fake-code callback ended at `/?error=invalid_code`, not `state_mismatch`. |

## Watch Items

- Keep this adapter active because the large `archestimator-proof` OpenNext Worker deploy path still hangs after build/assets upload.
- The live login banner copy is still from the older main Worker bundle until that deploy path is repaired.
- This hardening closes the OAuth recovery path only; estimate/library/upload/publication/realtime/magic-link product-flow QA remains tracked separately in the full-app ledger.
