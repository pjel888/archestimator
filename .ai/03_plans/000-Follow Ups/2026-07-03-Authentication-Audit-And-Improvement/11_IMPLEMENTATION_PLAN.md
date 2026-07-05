# 11 - Future Implementation Planning Gates

This is the future implementation-planning entrypoint, not a coding authorization. Use it to create a separate phase-scoped implementation plan after revalidating current source. Do not edit source, tests, migrations, configs, provider state, or runtime data from this planning package alone.

## Current Phase Evidence Overlay

Use the phase artifacts below as the current evidence map before turning any gate in this file into implementation work:

| Phase | Current local status | Current evidence artifact | Boundary |
|---|---|---|---|
| Phase 1 - Google picker, logout policy, state recovery | Local code slice complete | `22_PHASE_1_GOOGLE_PICKER_LOGOUT_STATE_PLAN.md` | Real Google browser/provider proof and broader logout/revocation policy remain separate future claims. |
| Phase 2 - Durable publication password lockout | Local code slice complete | `23_PHASE_2_DURABLE_PUBLICATION_LOCKOUT_PLAN.md` | Hosted Cloudflare Worker/D1 proof remains separate. |
| Phase 3 - Authz matrix and role taxonomy | WP1-WP6 locally implemented and verified | `24_PHASE_3_AUTHZ_MATRIX_AND_ROLE_TAXONOMY_PLAN.md` | Hosted Worker/Durable Object, two-client realtime, browser, deployment, and production D1 proof remain separate. |
| Phase 4 - Share, privacy, redaction | First local code/docs slice complete | `25_PHASE_4_SHARE_PRIVACY_REDACTION_PLAN.md` | Hosted log spot check and legal/public-launch privacy policy remain separate. |
| Phase 5 - Legacy provider cleanup | Local provider-cleanup/type-reference retirement complete; broader hosted/provider/operator/legal/privacy/cleanup/provider-exit/final-review proof still open | `26_PHASE_5_LEGACY_PROVIDER_CLEANUP_PLAN.md`, `28_PHASE_5_REMAINING_PROVIDER_FIXTURE_CLEANUP_PLAN.md`, `29_PHASE_5_PROVIDER_STRING_FILE_INVENTORY.md`, `evidence/2026-07-04-provider-cleanup-allowlist.json`, `evidence/2026-07-04-supabase-type-reference-retirement-inventory.json` | The primary scan baseline was `60` old-provider keyword files and now returns `44` under that narrow pattern; the canonical allowlist scanner now uses a broader provider-boundary token set and classifies `89` active-surface hit files. The regenerated allowlist report reports zero active-runtime blockers/cleanup candidates/unclassified files/type-reference-retirement files and sets `providerCleanupAllowlistReady=true` plus `finalProviderCleanupReady=true`. `src/lib/supabase/types.ts` has been deleted. The current path-reference scan returns `4` files, all non-blocking guard/audit-tooling references; the regenerated type-reference inventory reports `deletionBlockingFileCount=0` and `typeReferenceDeletionReady=true`. Focused validation passed the migrated Vitest suite (`17` files / `136` tests), the Bun P3 shared-link migration suite (`2` tests), the scanner suites (`2` files / `8` tests), provider-exit pack script tests (`1` file / `18` tests), and high-memory TypeScript check. The regenerated provider-exit pack has `activeLegacyProviderRuntimeBlockers=0`, but `providerExitReady=false` with five remaining deploy/source, export/retention, post-exit smoke, real Google persona, and real mailbox proof/deferral blockers. |
| Phase 6 - Final verification | Audit, active-goal workflow checkpoint, limited credential-free hosted HTTP evidence, legal-owner failed-closed evidence, legal-owner input template, scoped independent review, and executable completion-readiness gate complete; not a completion claim | `00_AGENT_COORDINATION.md`, `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md`, `27_PHASE_6_FINAL_VERIFICATION_COMPLETION_AUDIT.md`, `evidence/2026-07-05-hosted-route-contract-refresh.json`, `evidence/2026-07-05-hosted-sensitive-route-failclosed-refresh.json`, `evidence/2026-07-04-legal-owner-readiness.json`, `evidence/2026-07-04-legal-owner-readiness.template.json`, `evidence/2026-07-04-final-independent-review.json`, `evidence/2026-07-04-auth-audit-completion-readiness.json` | The active goal remains incomplete while hosted/provider/operator/legal/privacy/cleanup/provider-exit gates remain unproven or unaccepted. The 2026-07-05 hosted HTTP refresh passed credential-free public route contract and invalid-token/private-image fail-closed probes only; it is not latest deployed source, credentialed auth, real Google, provider-exit, mailbox, legal, browser, or deployed D1/DO proof. The scoped final independent review artifact passes only the aggregate checker's local review input; it is not provider, hosted runtime, legal/privacy, deployment, production, browser, or native-goal completion proof. The current legal-owner artifact has `legalOwnerReady=false` until real operator/legal confirmations and approval labels are supplied. The completion-readiness gate reports `localProviderCleanupReady=true`, `externalCompletionProofReady=false`, and `finalAuthAuditCompletionReady=false` because latest deploy/source smoke, provider-exit pack, and legal-owner readiness are still open. Workflow skill usage is process discipline, not completion evidence. |

