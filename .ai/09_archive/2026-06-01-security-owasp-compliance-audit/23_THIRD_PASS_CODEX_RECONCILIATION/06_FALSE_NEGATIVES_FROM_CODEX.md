# 06 — False Negatives from Codex

Material risks that the Codex threat-model assessment surfaced but that the first/second pass did not explicitly cover. Each is recorded as SEC-20260601-3P-### with a Codex-style severity, evidence, and a remediation reference.

## SEC-20260601-3P-001 — Share access cookie `Secure` and `SameSite` attributes not verifiable in code

- **Severity:** Medium
- **Likelihood:** Low (production deployment should set `Secure` automatically)
- **Impact:** Medium (cookie interception if deployed over HTTP)
- **CWE:** CWE-614, CWE-1004
- **OWASP 2025:** A02
- **OWASP API 2023:** API8
- **ASVS 5.0:** V3.3, V14.5

**Evidence:**
- `src/lib/publication/security.ts` — the share access cookie is created via Next.js `cookies()` API. The `Secure` and `SameSite` attributes depend on `next/headers` defaults and the request protocol (HTTP vs HTTPS) at request time. They are not explicitly set in the cookie object.
- `src/proxy.ts` strips `no-store` from marketing pages for BFCache compatibility but does not set cookie attributes.

**Recommendation:** Explicitly set `Secure: true`, `HttpOnly: true`, `SameSite: "Strict"` (or `"Lax"` for the unsubscribe route) on every share-related cookie in `src/lib/publication/security.ts`. (R-3P-01)

**Why this is new:** The first/second pass flagged `EG-03` (Secure cookie attribute in production) as an evidence gap but did not promote it to a Medium finding with a remediation recommendation.

## SEC-20260601-3P-002 — AI endpoints (`/api/ai/ask`, `/api/ai/package-builder`) have no rate limit

- **Severity:** Medium
- **Likelihood:** Medium (authenticated workspace members can issue requests)
- **Impact:** Medium (DeepSeek cost amplification, data-leak amplification, no per-tenant cap)
- **CWE:** CWE-770
- **OWASP 2025:** A04
- **OWASP API 2023:** API4
- **ASVS 5.0:** V11.1
- **OWASP LLM Top 10:** LLM04

**Evidence:**
- `rg "rate.?limit|RateLimit|checkRateLimit" src/app/api/ai/` returns no matches in `ask/handler.ts` or `package-builder/handler.ts`.
- F-RL-04 in 1P/2P covers this finding. The third pass adds: even with per-user limits on DeepSeek, a single authenticated user with workspace access can issue unbounded requests, amplifying both cost and data-exfiltration risk (any data the user can see can be sent to DeepSeek via the Ask path).

**Recommendation:** Add a per-user (and per-workspace fallback) durable rate limit using the existing `security_rate_limit_events` infrastructure. Apply it in `src/app/api/ai/ask/handler.ts` and `src/app/api/ai/package-builder/handler.ts`. (R-25, restated with stronger impact boundary)

**Why this is new:** F-RL-04 was accurate but the Codex threat model pushes the impact boundary higher by surfacing the per-tenant cost-amplification angle.

## SEC-20260601-3P-003 — `/api/*` proxy short-circuit (intentional, defense-in-depth gap)

- **Severity:** Medium
- **Likelihood:** Low (route handlers enforce their own auth via `supabase.auth.getUser()` and RLS)
- **Impact:** Medium (no defense-in-depth at the proxy layer for API routes)
- **CWE:** CWE-693
- **OWASP 2025:** A05
- **ASVS 5.0:** V14.4

**Evidence:**
- `src/proxy.ts:33` — `pathname.startsWith("/api")` returns `NextResponse.next({ request })` immediately, without invoking the auth gate. This is intentional (route handlers enforce their own auth) but it is **literally true** that API requests bypass the proxy auth wall.
- RLS is the secondary defense; route handlers use `supabase.auth.getUser()` which throws if the session is invalid.
- The first/second pass did not document this as a distinct finding; it was mentioned only in the 2P attack surface diff.

