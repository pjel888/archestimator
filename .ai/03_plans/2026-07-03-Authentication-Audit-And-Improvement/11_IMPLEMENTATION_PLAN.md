# 11 - Future Implementation Planning Gates

This is the future implementation-planning entrypoint, not a coding authorization. Use it to create a separate phase-scoped implementation plan after revalidating current source. Do not edit source, tests, migrations, configs, provider state, or runtime data from this planning package alone.

## Phase 0 - Revalidate

Planning gates:
1. Re-read current-state FAST PATH and this pack.
2. Confirm package/runtime versions and auth source files still match assumptions.
3. Run targeted `rg` for auth provider leftovers and cookie names.
4. Update this pack if source moved before turning any phase into code work.

Exit criteria for a later implementation plan:
- No stale high-impact assumptions remain.
- The exact files/tests/providers in scope are named before edits begin.

## Phase 1 - Google Picker, Logout Policy, State Recovery

Planning gates:
1. Specify the failing test that should prove the Google authorization URL/config lacks the selected prompt policy.
2. Specify the Better Auth Google provider prompt policy to add.
3. Decide and document sign-out semantics: local session only, all Better Auth sessions, OAuth grant revocation, or Google logout redirect.
4. Specify tests for the chosen sign-out policy.
5. Specify `state_mismatch` recovery telemetry/copy proof that does not expose state/codes/cookies.

Exit criteria for a later implementation plan:
- Account picker behavior has a testable proof path.
- Logout policy is explicit and testable.
- State mismatch evidence stays redacted.

## Phase 2 - Durable Publication Password Lockout

Planning gates:
1. Choose D1 hard-lock rows or Durable Object singleton.
2. Specify the failing test that simulates in-memory reset/isolate rotation.
3. Specify the durable hard-lock implementation surface.
4. Keep progressive delay and user-facing lockout copy consistent.
5. Specify observability events and redaction rules.
6. Reconcile D1 publication schema status: verify whether current D1 migrations already contain the required publication/session/password-lockout tables or whether a separate migration/porting plan is required.

Exit criteria for a later implementation plan:
- Lockout durability proof covers module/global state reset.
- Wrong-password, locked, expired-lock, and correct-password behavior are specified.
- D1 schema assumptions are proven or explicitly planned.

## Phase 3 - Authz Matrix And Role Taxonomy

Planning gates:
1. Fill the actor x object x role x check-location matrix from source.
2. Define role types/helpers for app, workspace, project, estimate, beta-admin, and share-recipient distinctions.
3. Specify fail-closed tests for representative reads/mutations across workspace, project, estimate, invite, beta-admin, and settings.
4. Decide whether Better Auth organization/access-control plugin is useful after the local model is explicit.

Exit criteria for a later implementation plan:
- No protected mutation remains without a planned server-side object-role check.
- `editor` and other scoped roles are typed where valid and rejected where invalid.

## Phase 4 - Share, Privacy, Redaction

Planning gates:
1. Specify proof that Better Auth session cannot satisfy share access and share/viewer session cannot satisfy app auth.
2. Specify share password/session/CSRF/no-store proof.
3. Specify log/evidence/analytics redaction controls for tokens, state, cookies, emails, and share/invite URL paths.
4. Define retention/DSAR/breach handling for auth artifacts.
5. Reconcile D1 publication schema status before planning share/session/recipient persistence edits.

Exit criteria for a later implementation plan:
- Viewer/app boundary tests are named.
- Redaction tests are named.
- Privacy/retention decisions are documented or explicitly blocked.

## Phase 5 - Legacy Provider Cleanup

Planning gates:
1. Use `21_LEGACY_PROVIDER_CLEANUP_WORKSHEET.md`.
2. Classify each Supabase/Vercel/Resend-era artifact before touching it.
3. Plan deletion only for artifacts classified `delete` with tests.
4. Plan obsolete provider secret rotation/removal only through the Cloudflare/provider-exit runbook owner.
5. Specify stale docs/tests that need Cloudflare-first wording.

Exit criteria for a later implementation plan:
- No active runtime artifact is misclassified.
- Stale docs no longer call Supabase Auth/Vercel the active auth runtime after the future cleanup lands.

## Phase 6 - Final Verification

Planning gates:
1. Specify targeted tests for each changed area.
2. Specify broader validation only if shared authz/runtime/security code changes enough to justify it.
3. Specify provider/browser proof only for claims that require provider/browser evidence.
4. Specify the update required for `17_FINAL_READINESS_REVIEW.md`.

Exit criteria for a later implementation plan:
- P0/P1 risks are closed, accepted, or still tracked as blockers.
- Final report format includes tests run, skipped proof, and residual risks.
