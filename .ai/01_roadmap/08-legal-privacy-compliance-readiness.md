# Legal, Privacy & Compliance Readiness

Last updated: 2026-05-30

This document tracks the compliance posture of Archestimator. It identifies what exists, what still needs building, and what requires owner decisions before launch. Nothing in this document constitutes legal advice or a legal document. Every item flagged "OWNER DECISION REQUIRED" or "UNKNOWN" must be resolved by a qualified advisor before commerce begins.

---

## Section A — Legal Artifacts

| Item | Status | Evidence Required | Owner Decision | Notes |
|---|---|---|---|---|
| Reviewed Privacy Notice | DECIDED / MINIMUM BETA LEGAL PACK REQUIRED | pending-review stub at `/privacy` — beta legal pack (draft notice + beta terms + subprocessor list) sufficient for controlled beta | Full legal review for public launch | Beta legal pack decided 2026-05-30; full legal review deferred to public launch |
| Reviewed Terms of Service | DECIDED / MINIMUM BETA LEGAL PACK REQUIRED | pending-review stub at `/terms` — beta legal pack sufficient for controlled beta | Full legal review for public launch | Beta legal pack decided 2026-05-30; full legal review deferred to public launch |
| Subprocessor list | LEFT TO DO | Published list naming Supabase, Vercel, Resend, Google | Which providers to disclose, format | See Section E for detail. NOTE: `/privacy` (`src/app/privacy/page.tsx`) already mentions Supabase, Vercel, Resend + "privacy-reviewed analytics providers" but does NOT name Google or DeepSeek; no formal published list with DPA status exists yet — NEEDS INPUT on whether the partial in-page disclosure counts toward this item and the final published format |
| Data retention schedule | LEFT TO DO | Documented retention periods per data category | How long to keep what | No policy exists yet |
| DSAR / export / delete / correction workflow | LEFT TO DO | Documented process, response SLA, no self-serve UI | Process design, SLA commitment | Manual-only today; no admin panel |
| Cookie / analytics posture | PARTIAL | Consent banner + versioned cookie exist; consent records not archived to DB | Whether to persist consent records, retention period | Banner works, audit trail missing |
| GDPR / CCPA / CPRA applicability | UNKNOWN | Legal assessment of user footprint and data flows | Which regulations apply | Needs legal review |
| Student / minor posture | DECIDED / INVITE-ONLY NON-PUBLIC BETA | Age-gating policy, COPPA assessment if applicable — invite-only model mitigates minor exposure for beta | Public launch policy | Invite-only non-public beta, no minors/Schools. See 29-enterprise-mvp-scope-and-owner-defaults.md. |
| Launch jurisdictions | DECIDED / INVITE-ONLY NON-PUBLIC BETA | Invite-only non-public beta (Philippines-first / English-speaking). No EU/UK, minors, or regulated procurement. | Public launch jurisdiction list | Beta jurisdiction: invite-only non-public (US/Philippines posture). Final public launch jurisdiction: LEGAL REVIEW REQUIRED. See 29-enterprise-mvp-scope-and-owner-defaults.md. |
| DPA checklist | PARTIAL | Checklist provided in landing-page plan docs; human/legal verification open | Final sign-off | Internal draft exists; not validated |
| Support email / contact details | PARTIAL | `support@archestimator.com` is now published on `/privacy` (`src/app/privacy/page.tsx`) and `/terms` (`src/app/terms/page.tsx`) for support, privacy, deletion, and export requests | Confirm mailbox is monitored + SLA | Public contact point IS published in code; actual mailbox monitoring / DNS / inbox SLA remain external (readiness scripts `scripts/check-support-email-dns.ts`, `scripts/check-support-monitoring-readiness.ts` exist but only attest operator flags) |
| Refund / payment terms | NOT APPLICABLE | n/a | n/a | No pricing is active yet |
| GA4 custom dimension registration | DOCUMENTED | 24-48 hr delay noted in landing plan | Confirm dimensions registered before launch | Registration delay is known and noted |
| CSP | PARTIAL | Report-Only on public pages, enforced on `/share/:path*`, not enforced on workshop | Whether to enforce more broadly | Current posture documented; hardening plan exists |

