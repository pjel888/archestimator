# 22 - Phase 1 Google Picker, Logout, And State Recovery Plan

**Status:** `PHASE 1 LOCAL CODE SLICE IMPLEMENTED` for WP1-WP3 source/test behavior as of 2026-07-04. This does not claim Google provider/browser proof, production/deploy proof, provider mutation, or Phase 2-5 completion.

**Scope:** FR-001, FR-002, FR-003, SR-003, UX-001, UX-002, and NFR-002 from `04_REQUIREMENTS_SPECIFICATION.md` / `16_REQUIREMENTS_TRACEABILITY_MATRIX.md`.

**Non-goals:** durable publication lockout, broad app-layer authz matrix work, provider-leftover deletion, Google OAuth grant revocation, all-session invalidation, Cloudflare provider mutation, migrations, deploys, commits, browser proof, and production claims.

## Phase 0 Revalidation Evidence

2026-07-04 read-only checks confirmed:

- `package.json` and `bun.lock` still pin `next` 16.2.6, React 19.2.6, Better Auth 1.6.22, `@opennextjs/cloudflare` 1.20.1, and Wrangler 4.105.0.
- `wrangler.jsonc` still targets Worker `archestimator-proof` and the expected D1/R2/Durable Object/Queue/Email/Images bindings.
- Google provider config was revalidated in `src/lib/auth/better-auth-cloudflare.ts`; before implementation it returned only `clientId` / `clientSecret`.
- Google sign-in remains in `src/lib/auth/actions.ts:164`; it posts to `/api/auth/sign-in/social`, clears Better Auth OAuth state cookies, forwards Set-Cookie, records `auth_google_started`, and redirects to Better Auth's provider URL.
- Sign-out remains local Better Auth session sign-out in `src/lib/auth/actions.ts:223`; it calls `/api/auth/sign-out`, clears Better Auth session cookies, and redirects to `/login`.
- `state_mismatch` recovery remains split between `src/lib/auth/request-proxy.ts:99`, `src/components/auth/AuthStateMismatchRecoveryScript.tsx:3`, and `src/lib/auth/error-mapping.ts`.
- Better Auth installed source still supports Google provider `prompt`; `@better-auth/core/dist/social-providers/google.mjs` passes `options.prompt` to `createAuthorizationURL`, which sets the `prompt` query parameter.

## Phase 1 Implementation Evidence

2026-07-04 local implementation completed the bounded WP1-WP3 slice:

- `src/lib/auth/better-auth-cloudflare.ts` now adds `prompt: "select_account"` to the Better Auth Google provider object when Google OAuth credentials are configured.
- `tests/vitest/cloudflare-better-auth-social-provider-config.test.ts` proves both current and legacy Google env var paths apply the account-picker policy and still return `undefined` when either credential is missing.
- `tests/vitest/auth-set-cookie-forwarding.test.ts` locks current-session-only sign-out semantics: Better Auth `/api/auth/sign-out`, local Better Auth session cookie clearing, `/login` redirect, and no Google logout/OAuth revocation endpoints.
- `tests/vitest/auth-proxy.test.ts` proves `state_mismatch` recovery does not carry inbound OAuth callback details into the reset URL and preserves no-store / Clear-Site-Data behavior.
- Red test evidence: a pre-implementation focused run failed only because `prompt: "select_account"` was absent. `tests/vitest/auth-proxy.test.ts` is Vitest-specific and does not run under Bun's native runner because it uses `vi.hoisted`.
- Green evidence after implementation:
  - `bunx vitest run --maxWorkers=1 tests/vitest/cloudflare-better-auth-social-provider-config.test.ts tests/vitest/auth-set-cookie-forwarding.test.ts tests/vitest/auth-proxy.test.ts tests/vitest/auth-error-mapping.test.ts tests/vitest/auth-entry-ui-contract.test.ts tests/vitest/project-invite-sign-out-route.test.ts` passed `6` files / `57` tests.
  - `git diff --check` passed.
  - `NODE_OPTIONS=--max-old-space-size=8192 bun run type-check` passed. The default-heap `bun run type-check` attempt aborted with Node heap exhaustion before emitting TypeScript diagnostics.
- Independent read-only `code-reviewer` review found no findings in the scoped slice. Reviewer validation included `git diff --check`, static pattern scan, high-memory `bun run type-check`, and focused Vitest for the three scoped test files (`45` tests).

Remaining gaps:

- No real Google account-picker/browser/provider proof was run, so this evidence proves configured Better Auth options, not live Google UI behavior.
- No deployment, Cloudflare provider mutation, migration, or production proof was run.
- Phase 2 durable lockout, Phase 3 authz matrix, Phase 4 share/privacy controls, and Phase 5 provider-leftover cleanup remain open.

## Decisions For Phase 1