**Recommendation:** Add a defense-in-depth middleware gate for `/api/*` that invokes `supabase.auth.getUser()` and returns 401 for missing/invalid sessions. RLS would still be the final defense. (R-3P-02)

**Why this is new:** The Codex review surfaced the proxy bypass as a literal fact. The 1P/2P documents discussed the proxy but did not call out the API bypass explicitly. The risk is bounded by handler-level auth + RLS, so the rating is Medium (defense-in-depth), not High or Critical.

## SEC-20260601-3P-004 — `Resend("re_webhook_verifier")` placeholder default in `src/lib/email/resend-webhooks.ts:40`

- **Severity:** Low (downgraded from Medium)
- **Likelihood:** Low (route handler returns 503 when `RESEND_API_KEY` is missing)
- **Impact:** Low (drift risk only; placeholder never used in production)
- **CWE:** CWE-1188
- **OWASP 2025:** A05
- **ASVS 5.0:** V14.1

**Evidence:**
- `src/lib/email/resend-webhooks.ts:40` — `const resend = new Resend("re_webhook_verifier");`
- `src/app/api/webhooks/resend/route.ts` — `if (!process.env.RESEND_API_KEY) { return new Response("Webhook secret not configured", { status: 503 }); }` — fail-closed at the route level.
- The placeholder string `"re_webhook_verifier"` is never used to actually send email; it is only the default argument to the `Resend` constructor. The constructor is invoked but no email is sent unless the route handler is reached and the env var is present.

**Recommendation:** Replace the placeholder default with an explicit null/empty check in the `Resend` constructor call, or lazily instantiate the client only when `RESEND_API_KEY` is present. (R-3P-03)

**Why this is new (re-stated):** F-CRYPTO-06 / F-WEB-03 was rated Medium. The third pass re-evaluates: because the route handler returns 503 when the env var is missing, the placeholder string is never used to send email. The risk is **drift only** — if a future developer changes the 503 to a 200, the placeholder could become active. Hence Low.

## SEC-20260601-3P-005 — `dangerouslySetInnerHTML` in `src/components/landing/ClarityScript.tsx`

- **Severity:** Low (controlled, documented)
- **Likelihood:** Low (source is server-controlled)
- **Impact:** Low (Microsoft Clarity analytics script, no user input)
- **CWE:** CWE-79
- **OWASP 2025:** A03
- **ASVS 5.0:** V5.3

**Evidence:**
- `src/components/landing/ClarityScript.tsx` uses `dangerouslySetInnerHTML` to inject the Microsoft Clarity analytics script tag.
- The injected HTML is a string literal built in the component; no user input is included.
- Microsoft Clarity is a third-party analytics provider; the script is loaded from `https://www.clarity.ms`.

**Recommendation:** No action required. This is a controlled, documented use of `dangerouslySetInnerHTML` for analytics. The CSP allows `https://*.clarity.ms` in `script-src`. (R-3P-04 — informational)

**Why this is new:** The first pass claimed "no `dangerouslySetInnerHTML` observed"; the 2P corrected that to note the ClarityScript usage but did not call it out as a finding. The third pass records it for completeness with an explicit control statement.

## Other items considered but not promoted

- **Per-tenant AI spend caps (F-RL-07):** Already covered in 1P/2P as a Medium finding; third pass restates as Low hardening (the durable rate limit provides per-token/per-IP scoping).
- **API9-01 (no OpenAPI doc):** Already downgraded from Medium to Low in 2P; not promoted.
- **F-LOG-04 (audit retention):** Already documented; no third-pass change.
- **F-LOG-05 (audit table integrity):** Already documented; no third-pass change.

## Cross-references

- See `02_CODEX_THREAT_MODEL_INVENTORY.md` for the full Codex claim list.
- See `04_FINDING_RECONCILIATION_MATRIX.md` for the claim-to-finding mapping.
- See `07_SEVERITY_RECALIBRATION.md` for severity rationales.
- See `12_AI_LLM_THREAT_MODEL.md` for AI-specific details on SEC-20260601-3P-002.
- See `13_SHARE_PUBLICATION_THREAT_MODEL.md` for share-specific details on SEC-20260601-3P-001.
