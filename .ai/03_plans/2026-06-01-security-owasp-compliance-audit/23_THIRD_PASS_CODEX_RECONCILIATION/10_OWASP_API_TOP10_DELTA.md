# 10 — OWASP API Top 10 Delta

Third-pass corrections to the OWASP API Top 10:2023 mapping. The third pass is largely in agreement with the second pass; the deltas are additive and refinement-level.

## API1:2023 — Broken Object Level Authorization (BOLA)

**1P mapping:** "Mostly compliant" — RLS is the primary defense; service-role consumption points inventoried.

**2P correction:** "Mostly compliant — RLS everywhere. Service-role consumption points inventoried. Share-route access is by-design (not a finding). Missing: Storage RLS verification."

**3P delta:** Same as 2P, plus:
- Codex's claim that AI package-builder apply path could be coerced cross-tenant is **rejected** (FP-20260601-3P-001). Defense-in-depth (HMAC token binding + RPC `auth.uid()` re-check + RLS) fully covers the cross-tenant write concern.
- SEC-20260601-3P-003 (Medium) — `/api/*` proxy short-circuit is a defense-in-depth gap, not a BOLA finding. Risk is bounded by handler-level auth + RLS.

**3P final:** "Mostly compliant — RLS is the primary defense; HMAC draft tokens + RPC re-checks add defense-in-depth. Share-route access is by-design. Storage RLS verification is an evidence gap (EG-20260601-3P-003)."

## API2:2023 — Broken Authentication

**1P mapping:** Covered in `03-authentication-and-session-management.md`. "Mostly compliant."

**2P correction:** No change.

**3P delta:** No change. F-AUTH-01 through F-AUTH-06 are all confirmed.

**3P final:** "Mostly compliant — Supabase Auth, OAuth/OTP, dev bypass triple-gated. Auth provider configuration not verified live (EG-02)."

## API3:2023 — Broken Object Property Level Authorization (BOPLA)

**1P mapping:** Response shape not fully enumerated. F-API3-01 (Low).

**2P correction:** No material change.

**3P delta:** No change. Recommendation: audit the response shape of every public route; use explicit `select` lists (R-37).

**3P final:** "Low — explicit `select` lists recommended. Not yet systematically verified across all routes."

## API4:2023 — Unrestricted Resource Consumption

**1P mapping:** "Partial — durable rate limit exists; AI endpoints under-protected (F-RL-04)."

**2P correction:** "Partial — durable rate limit on share routes AND invite routes. AI endpoints under-protected."

**3P delta:** Same as 2P, plus:
- SEC-20260601-3P-002 (Medium) — AI endpoint cost-amplification angle is now part of the threat model. Per-tenant cost is unbounded because no rate limiter is invoked.

**3P final:** "Partial — durable rate limit on share AND invite routes. AI endpoints under-protected (F-RL-04 / SEC-20260601-3P-002). Apply per-user and per-workspace limits on AI endpoints (R-25)."

## API5:2023 — Broken Function Level Authorization

**1P mapping:** "Low — no clear admin surface observed."

**2P correction:** No change.

**3P delta:** No change. F-API5-01 (Low) — if an admin surface is added (e.g., `/api/admin/*`), add a dedicated middleware gate (R-38).

**3P final:** "Low — no admin surface observed. Precautionary gate recommended if added later."

## API6:2023 — Unrestricted Access to Sensitive Business Flows

**1P mapping:** "Implemented correctly — CSRF + rate limits on share; HMAC-signed draft token + 30-min TTL + idempotency + SECURITY DEFINER RPC with workspace authorization cross-check on AI apply."

**2P correction:** No change.

**3P delta:** No change. F-API6-01 and F-API6-02 are confirmed.

**3P final:** "Implemented correctly — CSRF on all public POSTs; HMAC-signed AI apply with full defense-in-depth."

## API7:2023 — Server Side Request Forgery (SSRF)

**1P mapping:** "No finding — no user-controlled URL fetch."

**2P correction:** No change.

**3P delta:** No change. Only hard-coded provider URLs (DeepSeek, Resend) are contacted.

**3P final:** "No finding — only hard-coded provider URLs."

## API8:2023 — Security Misconfiguration

**1P mapping:** "Mostly compliant — CSP per-route in `next.config.ts`."

**2P correction:** "Mostly compliant — CSP enforced on share, Report-Only on landing. `search_path` on SECURITY DEFINER functions. HSTS missing."

**3P delta:** Same as 2P, plus:
- SEC-20260601-3P-003 (Medium) — `/api/*` proxy short-circuit is a misconfiguration (intentional but should be defense-in-depth).
- EG-20260601-3P-001 (Yes-blocks) — share cookie `Secure` and `SameSite` not explicit in code.
- EG-20260601-3P-002 (Yes-blocks) — HSTS header status in production.

**3P final:** "Mostly compliant — CSP enforced on share with `frame-ancestors 'none'`; Report-Only on landing. `search_path` hardened. HSTS missing (EG-20260601-3P-002). Cookie `Secure`/`SameSite` not explicit (EG-20260601-3P-001)."

## API9:2023 — Improper Inventory Management

**1P mapping:** "No API doc observed — Medium."

**2P correction:** "Low — no API inventory doc."

**3P delta:** No change. F-API9-01 (Low) — generate an OpenAPI doc from the existing custom validation schemas (R-40).

**3P final:** "Low — no API inventory doc. Recommend OpenAPI generation."

## API10:2023 — Unsafe Consumption of APIs

**1P mapping:** "Low — DeepSeek and Resend responses handled defensively."

**2P correction:** No change.

**3P delta:** No change. F-API10-01 (Low) — LLM output treated as untrusted; F-API10-02 (Low) — Resend webhook verified.

**3P final:** "Low — DeepSeek response validated, Resend webhook signature verified."

## Net change to API Top 10 mapping

The 3P mapping is identical to the 2P mapping in posture. The deltas are:

- **API1:** Added note that AI apply path is defense-in-depth (rejected Codex cross-tenant claim)
- **API4:** Added AI endpoint cost-amplification rationale
- **API8:** Added proxy short-circuit, cookie attribute, and HSTS evidence gaps
- All other APIs: no change

## Cross-references

- See `02_CODEX_THREAT_MODEL_INVENTORY.md` for Codex claim list
- See `04_FINDING_RECONCILIATION_MATRIX.md` for claim-to-finding mapping
- See `08_EVIDENCE_GAP_REGISTER_DELTA.md` for evidence gap details
