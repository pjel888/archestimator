# 07 — Evidence Gap Register

Claims that remain important but cannot be fully proven from the available evidence (local repo only).

---

## EG-01: Supabase project configuration mirrors migration posture

**Claim/risk:** RLS policies in migration files match the live Supabase project configuration. All 48 migrations are applied.
**Current evidence:** Migration files in `supabase/migrations/` define the intended schema, RLS policies, grants, and SECURITY DEFINER functions. Test files assert migration content (`project-publication-schema.test.ts`, `ai-audit-schema.test.ts`, etc.).
**Missing evidence:** Live Supabase project inspection. No `supabase db dump` or dashboard screenshot to confirm actual applied state.
**Why it matters:** Migration files may not reflect live DB state if migrations failed, were manually altered, or were applied out of order.
**How to verify:** Run `supabase db diff` against linked project; compare dump to migration expectations.
**Blocks production readiness:** Yes — should be verified before compliance claims.

---

## EG-02: Supabase Auth provider configuration

**Claim/risk:** Google OAuth, magic link, and MFA policy are correctly configured in Supabase dashboard.
**Current evidence:** `src/app/auth/callback/route.ts` handles OAuth/OTP callback. `src/app/login/page.tsx` offers Google OAuth and magic link flows. Code is correct for the expected provider configuration.
**Missing evidence:** Supabase Auth dashboard settings — not in repo. MFA policy, password policy, session timeout are all Supabase-side settings.
**Why it matters:** Misconfigured auth providers could allow unauthorized access, weak session management, or missing MFA enforcement.
**How to verify:** Review Supabase dashboard Auth settings. Document provider configuration.
**Blocks production readiness:** Yes — auth provider configuration must be verified.

---

## EG-03: `Secure` cookie attribute in production

**Claim/risk:** Share access cookies and Supabase auth cookies have `Secure` flag in production.
**Current evidence:** Cookie creation code in `src/lib/publication/security.ts` creates cookies with appropriate attributes. Next.js and Supabase SSR library handle `Secure` flag based on `NODE_ENV` and request protocol.
**Missing evidence:** Production deployment with HTTPS. Cannot verify from local code alone.
**Why it matters:** Without `Secure`, cookies could be transmitted over HTTP in man-in-the-middle scenarios.
**How to verify:** Deploy to Vercel preview, inspect response headers with DevTools.
**Blocks production readiness:** Should be verified before launch.

---

## EG-04: Vercel log scrubbing for secrets

**Claim/risk:** SUPABASE_SERVICE_ROLE_KEY, DEEPSEEK_API_KEY, and other secrets are not logged in Vercel runtime logs.
**Current evidence:** No `console.log` of secret values observed in codebase. Service-role key is loaded via `process.env` and passed to Supabase client constructors.
**Missing evidence:** Vercel log scrubbing configuration. Not verifiable from repo — Vercel dashboard setting.
**Why it matters:** If a runtime error includes env vars in stack traces or log output, secrets could be exposed in Vercel log drains.
**How to verify:** Check Vercel project settings for log scrubbing. Review runtime logs for secret leakage.
**Blocks production readiness:** Should be verified before production deployment.

---

## EG-05: Supabase Storage bucket RLS policies

**Claim/risk:** Storage buckets (`component-attachments`, `component-images`, `project-images`) have appropriate RLS policies matching workspace isolation.
**Current evidence:** Upload routes use service-role clients for Storage writes. Bucket policies are configured in Supabase dashboard, not in repo migrations.
**Missing evidence:** Supabase Storage bucket configuration. No policy definitions in repo.
**Why it matters:** Publicly readable buckets could expose all uploaded files. Cross-workspace access could leak component images.
**How to verify:** Review Supabase Storage dashboard. Verify bucket access policies.
**Blocks production readiness:** Yes — should be verified before claims about file upload security.

---

## EG-06: DeepSeek data processing terms

**Claim/risk:** DeepSeek API usage complies with required data processing agreements.
**Current evidence:** Code sends user prompts and scoped context to DeepSeek. Server-side context selection minimizes PII.
**Missing evidence:** DeepSeek DPA, terms of service, data retention policy. Not in repo.
**Why it matters:** AI provider may retain prompts for training or have different privacy standards than required.
**How to verify:** Obtain DeepSeek DPA. Document data flow and retention commitments.
**Blocks production readiness:** Yes — legal review required before production AI features.

---

## EG-07: Resend DPA and email delivery compliance

