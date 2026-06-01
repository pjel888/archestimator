# 12 — AI / LLM Security

## Findings

### F-AI-01 — AI apply path uses HMAC-signed draft token

- **Severity:** Informational (control)
- **Status:** Implemented correctly
- **Evidence:** `src/lib/ai/package-builder/draft-token.ts` + `20260528003000_ai_package_builder_apply_rpc.sql`
- **Strength:** Server-signed token, 30-min TTL, idempotency check inside the SECURITY DEFINER RPC
- **CWE:** CWE-330
- **OWASP 2025:** A02
- **OWASP API 2023:** API6
- **ASVS 5.0:** V3.3, V6.2

### F-AI-02 — AI audit table is RLS + trigger-protected

- **Severity:** Informational (control)
- **Status:** Implemented correctly
- **Evidence:** `20260523144932_ai_audit_foundation.sql` + `20260528120704_ai_audit_trigger_security_definer.sql`
- **Strength:** Audit record creation enforces workspace anchor
- **CWE:** CWE-285

### F-AI-03 — AI HTTP client uses hard-coded provider URL and model

- **Severity:** Low
- **Likelihood:** Low
- **Impact:** Low
- **Evidence:** `src/lib/ai/deepseek.ts` — `https://api.deepseek.com/chat/completions`, `model: "deepseek-v4-flash"`, 20s timeout, 900 max_tokens
- **Strength:** Bounded time, bounded output size
- **Recommendation:** Externalise model name and timeout to env (R-41). Add retry/jitter policy. (R-42)
- **CWE:** CWE-1188
- **ASVS 5.0:** V14.1

### F-AI-04 — Feature flags gate AI behaviour

- **Severity:** Informational (control)
- **Status:** Implemented correctly
- **Evidence:** `src/lib/ai/package-builder/feature-flags.ts` — 6 boolean flags driven by env
- **Strength:** Allows memory flag (off by default) and other kill-switches
- **Recommendation:** Document each flag's purpose in `.ai/10_state/decisions.md`. (R-43)
- **CWE:** CWE-1188

### F-AI-05 — LLM output is treated as state-changing payload (apply)

- **Severity:** Medium
- **Likelihood:** Medium
- **Impact:** High (writes to DB via SECURITY DEFINER RPC)
- **Evidence:** `src/lib/ai/package-builder/apply.ts` consumes a JSON payload and dispatches to the RPC
- **Compensating control:** the apply path requires an HMAC-signed draft token; the token is server-issued. However, the *content* of the apply payload is still a write
- **Recommendation:** Ensure the apply path:
  - validates the payload with Zod (R-08)
  - rejects unknown keys
  - caps the number of nodes/rows/components per apply
  - emits a per-apply audit event
  (R-44)
- **CWE:** CWE-502, CWE-915
- **OWASP 2025:** A08
- **OWASP API 2023:** API6
- **ASVS 5.0:** V5.1

### F-AI-06 — Prompt injection (Ask)

- **Severity:** Medium
- **Likelihood:** High (anyone with workspace access can craft a prompt)
- **Impact:** Medium (LLM may follow attacker instructions, leaking data or returning manipulated tool calls)
- **Evidence:** `src/lib/ai/deepseek.ts` — user text is forwarded to DeepSeek
- **Compensating control:** the Ask path is read-only (per the architecture summary), so worst-case is data leakage to DeepSeek
- **Recommendation:**
  - Sanitise user text before forwarding (strip known injection patterns; enforce length cap)
  - Add a per-user rate limit (R-25)
  - Document the data flow to DeepSeek in the privacy notice (R-20)
  (R-45)
- **CWE:** CWE-1427
- **OWASP 2025:** A03
- **OWASP LLM Top 10:** LLM01
- **ASVS 5.0:** V5.1

### F-AI-07 — No documented key rotation policy for `DEEPSEEK_API_KEY`

- **Severity:** Medium
- **Likelihood:** Medium
- **Impact:** Medium
- **Evidence:** `.env.example` lists `DEEPSEEK_API_KEY`; no documented rotation cadence
- **Recommendation:** Document rotation cadence (e.g., every 90 days) and revocation runbook. (R-46)
- **CWE:** CWE-798
- **OWASP 2025:** A07
- **ASVS 5.0:** V2.10

### F-AI-08 — Ask handler uses real session; admin-DB bypass is explicitly rejected

- **Severity:** Informational (control)
- **Status:** Implemented correctly
- **Evidence:** `src/lib/ai/auth.ts` throws on admin-DB bypass; only `dev-bypass` (no DB) and `supabase` are allowed
- **CWE:** CWE-269
- **OWASP 2025:** A01
- **ASVS 5.0:** V4.1

### F-AI-09 — Service-role key is loaded for AI audit recording

- **Severity:** Informational
- **Evidence:** `src/lib/ai/audit.ts` uses `createAiAuditSupabaseClient` with service-role
- **Residual risk:** if the AI request handler logs the client, the key may be exposed
- **Recommendation:** Confirm Vercel log scrubbing; confirm no `console.log` of the client. (R-47)
- **CWE:** CWE-522

## Recommendations

- R-41: Externalise AI model name and timeout
- R-42: Retry/jitter policy
- R-43: Document feature flags
- R-44: Apply payload validation (Zod, key cap, per-apply audit)
- R-45: Prompt-injection mitigations
- R-46: Key rotation policy
- R-47: Service-role key handling
