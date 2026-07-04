# 2026-07-03 - Authentication Audit And Improvement

**Status:** `CONDITIONALLY READY` as a planning package. Phase-scoped local implementation evidence now exists for Phases 1-4, and Phase 5 now has classification/current-worktree re-audit evidence, Slice 0 target-literal cleanup, Slice A proof-utility archive evidence, Slice A2 provider-only proof-test archive evidence, Slice B allowlist evidence, Slice D0-D3 type-reference inventory/migration/deletion evidence, historical `src/lib/supabase/types.ts` retirement evidence, and the `29` file-level provider-string inventory. Phase 6 final verification audit evidence exists in `27`, but this pack is still **not** production-cutover proof, provider/browser proof, provider-dashboard/hosted/operator provider-exit/final-review proof, or permission to mutate providers/secrets.

Active-goal workflow checkpoint: `00`, `19`, and `27` record that requested workflow skills and docs-only continuation work are guardrails, not completion evidence. The 2026-07-04 legal-owner readiness artifact failed closed with `legalOwnerReady=false`, so the native goal remains active while hosted/provider/operator/legal/privacy/cleanup/final-review gates remain unproven or unaccepted.

**Plan profile:** `exhaustive`.

**Verification mode:** `independent`. The pack integrates direct source inspection, official-doc research, and separate read-only lanes for repo mapping, UX, security review, and external standards. No browser/provider/runtime proof was run.

**Plan directory:** `.ai/03_plans/2026-07-03-Authentication-Audit-And-Improvement/`

**Authority stack:**
- User brief and attached improvement directives.
- `AGENTS.md`, `.ai/10_state/current-state.md` FAST PATH, current source, current tests, and current provider config files.
- Local Next.js 16 docs in `node_modules/next/dist/docs/`.
- Official Better Auth, Cloudflare, OWASP, NIST, and EDPB/GDPR guidance cited in `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md`.
- Older UX/spec/roadmap docs only where reconciled against current source.

---

## Why This Pack Exists

The original trigger was a Google sign-in bug: first click sometimes errors, and the second click can silently reuse the cached Google account without showing the account picker. Source inspection confirms the immediate issue is a missing Google OAuth `prompt` option in Better Auth provider config, with related state-cookie and logout semantics to decide.

The wider finding is more important: Archestimator now runs Cloudflare-first auth planning around Better Auth, D1, Worker routes, invite tokens, publication/share recipient sessions, closed beta, terms acceptance, and app-layer authorization. A one-line picker fix would not be enough without hardening the security boundaries around those surfaces.

---

## Master Goal

Any user entering through the correct access path can authenticate, recover, and reach the correct authorization boundary without account confusion, stale-state lockouts, token leakage, or cross-tenant/public-share escalation.

Canonical access paths:
- Anonymous Visitor
- Primary App User
- Project Collaborator
- Shared-Link Recipient
- Off-Platform Source Contact

---

## Scope

In scope:
- Better Auth Google OAuth account-picker, state-cookie recovery, and logout/session semantics.
- Better Auth session and route-handler policy on Cloudflare/OpenNext.
- Closed-beta and terms gates.
- Invite-token entry, wrong-account repair, pending-invite bridge cookies, and invite rate limits.
- Workspace/project/estimate authorization and role taxonomy.
- Publication/share-token/password/session/CSRF boundaries.
- Cloudflare-first provider cleanup for stale Supabase/Vercel/Resend-era auth assumptions.
- Credential-material taxonomy, evidence redaction, privacy/retention/DSAR, and standards mapping.

Out of scope:
- Application source edits in this planning pass.
- Provider mutation, migrations, secret rotation, deployments, commits, pushes, or browser/provider proof.
- Full Cloudflare production cutover. That remains coordinated with the sibling Cloudflare migration pack.

---

## Readiness Gates

