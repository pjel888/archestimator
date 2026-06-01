# 08 — Evidence Gap Register Delta

The third pass takes the evidence gaps from the second pass (`22_SECOND_PASS_REVIEW/07_EVIDENCE_GAP_REGISTER.md`) and adds the new evidence gaps surfaced by the Codex reconciliation. Evidence gaps are claims that remain important but cannot be fully proven from the available evidence (local repo only).

## New evidence gaps (third-pass)

### EG-20260601-3P-001: Share access cookie `Secure` and `SameSite` attributes in production

**Claim/risk:** Share access cookies and Supabase auth cookies have `Secure` and `SameSite` attributes correctly set in production.

**Current evidence:** `src/lib/publication/security.ts` creates cookies via Next.js `cookies()` API. The `Secure` flag depends on `NODE_ENV` and request protocol. `SameSite` is not explicitly set.

**Missing evidence:** Production deployment with HTTPS. Cannot verify from local code alone.

**Why it matters:** Without `Secure`, cookies could be transmitted over HTTP in MITM scenarios. Without explicit `SameSite`, the default behavior may not match the threat model for each cookie (e.g., the share unsubscribe link in an email is a cross-site navigation, which may need `SameSite: "Lax"`).

**How to verify:** Deploy to Vercel preview, inspect response headers with DevTools.

**Blocks production readiness:** Yes — should be verified before launch.

**Related finding:** SEC-20260601-3P-001 (Medium).

### EG-20260601-3P-002: HSTS header status in production

**Claim/risk:** `Strict-Transport-Security` header is set at the Vercel edge (or via `next.config.ts`).

**Current evidence:** `next.config.ts` does not set HSTS. Vercel's default behavior may include HSTS, but this is not verifiable from the repo.

**Missing evidence:** Production deployment response headers.

**Why it matters:** Without HSTS, downgrade attacks and protocol-downgrade MITM are possible on first visit.

**How to verify:** Inspect Vercel edge response headers, or add `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` to `next.config.ts`.

**Blocks production readiness:** Yes — should be verified before launch.

**Related recommendation:** R-19 (restated).

### EG-20260601-3P-003: Storage bucket RLS/policy configuration in Supabase

**Claim/risk:** Storage buckets (`component-attachments`, `component-images`, `project-images`) have appropriate RLS policies matching workspace isolation.

**Current evidence:** Upload routes use service-role clients for Storage writes. Bucket policies are configured in Supabase dashboard, not in repo migrations.

**Missing evidence:** Supabase Storage bucket configuration. No policy definitions in repo.

**Why it matters:** Publicly readable buckets could expose all uploaded files. Cross-workspace access could leak component images.

**How to verify:** Review Supabase Storage dashboard. Verify bucket access policies.

**Blocks production readiness:** Yes — should be verified before claims about file upload security.

**Related finding:** SEC-20260601-2P-007 (Medium, restated from 2P).

### EG-20260601-3P-004: AI endpoint cost amplification in absence of rate limits

**Claim/risk:** Without rate limits on `/api/ai/ask` and `/api/ai/package-builder`, a single authenticated user can issue unbounded requests, amplifying both DeepSeek cost and data-exfiltration risk.

**Current evidence:** No rate-limit invocation in `src/app/api/ai/ask/handler.ts` or `src/app/api/ai/package-builder/handler.ts`. F-RL-04 / SEC-20260601-3P-002.

**Missing evidence:** Production cost data, abuse patterns, DeepSeek API quotas.

**Why it matters:** The impact boundary is the main thing the third pass adjusts. Without real-world cost data, the "Medium" impact is a conservative estimate.

**How to verify:** Instrument DeepSeek call costs and apply rate limits based on real usage patterns.

**Blocks production readiness:** Yes — should be addressed before public launch.

**Related finding:** SEC-20260601-3P-002 (Medium).

## Closed evidence gaps (third-pass)

### EG-14 (from 1P/2P): `bun.lock` integrity in CI

**Status:** **Closed** — `--frozen-lockfile` IS used in CI. Codex's claim that lockfile integrity is not verified is rejected (FP-20260601-3P-005).

### EG-15 (from 1P/2P): `search_path` on SECURITY DEFINER functions

**Status:** **Closed** — every SECURITY DEFINER function in 32 migration files sets `search_path`. Codex's claim that the publish route lacks `search_path` is rejected (FP-20260601-3P-004).

## Carried-forward evidence gaps (from 2P `07_EVIDENCE_GAP_REGISTER.md`)

The following evidence gaps from the second pass remain open and are inherited by the third pass:

- **EG-01:** Supabase project configuration mirrors migration posture (live DB inspection needed)
- **EG-02:** Supabase Auth provider configuration (dashboard settings)
- **EG-03:** `Secure` cookie attribute in production (subsumed by EG-20260601-3P-001)
- **EG-04:** Vercel log scrubbing for secrets
- **EG-05:** Supabase Storage bucket RLS policies (subsumed by EG-20260601-3P-003)
- **EG-06:** DeepSeek data processing terms
- **EG-07:** Resend DPA and email delivery compliance
- **EG-08:** GitHub branch protection rules
- **EG-09:** Supabase at-rest encryption
- **EG-10:** HTTPS/TLS enforcement at Vercel edge (HSTS — subsumed by EG-20260601-3P-002)
- **EG-11:** E2E test coverage for security controls
- **EG-12:** Invite system live readiness

## Summary

| Gap | Status | Blocks production? |
|---|---|---|
| EG-01 (Migration vs live DB) | Open | Yes |
| EG-02 (Auth provider config) | Open | Yes |
| EG-03 (Secure cookies) | Subsumed by EG-20260601-3P-001 | Yes |
| EG-04 (Log scrubbing) | Open | Should verify |
| EG-05 (Storage RLS) | Subsumed by EG-20260601-3P-003 | Yes |
| EG-06 (DeepSeek DPA) | Open | Yes |
| EG-07 (Resend DPA) | Open | Yes |
| EG-08 (Branch protection) | Open | Should verify |
| EG-09 (At-rest encryption) | Open | Should verify |
| EG-10 (TLS/HSTS) | Subsumed by EG-20260601-3P-002 | Should verify |
| EG-11 (E2E tests) | Open | Should verify |
| EG-12 (Invite readiness) | Open | Only if invite enabled |
| **EG-20260601-3P-001** (Share cookie attrs) | New | Yes |
| **EG-20260601-3P-002** (HSTS) | New | Yes |
| **EG-20260601-3P-003** (Storage RLS) | New | Yes |
| **EG-20260601-3P-004** (AI cost amp) | New | Yes |
| EG-14 (lockfile integrity) | Closed | n/a |
| EG-15 (`search_path`) | Closed | n/a |
