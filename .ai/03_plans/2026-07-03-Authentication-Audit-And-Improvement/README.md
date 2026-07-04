# 2026-07-03 - Authentication Audit And Improvement

**Status:** `CONDITIONALLY READY` as a planning package. It is ready for a future phase-scoped implementation-planning pass to start at `11_IMPLEMENTATION_PLAN.md`, but it is **not** coding authorization, production-cutover proof, or permission to edit source files in this planning pass.

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
- Phase 1 can address the Google picker/state/logout policy once tests are added.
- Phase 2 must resolve durable publication password lockout before any claim of share-link hardening.
- Phase 3 must finish the authz matrix and role taxonomy before broad tenant-authz refactors.
- Phase 4 must prove viewer/publication isolation and redaction behavior.
- Phase 5 must clean provider leftovers only after each artifact is classified as active, archaeology, delete, rotate/remove, or sibling-pack blocked.

No coding, provider mutation, migration, deployment, secret rotation, or source cleanup starts from this pack alone. A separate coding/implementation plan or explicit implementation task must revalidate current source, choose the exact phase slice, and define the code/test ownership before edits begin.

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
| 15 | `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md` | Decisions, assumptions, rejected options | Drafted |
| 16 | `16_REQUIREMENTS_TRACEABILITY_MATRIX.md` | Requirement-to-phase-to-test traceability | Drafted |
| 17 | `17_FINAL_READINESS_REVIEW.md` | Current readiness verdict and open gates | Drafted |
| 18 | `18_STACK_CONTRACT_AND_PRODUCTION_STANDARDS.md` | Stack/standards contract | Drafted |
| 19 | `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md` | Research and independent review evidence | Drafted |
| 20 | `20_CREDENTIAL_MATERIAL_TAXONOMY.md` | Credential/bearer material inventory | Drafted |
| 21 | `21_LEGACY_PROVIDER_CLEANUP_WORKSHEET.md` | Supabase/Vercel/Resend-era cleanup worksheet | Drafted |

---

## Future Implementation-Planning Entrypoint

Start with `11_IMPLEMENTATION_PLAN.md` only after a separate implementation-planning or coding task is opened. Do not skip the phase gates, and do not merge unrelated cleanup into auth/security phases.

---

## Revalidation Checklist Before Any Code Edit

1. Re-read `.ai/10_state/current-state.md` FAST PATH.
2. Confirm `package.json`, `wrangler.jsonc`, `.env.example`, `src/lib/auth/better-auth-cloudflare.ts`, `src/app/api/auth/[...all]/route.ts`, and `src/lib/auth/request-proxy.ts` still match this pack's assumptions.
3. Confirm Better Auth docs for the installed version still support Google provider `prompt`, OAuth state strategy, CSRF defaults, and session revocation behavior.
4. Re-run targeted `rg` for `supabase`, `vercel`, `resend`, `sb-`, `auth/callback`, and auth cookie names before deleting provider leftovers.
5. Treat all tokens, cookies, OAuth state, invite/share URLs, email addresses, and provider logs as credential-adjacent evidence and redact them in artifacts.