Future implementation planning can begin only as phase-scoped work:
- Phase 1 local code/test slice is recorded in `22`; browser/provider proof remains separate.
- Phase 2 local durable-lockout slice is recorded in `23`; hosted D1/Worker proof remains separate.
- Phase 3 local authz/role work packages are recorded in `24`; hosted/two-client proof remains separate.
- Phase 4 local share/privacy/redaction slice is recorded in `25`; hosted log/legal proof remains separate.
- Phase 5 classification and current-worktree re-audit are recorded in `26`; the sibling cleanup ledger now records substantial repo-local cleanup implementation, while current scans still intentionally find legacy provider scanner/test/security fixtures outside `supabase/**`. `15` records the decision guardrail that cleanup must re-run the live provider-string, type-reference, caller-graph, and broadened provider-boundary allowlist checks before further stale proof utility or provider-string references. `28` converts those remaining hits into implementation-ready cleanup buckets and records the Slice 0 target-literal cleanup/verification, Slice A proof-utility archive, Slice A2 provider-only proof-test archive, Slice B allowlist proof, Slice D0-D3 type-reference inventory/migration/deletion proof, historical `src/lib/supabase/types.ts` retirement proof, and scoped scanner-review fix; `29` records the original file-level inventory (`60` old-provider keyword hits), the current narrow count (`44` old-provider keyword hits), the broadened allowlist count (`89` active-surface provider-boundary hits), the current `4` active historical type-reference path-reference files split into `0` deletion blockers plus `4` non-blocking guard/audit-tooling files, no direct active imports for the archived shared-link proof utilities/provider-only proof tests outside `supabase/**`, `providerCleanupAllowlistReady=true`, `finalProviderCleanupReady=true`, and `typeReferenceDeletionReady=true`. The 2026-07-04T09:04:19Z provider-exit/source-smoke/template refresh still leaves provider exit blocked, with source-smoke blocked by the dirty/current-HEAD mismatch and operator/external gates still open; the source-smoke and operator-record templates are sanitized handoff artifacts rather than proof. Provider-dashboard/hosted/operator provider-exit/final-review proof remains separate.
- Phase 6 final verification/completion audit is recorded in `27`; it keeps the active goal incomplete, including via `update_goal({status: "complete"})`, until residual hosted/provider/operator/legal/privacy/cleanup/final-review gates are proven or explicitly accepted. The current legal-owner helper artifact is negative evidence, not approval.

Beyond the explicitly recorded local phase slices, no additional coding, provider mutation, migration, deployment, secret rotation, or source cleanup starts from this pack alone. A separate coding/implementation plan or explicit implementation task must revalidate current source, choose the exact phase slice, and define the code/test ownership before edits begin.

Production readiness remains blocked until:
- All P0/P1 risks in `14_RISK_REGISTER.md` are closed or explicitly accepted.
- `12_TEST_AND_VALIDATION_STRATEGY.md` evidence is fresh.
- `17_FINAL_READINESS_REVIEW.md` is updated after implementation proof.
- Provider/browser claims have real provider or hosted proof, not static-plan evidence.

---

## Document Map

