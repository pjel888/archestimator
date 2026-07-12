# Risk Register and Decision Log

## Initial Risks (grounded in current-state evidence)

| ID | Risk | Severity | Required action | Source evidence |
|---|---|---:|---|---|
| R-001 | Incomplete processing inventory | Critical | Extend DRAFT ROPA (10 PAs) to full 85-table coverage | `25_D1_DATA_SYSTEM_INVENTORY.md`; `.ai/10_state/compliance/ropa.md` |
| R-002 | Raw session tokens in D1 (SEC-11) | Critical | Hash session tokens or migrate BA config; close before beta | `better-auth-cloudflare.ts:24,198` |
| R-003 | Cross-tenant data access | Critical | Authorization audit and matrix tests | `src/lib/authz/`, admin queries |
| R-004 | Public share / client portal overexposure | High | Minimize fields, expiry, revocation, notice | `src/lib/publication/`, `src/lib/client-portal/` |
| R-005 | Incomplete DSAR fulfillment (no orchestrator) | High | Build orchestrator + 16 adapters; existing helpers are dead code | `privacy-request-repository.ts:224-285` |
| R-006 | Invalid / unapproved retention periods | High | OPEN-DEC-004 sign-off; enforce 5 unenforced classes | `retention-core.ts:87`; `retention-schedule.md` |
| R-007 | Uncontrolled vendor transfer (esp. DeepSeek CN, Clarity/GA4 US) | High | Complete DPAs, transfer records; add to processor register | `processor-register.md`; `deepseek.ts`; `LandingAnalyticsLoader.tsx` |
| R-008 | Unprepared breach response | High | Implement and rehearse 72-hour workflow | `15_PERSONAL_DATA_BREACH_RESPONSE.md` |
| R-009 | Excessive / un-MFA'd admin access | High | Admin MFA; support-access session logging | `require-admin.ts`; no 2FA in `src/lib/auth/` |
| R-010 | AI provider reuse of customer data | High | Default no-training; verify DeepSeek data-use terms before ship | `deepseek.ts` |
| R-011 | Analytics without proper basis / granularity | High | Separate session-replay consent; classify & gate | `consent.ts` (one toggle) |
| R-012 | Upload of sensitive or privileged data | High | Warnings, controls, access, retention | `upload_assets` |
| R-013 | Anonymized activity remains identifiable | High | Re-identification test on `estimate_sheet_events` actor anonymization | `retention-core.ts:139` (`anonymized-activity-actor`) |
| R-014 | Legacy provider retains data | High | Supabase destruction proof | historical `ebxxqidacheyapmmzavr` |
| R-015 | Privacy policy does not match reality | High | Notice-to-system validation | `.ai/10_state/compliance/privacy-notice-draft.md` |
| R-016 | Plaintext emails at rest in D1 | High | Assess encryption/tokenization for 7 plaintext-email tables | `25_D1_DATA_SYSTEM_INVENTORY.md` §cross-cutting #8 |
| R-017 | Legacy SHA-256 audit digests not rotated | Medium | Complete HMAC rotation; faster purge | `account-audit.ts:59-62` |
| R-018 | No logout / session-revocation audit event | Medium | Add event types to `AccountSecurityEventType` | `account-data.ts:108-118` |

## Required Decisions (genuine AUTH-* boundaries needing the owner/counsel)

| Decision | Owner | Required before | Boundary type |
|---|---|---|---|
| PIC legal entity (OPEN-DEC-002) | Founder and counsel | P0 | AUTH — external legal fact |
| DPO appointment | Founder | P0 | AUTH — formal record |
| NPC registration applicability | DPO and counsel | P0 | AUTH — regulatory determination |
| Controller and processor allocation | DPO and counsel | Customer DPA | AUTH — contract/legal |
| Approved lawful bases | DPO and counsel | Notice publication | AUTH — legal |
| Retention schedule sign-off (OPEN-DEC-004) | DPO, business, counsel | Retention enforcement | AUTH — legal |
| Signed vendor DPAs (OPEN-DEC-003) | Founder and counsel | External beta | AUTH — external contract |
| AI data-use policy (DeepSeek) | Founder, DPO, engineering | AI release | AUTH — legal + product |
| Analytics basis and consent model | DPO, product, counsel | Analytics release | AUTH — legal |
| Public-share telemetry scope | Product and DPO | External beta | AUTH — product + legal |
| Admin support-access policy | Founder and DPO | External beta | AUTH — policy |
| Backup deletion disclosure | Engineering and DPO | Privacy notice | AUTH — notice accuracy |
| Customer post-deletion activity entitlement | Product and counsel | Subscription feature | AUTH — legal |

## Decision Rule

Every decision must include: options; rationale; legal basis; user impact; technical impact;
risks; approver; date; review trigger. Internally resolvable engineering choices are recorded
as `DEC-AUTO-*`, never left as "owner decision."