**Claim/risk:** Transactional emails sent via Resend comply with privacy requirements.
**Current evidence:** `src/lib/email/resend-client.ts` sends emails. Webhook handles delivery events.
**Missing evidence:** Resend DPA, email template compliance with CAN-SPAM/GDPR footer requirements.
**Why it matters:** Email delivery to recipients must include unsubscribe, sender identification, and privacy notice links.
**How to verify:** Review Resend DPA. Verify email templates include required compliance footers.
**Blocks production readiness:** Yes — legal/compliance review required.

---

## EG-08: GitHub branch protection rules

**Claim/risk:** Main branch has required PR reviews, passing CI checks, and no direct pushes.
**Current evidence:** `AGENTS.md` mentions "use feature branches/PRs, do not merge to main automatically." CI runs on PRs and pushes to main.
**Missing evidence:** GitHub branch protection settings — not in repo, configured in GitHub UI.
**Why it matters:** Without branch protection, anyone with write access can push directly to main without review.
**How to verify:** Check GitHub repo Settings > Branches > Branch protection rules.
**Blocks production readiness:** Should be verified.

---

## EG-09: Supabase at-rest encryption

**Claim/risk:** Supabase Postgres and Storage use at-rest encryption.
**Current evidence:** Supabase documentation states all projects use encrypted storage.
**Missing evidence:** Supabase project tier/configuration confirmation. Not in repo.
**Why it matters:** Unencrypted database storage could expose data if physical media is compromised.
**How to verify:** Confirm Supabase project plan includes encryption at rest.
**Blocks production readiness:** Should be verified; likely satisfied for any paid Supabase plan.

---

## EG-10: HTTPS/TLS enforcement at Vercel edge

**Claim/risk:** All traffic is encrypted in transit via HTTPS with modern TLS.
**Current evidence:** All external URLs in code use `https://`. Vercel provides TLS termination by default.
**Missing evidence:** HSTS header, TLS version, cipher suite configuration. Partially in `next.config.ts` headers (no HSTS yet).
**Why it matters:** Downgrade attacks, weak cipher suites could compromise data in transit.
**How to verify:** Deploy and test with SSL Labs. Add HSTS header per R-19.
**Blocks production readiness:** Should be verified; add HSTS header before production.

---

## EG-11: E2E test coverage for security controls

**Claim/risk:** Security controls (CSRF, rate limiting, password lockout, token crypto) are covered by automated tests.
**Current evidence:** Vitest unit tests cover CSRF (`project-publication-security.test.ts`), rate limits (`project-publication-route.test.ts`, `project-publication-comments.test.tsx`), password attempts (`project-publication-security.test.ts`), token crypto (schema tests).
**Missing evidence:** No E2E tests run during this audit. E2E specs exist in `e2e/` but were not executed.
**Why it matters:** Unit tests verify contracts; E2E tests verify actual behavior against live services.
**How to verify:** Run E2E test suite with service-role keys and linked Supabase.
**Blocks production readiness:** E2E proof should be obtained before compliance claims.

---

## EG-12: Invite system live readiness

**Claim/risk:** The invite system is fail-closed and safe when disabled, but its live behavior is untested.
**Current evidence:** `PROJECT_INVITE_ENTRY_ENABLED=false`, `ARCHESTIMATOR_INVITE_TOKEN_PEPPER=` — fail-closed. Migration ensures token hashing, SECURITY DEFINER RPCs with `search_path`.
**Missing evidence:** Supabase Auth email provider not configured. No live invite flow tested in production-like environment.
**Why it matters:** The invite system has been designed carefully but never tested end-to-end with real email delivery.
**How to verify:** Configure Supabase Auth email provider, set real pepper, run invite E2E tests.
**Blocks production readiness:** Not if invite remains disabled. Blocks invite feature launch.

---

## Summary

| Gap | Blocks production? |
|---|---|
| EG-01 (Migration vs live DB) | Yes |
| EG-02 (Auth provider config) | Yes |
| EG-03 (Secure cookies) | Yes |
| EG-04 (Log scrubbing) | Should verify |
| EG-05 (Storage RLS) | Yes |
| EG-06 (DeepSeek DPA) | Yes |
| EG-07 (Resend DPA) | Yes |
| EG-08 (Branch protection) | Should verify |
| EG-09 (At-rest encryption) | Should verify |
| EG-10 (TLS/HSTS) | Should verify |
| EG-11 (E2E tests) | Should verify |
| EG-12 (Invite readiness) | Only if invite is enabled |