| # | Document | Purpose | Status |
|---|---|---|---|
| 00 | `00_AGENT_COORDINATION.md` | Evidence lanes, constraints, independent review ledger | Drafted |
| 01 | `01_EXECUTIVE_SUMMARY.md` | Executive findings and readiness posture | Drafted |
| 02 | `02_FEATURE_BRIEF_AND_SCOPE.md` | Product scope, user outcomes, boundaries | Drafted |
| 03 | `03_SOURCE_AND_CODEBASE_AUDIT.md` | Source audit seed plus 2026-07-03 refresh notes | Drafted |
| 04 | `04_REQUIREMENTS_SPECIFICATION.md` | Functional/non-functional/auth/privacy requirements | Drafted |
| 05 | `05_UX_UI_ACCESSIBILITY_PLAN.md` | Auth, invite, terms, share recovery state matrix | Drafted |
| 06 | `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md` | Cloudflare/Better Auth/D1 architecture plan | Drafted |
| 07 | `07_DATA_DATABASE_API_NETWORK_PLAN.md` | Data stores, APIs, cookies, network boundaries | Drafted |
| 08 | `08_SECURITY_PRIVACY_THREAT_MODEL.md` | Threat model, privacy controls, redaction policy | Drafted |
| 09 | `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md` | Worker reliability, observability, rate-limit posture | Drafted |
| 10 | `10_BLAST_RADIUS_AND_DEPENDENCIES.md` | Files, dependencies, provider leftovers, blast radius | Drafted |
| 11 | `11_IMPLEMENTATION_PLAN.md` | Future implementation-planning gates | Drafted |
| 12 | `12_TEST_AND_VALIDATION_STRATEGY.md` | Required tests and evidence gates | Drafted |
| 13 | `13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md` | Staged rollout, rollback, operations | Drafted |
| 14 | `14_RISK_REGISTER.md` | P0/P1/P2/P3 risks and mitigations | Drafted |
| 15 | `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md` | Decisions, assumptions, rejected options, and Phase 5 live-scan/caller-graph revalidation guardrail | Drafted |
| 16 | `16_REQUIREMENTS_TRACEABILITY_MATRIX.md` | Requirement-to-phase-to-test traceability | Drafted |
| 17 | `17_FINAL_READINESS_REVIEW.md` | Current readiness verdict and open gates | Drafted |
| 18 | `18_STACK_CONTRACT_AND_PRODUCTION_STANDARDS.md` | Stack/standards contract | Drafted |
| 19 | `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md` | Research and independent review evidence | Drafted |
| 20 | `20_CREDENTIAL_MATERIAL_TAXONOMY.md` | Credential/bearer material inventory | Drafted |
| 21 | `21_LEGACY_PROVIDER_CLEANUP_WORKSHEET.md` | Supabase/Vercel/Resend-era cleanup worksheet | Drafted |
| 22 | `22_PHASE_1_GOOGLE_PICKER_LOGOUT_STATE_PLAN.md` | Phase 1 implementation plan and local validation evidence | Local slice complete |
| 23 | `23_PHASE_2_DURABLE_PUBLICATION_LOCKOUT_PLAN.md` | Phase 2 durable publication password lockout plan and local validation evidence | Local slice complete |
| 24 | `24_PHASE_3_AUTHZ_MATRIX_AND_ROLE_TAXONOMY_PLAN.md` | Phase 3 authz matrix, role taxonomy, implementation notes, and local validation evidence | Local WP1-WP6 complete |
| 25 | `25_PHASE_4_SHARE_PRIVACY_REDACTION_PLAN.md` | Phase 4 share/app privacy, CSRF, redaction, runbook, and local validation evidence | First local slice complete |
| 26 | `26_PHASE_5_LEGACY_PROVIDER_CLEANUP_PLAN.md` | Phase 5 legacy provider artifact classification and cleanup bridge plan | Classification and re-audit complete |
| 27 | `27_PHASE_6_FINAL_VERIFICATION_COMPLETION_AUDIT.md` | Phase 6 final verification audit, skipped-proof log, residual-risk matrix, and non-completion verdict | Audit complete; goal remains open |
| 28 | `28_PHASE_5_REMAINING_PROVIDER_FIXTURE_CLEANUP_PLAN.md` | Remaining old-provider string fixture cleanup buckets, Slice 0 target-literal cleanup evidence, Slice A/A2 archive evidence, Slice B allowlist proof, Slice D0-D3 type-reference inventory/migration/deletion proof, historical type-file retirement proof, scoped scanner-review fix, and validation contract | Local provider-cleanup classification/file-retirement evidence complete; hosted/provider/operator/legal/privacy/cleanup/provider-exit/final-review gates still open |
| 29 | `29_PHASE_5_PROVIDER_STRING_FILE_INVENTORY.md` | Original file-level classification plus post-Slice-A2 provider-string count delta, Slice B allowlist proof, Slice D0-D3 historical type-reference inventory/migration/deletion delta, post-retirement final-ready allowlist delta, and broadened provider-boundary scanner delta | Inventory updated; hosted/provider/operator/legal/privacy/cleanup/provider-exit/final-review gates still open |

---

## Future Implementation-Planning Entrypoint

Start with `11_IMPLEMENTATION_PLAN.md` only after a separate implementation-planning or coding task is opened. For Phases 1-6, use `22` through `29` as the current phase-scoped evidence/plan artifacts after revalidating the files they name. For Phase 5 source/test cleanup, treat the low-risk Slice 0 item, the Slice A proof-utility archive, the Slice A2 provider-only proof-test archive, the Slice B allowlist report, the Slice D0-D3 type-reference inventory/migration/deletion chain, and the historical `src/lib/supabase/types.ts` retirement in `28` as locally cleared for their exact scopes. Do not skip the hosted/provider/operator/legal/privacy/cleanup/provider-exit/final-review gates, and do not merge unrelated cleanup into auth/security phases.

---

## Revalidation Checklist Before Any Code Edit

1. Re-read `.ai/10_state/current-state.md` FAST PATH.
2. Confirm `package.json`, `wrangler.jsonc`, `.env.example`, `src/lib/auth/better-auth-cloudflare.ts`, `src/app/api/auth/[...all]/route.ts`, and `src/lib/auth/request-proxy.ts` still match this pack's assumptions.
3. Confirm Better Auth docs for the installed version still support Google provider `prompt`, OAuth state strategy, CSRF defaults, and session revocation behavior.
4. Re-run targeted `rg` for `supabase`, `vercel`, `resend`, `sb-`, `auth/callback`, and auth cookie names before deleting provider leftovers.
5. Treat all tokens, cookies, OAuth state, invite/share URLs, email addresses, and provider logs as credential-adjacent evidence and redact them in artifacts.
