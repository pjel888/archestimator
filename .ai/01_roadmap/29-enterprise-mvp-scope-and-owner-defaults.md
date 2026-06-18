# Enterprise MVP Scope & Owner Defaults

**Last updated:** 2026-05-30
**Status:** All 21 provisional owner decisions approved as defaults. Controlled beta now has a clear scope.

> **Reconciliation note (2026-06-18):** This is a frozen **owner-decisions + launch-scope** artifact. Its rows record owner *policy choices and scope classifications* (what is IN/OUT of each launch layer), NOT implementation status — code cannot prove or disprove decisions like "no paid beta", "Philip is incident owner", or "PDF not required for beta", and those are intentionally preserved as-is. Two rows embed forward-looking *technical recommendations* (D-004 "Upstash Redis"; D-031 "Sentry" + "first-party event table") that have since diverged from what was actually built; per-row code notes have been added inline. For live build/verify status of capabilities, use the production-readiness/launch-gate docs and the Capability Map, not this scope doc.

---

## 1. Purpose

This document codifies the owner's approved provisional owner defaults, defines the 4-layer launch model, and draws bright lines between controlled beta, enterprise MVP, and public launch scope. It is the single source of truth for what is IN and OUT of each launch layer.

After this pass, no goal card should remain blocked solely by an unresolved owner decision. Remaining blocks are either external setup (human action required) or implementation (Codex work required).

---

## 2. the owner's Approved Provisional Defaults

All 21 decisions below were approved as the owner's provisional defaults on 2026-05-30 via the roadmap improvement pass. These replace all prior `OWNER DECISION REQUIRED` statuses across the roadmap.

