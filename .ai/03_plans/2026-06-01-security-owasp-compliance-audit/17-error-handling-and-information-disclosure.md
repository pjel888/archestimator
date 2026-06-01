# 17 — Error Handling and Information Disclosure

## Findings

### F-ERR-01 — JSON error shape is sanitised

- **Severity:** Informational (control)
- **Status:** Implemented correctly
- **Evidence:** Reviewed route handlers return `{ error: "..." }` JSON shapes; no raw stack traces or DB error messages
- **CWE:** CWE-209
- **OWASP 2025:** A04
- **OWASP API 2023:** API8
- **ASVS 5.0:** V7.4

### F-ERR-02 — `no-store` headers on public routes prevent error caching

- **Severity:** Informational (control)
- **Status:** Implemented correctly
- **Evidence:** Public route handlers set `no-store`
- **CWE:** CWE-524
- **ASVS 5.0:** V3.4

### F-ERR-03 — DeepSeek error messages — leakage risk

- **Severity:** Low
- **Likelihood:** Low
- **Impact:** Medium
- **Evidence:** `src/lib/ai/deepseek.ts` — error path was not enumerated in full. If provider-side error bodies are forwarded to the client verbatim, internal state may be exposed.
- **Recommendation:** Map provider errors to a small allowlist of user-facing messages. (R-57)
- **CWE:** CWE-209
- **OWASP 2025:** A04
- **ASVS 5.0:** V7.4

### F-ERR-04 — Unhandled exceptions in route handlers

- **Severity:** Low
- **Likelihood:** Low
- **Impact:** Medium
- **Evidence:** Not enumerated in this audit; route handler error paths were not exhaustively reviewed
- **Recommendation:** Add a global error boundary at `app/error.tsx` and `app/global-error.tsx` (R-58)
- **CWE:** CWE-755
- **OWASP 2025:** A04
- **ASVS 5.0:** V7.4

### F-ERR-05 — `next.config.ts` CSP Report-Only on landing

- **Severity:** Informational
- **Evidence:** Landing uses Report-Only CSP per `next.config.ts`
- **Strength:** Lets the team monitor violations before enforcing
- **CWE:** CWE-693
- **OWASP 2025:** A05
- **ASVS 5.0:** V14.4
- **Recommendation:** Once monitoring is mature, switch landing to enforced CSP. (R-59)

## Recommendations

- R-57: Allowlist DeepSeek error responses
- R-58: Global error boundaries
- R-59: Enforce CSP on landing
