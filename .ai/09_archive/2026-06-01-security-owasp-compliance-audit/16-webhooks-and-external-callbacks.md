# 16 — Webhooks and External Callbacks

## Findings

### F-WEB-01 — Resend webhook signature verification

- **Severity:** Informational (control)
- **Status:** Implemented correctly
- **Evidence:** `src/lib/email/resend-webhooks.ts` + `src/app/api/webhooks/resend/route.ts` — Svix signature verification
- **Strength:** Verifies the webhook is from Resend and was not tampered with
- **CWE:** CWE-345
- **OWASP 2025:** A08
- **OWASP API 2023:** API10
- **ASVS 5.0:** V6.5

### F-WEB-02 — `RESEND_WEBHOOK_SECRET` is required at runtime

- **Severity:** Informational (control)
- **Status:** Implemented correctly
- **Evidence:** Handler returns 503 if `RESEND_WEBHOOK_SECRET` is missing
- **CWE:** CWE-1188
- **OWASP 2025:** A05
- **ASVS 5.0:** V14.1

### F-WEB-03 — Resend client constructor uses placeholder default

- **Severity:** Low (downgraded from Medium in third pass — see `23_THIRD_PASS_CODEX_RECONCILIATION/07_SEVERITY_RECALIBRATION.md`)
- **Likelihood:** Low (route handler returns 503 when `RESEND_API_KEY` is missing; placeholder string is never used to actually send email)
- **Impact:** Low (drift risk only; if a future developer changes the 503 to a 200, the placeholder could become active)
- **Evidence:** `src/lib/email/resend-webhooks.ts` constructs `new Resend("re_webhook_verifier")` by default; the route handler at `src/app/api/webhooks/resend/route.ts` returns 503 when `RESEND_API_KEY` is missing.
- **Recommendation:** Replace the placeholder default with an explicit null/empty check in the `Resend` constructor call, or lazily instantiate the client only when `RESEND_API_KEY` is present. (R-16, re-stated; R-3P-03)
- **CWE:** CWE-1188
- **ASVS 5.0:** V14.1
- **Third-pass restatement:** See SEC-20260601-3P-004 in `23_THIRD_PASS_CODEX_RECONCILIATION/06_FALSE_NEGATIVES_FROM_CODEX.md` and the dedicated `15_WEBHOOK_THREAT_MODEL.md` in the third-pass folder.

### F-WEB-04 — Delivery event persistence

- **Severity:** Informational (control)
- **Status:** Implemented correctly
- **Evidence:** `20260601011500_resend_shared_link_delivery_webhooks.sql` — delivery events stored
- **CWE:** CWE-778
- **OWASP 2025:** A09
- **ASVS 5.0:** V8.1

### F-WEB-05 — Replay protection

- **Severity:** Low
- **Likelihood:** Low
- **Impact:** Medium
- **Evidence:** Svix includes a timestamp; the handler should reject stale timestamps. The handler's exact staleness policy was not enumerated in this audit.
- **Recommendation:** Confirm timestamp tolerance (e.g., 5 minutes). (R-55)
- **CWE:** CWE-294
- **OWASP 2025:** A07
- **ASVS 5.0:** V6.5

### F-WEB-06 — Webhook idempotency

- **Severity:** Low
- **Likelihood:** Low
- **Impact:** Medium
- **Evidence:** No explicit `event_id` dedup table observed
- **Recommendation:** Add an `idempotency` table keyed on provider event id. (R-56)
- **CWE:** CWE-294
- **OWASP 2025:** A04
- **ASVS 5.0:** V11.1

### F-WEB-07 — Auth callback route

- **Severity:** Informational
- **Evidence:** `src/app/auth/callback/route.ts` is the OAuth/OTP entry. Code exchange is server-side.
- **CWE:** CWE-601 (open redirect) — depends on `next` param handling; `src/lib/auth/redirects.ts` sanitizes
- **OWASP 2025:** A07

## Recommendations

- R-16 (re-stated): Remove placeholder default
- R-55: Confirm timestamp tolerance
- R-56: Webhook idempotency table