| # | Decision ID | Decision | Approved Default | Status |
|---|---|---|---|---|
| 1 | D-006 | Beta scope | Controlled invite-only design-partner beta, 5–8 known contractors/estimators/small construction teams. No public signup, no payment, no SLA. | `DECIDED / APPROVED DEFAULT` |
| 2 | D-015 | Staging Supabase / environment strategy | Separate staging Supabase project + staging Vercel environment mandatory before external beta. | `DECIDED / APPROVED DEFAULT` |
| 3 | D-025 | PDF required before beta | Not required for controlled beta. Required for enterprise/public MVP. XLSX + shared links sufficient for beta with honest copy. | `DECIDED / APPROVED DEFAULT` |
| 4 | D-008 | Immutable issued proposals | Not required for controlled beta. Required before public/paid launch. Implementation order: XLSX evidence → snapshot model → PDF → revision comparison. | `DECIDED / APPROVED DEFAULT` |
| 5 | D-004 | Persistent rate limiting | Required before external beta. Use persistent store (Upstash Redis or equivalent). Protect auth, invites, shared links, AI Ask, package-builder, contact form. <br>*Code note (2026-06-18): the "or equivalent" durable store that was actually built is a Postgres `security_rate_limit_events` table (migration `supabase/migrations/20260601003000_security_rate_limit_events.sql`), used by shared links (`src/lib/publication/public-repository.ts`), AI routes (`src/lib/ai/rate-limit.ts`), and invites/collaboration; some surfaces add an in-memory per-process backstop. No Upstash/Redis dependency exists in `package.json`. Coverage of auth sign-in actions and the contact form is NOT confirmed in code.* | `DECIDED / REQUIRED BEFORE EXTERNAL BETA` |
| 6 | D-004 | CAPTCHA provider | Cloudflare Turnstile preferred. BETA P1 if rate limiting implemented first; BETA P0 if auth/share abuse risk remains unmitigated. <br>*Code note (2026-06-18): NO Cloudflare Turnstile / CAPTCHA code exists anywhere in the repo. This row is an approved decision/target, not a shipped capability.* | `DECIDED / CLOUDFLARE TURNSTILE` |
| 7 | D-027 | Mobile workshop posture | Desktop-first for beta and MVP. Desktop guard for /workshop/*. Public marketing and /share/[token] mobile-responsive. Full mobile editing post-MVP. <br>*Code note (2026-06-18): the desktop-guard overlay for /workshop is a decision/target, NOT yet built — there is NO dedicated desktop-guard/viewport-guard component in `src/` (only responsive utility classes). Treat this row as an approved default, not a shipped capability.* | `DECIDED / DESKTOP GUARD FOR MVP` |
| 8 | D-028 | Package-builder beta scope | Optional feature-flagged beta capability. Not core activation. Confirmation-gated. Requires AI safety and rollback evidence before beta enablement. | `DECIDED / OPTIONAL FEATURE-FLAGGED BETA` |
| 9 | D-014 | Legal before beta | Minimum beta legal pack required before external beta (limitations disclosure, privacy notice MVP, beta terms, subprocessor list, data retention draft, manual DSAR, support contact, pre-production acknowledgment). Full legal review before public/paid launch. | `DECIDED / MINIMUM BETA LEGAL PACK REQUIRED` |
| 10 | D-031 | Analytics / instrumentation | First-party product events for beta. Store in Supabase or app-owned event table. Do not rely on GA4/Clarity/PostHog. Error tracking via Sentry. Marketing analytics after legal review. <br>*Code note (2026-06-18): this decision/target is NOT yet implemented as stated. No Sentry (or Bugsnag/Rollbar/OpenTelemetry) dependency exists in `package.json` and no error-tracking integration is wired in `src`. There is no first-party `product_event`/`analytics_event` table in `supabase/migrations/`. What IS wired is privacy-redacted Vercel Web Analytics (`src/lib/analytics/vercel-web-analytics.ts`) and a consent-gated landing-only GA4/Clarity path (`src/lib/landing/*`) — i.e. the opposite of "do not rely on GA4/Clarity." Lightweight telemetry seams (`src/lib/collaboration/realtime-telemetry.ts`, `src/lib/estimates/express-components-telemetry.ts`) console.warn only. Treat this row as an open target, not a built capability.* | `DECIDED / FIRST-PARTY PRODUCT EVENTS FOR BETA` |
| 11 | D-011 | Support channel and SLA | SUPPORT_INBOX_PLACEHOLDER. Founder-led during beta. No SLA. Best-effort: 1 business day for non-critical, immediate for security/data-loss/auth-blocking. Lightweight tracker or .ai feedback log. | `DECIDED / SUPPORT EMAIL + LIGHTWEIGHT TRACKER` |
| 12 | D-012 | Incident owner | OWNER_NAME_PLACEHOLDER is incident owner for beta. | `DECIDED / PHILIP` |
| 13 | D-013 | Rollback authority | OWNER_NAME_PLACEHOLDER is rollback authority. No deploy without OWNER_NAME_PLACEHOLDER approval (permanent). | `DECIDED / PHILIP` |
| 14 | — | Launch jurisdiction | Invite-only non-public beta. No EU/UK, minors, schools, or regulated procurement. Philippines-first / English-speaking contractor posture. Public launch jurisdiction: LEGAL REVIEW REQUIRED. | `DECIDED / INVITE-ONLY NON-PUBLIC BETA` |
| 15 | — | Browser support | Beta: latest Chrome and Edge desktop. Safari and Firefox P1 validation. Mobile workshop unsupported; shared receiver mobile supported. Public launch: Chrome, Edge, Safari, Firefox latest two versions. | `DECIDED / CHROME + EDGE DESKTOP FOR BETA` |
| 16 | D-010 | Payments / pricing | No paid beta. No billing before beta. Pricing page marked as beta/waitlist/non-binding. Billing post-beta. | `DECIDED / NO PAID BETA` |
| 17 | D-007 | AI memory posture | Default-off ranking hints only. No broad memory, conversation history, vector/RAG, or provider memory. No AI memory claims in marketing. | `DECIDED / DEFAULT-OFF RANKING HINTS ONLY` |
| 18 | D-016 | Strict CSP | Required before public launch. Not first external beta blocker if risk documented. | `PUBLIC LAUNCH / ENTERPRISE MVP HARDENING` |
| 19 | D-017 | @firecms/neat replacement | Before public launch if it blocks CSP or bundle goals. Do not block beta. | `ENTERPRISE MVP P1` |
| 20 | — | DSAR / data rights | For beta: manual DSAR/export/delete acceptable if documented. Self-serve required before public/paid launch. | `DECIDED / MANUAL DSAR FOR BETA` |
| 21 | — | Backup and recovery | Before beta: document backup posture, verify Supabase plan tier, document manual recovery runbook. Before public launch: enable PITR, perform restore drill, document RPO/RTO. | `DECIDED / BACKUP VERIFICATION FOR BETA` |

---

## 3. Controlled Beta Scope (Layer 1)

**Goal:** Learn from real workflows safely with 5–8 known design partners.

### Required (BETA P0):
- staging/safe environment
- RLS denial tests
- storage denial tests
- API/server-action auth audit
- persistent rate limiting or equivalent durable mitigation
- invite lifecycle staging validation
- shared-link boundary validation
- basic Sentry/APM
- basic support channel
- beta legal/limitations pack
- core performance smoke
- core onboarding/happy path
- desktop guard for workshop
- beta participants selected
- OWNER_NAME_PLACEHOLDER beta approval

### Not Required for Beta:
- PDF
- immutable issued snapshots
- billing
- full mobile workshop
- strict workshop CSP if risk accepted
- self-serve DSAR
- global public legal maturity
- public OAuth verification (strongly preferred but not blocker if invite-only users accept warning)

---

## 4. Enterprise MVP Scope (Layer 2)

**Goal:** A polished, corporate-level MVP that can support serious users.

### Required:
- production/staging separation
- CI/CD and protected previews
- RLS/storage/API/security evidence
- persistent rate limiting + Turnstile where needed
- Sentry/APM + logs + health checks
- performance budgets proven
- PDF package workflow
- immutable issued snapshots
- public claims audit
- legal documents reviewed
- support/incident/rollback runbooks drilled
- backup/PITR/restore posture
- accessibility baseline
- client share receiver polished and mobile
- beta evidence incorporated
- feature flags for risky surfaces

---

## 5. Public Launch Scope (Layer 3)

**Goal:** Public onboarding or paid usage.

### Required:
- final Privacy/Terms/subprocessor/DPA posture
- launch jurisdiction
- OAuth verification
- domain/DNS/email auth
- production deployment pipeline
- rollback drilled
- monitoring/alerts
- billing if paid
- self-serve DSAR/export/delete
- public support path
- public claims tied to verified capability

---

## 6. Post-MVP Scope (Layer 4)

- full mobile workshop editing
- enterprise SLA
- multi-region deployment
- advanced AI memory/vector/RAG
- i18n/localization
- offline mutation queue
- third-party penetration test
- open-source licensing decision

---

## 7. What is Explicitly NOT Required for Controlled Beta

| Item | Classification |
|------|---------------|
| PDF export | `ENTERPRISE MVP P1` |
| Immutable issued proposal snapshots | `ENTERPRISE MVP P1` |
| Billing/payment integration | `POST-BETA` |
| Full mobile workshop editing | `POST-MVP` |
| Strict workshop CSP enforcement | `PUBLIC LAUNCH HARDENING` |
| Self-serve DSAR/export/delete | `PUBLIC LAUNCH` |
| Global public legal maturity | `PUBLIC LAUNCH` |
| Public OAuth verification (if users accept warning) | `PUBLIC LAUNCH` (strongly preferred for beta) |
| Full accessibility audit | `ENTERPRISE MVP P1` |
| Full cross-browser matrix | `ENTERPRISE MVP P1` |
| @firecms/neat replacement | `ENTERPRISE MVP P1` |
| Full restore drill/PITR | `PUBLIC LAUNCH` |
| Admin panel/dashboard | `POST-BETA` |

---

## 8. What IS Required Before Enterprise/Public Launch

### Required before Enterprise MVP:
- PDF package workflow
- immutable issued proposal snapshots
- feature flags
- persistent rate limiting
- Turnstile or equivalent on public abuse surfaces
- performance budgets proven
- APM/logging/alerts fully configured
- backup posture verified
- public claims audit
- stronger client share receiver
- accessibility baseline
- support runbooks drilled

### Required before Public/Paid Launch:
- final Privacy/Terms/subprocessor/DPA
- launch jurisdiction decided
- OAuth verification complete
- domain/DNS/email auth
- production deployment pipeline
- rollback drilled
- monitoring/alerts active
- billing if paid
- self-serve DSAR/export/delete
- public support path

---

## 9. Decision Table (Old ID → New Status)

| Decision ID | Decision | Approved Default | Status | Roadmap Impact | Goal Cards Unblocked |
|---|---|---|---|---|---|
| D-006 | Beta scope | Invite-only 5–8 design partners | `DECIDED / APPROVED DEFAULT` | Unblocks all wave scoping | All Waves 1–6 |
| D-015 | Staging Supabase | Separate project | `DECIDED / APPROVED DEFAULT` | Unblocks security/perf testing | BETA-P0-INF-001, SEC-001, SEC-002, OBS-001, PERF-001 |
| D-025 | PDF before beta | Not required | `DECIDED / APPROVED DEFAULT` | PDF → enterprise MVP | BETA-P0-UX-002 (removes PDF from scope) |
| D-008 | Immutable proposals | Enterprise MVP P1 | `DECIDED / APPROVED DEFAULT` | Immutable → enterprise MVP | POST-BETA-PROD-001 → ENTERPRISE-P1-PROD-001 |
| D-004 | Persistent rate limiting | Required before beta | `DECIDED / REQUIRED BEFORE BETA` | Rate limiting → BETA P0 | BETA-P0-SEC-005 (new) |
| D-004 | CAPTCHA provider | Cloudflare Turnstile | `DECIDED / CLOUDFLARE TURNSTILE` | Turnstile → BETA P1 | BETA-P1-SEC-006 (new) |
| D-027 | Mobile workshop | Desktop guard for MVP | `DECIDED / DESKTOP GUARD FOR MVP` | Desktop guard → BETA P0 | BETA-P0-UX-004 (new) |
| D-028 | Package-builder beta | Optional feature-flagged | `DECIDED / OPTIONAL FEATURE-FLAGGED` | Package-builder no longer blocks core beta | BETA-P0-AI-001 |
| D-014 | Legal before beta | Minimum beta legal pack | `DECIDED / MINIMUM BETA LEGAL PACK` | Full legal → public launch | BETA-P0-LEGAL-001 (new), PUBLIC-P0-LEGAL-001 |
| D-031 | Analytics | First-party product events | `DECIDED / FIRST-PARTY EVENTS` | Analytics → BETA P0 | BETA-P0-ANA-001 (new) |
| D-011 | Support channel | SUPPORT_INBOX_PLACEHOLDER | `DECIDED / SUPPORT EMAIL` | Support → BETA P0 | BETA-P0-OPS-001 (new) |
| D-012 | Incident owner | OWNER_NAME_PLACEHOLDER | `DECIDED / PHILIP` | Runbook authority clarified | All runbook cards |
| D-013 | Rollback authority | OWNER_NAME_PLACEHOLDER | `DECIDED / PHILIP` | Deployment safety clarified | BETA-P0-INF-001 |
| — | Launch jurisdiction | Invite-only non-public beta | `DECIDED / INVITE-ONLY` | Jurisdiction not blocking beta | PUBLIC-P0-LEGAL-001 (public only) |
| — | Browser support | Chrome + Edge desktop | `DECIDED / CHROME + EDGE` | QA scope clarified | BETA-P0-UX-001, UX-002 |
| D-010 | Payments/pricing | No paid beta | `DECIDED / NO PAID BETA` | Stripe/billing out of beta | No beta cards |
| D-007 | AI memory | Default-off ranking hints | `DECIDED / DEFAULT-OFF` | AI posture clarified | BETA-P0-AI-001 |
| D-016 | Strict CSP | Public launch hardening | `PUBLIC LAUNCH HARDENING` | CSP not blocking beta | No beta cards |
| D-017 | @firecms/neat | Enterprise MVP P1 | `ENTERPRISE MVP P1` | Neat not blocking beta | No beta cards |
| — | DSAR / data rights | Manual DSAR for beta | `DECIDED / MANUAL DSAR FOR BETA` | Self-serve → public launch | BETA-P0-LEGAL-001 |
| — | Backup and recovery | Verification for beta | `DECIDED / BACKUP VERIFICATION` | PITR/restore drill → public launch | BETA-P0-LEGAL-001 |

---

## 10. Goal Card Readiness Impact

### Immediate unblock impact after this pass:

| Outcome | Count |
|---------|-------|
| Decisions resolved this pass | **21** |
| Goal cards now READY FOR CODEX | **UNKNOWN / NEEDS ROADMAP AUDIT** (Atomic Split Edition — 78 cards + 15 EPIC headers, see 26-codex-goal-cards.md) |
| Goal cards READY FOR HUMAN EXTERNAL SETUP | **UNKNOWN / NEEDS ROADMAP AUDIT** |
| Goal cards READY FOR CODEX AFTER EXTERNAL SETUP | **UNKNOWN / NEEDS ROADMAP AUDIT** |
| Goal cards remaining blocked or planned | **UNKNOWN / NEEDS ROADMAP AUDIT** |
| New goal cards created | **8** (SEC-005, SEC-006, ANA-001, OPS-001, LEGAL-001, UX-004, ENTERPRISE-P1-PROD-001, ENTERPRISE-P1-PROD-002) |

---

## Decisions Still Unresolved (Public/Paid Launch Only)

These remain unresolved but do NOT block controlled beta:

- D-001: Final incorporation/jurisdiction for public paid launch
- D-002: Final legal counsel path
- D-003: Analytics stack for public launch (first-party confirmed for beta)
- Final DPA/customer contract posture
- Tax/payment obligations once billing begins
- Public launch geography
- Enterprise SLA if enterprise customers appear
- Open source vs proprietary (D-020)
- Student/minor posture for public launch (D-018)
- Data residency requirements for public launch (D-019)

---

*This document now serves as the canonical reference for owner defaults. All roadmap documents have been updated to reflect these decisions as of 2026-05-30.*