---

## Section B — Public Claims Audit

Public copy on the site, in proposal exports, and in marketing material must stay within what is actually shipped. The following claims are off limits until the matching capability lands and is verified:

- **Mature compliance** — no external audit, no certification, no DPA signed with customers.
- **Purchase-order execution** — not implemented.
- **Legal-document automation** — Archestimator produces estimates, not contracts.
- **Immutable issued proposals** — the current export is a mutable XLSX file. Immutable snapshots do not exist yet.
- **PDF package workflow** — not implemented.
- **Autonomous AI estimator** — Ask is scoped; Package-builder is confirmation-gated. The system does not operate unattended.
- **Fully production-secure status** — attestations require evidence. Until penetration testing, audit logging, and access-control hardening are complete, do not claim this.
- **Any feature not currently implemented and verified** — if it isn't merged, tested, and deployed, don't claim it.

**Proposal export copy rule**: The proposal export experience must clearly distinguish the current mutable XLSX export from a future immutable issued-snapshot workflow. Copy such as "download your estimate" is fine. Copy such as "your final, locked proposal" is not.

---

## Section C — Launch Copy Rules

These rules apply to all public-facing pages at launch:

- Public pages may only claim capability that is currently shipped and verified. Roadmap items belong in a changelog or roadmap page, not in feature copy.
- The public narrative must reflect the quote-to-proposal pivot. Archestimator is not a generic quoting tool; it is a construction estimation platform that produces proposal packages.
- Construction-style estimating is the current proof case. Copy should not imply it is the exclusive domain. The platform architecture supports other estimate types, but only construction has been exercised.
- No competitor-use claims such as "Your competitors are already a step ahead" (the planned A/B test challenger copy) may ship without customer proof. If a testimonial or data-driven claim cannot be substantiated, pull it.

---

## Section D — Data Rights Implementation

| Capability | Status | Notes |
|---|---|---|
| Account deletion | LEFT TO DO | No self-serve delete UI exists |
| Data export (DSAR) | LEFT TO DO | No self-serve export UI exists; manual fulfillment only |
| Cookie consent | IMPLEMENTED | Versioned consent cookie is set; consent records are not persisted to DB for audit |
| GA4 conversion events | IMPLEMENTED IN CODE / EXTERNAL REGISTRATION PENDING | `trackConversion` (`src/lib/ab-testing/experiment-tracker.ts`) now sends `experiment_id` + `variant` on GA4 (`gtag`) conversion events and Clarity. Code-side requirement met; whether GA4 actually receives them depends on `window.gtag` being loaded and the custom dimensions registered (external — see Section A "GA4 custom dimension registration") |

The gap between cookie consent collection and consent-record persistence is the most pressing compliance item. Without an auditable trail of consent events, cookie compliance cannot be demonstrated to a regulator.

---

## Section E — Subprocessors

| Subprocessor | Purpose | Data Processed | DPA Status |
|---|---|---|---|
| Supabase | Database, authentication, file storage | User accounts, estimate data, uploaded files | DPA signed by Supabase (platform default); customer-facing DPA not executed |
| Vercel | Hosting, edge functions | Page content, API request metadata | DPA signed by Vercel (platform default); customer-facing DPA not executed |
| Resend | Transactional email | Email addresses, email content | DPA signed by Resend (platform default); customer-facing DPA not executed |
| Google | OAuth, Analytics, Fonts | OAuth tokens, analytics events, IP addresses (fonts) | DPA signed by Google (platform default); customer-facing DPA not executed |
| DeepSeek | AI provider (Ask, Package-builder) | Prompt text, estimate context data | DeepSeek DPA terms under review; customer-facing DPA not executed |

Each vendor provides a platform-level DPA. A customer-facing DPA that flows through these obligations has not been drafted or executed. This is a launch gate.

---

> **Disclaimer**: This document is an internal readiness tracker. It does not constitute legal advice, a privacy policy, terms of service, or any binding legal instrument. All items marked UNKNOWN or OWNER DECISION REQUIRED must be resolved with qualified legal counsel before Archestimator enters commerce.
