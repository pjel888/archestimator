# 11 - Implementation Plan

This is the implementation entrypoint. Execute phases in order unless fresh evidence proves a different order is safer.

## Phase 0 - Revalidate

Actions:
1. Re-read current-state FAST PATH and this pack.
2. Confirm package/runtime versions and auth source files still match assumptions.
3. Run targeted `rg` for auth provider leftovers and cookie names.
4. Update this pack if source moved.

Exit criteria:
- No stale high-impact assumptions remain.

## Phase 1 - Google Picker, Logout Policy, State Recovery

Actions:
1. Add a test that fails because the Google authorization URL/config lacks the selected prompt policy.
2. Add the prompt config in Better Auth Google provider setup.
3. Decide and document sign-out semantics: local session only, all Better Auth sessions, OAuth grant revocation, or Google logout redirect.
4. Add tests for the chosen sign-out policy.
5. Add or verify `state_mismatch` recovery telemetry/copy without exposing state/codes/cookies.

Exit criteria:
- Account picker behavior is test-proven.
- Logout policy is explicit and test-proven.
- State mismatch evidence is redacted.

## Phase 2 - Durable Publication Password Lockout

Actions:
1. Choose D1 hard-lock rows or Durable Object singleton.
2. Write a failing test that simulates in-memory reset/isolate rotation.
3. Implement durable hard lock.
4. Keep progressive delay and user-facing lockout copy consistent.
5. Update observability events.

Exit criteria:
- Lockout survives module/global state reset.
- Tests prove wrong-password, locked, expired lock, and correct-password behavior.

## Phase 3 - Authz Matrix And Role Taxonomy

Actions:
1. Fill the actor x object x role x check-location matrix from source.
2. Centralize role types/helpers for app, workspace, project, estimate, beta-admin, and share-recipient distinctions.
3. Add fail-closed tests for representative reads/mutations across workspace, project, estimate, invite, beta-admin, and settings.
4. Decide whether Better Auth organization/access-control plugin is useful after the local model is explicit.

Exit criteria:
- No protected mutation lacks a server-side object-role check.
- `editor` and other scoped roles are typed where valid and rejected where invalid.

## Phase 4 - Share, Privacy, Redaction

Actions:
1. Prove Better Auth session cannot satisfy share access and share/viewer session cannot satisfy app auth.
2. Verify share password/session/CSRF/no-store chain.
3. Implement or verify log/evidence/analytics redaction for tokens, state, cookies, emails, and share/invite URL paths.
4. Define retention/DSAR/breach handling for auth artifacts.

Exit criteria:
- Viewer/app boundary tests pass.
- Redaction tests pass.
- Privacy/retention decisions are documented.

## Phase 5 - Legacy Provider Cleanup

Actions:
1. Use `21_LEGACY_PROVIDER_CLEANUP_WORKSHEET.md`.
2. Classify each Supabase/Vercel/Resend-era artifact before touching it.
3. Delete only artifacts classified `delete` with tests.
4. Rotate/remove obsolete provider secrets only through the Cloudflare/provider-exit runbook owner.
5. Update stale docs/tests to Cloudflare-first wording.

Exit criteria:
- No active runtime artifact is misclassified.
- Stale docs no longer call Supabase Auth/Vercel the active auth runtime.

## Phase 6 - Final Verification

Actions:
1. Run targeted tests for each changed area.
2. Run broader validation only if shared authz/runtime/security code changed enough to justify it.
3. Run provider/browser proof only for claims that require provider/browser evidence.
4. Update `17_FINAL_READINESS_REVIEW.md`.

Exit criteria:
- P0/P1 risks are closed or accepted.
- Final report includes tests run, skipped proof, and residual risks.
