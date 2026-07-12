# Sources and Legal Validation Notes

## Primary Sources (Philippine privacy law)

1. Republic Act No. 10173, Data Privacy Act of 2012  
   https://privacy.gov.ph/data-privacy-act/
2. Implementing Rules and Regulations of the Data Privacy Act of 2012  
   https://privacy.gov.ph/implementing-rules-regulations-data-privacy-act-2012/
3. National Privacy Commission issuances and circulars  
   https://privacy.gov.ph/advisories-circulars/
4. NPC Registration System  
   https://npcregistration.privacy.gov.ph/
5. NPC Data Breach Notification and Management System  
   https://dbnms.privacy.gov.ph/
6. NPC data privacy compliance resources  
   https://privacy.gov.ph/

## Repository evidence reviewed (2026-07-12, HEAD `0365c8b6`)

**Codebase inventory (this pack):**

- `25_D1_DATA_SYSTEM_INVENTORY.md` — 81 live D1 tables + 4 Better Auth runtime tables, grouped
  by domain, with personal-data columns, retention classes, and cross-cutting findings.
- `migrations/*.sql` — 65 migration files (0001–0068, with 0069–0073 extending), the executable
  source of schema truth.
- `src/lib/compliance/privacy-request-repository.ts` — DSAR register, kinds, statuses, and the
  dead-code export/erase helpers.
- `src/lib/compliance/retention-core.ts` — `DEFAULT_RETENTION_RULES` (10 enforced classes).
- `src/lib/auth/better-auth-cloudflare.ts` — SEC-11 raw session token finding, OAuth hardening,
  magic-link hashing (SEC-1).
- `src/lib/auth/account-audit.ts` — HMAC hashing, legacy SHA-256 rotation gap.
- `src/lib/auth/account-data.ts:108-118` — `AccountSecurityEventType` closed enum.
- `src/lib/publication/security.ts` — token entropy, HMAC hash, AES-256-GCM, scrypt, CSRF.
- `src/lib/publication/public-repository.ts` — telemetry HMAC hashing, double-gate default-off.
- `src/lib/admin/require-admin.ts` — admin gate, same-origin CSRF.
- `src/lib/admin/audit-repository.ts` — `admin_audit_events` writer.
- `src/lib/ai/deepseek.ts` — DeepSeek provider, model, endpoint.
- `src/lib/landing/consent.ts`, `useLandingCookieConsent.ts`, `beta-telemetry-registry.ts` —
  consent model and telemetry registry.
- `src/components/landing/LandingAnalyticsLoader.tsx` — analytics opt-in double-gate.
- `wrangler.jsonc` — Cloudflare bindings and cron schedules.

**Existing DRAFT compliance state (`.ai/10_state/compliance/`):**

- `ropa.md` (DRAFT, 10 PAs, gated OPEN-DEC-002 + OPEN-DEC-004)
- `retention-schedule.md` (DRAFT, 17 classes, gated OPEN-DEC-004)
- `processor-register.md` (DRAFT, gated OPEN-DEC-003)
- `privacy-notice-draft.md`
- `dpia-screening.md`
- `csrf-coverage.md`, `csp-decision-brief.md`, `file-scanner-status.md`,
  `audit-pepper-rotation-log.md`

## Legal Validation Required

Philippine privacy counsel or a qualified DPO should validate: legal entity and controller
identity; NPC registration applicability; processing-system registration scope; lawful bases;
sensitive and privileged information handling; customer controller and processor allocation;
customer DPA; vendor DPA sufficiency; cross-border safeguards (esp. DeepSeek CN, Clarity/GA4
US); breach notification criteria and templates; retention periods; legal holds; privacy notice
language; direct marketing; cookie and analytics consent model (session-replay granularity);
AI use and training; client subscription and post-deletion access model; plaintext-email-at-rest
proportionality.

## Interpretation Rule

Where a conflict exists between this plan, source code, contracts, a privacy notice, or current
NPC requirements, the implementation team must stop and escalate. The product must not silently
choose the least restrictive interpretation.
