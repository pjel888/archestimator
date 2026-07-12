# Vendor, Processor, and Cross-Border Plan

## Current-state grounding

The DRAFT register lives at `.ai/10_state/compliance/processor-register.md`, counsel-gated on
OPEN-DEC-003 (signed DPAs). It currently lists:

- **PR-01 Cloudflare** — infrastructure, D1, R2, Workers, DO, Queue, Email, Images (global edge).
- **PR-02 Google** — OAuth identity provider (scope email/profile/openid).
- **PR-03 Cloudflare Email** — transactional email (covered under PR-01 DPA).

It also lists **PR-FUT-01 DeepSeek** as a *deferred future* processor. That classification is
now stale relative to the codebase: DeepSeek is implemented (`src/lib/ai/deepseek.ts`) though
feature-flagged off.

## Vendor Inventory (must complete)

Providers confirmed in code/config:

- **Cloudflare** — `wrangler.jsonc` bindings: D1 `ARCH_DB`, R2 `ARCH_UPLOADS_R2`,
  DO `COLLAB_ROOMS`/`GLOBAL_PRESENCE`/`SUPPORT_INBOX`, Queue `UPLOAD_JOBS_QUEUE`,
  Images `IMAGES`, Email `EMAIL`; crons `0 3`,`15 3`,`30 3`.
- **Google** — OAuth (`BETTER_AUTH_GOOGLE_CLIENT_ID`).
- **DeepSeek** — AI inference (`api.deepseek.com`, `DEEPSEEK_API_KEY`, model
  `deepseek-v4-flash`). **China-based.**
- **Microsoft Clarity** — session replay (`NEXT_PUBLIC_CLARITY_PROJECT_ID`). **US-based.**
- **Google Analytics 4** — web analytics (`NEXT_PUBLIC_GA_MEASUREMENT_ID`). **US-based.**
- **Cloudflare Web Analytics** — token-based (`NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN`).
- **Resend** — email delivery metadata is stored in `shared_link_recipients`
  (`resend_email_id`, `resend_delivery_metadata`); confirm whether Resend is an active
  processor or only metadata is captured.
- **GitHub** — source control (developer access, not customer data).
- **Domain/DNS** — confirm provider.
- **Contractors** — with production or customer-data access (none currently confirmed; add if any).
- **Historical** — Supabase project `ebxxqidacheyapmmzavr` (provider-exit evidence only; never
  mutate; record destruction status).

## Due Diligence (per vendor)

service and processing purpose; role; data categories; regions; subprocessors; security
certifications; encryption; access controls; incident history; breach notification terms;
retention and deletion; government-access policy; audit reports; business continuity;
termination and export capability.

## Required DPA Terms

subject matter and duration; nature and purpose; data categories and subjects; documented
instructions; confidentiality; security; subprocessor controls; data-subject assistance;
breach reporting; PIA and regulator assistance; deletion or return; audit evidence;
cross-border processing; termination assistance; liability allocation.

## Subprocessor Register (publish or provide)

provider; purpose; processing location; effective date; relevant service; change-notification
process; customer objection process where contractually offered.

## Cross-Border Transfer Record (every overseas flow)

For each: exporting entity; importing entity; countries; purpose; data; legal and contractual
safeguard; security controls; onward transfer; retention; government-access risk; data-subject
notice.

**Highest-risk transfers to document first:**

1. **DeepSeek (CN)** — AI inference; customer estimate/project data may be sent; requires DPA +
   PIA + data-minimization before ship. This is the most sensitive transfer in the system.
2. **Microsoft Clarity (US)** — session replay (recordings of user sessions); high-sensitivity;
   needs explicit consent and transfer record.
3. **Google Analytics 4 (US)** — behavioral analytics; transfer record + consent.
4. **Cloudflare (global edge)** — D1/R2 region confirmation (OPEN-DEC-003).

## Provider Exit

Maintain an exit plan per provider: data export; migration; credential rotation; deletion
confirmation; DNS and routing; residual logs; backups; subprocessor termination; evidence
preservation. The Supabase exit is historical evidence of this process.
