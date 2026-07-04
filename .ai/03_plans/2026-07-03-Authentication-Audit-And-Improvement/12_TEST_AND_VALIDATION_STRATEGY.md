# 12 - Test And Validation Strategy

## Test Order

1. Write or update targeted failing tests before code edits for each phase.
2. Run the smallest test set that proves changed behavior.
3. Add broader validation only for shared auth/session/authz/security changes.
4. Run provider/browser proof only when the claim cannot be proven statically.

## Required Tests By Phase

| Phase | Required tests |
|---|---|
| 1 | Better Auth Google provider prompt/config; sign-out policy; `state_mismatch` recovery redaction/copy; auth redirect sanitizer remains safe |
| 2 | Publication password failures, hard lock, lock expiry, correct password after lock, simulated isolate/global reset |
| 3 | Role helper exhaustiveness; workspace/project/estimate allowed/denied; beta-admin allowed/denied; invite acceptance wrong-account/role states |
| 4 | Viewer cookie rejected by `/workshop`; Better Auth session rejected as share password bypass; CSRF/no-store; token/url/evidence redaction |
| 5 | Legacy route/docs/tests cleanup does not break Better Auth callback, invite, auth proxy, active provider-exit scanners, negative assertions, or proof scripts still intentionally retained. The low-risk Slice 0 target-literal validation contract, Slice A stale proof-utility archive, Slice A2 provider-only proof-test archive, and Slice B allowlist report in `28` are locally complete for their exact scopes; treat historical type-reference retirement and final hosted/provider/operator/legal/privacy/cleanup/provider-exit/final-review proof as separate slices. |

## Candidate Existing Test Areas

Use `rg --files` to confirm exact filenames before running:
- `tests/vitest/auth-*`
- `tests/vitest/*invite*`
- `tests/vitest/*publication*`
- `tests/vitest/*share*`
- `tests/vitest/legal-*`
- `tests/vitest/closed-beta-*`
- `tests/vitest/cloudflare-*auth*`
- E2E files only when browser/provider behavior is required.

## Static Validation

For planning/doc-only changes:
- `git diff --check -- .ai/03_plans/2026-07-03-Authentication-Audit-And-Improvement`
- `rg` for stale contradictions such as missing-doc statuses, raw OAuth state examples, and stale Supabase-active claims inside this pack.
- For Phase 5 provider cleanup planning, recheck the provider-string inventory counts and active caller checks before claiming the cleanup implementation surface is complete.

For implementation:
- Type/LSP or targeted test for the changed files.
- `git diff --check`.
- Auth/security shared-code changes should also run the relevant broader test slice or `bun run validate` when risk justifies the time.

## Browser/Provider Proof Policy

Browser/provider proof is required for:
- Real Google account-picker behavior in a browser.
- Hosted non-owner Google flow.
- Hosted email/magic-link/mailbox delivery.
- Real Cloudflare Worker/D1/DO behavior that local unit tests cannot simulate.

Browser/provider proof is not required for:
- Static config shape.
- Pure role helper behavior.
- Route sanitizer unit tests.
- Plan/doc consistency.

## Evidence Rules

All evidence must redact:
- OAuth state/code/tokens.
- Cookies/session IDs.
- Invite/share raw tokens and URLs.
- Raw emails/IPs/UA.
- Provider secrets/API keys/peppers.
