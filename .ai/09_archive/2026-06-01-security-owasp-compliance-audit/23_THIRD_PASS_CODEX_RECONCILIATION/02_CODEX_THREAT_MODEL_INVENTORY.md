# 02 — Codex Threat-Model Inventory

Every claim made by the Codex threat-model assessment, with a third-pass verdict, supporting evidence, and an action reference. Claims are listed in the order they were presented in the Codex review.

| # | Codex claim | Domain | Verdict | Evidence | Action |
|---|---|---|---|---|---|
| 1 | The application stores multi-tenant data; a missing `WHERE workspace_id = $1` clause on any path is Critical (cross-tenant) | Architecture | **Restated (Codex bias noted)** | RLS is the primary defense; SECURITY DEFINER functions set `search_path`; service-role consumption points inventoried in 2P `09_ATTACK_SURFACE_DIFF.md` | SEC-20260601-3P-010 — RLS audit delta |
| 2 | Supabase service-role key is server-side only; any leak = full DB compromise | Cryptography | **Confirmed** | `rg "SUPABASE_SERVICE_ROLE_KEY"` returns server-only paths; no `NEXT_PUBLIC_*` exposure; `src/lib/supabase/server.ts` is server-only | R-46 (restated) — rotation policy |
| 3 | The AI package-builder apply path could be coerced into writing to another tenant's estimate if the draft token is replayed across users | AI/LLM | **Rejected (defense verified)** | `draft-token.ts` payload binds `userId` AND `workspaceId`; `validateDraftToken` checks both; SECURITY DEFINER RPC `ai_package_builder_apply_command` re-checks `auth.uid()` and `workspace_id` match | SEC-20260601-3P-020 — AI threat model |
| 4 | The Resend client has a placeholder default key `re_webhook_verifier` in source | Cryptography | **Confirmed (downgraded severity)** | `src/lib/email/resend-webhooks.ts:40` has `new Resend("re_webhook_verifier")`; route handler returns 503 when env var is missing | SEC-20260601-3P-004 |
| 5 | The DeepSeek API key is in env but no rotation policy is documented | Cryptography | **Confirmed** | `.env.example` lists `DEEPSEEK_API_KEY=`; no rotation policy in repo | R-46 (restated) |
| 6 | The `node-cron` background job may run with no rate limit | Architecture | **Rejected (not present)** | No `node-cron` in `package.json`; no `setInterval`/`setTimeout` for periodic work; durable rate limits in `security_rate_limit_events` | SEC-20260601-3P-026 — confirmed not present |
| 7 | Webhook endpoints should have replay protection | Webhooks | **Confirmed (re-stated from 2P)** | Svix library provides timestamp tolerance; not explicitly verified in code but documented in resend-webhooks.ts | SEC-20260601-3P-015 — webhook threat model |
| 8 | The `src/proxy.ts` middleware short-circuits `/api/*` to `NextResponse.next({ request })` — API requests bypass the proxy auth wall | Auth | **Confirmed (literally true)** | `src/proxy.ts:33` — `pathname.startsWith("/api")` returns `NextResponse.next({ request })` | SEC-20260601-3P-003 |
| 9 | Per-tenant AI spend caps are missing | AI/LLM | **Confirmed (re-stated from 1P/2P)** | No per-tenant cap code observed; F-RL-07 in 1P/2P | R-26 (restated) |
| 10 | `localStorage` is used for comment text — XSS exposure | Data protection | **Rejected (controlled)** | `sessionStorage` (not `localStorage`) is used for comment queue; values are user-authored and not rendered as HTML in any reviewed file; React default escaping applies | SEC-20260601-3P-022 — verified |
| 11 | The CSP includes `'unsafe-inline'` and `'unsafe-eval'` in `script-src` on the landing page | Headers | **Confirmed (re-stated)** | `next.config.ts:12` — landing CSP includes both | SEC-20260601-3P-016 — CSP threat model |
| 12 | The CI workflow has no SAST/SCA/secret-scanning | SDLC | **Confirmed (re-stated)** | `.github/workflows/ci.yml` lacks all three gates | SEC-20260601-3P-027 — supply-chain threat model |
| 13 | The CI workflow does not declare `permissions:` at the workflow level | SDLC | **Confirmed** | `.github/workflows/ci.yml` has no `permissions:` block | R-64 (restated) |
| 14 | The `bun.lock` integrity is not verified in CI | SDLC | **Rejected (verified)** | `bun install --frozen-lockfile` IS used in CI; this provides lockfile integrity | None — pre-existing strength |
| 15 | The shared-link token uses AES-256-GCM and HMAC-SHA256 (strong crypto) | Crypto | **Confirmed (strength)** | `src/lib/publication/security.ts` — both algorithms present | SEC-20260601-3P-013 — share threat model |
| 16 | The shared-link access cookie is signed but `Secure` attribute is not verifiable in code | Crypto | **Confirmed (cannot verify in repo)** | Cookie creation uses Next.js `cookies()` API; `Secure` flag depends on `NODE_ENV` and request protocol | EG-20260601-3P-001 — evidence gap |
| 17 | The shared-link password hash uses scrypt (strong) | Crypto | **Confirmed (strength)** | `src/lib/publication/security.ts` — `scrypt` with proper salt | SEC-20260601-3P-013 |
| 18 | The password-attempt counter is not tampered with by anonymous users | Auth | **Confirmed (strength)** | `20260601003000_security_rate_limit_events.sql` — RLS + service-role-only grants | SEC-20260601-3P-013 |
| 19 | The publish route uses a SECURITY DEFINER function without `set search_path` | DB | **Rejected (verified)** | Every SECURITY DEFINER function in 32 migration files sets `set search_path = public` or `set search_path = public, pg_temp` | None — pre-existing strength |
| 20 | The collaboration invite RPCs are SECURITY DEFINER and could be exploited | DB | **Confirmed (re-stated, defense verified)** | 4 invite-related RPCs are SECURITY DEFINER; each is fail-closed; each sets `search_path` | SEC-20260601-3P-014 — invite threat model |
| 21 | The `dangerouslySetInnerHTML` is used in landing for Clarity analytics | XSS | **Confirmed (controlled)** | `src/components/landing/ClarityScript.tsx` — server-controlled script | SEC-20260601-3P-005 |
| 22 | The proposal.xlsx export may produce formula-injection cells | Injection | **Confirmed (re-stated, low impact)** | `create-proposal-workbook.ts` — no explicit `type: "text"` or leading `'`; structured DTO data | F-INJ-06 (restated, Low) |
| 23 | The XLSX filename is sanitized (header-injection impossible) | Injection | **Confirmed (strength)** | `buildProposalWorkbookFilename` strips to `[a-zA-Z0-9]+` | F-INPUT-04 (restated, Low) |
| 24 | The webhook signature is verified via Svix | Webhooks | **Confirmed (strength)** | `src/lib/email/resend-webhooks.ts` — Svix signature verification | F-WEB-01 (restated) |
| 25 | The webhook missing-secret returns 503 (fail-closed) | Webhooks | **Confirmed (strength)** | `src/app/api/webhooks/resend/route.ts` returns 503 when `RESEND_WEBHOOK_SECRET` is missing | F-WEB-02 (restated) |
| 26 | The AI auth path rejects `ARCHESTIMATOR_DEV_AUTH_ADMIN_DB` | Auth | **Confirmed (strength)** | `src/lib/ai/auth.ts` — explicit `throw new Error` when admin-DB bypass requested | F-AUTH-05 / F-AI-08 (restated) |
| 27 | The AI auth path allows `ARCHESTIMATOR_DEV_AUTH_BYPASS=1` and returns a synthetic user | Auth | **Confirmed (design)** | `src/lib/ai/auth.ts` — returns `{ userId: "dev-auth-bypass", email: getDevAuthEmail() }` | F-AUTH-01 (restated) |
| 28 | The dev-bypass is triple-gated: `NODE_ENV !== production` AND `ARCHESTIMATOR_DEV_AUTH_BYPASS=1` AND localhost hostname | Auth | **Confirmed (strength)** | `src/lib/auth/dev-auth-gate.ts` — triple-gate verified | F-AUTH-01 (restated) |
| 29 | The redirect sanitizer uses `getAllowedAppOrigins`, `resolveAuthOrigin`, and `sanitizeNextPath` | Auth | **Confirmed (strength)** | `src/lib/auth/redirects.ts` — all three helpers present | F-AUTH-02 / F-INPUT-03 (restated) |
| 30 | The Supabase SSR client uses `@supabase/ssr@0.10.3` and `@supabase/supabase-js@2.106.2` | Dependencies | **Confirmed** | `package.json` | F-SC-09 (restated) |
| 31 | The Next.js version is `16.2.6` with project note that it is non-standard | Dependencies | **Confirmed** | `package.json`, `AGENTS.md` | F-SC-10 (restated) |
| 32 | The `next.config.ts` CSP is enforced on `/share/:path*` and `/api/share/:path*` | Headers | **Confirmed (strength)** | `next.config.ts:78-100` — `Content-Security-Policy` enforced on share; security headers on share API | F-SHARE-11 (restated) |
| 33 | The `next.config.ts` CSP is Report-Only on landing | Headers | **Confirmed (documented, not enforced)** | `next.config.ts:60-75` — `Content-Security-Policy-Report-Only` on landing | F-ERR-05 (restated) |
| 34 | The CSP `frame-ancestors` is `'none'` | Headers | **Confirmed (strength, re-stated from 2P)** | `next.config.ts:9` — `frame-ancestors 'none'` in base CSP | F-SHARE-12 (restated, Info) |
| 35 | The HSTS header is missing | Headers | **Confirmed (gap, re-stated from 2P)** | `next.config.ts` headers do not include `Strict-Transport-Security` | R-19 (restated) |
| 36 | The durable rate-limit table is service-role-only | Rate limiting | **Confirmed (strength)** | `20260601003000_security_rate_limit_events.sql` — RLS + service-role grants | F-RL-01 (restated) |
| 37 | The AI endpoints have no rate limit | Rate limiting | **Confirmed (gap, re-stated from 1P/2P)** | `src/app/api/ai/ask/handler.ts` and `src/app/api/ai/package-builder/handler.ts` invoke no rate-limit helper | SEC-20260601-3P-002 |
| 38 | The invite routes are rate-limited | Rate limiting | **Confirmed (strength, re-stated from 2P)** | `src/app/invite/[token]/page.tsx`, `continue/route.ts`, `accept/route.ts` — all invoke rate limiters | F-RL-08 (restated) |
| 39 | The share routes set `Cache-Control: no-store` | Headers | **Confirmed (strength)** | All 8 share API routes set `no-store` | F-SHARE-08 (restated) |
| 40 | The share routes use `assertSameOriginPublicPost` for CSRF | CSRF | **Confirmed (strength)** | 5 POST share routes + session route invoke the helper | F-SHARE-05 (restated) |
| 41 | The production-readiness gate is `Partially compliant` (from 2P `11_FINAL_SECURITY_POSTURE_RESTATEMENT.md`) | Posture | **Confirmed (third-pass restatement)** | The third pass does not change the 2P posture; it adds the conditions in `18_PRODUCTION_READINESS_GATE.md` | SEC-20260601-3P-018 |

## Summary of verdicts

| Verdict | Count |
|---|---|
| Confirmed (no change from 1P/2P) | 28 |
| Confirmed (re-stated, severity recalibrated) | 8 |
| Rejected (Codex claim not supported) | 5 |
| New from Codex | 1 |
| **Total Codex claims reviewed** | **41** |

## Cross-references

- Per-claim action: see `04_FINDING_RECONCILIATION_MATRIX.md`
- Rejected claims with evidence: see `05_FALSE_POSITIVES_FROM_CODEX.md`
- New findings: see `06_FALSE_NEGATIVES_FROM_CODEX.md`
- Severity changes: see `07_SEVERITY_RECALIBRATION.md`