## Phase 0 - Revalidate

Planning gates:
1. Re-read current-state FAST PATH and this pack.
2. Confirm package/runtime versions and auth source files still match assumptions.
3. Run targeted `rg` for auth provider leftovers and cookie names.
4. Update this pack if source moved before turning any phase into code work.

Exit criteria for a later implementation plan:
- No stale high-impact assumptions remain.
- The exact files/tests/providers in scope are named before edits begin.

2026-07-04 revalidation result for the current planning pass:
- Stack and active auth files still match this pack's Phase 1 assumptions.
- Current migrations extend through `0030_workspace_owner_membership_backfill.sql`.
- `0014_publication_shared_links.sql` contains the core publication/share tables; Phase 2 is now specifically about durable hard-lock enforcement versus the remaining in-memory lockout path, not about assuming publication tables are absent.
- No source, test, migration, provider, or runtime edits were made in this planning pass.

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
1. Choose whether to extend existing D1 rate-limit/event storage into durable hard-lock rows or use a Durable Object singleton.
2. Specify the failing test that simulates in-memory reset/isolate rotation.
3. Specify the durable hard-lock implementation surface.
4. Keep progressive delay and user-facing lockout copy consistent.
5. Specify observability events and redaction rules.
6. Reconcile D1 publication schema status: verify the current applied D1 schema contains the `0014` publication/share tables and identify any additional hard-lock table/row design required for Phase 2.

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
6. Treat the Slice A proof-utility archive in `28` as locally complete for the eight moved stale proof utilities and two moved direct dependent Vitest tests, and treat Slice A2 as locally complete for the two provider-only proof tests moved under `supabase/migration-evidence/provider-parity-proofs/tests/`. Re-run the live caller check before any further proof-utility cleanup.
7. Treat the low-risk Slice 0 stale text/scaffold cleanup in `28` as target-literal clean in the current worktree, including verification of the concurrently edited publication-page test. Do not fold allowlist construction or `src/lib/supabase/types.ts` retirement into the Slice 0, Slice A, or Slice A2 results.
8. Treat the current Slice B/D3 plus review-fix allowlist report as the local provider-cleanup proof for retained old-provider strings and broader provider-boundary tokens: active runtime blockers, cleanup candidates, unclassified files, and type-reference-retirement files are zero, and `finalProviderCleanupReady=true`. This does not prove provider-exit, hosted runtime, provider-dashboard, or final-review gates.
9. Treat the Slice D/D3 type-reference evidence as the current blocker map for the retired `src/lib/supabase/types.ts` file: all active deletion-blocking path references have been migrated to D1/current source checks, the historical file has been deleted, the current scan has `4` non-blocking guard/audit-tooling references, and `typeReferenceDeletionReady=true`.

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

2026-07-04 final verification audit result:
- `27_PHASE_6_FINAL_VERIFICATION_COMPLETION_AUDIT.md` records the current tests, skipped proof, residual risks, and non-completion verdict.
- `00_AGENT_COORDINATION.md`, `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md`, and `27` record the active-goal workflow checkpoint: requested workflow skills and docs-only continuation work are guardrails, not proof that residual gates passed.
- The 2026-07-05T04:25:43Z deploy/source smoke refresh is still `NOT READY`; the shared worktree currently has dirty runtime source paths, and the deployed commit still differs from current HEAD with a deployment timestamp older than current HEAD.
- The 2026-07-05T04:26:12Z provider-exit pack remains `providerExitReady=false` with `activeLegacyProviderRuntimeBlockers=0` and five external/operator gates open: latest deploy/source smoke, export/retention decision, post-exit smoke, real non-owner Google proof or accepted deferral, and real recipient mailbox proof or accepted deferral.
- The 2026-07-05T04:00Z credential-free hosted HTTP refresh passed `16` public/protected route-contract probes and `6` invalid-token/private-image fail-closed/no-store probes. This is partial hosted evidence only; it does not close source freshness, credentialed auth, real Google, mailbox, provider-exit, legal approval, browser, or deployed D1/DO gates.
- The 2026-07-05T03:46:33Z legal-owner readiness helper failed closed with `legalOwnerReady=false`, all five legal proof flags false, and missing owner/reviewer/date/reference labels. This is negative evidence, not approval.
- The legal-owner readiness template lists the required sanitized proof flags and labels for an operator/legal follow-up. This template does not close legal readiness.
- The 2026-07-05T04:26:24Z auth-audit completion readiness checker failed closed as expected: local provider-cleanup, type-reference retirement, and scoped final independent review gates pass, but `externalCompletionProofReady=false` and `finalAuthAuditCompletionReady=false` until latest deploy/source smoke, provider-exit pack, and legal-owner readiness all pass.
- Current status remains `CONDITIONALLY READY`; local Phases 1-4 have scoped proof, Phase 5 has local provider-cleanup/type-reference-retirement proof, and only limited credential-free hosted HTTP proof has been added. Hosted credentialed runtime, provider/operator/legal/privacy/cleanup/provider-exit gates remain open. The final independent review artifact is scoped to the checker/docs lane and does not close full hosted/provider/legal completion.
- The active goal must not be marked complete from this pack alone.