| Decision | Choice | Rationale |
|---|---|---|
| Google prompt policy | Add `prompt: "select_account"` to the Better Auth Google provider config. | It directly fixes account switching without forcing consent churn or asking for offline refresh-token behavior. |
| Sign-out semantics | Keep Phase 1 sign-out local-session-only: invalidate the current Better Auth session and clear local session cookies; do not imply Google logout, OAuth grant revocation, or all-session invalidation. | This matches current product behavior, avoids disruptive provider-wide logout, and makes account switching depend on the next sign-in picker. |
| State mismatch posture | Keep reactive recovery, prove redacted copy and URL behavior, and leave persistent telemetry as a follow-up unless the coding task identifies a safe request-context path. | The proxy path currently lacks an obvious D1/audit context; do not improvise credential-adjacent logging in Phase 1. |

## Work Packages

### WP1 - Google Provider Prompt

Files:
- `src/lib/auth/better-auth-cloudflare.ts`
- Candidate test: new focused Vitest or existing `tests/vitest/cloudflare-better-auth-route.test.ts`

Test-first proof:
- Add a failing test that calls `resolveCloudflareBetterAuthSocialProviders` with Google env values and expects `google.prompt === "select_account"`.
- Assert the resolver still returns `undefined` when either Google credential is missing.

Implementation:
- Add `prompt: "select_account"` to the Google provider object.
- Keep `requestSignUp: true` unchanged in `signInWithGoogle`; it is signup gating, not account-picker policy.

Verification:
- Focused Vitest for the provider resolver.
- Type check only if the implementation changes the provider type surface.
- Browser/provider proof is optional and required only before claiming real Google account-picker behavior.

### WP2 - Explicit Local Sign-Out Policy

Files:
- `src/lib/auth/actions.ts`
- `src/app/invite/[token]/sign-out/route.ts`
- Candidate tests: `tests/vitest/auth-set-cookie-forwarding.test.ts`, `tests/vitest/project-invite-sign-out-route.test.ts`, or a new focused auth action source-contract test.

Test-first proof:
- Assert `signOut` calls `/api/auth/sign-out`, clears `better-auth.session_token` and `__Secure-better-auth.session_token`, and redirects to `/login`.
- Assert Phase 1 source does not add Google logout redirects or OAuth revocation claims unless a separate product decision changes scope.
- Assert invite wrong-account sign-out still delegates to Better Auth sign-out and returns to the invite path.

Implementation:
- Prefer no behavior change beyond comments/copy/tests unless existing tests expose a bug.
- If source comments are added, make them explicit: local Better Auth session only.

Verification:
- Focused auth action/invite sign-out Vitest.
- No provider proof claim.

### WP3 - State Mismatch Recovery Copy And Redaction

Files:
- `src/lib/auth/request-proxy.ts`
- `src/components/auth/AuthStateMismatchRecoveryScript.tsx`
- `src/lib/auth/error-mapping.ts`
- Candidate tests: `tests/vitest/auth-proxy.test.ts`, `tests/vitest/auth-entry-ui-contract.test.ts`, `tests/vitest/auth-error-mapping.test.ts`, `tests/vitest/auth-callback-normalizer-worker.test.ts`

Test-first proof:
- Assert the recovery redirect uses fixed safe params (`next=/workshop`, `oauth_state_reset=1`) and never copies inbound OAuth state, code, cookie, or provider query values.
- Assert public copy remains user-safe and does not expose internal cookie/state names.
- Assert `Clear-Site-Data` and OAuth state cookie clearing remain present for the server recovery path.

Implementation:
- Keep the current reactive recovery unless tests expose a redaction or copy bug.
- If adding telemetry is requested in the future, record only fixed event names and sanitized path/category fields; never record OAuth state, code, cookies, raw emails, invite/share URLs, or full callback URLs.

Verification:
- Focused proxy/error/UI contract Vitest.
- `git diff --check`.

## Actual Phase 1 Command Set

The implementation pass used:

```sh
bunx vitest run --maxWorkers=1 tests/vitest/cloudflare-better-auth-social-provider-config.test.ts tests/vitest/auth-set-cookie-forwarding.test.ts tests/vitest/auth-proxy.test.ts tests/vitest/auth-error-mapping.test.ts tests/vitest/auth-entry-ui-contract.test.ts tests/vitest/project-invite-sign-out-route.test.ts
NODE_OPTIONS=--max-old-space-size=8192 bun run type-check
git diff --check
```

If a future task claims real Google account-picker behavior, add a separate browser/provider proof path and redact all OAuth state/codes/cookies/session material from artifacts.

## Exit Criteria

- Provider config test proves `prompt: "select_account"` is present when Google OAuth is configured.
- Logout tests and source comments/copy state local-session-only semantics without claiming Google logout or OAuth grant revocation.
- State mismatch tests prove redacted recovery behavior and safe public copy.
- No Phase 2-5 work is bundled into Phase 1.
- `17_FINAL_READINESS_REVIEW.md` is updated only after implementation evidence exists.
