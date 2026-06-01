# 18 — Logging, Monitoring, and Audit Trail

## Findings

### F-LOG-01 — Audit tables exist for security-relevant events

- **Severity:** Informational (control)
- **Status:** Implemented correctly
- **Evidence:** Multiple audit/observation tables across migrations:
  - `ai_data_access_events`, `ai_tool_calls` (with SECURITY DEFINER triggers)
  - `security_rate_limit_events`
  - `project_publication_password_attempt_event`
  - `shared_link_delivery_events` (resend)
  - `collaboration_invitation_open_audit`
- **Strength:** Events are persisted with RLS + service-role-only writes
- **CWE:** CWE-778
- **OWASP 2025:** A09
- **OWASP API 2023:** API4
- **ASVS 5.0:** V8.1

### F-LOG-02 — No documented structured monitoring / alerting pipeline

- **Severity:** **High**
- **Likelihood:** High (without alerting, abuse goes unnoticed)
- **Impact:** Medium-High
- **Evidence:** No alerting configuration observed in repo (no Datadog, no Sentry, no PagerDuty wiring; no log drain config)
- **Recommendation:** Document and implement alerting for at minimum:
  - Rate-limit threshold breaches
  - Password-attempt bursts
  - Webhook signature verification failures
  - Service-role client instantiation failures
  (R-60)
- **CWE:** CWE-778
- **OWASP 2025:** A09
- **OWASP API 2023:** API4
- **ASVS 5.0:** V8.3

### F-LOG-03 — No log scrubbing policy for service-role key

- **Severity:** Medium
- **Likelihood:** Low
- **Impact:** Critical
- **Recommendation:** Confirm Vercel log scrubbing for `SUPABASE_SERVICE_ROLE_KEY`, `DEEPSEEK_API_KEY`, `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, `AI_PACKAGE_BUILDER_DRAFT_SIGNING_SECRET`, `ARCHESTIMATOR_INVITE_TOKEN_PEPPER`. (R-61)
- **CWE:** CWE-532
- **OWASP 2025:** A09
- **ASVS 5.0:** V8.3

### F-LOG-04 — Audit retention not documented

- **Severity:** Low
- **Likelihood:** Medium
- **Impact:** Low
- **Recommendation:** Document retention windows for each audit table. (R-62)
- **OWASP 2025:** A09
- **ASVS 5.0:** V8.1

### F-LOG-05 — Audit table integrity

- **Severity:** Low
- **Likelihood:** Low
- **Impact:** High
- **Evidence:** No tamper-evidence (no append-only enforcement, no hash chain, no outbox)
- **Recommendation:** Add a trigger that prevents UPDATE/DELETE on audit tables, or add a hash chain. (R-63)
- **CWE:** CWE-117
- **OWASP 2025:** A09
- **ASVS 5.0:** V8.1

## Recommendations

- R-60: Document and implement alerting
- R-61: Log scrubbing policy
- R-62: Audit retention windows
- R-63: Audit tamper-evidence
